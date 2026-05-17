/**
 * Primitive variant CSS. Each primitive (header, section, skill-list,
 * experience-item, sidebar) has multiple variants; this module emits
 * exactly the CSS the recipe's chosen variants need — no dead CSS.
 *
 * Phase 0 implements the variants used by `balanced/studio`:
 *   - header: 'stacked'
 *   - section: 'kicker-rule'
 *   - skillList: 'tags'
 *   - experienceItem: 'bullets'
 * Phase 1 fills in the other 16 variants.
 */

import type { ResolvedSpec } from '../resolve';
import type {
  ExperienceItemVariant,
  HeaderVariant,
  SectionVariant,
  SidebarVariant,
  SkillListVariant,
} from '../../spec';

// ============ Header variants ============

function headerCSS(v: HeaderVariant): string {
  switch (v) {
    case 'stacked':
      return `
.cv-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16pt;
  margin-bottom: var(--density-section-gap);
  padding-bottom: 14pt;
  border-bottom: 1px solid color-mix(in oklch, var(--color-muted) 35%, transparent);
}
.cv-header .cv-header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.cv-header .cv-header-photo {
  flex: 0 0 auto;
}
.cv-header .cv-header-photo img {
  width: 92pt;
  height: 92pt;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid color-mix(in oklch, var(--color-accent) 60%, var(--color-paper));
}
.cv-header .cv-name {
  font-family: var(--font-heading);
  font-size: 40pt;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--color-ink);
}
.cv-header .cv-headline {
  font-size: 13pt;
  font-weight: 500;
  color: var(--color-ink);
  margin-top: 8pt;
  letter-spacing: -0.005em;
}
.cv-header .cv-name-tagline {
  font-size: 8.5pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-accent);
  margin-top: 12pt;
}
.cv-header .cv-contact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  font-size: 9.5pt;
  color: var(--color-muted);
  margin-top: 14pt;
  letter-spacing: 0.01em;
}
.cv-header .cv-contact > span + span::before {
  content: " · ";
  margin: 0 7pt;
  color: var(--color-muted);
  opacity: 0.55;
}
`;
    case 'banded':
    case 'split':
    case 'hero':
      // Phase 1 will implement these. For now, fall back to stacked.
      return headerCSS('stacked');
  }
}

// ============ Section variants ============

function sectionCSS(v: SectionVariant): string {
  switch (v) {
    case 'kicker-rule':
      return `
.cv-section {
  margin-bottom: var(--density-section-gap);
}
.cv-section .cv-section-kicker {
  width: 36px;
  height: 3px;
  background: var(--color-accent);
  margin-bottom: 9pt;
}
.cv-section .cv-section-title {
  font-family: var(--font-heading);
  font-size: 10.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-ink);
  margin-bottom: 14pt;
}
.cv-section .cv-section-body {
  display: flex;
  flex-direction: column;
  gap: 16pt;
}
`;
    case 'clean':
      return `
.cv-section {
  margin-bottom: var(--density-section-gap);
}
.cv-section .cv-section-kicker {
  display: none;
}
.cv-section .cv-section-title {
  font-family: var(--font-heading);
  font-size: 9pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-ink);
  padding-bottom: 4pt;
  margin-bottom: 12pt;
  border-bottom: 0.5px solid color-mix(in oklch, var(--color-muted) 40%, transparent);
}
.cv-section .cv-section-body {
  display: flex;
  flex-direction: column;
  gap: 14pt;
}
`;
    case 'accent-left':
      return `
.cv-section {
  margin-bottom: var(--density-section-gap);
  padding-left: 16pt;
  border-left: 2px solid var(--color-accent);
}
.cv-section .cv-section-kicker {
  display: none;
}
.cv-section .cv-section-title {
  font-family: var(--font-heading);
  font-size: 10pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--color-ink);
  margin-bottom: 12pt;
}
.cv-section .cv-section-body {
  display: flex;
  flex-direction: column;
  gap: 16pt;
}
`;
    case 'boxed':
    case 'numbered':
      return sectionCSS('kicker-rule');
  }
}

