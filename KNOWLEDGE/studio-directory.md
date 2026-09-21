---
name: studio-directory
type: KNOWLEDGE
description: Gladewick org map — the five teams and what they own, studio rituals, escalation paths by incident type, and internal channel names
---

# Studio Directory

Who owns what at Gladewick Games, where the studio meets, and where an incident goes. Roles only, no person names: people move and the file would rot. Titles, platforms, seasons, and build IDs are in [[studio-context]]; this is the org side of the same picture.

## The five teams

| Team | Remit | Owns |
| ---- | ----- | ---- |
| engineering | Keeps both titles running and buildable | Netcode, Kiln Engine, build farm, telemetry pipeline (Quill), replay capture |
| liveops | Runs the live games day to day | Economy tuning, seasons, events, metric definitions, live incident on-call |
| design | Decides what players do and how it feels | Quests, encounters, UX, playtest program |
| marketing | Brings players in and tells them what changed | Store pages, campaigns, creator program, user acquisition, patch notes |
| sales | The money side and the platform relationships | Platform partnerships, deals, pricing and bundles, the monthly revenue read |

Two ownership seams cause most misrouted questions:

- **Quill** is engineering's pipeline; liveops owns the metric definitions inside it. "Why is the number wrong" is a liveops question, "why is the number missing" an engineering one.
- **Patch notes** are marketing's to write and publish, from the release manifest liveops assembles out of engineering's change list. A wrong fact in a patch note is a marketing fix, a missing fact a source-team fix.

## Rituals

| Ritual | Cadence | Who |
| ------ | ------- | --- |
| Weekly update | Friday, before end of day | Everyone, in `#studio-updates`, format in [[studio-comms-format]] |
| Season retro | Within two weeks of a season ending | Liveops runs it, design and engineering attend |
| Monthly revenue read | First week of the month | Sales presents, marketing and liveops attend |
| Drift Harbor drop review | Week before each monthly `dh-` drop | Design and liveops, marketing for the notes |

## Escalation by incident type

| Incident | Goes to |
| -------- | ------- |
| Live outage or degraded service | Liveops on-call first, in `#ew-live` or `#dh-drops`; liveops escalates to engineering when the cause is the engine, fleet, or build |
| Desync or replay mismatch | Engineering, with a replay bundle attached. No bundle, no investigation — the bundle is the report |
| Crash spike on a build | Engineering, tagged with the build ID; liveops decides on rollback |
| Economy or drop-rate anomaly | Liveops |
| Store-page error, wrong screenshot, bad copy | Marketing |
| Patch note that is factually wrong | Marketing, who pull the correction from the owning team |
| Platform partner or contract question | Sales. Never answered to a partner directly by another team |
| Pricing, bundle, or refund policy | Sales |

Escalation is by incident type, not by who noticed it. Anyone from any team files into the owning team's channel.

## Channels

| Channel | For |
| ------- | --- |
| `#studio-updates` | Friday updates, studio-wide announcements. Read-mostly |
| `#ew-live` | Emberwake live status, incidents, on-call handoff |
| `#dh-drops` | Drift Harbor drop prep, drop-day status, mobile store issues |
| `#kiln-eng` | Engine, netcode, build farm, replay tooling |
| `#season-room` | Season planning across liveops and design |
| `#playtest` | Session scheduling, raw notes, synthesis |
| `#go-to-market` | Campaigns, creator program, store pages, patch-note drafts |
| `#dealroom` | Partner conversations, deal status, pricing. Restricted; contents are team-only tier per [[studio-comms-format]] |

A question posted in the wrong channel gets moved, not answered twice. When the channel is unclear, the owning team above decides it.
