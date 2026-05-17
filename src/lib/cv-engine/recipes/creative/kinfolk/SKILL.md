---
id: creative/kinfolk
route: creative
displayName: Kinfolk
description: Calm, generous single-page CV. Oversized serif name, airy density, warm bone background, drop-cap on summary, optional pull-quote.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/field-notes-editorial-template
  modifications: >
    Translated the field-notes business-report aesthetic into a single-page CV:
    kept the soft paper, serif hero typography, and pastel insight palette.
    Removed the charts/cards data treatment (not relevant for a CV). Added a
    drop-cap on the summary, an optional pull-quote (pulled from experience by
    the AI in Phase 2), and small-caps tagline support under the name.
industryAffinity: [design, creative, writing, publishing, photography, architecture, ngo, education]
layoutShape: single-column
palette:
  ink:
    anchor: { l: 20, c: 0.02, h: 60 }
    range: { l: [14, 28], c: [0.01, 0.035], h: [40, 80] }
  paper:
    anchor: { l: 95, c: 0.022, h: 80 }
    range: { l: [92, 98], c: [0.015, 0.035], h: [70, 95] }
  accent:
    anchor: { l: 55, c: 0.12, h: 30 }
    range: { l: [45, 62], c: [0.08, 0.18], h: [15, 50] }
  muted:
    anchor: { l: 48, c: 0.025, h: 60 }
    range: { l: [42, 55], c: [0.015, 0.04], h: [40, 80] }
  surface:
    anchor: { l: 92, c: 0.03, h: 80 }
    range: { l: [88, 95], c: [0.02, 0.045], h: [70, 100] }
allowedFontPairings:
  - playfair-inter
  - libre-baskerville-source-sans
  - dm-serif-dm-sans
primitives:
  header: stacked
  section: kicker-rule
  skillList: tags
  experienceItem: paragraph
decorators:
  pullQuote: true
  dropCap: true
  marginalia: false
  heroNumeral: false
  posterLine: false
density: airy
---

# Kinfolk — slow, warm, generous

A CV that reads like an editorial profile. Generous whitespace, oversized
serif name, airy line-height. The clay-warm accent shows up sparingly: in
the kicker rule above section titles, in the drop-cap on the summary, and
in a small-caps tagline under the candidate's name.

## Container

- A4 single column, warm bone paper (cream with a slight ochre tint).
- Page margins 24mm. Density airy.

## Header

- Name set very large (44pt Playfair Display) — display moment, the page
  starts here.
- Tagline in small caps under the name (e.g. "Strategist, writer, gardener").
- Headline below, restrained.
- Contact line in muted serif italic.

## Summary

- First paragraph after the header. Drop-cap on the first letter — large
  accent-coloured serif letter, three lines tall, sunken into the prose.
- Optional pull-quote pulled from `experience[0].highlights[0]` (or whatever
  the AI selects in `emphasis.pullQuoteText`). Rendered as a centred block
  in display weight, with hairline rules above and below.

## Experience

- "Paragraph" variant — no bullets. Each role is a short paragraph in body
  type, with the role title and period in display weight as a kicker.

## Sections

- Standard kicker-rule treatment, but the kicker is thicker (5px) and the
  accent is warm clay, not cool.
- Skills as tags but with a soft warm tint, no hard border.

## Anti-patterns

- Never use cool colours (no blues, teals, greens).
- Never use a sans-serif heading font.
- Never use compact density.
- Never use icons or banners.
- Never use a sidebar.
