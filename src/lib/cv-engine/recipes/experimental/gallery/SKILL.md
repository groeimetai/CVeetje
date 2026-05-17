---
id: experimental/gallery
route: experimental
displayName: Gallery
description: Editorial-grid CV with museum-poster restraint plus one fluorescent accent. Bone paper, near-black ink, electric-yellow accent only in the kicker rules + period labels.
source:
  type: original
  modifications: >
    Original recipe written in the open-design SKILL.md format. Palette
    baseline derived from the Brutalist visual direction (neutral page +
    single fluorescent pop).
industryAffinity: [art, museum, curation, photography, music, design, publishing]
layoutShape: editorial-grid
palette:
  ink:
    anchor: { l: 8, c: 0.005, h: 80 }
    range: { l: [4, 16], c: [0, 0.02], h: [60, 100] }
  paper:
    anchor: { l: 97, c: 0.015, h: 85 }
    range: { l: [94, 99], c: [0.005, 0.025], h: [70, 100] }
  accent:
    anchor: { l: 88, c: 0.21, h: 105 }
    range: { l: [78, 92], c: [0.16, 0.25], h: [90, 130] }
  muted:
    anchor: { l: 48, c: 0.008, h: 80 }
    range: { l: [42, 55], c: [0, 0.02], h: [60, 100] }
  surface:
    anchor: { l: 95, c: 0.015, h: 85 }
    range: { l: [92, 98], c: [0.008, 0.025], h: [70, 100] }
allowedFontPairings:
  - space-grotesk-work-sans
  - oswald-source-sans
primitives:
  header: stacked
  section: kicker-rule
  skillList: tags
  experienceItem: bullets
decorators:
  pullQuote: false
  dropCap: false
  marginalia: true
  heroNumeral: false
  posterLine: false
density: comfortable
---

# Gallery — museum-poster CV

Near-monochrome page with a single electric-yellow accent (think
Kunsthalle Basel posters). Editorial-grid shape so the marginalia column
runs the experience periods in fluorescent caps. Body in restrained
Space Grotesk; headings in display weight at moderate scale.

## Container

- A4, 18mm padding, editorial-grid 68/32.

## Main column

- Header in Space Grotesk Medium, 42pt name.
- Sections with kicker-rule: 3-4pt electric-yellow rule above small caps title.

## Margin column

- Hairline left rule.
- Each experience period rendered in fluorescent-yellow caps.

## Anti-patterns

- Never use multiple accent colours.
- Never use cream paper.
- Never use serif typography.
- Never use a photo.
