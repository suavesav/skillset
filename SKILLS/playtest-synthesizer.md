---
name: playtest-synthesizer
type: SKILL
description: >
  Turn raw playtest session notes into ranked findings — clustered, counted by
  independent occurrence, and severity-scored per the Gladewick protocol.
teams:
  - design
knowledge:
  - "[[playtest-protocol]]"
agents: []
mcp: []
triggers:
  - "synthesize the playtest"
  - "what did the playtest tell us"
  - "summarize the session notes"
---

# Playtest Synthesizer

Raw session notes are testimony. Your job is the verdict. Load [[playtest-protocol]] first — it defines the severity rubric and the session-scoring rules this skill applies; nothing here overrides it.

Work through the notes in four passes. Do them in order; each pass corrupts if the previous one was skipped.

**Pass 1 — Separate observations from suggestions.** An observation is something a tester *did or experienced*: "got lost leaving the boathouse," "died three times to the tide gate," "sighed and put the controller down." A suggestion is something a tester *proposed*: "you should add a map marker." Suggestions go in their own bucket and never merge into findings. Testers are reliable witnesses to their own experience and unreliable designers of the fix — the protocol is explicit on this. A suggestion may still point at an observation ("add a marker" implies "I was lost"); extract the implied observation and keep the suggestion attributed as color.

**Pass 2 — Cluster.** Group observations that describe the same underlying friction, even when the surface wording differs. "Couldn't find the ferry contract" and "wandered the docks for five minutes" are one cluster if both trace to the dh-build's unlit contract board. Name each cluster by the friction, not the location.

**Pass 3 — Count independent occurrences.** One tester, one cluster, one count — a tester who hits the same wall in session 1 and again in session 2 counts **once**. Repetition within a tester tells you persistence, and you may note it, but the evidence count answers "how many *people* hit this," because that is what predicts the live population. Record the count as `n of N testers`.

**Pass 4 — Score severity.** Apply the severity ladder from [[playtest-protocol]] to each cluster:

- blocked progress
- abandoned the activity
- needed moderator help
- visible friction, recovered unaided
- verbal grumble, no behavior change

Severity and frequency are independent axes: a 1-of-8 hard block outranks a 6-of-8 grumble.

## The deliverable

Ranked findings, ordered by severity then frequency:

```
1. [S1 · 3/8] Testers could not find the ferry contract board — all three
   abandoned the quest. Evidence: T2 s1, T5 s1, T7 s2.
2. [S3 · 6/8] Tide-gate timing read as unfair on first encounter...
```

Each finding: severity tag, evidence count, one-sentence friction statement, and the session references so a designer can go read the raw moment. After the ranked list, two short sections:

- **Tester suggestions** — the Pass 1 bucket, attributed, unranked, explicitly labeled as proposals rather than evidence.
- **Quietest signal worth watching** — the one low-count observation you would bet recurs at scale (a single tester doing something odd that the design assumes nobody does). Name it and say what a future session should probe.

Do not pad. Eight sessions rarely support more than five real findings; a twelve-finding synthesis means Pass 2 failed.
