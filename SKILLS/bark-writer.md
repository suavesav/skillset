---
name: bark-writer
type: SKILL
description: >
  Write ambient NPC barks in the correct title voice, batched by trigger
  context, length-checked for VO and subtitles, deduped, and voice-verified.
teams:
  - design
knowledge:
  - "[[voice-bibles]]"
  - "[[studio-context]]"
agents:
  - "[[voice-agent]]"
mcp: []
triggers:
  - "write barks"
  - "NPC ambient lines"
  - "dialogue for the dockworker"
assets: []
---

# Bark Writer

A bark is one line a player hears two hundred times. Write accordingly.

Before drafting, load [[voice-bibles]] for the character or archetype and [[studio-context]] for the title register — Emberwake NPCs are weathered and wry, Drift Harbor NPCs are warm and unhurried, and a line that would sing in the Ashfall market sounds sarcastic on the Drift Harbor quay. If the character has no voice-bible entry, ask for three existing lines to anchor on rather than inventing a voice.

## Batch format

Barks are delivered in batches, one batch per trigger context. Never mix contexts in a batch — the audio team wires each context separately.

```
CHARACTER: Mirelle (dockworker, Drift Harbor)
CONTEXT: weather_rain
COUNT: 8

MIR_RAIN_01  "Nets'll dry when they dry."
MIR_RAIN_02  "Good day for the eels, bad day for me."
...
```

Standard contexts: `combat_engage`, `combat_near_miss`, `idle`, `weather_*`, `player_return`, `vendor_browse`. A brief asking for "dockworker lines" without contexts gets the default spread: idle x8, weather x6, player_return x4, vendor_browse x6.

## Hard limits

- **VO length**: 12 words max per line. Actors read barks in a single breath; the audio lead trims anything longer, and the trim is never an improvement.
- **Subtitle length**: 42 characters per line, one line only. Barks never wrap.
- **No plot**: barks carry texture, not information. A bark that references quest state belongs in the quest script, not the ambient pool.

## Dedupe

Two passes before delivery:

1. **Within the batch** — no two lines sharing a structure and a payload ("Rain again." / "More rain."). Same sentiment is fine; same joke is not.
2. **Against the described existing pool** — ask what this character already says, or take the list if provided, and cut anything that lands within a word or two of a live line. A near-duplicate in the pool is worse than a missing line, because players hear the pool shuffled.

## Voice check

Dispatch every batch to [[voice-agent]] before delivery. It reads the batch against the voice bible and returns per-line verdicts: on-voice, off-voice with reason, or flagged for lore conflict. Rewrite the off-voice lines and rerun; a batch ships only when every line passes. Do not argue a line past the check — if the bible is wrong, propose a bible change (💡) instead of an exception.

Deliver the passing batches in the format above, with the dedupe notes (what was cut and why) at the bottom.
