---
name: store-page-writer
type: SKILL
description: >
  Write platform-storefront copy and screenshot shot-lists for Emberwake and
  Drift Harbor — inside each platform's limits, in the right title voice.
teams:
  - design
  - liveops
knowledge:
  - "[[storefront-rules]]"
  - "[[studio-brand]]"
  - "[[voice-bibles]]"
agents: []
mcp: []
triggers:
  - "update the store page"
  - "write the storefront copy"
  - "screenshot shot list"
---

# Store Page Writer

Storefront copy is written to fit, not trimmed to fit. Load [[storefront-rules]] first and write inside each platform's character limits and claim rules from the first draft — a beautiful 900-character short description is a rejected 900-character short description.

Then load the title's section of [[voice-bibles]]. Emberwake and Drift Harbor do not share a voice, and copy that could sit under either logo belongs under neither. [[studio-brand]] governs the shared frame: how Gladewick is named, the boilerplate line, trademark and rating notations.

## Hard rules

1. **Every character limit in [[storefront-rules]] is a wall.** Deliver a character count next to every field. If a required idea will not fit, cut the idea, not the grammar.
2. **Claim rules are per-platform.** Some storefronts prohibit unverified superlatives; some prohibit price or discount language in the description; some require accolade quotes to carry a source. Check the target platform's claim table before every draft, not from memory of the last one.
3. **Never promise unshipped content.** Copy describes what a buyer gets today. Seasonal content is described by pattern ("new seasons every 12 weeks"), never by the contents of an unreleased season — the Silkmoth season's fishing rework does not exist on the store page until it exists in the build. If asked to include it anyway, decline and cite this rule.
4. **No mechanic left ambiguous.** "Co-op action RPG for 1–4 players" beats "unforgettable adventures with friends." Concrete nouns sell; adjectives fill space the limits don't give you.

## Deliverable — copy

For each requested platform, every field the storefront requires, in this shape:

```
[Platform] — Short description (limit 240 / used 233)
<copy>
```

Fields the request didn't mention but the platform requires still get drafted; a partial store page update fails certification. Flag any existing live copy that now violates a claim rule you loaded.

## Deliverable — screenshot shot-list

The shot-list spec (count, aspect ratios, first-slot rule, UI-visibility and rating-content restrictions) lives in [[storefront-rules]]. Produce one numbered list per platform, each slot carrying:

- what the frame shows, concretely enough to stage
- which selling point in the copy it proves
- capture notes — time of day, party size, HUD on or off, which build

The first slot answers "what is this game" with zero text; every subsequent slot pairs with a claim made in the copy. A screenshot showing content the copy is not allowed to claim is cut for the same reason the claim was.

Close with anything that blocks submission — a limit that forced cutting a requested idea, a claim awaiting legal sign-off, a shot that cannot be captured in the current build.
