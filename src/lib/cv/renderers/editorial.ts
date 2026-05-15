/**
 * Editorial CV Renderer
 *
 * Self-contained renderer for creative-level CVs. Produces editorial/magazine
 * layouts with real typographic hierarchy, multi-color palettes, asymmetric
 * grids, pull quotes, drop caps, decorative numerals, marginalia, kicker
 * labels — pick & combine.
 *
 * Design principles:
 * - Print-safe: no transforms, no clip-path, no hover effects
 * - WYSIWYG: identical HTML for preview and PDF
 * - Agent-driven: the AI fills EditorialTokens freely — the renderer keys
 *   off layoutArchetype as the main switch and layers decorElements on top
 * - Multi-color: supports mono-accent / duotone / tritone palettes
 * - Element IDs match the existing inline editor contract
 */

import type {
  GeneratedCVContent,
  CVElementOverrides,
  ElementOverride,
  CVContactInfo,
} from '@/types';
import type {
  CVDesignTokens,
  EditorialTokens,
  EditorialDecorElement,
  EditorialLayoutArchetype,
} from '@/types/design-tokens';
import { getFontUrls } from '../templates/themes';
import { fontPairings } from '../templates/themes';
import { splitInterest } from '../interest-format';

// ============ Public API ============

export interface EditorialHTMLOptions {
  previewProtection?: boolean;
  watermarkText?: string;
}

export function generateEditorialHTML(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  fullName: string,
  avatarUrl?: string | null,
  headline?: string | null,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null,
  options?: EditorialHTMLOptions,
): string {
  const editorial = resolveEditorialTokens(tokens);
  const fontUrls = getFontUrls(tokens.fontPairing);
  const fontConfig = fontPairings[tokens.fontPairing];

  const previewProtection = options?.previewProtection ?? false;
  const watermarkText = options?.watermarkText ?? 'PREVIEW';

  const css = generateEditorialCSS(tokens, editorial, fontConfig);
  const header = generateEditorialHeader(
    fullName,
    headline,
    avatarUrl,
    tokens,
    editorial,
    overrides,
    contactInfo,
  );
  const body = generateEditorialBody(content, tokens, editorial, overrides);

  const protection = buildProtection(previewProtection, watermarkText);

  const archetype = editorial.layoutArchetype || 'magazine-column';
  const decorClasses = (editorial.decorElements || [])
    .map((d) => `editorial-decor-${d}`)
    .join(' ');

  return `<!DOCTYPE html>
<!-- Generated with AI assistance by CVeetje (cveetje.nl) — editorial renderer (creative) -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullName)} — CV</title>
  ${fontUrls.map(url => `<link rel="stylesheet" href="${url}">`).join('\n  ')}
  <style>
    ${css}
    ${protection.css}
  </style>
</head>
<body>
  ${protection.watermark}
  <div class="editorial-cv editorial-archetype-${archetype} editorial-grid-${editorial.grid} editorial-scale-${editorial.typographyScale} editorial-policy-${editorial.colorPolicy || 'mono-accent'} editorial-treatment-${editorial.sectionTreatment} ${decorClasses}">
    ${header}
    ${body}
  </div>
  ${protection.script}
</body>
</html>`;
}

// ============ Resolve Editorial Tokens ============

/**
 * Fill in safe editorial defaults for any missing fields. The AI is supposed
 * to set all of these, but we never want the renderer to crash.
 */
function resolveEditorialTokens(tokens: CVDesignTokens): EditorialTokens {
  const e = tokens.editorial;
  return {
    layoutArchetype: e?.layoutArchetype ?? 'magazine-column',
    colorPolicy: e?.colorPolicy ?? 'mono-accent',
    secondaryColor: e?.secondaryColor,
    decorElements: e?.decorElements ?? [],
    headerLayout: e?.headerLayout ?? 'stacked',
    nameTreatment: e?.nameTreatment ?? 'oversized-serif',
    accentTreatment: e?.accentTreatment ?? 'thin-rule',
    sectionTreatment: e?.sectionTreatment ?? 'numbered',
    grid: e?.grid ?? 'asymmetric-60-40',
    divider: e?.divider ?? 'hairline',
    typographyScale: e?.typographyScale ?? 'editorial',
    sectionNumbering: e?.sectionNumbering ?? true,
    pullQuoteSource: e?.pullQuoteSource,
    dropCapSection: e?.dropCapSection ?? 'summary',
    // v4
    conceptStatement: e?.conceptStatement,
    conceptMotif: e?.conceptMotif,
    pullQuoteText: e?.pullQuoteText,
    pullQuoteAttribution: e?.pullQuoteAttribution,
    dropCapLetter: e?.dropCapLetter,
    ledeText: e?.ledeText,
    nameTagline: e?.nameTagline,
    accentKeywords: e?.accentKeywords,
    marginNoteCopy: e?.marginNoteCopy,
    paletteRule: e?.paletteRule,
    headingScaleRatio: typeof e?.headingScaleRatio === 'number'
      ? Math.max(1.0, Math.min(3.0, e.headingScaleRatio))
      : 1.7,
    bodyDensity: e?.bodyDensity ?? 'normal',
    asymmetryStrength: e?.asymmetryStrength ?? 'subtle',
  };
}

// ============ v4 content-driven helpers ============

function bodyDensityValues(d: 'whisper' | 'normal' | 'airy' | undefined): { leading: string; tracking: string } {
  switch (d) {
    case 'whisper': return { leading: '1.4', tracking: '0.005em' };
    case 'airy':    return { leading: '1.7', tracking: '0.025em' };
    case 'normal':
    default:        return { leading: '1.55', tracking: '0.012em' };
  }
}

function asymmetryValues(a: 'none' | 'subtle' | 'considered' | undefined): { offset: string } {
  switch (a) {
    case 'none':       return { offset: '0px' };
    case 'considered': return { offset: '40px' };
    case 'subtle':
    default:           return { offset: '14px' };
  }
}

/**
 * Wrap any occurrence of one of the accentKeywords in body text with a
 * <mark class="editorial-accent-hit"> span. Case-insensitive, longest-first.
 * Operates on already-escaped text — caller is responsible for passing
 * escapeHtml(plain) when the input isn't pre-escaped.
 */
function applyAccentHighlights(escapedText: string, keywords: string[] | undefined): string {
  if (!keywords || keywords.length === 0) return escapedText;
  const cleaned = keywords
    .filter(k => k && k.trim().length >= 3)
    .map(k => k.trim())
    .sort((a, b) => b.length - a.length);
  if (cleaned.length === 0) return escapedText;

  let out = escapedText;
  for (const kw of cleaned) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = /[a-zA-Z0-9]/.test(kw)
      ? new RegExp(`(?<![a-zA-Z0-9])(${escapedKw})(?![a-zA-Z0-9])`, 'gi')
      : new RegExp(`(${escapedKw})`, 'gi');
    out = out.replace(pattern, '<mark class="editorial-accent-hit">$1</mark>');
  }
  return out;
}

/** Pick the drop-cap letter — AI choice wins, else first letter of section content. */
function resolveDropCapLetter(aiChoice: string | undefined, sourceText: string): string {
  if (aiChoice && /[A-Za-z]/.test(aiChoice)) return aiChoice.trim().charAt(0).toUpperCase();
  const firstChar = (sourceText || '').trim().charAt(0);
  return firstChar ? firstChar.toUpperCase() : '';
}

function hasDecor(e: EditorialTokens, el: EditorialDecorElement): boolean {
  return (e.decorElements || []).includes(el);
}

// Choose the effective color for "designed" elements (section titles,
// decorative numerals, marginalia). Order: secondaryColor > accent > primary.
function pickDesignColor(
  e: EditorialTokens,
  colors: CVDesignTokens['colors'],
  preferSecondary = true,
): string {
  if (preferSecondary && e.colorPolicy === 'tritone' && e.secondaryColor) {
    return e.secondaryColor;
  }
  if (e.colorPolicy === 'duotone' || e.colorPolicy === 'tritone') {
    return colors.accent;
  }
  return colors.accent;
}

// ============ CSS Generation ============

