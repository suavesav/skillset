#!/usr/bin/env bash
set -euo pipefail

# skillset — Claude Plugin Build
# Compiles platform-agnostic skill files into Claude Code plugin marketplace format.
#
# Emits one marketplace containing:
#   - skillset-all        → the full suite (every skill)
#   - skillset-<team>     → one plugin per team declared in skills' `teams:` frontmatter
# A skill joins a team plugin when its `teams:` list includes that team OR `all`.
# Each team plugin ships only the agents its skills transitively reference.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST="$SCRIPT_DIR/dist"
PREAMBLE="$SCRIPT_DIR/preamble.md"
VERSION=$(cat "$REPO_ROOT/VERSION" | tr -d '[:space:]')

# Skills to skip (repo-management only, not useful as plugins)
SKIP_SKILLS="meta"

# Recognized team names. Every skill's `teams:` must draw from these (or `all`).
# Adding a team means listing it here AND giving it display metadata in plugin_meta().
KNOWN_TEAMS="engineering liveops design marketing sales"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

is_skipped() { case " $SKIP_SKILLS " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

# Extract the `description:` value (single- or folded multi-line) from a file's
# YAML frontmatter.
extract_description() {
    awk '
        /^---$/ { if (++count == 2) exit }
        /^description:/ {
            sub(/^description: *>? */, "")
            if (length($0) > 0) { print; next }
            while (getline > 0) {
                if (/^[a-z]/ || /^---/) break
                sub(/^ +/, "")
                printf "%s ", $0
            }
        }
    ' "$1" | sed 's/ *$//'
}

# Print the `teams:` values from a skill's frontmatter, one per line.
# Supports block lists (`teams:\n  - engineering`) and inline (`teams: [a, b]`).
teams_of() {
    awk '
        /^---[[:space:]]*$/ { c++; if (c == 2) exit; next }
        c == 1 && /^teams:[[:space:]]*\[/ {
            line = $0; sub(/^teams:[[:space:]]*\[/, "", line); sub(/\].*/, "", line)
            n = split(line, a, ",")
            for (i = 1; i <= n; i++) { gsub(/[ "\x27]/, "", a[i]); if (length(a[i])) print a[i] }
            next
        }
        c == 1 && /^teams:[[:space:]]*$/ { inteams = 1; next }
        c == 1 && inteams {
            if (/^[^[:space:]-]/) { inteams = 0 }
            else if (/^[[:space:]]*-[[:space:]]*/) {
                s = $0; sub(/^[[:space:]]*-[[:space:]]*/, "", s); gsub(/["\x27]/, "", s); sub(/[[:space:]]+$/, "", s)
                if (length(s)) print s
            }
        }
    ' "$1"
}

# Strip a file's YAML frontmatter (first --- to second ---), print the body.
strip_frontmatter() {
    awk 'BEGIN{c=0;p=0} /^---[[:space:]]*$/ && !p{c++;if(c==2)p=1;next} p{print}' "$1"
}

# Print the `assets:` filenames declared in a file's frontmatter, one per line.
# Only names that exist in ASSETS/ are printed, so the projection and the build
# enumerate the same set.
declared_assets() {
    awk '
        /^assets:/ { inlist = 1; next }
        /^[a-z]/   { inlist = 0 }
        inlist && /^[[:space:]]*-[[:space:]]/ {
            gsub(/^[[:space:]]*-[[:space:]]*/, ""); gsub(/^"|"$/, ""); gsub(/^'"'"'|'"'"'$/, "")
            print
        }
    ' "$1" | while read -r a; do
        [ -n "$a" ] && [ -f "$REPO_ROOT/ASSETS/$a" ] && echo "$a"
    done
    return 0
}

# --- [[link]] index --------------------------------------------------------
# Every [[link]] in the library, harvested in ONE grep (-H so the filename prefix
# is always present, including the single-file case where grep would omit it) and stashed in per-file
# shell variables (`_links_SKILLS_encounter_tuner_md="loot-math telemetry-schema"`). bash 3.2
# has no associative arrays, and a single big string searched with ${v##*pat} is
# quadratic — with --list projecting five plugins over the same files that cost
# dominated the whole run. Variable lookup is O(1) and forks nothing.
_LINKS_MAP_BUILT=""
build_links_map() {
    [ -n "$_LINKS_MAP_BUILT" ] && return 0
    local path names
    # shellcheck disable=SC2034  # `names` is read by the eval below
    while IFS=$'\t' read -r path names; do
        [ -n "$path" ] || continue
        links_key "${path#"$REPO_ROOT"/}"
        eval "_links_$REPLY=\"\$names\""
    done < <(
        grep -oHE '\[\[[a-z0-9-]+\]\]' \
            "$REPO_ROOT/SKILLS/"*.md "$REPO_ROOT/AGENTS/"*.md "$REPO_ROOT/KNOWLEDGE/"*.md 2>/dev/null |
        tr -d '[]' |
        awk '{ n = $0; sub(/^.*:/, "", n)              # split on the LAST colon:
               p = substr($0, 1, length($0) - length(n) - 1)   # a repo path may contain one
               if (p != f) { if (f != "") print f "\t" s; f = p; s = "" }
               if (index(" " s " ", " " n " ") == 0) s = (s == "" ? n : s " " n) }
             END { if (f != "") print f "\t" s }'
    )
    _LINKS_MAP_BUILT=1
    return 0
}

# Variable-name suffix for a path. Injective: _ is escaped first, so k-a.md and
# k_a.md stay distinct — collapsing every non-alnum to _ merged them.
links_key() {
    local k="${1//_/_u}"
    k="${k//-/_d}"
    k="${k//./_p}"
    k="${k//\//_s}"
    REPLY="${k//[^a-zA-Z0-9_]/_z}"
}

# Forks nothing: the BFS walks call this per node.
links_words() {
    links_key "${1#"$REPO_ROOT"/}"
    eval "REPLY=\${_links_$REPLY:-}"
}

# Print the KNOWLEDGE names transitively referenced via [[link]] from file $1, one
# per line (BFS order, de-duplicated). Walks the knowledge->knowledge closure so a
# knowledge file that links another (e.g. sources -> repo-map) is included too.
# Shared by copy_referenced_knowledge (the build) and --list so both agree on what
# ships. Non-knowledge links (agents) are ignored here; agents are resolved elsewhere.
referenced_knowledge() {
    local seen="" queue=() ref next
    links_words "$1"
    for ref in $REPLY; do queue+=("$ref"); done
    while ((${#queue[@]})); do
        ref="${queue[0]}"; queue=("${queue[@]:1}")
        case " $seen " in *" $ref "*) continue ;; esac
        seen="$seen $ref"
        [ -f "$REPO_ROOT/KNOWLEDGE/$ref.md" ] || continue
        echo "$ref"
        links_words "$REPO_ROOT/KNOWLEDGE/$ref.md"
        for next in $REPLY; do
            [ -f "$REPO_ROOT/KNOWLEDGE/$next.md" ] && queue+=("$next")
        done
    done
    return 0   # loop-exit test `(( 0 ))` yields status 1; don't let it trip set -e
}

# Copy every transitively-referenced KNOWLEDGE file from $1 into $2 (frontmatter
# stripped), so nothing ships with a dangling [[link]] reference.
copy_referenced_knowledge() {
    local src_file="$1" refs_dir="$2" ref
    while read -r ref; do
        [ -n "$ref" ] || continue
        mkdir -p "$refs_dir"
        strip_frontmatter "$REPO_ROOT/KNOWLEDGE/$ref.md" > "$refs_dir/$ref.md"
    done < <(referenced_knowledge "$src_file")
    return 0
}

# Copy every asset declared in $1's `assets:` list into $2. Assets are runnable
# files the model copies and executes rather than reads, so they ship verbatim —
# no frontmatter stripping, no rewriting.
copy_declared_assets() {
    local src_file="$1" assets_dir="$2" asset
    while read -r asset; do
        [ -n "$asset" ] || continue
        mkdir -p "$assets_dir"
        cp "$REPO_ROOT/ASSETS/$asset" "$assets_dir/$asset"
    done < <(declared_assets "$src_file")
    return 0
}

# Memoized referenced_knowledge. The closure for a given source file never changes
# within one invocation, but --list now projects five plugins that share skills, so
# the uncached version would re-walk the same BFS several times over.
# --- Emitters: the one source of truth for projected content. -----------------
# build_* writes these to disk; --emit prints them to stdout.

emit_skill_md() {
    local skill_file="$1" description
    description="$(extract_description "$skill_file")"
    [ -z "$description" ] && description="skillset: $(basename "$skill_file" .md)"
    echo "---"
    echo "description: >"
    echo "  $description"
    echo "---"
    echo ""
    cat "$PREAMBLE"
    echo ""
    echo "---"
    echo ""
    strip_frontmatter "$skill_file"
}

emit_agent_md() {
    local agent_file="$1" agent_name agent_desc
    agent_name="$(basename "$agent_file" .md)"
    agent_desc="$(extract_description "$agent_file")"
    [ -z "$agent_desc" ] && agent_desc="skillset agent: $agent_name"
    echo "---"
    echo "name: $agent_name"
    echo "description: >"
    echo "  $agent_desc"
    echo "---"
    echo ""
    strip_frontmatter "$agent_file"
}

emit_plugin_json() {
    cat << EOF
{
  "name": "$1",
  "version": "$VERSION",
  "description": "$2",
  "author": {
    "name": "suavesav"
  },
  "skills": ["./skills/"]
}
EOF
}

plugin_description() {
    case "$1" in
        skillset-all)    echo "Gladewick Games AI skills — dev workflow, live-ops analytics, design tooling" ;;
        *) plugin_meta "${1#skillset-}"; echo "$DESC" ;;
    esac
}

# Build one skill into a plugin: plugin frontmatter + preamble + body, plus references/.
build_skill_into() {
    local skill_file="$1" plugin_dir="$2"
    local skill_name skill_dir
    skill_name="$(basename "$skill_file" .md)"
    skill_dir="$plugin_dir/skills/$skill_name"
    mkdir -p "$skill_dir"

    emit_skill_md "$skill_file" > "$skill_dir/SKILL.md"

    copy_referenced_knowledge "$skill_file" "$skill_dir/references"
    copy_declared_assets "$skill_file" "$skill_dir/assets"
}

# Build one agent into a plugin: plugin frontmatter + body, plus references/.
build_agent_into() {
    local agent_file="$1" plugin_dir="$2"
    local agent_name
    agent_name="$(basename "$agent_file" .md)"
    mkdir -p "$plugin_dir/_agents"

    emit_agent_md "$agent_file" > "$plugin_dir/_agents/$agent_name.md"

    copy_referenced_knowledge "$agent_file" "$plugin_dir/_agents/references"
    copy_declared_assets "$agent_file" "$plugin_dir/_agents/assets"
}

# Transitive [[link]] closure: given skill names, print the agents they reference
# (directly, or via other agents — e.g. orchestrators). Knowledge is resolved
# per-file by copy_referenced_knowledge, so only agents are returned here.
agents_for_skills() {
    local seen="" queue=() item name f ref
    for name in "$@"; do queue+=("skill:$name"); done
    while ((${#queue[@]})); do
        item="${queue[0]}"; queue=("${queue[@]:1}")
        case " $seen " in *" $item "*) continue ;; esac
        seen="$seen $item"
        name="${item#*:}"
        case "$item" in
            skill:*) f="$REPO_ROOT/SKILLS/$name.md" ;;
            agent:*) f="$REPO_ROOT/AGENTS/$name.md" ;;
            *) continue ;;
        esac
        [ -f "$f" ] || continue
        links_words "$f"
        for ref in $REPLY; do
            [ -f "$REPO_ROOT/AGENTS/$ref.md" ] && queue+=("agent:$ref")
        done
    done
    for item in $seen; do
        case "$item" in agent:*) echo "${item#agent:}" ;; esac
    done | sort -u
}

# Non-skipped skills whose teams include $1 (or `all`).
skills_for_team() {
    local team="$1" f name
    for f in "$REPO_ROOT/SKILLS/"*.md; do
        name="$(basename "$f" .md)"
        is_skipped "$name" && continue
        if teams_of "$f" | grep -qx -e "$team" -e "all"; then echo "$name"; fi
    done
}

# Per-team plugin display metadata → sets DESC / CATEGORY / TAGS.
plugin_meta() {
    case "$1" in
        engineering)
            DESC="Gladewick engineering skills — frame budgets, desyncs, save migrations, shard capacity"
            CATEGORY="engineering"; TAGS='["performance","netcode","saves","capacity","engine"]' ;;
        liveops)
            DESC="Gladewick live-ops skills — launch runbooks, matchmaking, community pulse, daily briefings"
            CATEGORY="liveops"; TAGS='["launch","matchmaking","community","capacity","briefing"]' ;;
        design)
            DESC="Gladewick design skills — encounters, loot, quests, dialogue, accessibility"
            CATEGORY="design"; TAGS='["encounters","loot","quests","dialogue","accessibility"]' ;;
        marketing)
            DESC="Gladewick marketing skills — campaign beats, patch notes, store pages, UA review, platform pitches"
            CATEGORY="marketing"; TAGS='["campaigns","patch-notes","store","ua","featuring"]' ;;
        sales)
            DESC="Gladewick sales skills — platform pitches, deal desk, revenue brief"
            CATEGORY="sales"; TAGS='["partnerships","deals","pricing","revenue","featuring"]' ;;
        *)
            DESC="Gladewick $1 skills"; CATEGORY="$1"; TAGS='[]' ;;
    esac
}

