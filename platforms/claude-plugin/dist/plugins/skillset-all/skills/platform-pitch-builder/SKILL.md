---
description: >
  Build a featuring pitch to a storefront's editorial team for an Emberwake season or a Drift Harbor drop — hook, confirmed dates, asset checklist, prior history, the ask.
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


# Platform Pitch Builder

A featuring pitch is a scheduling document, not an ad. The editorial team on the other side is filling a calendar: they need a date they can plan a slot around, an asset pack that clears their spec on the first pass, and one sentence about why this beat earns the slot. The rest is padding.

## Ground rules

- **Never promise a date liveops has not confirmed.** A pitch carries confirmed dates only. An unconfirmed beat is pitched as a window ("late in the season") with the date it firms up named in the same line. One slipped date costs the next three slots.
- **Codename policy applies to every draft.** Per [[studio-context]], unannounced content stays behind its moth codename until the season is announced — in the pitch, in asset filenames, in the cover note, NDA or no NDA. Pitch the shape of the beat, not its feature names.
- **Lead times come from [[platform-partner-playbook]], not from memory.** Each storefront family runs its own cutoffs. If the beat is already inside the cutoff for the slot you want, say so in the first line of the pitch and ask for the largest slot still reachable.
- **One storefront, one pitch.** The same beat gets a different hook per family. A pitch that reads as a form letter is read as one.

## Build order

1. **Beat and dates.** Title, season or drop, launch build, confirmed date or window — from [[studio-context]]. Everything downstream hangs on this line being true.
2. **History.** Dispatch to [[dealbook-agent]] for this storefront's featuring record with Gladewick: slots won and declined, dates, durations, the outcome logged against each, and any live promo commitment already on the calendar. Pitch against what landed last time, not against what was asked for.
3. **The hook.** One sentence in that family's currency per the playbook: exclusive content, timed beat, accessibility feature, platform feature. If the beat has none of the four, the honest ask is a smaller slot.
4. **Asset checklist** against that storefront's spec in [[storefront-rules]] — screenshot counts and resolutions, description limits, claim rules, trailer cuts. Every line marked `ready` / `needed` / `blocked`, with an owning role.
5. **Conflicts.** Check the beat against the playbook's blackout weeks and the storefront's own sale calendar. A pitch landing in a blackout is declined unread.
6. **The ask, and the fallback.** One named slot with one date range, then the next-smaller slot. The fallback is what makes the answer yes.

## The pitch

| Section | Contents |
| --- | --- |
| Hook | one sentence, their currency |
| Dates | confirmed date or stated window, plus the build ID |
| What's new | two lines, mechanics not adjectives |
| Platform line | the feature, mode, or content specific to them |
| Assets | the checklist, status per line |
| Ask | slot, date range, duration |
| Fallback | the next-smaller slot |

Close with one line on what the last pitch to this storefront won, and how it performed.

## Failure modes

- A hook that is a marketing line instead of a reason for the slot.
- An asset status of "in progress". That is `blocked` with better manners.
- A date range spanning a blackout week, or featuring history quoted from memory.