function generateEditorialCSS(
  tokens: CVDesignTokens,
  e: EditorialTokens,
  fontConfig: typeof fontPairings[keyof typeof fontPairings],
): string {
  const colors = tokens.colors;
  const scaleVars = getScaleVars(e.typographyScale);
  const pageBg = tokens.pageBackground || '#ffffff';

  const secondary = e.secondaryColor || colors.accent;
  const designColor = pickDesignColor(e, colors, true);
  const sectionTitleColor = hasDecor(e, 'colored-section-titles')
    ? designColor
    : colors.primary;

  // Typography decisions derived from nameTreatment
  const nameCSS = getNameTreatmentCSS(e.nameTreatment, fontConfig);
  const accentCSS = getAccentTreatmentCSS(e.accentTreatment, colors.accent);
  const sectionCSS = getSectionTreatmentCSS(e.sectionTreatment, colors, scaleVars);
  const dividerCSS = getDividerCSS(e.divider, colors);
  const archetypeCSS = getArchetypeCSS(e.layoutArchetype || 'magazine-column');
  const decorCSS = getDecorCSS(e, colors, sectionTitleColor, designColor, secondary);

  // v4: typography rhythm values
  const ratio = typeof e.headingScaleRatio === 'number'
    ? Math.max(1.0, Math.min(3.0, e.headingScaleRatio))
    : 1.7;
  const bodyDensity = bodyDensityValues(e.bodyDensity);
  const asym = asymmetryValues(e.asymmetryStrength);

  return `
    :root {
      --e-primary: ${colors.primary};
      --e-secondary: ${colors.secondary};
      --e-accent: ${colors.accent};
      --e-text: ${colors.text};
      --e-muted: ${colors.muted};
      --e-design: ${designColor};
      --e-second-design: ${secondary};
      --e-section-title: ${sectionTitleColor};
      --e-page-bg: ${pageBg};
      --e-rule: ${withAlpha(colors.text, 0.18)};
      --e-rule-strong: ${withAlpha(colors.text, 0.3)};
      --e-font-heading: ${fontConfig.heading.family};
      --e-font-body: ${fontConfig.body.family};
      ${scaleVars}
      /* v4: rhythm vars */
      --e-heading-scale: ${ratio.toFixed(2)};
      --e-body-leading: ${bodyDensity.leading};
      --e-body-tracking: ${bodyDensity.tracking};
      --e-asym-offset: ${asym.offset};
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--e-page-bg);
      color: var(--e-text);
      font-family: var(--e-font-body);
      font-size: var(--e-body);
      line-height: var(--e-body-leading);
      letter-spacing: var(--e-body-tracking);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* v4: accent keyword highlights. Subtle band-underline so the
       highlight reads on ANY background (light, tinted, paper) without
       color-clashing. The previous treatment (color + bold weight)
       became invisible on tritone backgrounds and bold-confused the
       reading rhythm. */
    mark.editorial-accent-hit {
      background: transparent;
      color: inherit;
      font-weight: inherit;
      padding: 0 1px;
      background-image: linear-gradient(180deg, transparent 68%, var(--e-design) 68%, var(--e-design) 86%, transparent 86%);
      background-size: 100% 100%;
      background-repeat: no-repeat;
    }

    /* v4: name tagline below name */
    .editorial-header .name-tagline {
      font-family: var(--e-font-body);
      font-size: var(--e-kicker);
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: var(--e-muted);
      margin: 10px 0 0;
      font-weight: 500;
    }
    .editorial-header .name-tagline > span:not(:last-child)::after {
      content: ' · ';
      margin: 0 4px;
      opacity: 0.5;
    }

    .editorial-cv {
      max-width: 800px;
      margin: 0 auto;
      background: var(--e-page-bg);
      padding: 52px 56px 64px;
      /* No min-height — content drives the CV height. The preview iframe
         has its own 800px min-height (cv-preview.tsx), and forcing a height
         here pads sparse CVs with empty cream in single-page PDF export. */
    }

    /* ============ Header ============ */

    .editorial-header {
      margin-bottom: 40px;
    }

    .editorial-header .kicker {
      font-family: var(--e-font-body);
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: var(--e-kicker);
      color: var(--e-muted);
      margin: 0 0 12px;
      font-weight: 600;
    }

    .editorial-header .name {
      margin: 0;
      color: var(--e-primary);
      line-height: 1;
    }

    .editorial-header .headline {
      color: var(--e-text);
      font-family: var(--e-font-body);
      font-size: var(--e-headline);
      line-height: 1.3;
      margin: 12px 0 0;
      max-width: 52ch;
      font-weight: 400;
    }

    .editorial-header .contact-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      font-family: var(--e-font-body);
      font-size: var(--e-small);
      color: var(--e-muted);
      margin-top: 18px;
    }
    .editorial-header .contact-strip .sep {
      opacity: 0.5;
    }
    .editorial-header .contact-strip a {
      color: var(--e-text);
      text-decoration: none;
      border-bottom: 1px solid var(--e-rule);
    }

    .editorial-header .portrait {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 50%;
      display: block;
    }

    .editorial-header.layout-split {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: end;
    }
    .editorial-header.layout-split .contact-strip {
      flex-direction: column;
      text-align: right;
      gap: 4px;
    }
    .editorial-header.layout-split .contact-strip .sep { display: none; }

    .editorial-header.layout-band {
      background: var(--e-primary);
      color: #fff;
      margin: -52px -56px 40px;
      padding: 48px 56px 40px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .editorial-header.layout-band .name,
    .editorial-header.layout-band .kicker,
    .editorial-header.layout-band .headline {
      color: #fff;
    }
    .editorial-header.layout-band .kicker {
      color: rgba(255,255,255,0.7);
    }
    .editorial-header.layout-band .headline {
      color: rgba(255,255,255,0.92);
    }
    .editorial-header.layout-band .contact-strip {
      color: rgba(255,255,255,0.8);
    }
    .editorial-header.layout-band .contact-strip a {
      color: #fff;
      border-bottom-color: rgba(255,255,255,0.4);
    }
    /* Duotone / tritone bleed a thin accent rail under the band */
    .editorial-policy-duotone .editorial-header.layout-band,
    .editorial-policy-tritone .editorial-header.layout-band {
      border-bottom: 6px solid var(--e-accent);
    }
    .editorial-policy-tritone .editorial-header.layout-band {
      box-shadow: inset 0 -10px 0 0 var(--e-second-design);
    }

    .editorial-header.layout-overlap {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 24px;
      align-items: end;
    }
    .editorial-header.layout-overlap .portrait {
      width: 120px;
      height: 120px;
    }

    .editorial-header.layout-stacked {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .editorial-header.layout-stacked .portrait {
      margin-bottom: 16px;
    }

    ${nameCSS}
    ${accentCSS}

    /* ============ Grid / Body ============ */

    .editorial-section {
      margin-top: 40px;
    }
    .editorial-section:first-of-type { margin-top: 32px; }

    .editorial-section .section-title {
      font-family: var(--e-font-heading);
      color: var(--e-section-title);
      margin: 0 0 16px;
      line-height: 1.1;
    }

    ${sectionCSS}

    .editorial-section .item {
      margin-bottom: 20px;
      break-inside: avoid;
    }
    .editorial-section .item:last-child { margin-bottom: 0; }

    .item-title {
      font-family: var(--e-font-heading);
      font-size: var(--e-item-title);
      font-weight: 600;
      color: var(--e-text);
      margin: 0;
      line-height: 1.25;
    }

    .item-subtitle {
      font-family: var(--e-font-body);
      font-size: var(--e-body);
      color: var(--e-primary);
      margin: 2px 0 0;
      font-weight: 500;
    }

    .item-meta {
      font-family: var(--e-font-body);
      font-size: var(--e-small);
      color: var(--e-muted);
      margin: 2px 0 8px;
      letter-spacing: 0.02em;
    }

    .item-body p {
      margin: 8px 0 0;
      color: var(--e-text);
    }

    .item-body ul {
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
    }
    .item-body ul li {
      padding-left: 18px;
      position: relative;
      margin: 4px 0;
      color: var(--e-text);
    }
    .item-body ul li::before {
      content: '—';
      position: absolute;
      left: 0;
      color: var(--e-accent);
    }

    /* Pull quote */
    .pull-quote {
      font-family: var(--e-font-heading);
      font-style: italic;
      font-size: var(--e-pullquote);
      line-height: 1.25;
      color: var(--e-primary);
      border-left: 3px solid var(--e-accent);
      padding: 8px 0 8px 20px;
      margin: 24px 0;
      max-width: 90%;
    }
    .pull-quote cite {
      display: block;
      font-style: normal;
      font-family: var(--e-font-body);
      font-size: var(--e-small);
      color: var(--e-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-top: 8px;
    }

    /* Drop cap */
    .drop-cap-paragraph::first-letter {
      font-family: var(--e-font-heading);
      font-size: calc(var(--e-hero) * 0.6);
      float: left;
      line-height: 0.9;
      padding-right: 10px;
      padding-top: 4px;
      color: var(--e-accent);
      font-weight: 700;
    }

    /* Dividers between sections */
    ${dividerCSS}

    /* Skills as editorial block */
    .skills-editorial {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 20px;
      align-items: baseline;
    }
    .skills-editorial .group-label {
      font-family: var(--e-font-body);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: var(--e-small);
      color: var(--e-muted);
      font-weight: 600;
    }
    .skills-editorial .group-values {
      color: var(--e-text);
      font-size: var(--e-body);
    }
    .skills-editorial .skill {
      display: inline;
    }
    .skills-editorial .skill:not(:last-child)::after {
      content: ' · ';
      color: var(--e-accent);
      font-weight: 600;
      padding: 0 2px;
    }

    /* Languages + certifications as inline lists */
    .editorial-inline-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
    }
    .editorial-inline-list li {
      color: var(--e-text);
      font-size: var(--e-body);
    }
    .editorial-inline-list li .meta {
      color: var(--e-muted);
      font-size: var(--e-small);
      margin-left: 6px;
    }
    .editorial-inline-list li .interest-context {
      color: var(--e-muted);
      font-size: var(--e-small);
    }

    /* Asymmetric grids — basic structure (archetype CSS may override) */
    .editorial-grid-asymmetric-60-40 .editorial-body,
    .editorial-grid-asymmetric-70-30 .editorial-body {
      display: grid;
      gap: 40px;
      align-items: start;
    }
    .editorial-grid-asymmetric-60-40 .editorial-body {
      grid-template-columns: 3fr 2fr;
    }
    .editorial-grid-asymmetric-70-30 .editorial-body {
      grid-template-columns: 7fr 3fr;
    }
    .editorial-grid-manuscript .editorial-body {
      display: grid;
      grid-template-columns: 1fr;
      max-width: 64ch;
      margin: 0 auto;
    }
    .editorial-grid-full-bleed .editorial-body {
      max-width: none;
    }
    .editorial-rail {
      align-self: start;
    }
    .editorial-rail .editorial-section:first-child {
      margin-top: 32px;
    }
    .editorial-rail .editorial-section {
      margin-top: 28px;
    }
    .editorial-grid-three-column-intro .editorial-body {
      display: block;
    }
    .editorial-grid-three-column-intro .intro-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--e-rule);
    }
    .editorial-grid-three-column-intro .intro-row .intro-col .label {
      font-family: var(--e-font-body);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: var(--e-small);
      color: var(--e-muted);
      margin-bottom: 8px;
    }

    /* When using numbered section treatment: */
    .section-number {
      font-family: var(--e-font-heading);
      color: var(--e-accent);
      font-weight: 700;
      font-size: 0.7em;
      letter-spacing: 0.06em;
      margin-right: 10px;
      vertical-align: baseline;
    }

    /* ============ Archetype-specific CSS ============ */
    ${archetypeCSS}

    /* ============ Decoration layer CSS ============ */
    ${decorCSS}

    /* PDF print rules.
       @page intentionally does NOT set size A4 at top level — Puppeteer's
       pdf() options set the paper size. With CSS size A4 here, single-page
       mode (dynamic options.height, e.g. 1273mm) hit a Chromium conflict:
       paper was 1273mm but pages broke every 297mm, producing 4+ pages
       with massive empty bands. Letting options dictate size avoids this.
       The size A4 lives inside @media print so multi-page mode still uses A4. */
    @page {
      margin: 0;
    }
    @media print {
      @page {
        size: A4;
      }
      html, body {
        background: var(--e-page-bg);
      }
      .editorial-cv {
        width: 210mm;
        max-width: 210mm;
        margin: 0;
        padding: 32px 40px 40px;
        min-height: auto;
      }
      .editorial-header.layout-band {
        margin: -32px -40px 32px;
        padding: 32px 40px 28px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .editorial-grid-asymmetric-60-40 .editorial-body,
      .editorial-grid-asymmetric-70-30 .editorial-body {
        gap: 28px;
      }
      /* break-inside: avoid only on items, not whole sections.
         Avoiding on whole sections caused entire sections to jump to the
         next page when they didn't quite fit at the bottom, leaving large
         empty bands at page boundaries. Items are short and atomic; sections
         can flow naturally across pages. */
      .editorial-section .item {
        break-inside: avoid;
      }
      /* Tighten archetype spacing in print so A4 pagination doesn't accumulate gaps. */
      .editorial-archetype-manuscript-mono .editorial-section {
        margin-top: 24px;
      }
      .editorial-archetype-asymmetric-feature .editorial-section,
      .editorial-archetype-feature-sidebar .editorial-main .editorial-section,
      .editorial-archetype-magazine-column .editorial-section {
        margin-top: 20px;
      }
      .editorial-section + .editorial-section {
        padding-top: 20px;
      }
      /* Marginalia: keep item with its margin-note */
      .editorial-decor-marginalia .editorial-section .item {
        page-break-inside: avoid;
      }
    }
  `;
}

