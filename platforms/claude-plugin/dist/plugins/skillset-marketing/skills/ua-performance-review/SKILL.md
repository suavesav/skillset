---
description: >
  Review Drift Harbor paid acquisition by channel — spend, CPI, D7 ROAS against the benchmarks, retention against organic — and return a scale/hold/cut call per channel.
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


# UA Performance Review

A channel is judged on what it bought, not what it cost, and measured against what organic brings in for free. Two systems answer that and neither answers it alone: Beacon knows the spend and the installs, Quill knows whether those installs became players.

Load [[ua-benchmarks]] first. It holds the CPI bands, retention floors, ROAS thresholds, minimum cell size, and the attribution rules that decide whether a number is readable yet. A review run without it is a spreadsheet with opinions attached.

## Step 1 — Pull both sides

Dispatch to [[beacon-agent]] for spend, installs, CPI, D7 ROAS, and creative breakdown, split by channel × region tier. One batch.

Dispatch to [[quill-agent]] for D1, D7, and D30 retention on the same cohorts, **plus the same-period organic cohort**, using the Drift Harbor datasets and the house Retention Dn definition in [[telemetry-schema]]. The organic cohort is not optional: a paid channel at 19% D7 passes the floor and fails against an organic period running 26%, and only the second comparison says what the money bought.

Both pulls cover the same whole-day window, stated once at the top of the report.

## Step 2 — Check the window is readable

Per [[ua-benchmarks]], D7 ROAS is not final until day 10. If the window's tail is inside that, say so and report installs, spend, and CPI only. Never call on a provisional ROAS, and never let a caller's deadline move the date.

## Step 3 — The per-channel table

One row per channel × region tier cell:

| Channel | Tier | Spend | Installs | CPI | vs band | D7 ROAS | D1 / D7 / D30 | vs organic D7 | Call |

`vs band` and `vs organic D7` are stated as the benchmark and the gap, not as a color. Cross-promo from Emberwake has no spend and no ROAS — score it the way [[ua-benchmarks]] specifies and mark its ROAS cell not applicable rather than zero.

## Step 4 — One call per channel, with its justification

Every cell gets **scale**, **hold**, **cut**, or **no call**, and every call names the benchmark that produced it: "cut — D7 ROAS 0.19 against the 0.24 cut threshold." A call without a cited threshold is an opinion and does not ship.

Two overrides, both from [[ua-benchmarks]]:

- A channel passing D7 ROAS but failing the D7 retention floor, or sitting below 75% of organic D7, does not get **scale**. Report it as a quality finding.
- A channel over the zero-session threshold gets **cut** regardless of ROAS, with the install count and share stated.

## The small-sample rule

**A cell under 400 installs gets no call.** Report its numbers with an explicit small-sample warning in the Call column, reading `no call — 260 installs, below the 400 floor`. Under 150 installs, report the install count and nothing else: no CPI, no ROAS, no retention rates.

Never aggregate thin cells to clear the floor. A T1 and a T3 cell summed produce a CPI that describes neither, and the call it supports will be wrong in both markets.

Close with what would change a call: a cell approaching the 400 floor, a provisional ROAS that firms up on a named date, a fraud flag awaiting a claw-back.
