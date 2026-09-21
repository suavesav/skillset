---
name: mcp-registry
type: KNOWLEDGE
description: The seven studio MCP servers — what each serves, credential env vars, config-snippet shape, and a one-line verification call per server
---

# MCP Registry

The seven MCP servers the studio's skills and agents query. Declare a server in a skill or agent's `mcp:` list before using it in the body. Credentials come from the environment — never inline a token in a config or a skill.

## Config-snippet shape

All seven follow the same shape in a platform's MCP config; only the package name and env var change:

```json
{
  "mcpServers": {
    "quill-telemetry": {
      "command": "npx",
      "args": ["-y", "@gladewick/quill-telemetry-mcp"],
      "env": { "QUILL_API_TOKEN": "${QUILL_API_TOKEN}" }
    }
  }
}
```

## The servers

**quill-telemetry** — read access to the Quill warehouse: datasets, event queries, metric rollups for both titles. Schema and join rules live in [[telemetry-schema]]. Env var: `QUILL_API_TOKEN` (read-only analyst scope; write scopes exist but no skill should request one). Verify: `list_datasets` returns `qd-101` among the results.

**crashlens** — crash reports and crash-free rates: symbolicated stacks, grouping, per-build rates, quarantine-pattern cases from [[save-format]] policy. Fatal crashes live here, not in Quill. Env var: `CRASHLENS_TOKEN`. Verify: `get_crash_free_rate` for the current live Emberwake build returns a percentage.

**kiln-replay** — Kiln Engine desync bundles: list bundles, pull checksum timelines, extract input streams. Bundle anatomy is in [[replay-format]]. Env var: `KILN_REPLAY_KEY`. Verify: `list_bundles` with a 24h window returns without error (an empty list is a healthy answer).

**opsdeck** — fleet state and scaling: shard counts, utilization, scale schedules, region rollups. Actions are judged against [[capacity-model]]; scale *changes* through MCP require the operator scope, which defaults off. Env var: `OPSDECK_TOKEN`. Verify: `get_fleet_summary` returns per-region shard counts.

**greenroom** — the official community hub: boards, threads, bug-report intake, staff-visible account context on posts. Source weighting lives in [[community-sources]]. Env var: `GREENROOM_API_KEY`. Verify: `get_board` for the Emberwake feedback board returns board metadata.

**beacon-ua** — user-acquisition and store analytics: per-channel spend, installs, CPI, ROAS, creative performance, and storefront impressions and conversion for both titles. Benchmarks and attribution rules live in [[ua-benchmarks]]. Beacon knows about installs; whether those installs became players is a Quill question. Env var: `BEACON_API_TOKEN` (read-only analyst scope). Verify: `get_channel_summary` for the last 7 days returns per-channel spend.

**dealbook** — the partner and deal CRM: pipeline stages, deal terms, platform featuring history, contract dates, partner contacts by role. Terms are judged against [[deal-policy]]. Env var: `DEALBOOK_TOKEN` (read scope; the deal-owner scope that edits terms defaults off and no skill should request it). Verify: `list_deals` with `stage=open` returns without error (an empty list is a healthy answer).

## Registry rules

- One env var per server, named above. A missing var should fail loudly at server start; a skill that gets an auth error should say which var to check, not retry.
- Servers are read-mostly by design. The three write paths (opsdeck operator scope, greenroom staff posting, dealbook deal-owner scope) each require an explicitly granted scope and are never part of a default setup.
- New servers are added here first — a skill referencing an unregistered server name is a broken dependency by definition.