# Generate plugin.json for a plugin directory.
write_plugin_json() {
    local plugin_dir="$1" name="$2" desc="$3"
    mkdir -p "$plugin_dir/.claude-plugin"
    emit_plugin_json "$name" "$desc" > "$plugin_dir/.claude-plugin/plugin.json"
}

# Print a marketplace.json listing every plugin. $1 = source path prefix.
# Requires PLUGIN_NAMES to be set (see compute_plugin_names).
emit_marketplace_json() {
    local src_prefix="$1"
    local name team entries="" entry first=1
    for name in "${PLUGIN_NAMES[@]}"; do
        if [ "$name" = "skillset-all" ]; then
            entry=$(printf '    {\n      "name": "skillset-all",\n      "source": "%s/skillset-all",\n      "description": "Full Gladewick skill suite — every skill (engineering, live-ops, design)",\n      "version": "%s"\n    }' "$src_prefix" "$VERSION")
        else
            team="${name#skillset-}"
            plugin_meta "$team"
            entry=$(printf '    {\n      "name": "%s",\n      "source": "%s/%s",\n      "description": "%s",\n      "category": "%s",\n      "tags": %s,\n      "version": "%s"\n    }' "$name" "$src_prefix" "$name" "$DESC" "$CATEGORY" "$TAGS" "$VERSION")
        fi
        if [ $first -eq 1 ]; then entries="$entry"; first=0; else entries="$entries,"$'\n'"$entry"; fi
    done
    cat << EOF
{
  "name": "skillset",
  "owner": {
    "name": "suavesav"
  },
  "metadata": {
    "description": "AI skills for the Gladewick Games studio",
    "version": "$VERSION"
  },
  "plugins": [
$entries
  ]
}
EOF
}

