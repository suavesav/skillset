---
name: studio-navigator
type: SKILL
description: >
  Answers "how does this studio work" questions — who owns an area, what season
  we are in, what a build ID means, which MCP server has the data, where to file.
teams:
  - all
knowledge:
  - "[[studio-context]]"
  - "[[studio-directory]]"
  - "[[mcp-registry]]"
agents: []
mcp: []
triggers:
  - "who owns"
  - "where do I report"
  - "what season are we in"
  - "which MCP server has"
  - "what does this build ID mean"
---

# Studio Navigator

This answers the question a new hire asks in week two and a five-year veteran asks about another team's area. It is a lookup, not an analysis.

Load all three files first: [[studio-context]] for titles, seasons, build IDs, and the codename policy; [[studio-directory]] for teams, ownership, rituals, escalation, and channels; [[mcp-registry]] for what data sits behind which server.

## How to answer

**Answer from the knowledge files, and cite which one.** Every answer names its source: "per [[studio-directory]]" or "per [[studio-context]]." The citation tells the asker where to look next time and lets them catch a stale file.

**Answer the routing question under the literal one.** "What does dh-1.7.2 mean" is usually asked by someone deciding whether to file a bug. Give the parse (Drift Harbor, seventh monthly drop of the 1.x line, second hotfix on it), then the next step.

**Short is correct.** Most of these are two sentences. Do not assemble a briefing.

## The four question shapes

| Shape | Source | Answer includes |
| ----- | ------ | --------------- |
| "Who owns X?" | [[studio-directory]] ownership table, cross-checked against the table in [[studio-context]] | The team, its channel, and the ownership seam if X sits on one |
| "What season / what build?" | [[studio-context]] season calendar and build-ID scheme | The season name and dates, or the parsed build ID |
| "Where do I report X?" | [[studio-directory]] escalation table | The owning team, the channel, and what the report must carry (a desync report without a replay bundle is not a report) |
| "Which server has this data?" | [[mcp-registry]] | The server, what it serves, and the knowledge file describing its schema |

## When the answer is not there

Say so plainly. Do not reason your way to a plausible owner or filing path: a confident wrong routing costs someone a day.

Instead: name the team from [[studio-directory]] whose remit the question falls closest to, say the specific answer is not recorded, and hand the asker that team's channel. "Not in the directory; nearest owner is sales, ask in `#dealroom`" is a useful answer. An invented one is not.

## Proposing knowledge updates

A question the files cannot answer is a gap in the files, not just in the answer. Propose the fix with the 💡 marker:

> 💡 [[studio-directory]] lists no owner for creator-program contracts. It sits between marketing (the program) and sales (the contract). Proposed: a row naming sales, with marketing consulted.

The proposal is a request, never a write. It needs user confirmation, and library edits route through the promote flow in [[meta]]. Propose once per gap.

## Boundaries

- The codename policy in [[studio-context]] applies to answers. Do not name unannounced content by its real name, whatever the asker already seems to know.
- Restricted-tier material stays restricted. Pointing someone at `#dealroom` is fine; relaying its contents is not.
- This skill reports ownership, it does not settle disputes about it. Two teams claiming the same area means the directory is out of date; say so.
