---
description: >
  Plan a save-format migration between builds — schema deltas, migration strategy, corrupted-save fallback, and the compatibility matrix. Real schemas only.
---

# Platform: Claude Code Plugin

This preamble teaches you how to interpret skillset conventions in the Claude Code plugin environment.

## Convention Mapping

- **"Dispatch to [[agent-name]]"** → Use the Agent tool: `Agent(subagent_type: "general-purpose", description: "...", prompt: "[full contents of the agent file]\n\nUSER QUERY: [query]")`
- **"Load [[knowledge-name]]"** → Read the file at the resolved knowledge path using the Read tool
- **"Query via [mcp-name]"** → Use the `mcp__[mcp-name]__` tool prefix (e.g., `mcp__github__search_code`)
- **"Invoke [[skill-name]]"** → Use the Skill tool if available, or read and follow the skill file directly

## File Resolution

All `[[links]]` resolve to files within this plugin:
- `[[name]]` in a knowledge context → look in this skill's directory or the plugin's references
- `[[name]]` in an agents context → `_agents/name.md` in the plugin root
- `[[name]]` in a skills context → `skills/name/SKILL.md` in the plugin root

---


# Save Migration Planner

Precondition, before any planning: **both schema versions in hand, verbatim.** The old build's save schema and the new one — actual field definitions, not a description of what changed. "We added a field to the inventory block and renamed the harbor decorations" is not a schema; migrations planned from descriptions are how the field someone forgot to mention eats a save. If either schema is described rather than shown, stop and request it. This rule has no exceptions and the refusal is the correct deliverable.

Load [[save-format]] for the container layout, the version-stamp location, and the studio's migration rules.

## The checklist

Work through it in order; each step's output feeds the next.

**1. Enumerate the schema deltas.** Diff the two schemas field by field. Classify each delta: added (with default), removed, renamed, type-changed, semantics-changed (same field, new meaning — the dangerous one). List every delta explicitly, including the ones that "obviously" migrate cleanly. For ew-3.4.1 → ew-3.5.0 this table might be six rows; for a Drift Harbor annual it might be forty. The count sets the plan's size, so get it right first.

**2. Choose the strategy per delta, using the rules in [[save-format]].** The two strategies:

- *Migrate-on-load* — the new build rewrites old saves to the new schema on first load. The rules require this for removed and semantics-changed fields, and for any delta where the old value needs computation to survive.
- *Versioned reader* — the new build keeps a reader for the old layout and interprets it in place. Permitted for added-with-default and straight renames; required when the old build must stay live alongside the new one (Drift Harbor's staged mobile rollouts).

A single migration can mix strategies, but each delta gets exactly one, and the choice is justified by rule, not preference.

**3. Define the corrupted-save fallback.** Decide what happens when migration fails mid-save: which blocks are recoverable independently (the container layout in [[save-format]] marks block boundaries), what the player keeps if only the inventory block is readable, and what the last-resort restore is. "Fails loudly, player keeps the pre-migration file, support restores it" is a valid fallback; silent partial migration is not. The pre-migration file must survive until the migrated save has loaded cleanly once.

**4. Write the compatibility matrix.** Every cell gets an expected behavior, including the ugly ones:

| | New build | Old build |
| --- | --- | --- |
| **New save** | loads | must refuse cleanly, version-stamp message — never a crash, never a silent wipe |
| **Old save** | migrates per plan | loads (baseline) |
| **Migrated, then old build** | — | the roll-back case: define it, don't discover it |

The old-build/new-save cell is the one teams skip and players find, via a rolled-back console patch or a shared save. The plan defines the refusal behavior explicitly.

Deliverable, in one document:

- the delta table, one row per delta with its classification and chosen strategy;
- the fallback definition, per recoverable block;
- the filled matrix, every cell stating an expected behavior.

The plan is done when an engineer who has read neither schema could execute it cell by cell.
