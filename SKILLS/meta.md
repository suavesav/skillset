---
name: meta
type: SKILL
description: >
  Housekeeping for the skillset library itself — check the installed version,
  fetch updates, draft new skills locally, and prepare library changes for review.
teams:
  - all
knowledge: []
agents: []
mcp: []
triggers:
  - "skillset pull"
  - "skillset status"
  - "save this as a skill"
  - "improve this skill"
---

# Meta

This skill maintains the library, not the games. It is excluded from every plugin build on purpose — it only works when the skillset repository is cloned locally, because everything below reads and writes the repository's own files. If there is no local clone, say so and stop; none of these operations have a remote fallback.

## Status — "skillset status"

Read the local `VERSION` file and compare it against `VERSION` in the shared repository. Report three things: installed version, latest available version, and whether the local clone carries drafts in `local/`. If versions differ, summarize what changed between them from `CHANGELOG.md` — the changelog entry, not a guess.

## Pull — "skillset pull"

Fetch the latest library state from the shared repository into the local clone, then re-run the platform setup so the updated files are projected into whatever tool is in use. Never let an update touch `local/` — overrides are personal by design and survive every pull. After updating, report the old and new version and the changelog delta. If the fetch would collide with local edits made directly to library files (which shouldn't exist — that's what `local/` is for), stop and list the colliding files rather than resolving silently.

## Capture — "save this as a skill"

When a conversation produces a workflow worth keeping, draft it as a skill file in `local/SKILLS/` — never directly into `SKILLS/`. The draft gets the standard frontmatter (name, type, description, teams, knowledge, agents, mcp, triggers) and a body in platform-agnostic language. Because `local/` overrides the library, the draft is immediately usable by its author while remaining invisible to everyone else. Tell the author where the file landed and that it is local-only until promoted.

Run the repository's validator against the draft before declaring it done. A draft that fails validation is not captured; fix it or report the failures.

If the idea overlaps an existing library skill, say so and offer the improve flow below instead of drafting a near-duplicate.

## Promote / improve — "improve this skill"

Changes to library files (a new skill graduating from `local/`, an edit to an existing skill or knowledge file) are prepared for maintainer review, never applied unilaterally:

1. Make the edit in the library file (or move the draft from `local/SKILLS/` into `SKILLS/`).
2. Run the validator across the whole library — a change that breaks another file's cross-references is not ready.
3. Bump `VERSION` (patch for skill additions and edits, minor for structural changes) and add a `CHANGELOG.md` entry saying what changed and why.
4. Package the change for review through whatever review flow the repository's maintainers use, with the changelog entry as the summary. Do not publish to the shared repository without that review.

## Boundaries

- Never edit files under `SKILLS/`, `AGENTS/`, or `KNOWLEDGE/` as a side effect of another task; library edits happen only through the promote flow above.
- Never bump `VERSION` for a `local/` draft — versioning tracks the shared library, and drafts aren't in it yet.
- Never delete anything from `local/` without being asked by name.
- 💡 proposals from other skills route through this skill's promote flow; the proposal marker is a request, not permission.
