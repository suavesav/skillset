
# Launch Runbook

Season launches (both titles, moth-named Emberwake seasons and Drift Harbor content drops) go through this checklist at the go/no-go review, held **T−48h**. Each item is green only when its evidence exists and is linked in the review record — a verbal "that's done" is yellow at best.

## The go/no-go checklist

| # | Item | Green means |
| --- | --- | --- |
| 1 | Build promoted and soaked | Launch candidate has run on the staging fleet ≥72h; crash-free rate within 0.2% of current live, from crashlens |
| 2 | Rollback rehearsed | A full rollback to the current live build was executed on staging within the last 30 days, timed, and completed under 20 minutes |
| 3 | Fleet pre-scaled | Scale-up scheduled at T−2h to the 6× T+0 target with 25% headroom, per [[capacity-model]]; opsdeck schedule linked |
| 4 | Save compatibility matrix | All three matrix legs green on all platforms, per [[save-format]] |
| 5 | Store assets staged | All three storefronts show the season page in preview state, claims and screenshots passing [[storefront-rules]] |
| 6 | Support macros drafted | Support has response macros for the top 5 predicted issues; predictions sourced from last season's T+0–T+48h contact drivers |
| 7 | Day-one hotfix slot reserved | Platform cert slots booked for T+24h on both console storefronts; booking confirmations linked |
| 8 | Season telemetry live | New season's events land in the warehouse from staging, schema-checked against [[telemetry-schema]] |
| 9 | Matchmaking config reviewed | Any season-touched matchmaking tunables diffed against [[matchmaking-policy]]; no hard constraint touched |
| 10 | Announcement copy locked | Patch announcement and in-game news pass [[studio-brand]] voice review; localized copy delivered for all ship languages |
| 11 | Kill switches verified | Every new feature behind a remote flag; each flag flipped off-and-on on staging with the effect observed |
| 12 | On-call staffed | Launch-window rotation (T−2h to T+48h) named, acknowledged, and no single person on two roles |

## The no-go rule

**Any red is a no-go.** There is no majority vote and no "red but we feel good about it."

- A red item gets an owner and an **unblock path** — the specific action and the earliest time it can go green — before the review ends.
- If the unblock path fits before T−0, the review reconvenes on just that item. If it doesn't, launch slips to the next slot; season dates are announced with this in mind.
- Yellow (evidence promised but not linked) converts to green or red at a T−24h re-check. Nothing launches yellow.

## After go

The checklist freezes: any post-go change to a checked area (a new build, a config edit, a store asset swap) reopens its item and requires re-verification, however small the change. Most launch-day incidents in studio history trace to a "tiny" post-go change that skipped this rule.
