---
id: creative/gentlewoman
route: creative
displayName: Gentlewoman
description: Literary single-column CV. Libre Baskerville hero serif, italic accents, drop-cap on summary, narrow gutter, pull-quote enabled. Sloan-publishing feel.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/after-hours-editorial-template
  modifications: >
    Translated the after-hours editorial deck into a single-page CV. Kept the
    italic-led hierarchy, the warm-paper palette, and the literary serif pair.
    Removed the deck navigation. Added drop-cap + pull-quote decorators and a
    Monocle-style name-tagline.
industryAffinity: [writing, publishing, editorial, communications, design, photography, academia]
layoutShape: single-column
palette:
  ink:
    anchor: { l: 16, c: 0.025, h: 30 }
    range: { l: [10, 22], c: [0.01, 0.04], h: [10, 50] }
  paper:
    anchor: { l: 94, c: 0.03, h: 70 }
    range: { l: [90, 97], c: [0.02, 0.045], h: [55, 90] }
  accent:
    anchor: { l: 32, c: 0.1, h: 15 }
    range: { l: [22, 42], c: [0.06, 0.14], h: [0, 30] }
  muted:
    anchor: { l: 48, c: 0.03, h: 30 }
    range: { l: [40, 56], c: [0.015, 0.045], h: [10, 50] }
  surface:
    anchor: { l: 91, c: 0.035, h: 70 }
    range: { l: [87, 95], c: [0.02, 0.05], h: [55, 95] }
allowedFontPairings:
  - libre-baskerville-source-sans
  - playfair-inter
primitives:
  header: stacked
  section: kicker-rule
  skillList: comma-prose
  experienceItem: paragraph
decorators:
  pullQuote: true
  dropCap: true
  marginalia: false
  heroNumeral: false
  posterLine: false
density: airy
---

# Gentlewoman — literary single-page CV

A CV that reads like a profile piece in a small literary magazine. Hero
serif, italic kickers, generous leading. The accent is oxblood, not red.
The body is a paragraph, not a list. The drop-cap is non-negotiable.

## Container

- A4 single column, 22mm margins.
- Warm-paper background (slightly more saturated than kinfolk).

## Header

- Name in Libre Baskerville, 44pt, weight 700.
- Italic tagline under the name, small caps oxblood.
- Headline in Source Sans, restrained.

## Summary

- Drop-cap on first letter. Oxblood, three lines tall, serif.
- Body in 12pt Source Sans, line-height 1.65.

## Sections

- Kicker-rule variant — oxblood rule above small-caps title.
- Pull-quote inserted after the experience section, centred, italic, with
  hairline rules above and below.

## Experience

- Paragraph variant — no bullets. Each role is a short paragraph. The
  role-line uses italic for the company name and small caps for the period.

## Skills

- Comma-prose, not pills — fits the literary register.

## Anti-patterns

- Never use cool colours.
- Never use a sans-serif heading font.
- Never use bulleted experience items.
- Never use a sidebar.
- Never use pure white paper.
