---
name: encounter-tuning-model
type: KNOWLEDGE
description: Gladewick difficulty bands per encounter tier — deaths-per-attempt, time-to-kill, wipe ceilings — and the rules for tuning against them
---

# Encounter Tuning Model

Every Emberwake encounter declares a tier, and every tier has bands. "Tuned" means inside the band on all metrics for the encounter's tier, measured on the intended gear band. Feelings are input; bands are the verdict.

## Bands by tier

| Tier | Deaths / attempt (p50) | Fight duration (p50) | Party wipe rate | Mid-fight abandon |
| --- | --- | --- | --- | --- |
| Story | 0 – 0.3 | 1 – 3 min | < 2% | < 1% |
| Vault (4-player) | 0.5 – 1.5 | 4 – 8 min | 5 – 15% | < 4% |
| Apex (endgame) | 1.5 – 4.0 | 8 – 14 min | 20 – 45% | < 8% |
| Seasonal spectacle | 0.2 – 0.8 | 5 – 10 min | < 8% | < 2% |

Drift Harbor has no combat; its equivalent bands (task friction) live with the playtest program — see [[playtest-protocol]] for how those sessions are scored.

## Measurement rules

- Measure on the **intended gear band** only. Overgeared clears polluting the sample is the #1 cause of phantom "too easy" verdicts.
- Exclude the first 48h after an encounter ships — learning effect dominates and every band reads hard.
- A band applies per encounter, not per boss phase. Phase-level pain with encounter-level compliance is a pacing note for design, not a tuning bug.

## Tuning rules

- One knob at a time per shipped change wherever possible; multi-knob changes make live verification unreadable.
- Damage knobs move in ≤15% steps. Add/wave-count knobs move by 1. HP knobs move in ≤10% steps. Bigger jumps skip the band and land in the opposite complaint.
- Never tune an Apex encounter easier inside its first season — Apex reputation is the product. Document the violation and hold unless wipe rate exceeds 60%.
- Readability problems (deaths concentrated in phase transitions, kills by off-screen abilities) are not solvable with number knobs. Route them to encounter design.

## After a tuning ship

Watch the violated metric and its **opposite neighbor** (nerfed damage → watch duration; cut a wave → watch wipe rate) for one week. An overcorrection shows up in the neighbor first.
