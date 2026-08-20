# skillset

A shareable, version-controlled library of AI skills, agents, and knowledge for Gladewick Games (a fictional game studio — this repo is a demonstration of the library *pattern*, populated with dummy content). Works with Claude Code, Claude Desktop, OpenAI Codex, and any AI tool that can read files.

## The Core Concept

Most AI "skill" setups are platform-specific: a Claude Code skill can't be read by Codex, a Desktop project prompt can't dispatch subagents, and knowledge gets copy-pasted between them until the copies drift. skillset inverts this: the library is **plain markdown files with YAML frontmatter**, written once in platform-neutral language, and thin per-platform **projectors** compile them into whatever each tool expects.

Three ideas carry the whole system:

**1. Flat files, three roles.** Every capability is decomposed into skills (entry points a user triggers), agents (focused workers a skill dispatches), and knowledge (reference material loaded on demand). Each is one markdown file in a flat folder — no nesting, no hidden wiring:

```
SKILLS/    → entry points. Users trigger these.
AGENTS/    → workers. Skills dispatch to these.
KNOWLEDGE/ → reference files. Skills and agents load these on demand.
ASSETS/    → runnable files. Skills copy and execute these, never read them.
```

**2. Frontmatter is the dependency graph.** Every file declares what it needs in a YAML header, and all cross-references use Obsidian-style `[[links]]`:

```yaml
---
name: encounter-tuner
type: SKILL
teams:
  - design
  - liveops
description: >
  Tune a fight that feels wrong — quantify the difficulty, simulate candidate
  changes, and hand back a tuning table, not an opinion.
knowledge:
  - "[[encounter-tuning-model]]"
  - "[[telemetry-schema]]"
agents:
  - "[[quill-agent]]"
  - "[[sim-agent]]"
mcp:
  - quill-telemetry
triggers:
  - "this boss feels too hard"
---
```

A reader (human or model) understands a file's full dependency closure from its header alone. Tooling — validators, projectors, the viewer's graph page — traverses the same `[[link]]` graph instead of guessing.

**3. The preamble makes bodies portable.** Skill bodies never say "call the Agent tool" or name a platform API. They say "Dispatch to [[sim-agent]]", "Load [[loot-math]]", "Query via quill-telemetry". Each platform ships a short **preamble** (`platforms/*/preamble.md`, ~15-20 lines) that teaches the model how to interpret those phrases in its environment — the Claude Code preamble maps "Dispatch to" onto the Agent tool, the Codex preamble maps it onto reading a section of AGENTS.md. The preamble is the *only* platform-specific content in the system; setup scripts prepend it during projection.

## Quick Start

### Claude Code plugin

```
/plugin marketplace add suavesav/skillset
/plugin install skillset-all@skillset
```

`skillset-all` is the full suite. To install only one team's skills, use `skillset-engineering`, `skillset-liveops`, or `skillset-design`.

### File-based setups

```bash
git clone git@github.com:suavesav/skillset.git ~/skillset

# Claude Code (symlinks into ~/.claude/)
~/skillset/platforms/claude-code/setup.sh

# Claude Desktop (bundles everything into one context file)
~/skillset/platforms/claude-desktop/setup.sh

# OpenAI Codex (projects into AGENTS.md + .skillset/)
~/skillset/platforms/codex/setup.sh
```

## What's Inside

| Skill | What it does | MCP needed |
|-------|-------------|------------|
| `accessibility-auditor` | Audit screens against the studio accessibility checklist | — |
| `bark-writer` | Ambient NPC dialogue in the correct title voice, VO-length-safe | — |
| `community-pulse` | Digest player discussion into volume-weighted themes | greenroom |
| `desync-hunter` | Locate and classify co-op desyncs from replay bundles | kiln-replay |
| `encounter-tuner` | Quantify fight difficulty, sim candidate changes, output a tuning table | quill-telemetry |
| `frame-budget-auditor` | Audit perf captures against per-platform frame budgets | — |
| `liveops-briefing` | Daily health brief for both titles, anomalies first | quill-telemetry, crashlens, opsdeck |
| `loot-table-designer` | Drop tables with pity math, sim-verified perceived odds | — |
| `matchmaking-analyst` | Queue-time vs match-quality trade-offs inside policy | quill-telemetry |
| `playtest-synthesizer` | Turn raw playtest notes into ranked, evidence-counted findings | — |
| `quest-scripter` | Draft Kiln Lua quest logic from a design brief, house patterns | — |
| `save-migration-planner` | Plan save-schema migrations and the compatibility test matrix | — |
| `season-launch-captain` | Run the season go/no-go checklist with evidence per item | opsdeck |
| `shard-capacity-planner` | Forecast shard fleet for launches from the capacity model | opsdeck |
| `store-page-writer` | Storefront copy and shot lists inside platform rules | — |
| `meta` | Library self-management — pull, status, drafts (repo clone only) | — |

