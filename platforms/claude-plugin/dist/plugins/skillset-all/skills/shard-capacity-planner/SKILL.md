---
description: >
  Forecast the shard fleet for a launch or event — pre-scale date, peak fleet, headroom, scale-down — with stated assumptions and the metric that would invalidate them.
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


# Shard Capacity Planner

A capacity forecast is four dates and a number, plus the reasoning that lets someone check it. The worksheet below produces all of it. [[studio-context]] identifies what you're planning for — an Emberwake season start (Frost Moth-scale login spike, 12-week tail) and a Drift Harbor monthly drop (shallow spike, mobile-paced) are different shapes, and the model treats them differently.

## Worksheet

**1. Current posture.** Dispatch to [[fleet-agent]] for the fleet as it stands: shard count by region and mode, current peak concurrency, utilization at peak, and the observed spin-up time for a fresh shard. It reads via [opsdeck]; take its numbers over anyone's memory of last season. Posture is the baseline every other line builds on.

**2. Demand estimate.** Apply [[capacity-model]]:

- *Players-per-shard by mode* — Vault instances, open-zone shards, and Drift Harbor harbors pack differently; the model has the per-mode figures and the mixed-mode blend for a typical season-start hour.
- *Login-surge curve* — the model's surge shape: what fraction of day-one peak hits in the first hour, when the true peak lands (Emberwake seasons: evening of day one, not minute one), and the decay to steady state over the first week.
- *The event multiplier* — season starts pull lapsed players; the model's return-rate factor applied to the last season's peak, not to current concurrency.

**3. The plan.** Five lines, each a number and a date:

| Line | What it states |
| --- | --- |
| Pre-scale date | when the fleet starts growing — spin-up time and the surge curve's leading edge decide this, not the launch date |
| Peak fleet | shards by region and mode at forecast peak |
| Headroom | percentage above forecast peak actually provisioned; [[capacity-model]] sets the floor per event class |
| Hold window | how long peak fleet stays up before scale-down begins |
| Scale-down date | when the fleet returns to steady state, following the decay curve — not a guess, not "when it feels quiet" |

**4. Assumptions and the tripwire.** Every forecast ends with two short lists.

The assumptions it stands on, each one checkable:

- which past event supplied the surge shape, and why it's comparable;
- the return-rate factor used and the season it came from;
- the shard spin-up time assumed (from step 1's observed figure, not the vendor's).

Then the tripwire — the specific observable metric that, if it moves, invalidates the plan: "if login queue depth exceeds 2,000 in the first 30 minutes, the surge is outrunning the curve; go to the day-one contingency." One tripwire per plan, checkable in real time via [opsdeck]. A forecast without a tripwire is a hope with a spreadsheet.

If the event has no comparable precedent (first launch on a new platform, first crossover event), say the forecast is low-confidence, widen the headroom per the model's no-precedent rule, and shorten the tripwire's reaction window. 💡 After the event, if observed peak diverged from forecast by more than the model's stated error band, propose the correction to [[capacity-model]] with the observed numbers.
