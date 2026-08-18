#!/usr/bin/env bash
set -euo pipefail

# skillset — Codex Setup
# Generates an AGENTS.md file that Codex can read from the working directory,
# plus copies knowledge files into the project context.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# --list: print the projection (projected_path<TAB>source_path<TAB>synth<TAB>note)
# and exit. Used by tools that need to know where each file would go without
# actually writing anything.
if [[ "${1:-}" == "--list" ]]; then
    printf 'AGENTS.md\t\t1\tpreamble + all skills + all agents concatenated\n'
    for k in "$REPO_ROOT/KNOWLEDGE/"*.md; do
        kn="$(basename "$k" .md)"
        printf '.skillset/%s.md\tKNOWLEDGE/%s.md\t\t\n' "$kn" "$kn"
    done
    exit 0
fi

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
{
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
        skill_name="$(basename "$skill_file" .md)"
        echo "### $skill_name"
        echo ""
        cat "$skill_file"
        echo ""
        echo "---"
        echo ""
    done

    echo "## Agents"
    echo ""
    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
        agent_name="$(basename "$agent_file" .md)"
        echo "### $agent_name"
        echo ""
        cat "$agent_file"
        echo ""
        echo "---"
        echo ""
    done

} > "$AGENTS_FILE"

echo "Generated: $AGENTS_FILE"

# --- Copy knowledge files ---
echo ""
echo "Copying knowledge files..."
for knowledge_file in "$REPO_ROOT/KNOWLEDGE/"*.md; do
    knowledge_name="$(basename "$knowledge_file")"
    cp "$knowledge_file" "$KNOWLEDGE_DIR/$knowledge_name"
    echo "  OK $knowledge_name"
done

# --- Copy assets ---
# Runnable files (scripts, templates) that skills copy and execute rather than
# read. Everything in ASSETS/ ships; skills reference them by filename.
if [ -d "$REPO_ROOT/ASSETS" ]; then
    echo ""
    echo "Copying assets..."
    ASSETS_TARGET="$KNOWLEDGE_DIR/assets"
    mkdir -p "$ASSETS_TARGET"
    for asset_file in "$REPO_ROOT/ASSETS/"*; do
        [ -f "$asset_file" ] || continue
        asset_name="$(basename "$asset_file")"
        cp "$asset_file" "$ASSETS_TARGET/$asset_name"
        echo "  OK assets/$asset_name"
    done
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Files created:"
echo "  $AGENTS_FILE"
echo "  $KNOWLEDGE_DIR/ ($(ls "$KNOWLEDGE_DIR" | wc -l | tr -d ' ') knowledge files)"
echo ""
echo "Note: Codex does not support MCP servers. Skills that depend on"
echo "GitHub, Quill telemetry, or Crashlens will have limited functionality."
