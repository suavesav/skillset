
# Revenue Model

Two titles, two money shapes. Everything below is **net bookings** unless a line says gross: gross is the storefront's transaction total, net is after the platform fee (0.70 on console and PC, 0.70 on the mobile standard tier, 0.85 on the mobile small-tier program). Plan numbers are net.

## Emberwake — premium plus live service

| Item | Price | Target |
| --- | --- | --- |
| Base game | $39.99 (regional tiers per storefront) | — |
| Season pass | $9.99 per 12-week season | 24% attach of season-active accounts |
| Cinders packs | 500 / $4.99 · 1,150 / $9.99 · 2,500 / $19.99 · 6,800 / $49.99 | monthly ARPPU $15.00 across paying accounts |

Cinders are a balance, not a good: the pack sale is the booking, the burn is not. Plan assumes ~170k monthly paying accounts.

## Drift Harbor — free-to-play IAP

| Item | Target |
| --- | --- |
| Conversion (first real-currency purchase within 30 days of install) | 3.1% of installs |
| ARPDAU, tier-1 regions | $0.092 |
| ARPDAU, tier-2 regions | $0.043 |
| ARPDAU, tier-3 regions | $0.016 |
| Blended ARPDAU at planned region mix | $0.049 on 575k DAU |

PC port (beta): free, same IAP catalogue at parity pricing, no port premium SKU. The one PC-only SKU is the $19.99 Harbor Founder bundle, capped to the beta window. Beta bookings are reported as a separate line, never folded into mobile.

## Plan — current quarter (2026-07 → 2026-09), net bookings in $K

| Month | Emberwake | Drift Harbor | Total |
| --- | --- | --- | --- |
| 2026-07 | 1,780 | 610 | 2,390 |
| 2026-08 | 2,050 | 625 | 2,675 |
| 2026-09 | 1,690 | 640 | 2,330 |
| Quarter | 5,520 | 1,875 | 7,395 |

The quarter holds one Emberwake season launch (late July, codename until announced per [[studio-context]]) and three Drift Harbor drops on the first Tuesday of each month. August is the fat Emberwake month because the pass attach lands in the first two weeks of a season, not on launch day. The plan also carries **$95K of partner-deal revenue** for the quarter (a subscription catalog's fixed fee for Drift Harbor); it is in the totals and it does not exist in Quill.

## Where the numbers live

| Number | Source |
| --- | --- |
| Gross bookings, per transaction | `qd-101` / `qd-201` `purchase` events, `currency = 'real'`, `price_minor_units` |
| Per-player spend at day grain | `qd-102` / `qd-202` |
| Payer counts, conversion, dev-account exclusion | join through `qd-900` |
| Partner fixed fees, minimum guarantees, catalog payments, bundle splits, marketing credits | Dealbook only |

Dataset IDs, the metric definitions, and the 48h console late-arrival window are in [[telemetry-schema]]. Quill sees only money that passed through a storefront transaction. Any deal revenue reported from Quill is a fabricated number.

## Booked vs recognized

- **Booked** at purchase: the full pack price, the full pass price, the full base-game price, on the transaction date.
- **Recognized** over consumption: the season pass straight-line across its 12 weeks, cinder balances as they burn, base game immediately.

The revenue brief reports **bookings** and labels every table as such. Finance's recognized figure runs lower in a launch month and higher in a tail month; the two are never placed in the same table, and a recognized number is never used to explain a bookings variance.
