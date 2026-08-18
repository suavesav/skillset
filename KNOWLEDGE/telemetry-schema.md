---
name: telemetry-schema
type: KNOWLEDGE
description: Quill telemetry warehouse — dataset IDs, event taxonomy, join rules, and studio metric definitions
---

# Telemetry Schema

The Quill warehouse holds all player telemetry for both titles. Query via the quill-telemetry MCP server.

## Datasets

| Dataset ID | Name              | Contents                                | Grain            |
| ---------- | ----------------- | --------------------------------------- | ---------------- |
| `qd-101`   | emberwake_events  | All Emberwake client and server events  | one row / event  |
| `qd-102`   | emberwake_daily   | Pre-aggregated daily metrics, Emberwake | one row / player / day |
| `qd-201`   | driftharbor_events | All Drift Harbor client/server events  | one row / event  |
| `qd-202`   | driftharbor_daily | Pre-aggregated daily metrics, Drift Harbor | one row / player / day |
| `qd-900`   | accounts          | Cross-title account registry            | one row / account |

Prefer the `_daily` datasets for anything answerable at day grain — they are ~400x cheaper to scan than raw events.

## Core Events (both titles)

- `session_start` / `session_end` — carries `platform`, `build_id`, `region`
- `level_complete` — carries `level_id`, `duration_s`, `deaths`, `party_size`
- `purchase` — carries `sku`, `currency`, `price_minor_units` (soft currency purchases too — filter `currency = 'gold'` vs `'real'`)
- `quest_step` — funnel backbone; `quest_id` + `step_index`
- `client_error` — non-fatal errors; fatal crashes live in Crashlens, not here

## Join Rules

- Join events to accounts on `account_id`, never on `device_id` (one account, many devices)
- Cross-title questions join through `qd-900`; the two event datasets share no keys directly
- `build_id` is sortable lexicographically within a platform, not across platforms

## Metric Definitions (studio-standard)

- **Retention Dn**: player had a session on day n after their _first session_ (not account creation — accounts pre-register before install)
- **DAU**: distinct `account_id` with ≥1 `session_start`, excluding `account_type = 'dev'`
- **Conversion**: first `purchase` with `currency = 'real'`, ever, per account
- **Crash-free rate**: lives in Crashlens; do not approximate it from `client_error`

## Gotchas

- Events arrive up to 48h late from console platforms. Never compute "yesterday" before noon.
- `qd-101` events before build `ew-3.0.0` used `map_id` instead of `level_id`. Old queries need a COALESCE.
- Season boundaries and build dates live in [[studio-context]] — pin windows to those, not calendar months.
