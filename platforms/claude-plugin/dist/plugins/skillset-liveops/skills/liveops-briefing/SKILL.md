---
description: >
  The standing daily brief for both titles — yesterday against the 7-day baseline on population, stability, and fleet, anomalies first.
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


# Liveops Briefing

The daily brief compares **yesterday to the trailing 7-day baseline** for both titles. Same sections, same order, every day — the reader scans it in ninety seconds, and consistency is what makes deviation visible.

## Gathering

- **Population** — dispatch to [[quill-agent]], field names in [[telemetry-schema]]:
  - daily actives and peak concurrents, per title
  - session length and new-player starts
- **Stability** — query [crashlens]:
  - crash-free session rate per title vs baseline
  - any signature that is new or grew materially since yesterday, tagged with the build (ew-* / dh-*)
- **Fleet** — dispatch to [[fleet-agent]], which reads [opsdeck]:
  - capacity headroom and error-rate posture
  - any shard events or saturation warnings overnight

Check [[studio-context]] before judging any delta. A Saturday, a season boundary, a Drift Harbor monthly drop, or a regional holiday moves these numbers on its own; the brief's job is to separate expected movement from real movement, and to say which is which.

## Fixed section order

1. **Anomalies** — always first, even when the section reads "none." Anything outside its normal envelope: a metric beyond its usual daily swing, a new crash signature above the noise floor, a fleet event, a population move that [[studio-context]] does not explain. One line each: what, how far from baseline, suspected cause or "unexplained," and whether it needs a human today. An unexplained anomaly is never buried below a healthy topline.
2. **Emberwake** — population, stability, fleet vs baseline. Numbers with deltas, not adjectives.
3. **Drift Harbor** — same shape.
4. **Watch items** — yesterday's anomalies that resolved or persisted, and anything approaching a threshold that may page someone tomorrow.

## The "all quiet" rule

When every metric sits inside its normal envelope, the correct brief is short:

> **Anomalies:** none.
> **Emberwake:** actives +1.8% vs baseline, crash-free 99.61% (flat), fleet nominal.
> **Drift Harbor:** actives −0.9% vs baseline (normal weekday dip), crash-free 99.74%, fleet nominal.
> **Watch items:** none carried over.

That is a complete, correct deliverable. Never pad a quiet day with trivia, restated baselines, or speculative commentary — padding trains readers to skim, and skimming is how the one bad morning gets missed. The brief earns trust by being exactly as long as the day was interesting.
