#!/usr/bin/env bash
set -euo pipefail

# skillset — Claude Desktop Setup
# Generates a system prompt file that Claude Desktop can reference,
# bundling skills + their knowledge dependencies into a single context file.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/platforms/claude-desktop/generated"

# --list: print the projection (projected_path<TAB>source_path<TAB>synth<TAB>note)
# and exit. Used by tools that need to know where each file would go without
# actually writing anything.
if [[ "${1:-}" == "--list" ]]; then
    printf 'skillset-context.md\t\t1\tpreamble + all skills + all knowledge + all agents\n'
    exit 0
fi

echo "=== skillset — Claude Desktop Setup ==="
echo "Repo:   $REPO_ROOT"
echo "Output: $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"

# --- Generate combined context file ---
OUTPUT_FILE="$OUTPUT_DIR/skillset-context.md"

{
    cat "$REPO_ROOT/platforms/claude-desktop/preamble.md"
    echo ""
    echo "---"
    echo ""

    echo "# Available Skills"
    echo ""

    for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
        skill_name="$(basename "$skill_file" .md)"
        echo "## $skill_name"
        echo ""
        cat "$skill_file"
        echo ""
        echo "---"
        echo ""
    done

    echo "# Knowledge Base"
    echo ""

    for knowledge_file in "$REPO_ROOT/KNOWLEDGE/"*.md; do
        knowledge_name="$(basename "$knowledge_file" .md)"
        echo "## $knowledge_name"
        echo ""
        cat "$knowledge_file"
        echo ""
        echo "---"
        echo ""
    done

    echo "# Agent Definitions"
    echo ""

    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
        agent_name="$(basename "$agent_file" .md)"
        echo "## $agent_name"
        echo ""
        cat "$agent_file"
        echo ""
        echo "---"
        echo ""
    done

} > "$OUTPUT_FILE"

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
echo "Note: Some skills require MCP servers (GitHub, Quill telemetry, Crashlens)."
echo "Configure these in your claude_desktop_config.json as needed."
