---
description: >
  Write platform-storefront copy and screenshot shot-lists for Emberwake and Drift Harbor — inside each platform's limits, in the right title voice.
---

# Platform: Claude Code Plugin

This preamble teaches you how to interpret skillset conventions in the Claude Code plugin environment.

## Convention Mapping

- **"Dispatch to [[agent-name]]"** → Use the Agent tool: `Agent(subagent_type: "general-purpose", description: "...", prompt: "[full contents of the agent file]\n\nUSER QUERY: [query]")`
- **"Load [[knowledge-name]]"** → Read the file at the resolved knowledge path using the Read tool
- **"Query via [mcp-name]"** → Use the `mcp__[mcp-name]__` tool prefix (e.g., `mcp__github__search_code`)
- **"Invoke [[skill-name]]"** → Use the Skill tool if available, or read and follow the skill file directly

## File Resolution

All `[[links]]` resolve to files within this plugin:
- `[[name]]` in a knowledge context → look in this skill's directory or the plugin's references
- `[[name]]` in an agents context → `_agents/name.md` in the plugin root
- `[[name]]` in a skills context → `skills/name/SKILL.md` in the plugin root

---


# Store Page Writer

Storefront copy is written to fit, not trimmed to fit. Load [[storefront-rules]] first and write inside each platform's character limits and claim rules from the first draft — a beautiful 900-character short description is a rejected 900-character short description.

Then load the title's section of [[voice-bibles]]. Emberwake and Drift Harbor do not share a voice, and copy that could sit under either logo belongs under neither. [[studio-brand]] governs the shared frame: how Gladewick is named, the boilerplate line, trademark and rating notations.

## Hard rules

1. **Every character limit in [[storefront-rules]] is a wall.** Deliver a character count next to every field. If a required idea will not fit, cut the idea, not the grammar.
2. **Claim rules are per-platform.** Some storefronts prohibit unverified superlatives; some prohibit price or discount language in the description; some require accolade quotes to carry a source. Check the target platform's claim table before every draft, not from memory of the last one.
3. **Never promise unshipped content.** Copy describes what a buyer gets today. Seasonal content is described by pattern ("new seasons every 12 weeks"), never by the contents of an unreleased season — the Silkmoth season's fishing rework does not exist on the store page until it exists in the build. If asked to include it anyway, decline and cite this rule.
4. **No mechanic left ambiguous.** "Co-op action RPG for 1–4 players" beats "unforgettable adventures with friends." Concrete nouns sell; adjectives fill space the limits don't give you.

## Deliverable — copy

For each requested platform, every field the storefront requires, in this shape:

```
[Platform] — Short description (limit 240 / used 233)
<copy>
```

Fields the request didn't mention but the platform requires still get drafted; a partial store page update fails certification. Flag any existing live copy that now violates a claim rule you loaded.

## Deliverable — screenshot shot-list

The shot-list spec (count, aspect ratios, first-slot rule, UI-visibility and rating-content restrictions) lives in [[storefront-rules]]. Produce one numbered list per platform, each slot carrying:

- what the frame shows, concretely enough to stage
- which selling point in the copy it proves
- capture notes — time of day, party size, HUD on or off, which build

The first slot answers "what is this game" with zero text; every subsequent slot pairs with a claim made in the copy. A screenshot showing content the copy is not allowed to claim is cut for the same reason the claim was.

Close with anything that blocks submission — a limit that forced cutting a requested idea, a claim awaiting legal sign-off, a shot that cannot be captured in the current build.