Agents (`AGENTS/`) are the workers these skills dispatch to; knowledge (`KNOWLEDGE/`) holds the schemas, conventions, and studio context they load. `KNOWLEDGE/mcp-registry.md` documents how to configure every MCP server the library references.

## Team Plugins

Each skill declares a `teams:` list in its frontmatter (`engineering`, `liveops`, `design`, or `all`). The plugin build (`platforms/claude-plugin/build.sh`) emits **one plugin per team** plus the everything-plugin:

- `skillset-all` — every skill
- `skillset-engineering` — frame budgets, desyncs, save migrations, shard capacity
- `skillset-liveops` — launch runbooks, matchmaking, community pulse, daily briefings
- `skillset-design` — encounters, loot, quests, dialogue, accessibility

`teams:` is many-to-many — a skill useful to several teams lists them all. A team plugin ships only the agents and knowledge its skills **transitively reference** via the `[[link]]` graph, so installing `skillset-design` doesn't drag along the replay-analysis machinery. The build also generates a `plugin.json` per plugin and a single `marketplace.json` at the repo root, which is what `/plugin marketplace add` reads.

## The Viewer

A local web app for browsing the library the way it's meant to be read — as a linked graph, not a folder of files. It is read-only: it renders the repository and never writes to it.

```bash
cd viewer && npm install && npm run dev
```

- **Files** — browse SKILLS/AGENTS/KNOWLEDGE with rendered markdown, resolved `[[links]]`, and per-file dependency panels; filter by team bundle. A platform selector re-renders the tree as any projector's output — what lands where, which files are synthesized from which inputs, and the exact compiled bytes of each artifact
- **Graph** — the whole library as an interactive dependency graph (skills → agents → knowledge)
- **Diff** — compares a local install against the library side by side: drift in edited skills, local-only skills, library-only skills. Comparison only; nothing is written back

## Local Overrides

Customize a skill without touching library files: put your version in `local/SKILLS/`, `local/AGENTS/`, or `local/KNOWLEDGE/`. The `local/` directory is gitignored; setup scripts apply it last, so your copies override library versions with the same name and never conflict with upstream pulls.

## Contributing

1. Create or edit files in `SKILLS/`, `AGENTS/`, or `KNOWLEDGE/` per the format in `CLAUDE.md`
2. Run `scripts/validate.sh` — it checks frontmatter, `[[link]]` resolution, and platform-agnostic rules (no hardcoded paths, no platform API syntax)
3. Bump `VERSION` and note the change in `CHANGELOG.md`

## Structure

```
skillset/
├── SKILLS/          ← skill definitions (entry points)
├── AGENTS/          ← agent definitions (workers)
├── KNOWLEDGE/       ← reference files (domain knowledge)
├── ASSETS/          ← runnable files skills execute, never read
├── platforms/       ← platform-specific projection
│   ├── claude-code/     ← file-based setup (symlinks into ~/.claude/)
│   ├── claude-plugin/   ← plugin marketplace build (build.sh → dist/)
│   ├── claude-desktop/  ← single bundled context file
│   ├── codex/           ← AGENTS.md + .skillset/ projection
│   └── generic/         ← preamble for any file-reading AI tool
├── viewer/          ← local web app (read-only): browse, graph, diff
├── scripts/         ← validate.sh / validate.py
├── local/           ← gitignored personal overrides
├── VERSION
├── CHANGELOG.md
└── CLAUDE.md        ← authoring guide and format spec
```