// ============ Header Generation ============

function generateEditorialHeader(
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  tokens: CVDesignTokens,
  e: EditorialTokens,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null,
): string {
  const headerOverride = getOverride(overrides, 'header');
  if (headerOverride?.hidden) return '';

  const nameStyle = getOverrideStyle(getOverride(overrides, 'header-name'));
  const headlineStyle = getOverrideStyle(getOverride(overrides, 'header-headline'));
  const showPhoto = tokens.showPhoto && !!avatarUrl;

  const kicker = buildKicker(e, tokens);
  const nameHtml = buildStyledName(fullName, e.nameTreatment, nameStyle);
  const headlineHtml = headline
    ? `<p class="headline" style="${headlineStyle}">${escapeHtml(headline)}</p>`
    : '';
  const contactHtml = buildContactStrip(contactInfo);
  const accentRule = e.accentTreatment === 'thin-rule'
    ? `<hr class="accent-rule accent-rule-top" />`
    : '';
  const accentBottom = e.accentTreatment === 'thin-rule'
    ? `<hr class="accent-rule accent-rule-bottom" />`
    : '';

  const portrait = showPhoto
    ? `<img class="portrait" src="${escapeHtml(avatarUrl!)}" alt="Portrait" />`
    : '';

  // v4: Monocle-style tagline below the name — small caps with separators
  const taglineHtml = e.nameTagline && e.nameTagline.trim().length > 0
    ? `<p class="name-tagline">${e.nameTagline.split(/\s*[,·•|]\s*/).filter(Boolean).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</p>`
    : '';

  const coreBlock = `
    ${kicker}
    ${accentRule}
    ${nameHtml}
    ${taglineHtml}
    ${accentBottom}
    ${headlineHtml}
    ${contactHtml}
  `;

  switch (e.headerLayout) {
    case 'split':
      return `
        <header class="editorial-header layout-split">
          <div class="header-main">
            ${kicker}
            ${accentRule}
            ${nameHtml}
            ${taglineHtml}
            ${headlineHtml}
          </div>
          <div class="header-side">
            ${portrait}
            ${contactHtml}
          </div>
        </header>
      `;

    case 'band':
      return `
        <header class="editorial-header layout-band">
          ${portrait}
          ${kicker}
          ${nameHtml}
          ${taglineHtml}
          ${headlineHtml}
          ${contactHtml}
        </header>
      `;

    case 'overlap':
      return `
        <header class="editorial-header layout-overlap">
          ${portrait}
          <div class="header-main">
            ${kicker}
            ${accentRule}
            ${nameHtml}
            ${taglineHtml}
            ${headlineHtml}
            ${contactHtml}
          </div>
        </header>
      `;

    case 'stacked':
    default:
      return `
        <header class="editorial-header layout-stacked">
          ${portrait}
          ${coreBlock}
        </header>
      `;
  }
}

function buildKicker(e: EditorialTokens, tokens: CVDesignTokens): string {
  // Kicker is only rendered for certain accent treatments
  if (e.accentTreatment === 'number-prefix') {
    return `<p class="kicker">No. 01 — ${escapeHtml(tokens.styleName || 'Curriculum Vitae')}</p>`;
  }
  if (e.accentTreatment === 'ornament') {
    return `<p class="kicker">✦ Curriculum Vitae ✦</p>`;
  }
  return `<p class="kicker">Curriculum Vitae</p>`;
}

function buildStyledName(
  fullName: string,
  treatment: EditorialTokens['nameTreatment'],
  inlineStyle: string,
): string {
  if (treatment === 'mixed-italic') {
    const parts = fullName.trim().split(' ');
    if (parts.length > 1) {
      const first = parts[0];
      const rest = parts.slice(1).join(' ');
      return `<h1 class="name" data-id="header-name" style="${inlineStyle}"><em>${escapeHtml(first)}</em> ${escapeHtml(rest)}</h1>`;
    }
  }
  return `<h1 class="name" data-id="header-name" style="${inlineStyle}">${escapeHtml(fullName)}</h1>`;
}

