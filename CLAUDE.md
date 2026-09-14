# skillset — Agent Instructions

This is a shareable, version-controlled library of AI skills, agents, and knowledge for Gladewick Games, a game development studio. It is platform-agnostic — the same files work across Claude Code (via plugin), OpenAI Codex, and any AI tool that reads markdown.

## Architecture

Three flat folders. No nesting within them.

```
SKILLS/    → entry points. Users trigger these.
AGENTS/    → workers. Skills dispatch to these.
KNOWLEDGE/ → reference files. Skills and agents load these on demand.
ASSETS/    → runnable files. Skills copy and execute these, never read them.
```

Every file has a YAML frontmatter header declaring its type and dependencies. The body is platform-agnostic markdown.

## File Format

```yaml
---
name: <kebab-case name matching the filename>
type: SKILL | AGENT | KNOWLEDGE
description: <one-line description>
teams:                        # SKILL only — which team bundles include this skill
  - engineering               # any team name, or `all` for every bundle
knowledge:                    # SKILL and AGENT only
  - "[[knowledge-file-name]]"
agents:                       # SKILL only
  - "[[agent-name]]"
mcp:                          # SKILL and AGENT only
  - mcp-server-name
triggers:                     # SKILL only
  - "natural language trigger phrase"
---

# Body content here (platform-agnostic markdown)
```

## KNOWLEDGE vs ASSETS

The distinction is **read versus run**, and it decides where a file belongs.

**KNOWLEDGE** is markdown the model reads and reasons over — query patterns, brand rules, schemas, conventions. It enters the context window. Code examples belong here when they are _illustrative_: snippets you adapt rather than execute.

**ASSETS** are files the model copies and runs without reading — build scripts, templates, harnesses. They should never enter the context window. A large helper module read into context and then re-emitted verbatim into a generated script costs the output twice; copied as a file, it costs nothing.

The test: **would the model rewrite this file's contents into its own output?** If yes, it's an asset. If it would read it to learn something and then write something different, it's knowledge.

`ASSETS/` is flat, holds no markdown, and its files carry no frontmatter — they are code, not documents. Skills and agents declare them by **bare filename with extension**, not `[[links]]`:

```yaml
assets:
  - "simbench.mjs"
```

They are not `[[links]]` because assets aren't part of the markdown knowledge graph and their extensions would collide with the link syntax. Projectors place them in an `assets/` directory beside `references/`, so a skill body refers to `assets/simbench.mjs`.

Document an asset's interface in a KNOWLEDGE file — what it exports, how to call it — so the model can use it without reading it.

## The `[[link]]` Convention

All cross-references use Obsidian-style `[[links]]`:

- `[[loot-math]]` → `KNOWLEDGE/loot-math.md`
- `[[sim-agent]]` → `AGENTS/sim-agent.md`
- `[[encounter-tuner]]` → `SKILLS/encounter-tuner.md`

Use `[[links]]` in both YAML headers and markdown body text. The platform projector resolves them to actual paths during setup.

## Design Principles

**Platform-agnostic bodies.** Never use platform-specific syntax (Claude Code Agent() calls, Codex tool names, etc.) in skill or agent bodies. Use neutral language: "Dispatch to [[agent-name]]", "Load [[knowledge-name]]", "Query via [mcp-name]". The platform preamble (in `platforms/`) teaches the AI how to interpret these.

**Flat structure.** No subdirectories within SKILLS/, AGENTS/, or KNOWLEDGE/. One file per skill, agent, or knowledge topic. If a concept needs its own file, it gets one at the top level of the appropriate folder.

**Explicit dependencies.** Every file declares what it needs in its YAML header. No hidden wiring, no implicit assumptions about what's available. A reader should understand a file's dependencies from its header alone.

**`[[links]]` are the dependency graph.** They connect skills → agents → knowledge. The meta skill and the platform projectors traverse this graph. Keep it accurate.

**Local overrides never touch library files.** Personal customizations go in `local/SKILLS/`, `local/AGENTS/`, or `local/KNOWLEDGE/`. The `local/` directory is gitignored. The setup scripts check local/ first and override library files with the same name.

**Self-healing knowledge.** KNOWLEDGE files are living documents. Skills and agents propose updates (marked with a 💡) when they discover new information. All proposed changes require user confirmation before being written.

