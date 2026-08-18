
# Studio Context

Gladewick Games, ~120 people, two live titles. Teams: engineering, liveops, design.

## Titles

| Title        | Genre                          | Platforms                  | Build prefix |
| ------------ | ------------------------------ | -------------------------- | ------------ |
| Emberwake    | Live-service co-op action RPG  | PC, PlayStation, Xbox      | `ew-`        |
| Drift Harbor | Cozy harbor-builder            | iOS, Android (mobile-first), PC port in beta | `dh-` |

Both run on the in-house Kiln Engine (C++ core, Lua gameplay scripting).

## Team Ownership

| Area                          | Owning team |
| ----------------------------- | ----------- |
| Netcode, engine, build farm   | engineering |
| Economy tuning, seasons, events | liveops   |
| Quests, encounters, UX        | design      |
| Telemetry pipeline (Quill)    | engineering (liveops owns the metric definitions) |

## Season Calendar (Emberwake)

Seasons are named after moths and run ~12 weeks. Dates are launch → end:

| Season                    | Dates                        | Launch build |
| ------------------------- | ---------------------------- | ------------ |
| Season of the Ash Moth    | 2025-03-11 → 2025-06-02      | ew-3.0.0     |
| Season of the Lantern Moth| 2025-06-03 → 2025-08-25      | ew-3.1.0     |
| Season of the Frost Moth  | 2025-08-26 → 2025-11-17      | ew-3.2.0     |
| Season of the Ember Moth  | 2025-11-18 → 2026-02-09      | ew-3.3.0     |
| Season of the Silk Moth   | 2026-02-10 → 2026-05-04      | ew-3.4.0     |

Drift Harbor has no seasons; it ships monthly content drops (`dh-1.x` minors, roughly the first Tuesday of each month).

## Build IDs

`ew-MAJOR.MINOR.PATCH` / `dh-MAJOR.MINOR.PATCH`. Minor = season or content drop; patch = hotfix. Build IDs sort lexicographically within a platform (see [[telemetry-schema]] for the cross-platform caveat).

## Codename Policy

Unannounced content uses moth codenames internally until the season is announced. Never put a real feature name in a public repo, PR title, or patch note before announcement — repos are private but leak-prone via screenshots.
