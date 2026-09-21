
# Patch Notes Format

One template for both titles. The sections and the line shapes are fixed; only the voice changes.

## Section order

Always these four, always in this order, even when a section is short:

1. **Highlights** — 1–3 lines. What a returning player should know before they log in. New content, the one fix that mattered most. Never a list of everything.
2. **Balance** — every value change, grouped by system (Emberwake: combat, economy, encounters; Drift Harbor: production, visitors, decoration).
3. **Fixes** — every shipped fix, grouped by area. Player-observable symptom first.
4. **Known Issues** — open problems the player can hit in this build.

**Known Issues is mandatory.** If nothing is open, the section ships with one line saying so. An absent Known Issues section reads as a claim that nothing is broken, which is never true and is the claim players screenshot back at the studio.

## The balance line

```
Ember Lance — base damage 340 → 310. Outperformed every other two-hander at the same cast cost.
```

Three parts, in order: the thing, `before → after`, and one sentence of why. Rules:

- **Numbers or nothing.** "Slightly reduced" is not a balance line. If the manifest has no number, it belongs in Fixes.
- Percentages carry the base: `−12% (0.85 → 0.75 multiplier)`, not `−12%` alone.
- The "why" is the design intent, not the ticket. "Outperformed its cast cost" is a reason; "per the tuning pass" is not.
- One line per changed value. Two values in one line hides the one players will argue about.

## The fix line

Symptom, then condition. `Harbor visitors stopped arriving after a save loaded from a cloud backup.` Not `Fixed HarborVisitorScheduler null deref`. If the symptom cannot be stated in player-facing words, the fix is internal and does not appear.

## Voice per title

Both titles follow [[voice-bibles]]; patch notes tighten it.

**Emberwake** — EW-1 plainspoken, EW-2 no internet cadence. Patch notes take **zero** exclamation marks, tighter than EW-3's one-per-line. The notes are the studio talking, not a character; the wry register (EW-4) belongs in barks, not here. Say "reduced," not "nerfed."

**Drift Harbor** — DH-1 warm and unhurried, DH-2 no combat metaphors. "Nerf," "buff," "grind," and "kill" are all banned words there, so balance changes read as "adjusted," "now produces," "takes less time." DH-3 bans urgency, which rules out "hotfix incoming" and countdown framing on Known Issues; say when a fix is expected, or say it is being worked on.

Both titles: no second-person blame. "You were using an unsupported setting" never ships.

## Never ships

- **Internal ticket IDs**, branch names, or engineer names.
- **Codenames.** Unannounced content uses moth codenames internally per [[studio-context]]; a codename in a patch note is a leak with a date stamp on it.
- **Unshipped items.** Every line traces to an item in the release manifest for the build being shipped. A fix that slipped is a fix that is not in the notes.
- **Speculative timing.** "Coming soon," "in a future update," and "next season" are not patch-note content.
- Apologies written as marketing. State what broke and what changed.

## Length caps

Full notes live in the news post and have no cap. The storefront blurb is an excerpt of Highlights, cut to the caps in [[storefront-rules]]:

| Destination | Cap | Source |
| --- | --- | --- |
| Console store update blurb | 500 chars | Highlights, trimmed |
| PC store update blurb | 1,500 chars | Highlights + top Balance lines |
| Mobile store update blurb | 500 chars | Highlights, trimmed |
| In-game notification | 90 chars | One Highlight line, per [[voice-bibles]] limits |

Write the full notes first, then cut down to each blurb. Ship a character count beside every capped field.
