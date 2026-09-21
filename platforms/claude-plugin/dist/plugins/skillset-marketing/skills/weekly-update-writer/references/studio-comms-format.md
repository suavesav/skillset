
# Studio Comms Format

Three templates cover almost everything Gladewick writes down: the weekly update, meeting notes, and the decision record. Each has a fixed shape so readers skim the shape instead of the prose. Team and channel names below are defined in [[studio-directory]].

## Tone rules

These apply to all three templates and to anything else written for an internal audience.

1. **Numbers over adjectives.** "Crash-free 99.4%, down 0.3 points" beats "stability dipped a bit." Where there is no number yet, say so.
2. **Every claim has an owner.** No passive voice hiding who is doing the thing. "The migration is being reviewed" is not a status; "engineering is reviewing it, read due Thursday" is.
3. **One line means one line.** An item needing a paragraph needs its own doc, and names that doc in its one line. The update is an index, not the record.

## Weekly update

Posted Friday before end of day in `#studio-updates`. Written per person or per team; the format is the same either way.

```
**Shipped**
- ew-3.4.2 hotfix live on all three platforms, crash-free back to 99.6%
- Tide-gate encounter pass merged, ships with the next drop

**In progress**
- Season retro doc, draft out Monday

**Blocked**
- Replay capture for the desync repro — waiting on engineering for a build-farm
  slot, asked Tuesday

**Next**
- Economy pass on the Silk Moth vendor tables
```

Rules:

- Four sections, always in this order, always present. An empty section reads "none" and stays.
- One line per item. No sub-bullets.
- A blocked item names the **owning team** (ownership table in [[studio-context]]) and the date the ask went out. A blocker with no named team is an unfiled complaint.
- Never pad a thin week. Three lines is a complete update. Invented filler is how readers learn to skim.
- The codename policy in [[studio-context]] applies: an update going studio-wide uses the moth codename for unannounced content, never the real feature name.

## Meeting notes

```
**Attendees:** 2 engineering, 1 liveops, 1 design

**Decisions**
- Desync repro moves to a nightly build-farm job rather than on-demand.

**Actions**
- Stand up the nightly job — engineering — 2026-03-04
- Re-run the tide-gate playtest against the nightly build — design — 2026-03-11

**Open questions**
- Who owns retention of replay bundles past 30 days?

**Not decided**
- Whether the job also runs against Drift Harbor builds. Deferred to the drop review.
```

Actions carry an owner and a date, both required. "Not decided" is a real section: it stops a question reopening in three weeks as though it had been settled.

## Decision record

For anything a future reader will ask "why did we do it that way" about.

```
**Context** — what was true when the decision was made, with numbers.
**Decision** — one sentence, present tense, active voice.
**Alternatives rejected** — each with the reason it lost, not just its name.
**Consequences** — what this makes easier and what it makes harder.
**Revisit** — a date or a trigger condition. "When Drift Harbor's PC port exits beta."
```

A record with no rejected alternatives means the decision was not a decision.

## Audience tiers

| Tier | Goes to | Strips |
| ---- | ------- | ------ |
| team-only | the team's own channel | nothing; codenames, partner names, and internal dates are all fine |
| studio-wide | `#studio-updates`, all-hands, cross-team docs | real names of unannounced features (use the moth codename), named partners (use "a platform partner"), unannounced ship dates (use the season or month) |
| external | players, press, storefronts, partners | codenames entirely, partner names not already public, unshipped dates, internal build IDs, any unannounced revenue or player-count figure |

Tier down, never up: when unsure which tier a document reaches, write it at the stricter one. Retitling a leaked doc is not a remedy.
