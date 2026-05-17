---
id: safe/monolith
route: safe
displayName: Monolith
description: Quiet, screen-first single-column resume — heavyweight Inter, near-black on bone, one cool accent. ATS-bulletproof.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/apple-hig
  modifications: >
    Mapped Apple HIG meta-catalog into a single deterministic recipe: Inter as the
    monoglot font, near-black ink, very tight accent range (cool blues only).
    No icons, no banners, no expressive treatments. Optimised for ATS scanners
    plus human reviewers who prefer restraint.
industryAffinity: [finance, banking, consulting, legal, government, healthcare, academia, general]
layoutShape: single-column
palette:
  ink:
    anchor: { l: 12, c: 0.005, h: 250 }
    range: { l: [8, 18], c: [0, 0.02], h: [220, 280] }
  paper:
    anchor: { l: 99, c: 0.002, h: 80 }
    range: { l: [97, 100], c: [0, 0.01], h: [60, 100] }
  accent:
    anchor: { l: 35, c: 0.08, h: 240 }
    range: { l: [25, 45], c: [0.04, 0.12], h: [220, 260] }
  muted:
    anchor: { l: 48, c: 0.005, h: 250 }
    range: { l: [42, 55], c: [0, 0.015], h: [220, 280] }
  surface:
    anchor: { l: 97, c: 0.003, h: 80 }
    range: { l: [95, 100], c: [0, 0.01], h: [60, 100] }
allowedFontPairings:
  - inter-inter
  - lato-lato
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
density: compact
---

# Monolith — silent, scannable

The least-noisy recipe in the cv-engine. Designed for environments where the
CV will be scanned by both a parser and a person who has read 200 of them
today. The page is allowed to be quiet. The accent is a single hairline.

## Container

- A4 single column, 14mm margins.
- Compact density throughout. No oversized typography.

## Header

- Name set at 28pt — confident but not declarative.
- Headline directly under (target role), one weight lighter.
- Contact line in a single row with middle-dot separators.

## Sections

- No accent kicker rule. Title in 9pt uppercase tracked +0.18em.
- A 0.5px hairline under each section title, full-width.
- Section gaps tight.

## Experience

- Role title bold, company in muted weight, period right-aligned in tabular figures.
- 1–3 bullets per role. Verbs first.

## Skills

- Comma-separated prose, not pills. Reads as a paragraph. ATS parsers prefer this.

## Anti-patterns

- Never a sidebar.
- Never accent colors outside the cool-blue band.
- Never icons.
- Never decorative numerals or background patterns.
- Never pull quotes / drop caps / marginalia.
