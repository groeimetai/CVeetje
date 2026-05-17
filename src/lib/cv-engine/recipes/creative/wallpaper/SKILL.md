---
id: creative/wallpaper
route: creative
displayName: Wallpaper
description: Editorial-grid CV inspired by modernist magazine spreads. Asymmetric 68/32 layout with a marginalia column carrying experience periods + companies.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/article-magazine
  modifications: >
    Adapted the article-magazine spread aesthetic into a CV: asymmetric grid
    with a marginalia column, modernist palette, Space Grotesk + Work Sans
    typography. Pull-quote enabled after the experience section.
industryAffinity: [design, creative, architecture, fashion, photography, marketing, tech-design]
layoutShape: editorial-grid
palette:
  ink:
    anchor: { l: 14, c: 0.005, h: 240 }
    range: { l: [8, 22], c: [0, 0.02], h: [220, 270] }
  paper:
    anchor: { l: 98, c: 0.003, h: 80 }
    range: { l: [96, 100], c: [0, 0.012], h: [60, 100] }
  accent:
    anchor: { l: 50, c: 0.18, h: 25 }
    range: { l: [40, 60], c: [0.12, 0.22], h: [15, 40] }
  muted:
    anchor: { l: 46, c: 0.008, h: 240 }
    range: { l: [40, 55], c: [0, 0.02], h: [220, 270] }
  surface:
    anchor: { l: 96, c: 0.008, h: 240 }
    range: { l: [93, 99], c: [0, 0.018], h: [220, 270] }
allowedFontPairings:
  - space-grotesk-work-sans
  - dm-serif-dm-sans
primitives:
  header: stacked
  section: kicker-rule
  skillList: tags
  experienceItem: paragraph
decorators:
  pullQuote: true
  dropCap: false
  marginalia: true
  heroNumeral: false
  posterLine: false
density: comfortable
---

# Wallpaper — modernist editorial grid

A CV that reads as a magazine spread. Asymmetric grid, sharp typography in
Space Grotesk, marginal callouts running down a thin right rail. Accent is
a confident clay-orange that wins exactly twice: in the kicker rule above
each section title and in the period labels of the marginalia.

## Container

- A4, 18mm padding, 14mm gap between main and margin columns.
- 68/32 grid (main / margin).

## Main column

- Editorial header: name in Space Grotesk 44pt, headline below, tagline +
  contact line muted.
- Hairline under the header.
- Summary, sections, pull-quote (after experience).

## Margin column

- A vertical hairline on the left.
- One callout per experience entry: period in accent small caps, company
  + location in italic body.
- Empty band at the top to align below the header.

## Anti-patterns

- Never centre anything.
- Never use cream paper — wallpaper is bright-white.
- Never use a sidebar shape.
- Never use saturated reds (orange-clay only).
