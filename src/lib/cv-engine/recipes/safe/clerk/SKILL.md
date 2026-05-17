---
id: safe/clerk
route: safe
displayName: Clerk
description: Serif-led conservative single-column resume. Libre Baskerville headings, Source Sans body, navy ink on bone paper, Swiss-poster restraint.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/digits-fintech-swiss-template
  modifications: >
    Re-purposed the Swiss-poster digits fintech aesthetic for a CV: kept the
    serif heading + sans body pair and the muted navy palette. Dropped the
    grid-paper texture and large numerals. Section variant uses 'clean' with
    a hairline rule under each title.
industryAffinity: [finance, banking, legal, audit, government, academia, healthcare, consulting]
layoutShape: single-column
palette:
  ink:
    anchor: { l: 18, c: 0.04, h: 255 }
    range: { l: [12, 25], c: [0.02, 0.06], h: [245, 265] }
  paper:
    anchor: { l: 97, c: 0.015, h: 85 }
    range: { l: [95, 99], c: [0.005, 0.025], h: [75, 95] }
  accent:
    anchor: { l: 35, c: 0.08, h: 250 }
    range: { l: [25, 45], c: [0.04, 0.12], h: [230, 270] }
  muted:
    anchor: { l: 50, c: 0.03, h: 255 }
    range: { l: [42, 58], c: [0.015, 0.04], h: [245, 270] }
  surface:
    anchor: { l: 95, c: 0.018, h: 85 }
    range: { l: [92, 98], c: [0.005, 0.03], h: [75, 100] }
allowedFontPairings:
  - libre-baskerville-source-sans
  - inter-inter
primitives:
  header: stacked
  section: clean
  skillList: comma-prose
  experienceItem: bullets
decorators:
  pullQuote: false
  dropCap: false
  marginalia: false
  heroNumeral: false
  posterLine: false
density: comfortable
---

# Clerk — serif-led conservative CV

A CV that signals seniority through restraint. Libre Baskerville headings,
Source Sans body, near-navy ink on a slightly warm bone paper. Reads like
a printed letter of recommendation, not a marketing brochure.

## Container

- A4 single column, 18mm margins.
- Bone paper (warm white) — not pure white.

## Header

- Name in Libre Baskerville, 36pt, weight 700.
- Headline in Source Sans, 12.5pt, regular weight, slight contrast.
- Contact line muted, middle-dot separators.

## Sections

- 'Clean' variant: small-caps title with a 0.5px hairline rule beneath.
- No kicker rule.

## Experience

- Bullets, accent-blue dash markers.
- Period in small caps with tabular figures.

## Skills

- Comma-prose, not pills. Reads as a sentence.

## Anti-patterns

- Never use bright accents (no oranges, no neons).
- Never use cream paper warmer than h=95.
- Never use a kicker-rule section variant.
- Never use icons.
- Never use a sidebar.
