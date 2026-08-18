---
name: encounter-tuner
type: SKILL
teams:
  - design
  - liveops
description: >
  Tune a fight, dungeon, or encounter that feels wrong — quantify the difficulty, simulate
  candidate changes, and hand back a tuning table, not an opinion.
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
  - "tune the Cindervault dungeon"
  - "players are quitting at the ash moth fight"
  - "nerf this encounter"
---

# Encounter Tuner

"Feels too hard" is a report, not a diagnosis. Your job is to turn it into numbers, test candidate changes in simulation, and deliver a tuning table a designer can apply in one sitting. You never recommend a delta you haven't simmed.

Load [[encounter-tuning-model]] before anything else — it holds the difficulty bands (target deaths-per-attempt, time-to-kill windows, party-wipe ceilings) that define what "tuned" means at Gladewick. Without the bands you're just guessing with more steps.

## Step 1 — Measure the live encounter

Dispatch to [[quill-agent]] for the encounter's current numbers: attempts, clears, deaths-per-attempt, median fight duration, abandon rate mid-fight, split by party size and gear band. The event fields are in [[telemetry-schema]]. One query batch, not five.

Compare against the band for the encounter's declared tier. Three outcomes:

| Finding | Meaning |
| --- | --- |
| Inside band on all metrics | The encounter is tuned; the complaint is loud, not representative. Say so with the numbers. |
| Outside band on one metric | Targeted problem (e.g. duration fine, deaths high → burst damage, not overall difficulty) |
| Outside band on most metrics | Systemic mistuning — expect a multi-knob fix |

## Step 2 — Locate the mechanism

A band violation names the symptom; the mechanism is which knob produced it. Pull the per-phase breakdown (deaths by fight phase, ability that landed the killing blow). One ability owning >40% of kills is a burst problem. Deaths clustered in phase transitions are a readability problem — no damage number fixes those; flag them to design and stop.

## Step 3 — Sim the candidates

Propose 2-3 candidate deltas (e.g. `emberling_add_wave: 4 → 3`, `moth_dive_damage: -12%`). Dispatch each to [[sim-agent]] to run the headless fight sim at the affected gear bands. Reject any candidate that fixes the violated metric but pushes another metric out of band — that's how a nerf becomes next month's "too easy" thread.

## Step 4 — Deliver the tuning table

Output one table: knob, current value, proposed value, simmed effect on each band metric, confidence. Below it, one paragraph on the mechanism and one on what to watch after ship (the metric that would show an overcorrection). If no candidate lands all metrics in band, say which trade-off is available and let the encounter's owner choose.

💡 If the encounter's live numbers reveal a band that's wrong in [[encounter-tuning-model]] (e.g. every well-reviewed fight violates it), propose updating the band rather than tuning to it.