function buildContactStrip(contact: CVContactInfo | null | undefined): string {
  if (!contact) return '';
  const items: string[] = [];

  if (contact.email) items.push(`<span>${escapeHtml(contact.email)}</span>`);
  if (contact.phone) items.push(`<span>${escapeHtml(contact.phone)}</span>`);
  if (contact.location) items.push(`<span>${escapeHtml(contact.location)}</span>`);
  if (contact.birthDate) items.push(`<span>${escapeHtml(contact.birthDate)}</span>`);

  if (contact.linkedinUrl) {
    const href = contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : 'https://' + contact.linkedinUrl;
    const display = contact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '');
    items.push(`<a href="${escapeHtml(href)}">linkedin.com/in/${escapeHtml(display)}</a>`);
  }
  if (contact.github) {
    const href = contact.github.startsWith('http') ? contact.github : 'https://github.com/' + contact.github;
    const display = contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
    items.push(`<a href="${escapeHtml(href)}">github.com/${escapeHtml(display)}</a>`);
  }
  if (contact.website) {
    const href = contact.website.startsWith('http') ? contact.website : 'https://' + contact.website;
    items.push(`<a href="${escapeHtml(href)}">${escapeHtml(contact.website.replace(/^https?:\/\//, ''))}</a>`);
  }

  if (items.length === 0) return '';
  return `<div class="contact-strip">${items.join('<span class="sep">·</span>')}</div>`;
}

// ============ Body / Sections ============

function generateEditorialBody(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  e: EditorialTokens,
  overrides?: CVElementOverrides | null,
): string {
  const archetype = e.layoutArchetype || 'magazine-column';

  // Three-column-intro: render a hero row (location/focus/availability style)
  const introRow = e.grid === 'three-column-intro'
    ? buildThreeColumnIntro(content, tokens)
    : '';

  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, e, overrides),
    experience: () => renderExperience(content.experience, e, tokens, overrides),
    education: () => renderEducation(content.education, e, overrides),
    skills: () => renderSkills(content.skills, overrides),
    languages: () => renderLanguages(content.languages, overrides),
    certifications: () => renderCertifications(content.certifications, overrides),
    projects: () => renderProjects(content.projects, e, overrides),
    interests: () => renderInterests(content.interests, overrides),
  };

  // Sidebar archetypes: feature-sidebar
  const supportsRail =
    archetype === 'feature-sidebar' ||
    e.grid === 'asymmetric-60-40' ||
    e.grid === 'asymmetric-70-30';

  const requestedRailSections = tokens.sidebarSections?.length
    ? tokens.sidebarSections
    : ['skills', 'languages', 'certifications'];

  // editorial-spread uses a left marginalia column instead of right sidebar
  const isSpread = archetype === 'editorial-spread' && hasDecor(e, 'marginalia');

  const railSections = (supportsRail && !isSpread)
    ? requestedRailSections.filter(name => tokens.sectionOrder.includes(name))
    : [];
  const mainSections = (supportsRail && !isSpread)
    ? tokens.sectionOrder.filter(name => !railSections.includes(name))
    : tokens.sectionOrder;

  let sectionIndex = 0;
  const renderSections = (sectionNames: string[]) => sectionNames
    .map((name) => {
      const render = sectionRenderers[name];
      if (!render) return '';
      const html = render();
      if (!html) return '';
      sectionIndex += 1;
      return wrapSection(name, html, sectionIndex, e);
    })
    .filter(Boolean)
    .join('\n');

  const mainHtml = renderSections(mainSections);
  const railHtml = railSections.length > 0 ? renderSections(railSections) : '';

  return `
    <div class="editorial-body archetype-${archetype}">
      ${introRow}
      <main class="editorial-main">${mainHtml}</main>
      ${railHtml ? `<aside class="editorial-rail">${railHtml}</aside>` : ''}
    </div>
  `;
}

function wrapSection(
  name: string,
  innerHtml: string,
  index: number,
  e: EditorialTokens,
): string {
  const prefix = e.sectionNumbering
    ? `<span class="section-number">${String(index).padStart(2, '0')}</span>`
    : '';

  // Big decorative numerals — replace the small section-number prefix with a
  // huge chapter numeral *next to* the title via a separate node. The
  // placeholder lives in the inner HTML (see sectionTitle()).
  const numeralBlock = e.decorElements?.includes('decorative-numerals')
    ? `<span class="decor-numeral">${String(index).padStart(2, '0')}</span>`
    : '';

  let inner = innerHtml.replace('<!--SECTION_NUMBER-->', prefix);
  inner = inner.replace('<!--DECOR_NUMERAL-->', numeralBlock);
  return `<section class="editorial-section" data-section="${name}" data-index="${index}">${inner}</section>`;
}

function sectionTitle(label: string): string {
  return `<h2 class="section-title"><!--DECOR_NUMERAL--><!--SECTION_NUMBER--><span class="section-title-label">${escapeHtml(label)}</span></h2>`;
}

function renderSummary(
  summary: string,
  e: EditorialTokens,
  overrides?: CVElementOverrides | null,
): string {
  if (!summary) return '';
  if (getOverride(overrides, 'section-summary')?.hidden) return '';
  if (getOverride(overrides, 'summary')?.hidden) return '';

  const style = getOverrideStyle(getOverride(overrides, 'summary'));
  const paragraphs = summary.split('\n').filter(Boolean);

  // drop-cap is triggered by sectionTreatment OR decor element
  const wantsDropCap =
    e.sectionTreatment === 'drop-cap' ||
    (hasDecor(e, 'drop-cap') && (e.dropCapSection || 'summary') === 'summary');

  // first-line-emphasis: split first paragraph into <span class="first-line"> + rest
  const wantsFirstLine = hasDecor(e, 'first-line-emphasis');

  // v4: AI-chosen drop-cap letter overrides the derived one
  const dropCapOverride = wantsDropCap ? resolveDropCapLetter(e.dropCapLetter, summary) : undefined;
  const keywords = e.accentKeywords;

  const bodyHtml = paragraphs
    .map((p, i) => {
      const classes: string[] = [];
      if (i === 0 && wantsDropCap) classes.push('drop-cap-paragraph');
      const cls = classes.join(' ');

      // v4: when AI supplied a dropCapLetter that differs from the natural
      // first letter, render an explicit <span class="drop-cap-glyph"> +
      // rest of paragraph (skipping the original first character).
      if (i === 0 && wantsDropCap && dropCapOverride) {
        const naturalFirst = p.trim().charAt(0).toUpperCase();
        const rest = naturalFirst === dropCapOverride
          ? p.trim().slice(1)  // glyph replaces the natural first letter
          : p.trim();          // AI picked a different letter — prepend it
        const highlighted = applyAccentHighlights(escapeHtml(rest), keywords);
        return `<p class="${cls}" style="${style}"><span class="drop-cap-glyph">${escapeHtml(dropCapOverride)}</span>${highlighted}</p>`;
      }

      if (i === 0 && wantsFirstLine) {
        // v4: AI-chosen ledeText takes priority over derived first sentence
        if (e.ledeText && e.ledeText.trim().length > 0) {
          const lede = e.ledeText.trim();
          // Try to strip the lede from p if it matches the opening, else prepend
          const trimmedP = p.trim();
          const rest = trimmedP.toLowerCase().startsWith(lede.toLowerCase())
            ? trimmedP.slice(lede.length).trim()
            : trimmedP;
          const restEscaped = applyAccentHighlights(escapeHtml(rest), keywords);
          return `<p class="${cls} has-first-line-emphasis" style="${style}"><span class="first-line">${escapeHtml(lede)}</span> ${restEscaped}</p>`;
        }
        const match = p.match(/^([\s\S]+?[.?!])(\s+)([\s\S]*)$/);
        if (match) {
          const restEscaped = applyAccentHighlights(escapeHtml(match[3]), keywords);
          return `<p class="${cls} has-first-line-emphasis" style="${i === 0 ? style : ''}"><span class="first-line">${escapeHtml(match[1])}</span> ${restEscaped}</p>`;
        }
        return `<p class="${cls} has-first-line-emphasis" style="${i === 0 ? style : ''}"><span class="first-line">${escapeHtml(p)}</span></p>`;
      }
      return `<p class="${cls}" style="${i === 0 ? style : ''}">${applyAccentHighlights(escapeHtml(p), keywords)}</p>`;
    })
    .join('');

  return `${sectionTitle('Profile')}<div class="item-body">${bodyHtml}</div>`;
}

