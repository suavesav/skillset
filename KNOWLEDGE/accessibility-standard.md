---
name: accessibility-standard
type: KNOWLEDGE
description: The Gladewick accessibility checklist — A11Y-01 through A11Y-10 with severity and remediation notes; blockers ship nothing
---

# Accessibility Standard

Both titles check against this list every season; new features check before merge to a launch candidate. Severity: **blocker** items stop a launch like any red in [[launch-runbook]]; **major** items get a dated fix commitment; **minor** items are backlog with a season deadline.

Each item below: id, requirement, severity, remediation note.

**A11Y-01 — Text contrast.** All UI text ≥4.5:1 against its rendered background; large text (≥24px) ≥3:1. Measured over the busiest background the text can appear on, not the average. *Blocker.* Remediation: add a backing plate or scrim behind the text; never fix by darkening the game scene.

**A11Y-02 — Interactive contrast.** Interactive elements and their focus states ≥3:1 against adjacent colors. *Major.* Remediation: thicken the focus outline before recoloring — outline weight fixes most failures without art rework.

**A11Y-03 — No color-only state.** Every state distinction (enemy vs ally, ready vs cooldown, buff vs debuff, Drift Harbor cargo types) carries a second channel: icon shape, pattern, outline style, or label. *Blocker.* Remediation: shape-code first; the studio pattern library has paired shapes for all standard states. Verify under all three colorblind sim filters in Kiln's render debug.

**A11Y-04 — Colorblind-safe palettes.** The three built-in filter presets (deuteranopia, protanopia, tritanopia) remap team and rarity colors without touching art direction hues elsewhere. *Major.* Remediation: remap in the palette table, not per-material.

**A11Y-05 — Subtitle spec.** Default 28px at 1080p, scalable to 46px; max 38 characters per line, two lines; speaker tags on every line of multi-speaker scenes; background box at 60–100% opacity, player-adjustable. *Blocker for speaker tags and scaling; major for the rest.* Remediation: line-length failures are script-side — rebreak lines, don't shrink text. Speaker tag names must match [[voice-bibles]] character naming.

**A11Y-06 — Full input remapping.** Every action rebindable on every input device, including console controllers; no action locked to a fixed key; simultaneous-press requirements have a sequential alternative. *Blocker.* Remediation: if an engine-level binding blocks a remap, route through Kiln's action-map layer rather than granting an exception.

**A11Y-07 — Hold-to-press alternatives.** Any hold or mash input offers a toggle equivalent. *Major.* Remediation: the toggle ships in the same menu as the binding, not buried in a separate accessibility page.

**A11Y-08 — Camera-shake and flash toggles.** Screen shake, camera bob, and full-screen flash effects each have an independent 0–100% slider; 0 fully disables. *Blocker.* Remediation: effects must be authored with the slider from the start — retrofitting a shake slider onto baked animation is a rebuild, and it is still required.

**A11Y-09 — Photosensitivity screening.** Every launch candidate's new cinematics, boss effects, and seasonal spectacle content pass automated flash-pattern analysis (no more than 3 flashes/second, no large-area red flash); failures get manual review and re-author. *Blocker.* Remediation: re-time or reduce area of the flashing element; the analyzer report names the offending frames.

**A11Y-10 — Readable defaults.** The default configuration passes A11Y-01 through A11Y-05 without the player opening a menu. Accessibility that requires discovering settings is a fallback, not a pass. *Major.* Remediation: promote the failing option's accessible value to default and make the previous default the opt-in.

## Auditing

A full-list audit runs once per season on each title's launch candidate; per-feature checks cover only the ids a feature touches. Audit results are filed by id so trend lines per item survive team turnover.

There is no exception process for blockers. A blocker that cannot be fixed in time moves the launch, same as any red in the runbook.

Playtest observations tagged to any A11Y id inherit that id's severity floor in [[playtest-protocol]] counting.
