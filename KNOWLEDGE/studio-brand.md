---
name: studio-brand
type: KNOWLEDGE
description: Gladewick visual identity — palette, typography, logo usage, chart color order
---

# Studio Brand

Gladewick Games visual identity. Applies to dashboards, decks, docs, and any player-facing image the studio produces outside the games themselves.

## Palette

| Name        | Hex       | Role                                    |
| ----------- | --------- | --------------------------------------- |
| Ink Slate   | `#1C2321` | Text, dark backgrounds                  |
| Glade Green | `#15803D` | Primary accent, first chart series      |
| Wisp Violet | `#7C3AED` | Secondary accent, highlights            |
| Lake Blue   | `#0E7490` | Comparison series, informational        |
| Frost       | `#F4F7F5` | Light backgrounds                       |

Body text is Ink Slate on Frost, or Frost on Ink Slate. Never Glade Green for body text — it is an accent, not a reading color.

## Typography

- **Headings:** Archivo, weight 700. Sentence case, not title case.
- **Body:** Inter, weight 400; 600 for emphasis. No italics in UI or dashboards.
- Minimum body size 14px on screens, 10pt in print.

## Chart Color Order

Series take colors in this fixed order: Glade Green, Lake Blue, Wisp Violet, Ink Slate (60% opacity). A fifth series means the chart should be split into two charts. Semantic overrides: Glade Green always means the primary subject, Lake Blue the comparison — if the primary subject *is* the bad case, keep it green and let the caption say so.

## Logo Usage

- The glade-and-anvil mark sits top-left on decks, bottom-right on dashboards.
- Clear space around the mark: one mark-height on all sides.
- Mono versions only: Ink Slate on light, Frost on dark. No recoloring, no drop shadows, no rotation.
- Title logos (Emberwake, Drift Harbor) never appear smaller than the Gladewick mark on the same page.

## Do / Don't

- **Do** lead with the data; brand is the frame, not the subject.
- **Do** use Frost backgrounds for anything that will be screenshotted into chat.
- **Don't** introduce colors outside the palette; grays derive from Ink Slate at reduced opacity.
- **Don't** use gradients, glows, or texture fills in charts.
- **Don't** put season codenames (see [[studio-context]]) in any external-facing material before announcement.