# Write a marketplace.json. $1 = source path prefix, $2 = outfile.
emit_marketplace() {
    mkdir -p "$(dirname "$2")"
    emit_marketplace_json "$1" > "$2"
}

# Sets ALL_TEAMS and PLUGIN_NAMES. Shared by --list and the build.
_PLUGIN_NAMES_COMPUTED=""
compute_plugin_names() {
    # Memoized: emit_one calls this per file, and teams_of spawns an awk each.
    [ -n "$_PLUGIN_NAMES_COMPUTED" ] && return 0
    ALL_TEAMS="$(
        for f in "$REPO_ROOT/SKILLS/"*.md; do
            name="$(basename "$f" .md)"
            is_skipped "$name" && continue
            teams_of "$f"
        done | grep -vx "all" | sort -u
    )"
    PLUGIN_NAMES=("skillset-all")
    for t in $ALL_TEAMS; do PLUGIN_NAMES+=("skillset-$t"); done
    _PLUGIN_NAMES_COMPUTED=1
}

# Reads only SKILLS/, so the build runs it before rm -rf'ing dist/. --list runs
# it too: projecting a plugin the build would refuse is the same drift.
_FRONTMATTER_VALIDATED=""
validate_frontmatter() {
    # Memoized: --emit walks the projection, and teams_of spawns an awk each.
    [ -n "$_FRONTMATTER_VALIDATED" ] && return 0
    local validation_errors="" f name skill_teams t
    for f in "$REPO_ROOT/SKILLS/"*.md; do
        name="$(basename "$f" .md)"
        is_skipped "$name" && continue
        skill_teams="$(teams_of "$f")"
        if [ -z "$skill_teams" ]; then
            # Empty teams: the skill lands only in skillset-all, silently absent from every team plugin.
            validation_errors="$validation_errors  $name: no 'teams:' declared (add one, or add it to SKIP_SKILLS)"$'\n'
            continue
        fi
        while read -r t; do
            [ "$t" = "all" ] && continue
            case " $KNOWN_TEAMS " in
                *" $t "*) ;;
                *) validation_errors="$validation_errors  $name: unknown team '$t' (known: $KNOWN_TEAMS, or 'all')"$'\n' ;;
            esac
        done <<< "$skill_teams"
    done
    if [ -n "$validation_errors" ]; then
        printf 'ERROR: skill frontmatter validation failed:\n%s' "$validation_errors" >&2
        return 1
    fi
    _FRONTMATTER_VALIDATED=1
    return 0
}

