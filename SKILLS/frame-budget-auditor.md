---
name: frame-budget-auditor
type: SKILL
description: >
  Read a Kiln perf-capture export against the per-platform millisecond budgets,
  separate sustained overages from spikes, and name the violating system.
teams:
  - engineering
knowledge:
  - "[[frame-budgets]]"
agents: []
mcp: []
triggers:
  - "why is the frame rate dropping"
  - "audit this perf capture"
  - "we're over budget in the harbor"
assets: []
---

# Frame Budget Auditor

Input: a Kiln perf-capture export (`.kperf`, per-frame system timings). Output: an audit table naming which system is over budget, in what pattern, and the likely suspects. Not code fixes — the owning team decides the fix; the audit's job is to make sure they're fixing the right system.

Load [[frame-budgets]] for the per-platform, per-system millisecond allocations. A number means nothing without its budget line: 4.1ms of particles is fine on PC at 16.6ms total, and a violation on the handheld target at 33.3ms where particles get 2.5ms. Always audit against the capture's actual platform, not the dev machine's.

## Classify before you accuse

For each system, compute p50 and p99 frame cost across the capture, then classify:

| Pattern | Definition | Reads as |
| --- | --- | --- |
| Sustained overage | p50 above budget | The system's steady-state cost is too high — content or config, present every frame |
| Spike | p50 in budget, p99 over by 2x+ | Something intermittent — an event, a load, a burst |
| Creep | in budget, but p50 within 10% of the line | Not a violation yet; note it, because the next content drop makes it one |
| Frame-pacing | totals in budget, frame times uneven | Not a per-system cost problem — flag to the engine team, stop attributing |

Sustained overages and spikes have different suspects and different owners. An audit that averages them together produces a number nobody can act on.

## Name the suspect

A system name is a start; a scene-level suspect is the deliverable. Cross-reference the overage against the capture's location and time-of-day markers:

- Particles sustained-over only in the Ashfall market at dusk → lantern overdraw, the market's stacked emitters against the fog volume.
- Script spikes every 30s in Drift Harbor's Pelican Quay → a Lua tick doing per-visitor work on the ferry-arrival timer.
- Streaming spikes at the Cindervault threshold → the vault's tile set loading in one gulp instead of the prefetch window.

State confidence honestly: "particles, sustained, market-at-dusk, high confidence" versus "physics, spiking, no location correlation found — needs a longer capture."

A capture can also disqualify itself. Under 3 minutes, missing location markers, or taken on a build with the profiler's own overhead uncompensated (pre-ew-3.3 captures on console) — the audit still runs, but each finding carries the caveat, and the caveat names what a better capture would settle.

## Deliverable

One table: system, platform budget, p50, p99, classification, suspect, confidence. Below it, at most three lines: the single worst violation, whether the capture was adequate, and the one thing to capture next if it wasn't. If every system is in budget, say so plainly — "over budget in the harbor" is sometimes a settings mismatch on the reporting machine, and the audit proving compliance is a valid result.