function renderExperience(
  experience: GeneratedCVContent['experience'],
  e: EditorialTokens,
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null,
): string {
  if (!experience || experience.length === 0) return '';
  if (getOverride(overrides, 'section-experience')?.hidden) return '';

  const asParagraph = tokens.experienceDescriptionFormat === 'paragraph';
  const pullQuoteFromThisSection =
    (e.sectionTreatment === 'pull-quote' || hasDecor(e, 'pull-quote')) &&
    (e.pullQuoteSource || 'experience') === 'experience';

  const useMarginalia =
    e.layoutArchetype === 'editorial-spread' && hasDecor(e, 'marginalia');

  // v4: AI-chosen pullQuoteText/Attribution take priority over the derived first-highlight
  let pullQuoteHtml = '';
  if (pullQuoteFromThisSection) {
    const first = experience[0];
    const aiText = e.pullQuoteText?.trim();
    const quoteText = aiText && aiText.length > 0
      ? aiText
      : (first?.highlights?.[0] || '');
    const aiAttribution = e.pullQuoteAttribution?.trim();
    const attribution = aiAttribution && aiAttribution.length > 0
      ? aiAttribution
      : (first ? `— ${first.title}, ${first.company}` : '');
    if (quoteText) {
      pullQuoteHtml = `<blockquote class="pull-quote">"${escapeHtml(quoteText)}"${attribution ? `<cite>${escapeHtml(attribution.replace(/^—\s*/, '— '))}</cite>` : ''}</blockquote>`;
    }
  }

  const keywords = e.accentKeywords;
  const marginNotes = e.marginNoteCopy;

  const items = experience
    .map((exp, i) => {
      if (getOverride(overrides, `experience-${i}`)?.hidden) return '';
      const titleStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-title`));
      const companyStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-company`));
      const periodStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-period`));

      let body = '';
      if (asParagraph && exp.description) {
        const descStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-description`));
        body = `<p style="${descStyle}">${applyAccentHighlights(escapeHtml(exp.description), keywords)}</p>`;
      } else if (exp.highlights?.length) {
        body = `<ul>${exp.highlights
          .map((h, hi) => `<li style="${getOverrideStyle(getOverride(overrides, `exp-${i}-highlight-${hi}`))}">${applyAccentHighlights(escapeHtml(h), keywords)}</li>`)
          .join('')}</ul>`;
      }

      // v4: AI-supplied marginNoteCopy wins over derived period+location
      let marginNote = '';
      if (useMarginalia) {
        const aiNote = marginNotes && marginNotes[i] ? marginNotes[i] : '';
        const derivedNote = exp.period
          ? `${exp.period}${exp.location ? ` · ${exp.location}` : ''}`
          : '';
        const noteText = aiNote || derivedNote;
        if (noteText) marginNote = `<aside class="margin-note">${escapeHtml(noteText)}</aside>`;
      }

      return `
        <div class="item" data-id="experience-${i}">
          ${marginNote}
          <h3 class="item-title" data-id="exp-${i}-title" style="${titleStyle}">${escapeHtml(exp.title)}</h3>
          <p class="item-subtitle" data-id="exp-${i}-company" style="${companyStyle}">${escapeHtml(exp.company)}${exp.location && !useMarginalia ? ` · ${escapeHtml(exp.location)}` : ''}</p>
          ${exp.period && !useMarginalia ? `<p class="item-meta" data-id="exp-${i}-period" style="${periodStyle}">${escapeHtml(exp.period)}</p>` : ''}
          <div class="item-body">${body}</div>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  return `${sectionTitle('Experience')}${pullQuoteHtml}${items}`;
}

function renderEducation(
  education: GeneratedCVContent['education'],
  e: EditorialTokens,
  overrides?: CVElementOverrides | null,
): string {
  if (!education || education.length === 0) return '';
  if (getOverride(overrides, 'section-education')?.hidden) return '';

  const useMarginalia =
    e.layoutArchetype === 'editorial-spread' && hasDecor(e, 'marginalia');

  const items = education
    .map((edu, i) => {
      if (getOverride(overrides, `education-${i}`)?.hidden) return '';
      const degreeStyle = getOverrideStyle(getOverride(overrides, `edu-${i}-degree`));
      const instStyle = getOverrideStyle(getOverride(overrides, `edu-${i}-institution`));
      const yearStyle = getOverrideStyle(getOverride(overrides, `edu-${i}-year`));

      const marginNote = useMarginalia && edu.year
        ? `<aside class="margin-note">${escapeHtml(edu.year)}</aside>`
        : '';

      return `
        <div class="item" data-id="education-${i}">
          ${marginNote}
          <h3 class="item-title" data-id="edu-${i}-degree" style="${degreeStyle}">${escapeHtml(edu.degree)}</h3>
          <p class="item-subtitle" data-id="edu-${i}-institution" style="${instStyle}">${escapeHtml(edu.institution)}</p>
          ${edu.year && !useMarginalia ? `<p class="item-meta" data-id="edu-${i}-year" style="${yearStyle}">${escapeHtml(edu.year)}</p>` : ''}
          ${edu.details ? `<div class="item-body"><p>${escapeHtml(edu.details)}</p></div>` : ''}
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  return `${sectionTitle('Education')}${items}`;
}

function renderSkills(
  skills: GeneratedCVContent['skills'],
  overrides?: CVElementOverrides | null,
): string {
  if (!skills || (skills.technical.length === 0 && skills.soft.length === 0)) return '';
  if (getOverride(overrides, 'section-skills')?.hidden) return '';

  const renderRow = (label: string, items: string[], prefix: string) => {
    if (!items.length) return '';
    const skillsHtml = items
      .map((s, i) => {
        if (getOverride(overrides, `${prefix}-${i}`)?.hidden) return '';
        return `<span class="skill" data-id="${prefix}-${i}">${escapeHtml(s)}</span>`;
      })
      .filter(Boolean)
      .join('');
    return `
      <span class="group-label">${label}</span>
      <span class="group-values">${skillsHtml}</span>
    `;
  };

  return `${sectionTitle('Skills')}
    <div class="skills-editorial">
      ${renderRow('Technical', skills.technical, 'skill-tech')}
      ${renderRow('Soft', skills.soft, 'skill-soft')}
    </div>`;
}

function renderLanguages(
  languages: GeneratedCVContent['languages'],
  overrides?: CVElementOverrides | null,
): string {
  if (!languages || languages.length === 0) return '';
  if (getOverride(overrides, 'section-languages')?.hidden) return '';

  const items = languages
    .map((lang, i) => {
      if (getOverride(overrides, `language-${i}`)?.hidden) return '';
      return `<li data-id="language-${i}">${escapeHtml(lang.language)}${lang.level ? `<span class="meta">${escapeHtml(lang.level)}</span>` : ''}</li>`;
    })
    .filter(Boolean)
    .join('');

  return `${sectionTitle('Languages')}<ul class="editorial-inline-list">${items}</ul>`;
}

function renderCertifications(
  certs: string[],
  overrides?: CVElementOverrides | null,
): string {
  if (!certs || certs.length === 0) return '';
  if (getOverride(overrides, 'section-certifications')?.hidden) return '';

  const items = certs
    .map((c, i) => {
      if (getOverride(overrides, `certification-${i}`)?.hidden) return '';
      return `<li data-id="certification-${i}">${escapeHtml(c)}</li>`;
    })
    .filter(Boolean)
    .join('');

  return `${sectionTitle('Certifications')}<ul class="editorial-inline-list">${items}</ul>`;
}

function renderInterests(
  interests: string[] | undefined,
  overrides?: CVElementOverrides | null,
): string {
  if (!interests || interests.length === 0) return '';
  if (getOverride(overrides, 'section-interests')?.hidden) return '';

  const items = interests
    .map((interest, i) => {
      if (getOverride(overrides, `interest-${i}`)?.hidden) return '';
      const { name, framing } = splitInterest(interest);
      const framingHtml = framing
        ? `<span class="interest-context"> — ${escapeHtml(framing)}</span>`
        : '';
      return `<li data-id="interest-${i}"><span class="interest-name">${escapeHtml(name)}</span>${framingHtml}</li>`;
    })
    .filter(Boolean)
    .join('');

  return `${sectionTitle('Interests')}<ul class="editorial-inline-list">${items}</ul>`;
}

