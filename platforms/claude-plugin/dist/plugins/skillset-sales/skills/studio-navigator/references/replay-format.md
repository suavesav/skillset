
# Replay Format

When two Emberwake clients disagree about the world, Kiln Engine emits a **desync bundle** (`.kdsb`). The bundle is the whole case file; if it didn't capture something, that something is unrecoverable. Query bundles via the kiln-replay MCP server.

## What a bundle contains

```
header        build stamp (ew-4.2.117), platform stamp per client, tick rate (30/s)
checksums/    per-tick CRC64 per subsystem, both clients, last 900 ticks pre-divergence
inputs/       full input stream from each client, timestamped in ticks
snapshot/     one full world snapshot at window start (tick T-900)
meta          session id, region, party composition, mode
```

900 ticks at 30/s is a 30-second window. Anything that went wrong earlier than 30 seconds before the checksum split is outside the bundle and can only be inferred.

## Checksummed subsystems, in order

1. `entity-transform` — positions, rotations, velocities
2. `combat-state` — health, buffs, cooldowns, damage events
3. `inventory` — items, currency, loot rolls
4. `quest-state` — objective flags, script variables
5. `nav` — pathing grids, agent goals
6. `rng` — the shared random stream cursor

## Locating the divergence

- Scan forward from tick T-900. The **first tick with any checksum mismatch is the divergence tick** — everything after it is contamination, not cause.
- Within that tick, the mismatched subsystem **earliest in the order above wins**. An `rng` mismatch alongside an `entity-transform` mismatch on the same tick means the transform split first and dragged the random stream with it; read causes top-down.
- Then read `inputs/` around the divergence tick. A divergence with identical inputs on both sides is engine determinism; a divergence right after inputs differ is transport or input-handling.

## Known limitations

- Bundles truncate at **30MB**. Long sessions with heavy combat can lose the oldest checksums first — check `header.truncated` before trusting the window is really 900 ticks.
- **Particle state is not checksummed.** Visual-only desyncs (effects present on one screen, absent on the other) produce no bundle at all; they arrive as player reports, not `.kdsb` files.
- The `snapshot/` is taken at window start, not at divergence. Replaying forward from it re-derives every tick; do not treat snapshot values as divergence-tick values.
- Cross-platform sessions stamp both platforms, but float-math divergence between platforms shows up as slow `entity-transform` drift, not a sharp split — see [[playtest-protocol]] for how mixed-platform desync sessions are staffed.
