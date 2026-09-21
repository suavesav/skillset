---
description: >
  Build the dated beat sheet for an Emberwake season or a Drift Harbor drop — announce through week-2 sustain, with owners, lead times, and blackouts checked.
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


# Campaign Planner

A campaign plan is a table of dates with an owner on every row. Anything that is not a date, an asset, and a name is a conversation, not a plan.

Load [[marketing-calendar]] first — beat offsets, asset lead times, the sign-off rule, the showcase blackouts. Then [[studio-context]] for the launch date and build ID you count backward from. Everything in the plan derives from those two files; nothing is estimated.

## Step 1 — Fix L0

Find the launch in [[studio-context]]. Emberwake seasons are listed with dates and launch builds; Drift Harbor drops land roughly the first Tuesday of the month. Put the date and build ID at the top of the plan. If the named season is not in [[studio-context]], stop and ask — a beat sheet counted from a guessed L0 is worse than none.

## Step 2 — Date every beat

Apply the offsets in [[marketing-calendar]] to L0 and produce the table. Emberwake gets the full run; Drift Harbor gets the compressed one. Apply the weekend rule before you write the date down.

| Beat | Offset | Date | Ships | Signed by |
| --- | --- | --- | --- | --- |
| Key art lock | L−28 | … | | marketing |
| Announce | L−21 | … | | marketing |
| Trailer | L−14 | … | | marketing, design |
| Store-page submit | L−12 | … | | marketing, design |
| Creator embargo lift | L−3 | … | | marketing |
| Launch | L0 | … | | all three |
| Sustain | L+14 | … | | marketing |

Worked example, Season of the Silk Moth (L0 = 2026-02-10, `ew-3.4.0`): key art lock 2026-01-13, announce 2026-01-20, trailer 2026-01-27, store submit 2026-01-29, creator embargo lift 2026-02-06 (moved back from Saturday the 7th), launch 2026-02-10, sustain 2026-02-24.

Every row carries its signatures from [[marketing-calendar]] before it counts as planned: marketing on copy, design on screenshots and footage, liveops on the date and build.

## Step 3 — Work the lead times backward

For each beat, subtract the asset lead time in [[marketing-calendar]] and produce a second table of start dates. A start date already in the past is the finding — say so rather than dating the beat optimistically. Store assets also obey [[storefront-rules]]: console review is a five-business-day pass, and screenshots come from a release-candidate build.

## Step 4 — Check the blackouts

Confirm no announce or trailer beat falls inside a platform-holder showcase week or the three days after it. If one does, move it per [[marketing-calendar]] and re-date every earlier beat from the new anchor. Launch beats stay put.

## The codename rule

Per [[studio-context]] and [[studio-brand]], unannounced content carries a moth codename until the announce beat. **No draft copy, asset brief, shot list, or beat description may contain a real feature name before the announce date on the table you just built.** This holds for internal documents too — a beat sheet gets screenshotted. Write the codename, and note which beat retires it.

Close with what is unresolved: an unconfirmed date, a lead time that has already run out, a beat with a missing signature.
