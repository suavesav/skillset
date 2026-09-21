---
name: deal-desk
type: SKILL
description: >
  Evaluate an inbound partnership, bundle, promo, or licensing proposal term by term
  against deal policy, and return accept, counter with terms, or decline.
teams:
  - sales
knowledge:
  - "[[deal-policy]]"
  - "[[revenue-model]]"
agents:
  - "[[dealbook-agent]]"
mcp:
  - dealbook
triggers:
  - "should we take this deal"
  - "review this bundle proposal"
  - "deal desk"
assets: []
---

# Deal Desk

An inbound proposal is a list of terms. The desk's job is to put each term next to the policy limit it lives under, decide, and say so in one word. This is not an opinion essay, and a proposal is never evaluated on how enthusiastic the partner sounds.

## Ground rules

- **Every term is judged against a named line in [[deal-policy]].** Discount floors, revenue-share bands, exclusivity caps, term limits, sign-off thresholds. A verdict with no policy line cited is not a verdict.
- **The never-list ends the review.** Perpetual exclusivity, Kiln engine or source access, pricing below the Drift Harbor IAP floor, player-level data leaving the studio, a date liveops has not confirmed, unbounded indemnity, MFN pricing. One hit is a decline; do not counter around it, do not escalate it, and say which item it hit.
- **Price every term in money where money exists.** [[revenue-model]] holds prices, attach and conversion targets, and the plan. A discount is a number of units at a lower net; a subscription-catalog fee is measured against what those players would have booked. "Good exposure" is not a term.
- **Missing terms are findings.** Silence on term length, on renewal, on territory, on what happens to exclusivity when the contract ends — each gets a row marked `not stated`, because each is a term the partner's paper will fill in later.

## Review order

1. **Read the record.** Dispatch to [[dealbook-agent]] for the deal record, the revision being reviewed with its date, the stage, and the partner's history with the studio. Terms come from the record, not from the forwarding note.
2. **Screen against the never-list.** If it hits, stop and write the decline.
3. **Build the term table.** One row per term, including the ones that are missing.
4. **Pull comparables.** Same deal type, same title, inside 18 months, from the agent, with record IDs. If none exist, say the deal is unprecedented and widen the counter.
5. **Decide**, then name the signer the decision requires under the policy's thresholds.

## Output

A term-by-term table, nothing before it:

| Term | Proposed | Policy limit | Verdict |
| --- | --- | --- | --- |
| Discount | 60% off base | 50%, floor $19.99 | out of band |
| Exclusivity | 120 days, cosmetic | 30 days, cosmetic | out of band |
| Term length | not stated | 12 months standard, 24 cap | not stated |

Then:

- **Comparables** — two or three prior deals from the CRM with their IDs, type, terms, and how they performed.
- **Recommendation** — one of `accept`, `counter`, `decline`, in one line, with the signer the policy requires.
- If `counter`: the counter terms, term by term, each citing the policy line it restores, formatted for the deal owner to paste as a new revision per [[deal-policy]]. Dealbook is read-only here — the desk drafts the counter, the owner records it.
- If `decline`: the one term that decided it. Declines are short.

Two counters maximum before the record goes to the studio lead. 💡 If a proposal is refused on a band that has now been hit three times in a quarter, propose the revision to [[deal-policy]] with the three records as evidence.