// ============ Skill list variants ============

function skillListCSS(v: SkillListVariant): string {
  switch (v) {
    case 'tags':
      return `
.cv-skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6pt;
}
.cv-skill-list .cv-skill {
  padding: 3.5pt 10pt;
  background: var(--color-surface);
  border: 1px solid color-mix(in oklch, var(--color-muted) 30%, transparent);
  border-radius: 100pt;
  font-size: 9pt;
  font-weight: 500;
  color: var(--color-ink);
  letter-spacing: 0.005em;
}
.cv-skill-list .cv-skill[data-tone="accent"] {
  background: color-mix(in oklch, var(--color-accent) 14%, var(--color-paper));
  border-color: color-mix(in oklch, var(--color-accent) 35%, transparent);
  color: var(--color-accent);
  font-weight: 600;
}
`;
    case 'comma-prose':
      return `
.cv-skill-list {
  display: block;
  font-size: 10pt;
  line-height: var(--body-line-height);
  color: var(--color-ink);
}
.cv-skill-list .cv-skill {
  display: inline;
  background: transparent;
  border: 0;
  padding: 0;
  font-size: inherit;
}
.cv-skill-list .cv-skill[data-tone="accent"] {
  color: var(--color-accent);
  font-weight: 600;
}
.cv-skill-list .cv-skill + .cv-skill::before {
  content: ", ";
}
`;
    case 'list':
    case 'bars':
      return skillListCSS('tags');
  }
}

// ============ Experience item variants ============

function experienceItemCSS(v: ExperienceItemVariant): string {
  switch (v) {
    case 'paragraph':
      return `
.cv-experience-item {
  display: flex;
  flex-direction: column;
  gap: 5pt;
  break-inside: avoid;
}
.cv-experience-item .cv-role-line {
  display: flex;
  align-items: baseline;
  gap: 10pt;
  font-size: 11pt;
  margin-bottom: 3pt;
}
.cv-experience-item .cv-role-line .cv-role-title {
  font-weight: 700;
  color: var(--color-ink);
}
.cv-experience-item .cv-role-line .cv-role-meta {
  color: var(--color-muted);
  font-style: italic;
}
.cv-experience-item .cv-role-line .cv-role-period {
  margin-left: auto;
  font-size: 9pt;
  color: var(--color-muted);
  font-variant: small-caps;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
}
.cv-experience-item .cv-experience-desc {
  font-size: 10.5pt;
  color: var(--color-ink);
  line-height: var(--body-line-height);
  margin-bottom: 0;
}
.cv-experience-item .cv-highlights {
  list-style: none;
  display: none; /* paragraph variant: bullets are folded into the prose */
}
.cv-experience-item mark.accent-hit {
  background: transparent;
  color: var(--color-accent);
  font-weight: 600;
}
`;
    case 'bullets':
      return `
.cv-experience-item {
  display: flex;
  flex-direction: column;
  gap: 5pt;
  break-inside: avoid;
}
.cv-experience-item .cv-role-line {
  display: flex;
  align-items: baseline;
  gap: 10pt;
  font-size: 11pt;
  margin-bottom: 1pt;
}
.cv-experience-item .cv-role-line .cv-role-title {
  font-weight: 700;
  color: var(--color-ink);
  letter-spacing: -0.005em;
}
.cv-experience-item .cv-role-line .cv-role-meta {
  color: var(--color-muted);
  font-weight: 500;
}
.cv-experience-item .cv-role-line .cv-role-period {
  margin-left: auto;
  font-size: 9pt;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.cv-experience-item .cv-experience-desc {
  font-size: 10pt;
  color: var(--color-ink);
  line-height: var(--body-line-height);
  margin-bottom: 2pt;
}
.cv-experience-item .cv-highlights {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 3pt;
  font-size: 10pt;
  color: var(--color-ink);
  line-height: var(--body-line-height);
}
.cv-experience-item .cv-highlights li {
  position: relative;
  padding-left: 14pt;
}
.cv-experience-item .cv-highlights li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 7pt;
  width: 7pt;
  height: 1.5px;
  background: var(--color-accent);
}
.cv-experience-item mark.accent-hit {
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
  letter-spacing: 0.005em;
}
`;
    case 'paragraph':
    case 'kicker-period':
      return experienceItemCSS('bullets');
  }
}

