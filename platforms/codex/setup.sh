#!/usr/bin/env bash
set -euo pipefail

# skillset — Codex Setup
# Generates an AGENTS.md file that Codex can read from the working directory,
# plus copies knowledge files into the project context.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --- Emitters: setup redirects these to disk, --emit prints them. ------------

emit_agents_md() {
    cat "$REPO_ROOT/platforms/codex/preamble.md"
    echo ""
    echo "---"
    echo ""
    echo "# skillset Library"
    echo ""
    echo "The following skills, agents, and knowledge are available."
    echo "Knowledge files are in the \`.skillset/\` directory."
    echo ""

    echo "## Skills"
    echo ""
    for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
        echo "### $(basename "$skill_file" .md)"
        echo ""
        cat "$skill_file"
        echo ""
        echo "---"
        echo ""
    done

    echo "## Agents"
    echo ""
    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
        echo "### $(basename "$agent_file" .md)"
        echo ""
        cat "$agent_file"
        echo ""
        echo "---"
        echo ""
    done
}

# Sources feeding AGENTS.md, in concatenation order.
agents_md_inputs() {
    echo "platforms/codex/preamble.md"
    for f in "$REPO_ROOT/SKILLS/"*.md; do echo "SKILLS/$(basename "$f")"; done
    for f in "$REPO_ROOT/AGENTS/"*.md; do echo "AGENTS/$(basename "$f")"; done
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

    case "$1" in
        AGENTS.md) emit_agents_md ;;
        .skillset/*.md)
            local kn="${1#.skillset/}"
            [[ -f "$REPO_ROOT/KNOWLEDGE/$kn" ]] || { echo "no such projected file: $1" >&2; return 1; }
            cat "$REPO_ROOT/KNOWLEDGE/$kn"
            ;;
        *) echo "no such projected file: $1" >&2; return 1 ;;
    esac
}

# Walk the projection, calling `row <projected> <source> <synth> <note> <inputs>`.
walk_projection() {
    local emit_row="$1" kn
    "$emit_row" "AGENTS.md" "" "1" "preamble + all skills + all agents concatenated" \
        "$(agents_md_inputs | paste -sd, -)"
    for k in "$REPO_ROOT/KNOWLEDGE/"*.md; do
        kn="$(basename "$k")"
        "$emit_row" ".skillset/$kn" "KNOWLEDGE/$kn" "" "" ""
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
        echo "Every skill and agent is concatenated into a single AGENTS.md that Codex reads from the working directory; knowledge files are copied verbatim into .skillset/."
        exit 0 ;;
esac

echo "=== skillset — Codex Setup ==="
echo "Repo: $REPO_ROOT"
echo ""

# Determine target directory — use current working directory or argument
TARGET_DIR="${1:-$(pwd)}"
echo "Target project: $TARGET_DIR"
echo ""

AGENTS_FILE="$TARGET_DIR/AGENTS.md"
KNOWLEDGE_DIR="$TARGET_DIR/.skillset"

mkdir -p "$KNOWLEDGE_DIR"

# --- Generate AGENTS.md ---
emit_agents_md > "$AGENTS_FILE"
echo "Generated: $AGENTS_FILE"

# --- Copy knowledge files ---
echo ""
echo "Copying knowledge files..."
for knowledge_file in "$REPO_ROOT/KNOWLEDGE/"*.md; do
    knowledge_name="$(basename "$knowledge_file")"
    cp "$knowledge_file" "$KNOWLEDGE_DIR/$knowledge_name"
    echo "  OK $knowledge_name"
done

echo ""
echo "=== Setup complete ==="
echo ""
echo "Files created:"
echo "  $AGENTS_FILE"
echo "  $KNOWLEDGE_DIR/ ($(ls "$KNOWLEDGE_DIR" | wc -l | tr -d ' ') knowledge files)"
echo ""
echo "Note: Codex does not support MCP servers. Skills that depend on"
echo "quill-telemetry, crashlens, kiln-replay, opsdeck, or greenroom will have limited functionality."
