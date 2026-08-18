
# Matchmaking Policy

Emberwake's matchmaker is a negotiation between wait time and match quality. This policy fixes which side wins where. Drift Harbor visit sessions are invite-only and out of scope.

## Hard constraints — never traded away

These hold in every region, every mode, every load condition. No tuning change, incident response, or event config may relax them:

1. **Max skill spread inside a match: 400 rating points** (full party-to-party spread, not average). Past 400, the worst-case player experience is unsalvageable regardless of wait saved.
2. **Queue ceiling by region size:** large regions (>50k daily uniques) 3 minutes, medium (5k–50k) 6 minutes, small (<5k) 10 minutes. At the ceiling the matchmaker must resolve — widen within these constraints, backfill with bots where the mode allows, or fail the queue honestly. It may not hold a player past the ceiling silently.
3. **Party-vs-solo protection:** a full pre-made party never matches against a team of four solos in rated modes. Mixed (2+2, 3+1) versus solos is allowed only inside fairness band A.
4. **New-player shield:** accounts under 10 hours match only against accounts under 25 hours in rated modes. No override exists.

## The tunable middle

Everything else is a knob, adjusted per-region per-mode without policy review: starting search radius, radius expansion rate, backfill aggressiveness, cross-platform pooling on/off per mode, rematch-avoidance memory (default: last 3 opponents). Tunables move one at a time and get a week of watch, same discipline as [[encounter-tuning-model]] tuning ships.

## Fairness bands

Every formed match is stamped with a band, and band mix is the health metric:

| Band | Skill spread | Wait vs ceiling | Target share of matches |
| --- | --- | --- | --- |
| A | ≤150 | any | ≥60% |
| B | 151–250 | any | ≤30% |
| C | 251–400 | only after 50% of ceiling elapsed | ≤10% |

A region running under 60% band A for three consecutive days is a health incident, not a tuning preference. Band C matches forming *before* half the queue ceiling has elapsed indicate a misconfigured expansion curve — the matchmaker is spending quality it didn't need to spend.

## Small-region exception process

Small regions sometimes cannot fill band-A matches at sane hours. The exception path:

1. Liveops files an exception naming the region, mode, and the specific constraint under pressure (only the queue ceiling and band shares are exception-eligible — the four hard constraints are not).
2. Evidence required: 14 days of queue and band data showing the ceiling is breached >5% of prime-time queues.
3. Remedies in preference order: merge the region's pool with its nearest neighbor for the affected mode; extend the ceiling to 15 minutes with an on-screen estimate; enable bot backfill. Cross-region merge needs a latency check against shard placement in [[capacity-model]].
4. Exceptions expire in one season and must be re-filed with fresh data — regions grow, and expired exceptions are the mechanism for noticing.
