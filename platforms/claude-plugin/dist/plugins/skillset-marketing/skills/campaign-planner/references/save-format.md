
# Save Format

Every save file opens with a schema tag (`sv9`). Both titles share the versioning machinery; the schemas differ. The rules below exist because a bad save migration is the one bug players never forgive.

## The version ladder

| Version | Shipped with | What changed |
| --- | --- | --- |
| `sv7` | ew-3.4 / dh-1.8 | Baseline for currently supported builds |
| `sv8` | ew-3.6 | Split `inventory` into `carried` + `stash`; lossless transform |
| `sv9` | dh-2.0 | Harbor layout moved from tile list to chunk map; lossless |
| `sv10` | ew-4.0 | Quest flags compressed to bitfields — **lossy** (per-flag timestamps dropped) |
| `sv11` | ew-4.2 / dh-2.3 | Added cross-title cosmetics ledger; lossless |

Anything older than `sv7` is unsupported: the loader refuses with a "save too old" message rather than guessing.

## Migrate-on-load vs versioned reader

The rule is about information, not effort:

- A **lossless, one-way transform** ships as migrate-on-load. The save is rewritten to the new version the first time the new build opens it (`sv7→sv8`, `sv8→sv9`, `sv10→sv11`).
- Anything **lossy keeps a versioned reader** instead. `sv10` did not migrate old saves; the build carries an `sv9` reader so per-flag timestamps survive in old files until the player writes naturally. Migration destroys the old bytes; a reader preserves them.
- Never chain a lossy step inside a migration ladder. `sv7` saves loading on an `sv11` build migrate 7→8→9, then are *read* through the sv9 reader.

## Corrupted-save policy

- **Never delete.** A save that fails checksum or fails to parse is moved to a quarantine slot, byte-for-byte intact.
- The player gets a fallback profile and an in-game notice; support can pull the quarantined file for repair. Roughly a third of quarantined saves are recoverable by hand.
- Three quarantines from the same player in one week auto-opens a crashlens case — that pattern is a write-path bug, not player bad luck.

## Required compatibility matrix before ship

No build promotes without green runs on all three, on every platform:

1. **Old save × new build** — each supported prior version (`sv7` up) loads, migrates or reads correctly, plays 30 minutes without error.
2. **New save × old build** — the previous live build opens a new-version save *or* refuses it cleanly with the version message. Silent misreads are the failure being hunted.
3. **Mid-migration crash** — kill the process during each migration step; on relaunch the save is either fully old or fully new, never half. Migrations write to a shadow file and swap atomically; this test proves the swap.

Season-launch save checks are line items in [[launch-runbook]]; the matrix here defines what green means.