// ============ Sidebar shape + variants ============
//
// Emitted only when DesignSpec.layoutShape === 'sidebar'. Includes both the
// shape skeleton (grid layout, no page padding) and the variant-specific
// sidebar styling.

function sidebarShapeBaseCSS(): string {
  return `
.cv-shape-sidebar {
  display: grid;
  grid-template-columns: 35% 1fr;
  padding: 0;
}
.cv-shape-sidebar .cv-sidebar {
  padding: 18mm 12mm;
}
.cv-shape-sidebar .cv-main {
  padding: 18mm 16mm 18mm 14mm;
}

.cv-shape-sidebar .cv-main-header {
  margin-bottom: var(--density-section-gap);
  padding-bottom: 12pt;
  border-bottom: 1px solid color-mix(in oklch, var(--color-muted) 35%, transparent);
}
.cv-shape-sidebar .cv-main-header .cv-name {
  font-family: var(--font-heading);
  font-size: 38pt;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--color-ink);
}
.cv-shape-sidebar .cv-main-header .cv-headline {
  font-size: 13pt;
  font-weight: 500;
  color: var(--color-ink);
  margin-top: 6pt;
}
.cv-shape-sidebar .cv-main-header .cv-name-tagline {
  font-size: 8.5pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-accent);
  margin-top: 10pt;
}

/* Sidebar internal layout */
.cv-shape-sidebar .cv-sidebar-section {
  margin-bottom: 18pt;
}
.cv-shape-sidebar .cv-sidebar-title {
  font-family: var(--font-heading);
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--color-ink);
  margin-bottom: 8pt;
  padding-bottom: 4pt;
  border-bottom: 0.5px solid color-mix(in oklch, var(--color-muted) 35%, transparent);
}
.cv-shape-sidebar .cv-contact-block,
.cv-shape-sidebar .cv-lang-list,
.cv-shape-sidebar .cv-cert-list {
  display: flex;
  flex-direction: column;
  gap: 3pt;
  font-size: 9.5pt;
  color: var(--color-ink);
  line-height: 1.4;
}
.cv-shape-sidebar .cv-lang-list li .cv-lang-level {
  color: var(--color-muted);
  font-size: 8.5pt;
  margin-left: 4pt;
}
.cv-shape-sidebar .cv-sidebar-photo {
  margin-bottom: 16pt;
}
.cv-shape-sidebar .cv-sidebar-photo img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 4pt;
}
`;
}

function sidebarVariantCSS(v: SidebarVariant | undefined): string {
  if (!v) return '';
  switch (v) {
    case 'solid':
      return `
.cv-shape-sidebar[data-sidebar-variant="solid"] .cv-sidebar {
  background: color-mix(in oklch, var(--color-accent) 8%, var(--color-surface));
}
.cv-shape-sidebar[data-sidebar-variant="solid"] .cv-sidebar-title {
  color: var(--color-ink);
}
`;
    case 'transparent':
      return `
.cv-shape-sidebar[data-sidebar-variant="transparent"] .cv-sidebar {
  background: transparent;
  border-right: 1px solid color-mix(in oklch, var(--color-muted) 30%, transparent);
}
`;
    case 'inverted':
      return `
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-sidebar {
  background: var(--color-surface);
  color: var(--color-paper);
}
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-sidebar-title {
  color: var(--color-paper);
  border-bottom-color: color-mix(in oklch, var(--color-accent) 60%, transparent);
}
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-contact-block,
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-lang-list,
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-cert-list {
  color: var(--color-paper);
}
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-lang-list li .cv-lang-level {
  color: color-mix(in oklch, var(--color-paper) 65%, var(--color-ink));
}
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-skill-list .cv-skill {
  background: color-mix(in oklch, var(--color-paper) 12%, transparent);
  border-color: color-mix(in oklch, var(--color-paper) 25%, transparent);
  color: var(--color-paper);
}
.cv-shape-sidebar[data-sidebar-variant="inverted"] .cv-skill-list .cv-skill[data-tone="accent"] {
  background: color-mix(in oklch, var(--color-accent) 30%, transparent);
  border-color: var(--color-accent);
  color: var(--color-paper);
  font-weight: 700;
}
`;
    case 'gradient':
    case 'photo-hero':
      // Phase 2; fall through to solid.
      return sidebarVariantCSS('solid');
  }
}