# --- Projection: see platforms/PROJECTION.md. --------------------------------
# Covers every plugin the build produces, using the build's own emitters.

# $1 = row callback, $2 = plugin name, rest = skill names.
project_plugin() {
    local emit_row="$1" plugin="$2" agent_list="$3"; shift 3
    local skills=("$@") base="plugins/$plugin" skill_name agent_name ref refs_seen="" asset assets_seen=""

    "$emit_row" "$base/.claude-plugin/plugin.json" "" "1" "generated manifest" "VERSION"

    for skill_name in "${skills[@]}"; do
        "$emit_row" "$base/skills/$skill_name/SKILL.md" "SKILLS/$skill_name.md" "1" \
            "plugin frontmatter + preamble + body" \
            "SKILLS/$skill_name.md,platforms/claude-plugin/preamble.md"
        while read -r ref; do
            [ -n "$ref" ] || continue
            "$emit_row" "$base/skills/$skill_name/references/$ref.md" "KNOWLEDGE/$ref.md" "1" \
                "frontmatter stripped" ""
        done < <(referenced_knowledge "$REPO_ROOT/SKILLS/$skill_name.md")
        while read -r asset; do
            [ -n "$asset" ] || continue
            "$emit_row" "$base/skills/$skill_name/assets/$asset" "ASSETS/$asset" "" "copied verbatim" ""
        done < <(declared_assets "$REPO_ROOT/SKILLS/$skill_name.md")
    done

    # Agents share one _agents/references/ dir, so de-dup knowledge across agents.
    # shellcheck disable=SC2086
    for agent_name in $agent_list; do
        "$emit_row" "$base/_agents/$agent_name.md" "AGENTS/$agent_name.md" "1" \
            "plugin frontmatter + body" "AGENTS/$agent_name.md"
        while read -r ref; do
            [ -n "$ref" ] || continue
            case " $refs_seen " in *" $ref "*) continue ;; esac
            refs_seen="$refs_seen $ref"
            "$emit_row" "$base/_agents/references/$ref.md" "KNOWLEDGE/$ref.md" "1" \
                "frontmatter stripped" ""
        done < <(referenced_knowledge "$REPO_ROOT/AGENTS/$agent_name.md")
        # Agents share one _agents/assets/ dir, so de-dup assets across agents.
        while read -r asset; do
            [ -n "$asset" ] || continue
            case " $assets_seen " in *" $asset "*) continue ;; esac
            assets_seen="$assets_seen $asset"
            "$emit_row" "$base/_agents/assets/$asset" "ASSETS/$asset" "" "copied verbatim" ""
        done < <(declared_assets "$REPO_ROOT/AGENTS/$agent_name.md")
    done
}

