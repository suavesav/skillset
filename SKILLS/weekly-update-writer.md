---
name: weekly-update-writer
type: SKILL
description: >
  Turn a week of notes, merged work, tickets, and meeting outcomes into the
  studio's Friday update — shipped, in progress, blocked, next, one line each.
teams:
  - all
knowledge:
  - "[[studio-comms-format]]"
  - "[[studio-context]]"
agents: []
mcp: []
triggers:
  - "write my weekly update"
  - "turn this into a weekly update"
  - "Friday update"
---

# Weekly Update Writer

The reader of a weekly update is scanning forty of them. Load [[studio-comms-format]] for the template and the tone rules; this skill is how to get raw week material into that template without inflating it.

## What the user gives you

Whatever they have: scratch notes, merged branches, ticket titles, meeting outcomes, a chat backlog. Take it as-is. Do not ask for more before drafting; draft from what is there and name the gaps at the end.

## Sorting

Every item lands in exactly one of four sections. The test is the item's state on Friday, not how much work went into it.

- **Shipped** — it is live, merged, or in players' hands. A thing that is "done but not deployed" is in progress. Shipped items carry the build ID (`ew-` / `dh-`, scheme in [[studio-context]]) and the observable result.
- **In progress** — started, not finished, still moving. Give the expected landing, not a percentage.
- **Blocked** — not moving, and something outside the writer's control is why. Each blocked line names the **owning team** from the ownership table in [[studio-context]] and the date the ask went out. "Waiting on the build farm" is not a blocker line; "waiting on engineering for a build-farm slot, asked Tuesday" is.
- **Next** — what starts Monday. One or two items. A "next" section listing six things is a backlog, and nobody reads it as a commitment.

Items that fit nowhere are not items. A meeting attended, a doc read, a thread replied to — these are the week, not the update. Drop them.

## Rewriting each line

- Replace adjectives with the number they were standing in for. "Big perf win" becomes "frame time 18.4ms → 14.1ms on the console captures." If the user has no number, write the line without one rather than inventing a magnitude.
- Write the outcome, not the activity. "Investigated the desync reports" is activity; "traced the desync to clock drift in the tide-gate encounter, fix in review" is outcome.
- Collapse related items. Four merged branches that together fix one crash are one line.

## Codename check

Run this before handing back any update headed for a studio-wide audience. Per the codename policy in [[studio-context]], unannounced content uses its moth codename; the real feature name does not appear. Scan the draft for unannounced feature names, unannounced dates, and named partners, and substitute per the audience tiers in [[studio-comms-format]]. When you are unsure whether something is announced, flag it rather than publish it.

## Thin weeks

A week with two shipped items and nothing blocked produces a four-line update. That is the correct output. Never pad with restated ongoing work or things that will happen anyway. Where the material does not support a section, the section reads "none."

## Deliverable

The update in the [[studio-comms-format]] template, ready to paste. Below it, two short notes outside the update itself:

- **Gaps** — items whose state you had to guess, and any number the user should fill in before posting.
- **Substitutions** — anything you replaced for the codename policy, so the user can confirm the call.
