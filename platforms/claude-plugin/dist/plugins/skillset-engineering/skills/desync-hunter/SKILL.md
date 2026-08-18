---
description: >
  Investigate a co-op desync from replay bundles — find the divergence tick, classify the cause class, and size the blast radius before calling severity.
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


# Desync Hunter

A desync report arrives as a feeling ("my partner's boss was at half health, mine was dead") and gets solved as a tick number. The path from one to the other runs through the replay bundle, and the bundle is the only evidence that counts — player descriptions locate the session, never the cause.

## Get the bundle

Query via [kiln-replay] for the session's desync bundle: both clients' input streams, per-tick state checksums, and the sim snapshot each client took when the checksum mismatch fired. [[replay-format]] documents the bundle layout and which checksum channels exist (entity transforms, combat state, loot state, quest state). If the session has no bundle — client too old, or the mismatch never tripped the threshold — say so and ask for a session that does; there is no useful analysis of a desync without one.

## Find the tick

Dispatch to [[replay-agent]] with the bundle. It replays both input streams deterministically, locates the first tick where checksums diverge, and diffs the two sim states at that tick, reporting which channel broke first and which entities differ. The first divergent channel matters more than the loudest one — a combat-state divergence at tick 41,202 will cascade into transforms, loot, and everything else by 41,400, and chasing the cascade is how these investigations rot.

## Classify

Every desync lands in one of three cause classes, and the tick diff usually tells you which:

- **Simulation nondeterminism** — identical inputs, divergent state. Both clients received the same input stream up to the tick, yet state differs: float-order sensitivity, an unseeded random draw, iteration over an unordered container in gameplay Lua. The diff shows a small numeric drift, not a missing event.
- **Dropped input** — the input streams themselves differ at or before the tick. One client never received a command the other applied. This is transport, not simulation; the sim did its job on bad data.
- **Late-join race** — the diverging client joined mid-session and its baseline snapshot predates a state change that never got replayed to it. The diff shows a stale value that was correct some seconds earlier.

If the evidence fits none of these, report "unclassified" with the diff attached rather than forcing the nearest class — an honest unclassified is rarer and more valuable than a wrong label.

Two look-alikes to rule out before classifying at all:

- **Visual-only divergence** — the sims agree, the presentation doesn't (interpolation hiccup, a client-side effect firing twice). Checksums never diverge; the bundle exists only because a player filed the session manually. Real problem, different owner.
- **Host migration seam** — the checksum mismatch fires within a few ticks of a host handoff. Per [[replay-format]], mismatches inside the handoff grace window are expected noise; only a divergence that persists past the window counts.

## Size before you call severity

One bundle proves existence, not scale. Before naming severity, pull the desync-event counts from telemetry — [[telemetry-schema]] has the `coop.desync_detected` fields (build, mode, region, tick-of-first-divergence). The questions that set severity: what share of co-op sessions on the affected build hit it, is it one encounter or everywhere, and is it growing since the build shipped? A nondeterminism bug touching 0.2% of ew-3.4.1 Vault runs and a dropped-input storm hitting 6% of one region are different emergencies wearing the same player report.

Deliver:

- divergence tick and first divergent channel;
- cause class, with the diff excerpt that supports it;
- blast radius numbers by build, mode, and region;
- the severity call those numbers justify, stated with its threshold.
