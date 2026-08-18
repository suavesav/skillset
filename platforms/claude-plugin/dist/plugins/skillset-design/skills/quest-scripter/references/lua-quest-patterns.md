
# Lua Quest Patterns

Every quest is a state machine defined through `Quest.define`. States own their triggers; the engine owns transitions and persistence. Scripts that fight this shape are the ones that break in co-op.

## The skeleton

```lua
local Q = Quest.define("ew_moth_shrine", { version = 3 })

Q:state("FIND_SHRINE", {
  enter = function(ctx)
    ctx.marker = World.mark("shrine_moth_03")
    ctx:listen("region_enter", "shrine_moth_03", function()
      ctx:advance("LIGHT_BRAZIERS")
    end)
  end,
  exit = function(ctx)
    World.unmark(ctx.marker)
  end,
})

Q:state("LIGHT_BRAZIERS", { --[[ same shape ]] })
Q:terminal("DONE")
```

Bump `version` whenever a state is added, removed, or renamed — the engine migrates in-flight saves by state name, and an unversioned rename strands players in a state that no longer exists.

## Triggers and cleanup

- Register triggers only inside `enter`, only via `ctx:listen`. Listeners registered through `ctx` auto-unregister on state exit.
- Everything else the state created — markers, spawns, ambient VO, weather overrides — is torn down explicitly in `exit`. `exit` runs on every way out of the state: advance, abandon, disconnect, and party-sync. Write it to be safe to run against a partially-built state.
- Never mutate world state from a trigger callback without checking `ctx:current()` — a callback can fire in the same tick as a transition and land after the state has changed.

## Abandon and failure

- `Q:on_abandon` must return the world to its pre-quest condition: despawn quest actors, clear overrides, refund consumed quest items flagged `returnable`.
- Abandoned quests restart from the first state. There is no resume — never stash progress outside the state machine to fake one.
- Failure is a state, not an error. Route failures to a terminal state (`Q:terminal("FAILED")`) so cleanup runs through the same `exit` path as success.

## Co-op edge cases

- **Partner completes a step while you're dead.** Step completion is party-scoped; dead members receive the transition on respawn as a replayed `enter`. Every `enter` must therefore be idempotent — guard world mutations, don't double-spawn.
- **Late joiner mid-quest.** A player joining the party lands in the party's current state, and `enter` runs for them alone with `ctx.late_join = true`. Skip cinematics, one-time rewards, and world mutations behind that flag.
- **Split decisions.** Any step that offers a choice must resolve party-wide from one player's input (`ctx:party_choice`). Per-player choices desync the state machine and produce a bundle for the desync pipeline.

## The three classic footguns

| # | Footgun | Symptom | Fix |
| --- | --- | --- | --- |
| 1 | Raw `Events.on` inside `enter` instead of `ctx:listen` | Quest logic fires after the quest is complete or abandoned; "ghost" markers and VO | Only `ctx:listen`; grep quest scripts for `Events.on` in review |
| 2 | Non-idempotent `enter` | Duplicate markers or spawned actors after a death-respawn replay or late join | Guard every world mutation with an existence check or `ctx.late_join` |
| 3 | Calling `ctx:advance` from inside `exit` | State machine wedges; quest UI shows a state the engine already left; save can't migrate | Transitions only from trigger callbacks or `enter` — never `exit` |
