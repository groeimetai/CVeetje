---
id: experimental/manifesto
route: experimental
displayName: Manifesto
description: Poster-shape CV. Name fills the upper half, poster-line italic statement below, dense 2-column dark credits below the fold. MSCHF / activist-poster energy.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/poster-hero
  modifications: >
    Adapted the marketing-poster format into a CV poster: name at hero scale
    on bone, italic poster-line beneath as the manifesto sentence, and a dark
    body block below carrying experience/education/skills/languages as
    credits in two columns. Strict typography, no photos, accent as
    riso-style hot red.
industryAffinity: [design, art, activism, music, writing, photography, creative, communications]
layoutShape: poster
palette:
  ink:
    anchor: { l: 10, c: 0.01, h: 30 }
    range: { l: [5, 18], c: [0, 0.03], h: [10, 60] }
  paper:
    anchor: { l: 96, c: 0.018, h: 85 }
    range: { l: [93, 99], c: [0.005, 0.03], h: [70, 100] }
  accent:
    anchor: { l: 55, c: 0.22, h: 25 }
    range: { l: [45, 65], c: [0.16, 0.28], h: [15, 50] }
  muted:
    anchor: { l: 50, c: 0.02, h: 30 }
    range: { l: [42, 58], c: [0.01, 0.04], h: [15, 60] }
  surface:
    anchor: { l: 93, c: 0.022, h: 85 }
    range: { l: [89, 96], c: [0.012, 0.035], h: [70, 100] }
allowedFontPairings:
  - oswald-source-sans
  - space-grotesk-work-sans
primitives:
  header: hero
  section: clean
  skillList: comma-prose
  experienceItem: bullets
decorators:
  pullQuote: false
  dropCap: false
  marginalia: false
  heroNumeral: false
  posterLine: true
density: compact
---

# Manifesto — poster CV

A CV as a protest poster. The candidate's name fills the upper page at
98pt+ in Oswald all-caps. Below the name: a single italic statement —
the poster line, supplied by the AI's emphasis or the candidate's
headline. Beneath: a dark credits block, dense 2-column small-print
running experience/education/skills/contact as type-only credits.

## Container

- A4, no outer padding. The hero is one band, the credits another.
- Hero band 135mm tall (≈45% of A4), credits fill the rest.

## Hero (top half)

- Small caps tagline at top in accent.
- Name in Oswald, 96pt, all caps. Negative letter-spacing for poster
  density.
- Italic poster-line below the name in display weight.
- A 4pt accent rule at the bottom edge of the hero.

## Credits (lower half)

- Dark near-black background, bone-on-black text.
- 2-column layout, 8.5pt body.
- Each section is a credits block: small accent title rule + a stack of
  one-line rows (period · role · where).
- The summary is italic, at the very top of the credits area.

## Anti-patterns

- Never use photos or icons.
- Never use cool blues.
- Never use a sidebar.
- Never use a serif body font (only Oswald or Space Grotesk are allowed).
