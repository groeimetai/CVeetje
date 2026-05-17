---
id: experimental/broadcast
route: experimental
displayName: Broadcast
description: Sidebar CV with condensed Oswald headings + Source Sans body. News-broadcast / dispatch energy — accent stripes, all-caps section titles, dense main column.
source:
  type: original
  modifications: >
    Original recipe written in the open-design SKILL.md format. Palette
    baseline derived from the Tech Utility visual direction with a hot-red
    accent reserved for kicker rules and period markers.
industryAffinity: [media, journalism, broadcasting, marketing, sports, communications, music, podcasting]
layoutShape: sidebar
palette:
  ink:
    anchor: { l: 14, c: 0.01, h: 240 }
    range: { l: [8, 22], c: [0, 0.025], h: [220, 270] }
  paper:
    anchor: { l: 98, c: 0.003, h: 80 }
    range: { l: [96, 100], c: [0, 0.012], h: [60, 100] }
  accent:
    anchor: { l: 50, c: 0.2, h: 25 }
    range: { l: [40, 60], c: [0.15, 0.25], h: [15, 45] }
  muted:
    anchor: { l: 48, c: 0.012, h: 240 }
    range: { l: [42, 55], c: [0, 0.025], h: [220, 270] }
  surface:
    anchor: { l: 18, c: 0.01, h: 240 }
    range: { l: [12, 28], c: [0, 0.03], h: [220, 270] }
allowedFontPairings:
  - oswald-source-sans
  - space-grotesk-work-sans
primitives:
  header: stacked
  section: kicker-rule
  skillList: tags
  experienceItem: bullets
  sidebar: inverted
decorators:
  pullQuote: false
  dropCap: false
  marginalia: false
  heroNumeral: false
  posterLine: false
density: compact
---

# Broadcast — newsroom-grade sidebar CV

A 35/65 sidebar CV that reads like a dispatch. The sidebar is dark
near-black (the "broadcast surface") with the contact + skills set in
bone type. Main column is paper-white with Oswald display headings in
all-caps and Source Sans body. The accent is a hot dispatch-red used in
kicker rules and period labels.

## Container

- A4, no outer padding. Sidebar dark, main paper.

## Sidebar (35%, dark)

- Photo if supplied (square).
- Contact stacked in bone Source Sans.
- Skills as tags with red-tinted backgrounds.
- Languages, certifications below.

## Main column (65%, light)

- Name in Oswald, 42pt, all caps.
- Headline below in Source Sans.
- Sections: 3pt red kicker rule above tracked all-caps title.
- Bullets with red dash markers.

## Anti-patterns

- Never use cream paper in the main column.
- Never use serif type.
- Never use multiple accent colours.
