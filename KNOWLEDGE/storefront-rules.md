---
name: storefront-rules
type: KNOWLEDGE
description: Per-storefront constraints for console, PC, and mobile stores — description limits, claim rules, screenshot specs, and update cadence
---

# Storefront Rules

Constraints for the three storefronts Gladewick ships on. Store copy also passes [[studio-brand]] voice review; this file is the platform-compliance layer. Staged store pages are a go/no-go item in [[launch-runbook]].

## Character limits

| Field | Console store | PC store | Mobile store |
| --- | --- | --- | --- |
| Short description | 170 chars | 300 chars | 80 chars |
| Long description | 4,000 chars | 8,000 chars | 2,000 chars |
| Update/patch blurb | 500 chars | 1,500 chars | 500 chars |

Limits are hard cuts, not suggestions — the mobile store truncates mid-word with no ellipsis. Write short descriptions to the 80-char mobile limit first, then expand per store; cutting down a long one always reads worse than growing a short one.

## Claim rules

What store copy may and may not say, across all three stores:

- **No superlatives without a citation the store can verify.** "Best," "greatest," "#1" are rejected outright on console cert and quietly down-ranked on mobile. Award quotes are fine with source and year.
- **No unreleased content.** Nothing appears in store copy or imagery until it is in the shipped build the page points at. Season teasers live in news posts, never on the product page. A screenshot of an unshipped boss is a cert failure on console.
- **Rating-board phrasing is fixed text.** Content descriptors are quoted verbatim from the rating certificate — never paraphrased, softened, or reformatted. "Fantasy Violence" does not become "mild combat."
- Price and discount language follows each store's template strings; hand-written "50% off!" copy is rejected on all three.
- Cross-store parity: a claim removed on one storefront comes off the other two in the same cycle, even where it would still pass.

## Screenshot specs

- **Counts:** console store takes exactly 8; PC store 5–12 (ship 10); mobile store 4–8 portrait-or-landscape per device class (ship 6 + 2 tablet).
- **Resolution:** console and PC 3840×2160 source, store downscales; mobile 2778×1284 landscape / 1284×2778 portrait.
- **First-screenshot rule:** slot 1 is the purchase decision. It must show moment-to-moment gameplay of the *current* season's content — not a logo card, not cinematics, not menus. Emberwake: mid-combat. Drift Harbor: an active harbor with visible player construction.
- **No-UI rule for hero shots:** the first two slots ship with HUD disabled. UI is permitted (and encouraged, for honesty) from slot 3 on — at least two shots must show real UI so the page doesn't oversell.
- All shots come from shipped builds at shipped settings. No debug lighting, no dev-only camera angles that gameplay can't reach.

## Update cadence

- Product pages refresh **every season launch**, at minimum: first two screenshots, short description's season hook, and the patch blurb.
- Mobile store additionally requires a metadata touch every 90 days or the algorithm treats the listing as dormant; a screenshot swap counts.
- Off-cycle edits are allowed but each console-store edit consumes a review pass (5 business days) — batch them.
- Stale-page check: if any screenshot shows content older than two seasons, replace it in the next cycle regardless of how well it performs.
