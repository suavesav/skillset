---
name: loot-math
type: KNOWLEDGE
description: Drop-rate policy and pity math for Gladewick loot tables — raw vs perceived odds, the pity-timer formula, duplicate protection, and the fairness lines
---

# Loot Math

Two numbers describe every drop: the **raw odds** written on the table and the **perceived odds** a player experiences after pity and duplicate protection. Design tunes perceived. Storefronts publish perceived (see fairness line 2). The raw number is an implementation detail nobody quotes to players.

## Raw vs perceived

Standard Emberwake gear-table rarities, perceived odds simulated over 100k players:

| Rarity | Raw per-pull | Perceived per-pull | Median pulls to first hit |
| --- | --- | --- | --- |
| Common | 62% | 62% | 1 |
| Rare | 30% | 30% | 2 |
| Epic | 7% | 7.9% | 9 |
| Mythic | 1% | 1.72% | 41 |

## The pity timer

Epic and Mythic escalate after a dry streak: `rate(dry) = base + step × max(0, dry − soft_start)`, with a guaranteed hit on the hard-ceiling pull. Common and Rare carry no pity, which is why their raw and perceived odds match above.

| Rarity | base | soft_start | step | hard ceiling |
| --- | --- | --- | --- | --- |
| Epic | 7% | 12 dry pulls | +3.0 pp / pull | 25th pull |
| Mythic | 1% | 40 dry pulls | +5.0 pp / pull | 60th pull |

- Pity counters are **per table**, not per account — pulling a different chest neither advances nor resets a counter — and they persist across sessions and season rollovers. The only reset is a hit at that rarity on that table (a hit reached via duplicate-reroll counts; the player saw the rarity land).

## Duplicate protection

| Rarity | On duplicate | Conversion |
| --- | --- | --- |
| Rare | convert immediately | 120 gold |
| Epic | reroll once within the pool; if still owned, convert | 250 gold |
| Mythic | reroll up to twice; if still owned, convert | 900 gold |

Cosmetic-only pools remove owned items outright (the pool shrinks). Stat-bearing pools never shrink.

## Fairness lines — hard rules, not guidance

1. No rarity below **0.5% raw** ships without a pity timer, and that timer's hard ceiling is ≤ 80 pulls.
2. **Published-odds parity for cinder purchases**: any pull buyable with cinders displays perceived odds, and the displayed figure must match simulation within ±0.1 pp. Gold-only tables may display raw odds instead.
3. No odds change lands in a live season without the disclosure update shipping in the same build — see [[storefront-rules]].
4. No operation ever reduces a player's pity progress. Table rebalances migrate counters forward, never down.

## Worked example — Vault of Emberfall chest

Costs 150 cinders or drops from Apex clears; cinder-buyable, so perceived-odds display is mandatory (line 2).

| Outcome | Raw | Pity (soft / ceiling) | Duplicate rule | Perceived (100k-player sim) |
| --- | --- | --- | --- | --- |
| Gold bundle, 400–900 | 61.5% | — | — | 61.5% |
| Rare gear | 30% | — | 120 gold convert | 30% |
| Epic gear | 7.5% | 12 / 25 | reroll ×1, then 250 gold | 8.4% |
| Mythic "Ashwing" cosmetic | 1% | 40 / 60 | reroll ×2, then 900 gold | 1.72% |
