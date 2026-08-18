---
name: accessibility-auditor
type: SKILL
description: >
  Audit a screen or feature against the Gladewick accessibility checklist —
  pass, fail, or needs-hardware-test per item, with remediation cited from the standard.
teams:
  - design
  - engineering
knowledge:
  - "[[accessibility-standard]]"
agents: []
mcp: []
triggers:
  - "accessibility audit"
  - "can colorblind players read this"
  - "a11y check"
---

# Accessibility Auditor

An audit is a verdict per checklist item, delivered in a fixed format. It is not a general impression of how accessible something feels.

Load [[accessibility-standard]] and audit the target — a screen, a menu flow, an encounter, a new input mode — against every item in the checklist that applies. Scope honestly: items that don't apply are marked `n/a` with the reason, not silently dropped, so a reader can tell "passed" from "wasn't checked."

## The three verdicts

- **pass** — you verified the item against the target as described. State what you checked.
- **fail** — the target violates the item. State the specific violation (which element, which state, which values).
- **needs-hardware-test** — the item cannot be verified from description, mockups, or capture alone. Contrast ratios can be computed; how the haptic cue on the tide-gate timing reads through an actual controller, or whether the ping wheel is reachable one-handed on a standard pad, cannot. **Never guess these.** A guessed pass on a hardware item is worse than a fail, because nobody re-checks a pass.

For every fail, cite the standard's remediation entry by its identifier — each checklist item in [[accessibility-standard]] carries one. Do not invent a fix, even an obvious one; the remediation entries encode choices the studio already made (which colorblind-safe palette, which minimum text size at 10-foot distance, which channels must duplicate every audio-only cue). If a fail has no remediation entry, say so — that's a gap in the standard, and gets flagged, not improvised around.

## Output format

First, the checklist table, in the standard's own item order:

| Item | Verdict | Detail |
| --- | --- | --- |
| A-04 Color is never the sole channel | fail | Ready-check uses green/red fill only, no icon or label — see remediation R-A04 |
| A-07 Text min size at 10-ft distance | pass | Smallest string 28px at 1080p, above floor |
| A-11 Controller remap coverage | needs-hardware-test | Requires pad-in-hand pass on ew build |

Then, exactly three **highest-impact failures**, ranked. Impact means how many players the barrier excludes and how completely — a fail that blocks play outranks one that adds friction. For each of the three:

- the barrier in one sentence
- who hits it, and what it stops them from doing
- the remediation entry from [[accessibility-standard]]
- where else in the game the same pattern likely repeats

If the audit found fewer than three failures, list what it found and say so; do not promote a `needs-hardware-test` to fill the slot.

End with the hardware-test list as a block someone can schedule from: item, what to test, which hardware, which build (ew-* or dh-*).

💡 If the same fail pattern shows up across several audits, propose adding a checklist item or remediation entry to [[accessibility-standard]] so the next audit catches it by name.