function sidebarCSS(v: SidebarVariant | undefined): string {
  // Only emit sidebar CSS when the recipe actually has a sidebar primitive.
  if (!v) return '';
  return sidebarShapeBaseCSS() + sidebarVariantCSS(v);
}

// ============ Editorial-grid shape ============

function editorialGridShapeCSS(): string {
  return `
.cv-shape-editorial-grid {
  display: grid;
  grid-template-columns: 1fr 32%;
  gap: 14mm;
  padding: 18mm;
}
.cv-shape-editorial-grid .cv-editorial-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 18pt;
  margin-bottom: var(--density-section-gap);
  padding-bottom: 12pt;
  border-bottom: 1px solid color-mix(in oklch, var(--color-muted) 35%, transparent);
}
.cv-shape-editorial-grid .cv-editorial-header .cv-editorial-header-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.cv-shape-editorial-grid .cv-editorial-header .cv-editorial-photo {
  flex: 0 0 auto;
}
.cv-shape-editorial-grid .cv-editorial-header .cv-editorial-photo img {
  width: 96pt;
  height: 96pt;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid color-mix(in oklch, var(--color-accent) 70%, var(--color-paper));
}
.cv-shape-editorial-grid .cv-editorial-header .cv-name {
  font-family: var(--font-heading);
  font-size: 44pt;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.02;
  color: var(--color-ink);
}
.cv-shape-editorial-grid .cv-editorial-header .cv-headline {
  font-size: 13pt;
  font-weight: 500;
  color: var(--color-ink);
  margin-top: 7pt;
}
.cv-shape-editorial-grid .cv-editorial-header .cv-name-tagline {
  font-size: 8.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--color-accent);
  margin-top: 10pt;
}
.cv-shape-editorial-grid .cv-editorial-header .cv-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 12pt;
  font-size: 9pt;
  color: var(--color-muted);
}
.cv-shape-editorial-grid .cv-editorial-header .cv-contact > span + span::before {
  content: " · ";
  margin: 0 6pt;
  opacity: 0.55;
}

/* Margin column */
.cv-shape-editorial-grid .cv-margin {
  border-left: 1px solid color-mix(in oklch, var(--color-muted) 30%, transparent);
  padding-left: 10pt;
  padding-top: 80pt; /* push down past the header */
}
.cv-shape-editorial-grid .cv-margin-list {
  display: flex;
  flex-direction: column;
  gap: 22pt;
}
.cv-shape-editorial-grid .cv-margin-note .cv-margin-period {
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-accent);
  margin-bottom: 4pt;
}
.cv-shape-editorial-grid .cv-margin-note .cv-margin-where {
  font-size: 9.5pt;
  font-style: italic;
  color: var(--color-ink);
  line-height: 1.4;
}
`;
}

// ============ Poster shape ============

