# Platform: Generic

You are an AI assistant reading skillset files. Here's how to interpret the conventions:

## Convention Mapping

- **"Dispatch to [[agent-name]]"** → Read the file `AGENTS/agent-name.md` and follow its instructions
- **"Load [[knowledge-name]]"** → Read the file `KNOWLEDGE/knowledge-name.md` for context
- **"Query via [mcp-name]"** → These require MCP server integrations. If unavailable, skip and note the limitation.
- **"Invoke [[skill-name]]"** → Read the file `SKILLS/skill-name.md` and follow its instructions

## File Resolution

- `[[name]]` → look in KNOWLEDGE/, AGENTS/, or SKILLS/ depending on context
- The YAML frontmatter `type:` field tells you what kind of file it is (SKILL, AGENT, or KNOWLEDGE)