# The umbrella plugin ships every agent.
all_agent_names() {
    local f
    for f in "$REPO_ROOT/AGENTS/"*.md; do basename "$f" .md; done
}

all_skill_names() {
    local f name
    for f in "$REPO_ROOT/SKILLS/"*.md; do
        name="$(basename "$f" .md)"
        is_skipped "$name" && continue
        echo "$name"
    done
}

# Walk the projection, calling `row <projected> <source> <synth> <note> <inputs>`.
walk_projection() {
    local emit_row="$1" team rel team_skills
    validate_frontmatter || exit 1
    # Seed in the parent: subshells would each rebuild it.
    build_links_map
    compute_plugin_names

    "$emit_row" ".claude-plugin/marketplace.json" "" "1" "generated marketplace manifest" "VERSION"
    # The repo-root copy differs only in its "source" prefix, outside dist/.

    # Every agent, not just the reachable ones — match the build below.
    # shellcheck disable=SC2046
    project_plugin "$emit_row" "skillset-all" "$(all_agent_names)" $(all_skill_names)


    for team in $ALL_TEAMS; do
        team_skills="$(skills_for_team "$team")"
        # shellcheck disable=SC2046,SC2086
        project_plugin "$emit_row" "skillset-$team" \
            "$(agents_for_skills $team_skills)" $team_skills
    done
}

