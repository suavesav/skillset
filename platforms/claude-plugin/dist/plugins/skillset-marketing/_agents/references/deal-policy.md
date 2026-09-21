
# Deal Policy

The bands every inbound proposal is judged against. A term inside its band is a deal-owner decision; a term outside it is a studio-lead decision; a term on the never-list is not a decision. Deal records live in Dealbook.

## Discount floors

| Deal type | Max discount | Never below | Cadence |
| --- | --- | --- | --- |
| Emberwake base game, storefront sale | 50% | $19.99 | 4 per year, ≥ 6 weeks apart, none within 21 days either side of a season launch |
| Season pass | 25% | $7.49 | once per season, after the season midpoint |
| Cinders | no price cut, ever | — | bonus-cinders promo instead: max +20%, once per season |
| Drift Harbor IAP | no discount below the $0.99 floor tier | starter bundle never below $4.99 | 1 per drop |
| Bundle with a partner title | 35% off the combined price | Emberwake's effective price still ≥ $19.99 | 2 per year per partner |
| Subscription-catalog inclusion | not a discount — see the fee floor below | — | — |

Never-discount windows are absolute: a storefront's own sale calendar does not override the 21-day season-launch guard.

## Revenue-share bands

| Deal type | Gladewick share | Note |
| --- | --- | --- |
| Standard storefront | 70% | the baseline every other band is compared to |
| Mobile small-tier program | 85% | where the title qualifies |
| Subscription catalog | fee floor: $0.06 per engaged hour, or a fixed fee ≥ $80K per quarter | whichever the partner's model supports; never revenue-share-only |
| Bundle with a partner title | pro-rata by standalone price, floor 45% of bundle net | applies when Gladewick is the smaller title in the bundle |
| Licensing (peripherals maker, merch) | 12% of wholesale | floor 8% |

Below 70% on a storefront deal, or below any floor above: studio lead signs.

## Exclusivity

| Kind | Max window | Signer |
| --- | --- | --- |
| Cosmetic item exclusive to one storefront | 30 days | deal owner |
| Timed feature or mode exclusive | 90 days | studio lead |
| Launch-day exclusivity on a season's core content | not permitted | — |
| Perpetual exclusivity of any kind | never | — |

Exclusivity never outlives the initial term, and an exclusivity window is measured from the shipped date, not the contract date.

## Term caps

- Initial term ≤ 12 months standard; 24 months is the hard cap and needs studio-lead sign-off.
- Auto-renew only in 12-month steps, with 60-day non-renewal notice. Evergreen terms are declined.
- Most-favored-nation pricing clauses are not accepted at any length.

## Who signs

| Total contract value | Signer |
| --- | --- |
| ≤ $150K and every term in band | deal owner |
| > $150K, or any term out of band, any exclusivity, any term > 12 months | studio lead |
| > $750K, or any IP licensing | studio lead and finance lead, both |

## The never-list

Not negotiable, not escalatable, no counter:

1. Perpetual exclusivity.
2. Source or engine access to Kiln, including "audit" and "port support" framings.
3. Pricing below the Drift Harbor IAP floor.
4. Player-level data leaving the studio. Aggregates only, and named in the contract.
5. A commitment to a date the liveops calendar has not confirmed.
6. Unbounded indemnity, and MFN pricing.

## Recording a counter

Dealbook is read-only to skills; the counter is drafted here and pasted in by the deal owner. The draft carries:

- a **new revision on the same deal record**, stage `countered` — accepted terms are never edited in place;
- one line per changed term: proposed → counter → the policy line cited by name;
- an expiry, 14 days from the counter date;
- the comparable deal IDs the counter leans on.

Two counters maximum before the record escalates to the studio lead. A third round is a decline in slow motion.
