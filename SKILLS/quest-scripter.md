---
name: quest-scripter
type: SKILL
description: >
  Draft Kiln Lua quest logic from a design brief using the house patterns —
  output a script skeleton plus an edge-case list, never a fake engine hook.
teams:
  - design
  - engineering
knowledge:
  - "[[lua-quest-patterns]]"
  - "[[studio-context]]"
agents: []
mcp: []
triggers:
  - "script this quest"
  - "draft the quest logic"
  - "write the objective flow"
assets: []
---

# Quest Scripter

Turn a design brief into a Kiln Lua quest skeleton. Load [[lua-quest-patterns]] first — it holds the house state-machine shape, the trigger registration API, and the cleanup contract every quest script must honor. [[studio-context]] tells you which title you're scripting for; Emberwake quests are co-op by default, Drift Harbor quests are solo with async visitors.

## What a skeleton looks like

Every quest is a state machine. States come from the brief's objective flow; the pattern library dictates the wiring. A brief like "escort the lamplighter through the Cindervault, defend two ambushes, light the beacon" becomes:

```lua
Quest.define("ew_lamplighter_escort", {
  states = { "MEET", "ESCORT_1", "AMBUSH_A", "ESCORT_2", "AMBUSH_B", "BEACON", "DONE" },
  on_enter = {
    MEET = function(q) q:register_trigger("npc_talk", "lamplighter", q.advance) end,
    AMBUSH_A = function(q) q:spawn_wave("cv_ambush_a"); q:register_trigger("wave_clear", q.advance) end,
    -- ...
  },
  on_abandon = function(q) q:despawn("lamplighter"); q:clear_triggers() end,
})
```

The skeleton is complete when every state has an entry action, an advance condition, and its triggers are released on exit. Registration without cleanup is the number-one source of ghost triggers in live quests — the pattern library's cleanup contract is not advisory.

## Paths the brief never mentions

Draft these for every quest, whether or not the brief does:

- **Abandon** — player drops the quest mid-state. Despawn escorts, clear triggers, restore world state.
- **Failure** — escort dies, timer lapses. Distinguish retry-from-state from retry-from-start; the brief's owner decides, but the skeleton must expose the choice.
- **Co-op: partner completes a step while you're dead.** House rule per [[lua-quest-patterns]]: state advances for the party, and the dead player's on-enter effects (waypoint, VO line) replay on revive.
- **Co-op: partner disconnects holding a quest item.** Item returns to the world spawn point, not the void.
- **Late join** — a player joins mid-quest. The skeleton must state which state they sync into.

## Flag, don't fake

If the brief needs something the trigger API cannot express — a new proximity shape, a weather condition, a cross-session timer — write `-- ENGINE HOOK NEEDED:` at the site with one line on what the hook must provide, and list it in the deliverable. Never stub it with a plausible-looking call that doesn't exist; a skeleton that runs until it hits an honest flag is useful, one that fails on an invented API is a trap.

## Deliverable

The Lua skeleton, then the edge-case list: each abandon/failure/co-op path with its handling, and the engine-hook flags with their one-line requirements. The skeleton is a starting draft for the quest's owner, not shippable content — say so.
