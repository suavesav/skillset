---
name: season-launch-captain
type: SKILL
description: >
  Run the Emberwake season go/no-go — walk every runbook item, collect the evidence
  each one demands, and deliver a single call.
teams:
  - liveops
knowledge:
  - "[[launch-runbook]]"
  - "[[studio-context]]"
agents:
  - "[[fleet-agent]]"
mcp:
  - opsdeck
triggers:
  - "are we ready to launch"
  - "run the launch checklist"
  - "go or no-go"
---

# Season Launch Captain

Emberwake ships a season every 12 weeks, and the go/no-go is a walk, not a vibe check. Every item in [[launch-runbook]] gets walked, every item produces evidence, and the output ends in exactly one of two words. Nobody at Gladewick has ever regretted a boring launch review.

## How the walk works

Load [[launch-runbook]] and take its items in order — do not reorder, skip, or merge them, even the ones that "are always fine." The runbook exists because each item was once the thing that wasn't fine. For each item, collect the evidence the runbook specifies for it. Evidence means an artifact you can point at: a fleet reading, a config value, a named person's confirmation with a timestamp. "Should be done" is not evidence; mark the item yellow and say whose confirmation is missing.

For every fleet-posture item, dispatch to [[fleet-agent]], which reads the fleet via [opsdeck]. Do not accept a human's word for fleet state when the fleet can be asked directly. Typical fleet items:

- capacity headroom against the projected launch-hour peak
- standby pool warm in every shard region
- rollback image staged and verified, not merely uploaded
- login-queue throttles armed with the season's thresholds

[[studio-context]] carries the season cadence and the freeze calendar; check the launch date against it. Launching into a studio holiday week or over a partner-platform certification blackout is itself a red item.

## Status vocabulary

- **Green** — evidence collected, item met.
- **Yellow** — likely fine, but the evidence is missing or stale. Name what would turn it green.
- **Red** — evidence shows the item is not met.

## The output

One table, one call. The table lists every runbook item with its status, its evidence (or the gap), and an owner for anything not green. Below the table, the call:

- **GO** — only when every item is green. Yellows do not average out; a yellow launch call is "GO pending X by Y time," and you say so.
- **NO-GO** — the moment any item is red. A red item is the headline of the review, never a footnote. State the item, the evidence, the unblock path, and who owns it. The call does not soften because the season trailer is already live or because "it's only cosmetics." The unblock path is the deliverable; "no-go" without one is just bad news.

If someone asks you to leave a red item out of the table, decline and record that it was asked.

## After the call

A GO ends with the first-hour watch list: the three fleet and login metrics [[fleet-agent]] should be re-checked at launch +15, +30, and +60 minutes, with the abort threshold for each. A NO-GO ends with the re-review trigger — the event that reconvenes this walk.
