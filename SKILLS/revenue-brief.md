---
name: revenue-brief
type: SKILL
description: >
  The monthly revenue read for both titles — net bookings by title and platform
  versus plan, the drivers behind each variance, partner-deal revenue, and what changed.
teams:
  - sales
  - liveops
knowledge:
  - "[[revenue-model]]"
  - "[[telemetry-schema]]"
  - "[[studio-context]]"
agents:
  - "[[quill-agent]]"
  - "[[dealbook-agent]]"
mcp:
  - quill-telemetry
  - dealbook
triggers:
  - "monthly revenue brief"
  - "how did we do against plan"
  - "revenue read"
assets: []
---

# Revenue Brief

One month, two titles, one page. The brief states what was booked, what the plan said, and why the two differ. A variance is either attributed to a driver or labelled unexplained; there is no third option, and "timing" is not a driver.

## Ground rules

- **Every number comes from a query run this session.** [[quill-agent]] does not estimate figures the warehouse can answer, and neither does the brief. A number carried over from last month's brief is re-queried or dropped.
- **Plan numbers come from [[revenue-model]]**, quoted as written. The plan is not restated from memory and it is not adjusted mid-quarter to meet the actuals.
- **Bookings, not recognized revenue.** Label every table `net bookings`. The recognized figure lives with finance and follows the season-pass and cinder-burn schedules in [[revenue-model]]; the two never appear in the same table, and recognized revenue never explains a bookings variance.
- **Never smooth.** No blended months, no trailing averages presented as the month, no rounding a miss into "roughly on plan." A 9% miss is reported as a 9% miss on the first line.
- **Wait for the data.** Console events arrive up to 48h late per [[telemetry-schema]]. A brief for a month closed yesterday is a brief built on a partial month; state the close date the numbers reflect.

## Assembly

1. **Window.** Pin the month to the season and drop boundaries in [[studio-context]], not to the calendar alone. A season launching on the 28th puts most of its pass attach in the following month.
2. **Bookings.** Dispatch to [[quill-agent]] for net bookings by title and platform, payer counts, season-pass attach, cinders spend per paying account, and Drift Harbor conversion and ARPDAU by region tier. Batch the queries; scope by title explicitly; dev accounts excluded everywhere.
3. **Partner revenue.** Dispatch to [[dealbook-agent]] for deal revenue recognized in the month — fixed fees, minimum guarantees, catalog payments, bundle splits — with record IDs. None of this exists in Quill, and it is a separate line, never merged into storefront bookings.
4. **Variance.** Each title and platform against plan, in dollars and percent.
5. **Drivers.** Attribute each variance to one of: season-pass attach, cinders spend, Drift Harbor IAP conversion, PC-port beta, platform mix, a promo or featuring beat, or a partner deal. Each attribution carries the number that supports it. What cannot be attributed is listed under **unexplained**, with its size.

## The brief

| Section | Contents |
| --- | --- |
| Headline | total net bookings, plan, variance in $ and % |
| By title | Emberwake and Drift Harbor, each split by platform, against plan |
| Partner deals | deal revenue with record IDs, separate from storefront bookings |
| Drivers | one line each, with the supporting number |
| Unexplained | residual variance in dollars, stated plainly |
| What changed | the two or three things that are different from last month |

An empty unexplained line is a claim, not a comfort. If it is empty, check that the attributions sum to the variance before writing it down.
