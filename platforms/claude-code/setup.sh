#!/usr/bin/env bash
set -euo pipefail

# skillset — Claude Code Setup
# Symlinks skills, agents, and knowledge into ~/.claude/ so Claude Code discovers them.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

# Skills excluded from this platform — used by both --list and the actual setup below
SKIP_SKILLS="meta"

# --- Emitters: setup redirects these to disk, --emit prints them. ------------

emit_skill_md() {
    cat "$REPO_ROOT/platforms/claude-code/preamble.md"
    echo ""
    echo "---"
    echo ""
    cat "$1"
}

# grep -oE (ERE) not -oP (PCRE): BSD grep is the macOS default.
skill_refs() {
    { grep -oE '\[\[[a-z0-9-]+\]\]' "$1" 2>/dev/null || true; } | tr -d '[]' | sort -u | while read -r ref; do
        [[ -f "$REPO_ROOT/KNOWLEDGE/$ref.md" ]] && echo "$ref"
    done
    return 0
}

# Print the `assets:` filenames declared in a file's frontmatter, one per line.
# Only names that exist in ASSETS/ are printed, so the projection and the setup
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

emit_one() {
    is_safe_path "$1" || { echo "invalid projected path: $1" >&2; return 1; }

    local name
    case "$1" in
        skills/*/SKILL.md)
            name="${1#skills/}"; name="${name%/SKILL.md}"
            [[ -f "$REPO_ROOT/SKILLS/$name.md" ]] || { echo "no such projected file: $1" >&2; return 1; }
            emit_skill_md "$REPO_ROOT/SKILLS/$name.md"
            ;;
        skills/*/references/*.md)
            name="${1##*/}"
            [[ -f "$REPO_ROOT/KNOWLEDGE/$name" ]] || { echo "no such projected file: $1" >&2; return 1; }
            cat "$REPO_ROOT/KNOWLEDGE/$name"
            ;;
        skills/*/assets/*)
            name="${1##*/}"
            [[ -f "$REPO_ROOT/ASSETS/$name" ]] || { echo "no such projected file: $1" >&2; return 1; }
            cat "$REPO_ROOT/ASSETS/$name"
            ;;
        agents/*.md)
            name="${1#agents/}"
            [[ -f "$REPO_ROOT/AGENTS/$name" ]] || { echo "no such projected file: $1" >&2; return 1; }
            cat "$REPO_ROOT/AGENTS/$name"
            ;;
        *) echo "no such projected file: $1" >&2; return 1 ;;
    esac
}

# Walk the projection, calling `row <projected> <source> <synth> <note> <inputs>`.
walk_projection() {
    local emit_row="$1" skill_name agent_name ref
    for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
        skill_name="$(basename "$skill_file" .md)"
        if echo "$SKIP_SKILLS" | grep -qw "$skill_name"; then continue; fi
        "$emit_row" "skills/$skill_name/SKILL.md" "SKILLS/$skill_name.md" "1" "preamble + skill body" \
            "platforms/claude-code/preamble.md,SKILLS/$skill_name.md"
        while read -r ref; do
            [ -n "$ref" ] || continue
            "$emit_row" "skills/$skill_name/references/$ref.md" "KNOWLEDGE/$ref.md" "" "symlinked" ""
        done < <(skill_refs "$skill_file")
        while read -r asset; do
            [ -n "$asset" ] || continue
            "$emit_row" "skills/$skill_name/assets/$asset" "ASSETS/$asset" "" "symlinked" ""
        done < <(declared_assets "$skill_file")
    done
    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
        agent_name="$(basename "$agent_file" .md)"
        "$emit_row" "agents/$agent_name.md" "AGENTS/$agent_name.md" "" "symlinked" ""
    done
}

# --- Projection modes: see platforms/PROJECTION.md. ---------------------------

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
        # Cheap syntactic reject first; only plausible paths pay for a walk.
        is_safe_path "$emit_path" || {
            echo "invalid projected path: $emit_path" >&2; exit 1; }
        assert_listed "$emit_path" || {
            echo "not in the projection: $emit_path" >&2; exit 1; }
        emit_one "$emit_path"
        exit 0 ;;
    --emit-all) walk_projection emit_all_row; exit 0 ;;
    --describe)
        echo "One directory per skill under ~/.claude/skills/, each holding a SKILL.md (preamble + body) and a references/ dir symlinked to the KNOWLEDGE files that skill cites. Agents are symlinked flat into ~/.claude/agents/. Nothing is concatenated."
        exit 0 ;;
esac

echo "=== skillset — Claude Code Setup ==="
echo "Repo:   $REPO_ROOT"
echo "Target: $CLAUDE_DIR"
echo ""

# Ensure ~/.claude directories exist
mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents"

# --- Skills ---
echo "Setting up skills..."
for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
    skill_name="$(basename "$skill_file" .md)"

    # Skip skills listed in SKIP_SKILLS (e.g. meta — it works from the repo directly)
    if echo "$SKIP_SKILLS" | grep -qw "$skill_name"; then continue; fi

    skill_dir="$CLAUDE_DIR/skills/$skill_name"

    # Check for existing non-symlink directory (user's own skill)
    if [[ -d "$skill_dir" && ! -L "$skill_dir" ]]; then
        # Check if it was created by us (has a .skillset marker)
        if [[ ! -f "$skill_dir/.skillset" ]]; then
            echo "  SKIP $skill_name (existing personal skill — not overwriting)"
            continue
        fi
    fi

    # Create skill directory
    mkdir -p "$skill_dir"
    touch "$skill_dir/.skillset"  # marker so we know we own this directory

    # Build SKILL.md by prepending preamble + resolving knowledge references
    emit_skill_md "$skill_file" > "$skill_dir/SKILL.md"

    # Symlink references directory → KNOWLEDGE files this skill needs
    refs_dir="$skill_dir/references"
    rm -rf "$refs_dir"
    mkdir -p "$refs_dir"

    # Same skill_refs() --list uses, so neither can promise what the other skips.
    skill_refs "$skill_file" | while read -r ref; do
        [ -n "$ref" ] || continue
        ln -sf "$REPO_ROOT/KNOWLEDGE/$ref.md" "$refs_dir/$ref.md"
    done

    # Symlink assets/ → ASSETS files this skill declares. Assets are runnable
    # files the skill copies and executes, not markdown it reads. Same
    # declared_assets() --list uses.
    assets_dir="$skill_dir/assets"
    rm -rf "$assets_dir"
    declared_assets "$skill_file" | while read -r asset; do
        [ -n "$asset" ] || continue
        mkdir -p "$assets_dir"
        ln -sf "$REPO_ROOT/ASSETS/$asset" "$assets_dir/$asset"
    done

    echo "  OK $skill_name"
done

# --- Agents ---
echo ""
echo "Setting up agents..."
for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
    agent_name="$(basename "$agent_file" .md)"
    target="$CLAUDE_DIR/agents/$agent_name.md"

    # Check for existing non-symlink file (user's own agent)
    if [[ -f "$target" && ! -L "$target" ]]; then
        echo "  SKIP $agent_name (existing personal agent — not overwriting)"
        continue
    fi

    ln -sf "$agent_file" "$target"
    echo "  OK $agent_name"
done

# --- Local overrides ---
echo ""
echo "Setting up local overrides..."
local_dir="$REPO_ROOT/local"
mkdir -p "$local_dir/SKILLS" "$local_dir/AGENTS" "$local_dir/KNOWLEDGE"

# Apply local skill overrides (if any). nullglob -> the loop becomes a no-op
# when the directory is empty (bash leaves the literal pattern otherwise).
shopt -s nullglob
for local_skill in "$local_dir/SKILLS/"*.md; do
    [[ -f "$local_skill" ]] || continue
    skill_name="$(basename "$local_skill" .md)"
    skill_dir="$CLAUDE_DIR/skills/$skill_name"
    mkdir -p "$skill_dir"
    touch "$skill_dir/.skillset"

    emit_skill_md "$local_skill" > "$skill_dir/SKILL.md"

    echo "  OVERRIDE $skill_name (local)"
done

# Apply local agent overrides (if any)
for local_agent in "$local_dir/AGENTS/"*.md; do
    [[ -f "$local_agent" ]] || continue
    agent_name="$(basename "$local_agent" .md)"
    ln -sf "$local_agent" "$CLAUDE_DIR/agents/$agent_name.md"
    echo "  OVERRIDE $agent_name (local)"
done

echo ""
echo "=== Setup complete ==="
echo ""
echo "Skills installed: $(find "$CLAUDE_DIR/skills" -name ".skillset" 2>/dev/null | wc -l | tr -d ' ')"
echo "Agents installed: $(find "$CLAUDE_DIR/agents" -name "*.md" -type l 2>/dev/null | wc -l | tr -d ' ')"
echo ""
echo "Run 'skillset doctor' in Claude Code to check MCP dependencies."
echo "Run 'skillset pull' anytime to pull the latest version."
