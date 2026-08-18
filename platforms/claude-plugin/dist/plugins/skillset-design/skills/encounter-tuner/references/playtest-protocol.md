
# Playtest Protocol

How Gladewick runs moderated playtests and turns notes into findings. The protocol's job is to keep what testers *did* separate from what anyone *thinks about it* until counting is done.

## Session structure

Ninety minutes, four phases, fixed order:

1. **Warmup (10 min)** — free navigation, no tasks, no notes counted. Absorbs controller fumbling and first-time UI shock so phase 2 measures the build, not the tester's nerves.
2. **Tasked play (40 min)** — testers work a scripted task list ("reach the Sablewing vault entrance," "ship your first spice order"). Moderators observe silently; a stuck tester gets a hint only after 3 minutes, and the hint is logged as a note.
3. **Free play (25 min)** — no tasks. What testers choose to do unprompted is a finding in itself; log where they go first.
4. **Debrief (15 min)** — structured questions, then open floor. Debrief statements are logged as quotes, never as observations.

## Note taxonomy

Every note carries one tag. Mis-tagging is the main way playtest data rots:

- **observation** — a thing that happened, watchable on the recording. "Tester walked past the harbor ledger three times without opening it."
- **suggestion** — a design idea from tester or moderator. Stored, never counted. Suggestions are prompts for design, not evidence.
- **quote** — verbatim tester speech. Evidence of *sentiment*, not of behavior; a tester saying "that was easy" after failing twice is two data points, filed separately.

## Severity (observations only)

- **S1 — blocked:** tester could not proceed without moderator intervention.
- **S2 — major friction:** proceeded, but with repeated failed attempts or >2 minutes lost.
- **S3 — minor friction:** hesitation, a wrong first click, self-corrected under 30 seconds.
- **S4 — cosmetic:** noticed, commented, no behavioral cost.

## Counting rules

- Count **independent occurrences**: distinct testers hitting the same issue. The same tester hitting it twice counts once — repetition within a tester measures memory, not the design.
- Threshold to file: S1 files at 1 occurrence. S2 needs 2 of 8 testers. S3/S4 need 3 of 8, else they stay raw notes.
- Never merge observations across builds. A fix candidate resets the count to zero.

## Drift Harbor task-friction scoring

Drift Harbor has no combat, so its difficulty analogue is task friction, scored during tasked play only. Each scripted task gets a friction score: **completion rate × median overrun** against a designer-set par time. A task under 70% completion or over 2.0× par overrun is out of band — the cozy contract is that friction comes from planning pleasure, never from interface archaeology. These bands play the role that combat tiers play in [[encounter-tuning-model]]; recorded desync or replay-related sessions follow capture rules in [[replay-format]].