# Reject absolute paths, "." / ".." segments, and characters no projected path
# uses. Parameter expansion only: word splitting would let a glob expand.
is_safe_path() {
    local rest="$1"
    [ -n "$rest" ] || return 1
    case "$rest" in /*) return 1 ;; esac
    while : ; do
        case "${rest%%/*}" in
            ''|.|..|*[!A-Za-z0-9._-]*) return 1 ;;
        esac
        case "$rest" in
            */*) rest="${rest#*/}" ;;
            *) break ;;
        esac
    done
    return 0
}

# Print one projected file's compiled content. $1 = projected path (relative to
# dist/, matching what --list reports).
emit_one() {
    local path="$1" rest plugin name
    is_safe_path "$path" || { echo "invalid projected path: $path" >&2; return 1; }
    if [ "$path" = ".claude-plugin/marketplace.json" ]; then
        compute_plugin_names
        emit_marketplace_json "./plugins"
        return 0
    fi
    rest="${path#plugins/}"
    [ "$rest" = "$path" ] && { echo "no such projected file: $path" >&2; return 1; }
    plugin="${rest%%/*}"
    rest="${rest#*/}"
    # Otherwise emit_plugin_json fabricates a manifest for any name.
    compute_plugin_names
    case " ${PLUGIN_NAMES[*]} " in
        *" $plugin "*) ;;
        *) echo "no such plugin: $plugin" >&2; return 1 ;;
    esac


    case "$rest" in
        .claude-plugin/plugin.json)
            emit_plugin_json "$plugin" "$(plugin_description "$plugin")" ;;
        skills/*/SKILL.md)
            name="${rest#skills/}"; name="${name%/SKILL.md}"
            [ -f "$REPO_ROOT/SKILLS/$name.md" ] || { echo "no such projected file: $path" >&2; return 1; }
            emit_skill_md "$REPO_ROOT/SKILLS/$name.md" ;;
        skills/*/assets/*|_agents/assets/*)
            name="${rest##*/}"
            [ -f "$REPO_ROOT/ASSETS/$name" ] || { echo "no such projected file: $path" >&2; return 1; }
            cat "$REPO_ROOT/ASSETS/$name" ;;
        skills/*/references/*.md|_agents/references/*.md)
            name="${rest##*/}"
            [ -f "$REPO_ROOT/KNOWLEDGE/$name" ] || { echo "no such projected file: $path" >&2; return 1; }
            strip_frontmatter "$REPO_ROOT/KNOWLEDGE/$name" ;;
        _agents/*.md)
            name="${rest#_agents/}"
            [ -f "$REPO_ROOT/AGENTS/$name" ] || { echo "no such projected file: $path" >&2; return 1; }
            emit_agent_md "$REPO_ROOT/AGENTS/$name" ;;
        *) echo "no such projected file: $path" >&2; return 1 ;;
    esac
}

list_row() { printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5"; }

# Reject any path --list does not report. is_safe_path stops traversal out of
# the tree; this stops fabrication inside a valid-looking location, e.g. a
# skipped skill. Only --emit pays: --emit-all walks the projection anyway.
assert_listed() {
    local listed
    # Capture, then match with `case`: `grep -q` exits on the first hit and
    # SIGPIPEs the producer, which `set -o pipefail` reports as 141.
    listed="$(walk_projection list_row | cut -f1)"
    case "
$listed
" in
        *"
$1
"*) return 0 ;;
    esac
    return 1
}

# One record: RS, path, TAB, length, LF, bytes. Temp file, not $(...), which
# strips trailing newlines and truncated files ending in a blank line.
_EMIT_TMP=""
emit_all_row() {
    if [ -z "$_EMIT_TMP" ]; then
        _EMIT_TMP="$(mktemp)"
        trap 'rm -f "$_EMIT_TMP"' EXIT
    fi
    emit_one "$1" > "$_EMIT_TMP"
    printf '\036%s\t%s\n' "$1" "$(wc -c < "$_EMIT_TMP" | tr -d ' ')"
    cat "$_EMIT_TMP"
}

case "${1:-}" in
    --list)     walk_projection list_row; exit 0 ;;
    --emit)
        emit_path="${2:?--emit needs a projected path}"
        is_safe_path "$emit_path" || {
            echo "invalid projected path: $emit_path" >&2; exit 1; }
        build_links_map
        assert_listed "$emit_path" || {
            echo "not in the projection: $emit_path" >&2; exit 1; }
        emit_one "$emit_path"
        exit 0 ;;
    --emit-all) walk_projection emit_all_row; exit 0 ;;
    --describe)
        echo "Compiles into a plugin marketplace: one plugin per team plus skillset-all. Each skill becomes its own skills/<name>/SKILL.md with rewritten frontmatter, and the KNOWLEDGE files it transitively cites are copied into references/ with their frontmatter stripped."
        exit 0 ;;
esac

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

validate_frontmatter || exit 1
build_links_map   # seed in the parent shell (see links_words)

echo "=== skillset — Claude Plugin Build ==="
echo "Repo:    $REPO_ROOT"
echo "Output:  $DIST"
echo "Version: $VERSION"
echo ""

rm -rf "$DIST"

# Discover teams from frontmatter (excluding the `all` keyword).
compute_plugin_names

# --- "all" plugin: every skill + every agent ---
echo "Building plugin: skillset-all (everything)"
UMBRELLA_DIR="$DIST/plugins/skillset-all"
umbrella_skills=0
for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
    skill_name="$(basename "$skill_file" .md)"
    if is_skipped "$skill_name"; then
        echo "  SKIP $skill_name (repo-management only)"
        continue
    fi
    build_skill_into "$skill_file" "$UMBRELLA_DIR"
    echo "  OK $skill_name"
    umbrella_skills=$((umbrella_skills + 1))
done
for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
    build_agent_into "$agent_file" "$UMBRELLA_DIR"
done
write_plugin_json "$UMBRELLA_DIR" "skillset-all" \
    "Gladewick Games AI skills — dev workflow, live-ops analytics, design tooling"

# --- Team plugins ---
for team in $ALL_TEAMS; do
    echo ""
    echo "Building plugin: skillset-$team"
    team_dir="$DIST/plugins/skillset-$team"
    team_skills="$(skills_for_team "$team")"
    for skill_name in $team_skills; do
        build_skill_into "$REPO_ROOT/SKILLS/$skill_name.md" "$team_dir"
        echo "  OK $skill_name"
    done
    # shellcheck disable=SC2086
    for agent_name in $(agents_for_skills $team_skills); do
        build_agent_into "$REPO_ROOT/AGENTS/$agent_name.md" "$team_dir"
    done
    plugin_meta "$team"
    write_plugin_json "$team_dir" "skillset-$team" "$DESC"
done

# --- Marketplace manifests (dist + repo root) ---
echo ""
echo "Generating marketplace.json..."
emit_marketplace "./plugins" "$DIST/.claude-plugin/marketplace.json"
echo "  OK marketplace.json (dist)"

ROOT_MARKETPLACE="$REPO_ROOT/.claude-plugin/marketplace.json"
emit_marketplace "./platforms/claude-plugin/dist/plugins" "$ROOT_MARKETPLACE"
echo "  OK marketplace.json (root) → v$VERSION"

# --- Summary ---
echo ""
echo "=== Build complete ==="
echo ""
echo "Plugins: ${#PLUGIN_NAMES[@]} (${PLUGIN_NAMES[*]})"
echo "Umbrella skills: $umbrella_skills"
echo "Output: $DIST"
echo ""
echo "To test locally:"
echo "  /plugin marketplace add $DIST"
echo "  /plugin install skillset-engineering@skillset"
