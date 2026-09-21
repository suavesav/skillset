---
name: ua-benchmarks
type: KNOWLEDGE
description: Drift Harbor UA benchmarks — CPI bands by channel and region tier, paid-vs-organic retention floors, ROAS scale/hold/cut thresholds, the day-10 read rule, and the zero-session fraud signature
---

# UA Benchmarks

Paid acquisition benchmarks for Drift Harbor. Emberwake is premium and runs no paid UA; it appears here only as a cross-promo source. Spend and installs come from the beacon-ua server; retention and session data from Quill, per [[telemetry-schema]].

## Region tiers

| Tier | Markets |
| --- | --- |
| T1 | US, Canada, UK, Australia, Japan |
| T2 | Western Europe, South Korea |
| T3 | Everything else |

Never compare a CPI across tiers. A T3 channel at $0.40 and a T1 channel at $2.80 can be the same buy.

## Target CPI bands

| Channel | T1 | T2 | T3 |
| --- | --- | --- | --- |
| Social video | $2.40 – $3.60 | $1.30 – $2.10 | $0.45 – $0.90 |
| Search | $1.80 – $2.80 | $1.00 – $1.70 | $0.35 – $0.70 |
| Rewarded video | $0.90 – $1.60 | $0.50 – $0.95 | $0.18 – $0.40 |
| Cross-promo from Emberwake | no cash cost — see below | | |

Below the band is not automatically good — rewarded-video installs under the T3 floor are where the fraud signature usually shows up.

## Retention floors

Drift Harbor organic baseline, trailing 90 days: **D1 46%, D7 23%, D30 10%**. Paid cohorts are always measured against the same-period organic cohort, never against the annual average.

| Cohort | D1 floor | D7 floor | D30 floor |
| --- | --- | --- | --- |
| Organic | 46% | 23% | 10% |
| Paid, any channel | 38% | 18% | 7% |
| Rewarded video | 30% | 14% | 5% |

**The 75% rule.** A paid cohort whose D7 retention is below 75% of the same-period organic D7 has a user-quality problem, not a price problem. Lowering bids does not fix it; changing creative or targeting might. Report it as a quality finding even when CPI and ROAS both pass.

## D7 ROAS thresholds

| D7 ROAS | Call |
| --- | --- |
| ≥ 0.38 | Scale |
| 0.24 – 0.38 | Hold |
| < 0.24 | Cut |

Calibrated to a D180 payback of 1.0. A channel that passes D7 ROAS but fails the D7 retention floor does not get a scale call; it is monetizing a cohort that will not be there at D30.

## The attribution window and the day-10 read

The attribution window is **7-day click, 1-day view**, which is why D7 ROAS is not readable on day 7. The window closes at day 7; network postbacks and store receipt reconciliation settle up to 48h after that; Quill's daily rollup adds one more day, and late events are a known gotcha in [[telemetry-schema]].

**Read D7 ROAS on day 10, never earlier.** A day-8 read runs light and has cut channels that were above the scale threshold. Asked for a number sooner, give the install count and say ROAS is not final.

## Minimum cell size

A cell is one channel × one region tier.

| Installs in cell | What you may do |
| --- | --- |
| ≥ 400 | Make a scale / hold / cut call |
| 150 – 399 | Report the numbers with a small-sample warning; no call |
| < 150 | Report the install count only; no rates, no call |

400 is where a D7 ROAS reading is stable enough to move money on. Aggregating two thin cells to clear 400 is not allowed: a T1 and T3 cell mixed together produce a CPI that describes neither.

## The fraud signature

**Installs with zero session events in Quill.** Beacon attributes an install; Quill shows no `session_start` for a new account on that build and region within 72 hours.

| Share of a channel's attributed installs | Action |
| --- | --- |
| < 2% | Normal — store-install-then-never-open is a real player behavior |
| 2% – 4% | Watch; recheck next window |
| > 4% | Flag the channel in the report with the count |
| > 8% | Pause the channel and open a claw-back |

Seen from the other side: Beacon's install count for a cell exceeds Quill's distinct new accounts for that cell by more than 10% after the 48h late-event window has elapsed. Check both directions; a gap inside 72h is usually late events.

## Cross-promo from Emberwake

Cross-promo carries no cash spend, so ROAS is undefined and any scale/hold/cut call built on it is meaningless. Score it on **D7-retained installs per thousand Emberwake impressions**, and against its real cost: impressions spent on Drift Harbor are impressions not spent on Emberwake's own season offers. Cap it at 15% of Emberwake's in-client promo surface in a season.
