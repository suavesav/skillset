---
name: community-pulse
type: SKILL
description: >
  Digest player discussion into volume-weighted themes — what the community is
  saying, how large each camp is, and what needs an official response.
teams:
  - liveops
knowledge:
  - "[[community-sources]]"
  - "[[studio-context]]"
agents: []
mcp:
  - greenroom
triggers:
  - "what are players saying"
  - "community pulse"
  - "sentiment on the patch"
---

# Community Pulse

Player discussion is a crowd, not a poll. The job is to report what the crowd is saying **and how big each part of it is**, so nobody at Gladewick mistakes the loudest thread for the largest camp.

## Ground rules

- **Weight before you summarize.** Pull the discussion window via [greenroom], then apply the source weights in [[community-sources]] before forming themes. That file ranks each venue by how well it predicts the wider player base — the co-op forum skews endgame Emberwake, the harbor-photos channel skews new Drift Harbor players — and sets the per-venue multipliers. A theme's size is its weighted volume, never its raw post count.
- **Loud vs large is the core distinction.** A 400-reply thread driven by 30 accounts is loud. The same complaint appearing once each across 300 unrelated threads is large. [[community-sources]] defines the unique-participant threshold that separates them; label every theme `loud`, `large`, or `both`. Loud-only themes still get reported — they shape perception — but they never headline over a large one.
- **Quote without identity.** Every theme carries one or two representative lines, verbatim, with the venue named and the username removed. Pick median-tone quotes, not the spiciest.
- **Anchor to context.** Check [[studio-context]] for what shipped recently — sentiment on "the patch" means nothing without knowing whether the window contains the ew-4.2 drop or the Drift Harbor pricing change.

## The report

1. **Themes**, largest weighted volume first. Per theme:
   - one-line summary of what the camp is saying
   - size label (loud / large / both) with the unique-participant count
   - trend vs the prior window — growing, fading, or stable
   - representative quote(s), venue named, username removed
2. **Sentiment split** per title — rough positive/negative/mixed proportions, weighted. Emberwake and Drift Harbor always reported separately; their communities barely overlap.
3. **Needs official response** — see below. May be empty, and usually should be.

## Flagging misinformation

A theme goes in "needs official response" only when all three hold:

1. The claim is factually wrong about the game or the studio (not an opinion, not a prediction).
2. It is spreading — appearing in new venues or gaining unique participants across the window.
3. Silence has a cost: the claim drives a harmful player action (panic-selling market goods, uninstalling over a fake "account wipe," charge-back rumors).

For each flag:

- the claim, verbatim, and the correct fact
- why it meets all three tests
- the venue where a correction reaches the most affected players

"Players are mad about a real thing" is never misinformation; it goes in Themes, however unpleasant.

Do not editorialize about whether the crowd is right. Report the crowd; the response is someone else's call.
