---
name: capacity-model
type: KNOWLEDGE
description: Shard capacity by mode, the season-launch login-surge curve, the 25% headroom floor, pre-scale/scale-down rules, and the two capacity failure signatures
---

# Capacity Model

Fleet math for both titles. Shard counts and scaling actions run through the opsdeck MCP server; this file is the model those actions are judged against.

## Players per shard

| Mode | Players / shard | Notes |
| --- | --- | --- |
| Emberwake open zones | 96 | soft cap; ejects to a sibling shard at 110 |
| Emberwake vault instances | 4 | one party, one shard |
| Emberwake seasonal spectacle | 24 | six parties, shared boss state |
| Drift Harbor harbors | 1 | single-player sim, server-authoritative saves only |
| Drift Harbor visit sessions | 8 | one host harbor + up to 7 visitors |

Drift Harbor's cost center is save-write throughput, not shard count. Its capacity questions are storage questions.

## The login-surge curve (season launch)

Every moth-season launch since Lunamoth has followed the same shape, measured against the prior week's same-hour steady state:

- **T+0 to T+1h:** 6× steady state. This is the number the fleet must hold.
- **T+1h to T+3h:** decays to 3.5×
- **T+3h to T+8h:** decays to 2×
- **T+8h to T+48h:** settles at 1.4×, the new-season plateau

The 6× is concurrent *logins*, and login is the expensive path (auth, save load, migration per [[save-format]]). Gameplay concurrency peaks lower, near 4×.

## Headroom policy

**Never plan under 25% headroom** above the modeled peak, at every point on the curve. Headroom is what absorbs the model being wrong; a plan that spends it before launch has no plan for being wrong.

## Pre-scale and scale-down

- Pre-scale to the T+0 target no later than **T−2h**. Warm-up (image pull, shard registration) takes up to 40 minutes; scaling *at* T+0 means scaling into the surge.
- Scale down on a schedule, not on instinct: no reductions before T+8h, then step down at most 20% per hour while observed concurrency tracks the curve. If observed sits above the curve, freeze the step-down and re-model.
- Regional fleets scale on their own local T+0 — season unlock is simultaneous UTC, so regional surges stagger by time-of-day, not by date.

## The two failure modes

**Login-storm collapse.** Queue times climb, then auth timeouts, then retries multiply the load. Signature: login success rate falls *while* login attempts rise — the gap between the two lines is retry amplification. Fix is queue admission control, never "add shards" (shards aren't the bottleneck; auth is).

**Shard starvation.** Logins fine, but matchmade modes queue forever. Signature: shard utilization pinned above 92% with instance-create latency climbing. Fix *is* adding shards, and per [[matchmaking-policy]] the matchmaker widens bands before it strands small regions.

Misdiagnosing one as the other makes both worse; check the signature before acting.
