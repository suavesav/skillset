---
name: patch-notes-writer
type: SKILL
description: >
  Turn a release manifest into player-facing patch notes in the owning title's
  voice — every line traced to a manifest item, numbers on every balance change.
teams:
  - marketing
  - liveops
knowledge:
  - "[[patch-notes-format]]"
  - "[[voice-bibles]]"
  - "[[studio-context]]"
agents: []
mcp: []
triggers:
  - "write the patch notes"
  - "turn this changelog into player-facing notes"
  - "patch notes for the hotfix"
---

# Patch Notes Writer

Patch notes are a record, not an announcement. The manifest is the source; your job is translation, not selection and never invention.

Load [[patch-notes-format]] for the template and [[voice-bibles]] for the owning title's rules. Identify the title from the build prefix in [[studio-context]] — `ew-` is Emberwake, `dh-` is Drift Harbor — before writing a word. The two titles do not share a vocabulary, and a Drift Harbor note written in Emberwake's register fails DH-2 in the first balance line.

## The traceability rule

**Every line in the output traces to one item in the release manifest.** Before delivering, walk your draft line by line and name the manifest item behind each one. A line you cannot trace is cut, not softened.

The failure this prevents is the plausible fix: the manifest fixes a save-loading bug and the draft grows a line about save performance that nobody shipped. Players test notes against the build; an invented line is found within hours and costs more than the fix it decorated.

The rule runs the other way too. A manifest item you cannot state in player-facing words is internal; it drops out with a note to the caller, not a vague line.

## Balance lines carry numbers

Every balance change ships as `thing — before → after`, plus one sentence of intent, per [[patch-notes-format]]. No exceptions:

- If the manifest gives a before but no after, or an after but no before, go back and ask. Do not ship a one-sided number.
- "Reduced," "increased," and "adjusted" without values are not balance lines. Either find the numbers or move the item to Fixes.
- Percentages carry the base value alongside them.
- Emberwake economy changes state the cinder amount before and after; a currency change without both figures is the most-quoted omission the studio has made.

## Known Issues is mandatory

The section ships in every set of notes. If nothing is open, it ships with one line saying so. Never omit it, never fold it into Fixes, never replace it with a link. An absent Known Issues section reads as a claim that the build is clean.

Ask for the open-issues list if the manifest does not carry one. Do not infer it from the fixes.

## Codenames never leave the building

Per [[studio-context]], unannounced content carries a moth codename internally, and a codename in a patch note is a dated leak. Check every line for content not yet announced: an item touching unannounced content does not appear at all, not under its codename and not described generically. Raise it with the caller instead.

Internal ticket IDs, branch names, and engineer names come out under the same rule, per [[patch-notes-format]].

## Deliverable

The full notes in template order — Highlights, Balance, Fixes, Known Issues — followed by each storefront blurb the release needs, cut to the caps in [[patch-notes-format]] with a character count beside it. Close with the traceability pass: any manifest item you dropped and why, and any line you could not write because a number or a symptom was missing.
