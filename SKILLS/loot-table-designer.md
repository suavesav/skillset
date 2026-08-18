---
name: loot-table-designer
type: SKILL
description: >
  Design or adjust a drop table under the Gladewick loot policy — raw odds and
  player-perceived odds treated as separate numbers, every proposal sim-verified.
teams:
  - design
knowledge:
  - "[[loot-math]]"
  - "[[telemetry-schema]]"
agents:
  - "[[sim-agent]]"
mcp: []
triggers:
  - "design a drop table"
  - "is this drop rate fair"
  - "pity timer"
  - "the vault chest feels stingy"
assets: []
---

# Loot Table Designer

Rules first. Load [[loot-math]] before touching a single weight — it defines the studio loot policy: rarity tier ceilings, pity-timer floors, duplicate-protection mechanics, and the gold/cinders acquisition caps a table is not allowed to breach.

## The two numbers

Every conversation about a drop table involves two different probabilities, and mixing them is how tables get mistuned:

- **Raw odds** — the weight in the table. `vault_relic: 0.8%` means 0.8% per pull, nothing more.
- **Perceived odds** — what a player experiences across a session of pulls, after pity timers, duplicate protection, and bad-luck streaks are applied. A 0.8% raw relic with a 60-pull pity floor is a very different item from a 0.8% raw relic with none.

A designer saying "the Cindervault chest feels stingy" is reporting perceived odds. Never answer with raw odds alone, and never adjust raw weights to fix a perception problem a pity floor would solve cleaner.

## Designing or adjusting a table

1. State the table's intent: what should a p50 player hold after one week of normal play? [[loot-math]] has the per-mode pull-rate assumptions (Vault runs/week, chest opens/session).
2. Draft the table: item, rarity tier, raw weight, pity floor, dupe rule. Weights per tier must respect the tier ceilings; a pity floor is mandatory for anything below 2% raw.
3. Check the economy edge: if the table pays gold or cinders, confirm the p90 outcome stays under the acquisition caps. A generous streak is a feature; a printable one is an incident.
4. If the complaint is about a live table, pull its actual drop counts from the loot stream first — the event fields are in [[telemetry-schema]]. Sometimes the table is fine and one drop is failing to fire.

## Verification is not optional

Dispatch every proposed table to [[sim-agent]] to run pulls against the loot stream — 100k simulated players at the stated pull rate. No table ships on arithmetic alone; pity interactions and dupe protection produce distributions that hand math gets wrong.

Reject the proposal when the sim shows:

- a dry-streak tail longer than the pity policy allows (a p1 player past the floor means the floor isn't wired the way you think);
- a p90 outcome that breaks a gold or cinders acquisition cap;
- a duplicate rate above the tier's dupe ceiling for players past their third copy.

## Deliverable

Two parts, always together:

1. **The table** — item, tier, raw weight, pity floor, dupe rule, one row per entry.
2. **The feel summary** — at p10, p50, and p90 across the simmed population: pulls-to-first-copy for each headline item, and what a week of play yields. Written in player terms ("a p10-luck player sees the relic by pull 58 because the pity floor catches them"), because that paragraph, not the weights, is what the table's owner is approving.