function posterShapeCSS(): string {
  return `
.cv-shape-poster {
  display: flex;
  flex-direction: column;
  padding: 0;
}
.cv-shape-poster .cv-poster-hero {
  padding: 22mm 14mm 14mm;
  background: var(--color-paper);
  min-height: 135mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}
.cv-shape-poster .cv-poster-photo {
  position: absolute;
  top: 14mm;
  right: 14mm;
}
.cv-shape-poster .cv-poster-photo img {
  width: 70pt;
  height: 70pt;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid var(--color-accent);
}
.cv-shape-poster .cv-poster-hero::after {
  content: "";
  position: absolute;
  left: 14mm;
  right: 14mm;
  bottom: 0;
  height: 4pt;
  background: var(--color-accent);
}
.cv-shape-poster .cv-poster-tagline {
  font-size: 9pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  color: var(--color-accent);
  margin-bottom: 16pt;
}
.cv-shape-poster .cv-poster-name {
  font-family: var(--font-heading);
  font-size: 96pt;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 0.92;
  color: var(--color-ink);
  text-transform: uppercase;
}
.cv-shape-poster .cv-poster-line {
  margin-top: 18pt;
  font-family: var(--font-heading);
  font-size: 22pt;
  font-weight: 400;
  font-style: italic;
  line-height: 1.2;
  color: var(--color-ink);
  letter-spacing: -0.015em;
  max-width: 80%;
}
.cv-shape-poster .cv-poster-body {
  padding: 14mm;
  background: color-mix(in oklch, var(--color-ink) 90%, var(--color-paper));
  color: var(--color-paper);
  columns: 2;
  column-gap: 14mm;
  font-size: 8.5pt;
  line-height: 1.55;
}
.cv-shape-poster .cv-poster-summary {
  break-inside: avoid;
  margin-bottom: 14pt;
  font-size: 10pt;
  font-style: italic;
  color: var(--color-paper);
}
.cv-shape-poster .cv-poster-summary mark.accent-hit {
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
  font-style: normal;
}
.cv-shape-poster .cv-poster-credits {
  break-inside: avoid;
  margin-bottom: 14pt;
}
.cv-shape-poster .cv-poster-credits-title {
  font-family: var(--font-heading);
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--color-accent);
  margin-bottom: 6pt;
  padding-bottom: 3pt;
  border-bottom: 0.5px solid color-mix(in oklch, var(--color-accent) 60%, transparent);
}
.cv-shape-poster .cv-poster-credits ul {
  display: flex;
  flex-direction: column;
  gap: 4pt;
  list-style: none;
  padding: 0;
}
.cv-shape-poster .cv-poster-credits li {
  font-size: 8.5pt;
  color: var(--color-paper);
}
.cv-shape-poster .cv-credit-period {
  display: inline-block;
  min-width: 56pt;
  font-weight: 700;
  color: color-mix(in oklch, var(--color-accent) 80%, var(--color-paper));
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.cv-shape-poster .cv-credit-role {
  font-weight: 700;
  color: var(--color-paper);
}
.cv-shape-poster .cv-credit-where {
  color: color-mix(in oklch, var(--color-paper) 70%, var(--color-ink));
  font-style: italic;
}
/* The hero accent stripe at the page top doesn't fit this shape — hide it. */
.cv-shape-poster.cv-page::before { display: none; }
`;
}

// ============ Top-level summary block (shape-agnostic for now) ============

const summaryCSS = `
.cv-summary {
  font-size: 12pt;
  line-height: 1.55;
  color: var(--color-ink);
  margin-bottom: var(--density-section-gap);
  padding-left: 14pt;
  border-left: 2px solid var(--color-accent);
  font-weight: 400;
  letter-spacing: -0.003em;
}
.cv-summary mark.accent-hit {
  background: transparent;
  color: var(--color-accent);
  font-weight: 700;
}
`;

// ============ Public assembly ============

function shapeCSS(shape: ResolvedSpec['spec']['layoutShape']): string {
  switch (shape) {
    case 'editorial-grid':
      return editorialGridShapeCSS();
    case 'poster':
      return posterShapeCSS();
    case 'sidebar':
    case 'single-column':
      return ''; // sidebar emits via sidebarCSS(); single-column inherits .cv-page only.
  }
}

export function primitivesCSS(rs: ResolvedSpec): string {
  return [
    headerCSS(rs.spec.primitives.header),
    sectionCSS(rs.spec.primitives.section),
    skillListCSS(rs.spec.primitives.skillList),
    experienceItemCSS(rs.spec.primitives.experienceItem),
    sidebarCSS(rs.spec.primitives.sidebar),
    shapeCSS(rs.spec.layoutShape),
    summaryCSS,
  ].join('\n');
}
