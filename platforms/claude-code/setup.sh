#!/usr/bin/env bash
set -euo pipefail

# skillset — Claude Code Setup
# Symlinks skills, agents, and knowledge into ~/.claude/ so Claude Code discovers them.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

# Skills excluded from this platform — used by both --list and the actual setup below
SKIP_SKILLS="meta"

# Print the `assets:` filenames declared in a file's frontmatter, one per line.
declared_assets() {
    awk '
        /^assets:/ { inlist = 1; next }
        /^[a-z]/   { inlist = 0 }
        inlist && /^[[:space:]]*-[[:space:]]/ {
            gsub(/^[[:space:]]*-[[:space:]]*/, ""); gsub(/^"|"$/, ""); gsub(/^'"'"'|'"'"'$/, "")
            print
        }
    ' "$1"
}

# --list: print the projection (projected_path<TAB>source_path<TAB>synth<TAB>note)
# and exit. Used by tools that need to know where each file would go without
# actually writing anything to disk.
if [[ "${1:-}" == "--list" ]]; then
    for skill_file in "$REPO_ROOT/SKILLS/"*.md; do
        skill_name="$(basename "$skill_file" .md)"
        if echo "$SKIP_SKILLS" | grep -qw "$skill_name"; then continue; fi
        printf 'skills/%s/SKILL.md\tSKILLS/%s.md\t1\tpreamble + skill body\n' "$skill_name" "$skill_name"
        { grep -oE '\[\[[a-z0-9-]+\]\]' "$skill_file" 2>/dev/null || true; } | tr -d '[]' | sort -u | while read -r ref; do
            if [[ -f "$REPO_ROOT/KNOWLEDGE/$ref.md" ]]; then
                printf 'skills/%s/references/%s.md\tKNOWLEDGE/%s.md\t\t\n' "$skill_name" "$ref" "$ref"
            fi
        done
        while read -r asset; do
            [ -n "$asset" ] || continue
            [[ -f "$REPO_ROOT/ASSETS/$asset" ]] && \
                printf 'skills/%s/assets/%s\tASSETS/%s\t\t\n' "$skill_name" "$asset" "$asset"
        done < <(declared_assets "$skill_file")
    done
    for agent_file in "$REPO_ROOT/AGENTS/"*.md; do
        agent_name="$(basename "$agent_file" .md)"
        printf 'agents/%s.md\tAGENTS/%s.md\t\t\n' "$agent_name" "$agent_name"
    done
    exit 0
fi

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
    {
        cat "$REPO_ROOT/platforms/claude-code/preamble.md"
        echo ""
        echo "---"
        echo ""
        cat "$skill_file"
    } > "$skill_dir/SKILL.md"

    # Symlink references directory → KNOWLEDGE files this skill needs
    refs_dir="$skill_dir/references"
    rm -rf "$refs_dir"
    mkdir -p "$refs_dir"

    # Parse knowledge links from YAML header and symlink each.
    # grep -oE (ERE) instead of -oP (PCRE) so this runs on BSD grep (macOS default).
    { grep -oE '\[\[[a-z-]+\]\]' "$skill_file" 2>/dev/null || true; } | tr -d '[]' | sort -u | while read -r ref; do
        knowledge_file="$REPO_ROOT/KNOWLEDGE/$ref.md"
        if [[ -f "$knowledge_file" ]]; then
            ln -sf "$knowledge_file" "$refs_dir/$ref.md"
        fi
    done

    # Symlink assets/ → ASSETS files this skill declares. Assets are runnable
    # files the skill copies and executes, not markdown it reads.
    assets_dir="$skill_dir/assets"
    rm -rf "$assets_dir"
    while read -r asset; do
        [ -n "$asset" ] || continue
        [ -f "$REPO_ROOT/ASSETS/$asset" ] || continue
        mkdir -p "$assets_dir"
        ln -sf "$REPO_ROOT/ASSETS/$asset" "$assets_dir/$asset"
    done < <(declared_assets "$skill_file")

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

    {
        cat "$REPO_ROOT/platforms/claude-code/preamble.md"
        echo ""
        echo "---"
        echo ""
        cat "$local_skill"
    } > "$skill_dir/SKILL.md"

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