**Team bundles.** Each SKILL declares a `teams:` list. The claude-plugin build emits one plugin per team (`skillset-<team>`) so people install only the skills their role needs, plus a `skillset-all` plugin containing everything. A skill joins a team's plugin when its `teams:` includes that team **or** `all`. `teams:` is many-to-many — a skill useful to several teams lists them all. Team plugins ship only the agents and knowledge their skills transitively reference (resolved via the `[[link]]` graph), so nothing irrelevant tags along. `all` is a reserved keyword, not a team; a skill tagged `all` goes into every plugin, but it does not produce its own team plugin (the everything-plugin is `skillset-all`).

## Adding a New Skill

1. Create `SKILLS/<name>.md` with the YAML header (type: SKILL, teams, knowledge, agents, mcp, triggers). Set `teams:` to the team bundles that should include it (or `all`).
2. Write the body in platform-agnostic language using `[[links]]`
3. If it needs new agents, create them in `AGENTS/`
4. If it needs new knowledge, create it in `KNOWLEDGE/`
5. If it needs MCP servers not yet in the registry, add them to `KNOWLEDGE/mcp-registry.md`
6. Bump VERSION and update CHANGELOG.md

## Adding a New Agent

1. Create `AGENTS/<name>.md` with the YAML header (type: AGENT, knowledge, mcp)
2. Reference it from the parent skill's `agents:` list and body
3. Keep agents focused — one clear job per agent

## Adding a New Knowledge File

1. Create `KNOWLEDGE/<name>.md` with the YAML header (type: KNOWLEDGE, description)
2. Reference it with `[[name]]` from any skill or agent that needs it

## Adding a New Asset

1. Confirm it is run, not read — see "KNOWLEDGE vs ASSETS" above
2. Create `ASSETS/<name>.<ext>`. No frontmatter, no subdirectories
3. Declare it in the consuming skill or agent's `assets:` list by bare filename
4. Document its interface in a KNOWLEDGE file so the model can use it without reading it
5. The skill body must say **copy it and run it**, explicitly not paste its contents

## Adding a New Platform

1. Create `platforms/<name>/preamble.md` — convention mapping (how to interpret "Dispatch to", "Load", "Query via")
2. Create `platforms/<name>/setup.sh` — wires the library into the platform's expected locations
3. The preamble is the only platform-specific content. Keep it short (~15-20 lines).

## The `claude-plugin` Platform

The `platforms/claude-plugin/` platform compiles the library into Claude Code plugin marketplace format.

**Build:** `platforms/claude-plugin/build.sh` — produces `dist/` containing the marketplace structure.

**What it does:**

- Prepends the preamble to each skill body
- Rewrites YAML frontmatter from skillset format to plugin format (`description` only)
- Resolves `[[links]]` by copying KNOWLEDGE files into each skill's `references/` directory
- Outputs agents to `_agents/` (underscore prefix prevents Claude Code from auto-discovering them as plugin agents)
- Emits **one plugin per team** (`skillset-<team>`, from each skill's `teams:` field) plus a `skillset-all` plugin with everything. Team plugins include only the agents/knowledge their skills transitively reference.
- Generates a `plugin.json` per plugin and a single `marketplace.json` listing all of them (with `category`/`tags` per team plugin)
- Skips `meta` (repo-management only — update, publish, reflect, status)

**Root marketplace.json:** `.claude-plugin/marketplace.json` at the repo root is regenerated by `build.sh` and lists every plugin (`skillset-all` + per-team), each sourced from `./platforms/claude-plugin/dist/plugins/<name>`. This is what `/plugin marketplace add <owner>/skillset` reads.

## What NOT to Do

- No platform-specific syntax in SKILLS/, AGENTS/, or KNOWLEDGE/ files
- No hardcoded user paths (`~/.claude/`, `/Users/someone/`) — use `[[links]]` and let the projector resolve
- No subdirectories within the three main folders
- No modifying library files for personal customization — use `local/`
- No committing local/ contents

## Versioning

- `VERSION` file contains semver (e.g., `0.1.0`)
- `CHANGELOG.md` documents what changed in each version
- Bump patch version for new skills/agents and updates to existing ones
- Bump minor version for structural or breaking changes to the library itself
- The meta skill reads VERSION to detect available updates
