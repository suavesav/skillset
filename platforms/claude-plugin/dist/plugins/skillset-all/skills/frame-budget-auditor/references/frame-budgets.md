
# Frame Budgets

Frame targets: Emberwake runs 60 fps on console-current (16.6 ms) and 30 fps on PC-min-spec (33.3 ms). Drift Harbor runs 30 fps on its mobile reference tier (33.3 ms). Budgets below are per-frame milliseconds per engine system, main thread unless noted; a system owning worker threads is charged its main-thread sync cost.

## Budget tables (ms per frame)

| System | Console-current (EW, 16.6) | PC-min-spec (EW, 33.3) | Mobile (DH, 33.3) |
| --- | --- | --- | --- |
| Sim (gameplay + physics) | 4.0 | 7.0 | 6.0 |
| Render (submit + sync) | 7.5 | 16.0 | 14.0 |
| Particles | 1.5 | 3.0 | 2.5 |
| UI | 1.2 | 2.5 | 5.5 |
| Audio | 0.8 | 1.5 | 1.0 |
| Netcode | 1.0 | 1.8 | 0.8 |
| Reserve | 0.6 | 1.5 | 3.5 |
| **Total** | **16.6** | **33.3** | **33.3** |

Notes on the odd cells: DH's UI budget is deliberately large — the harbor UI *is* the game on mobile. DH netcode is small because harbor sessions are asynchronous. Reserve belongs to no system; spending it requires the frame-budget owner's sign-off recorded in the build notes, and it exists for thermal throttling headroom on mobile and OS interference on console.

## Overage definitions

- **Sustained overage** — a system exceeds its budget in ≥ 5% of frames within any rolling 60-second window. This is the number budgets are enforced on.
- **Spike** — a single frame where a system costs ≥ 2× its budget. Spikes are tracked separately; a system can be spike-noisy while sustained-clean, and the fixes differ.
- Total-frame misses with every system inside budget are a scheduling problem (sync points, thread contention), not a budget problem — route to engine, not to the system owners.

## Measurement rules

- Captures come from instrumented performance replays on reference hardware only — the fixed console retail unit, the published PC-min-spec bench machine, and the two mobile reference devices. Developer-machine numbers are directional and never appear in a budget verdict.
- Exclude the first 90 seconds after any load or area transition (warmup: shader compilation, streaming settle, JIT-warmed Lua).
- Instrumented builds carry ~0.4 ms of overhead per frame; the capture tooling subtracts it. Never subtract it again by hand.
- A verdict needs ≥ 10 minutes of representative capture per scope. A 90-second capture of a quiet scene proves nothing about a 4-player vault.

## Escalation thresholds

| Condition | Consequence |
| --- | --- |
| Sustained overage ≤ 10% over budget | System owner fixes within the current season; tracked, not blocking |
| Sustained overage > 10% over budget | Blocks the next release candidate for that platform until back under |
| Sustained overage on mobile > 5% over budget | Blocks immediately — thermal throttling compounds it within minutes of play |
| Spike rate > 1 per minute sustained | Investigation owed within a week; blocking only if spikes exceed 4× budget |
| Reserve spent without sign-off | Treated as an overage of the spending system, at the full amount spent |

Thresholds apply per scope (title + platform tier). Passing on console does not carry to PC-min-spec; each tier earns its own verdict from its own captures.
