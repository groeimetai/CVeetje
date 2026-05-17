---
id: balanced/press
route: balanced
displayName: Press
description: Editorial press-room single-column resume in deep navy + cream + clay terracotta. Bordeaux-magazine refinement adapted for a CV.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/editorial-burgundy-principles-template
  modifications: >
    Re-coloured the burgundy/blush/gold deck palette into the CVeetje "editorial-paper"
    brand: deep navy ink, cream paper, clay-terracotta accent. Compressed the
    three-slide deck format into a single-page CV with accent-left summary,
    serif headings + sans body, hairline accent rule, and small-caps section
    titles.
industryAffinity: [marketing, communications, publishing, education, ngo, design, hospitality, consulting]
layoutShape: single-column
palette:
  ink:
    anchor: { l: 22, c: 0.04, h: 255 }
    range: { l: [15, 30], c: [0.02, 0.06], h: [245, 270] }
  paper:
    anchor: { l: 96, c: 0.025, h: 85 }
    range: { l: [93, 98], c: [0.015, 0.04], h: [75, 95] }
  accent:
    anchor: { l: 48, c: 0.16, h: 40 }
    range: { l: [40, 55], c: [0.12, 0.2], h: [25, 55] }
  muted:
    anchor: { l: 46, c: 0.025, h: 255 }
    range: { l: [40, 55], c: [0.015, 0.04], h: [240, 270] }
  surface:
    anchor: { l: 94, c: 0.03, h: 85 }
    range: { l: [90, 97], c: [0.02, 0.045], h: [70, 100] }
allowedFontPairings:
  - playfair-inter
  - lato-lato
primitives:
  header: stacked
  section: accent-left
  skillList: tags
  experienceItem: bullets
decorators:
  pullQuote: false
  dropCap: false
  marginalia: false
  heroNumeral: false
  posterLine: false
density: comfortable
---

# Press — editorial press-room CV

A single-page CV in the spirit of an editorial press kit. The signature is
the cream-against-navy palette with a deliberately warm clay accent. The
type pair is serif headings, sans body — readability first, character
through restraint.

## Container

- A4 single column, cream paper, 18mm margins.
- Soft surface tone behind the page (not white).

## Header

- Name in Playfair Display, 40pt, weight 700 — display moment.
- Headline below in sans, restrained.
- Optional Monocle-style tagline in clay accent, small caps, tracked.

## Sections

- "Accent-left" section variant: a thin vertical clay rule down the left
  edge of each section, title indented from that rule.
- Title in small caps, tracked +0.18em, navy ink.

## Summary

- Renders with the standard accent-left treatment: 2px clay rule, summary
  text indented. Reads as a lead paragraph.

## Experience

- Role title in sans bold, company in serif italic, period right-aligned in
  small caps with tabular figures.
- Bullets with clay-accent dash markers.

## Anti-patterns

- Never use saturated reds or hot pinks.
- Never use icons in the contact row.
- Never use a sidebar or banner header.
- Never use white as the page background — always cream.
- Never use a kicker-rule section variant (use accent-left only).
