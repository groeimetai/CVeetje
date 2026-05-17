---
id: balanced/grid
route: balanced
displayName: Grid
description: Sidebar resume with DM Serif headings + DM Sans body. Structured 35/65 split, light accent-tinted sidebar, kicker labels.
source:
  type: original
  modifications: >
    Original recipe written in the open-design SKILL.md format. Palette baseline
    derived from the Tech Utility visual direction (clean cool palette).
industryAffinity: [tech, software, data, product, design-engineering, fintech, saas, consulting]
layoutShape: sidebar
palette:
  ink:
    anchor: { l: 18, c: 0.015, h: 250 }
    range: { l: [12, 25], c: [0.005, 0.03], h: [230, 270] }
  paper:
    anchor: { l: 99, c: 0.002, h: 80 }
    range: { l: [97, 100], c: [0, 0.01], h: [60, 100] }
  accent:
    anchor: { l: 50, c: 0.13, h: 250 }
    range: { l: [40, 58], c: [0.08, 0.18], h: [220, 270] }
  muted:
    anchor: { l: 50, c: 0.01, h: 250 }
    range: { l: [42, 56], c: [0, 0.02], h: [230, 270] }
  surface:
    anchor: { l: 95, c: 0.01, h: 250 }
    range: { l: [92, 98], c: [0.005, 0.025], h: [220, 270] }
allowedFontPairings:
  - dm-serif-dm-sans
  - inter-inter
primitives:
  header: stacked
  section: kicker-rule
  skillList: tags
  experienceItem: bullets
  sidebar: solid
decorators:
  pullQuote: false
  dropCap: false
  marginalia: false
  heroNumeral: false
  posterLine: false
density: comfortable
---

# Grid — structured sidebar CV

A two-column CV with a quiet accent-tinted sidebar carrying contact, skills,
languages, and certifications. The main column tells the story: name +
headline + summary + experience + education. DM Serif Display gives the
heading set a slight Vignelli quality; DM Sans handles body weight and
captions.

## Container

- A4 page, no outer padding (sidebar and main carry their own).
- Sidebar 35% width, accent-tinted background.
- Main 65% width, white paper background.

## Sidebar (35%)

- Photo at top if supplied (square, 4pt rounded corners).
- Contact stacked under the photo.
- Skills as pill tags.
- Languages as a list with level captions.
- Certifications as a bulleted list.

## Main column (65%)

- Name in DM Serif Display, 38pt — display moment, anchored by the column.
- Headline below in DM Sans.
- Summary with a hairline rule before it.
- Experience: bullets with accent dash markers.
- Education in the same shape as experience but compact.

## Anti-patterns

- Never use cream paper (we keep paper near-white in this recipe).
- Never use serif body type.
- Never use the kicker-rule section variant — sidebar shape uses a
  hairline below the section title instead.
- Never add icons in the contact block — text only.
