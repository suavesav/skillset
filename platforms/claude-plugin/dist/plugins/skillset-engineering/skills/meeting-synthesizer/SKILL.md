---
description: >
  Turn a meeting transcript or raw notes into studio meeting notes — decisions, owned and dated actions, open questions, and what was explicitly not decided.
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


# Meeting Synthesizer

A meeting write-up is a record, not a summary. Its value is that six weeks later it can be trusted about what was settled. Load [[studio-comms-format]] for the template and the audience tiers; below is how to fill it without contaminating it.

## The evidence rule

**A decision must be quoted or paraphrased from the source. Never inferred.**

A room that circled a topic and moved on did not decide it, even when the direction was obvious to everyone present. A senior voice stating an unconfirmed preference is not a decision. If you cannot point at the line that settles it, it goes in **Open questions** or **Not decided**. With raw notes, the same rule applies to the note: it must record the settling, not your reconstruction of it.

## Four passes

**Pass 1 — Decisions.** Pull every point the source shows being settled. One sentence each, present tense, active voice, worded close enough to the source that a participant would recognize it. A decision that carries a condition keeps the condition ("we ship the nightly job, unless the build farm cannot hold the slot").

**Pass 2 — Actions.** Every action needs an **owner** and a **date**. An action with no owner named in the source is not assigned to the likeliest person; it goes to **Open questions** as "who owns X?" An action with an owner and no date goes in marked "date unset" so the gap stays visible. Owners are teams or roles unless the source names a person and the notes stay team-only.

**Pass 3 — Open questions.** Anything raised and left hanging, plus every ownerless action from Pass 2. One line each, phrased as a question so it is answerable.

**Pass 4 — Not decided.** Topics the room discussed and left unsettled on purpose, with the reason and where each goes next, so the question does not reopen from scratch later. **Not decided** is a deferral; **Open questions** is a loose end.

## Contradiction check

If the user supplies an earlier decision record or prior notes, compare the decisions from Pass 1 against them. Where this meeting contradicts something previously recorded, flag it above the notes:

> ⚠️ Conflicts with the 2026-02-18 record: replay bundles were set to 30-day retention there, 90 days here. Neither source says the earlier decision was revisited.

Flag it. Do not reconcile it, and do not pick the newer one as correct — a silent overwrite is how a studio ends up with two teams running on different rules. Reconciling is the participants' job.

## Attendees

List attendees by **role and count**, not by name, whenever the notes will leave the team's own channel: "3 engineering, 2 liveops, 1 design." Names are fine at the team-only tier. Apply the audience tiers in [[studio-comms-format]] to the body as well — codenames, partner names, and unannounced dates strip at the studio-wide tier.

## Deliverable

The four sections in template order, then a short **Coverage** note: what in the source you could not place, and anything that reads like a decision but failed the evidence rule. That note is how the reader knows the write-up is thin because the meeting was, not because you missed something.
