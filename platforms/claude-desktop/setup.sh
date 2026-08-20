#!/usr/bin/env bash
set -euo pipefail

# skillset — Claude Desktop Setup
# Generates a system prompt file that Claude Desktop can reference,
# bundling skills + their knowledge dependencies into a single context file.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/platforms/claude-desktop/generated"

# --- Emitters: setup redirects these to disk, --emit prints them. ------------

emit_section() {
    echo "## $(basename "$1" .md)"
    echo ""
    cat "$1"
    echo ""
    echo "---"
    echo ""
}

emit_context() {
    cat "$REPO_ROOT/platforms/claude-desktop/preamble.md"
    echo ""
    echo "---"
    echo ""

    echo "# Available Skills"
    echo ""
    for skill_file in "$REPO_ROOT/SKILLS/"*.md; do emit_section "$skill_file"; done

    echo "# Knowledge Base"
    echo ""
    for knowledge_file in "$REPO_ROOT/KNOWLEDGE/"*.md; do emit_section "$knowledge_file"; done

    echo "# Agent Definitions"
    echo ""
    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do emit_section "$agent_file"; done
}

# Sources feeding the context file, in concatenation order.
context_inputs() {
    echo "platforms/claude-desktop/preamble.md"
    for f in "$REPO_ROOT/SKILLS/"*.md; do echo "SKILLS/$(basename "$f")"; done
    for f in "$REPO_ROOT/KNOWLEDGE/"*.md; do echo "KNOWLEDGE/$(basename "$f")"; done
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
        skillset-context.md) emit_context ;;
        *) echo "no such projected file: $1" >&2; return 1 ;;
    esac
}

# Walk the projection, calling `row <projected> <source> <synth> <note> <inputs>`.
walk_projection() {
    "$1" "skillset-context.md" "" "1" "preamble + all skills + all knowledge + all agents" \
        "$(context_inputs | paste -sd, -)"
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
        echo "The entire library — every skill, knowledge file, and agent — is flattened into one skillset-context.md that you paste in as a Claude Desktop project instruction. Nothing is loaded on demand."
        exit 0 ;;
esac

echo "=== skillset — Claude Desktop Setup ==="
echo "Repo:   $REPO_ROOT"
echo "Output: $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"

OUTPUT_FILE="$OUTPUT_DIR/skillset-context.md"
emit_context > "$OUTPUT_FILE"

echo "Generated: $OUTPUT_FILE"
echo ""

# --- Provide instructions ---
TOTAL_LINES=$(wc -l < "$OUTPUT_FILE" | tr -d ' ')
TOTAL_KB=$(( $(wc -c < "$OUTPUT_FILE") / 1024 ))

echo "=== Setup complete ==="
echo ""
echo "Context file: $OUTPUT_FILE ($TOTAL_KB KB, $TOTAL_LINES lines)"
echo ""
echo "To use with Claude Desktop:"
echo "  1. Open Claude Desktop settings"
echo "  2. Add the contents of $OUTPUT_FILE as a Project instruction"
echo "     or reference it as a file in your project"
echo ""
echo "Note: Some skills require MCP servers (quill-telemetry, crashlens, kiln-replay, opsdeck, greenroom)."
echo "Configure these in your claude_desktop_config.json as needed."
