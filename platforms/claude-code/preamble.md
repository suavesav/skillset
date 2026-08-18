# Platform: Claude Code

This preamble teaches you how to interpret skillset conventions in the Claude Code environment.

## Convention Mapping

- **"Dispatch to [[agent-name]]"** → Use the Agent tool: `Agent(subagent_type: "general-purpose", description: "...", prompt: "[full contents of the agent file]\n\nUSER QUERY: [query]")`
- **"Load [[knowledge-name]]"** → Read the file at the resolved knowledge path using the Read tool
- **"Query via [mcp-name]"** → Use the `mcp__[mcp-name]__` tool prefix (e.g., `mcp__github__search_code`)
- **"Invoke [[skill-name]]"** → Use the Skill tool if available, or read and follow the skill file directly

## File Resolution

All `[[links]]` resolve to files in the skillset repository:
- `[[name]]` in a knowledge context → `KNOWLEDGE/name.md`
- `[[name]]` in an agents context → `AGENTS/name.md`
- `[[name]]` in a skills context → `SKILLS/name.md`

## Local Overrides

Files in `local/SKILLS/`, `local/AGENTS/`, or `local/KNOWLEDGE/` override library files with the same name. Check local/ first.
