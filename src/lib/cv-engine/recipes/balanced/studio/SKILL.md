---
id: balanced/studio
route: balanced
displayName: Studio
description: Magazine-clean single-column resume. Restrained accent typography, small-caps section kickers, classic A4 proportions.
source:
  type: adapted
  upstream: nexu-io/open-design/skills/resume-modern
  modifications: >
    Simplified to single-column-only (the upstream allowed an optional 2-column variant).
    Translated the visual brief from Chinese to English for use in our AI prompt stack.
    Mapped to the cv-engine DesignSpec: OKLch palette with balanced-level override ranges,
    Google Font pairings restricted to three safe choices, single-column layoutShape,
    kicker-rule section variant matching the "small caps with accent rule above" instruction.
industryAffinity:
  - tech
  - software
  - engineering
  - finance
  - consulting
  - general
layoutShape: single-column
palette:
  ink:
    anchor: { l: 15, c: 0.01, h: 250 }
    range: { l: [10, 25], c: [0, 0.03], h: [200, 300] }
  paper:
    anchor: { l: 98, c: 0.005, h: 80 }
    range: { l: [95, 100], c: [0, 0.02], h: [60, 100] }
  accent:
    anchor: { l: 45, c: 0.12, h: 250 }
    range: { l: [30, 55], c: [0.05, 0.18], h: [150, 280] }
  muted:
    anchor: { l: 50, c: 0.01, h: 250 }
    range: { l: [40, 60], c: [0, 0.03], h: [200, 300] }
  surface:
    anchor: { l: 96, c: 0.005, h: 80 }
    range: { l: [92, 100], c: [0, 0.02], h: [60, 100] }
allowedFontPairings:
  - inter-inter
  - playfair-inter
  - lato-lato
primitives:
  header: stacked
  section: kicker-rule
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

# Studio — single-column magazine resume

A4 single-page layout, designed to read on paper and print to PDF without
losing fidelity. Restrained black-and-white-and-grey base with one accent
(default deep blue, AI may rotate to forest green or navy within range).

## Container

- Width ≈ 210mm, vertical rhythm ≈ 297mm per page.
- Page margins 16–20mm. No full-bleed colour bands.
- One column only. No sidebar.

## Header

- Candidate's name set large (display weight on the heading-pair).
- Contact line directly below: email · phone · city · GitHub · LinkedIn.
  Separators are thin vertical hairlines or middle dots.
- Optional name-tagline (Monocle-style 2–6 words) below the contact line
  when the candidate's positioning warrants it.

## Sections

- Section title in small caps with a short accent rule (≈ 32px wide,
  1.5px tall) immediately above it. The accent rule is the place where
  the accent colour shows up in the layout.
- One blank line of space between sections; never an explicit divider.

## Experience items

- One line per role: company · role · period, with the period right-aligned.
- Below: 1–3 bullets, each starting with a verb. No paragraph blobs.
- Where the candidate has measurable outcomes ("grew DAU by 40%"), the
  accent colour highlights the numeric clause via accent-keyword matching.

## Skills + extras

- Skills as compact pills/tags in the accent's muted tint.
- Languages, certifications, awards: same compact treatment, smaller scale.

## Print fidelity

- All saturated colours flagged `print-color-adjust: exact`.
- No transforms, clip-path, or hover states. Pure flow layout.
- Google Fonts loaded via `<link>` in the rendered HTML.

## Voice & brand

The CV should read like a one-page editorial profile: spare, confident,
content-first. The accent is a *signature*, not decoration. The reader
should be able to scan the page in 5 seconds and find the role, then
linger on the bullets. No icons unless restraint demands them (typically
none in this recipe).

## Anti-patterns

- Never use saturated reds, neons, or two-colour gradients.
- Never use full-bleed coloured headers.
- Never use boxed/carded section treatment (use `kicker-rule` only).
- Never add background patterns or decorative numerals.
- Never use icons in the contact row.