function renderProjects(
  projects: GeneratedCVContent['projects'],
  _e: EditorialTokens,
  overrides?: CVElementOverrides | null,
): string {
  if (!projects || projects.length === 0) return '';
  if (getOverride(overrides, 'section-projects')?.hidden) return '';

  const items = projects
    .map((proj, i) => {
      if (getOverride(overrides, `project-${i}`)?.hidden) return '';
      const tech = proj.technologies?.length
        ? `<p class="item-meta">${proj.technologies.map(escapeHtml).join(' · ')}</p>`
        : '';
      const highlights = proj.highlights?.length
        ? `<ul>${proj.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
        : '';
      const url = proj.url
        ? `<p class="item-meta"><a href="${escapeHtml(proj.url)}">${escapeHtml(proj.url)}</a></p>`
        : '';

      return `
        <div class="item" data-id="project-${i}">
          <h3 class="item-title">${escapeHtml(proj.title)}</h3>
          ${proj.period ? `<p class="item-meta">${escapeHtml(proj.period)}</p>` : ''}
          ${tech}
          <div class="item-body">
            <p>${escapeHtml(proj.description)}</p>
            ${highlights}
            ${url}
          </div>
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  return `${sectionTitle('Projects')}${items}`;
}

function buildThreeColumnIntro(content: GeneratedCVContent, tokens: CVDesignTokens): string {
  const summary = content.summary ? content.summary.split('\n')[0] : '';
  const topSkills = (content.skills?.technical || []).slice(0, 4).join(' · ');
  const industryFit = tokens.industryFit || 'Multi-industry';

  return `
    <div class="intro-row">
      <div class="intro-col">
        <div class="label">Focus</div>
        <div>${escapeHtml(industryFit)}</div>
      </div>
      <div class="intro-col">
        <div class="label">Core</div>
        <div>${escapeHtml(topSkills || '—')}</div>
      </div>
      <div class="intro-col">
        <div class="label">Statement</div>
        <div>${escapeHtml(summary.slice(0, 140))}${summary.length > 140 ? '…' : ''}</div>
      </div>
    </div>
  `;
}

// ============ CSS Helpers ============

function getScaleVars(scale: EditorialTokens['typographyScale']): string {
  switch (scale) {
    case 'hero':
      return `
        --e-hero: 68pt;
        --e-headline: 16pt;
        --e-pullquote: 22pt;
        --e-item-title: 13.5pt;
        --e-body: 10.5pt;
        --e-small: 8.5pt;
        --e-kicker: 8pt;
        --e-decor-numeral: 56pt;
      `;
    case 'modest':
      return `
        --e-hero: 38pt;
        --e-headline: 13pt;
        --e-pullquote: 16pt;
        --e-item-title: 12pt;
        --e-body: 10pt;
        --e-small: 8pt;
        --e-kicker: 7.5pt;
        --e-decor-numeral: 36pt;
      `;
    case 'editorial':
    default:
      return `
        --e-hero: 52pt;
        --e-headline: 14.5pt;
        --e-pullquote: 18pt;
        --e-item-title: 13pt;
        --e-body: 10.5pt;
        --e-small: 8.5pt;
        --e-kicker: 8pt;
        --e-decor-numeral: 44pt;
      `;
  }
}

function getNameTreatmentCSS(
  treatment: EditorialTokens['nameTreatment'],
  fontConfig: typeof fontPairings[keyof typeof fontPairings],
): string {
  // We pick fonts based on treatment — fall back to the pairing's heading font
  const headingFamily = fontConfig.heading.family;

  switch (treatment) {
    case 'oversized-serif':
      return `
        .editorial-header .name {
          font-family: ${headingFamily};
          font-size: var(--e-hero);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 0.95;
        }
      `;
    case 'oversized-sans':
      return `
        .editorial-header .name {
          font-family: ${headingFamily};
          font-size: var(--e-hero);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 0.92;
        }
      `;
    case 'uppercase-tracked':
      return `
        .editorial-header .name {
          font-family: ${headingFamily};
          font-size: calc(var(--e-hero) * 0.7);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          line-height: 1;
        }
      `;
    case 'mixed-italic':
      return `
        .editorial-header .name {
          font-family: ${headingFamily};
          font-size: var(--e-hero);
          font-weight: 600;
          line-height: 1;
        }
        .editorial-header .name em {
          font-style: italic;
          font-weight: 400;
          color: var(--e-accent);
        }
      `;
    case 'condensed-impact':
      return `
        .editorial-header .name {
          font-family: ${headingFamily};
          font-size: calc(var(--e-hero) * 1.1);
          font-weight: 700;
          font-stretch: condensed;
          letter-spacing: -0.02em;
          line-height: 0.9;
        }
      `;
  }
}

function getAccentTreatmentCSS(
  treatment: EditorialTokens['accentTreatment'],
  accent: string,
): string {
  switch (treatment) {
    case 'thin-rule':
      return `
        .editorial-header .accent-rule {
          border: none;
          border-top: 1px solid var(--e-rule);
          margin: 8px 0;
        }
        .editorial-header .accent-rule-bottom {
          border-top: 2px solid ${accent};
          margin: 16px 0 16px;
          width: 64px;
        }
      `;
    case 'vertical-bar':
      return `
        .editorial-header.layout-stacked,
        .editorial-header.layout-split .header-main,
        .editorial-header.layout-overlap .header-main {
          position: relative;
          padding-left: 16px;
        }
        .editorial-header.layout-stacked::before,
        .editorial-header.layout-split .header-main::before,
        .editorial-header.layout-overlap .header-main::before {
          content: '';
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 3px;
          background: ${accent};
        }
      `;
    case 'marker-highlight':
      return `
        .editorial-header .name {
          display: inline;
          background: linear-gradient(to bottom, transparent 65%, ${accent}33 65%);
          padding: 0 4px;
        }
      `;
    case 'ornament':
      return `
        .editorial-header .name::after {
          content: ' ✦';
          color: ${accent};
          font-size: 0.4em;
          vertical-align: super;
          margin-left: 4px;
        }
      `;
    case 'number-prefix':
      return `
        .editorial-header .kicker::before {
          content: '';
          display: inline-block;
          width: 24px;
          height: 1px;
          background: ${accent};
          vertical-align: middle;
          margin-right: 8px;
        }
      `;
  }
}

function getSectionTreatmentCSS(
  treatment: EditorialTokens['sectionTreatment'],
  colors: CVDesignTokens['colors'],
  _scaleVars: string,
): string {
  switch (treatment) {
    case 'numbered':
      return `
        .editorial-section .section-title {
          font-size: calc(var(--e-hero) * 0.42);
          font-weight: 700;
          letter-spacing: -0.01em;
          border-bottom: 1px solid var(--e-rule);
          padding-bottom: 8px;
        }
      `;
    case 'kicker':
      return `
        .editorial-section::before {
          display: block;
          content: attr(data-section);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: var(--e-small);
          color: ${colors.accent};
          font-weight: 600;
          margin-bottom: 4px;
          font-family: var(--e-font-body);
        }
        .editorial-section .section-title {
          font-size: calc(var(--e-hero) * 0.5);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
        }
      `;
    case 'sidenote':
      return `
        .editorial-section {
          display: grid;
          /* Widened from 110px to fit "EXPERIENCE" / "CERTIFICATIONS" at
             uppercase + letter-spacing. Shorter labels (PROFILE, SKILLS)
             still right-align cleanly. */
          grid-template-columns: 160px 1fr;
          gap: 24px;
          align-items: start;
        }
        .editorial-section .section-title {
          font-size: calc(var(--e-item-title) * 0.95);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 600;
          color: ${colors.accent};
          border-right: 1px solid var(--e-rule);
          padding-right: 16px;
          text-align: right;
          /* Prevent the section-number prefix from forcing a second line —
             keep label and number on one line where they fit. */
          line-height: 1.25;
        }
        /* In sidenote, the title IS the kicker — section-number prefix is
           redundant and adds width that risks overflow. Hide it. */
        .editorial-treatment-sidenote .editorial-section .section-title .section-number {
          display: none;
        }
        .editorial-section > *:not(.section-title) {
          grid-column: 2;
        }
      `;
    case 'drop-cap':
      return `
        .editorial-section .section-title {
          font-size: calc(var(--e-hero) * 0.38);
          font-weight: 600;
          font-style: italic;
          color: var(--e-section-title);
        }
      `;
    case 'pull-quote':
      return `
        .editorial-section .section-title {
          font-size: calc(var(--e-hero) * 0.4);
          font-weight: 700;
          border-bottom: 2px solid ${colors.accent};
          padding-bottom: 6px;
          display: inline-block;
        }
      `;
  }
}

function getDividerCSS(
  divider: EditorialTokens['divider'],
  colors: CVDesignTokens['colors'],
): string {
  switch (divider) {
    case 'hairline':
      return `
        .editorial-section + .editorial-section {
          border-top: 1px solid var(--e-rule);
          padding-top: 32px;
        }
      `;
    case 'double-rule':
      return `
        .editorial-section + .editorial-section {
          border-top: 3px double var(--e-rule);
          padding-top: 28px;
        }
      `;
    case 'ornament':
      return `
        .editorial-section + .editorial-section {
          position: relative;
          padding-top: 40px;
        }
        /* Print-safe centered ornament: width 20px, margin-left -10px instead
           of transform: translateX. */
        .editorial-section + .editorial-section::before {
          content: '✦';
          position: absolute;
          top: 16px;
          left: 50%;
          margin-left: -10px;
          width: 20px;
          text-align: center;
          color: ${colors.accent};
          font-size: 14px;
        }
      `;
    case 'whitespace-large':
      return `
        .editorial-section { margin-top: 64px; }
      `;
    case 'none':
    default:
      return '';
  }
}

// ============ Archetype-specific CSS ============

function getArchetypeCSS(archetype: EditorialLayoutArchetype): string {
  switch (archetype) {
    case 'magazine-column':
      return `
        .editorial-archetype-magazine-column .editorial-body {
          max-width: 64ch;
          margin: 0 auto;
        }
        .editorial-archetype-magazine-column .editorial-main {
          display: block;
        }
      `;

    case 'editorial-spread':
      return `
        /* Two-column with a left margin-notes column. Even when grid is
           asymmetric-*, we override layout here so the spread always has its
           characteristic left gutter for marginalia. */
        .editorial-archetype-editorial-spread .editorial-body {
          display: block;
        }
        .editorial-archetype-editorial-spread .editorial-section {
          display: grid;
          grid-template-columns: 88px 1fr;
          column-gap: 28px;
          row-gap: 0;
        }
        .editorial-archetype-editorial-spread .editorial-section > * {
          grid-column: 2;
        }
        .editorial-archetype-editorial-spread .editorial-section .item {
          position: relative;
        }
        .editorial-archetype-editorial-spread .editorial-section .margin-note {
          grid-column: 1;
          font-family: var(--e-font-body);
          font-size: var(--e-small);
          color: var(--e-design);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          text-align: right;
          padding-top: 4px;
          margin-top: 0;
          line-height: 1.3;
        }
        /* Marginalia for items: place period flush-right in left column */
        .editorial-archetype-editorial-spread .item > .margin-note {
          position: absolute;
          left: -116px;
          top: 2px;
          width: 88px;
          padding: 0;
          text-align: right;
        }
      `;

    case 'asymmetric-feature':
      return `
        /* Hero band header + offset main column. The header CSS already
           handles the band; here we offset the body grid. */
        .editorial-archetype-asymmetric-feature .editorial-body {
          display: block;
          padding-left: 4%;
          padding-right: 4%;
        }
        .editorial-archetype-asymmetric-feature .editorial-section {
          max-width: 68ch;
        }
        .editorial-archetype-asymmetric-feature .editorial-section[data-index="1"] .section-title,
        .editorial-archetype-asymmetric-feature .editorial-section[data-index="2"] .section-title {
          font-size: calc(var(--e-hero) * 0.55);
        }
      `;

    case 'feature-sidebar':
      return `
        /* Dense main column + tinted skills/certs rail. Force a 2-col grid
           even if the AI picked manuscript. */
        .editorial-archetype-feature-sidebar .editorial-body {
          display: grid;
          grid-template-columns: 1fr 230px;
          gap: 40px;
          align-items: start;
          max-width: none;
        }
        .editorial-archetype-feature-sidebar .editorial-main {
          min-width: 0;
        }
        .editorial-archetype-feature-sidebar .editorial-rail {
          background: var(--e-secondary);
          padding: 24px 22px;
          border-radius: 4px;
          border-top: 4px solid var(--e-accent);
        }
        .editorial-archetype-feature-sidebar .editorial-rail .section-title {
          font-size: calc(var(--e-item-title) * 1.05);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          border: none;
          padding: 0;
          color: var(--e-design);
        }
        .editorial-archetype-feature-sidebar .editorial-rail .editorial-inline-list {
          flex-direction: column;
          gap: 4px 0;
        }
        .editorial-archetype-feature-sidebar .editorial-rail .skills-editorial {
          grid-template-columns: 1fr;
          gap: 12px 0;
        }
      `;

    case 'manuscript-mono':
      return `
        /* Classic manuscript: centered, narrow, optical type. */
        .editorial-archetype-manuscript-mono .editorial-body {
          max-width: 58ch;
          margin: 0 auto;
          display: block;
        }
        .editorial-archetype-manuscript-mono .editorial-section {
          margin-top: 56px;
        }
        .editorial-archetype-manuscript-mono .editorial-section .section-title {
          text-align: center;
          font-style: italic;
        }
        .editorial-archetype-manuscript-mono .editorial-section + .editorial-section::before {
          left: 50%;
          transform: none;
          margin-left: -6px;
        }
      `;

    // ============ v4: cover-feature ============
    //
    // Magazine cover with hero portrait, oversized title, lede on cover.
    // The header scales up dramatically (uses --e-heading-scale), the
    // portrait dominates one side, and the body sits beneath in a compact
    // single column. Asymmetric offset on the name (--e-asym-offset) lifts
    // the type away from the portrait.
    case 'cover-feature':
      return `
        .editorial-archetype-cover-feature {
          padding: 0;
        }
        .editorial-archetype-cover-feature .editorial-header {
          padding: 56px 56px 28px;
          border-bottom: 4px solid var(--e-primary);
          position: relative;
          margin-bottom: 36px;
        }
        .editorial-archetype-cover-feature .editorial-header .kicker {
          font-size: var(--e-kicker);
          letter-spacing: 0.28em;
          margin-bottom: 18px;
        }
        .editorial-archetype-cover-feature .editorial-header .name,
        .editorial-archetype-cover-feature .editorial-header .name-stack {
          font-size: calc(var(--e-hero) * var(--e-heading-scale) / 1.7);
          line-height: 0.92;
          letter-spacing: -0.03em;
          margin: 0;
          padding-left: var(--e-asym-offset);
        }
        .editorial-archetype-cover-feature .editorial-header .name-tagline {
          margin-top: 18px;
          padding-left: var(--e-asym-offset);
        }
        .editorial-archetype-cover-feature .editorial-header .headline {
          font-family: var(--e-font-heading);
          font-size: calc(var(--e-body) * 1.4);
          font-style: italic;
          color: var(--e-design);
          max-width: 56ch;
          margin: 18px 0 0;
          padding-left: var(--e-asym-offset);
          line-height: 1.3;
        }
        .editorial-archetype-cover-feature .editorial-header .portrait {
          position: absolute;
          right: 56px;
          top: 56px;
          width: 180px;
          height: 220px;
          object-fit: cover;
          border: 4px solid var(--e-primary);
        }
        .editorial-archetype-cover-feature .editorial-header .contact-strip {
          margin-top: 24px;
          padding-left: var(--e-asym-offset);
        }
        .editorial-archetype-cover-feature .editorial-body {
          padding: 0 56px 56px;
          max-width: 68ch;
          margin: 0 auto;
        }
        .editorial-archetype-cover-feature .editorial-section {
          margin-top: 32px;
        }
        .editorial-archetype-cover-feature .editorial-section .section-title {
          font-size: calc(var(--e-h2) * 1.05);
          border-top: 1px solid var(--e-rule);
          padding-top: 14px;
          margin-bottom: 14px;
        }
      `;

    // ============ v4: index-card ============
    //
    // Library catalog aesthetic. Each section sits in its own boxed cell
    // with small-caps tabs. Dense paragraph layouts, librarian feel. No
    // sidebar — index cards stack. The body is wider than typical editorial
    // to accommodate the tab affordance.
    case 'index-card':
      return `
        .editorial-archetype-index-card {
          padding: 36px 40px 40px;
        }
        .editorial-archetype-index-card .editorial-header {
          margin-bottom: 28px;
          padding: 20px 24px;
          border: 2px solid var(--e-primary);
          background: var(--e-page-bg);
          position: relative;
        }
        .editorial-archetype-index-card .editorial-header::before {
          content: '';
          position: absolute;
          left: 24px;
          right: 24px;
          top: -4px;
          height: 2px;
          background: var(--e-design);
        }
        .editorial-archetype-index-card .editorial-header .kicker {
          margin-bottom: 8px;
          font-size: var(--e-small);
          letter-spacing: 0.22em;
        }
        .editorial-archetype-index-card .editorial-header .name,
        .editorial-archetype-index-card .editorial-header .name-stack {
          font-size: calc(var(--e-h1) * var(--e-heading-scale) / 1.7);
          line-height: 1;
          margin: 0;
        }
        .editorial-archetype-index-card .editorial-header .name-tagline {
          margin-top: 6px;
          font-size: var(--e-small);
          letter-spacing: 0.18em;
        }
        .editorial-archetype-index-card .editorial-header .contact-strip {
          margin-top: 14px;
          font-size: var(--e-small);
        }
        .editorial-archetype-index-card .editorial-body {
          display: block;
        }
        .editorial-archetype-index-card .editorial-section {
          margin: 0 0 16px;
          padding: 16px 20px 14px;
          border: 1.5px solid var(--e-rule-strong);
          background: var(--e-page-bg);
          position: relative;
        }
        .editorial-archetype-index-card .editorial-section::before {
          /* Tab affordance — small caps label glued to the top edge */
          content: attr(data-section);
          position: absolute;
          top: -10px;
          left: 18px;
          background: var(--e-page-bg);
          padding: 0 10px;
          font-family: var(--e-font-body);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: var(--e-small);
          color: var(--e-muted);
        }
        .editorial-archetype-index-card .editorial-section .section-title {
          display: none;
        }
        .editorial-archetype-index-card .editorial-section .item {
          margin-bottom: 10px;
        }
        .editorial-archetype-index-card .editorial-section .item-title {
          font-size: calc(var(--e-body) * 1.05);
          margin: 0;
        }
        .editorial-archetype-index-card .editorial-section .item-subtitle,
        .editorial-archetype-index-card .editorial-section .item-meta {
          font-size: var(--e-small);
          color: var(--e-muted);
          margin: 0;
        }
        .editorial-archetype-index-card .editorial-section .item-body {
          font-size: var(--e-small);
          margin-top: 4px;
        }
        .editorial-archetype-index-card .editorial-section .item-body ul {
          padding-left: 16px;
          margin: 4px 0;
        }
      `;
  }
}

// ============ Decoration layer CSS ============
//
// Each decor element gets its own CSS block. Activated by the
// `.editorial-decor-<element>` class on the root .editorial-cv container.

function getDecorCSS(
  e: EditorialTokens,
  colors: CVDesignTokens['colors'],
  sectionTitleColor: string,
  designColor: string,
  secondaryColor: string,
): string {
  let css = '';

  // Decorative numerals — big chapter numbers next to section titles
  css += `
    .editorial-decor-decorative-numerals .editorial-section .decor-numeral {
      display: inline-block;
      font-family: var(--e-font-heading);
      font-size: var(--e-decor-numeral);
      line-height: 0.9;
      color: ${designColor};
      font-weight: 700;
      letter-spacing: -0.02em;
      vertical-align: -0.18em;
      margin-right: 14px;
      opacity: 0.95;
    }
    /* When decorative numerals are active, suppress the small section-number prefix */
    .editorial-decor-decorative-numerals .editorial-section .section-number {
      display: none;
    }
    .editorial-decor-decorative-numerals .editorial-section .section-title {
      display: flex;
      align-items: baseline;
      gap: 0;
    }
  `;

  // Kicker labels — small caps kicker line above the title
  css += `
    .editorial-decor-kicker-labels .editorial-section::before {
      display: block;
      content: attr(data-section);
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: var(--e-kicker);
      color: ${designColor};
      font-weight: 600;
      margin-bottom: 6px;
      font-family: var(--e-font-body);
    }
  `;

  // Colored section titles — title in the design color
  css += `
    .editorial-decor-colored-section-titles .editorial-section .section-title-label {
      color: ${sectionTitleColor};
    }
    .editorial-decor-colored-section-titles .editorial-section .section-title {
      color: ${sectionTitleColor};
    }
  `;

  // Rule ornaments — additional ✦ on dividers
  if (e.divider !== 'ornament') {
    // If ornament wasn't the chosen divider, layer one on anyway
    css += `
      .editorial-decor-rule-ornaments .editorial-section + .editorial-section {
        position: relative;
      }
      .editorial-decor-rule-ornaments .editorial-section + .editorial-section .section-title::before {
        content: '✦';
        display: block;
        text-align: center;
        color: ${colors.accent};
        font-size: 12px;
        margin-bottom: 12px;
        font-weight: normal;
      }
    `;
  }

  // First-line emphasis on summary
  css += `
    .editorial-decor-first-line-emphasis .has-first-line-emphasis .first-line {
      font-family: var(--e-font-heading);
      font-size: calc(var(--e-body) * 1.35);
      line-height: 1.35;
      color: var(--e-primary);
      font-weight: 500;
      letter-spacing: -0.005em;
    }
  `;

  // Pull-quote styling tweak when active via decor (vs sectionTreatment)
  // The blockquote already exists; lift its color/weight a notch
  css += `
    .editorial-decor-pull-quote .pull-quote {
      border-left-color: ${designColor};
      color: var(--e-primary);
    }
  `;

  // Marginalia — fallback if archetype isn't editorial-spread but decor is
  // set (shouldn't happen — normalize strips it — but guard anyway)
  css += `
    .editorial-decor-marginalia .item > .margin-note {
      font-family: var(--e-font-body);
      font-size: var(--e-small);
      color: ${designColor};
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
  `;

  // ============ Treatment ↔ decor conflict resolution =============
  // Three incompatible combinations were producing visible overlap / dupes:
  //
  //  1. sidenote treatment puts the section title in a narrow 110px left
  //     column. Layering a 36-56pt decorative numeral on top overflows the
  //     column and crashes into the item content. Hide the numeral here.
  //  2. sidenote treatment is already a kicker-style affordance — adding
  //     the kicker-labels decor produces a duplicate kicker line.
  //  3. kicker treatment already renders the section name as a kicker via
  //     ::before. Layering kicker-labels on top duplicates it.
  //
  // These overrides are defensive: normalize() in the expert also strips the
  // conflicting decor for new generations, but already-stored CVs need this.
  css += `
    .editorial-treatment-sidenote .editorial-section .decor-numeral { display: none; }
    .editorial-treatment-sidenote.editorial-decor-kicker-labels .editorial-section::before,
    .editorial-treatment-kicker.editorial-decor-kicker-labels .editorial-section::before {
      display: none;
    }
  `;

  // Multi-color policy hints — give the accent and secondaryColor visible
  // moments on the page beyond just the section titles. A second-color
  // underline under the name, secondaryColor for the section-number, etc.
  if (e.colorPolicy === 'duotone' || e.colorPolicy === 'tritone') {
    css += `
      .editorial-policy-duotone .editorial-header .accent-rule-bottom,
      .editorial-policy-tritone .editorial-header .accent-rule-bottom {
        width: 96px;
        border-top-width: 3px;
      }
      .editorial-policy-duotone .section-number,
      .editorial-policy-tritone .section-number {
        color: ${colors.accent};
      }
    `;
  }
  if (e.colorPolicy === 'tritone' && e.secondaryColor) {
    css += `
      .editorial-policy-tritone .item-body ul li::before {
        color: ${secondaryColor};
      }
      .editorial-policy-tritone .skills-editorial .group-label {
        color: ${secondaryColor};
      }
      .editorial-policy-tritone .section-number {
        color: ${secondaryColor};
      }
    `;
  }

  return css;
}

// ============ Utility / Overrides ============

function getOverride(
  overrides: CVElementOverrides | null | undefined,
  elementId: string,
): ElementOverride | undefined {
  return overrides?.overrides.find((o) => o.elementId === elementId);
}

function getOverrideStyle(override: ElementOverride | undefined): string {
  if (!override) return '';
  const styles: string[] = [];
  if (override.colorOverride) styles.push(`color: ${override.colorOverride}`);
  if (override.backgroundOverride) styles.push(`background-color: ${override.backgroundOverride}`);
  return styles.join('; ');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c] || c);
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============ Protection (preview watermark) ============

function buildProtection(enabled: boolean, watermarkText: string): {
  css: string;
  watermark: string;
  script: string;
} {
  if (!enabled) {
    return { css: '', watermark: '', script: '' };
  }
  return {
    css: `
      body { -webkit-user-select: none; user-select: none; }
      .watermark-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 9999; overflow: hidden;
      }
      .watermark-pattern {
        position: absolute; top: -50%; left: -50%;
        width: 200%; height: 200%;
        display: flex; flex-wrap: wrap;
        justify-content: space-around; align-content: space-around;
      }
      .watermark-text {
        font-family: Arial, sans-serif;
        font-size: 24px; font-weight: bold;
        color: rgba(128, 128, 128, 0.08);
        white-space: nowrap; padding: 40px 60px;
        letter-spacing: 4px;
      }
    `,
    watermark: `
      <div class="watermark-overlay">
        <div class="watermark-pattern">
          ${Array(50).fill(`<span class="watermark-text">${escapeHtml(watermarkText)}</span>`).join('')}
        </div>
      </div>
    `,
    script: `
      <script>
        document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        document.addEventListener('copy', function(e) { e.preventDefault(); });
        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey && (e.key === 'c' || e.key === 's' || e.key === 'p')) e.preventDefault();
        });
      </script>
    `,
  };
}
