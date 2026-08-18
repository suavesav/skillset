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
KNOWN_TEAMS="engineering liveops design"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

is_skipped() { echo "$SKIP_SKILLS" | grep -qw "$1"; }

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

# Print the KNOWLEDGE names transitively referenced via [[link]] from file $1, one
# per line (BFS order, de-duplicated). Walks the knowledge->knowledge closure so a
# knowledge file that links another (e.g. sources -> repo-map) is included too.
# Shared by copy_referenced_knowledge (the build) and --list so both agree on what
# ships. Non-knowledge links (agents) are ignored here; agents are resolved elsewhere.
referenced_knowledge() {
    local src_file="$1"
    local seen="" queue=() ref next
    # Seed with links directly referenced by the source file.
    while read -r ref; do [ -n "$ref" ] && queue+=("$ref"); done < <(
        grep -oE '\[\[[a-z0-9-]+\]\]' "$src_file" 2>/dev/null | tr -d '[]' | sort -u || true)
    while ((${#queue[@]})); do
        ref="${queue[0]}"; queue=("${queue[@]:1}")
        case " $seen " in *" $ref "*) continue ;; esac
        seen="$seen $ref"
        [ -f "$REPO_ROOT/KNOWLEDGE/$ref.md" ] || continue
        echo "$ref"
        # Follow [[links]] inside this knowledge file to other KNOWLEDGE files.
        while read -r next; do
            [ -n "$next" ] && [ -f "$REPO_ROOT/KNOWLEDGE/$next.md" ] && queue+=("$next")
        done < <(grep -oE '\[\[[a-z0-9-]+\]\]' "$REPO_ROOT/KNOWLEDGE/$ref.md" 2>/dev/null | tr -d '[]' | sort -u || true)
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
# files (scripts, templates) that the skill copies and executes rather than reads,
# so they ship verbatim — no frontmatter stripping, no rewriting.
copy_declared_assets() {
    local src_file="$1" assets_dir="$2" asset
    while read -r asset; do
        [ -n "$asset" ] || continue
        [ -f "$REPO_ROOT/ASSETS/$asset" ] || continue
        mkdir -p "$assets_dir"
        cp "$REPO_ROOT/ASSETS/$asset" "$assets_dir/$asset"
    done < <(awk '
        /^assets:/ { inlist = 1; next }
        /^[a-z]/   { inlist = 0 }
        inlist && /^[[:space:]]*-[[:space:]]/ {
            gsub(/^[[:space:]]*-[[:space:]]*/, ""); gsub(/^"|"$/, ""); gsub(/^'"'"'|'"'"'$/, "")
            print
        }
    ' "$src_file")
    return 0
}

# Build one skill into a plugin: plugin frontmatter + preamble + body, plus references/.
build_skill_into() {
    local skill_file="$1" plugin_dir="$2"
    local skill_name description skill_dir
    skill_name="$(basename "$skill_file" .md)"
    skill_dir="$plugin_dir/skills/$skill_name"
    mkdir -p "$skill_dir"

    description="$(extract_description "$skill_file")"
    [ -z "$description" ] && description="skillset: $skill_name"

    {
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
    } > "$skill_dir/SKILL.md"

    copy_referenced_knowledge "$skill_file" "$skill_dir/references"
    copy_declared_assets "$skill_file" "$skill_dir/assets"
}

# Build one agent into a plugin: plugin frontmatter + body, plus references/.
build_agent_into() {
    local agent_file="$1" plugin_dir="$2"
    local agent_name agent_desc
    agent_name="$(basename "$agent_file" .md)"
    mkdir -p "$plugin_dir/_agents"

    agent_desc="$(extract_description "$agent_file")"
    [ -z "$agent_desc" ] && agent_desc="skillset agent: $agent_name"

    {
        echo "---"
        echo "name: $agent_name"
        echo "description: >"
        echo "  $agent_desc"
        echo "---"
        echo ""
        strip_frontmatter "$agent_file"
    } > "$plugin_dir/_agents/$agent_name.md"

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
        while read -r ref; do
            [ -f "$REPO_ROOT/AGENTS/$ref.md" ] && queue+=("agent:$ref")
        done < <(grep -oE '\[\[[a-z0-9-]+\]\]' "$f" 2>/dev/null | tr -d '[]' | sort -u || true)
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
        *)
            DESC="Gladewick $1 skills"; CATEGORY="$1"; TAGS='[]' ;;
    esac
}

# Generate plugin.json for a plugin directory.
write_plugin_json() {
    local plugin_dir="$1" name="$2" desc="$3"
    mkdir -p "$plugin_dir/.claude-plugin"
    cat > "$plugin_dir/.claude-plugin/plugin.json" << EOF
{
  "name": "$name",
  "version": "$VERSION",
  "description": "$desc",
  "author": {
    "name": "Gladewick Games"
  },
  "skills": ["./skills/"]
}
EOF
}

# Write a marketplace.json listing every plugin. $1 = source path prefix, $2 = outfile.
emit_marketplace() {
    local src_prefix="$1" outfile="$2"
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
    mkdir -p "$(dirname "$outfile")"
    cat > "$outfile" << EOF
{
  "name": "skillset",
  "owner": {
    "name": "Gladewick Games"
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

# --list: print the projection (projected_path<TAB>source_path<TAB>synth<TAB>note)
# and exit, without building. The viewer (viewer/server/utils/projections.ts) uses
# this as its source of truth for where each file lands. Projects into the full-suite
# `skillset-all` plugin (every non-skipped skill + every agent) and reuses the same
# referenced_knowledge closure as the build, so the projection matches what ships.
if [[ "${1:-}" == "--list" ]]; then
    printf 'plugins/skillset-all/.claude-plugin/plugin.json\t\t1\tgenerated manifest\n'
    printf '.claude-plugin/marketplace.json\t\t1\tgenerated marketplace manifest\n'
    for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
        skill_name="$(basename "$skill_file" .md)"
        is_skipped "$skill_name" && continue
        printf 'plugins/skillset-all/skills/%s/SKILL.md\tSKILLS/%s.md\t1\tplugin frontmatter + preamble + body\n' "$skill_name" "$skill_name"
        while read -r ref; do
            [ -n "$ref" ] || continue
            printf 'plugins/skillset-all/skills/%s/references/%s.md\tKNOWLEDGE/%s.md\t1\tfrontmatter stripped\n' "$skill_name" "$ref" "$ref"
        done < <(referenced_knowledge "$skill_file")
    done
    # Agents share one _agents/references/ dir, so de-dup knowledge across agents.
    agent_refs_seen=""
    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
        agent_name="$(basename "$agent_file" .md)"
        printf 'plugins/skillset-all/_agents/%s.md\tAGENTS/%s.md\t1\tplugin frontmatter + body\n' "$agent_name" "$agent_name"
        while read -r ref; do
            [ -n "$ref" ] || continue
            case " $agent_refs_seen " in *" $ref "*) continue ;; esac
            agent_refs_seen="$agent_refs_seen $ref"
            printf 'plugins/skillset-all/_agents/references/%s.md\tKNOWLEDGE/%s.md\t1\tfrontmatter stripped\n' "$ref" "$ref"
        done < <(referenced_knowledge "$agent_file")
    done
    exit 0
fi

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

echo "=== skillset — Claude Plugin Build ==="
echo "Repo:    $REPO_ROOT"
echo "Output:  $DIST"
echo "Version: $VERSION"
echo ""

# Validate skill frontmatter first. This reads only SKILLS/, so run it before
# rm -rf below — a typo'd/empty teams: must fail without wiping an existing dist/.
# Fail loudly rather than silently minting a junk plugin, or dropping a skill.
validation_errors=""
for f in "$REPO_ROOT/SKILLS/"*.md; do
    name="$(basename "$f" .md)"
    is_skipped "$name" && continue
    skill_teams="$(teams_of "$f")"
    if [ -z "$skill_teams" ]; then
        # Empty teams: skill would land only in skillset-all, silently absent from every team plugin.
        validation_errors="$validation_errors  $name: no 'teams:' declared (add one, or add it to SKIP_SKILLS)"$'\n'
        continue
    fi
    while read -r t; do
        [ "$t" = "all" ] && continue
        case " $KNOWN_TEAMS " in
            *" $t "*) ;;
            # Unknown team: a typo here would mint a whole skillset-<typo> plugin with fallback metadata.
            *) validation_errors="$validation_errors  $name: unknown team '$t' (known: $KNOWN_TEAMS, or 'all')"$'\n' ;;
        esac
    done <<< "$skill_teams"
done
if [ -n "$validation_errors" ]; then
    printf 'ERROR: skill frontmatter validation failed:\n%s' "$validation_errors" >&2
    exit 1
fi

rm -rf "$DIST"

# Discover teams from frontmatter (excluding the `all` keyword).
ALL_TEAMS="$(
    for f in "$REPO_ROOT/SKILLS/"*.md; do
        name="$(basename "$f" .md)"
        is_skipped "$name" && continue
        teams_of "$f"
    done | grep -vx "all" | sort -u
)"

PLUGIN_NAMES=("skillset-all")
for t in $ALL_TEAMS; do PLUGIN_NAMES+=("skillset-$t"); done

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
