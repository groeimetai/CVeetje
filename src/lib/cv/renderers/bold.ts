/**
 * Bold CV Renderer
 *
 * Self-contained renderer for experimental-level CVs. Produces Canva/Linear/
 * Notion-inspired layouts with saturated colors, gradients, iconography,
 * skill bars and colored sidebars.
 *
 * Design principles:
 * - Print-safe: no transforms, no clip-path. Uses `print-color-adjust: exact`
 *   so saturated backgrounds survive Puppeteer PDF export
 * - WYSIWYG: identical HTML for preview and PDF
 * - Agent-driven: 8 orthogonal primitives (headerLayout × sidebarStyle ×
 *   skillStyle × photoTreatment × accentShape × iconTreatment ×
 *   headingStyle × gradientDirection) that the renderer composes freely
 * - Structural color (sidebars, bands, badges) instead of floating decorations
 *   — that was the core problem with the previous experimental renderer
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
  BoldTokens,
  BoldHeadingStyle,
  BoldAccentShape,
  BoldSidebarStyle,
  BoldPhotoTreatment,
  BoldSkillStyle,
  BoldLayoutArchetype,
  BoldBackgroundNumeral,
  BoldMarginaliaStyle,
  BoldNameTreatment,
  BoldBodyDensity,
  BoldAsymmetryStrength,
} from '@/types/design-tokens';
import { getFontUrls, fontPairings } from '../templates/themes';
import { splitInterest } from '../interest-format';
import { buildEditBridgeMarkup } from '../edit-bridge';

// ============ Public API ============

export interface BoldHTMLOptions {
  previewProtection?: boolean;
  watermarkText?: string;
  /** PDF mode — skip click-to-edit bridge (contenteditable + hover outlines). */
  forPdf?: boolean;
}

export function generateBoldHTML(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  fullName: string,
  avatarUrl?: string | null,
  headline?: string | null,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null,
  options?: BoldHTMLOptions,
): string {
  const bold = resolveBoldTokens(tokens);
  const fontUrls = getFontUrls(tokens.fontPairing);
  const fontConfig = fontPairings[tokens.fontPairing];

  const previewProtection = options?.previewProtection ?? false;
  const watermarkText = options?.watermarkText ?? 'PREVIEW';

  const protection = buildProtection(previewProtection, watermarkText);

  // Generate base CSS shared by all archetypes, plus archetype-specific CSS.
  const baseCss = generateBoldCSS(tokens, bold, fontConfig);
  const archetypeCss = generateArchetypeCSS(bold, tokens);

  // Dispatch on archetype — each archetype owns its own DOM skeleton.
  const body = renderArchetypeBody(
    bold.layoutArchetype,
    content,
    tokens,
    bold,
    fullName,
    headline,
    avatarUrl,
    overrides,
    contactInfo,
  );

  return `<!DOCTYPE html>
<!-- Generated with AI assistance by CVeetje (cveetje.nl) — bold renderer (archetype: ${bold.layoutArchetype}) -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullName)} — CV</title>
  ${fontUrls.map(url => `<link rel="stylesheet" href="${url}">`).join('\n  ')}
  <style>
    ${baseCss}
    ${archetypeCss}
    ${protection.css}
  </style>
</head>
<body>
  ${protection.watermark}
  ${body}
  ${protection.script}
  ${buildEditBridgeMarkup({ forPdf: options?.forPdf })}
</body>
</html>`;
}

// ============ Archetype dispatcher ============

function renderArchetypeBody(
  archetype: BoldLayoutArchetype,
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  let html: string;
  switch (archetype) {
    case 'manifesto':
      html = renderManifesto(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'magazine-cover':
      html = renderMagazineCover(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'editorial-inversion':
      html = renderEditorialInversion(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'brutalist-grid':
      html = renderBrutalistGrid(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'vertical-rail':
      html = renderVerticalRail(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'mosaic':
      html = renderMosaic(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'typographic-poster':
      html = renderTypographicPoster(content, tokens, b, fullName, headline, overrides, contactInfo);
      break;
    case 'photo-montage':
      html = renderPhotoMontage(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
      break;
    case 'sidebar-canva':
    default:
      html = renderSidebarCanva(content, tokens, b, fullName, headline, avatarUrl, overrides, contactInfo);
  }
  // Clean up the SECTION_NUMBER placeholder for any path that didn't
  // explicitly replace it (only sidebar-canva's `wrapBoldSection` does
  // the per-section replacement; archetypes do it inline but extras /
  // skills sections that call `sectionTitle()` directly need this).
  return html.replace(/<!--SECTION_NUMBER-->/g, '');
}

// ============ Sidebar-canva archetype (legacy default) ============

function renderSidebarCanva(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const header = generateBoldHeader(
    fullName,
    headline,
    avatarUrl,
    tokens,
    b,
    overrides,
    contactInfo,
  );
  const sidebar = generateBoldSidebar(content, tokens, b, overrides, avatarUrl, contactInfo);
  const main = generateBoldMain(content, tokens, b, overrides);
  const sidebarSide = tokens.layout === 'sidebar-right' ? 'right' : 'left';
  return `<div class="bold-cv archetype-sidebar-canva bold-sidebar-${sidebarSide} bold-header-${b.headerLayout} bold-sidebar-style-${b.sidebarStyle}">
    ${header}
    <div class="bold-body">
      ${sidebarSide === 'left' ? sidebar + main : main + sidebar}
    </div>
  </div>`;
}

// ============ Resolve Bold Tokens ============

function resolveBoldTokens(tokens: CVDesignTokens): Required<Pick<
  BoldTokens,
  | 'headerLayout' | 'sidebarStyle' | 'skillStyle' | 'photoTreatment'
  | 'accentShape' | 'iconTreatment' | 'headingStyle' | 'gradientDirection'
  | 'surfaceTexture' | 'layoutArchetype' | 'columnCount'
  | 'backgroundNumeral' | 'marginalia' | 'paletteSaturation'
  | 'manifestoOpener'
  | 'nameTreatment' | 'headingScaleRatio' | 'bodyDensity' | 'asymmetryStrength'
>> & Pick<BoldTokens, 'posterLine' | 'posterLineSource' | 'accentKeywords' | 'heroNumeralValue' | 'conceptStatement' | 'conceptMotif' | 'paletteRule'> {
  const b = tokens.bold;
  return {
    headerLayout: b?.headerLayout ?? 'hero-band',
    sidebarStyle: b?.sidebarStyle ?? 'solid-color',
    skillStyle: b?.skillStyle ?? 'bars-gradient',
    photoTreatment: b?.photoTreatment ?? 'circle-halo',
    accentShape: b?.accentShape ?? 'colored-badge',
    iconTreatment: b?.iconTreatment ?? 'solid-filled',
    headingStyle: b?.headingStyle ?? 'oversized-numbered',
    gradientDirection: b?.gradientDirection ?? 'linear-diagonal',
    surfaceTexture: b?.surfaceTexture ?? 'none',
    layoutArchetype: b?.layoutArchetype ?? 'sidebar-canva',
    columnCount: b?.columnCount ?? 2,
    backgroundNumeral: b?.backgroundNumeral ?? 'none',
    marginalia: b?.marginalia ?? 'none',
    paletteSaturation: b?.paletteSaturation ?? 'duotone',
    manifestoOpener: b?.manifestoOpener ?? false,
    // v4 content-driven primitives
    nameTreatment: b?.nameTreatment ?? 'unified',
    headingScaleRatio: typeof b?.headingScaleRatio === 'number'
      ? Math.max(1.0, Math.min(4.0, b.headingScaleRatio))
      : 1.8,
    bodyDensity: b?.bodyDensity ?? 'normal',
    asymmetryStrength: b?.asymmetryStrength ?? 'subtle',
    posterLine: b?.posterLine,
    posterLineSource: b?.posterLineSource,
    accentKeywords: b?.accentKeywords,
    heroNumeralValue: b?.heroNumeralValue,
    conceptStatement: b?.conceptStatement,
    conceptMotif: b?.conceptMotif,
    paletteRule: b?.paletteRule,
  };
}

// ============ CSS ============

function generateBoldCSS(
  tokens: CVDesignTokens,
  b: BoldTokens,
  fontConfig: typeof fontPairings[keyof typeof fontPairings],
): string {
  const colors = tokens.colors;
  const pageBg = tokens.pageBackground || '#ffffff';
  const sidebarTextColor = isSidebarLightText(b.sidebarStyle) ? '#ffffff' : colors.text;
  const sidebarMutedText = isSidebarLightText(b.sidebarStyle)
    ? 'rgba(255,255,255,0.75)'
    : colors.muted;

  const gradientDecl = buildGradient(b.gradientDirection, colors);
  const sidebarFill = buildSidebarFill(b.sidebarStyle, colors, gradientDecl);

  // v4: typography rhythm CSS values derived from new tokens
  const ratio = typeof b.headingScaleRatio === 'number'
    ? Math.max(1.0, Math.min(4.0, b.headingScaleRatio))
    : 1.8;
  const bodyDensityCss = bodyDensityValues(b.bodyDensity ?? 'normal');
  const asymCss = asymmetryValues(b.asymmetryStrength ?? 'subtle');

  return `
    :root {
      --b-primary: ${colors.primary};
      --b-secondary: ${colors.secondary};
      --b-accent: ${colors.accent};
      --b-text: ${colors.text};
      --b-muted: ${colors.muted};
      --b-page-bg: ${pageBg};
      --b-sidebar-text: ${sidebarTextColor};
      --b-sidebar-muted: ${sidebarMutedText};
      --b-font-heading: ${fontConfig.heading.family};
      --b-font-body: ${fontConfig.body.family};
      --b-gradient: ${gradientDecl};
      /* v4: typography rhythm — used by archetype CSS for heading sizing */
      --b-heading-scale: ${ratio.toFixed(2)};
      --b-body-leading: ${bodyDensityCss.leading};
      --b-body-tracking: ${bodyDensityCss.tracking};
      --b-asym-offset: ${asymCss.offset};
      --b-asym-rotation: ${asymCss.rotation};
    }

    * { box-sizing: border-box; }

    /* Force color-accurate printing — critical for Puppeteer PDF export */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--b-page-bg);
      color: var(--b-text);
      font-family: var(--b-font-body);
      font-size: 10.5pt;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .bold-cv {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      /* No base min-height — content drives the CV height. Archetype-specific
         CSS may still set its own min-height (e.g. vertical-rail needs it).
         Forcing a base min-height here padded sparse CVs with empty space
         in single-page PDF export. */
      position: relative;
      overflow: hidden;
    }

    /* ================= Header variants ================= */
    ${getHeaderCSS(b, colors)}

    /* ================= Name treatment + accent highlights (v4) ================= */
    ${nameTreatmentCSS()}

    /* ================= Surface texture overlay ================= */
    ${getSurfaceTextureCSS(b.surfaceTexture, colors)}

    /* ================= Body density applied to body text ================= */
    body { line-height: var(--b-body-leading); letter-spacing: var(--b-body-tracking); }

    /* ================= Body split ================= */

    .bold-body {
      display: grid;
      gap: 0;
      align-items: stretch;
    }

    .bold-sidebar-left .bold-body {
      grid-template-columns: 260px 1fr;
    }
    .bold-sidebar-right .bold-body {
      grid-template-columns: 1fr 260px;
    }

    /* ================= Sidebar ================= */

    .bold-sidebar {
      padding: 28px 24px;
      color: var(--b-sidebar-text);
      ${sidebarFill}
    }

    .bold-sidebar h2 {
      color: var(--b-sidebar-text);
      font-family: var(--b-font-heading);
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin: 0 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${isSidebarLightText(b.sidebarStyle) ? 'rgba(255,255,255,0.4)' : colors.accent};
    }
    .bold-sidebar .sidebar-section + .sidebar-section {
      margin-top: 24px;
    }
    .bold-sidebar p,
    .bold-sidebar li,
    .bold-sidebar .skill-row {
      font-size: 9.5pt;
    }
    .bold-sidebar ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .bold-sidebar ul li { margin: 4px 0; }
    .bold-sidebar .interest-context {
      opacity: 0.7;
      font-size: 0.92em;
    }

    /* Contact block in sidebar */
    .bold-sidebar .contact-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 6px 0;
      color: var(--b-sidebar-text);
      word-break: break-word;
    }
    .bold-sidebar .contact-list a {
      color: var(--b-sidebar-text);
      text-decoration: none;
    }
    .bold-sidebar .contact-list .icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: ${isSidebarLightText(b.sidebarStyle) ? '#ffffff' : colors.accent};
    }

    /* Photo treatments (sidebar + header) */
    ${getPhotoCSS(b.photoTreatment, colors)}

    /* Sidebar photo (when photo-hero sidebar) */
    .bold-sidebar-style-photo-hero .bold-sidebar .sidebar-photo-hero {
      margin: -28px -24px 20px;
      height: 260px;
      background-size: cover;
      background-position: center;
      position: relative;
    }
    .bold-sidebar-style-photo-hero .bold-sidebar .sidebar-photo-hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4) 100%);
    }

    /* ================= Main ================= */

    .bold-main {
      padding: 28px 32px;
      background: var(--b-page-bg);
    }

    .bold-section {
      margin-bottom: 28px;
      break-inside: avoid;
    }
    .bold-section:last-child { margin-bottom: 0; }

    /* Section heading styles */
    ${getHeadingCSS(b.headingStyle, colors)}

    /* Accent shapes (applied to section headings / items) */
    ${getAccentShapeCSS(b.accentShape, colors)}

    .bold-item {
      margin-bottom: 18px;
      break-inside: avoid;
    }
    .bold-item:last-child { margin-bottom: 0; }

    .bold-item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 4px;
    }
    /* Let the title/subtitle column shrink properly so a long job title
       doesn't push the period chip to the next line. min-width:0 is the
       flexbox-specific incantation for "allow children to shrink below
       their intrinsic minimum content size". */
    .bold-item-header > div:first-child {
      min-width: 0;
      flex: 1 1 auto;
    }
    .bold-item-title {
      font-family: var(--b-font-heading);
      font-size: 12pt;
      font-weight: 700;
      color: var(--b-text);
      margin: 0;
      overflow-wrap: anywhere;
    }
    .bold-item-subtitle {
      font-family: var(--b-font-body);
      font-size: 10.5pt;
      color: var(--b-accent);
      font-weight: 600;
      margin: 0;
    }
    .bold-item-period {
      font-family: var(--b-font-body);
      font-size: 9pt;
      color: var(--b-muted);
      font-weight: 500;
      letter-spacing: 0.04em;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .bold-item-body {
      margin-top: 4px;
    }
    .bold-item-body p {
      margin: 4px 0;
      color: var(--b-text);
      font-size: 10pt;
    }
    .bold-item-body ul {
      margin: 6px 0;
      padding: 0;
      list-style: none;
    }
    .bold-item-body ul li {
      padding-left: 20px;
      position: relative;
      margin: 4px 0;
      font-size: 10pt;
      color: var(--b-text);
    }
    .bold-item-body ul li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 8px;
      height: 8px;
      background: var(--b-accent);
      border-radius: 50%;
    }

    /* ================= Skills variants ================= */
    ${getSkillsCSS(b.skillStyle, b.sidebarStyle, colors)}

    /* Always-on base for .skill-pill + .skill-tags so that archetypes
       which emit pill chips REGARDLESS of skillStyle (manifesto extras,
       magazine-cover bottom skills row, photo-montage cards, etc.) still
       render visible separated pills. Without this fallback, when the AI
       picked skillStyle = bars-gradient / dots-rating / icon-tagged, the
       archetype-emitted plain pills got NO styling — text concatenated
       like "PythonRAG-architectuurVector databases..."  */
    .skill-tags { display: flex; flex-wrap: wrap; gap: 6px 8px; }
    .skill-pill {
      display: inline-block;
      background: ${colors.secondary};
      color: ${colors.primary};
      padding: 3px 11px;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 500;
      border: 1px solid ${colors.primary}22;
    }

    /* Contact-strip: flex + gap so items separate regardless of which
       archetype owns the container. Works alongside the inline middle-dot
       separator inserted by buildSimpleContact. */
    .manifesto-contact, .cover-contact, .inv-contact, .rail-contact,
    .tp-contact, .pm-contact, .brut-contact, .mosaic-contact,
    .bold-cv [class$="-contact"] {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      align-items: baseline;
    }
    .contact-sep { opacity: 0.45; padding: 0 2px; }

    /* ================= Icons base ================= */
    ${getIconTreatmentCSS(b.iconTreatment, colors)}

    /* ================= Print =================
       Same fix as editorial.ts — only declare size A4 inside @media print so
       single-page PDF mode (which uses dynamic options.width/height) is not
       paginated at A4 boundaries by Chromium. */
    @page {
      margin: 0;
    }
    @media print {
      @page {
        size: A4;
      }
      html, body {
        background: var(--b-page-bg);
      }
      .bold-cv {
        width: 210mm;
        max-width: 210mm;
        margin: 0;
        min-height: auto;
        overflow: visible;
      }
      /* Only avoid breaking inside items, not whole sections. Avoiding on
         sections caused entire sections to jump to the next A4 page when
         they didn't quite fit at the bottom, leaving large empty bands. */
      .bold-item { break-inside: avoid; }

      /* Page-break defense for contact strips. The previous behaviour
         pushed the contact footer alone onto page 2 when content slightly
         overflowed A4 — wasting a whole sheet. Keeping it with the prior
         section lets Puppeteer pull the contact back onto page 1 when
         there's room. */
      .manifesto-contact, .cover-contact, .inv-contact, .rail-contact,
      .tp-contact, .pm-contact, .brut-contact, .mosaic-contact {
        break-before: avoid;
        break-inside: avoid;
      }

      /* Tighten archetype paddings in print so single-page CVs actually
         fit on a single A4. Screen mode keeps generous spacing. */
      .archetype-manifesto,
      .archetype-magazine-cover,
      .archetype-editorial-inversion,
      .archetype-brutalist-grid,
      .archetype-vertical-rail,
      .archetype-mosaic,
      .archetype-typographic-poster,
      .archetype-photo-montage { padding-bottom: 12px !important; }

      .archetype-manifesto .manifesto-grid,
      .archetype-magazine-cover .cover-body,
      .archetype-editorial-inversion .inv-body { padding-bottom: 10px !important; }

      /* Section margins tighter in print to reclaim 60-100px overall */
      .bold-section { margin-bottom: 18px !important; }
      .bold-item { margin-bottom: 12px !important; }
    }
  `;
}

// ============ Header ============

function getHeaderCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  // Base header rules
  const base = `
    .bold-header {
      color: #ffffff;
    }
    .bold-header .name {
      font-family: var(--b-font-heading);
      font-weight: 800;
      line-height: 1;
      margin: 0;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    .bold-header .headline {
      color: rgba(255,255,255,0.9);
      font-family: var(--b-font-body);
      margin: 10px 0 0;
      font-weight: 500;
    }
    .bold-header .header-contact {
      margin-top: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 18px;
      font-size: 9pt;
      color: rgba(255,255,255,0.85);
    }
    .bold-header .header-contact a { color: #ffffff; text-decoration: none; }
  `;

  switch (b.headerLayout) {
    case 'hero-band':
      return `${base}
        .bold-header.layout-hero-band {
          background: var(--b-gradient);
          padding: 40px 36px 36px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 28px;
          align-items: center;
        }
        .bold-header.layout-hero-band .name { font-size: 34pt; }
        .bold-header.layout-hero-band .headline { font-size: 13pt; }
        .bold-header.layout-hero-band .portrait { flex-shrink: 0; }
      `;

    case 'split-photo':
      return `${base}
        .bold-header.layout-split-photo {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 180px;
        }
        /* When the header has no photo to show, collapse to single column
           so the text block spans the full width instead of leaving an
           empty colored block on the left. */
        .bold-header.layout-split-photo.no-photo {
          display: block;
        }
        .bold-header.layout-split-photo .header-photo-block {
          background: var(--b-accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bold-header.layout-split-photo .header-text-block {
          background: var(--b-gradient);
          padding: 32px 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .bold-header.layout-split-photo .name { font-size: 32pt; }
        .bold-header.layout-split-photo .headline { font-size: 13pt; }
      `;

    case 'tiled':
      return `${base}
        .bold-header.layout-tiled {
          display: grid;
          grid-template-columns: 1fr 1fr 160px;
          gap: 6px;
          padding: 6px;
          background: ${colors.primary};
        }
        .bold-header.layout-tiled .tile {
          padding: 22px 24px;
        }
        .bold-header.layout-tiled .tile-name {
          grid-column: 1 / 3;
          background: var(--b-gradient);
        }
        .bold-header.layout-tiled .tile-photo {
          background: var(--b-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }
        .bold-header.layout-tiled .tile-contact {
          grid-column: 1 / 4;
          background: ${colors.accent};
          padding: 18px 24px;
        }
        .bold-header.layout-tiled .name { font-size: 28pt; }
        .bold-header.layout-tiled .headline { font-size: 12pt; }
      `;

    case 'asymmetric-burst':
      return `${base}
        .bold-header.layout-asymmetric-burst {
          background: var(--b-gradient);
          padding: 44px 36px 60px;
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          align-items: center;
        }
        .bold-header.layout-asymmetric-burst::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 24px;
          background: linear-gradient(180deg, transparent, ${colors.accent});
          opacity: 0.3;
        }
        .bold-header.layout-asymmetric-burst .name { font-size: 38pt; }
        .bold-header.layout-asymmetric-burst .headline { font-size: 14pt; max-width: 38ch; }
      `;
  }
}

function generateBoldHeader(
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  tokens: CVDesignTokens,
  b: BoldTokens,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null,
): string {
  const headerOverride = getOverride(overrides, 'header');
  if (headerOverride?.hidden) return '';

  const nameStyle = getOverrideStyle(getOverride(overrides, 'header-name'));
  const headlineStyle = getOverrideStyle(getOverride(overrides, 'header-headline'));

  // When the sidebar is photo-hero, the sidebar OWNS the portrait — suppressing
  // it in the header prevents the double-photo bug.
  const sidebarOwnsPhoto = b.sidebarStyle === 'photo-hero';
  const showPhoto = tokens.showPhoto && !!avatarUrl && !sidebarOwnsPhoto;

  const nameHtml = `<h1 class="name" data-id="header-name" style="${nameStyle}">${escapeHtml(fullName)}</h1>`;
  const headlineHtml = headline
    ? `<p class="headline" style="${headlineStyle}">${escapeHtml(headline)}</p>`
    : '';
  const contactHtml = buildHeaderContact(contactInfo);
  const portraitHtml = showPhoto ? buildPortrait(avatarUrl!, b.photoTreatment) : '';

  switch (b.headerLayout) {
    case 'hero-band':
      return `
        <header class="bold-header layout-hero-band">
          ${portraitHtml}
          <div>
            ${nameHtml}
            ${headlineHtml}
            ${contactHtml}
          </div>
        </header>
      `;

    case 'split-photo':
      // Fallback when there's no photo to show (user didn't upload, or the
      // photo-hero sidebar has claimed it): skip the photo block entirely
      // and let the text block span the full header. Otherwise we'd render
      // an ugly placeholder circle filling half the header.
      if (!showPhoto) {
        return `
          <header class="bold-header layout-split-photo no-photo">
            <div class="header-text-block">
              ${nameHtml}
              ${headlineHtml}
              ${contactHtml}
            </div>
          </header>
        `;
      }
      return `
        <header class="bold-header layout-split-photo">
          <div class="header-photo-block">
            ${portraitHtml}
          </div>
          <div class="header-text-block">
            ${nameHtml}
            ${headlineHtml}
            ${contactHtml}
          </div>
        </header>
      `;

    case 'tiled':
      return `
        <header class="bold-header layout-tiled">
          <div class="tile tile-name">
            ${nameHtml}
            ${headlineHtml}
          </div>
          <div class="tile tile-photo">
            ${portraitHtml}
          </div>
          <div class="tile tile-contact">
            ${contactHtml}
          </div>
        </header>
      `;

    case 'asymmetric-burst':
      return `
        <header class="bold-header layout-asymmetric-burst">
          <div>
            ${nameHtml}
            ${headlineHtml}
            ${contactHtml}
          </div>
          ${portraitHtml}
        </header>
      `;
  }
}

function buildPortrait(avatarUrl: string, treatment: BoldPhotoTreatment): string {
  return `<div class="portrait portrait-${treatment}"><img src="${escapeHtml(avatarUrl)}" alt="" /></div>`;
}

function buildHeaderContact(contact: CVContactInfo | null | undefined): string {
  if (!contact) return '';
  const items: string[] = [];
  if (contact.email) items.push(`<span>${escapeHtml(contact.email)}</span>`);
  if (contact.phone) items.push(`<span>${escapeHtml(contact.phone)}</span>`);
  if (contact.location) items.push(`<span>${escapeHtml(contact.location)}</span>`);
  if (contact.linkedinUrl) {
    const href = contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : 'https://' + contact.linkedinUrl;
    items.push(`<a href="${escapeHtml(href)}">${escapeHtml(contact.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);
  }
  if (contact.website) {
    const href = contact.website.startsWith('http') ? contact.website : 'https://' + contact.website;
    items.push(`<a href="${escapeHtml(href)}">${escapeHtml(contact.website.replace(/^https?:\/\//, ''))}</a>`);
  }
  if (items.length === 0) return '';
  return `<div class="header-contact">${items.join('')}</div>`;
}

function getPhotoCSS(treatment: BoldPhotoTreatment, colors: CVDesignTokens['colors']): string {
  const base = `
    .portrait img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      width: 120px;
      height: 120px;
      background: ${colors.accent};
      border-radius: 50%;
      opacity: 0.4;
    }
  `;

  switch (treatment) {
    case 'circle-halo':
      return `${base}
        .portrait-circle-halo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          padding: 4px;
          background: #ffffff;
          box-shadow: 0 0 0 4px ${colors.accent};
        }
        .portrait-circle-halo img { border-radius: 50%; }
      `;
    case 'squircle':
      return `${base}
        .portrait-squircle {
          width: 130px;
          height: 130px;
          border-radius: 24px;
          overflow: hidden;
          border: 4px solid #ffffff;
        }
        .portrait-squircle img { border-radius: 20px; }
      `;
    case 'color-overlay':
      return `${base}
        .portrait-color-overlay {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
        }
        .portrait-color-overlay img { border-radius: 50%; }
        .portrait-color-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background: ${colors.primary};
          mix-blend-mode: multiply;
          opacity: 0.25;
          border-radius: 50%;
        }
      `;
    case 'badge-framed':
      // Subtler badge frame — previous double-ring at 10px padding + 6px
      // outer offset looked like a thick goud-clash band around the photo.
      // Now a thin single border in accent, more like a passe-partout.
      return `${base}
        .portrait-badge-framed {
          width: 130px;
          height: 130px;
          background: ${colors.accent};
          padding: 5px;
          border-radius: 4px;
          position: relative;
        }
        .portrait-badge-framed img {
          border-radius: 2px;
        }
      `;
  }
}

// ============ Sidebar ============

function isSidebarLightText(style: BoldSidebarStyle): boolean {
  return style === 'solid-color' || style === 'gradient' || style === 'photo-hero';
}

function buildSidebarFill(
  style: BoldSidebarStyle,
  colors: CVDesignTokens['colors'],
  gradient: string,
): string {
  switch (style) {
    case 'solid-color':
      return `background: ${colors.primary};`;
    case 'gradient':
      return `background: ${gradient};`;
    case 'photo-hero':
      return `background: ${colors.primary};`;
    case 'transparent':
      return `background: ${colors.secondary};`;
  }
}

function generateBoldSidebar(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  overrides: CVElementOverrides | null | undefined,
  avatarUrl?: string | null,
  contactInfo?: CVContactInfo | null,
): string {
  const sections: string[] = [];
  const showPhoto = tokens.showPhoto && !!avatarUrl;

  // Photo-hero variant renders a large photo at the top of the sidebar
  if (b.sidebarStyle === 'photo-hero' && showPhoto) {
    sections.push(`
      <div class="sidebar-photo-hero" style="background-image: url('${escapeHtml(avatarUrl!)}')"></div>
    `);
  }

  if (contactInfo) {
    const contactHtml = buildSidebarContact(contactInfo);
    if (contactHtml) {
      sections.push(`
        <div class="sidebar-section">
          <h2>Contact</h2>
          ${contactHtml}
        </div>
      `);
    }
  }

  // Skills in sidebar
  if (content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0)) {
    if (!getOverride(overrides, 'section-skills')?.hidden) {
      sections.push(`
        <div class="sidebar-section" data-section="skills">
          <h2>Skills</h2>
          ${renderSkills(content.skills, b.skillStyle, overrides)}
        </div>
      `);
    }
  }

  // Languages
  if (content.languages && content.languages.length > 0) {
    if (!getOverride(overrides, 'section-languages')?.hidden) {
      const items = content.languages.map((lang, i) => {
        if (getOverride(overrides, `language-${i}`)?.hidden) return '';
        return `<li data-id="language-${i}">
          <strong>${escapeHtml(lang.language)}</strong>${lang.level ? ` · <span class="lang-level">${escapeHtml(lang.level)}</span>` : ''}
        </li>`;
      }).filter(Boolean).join('');
      sections.push(`
        <div class="sidebar-section" data-section="languages">
          <h2>Languages</h2>
          <ul>${items}</ul>
        </div>
      `);
    }
  }

  // Certifications
  if (content.certifications && content.certifications.length > 0) {
    if (!getOverride(overrides, 'section-certifications')?.hidden) {
      const items = content.certifications.map((c, i) => {
        if (getOverride(overrides, `certification-${i}`)?.hidden) return '';
        return `<li data-id="certification-${i}">${escapeHtml(c)}</li>`;
      }).filter(Boolean).join('');
      sections.push(`
        <div class="sidebar-section" data-section="certifications">
          <h2>Certifications</h2>
          <ul>${items}</ul>
        </div>
      `);
    }
  }

  // Interests
  if (content.interests && content.interests.length > 0) {
    if (!getOverride(overrides, 'section-interests')?.hidden) {
      const items = content.interests.map((interest, i) => {
        if (getOverride(overrides, `interest-${i}`)?.hidden) return '';
        const { name, framing } = splitInterest(interest);
        const framingHtml = framing
          ? `<span class="interest-context"> — ${escapeHtml(framing)}</span>`
          : '';
        return `<li data-id="interest-${i}"><span class="interest-name">${escapeHtml(name)}</span>${framingHtml}</li>`;
      }).filter(Boolean).join('');
      sections.push(`
        <div class="sidebar-section" data-section="interests">
          <h2>Interests</h2>
          <ul>${items}</ul>
        </div>
      `);
    }
  }

  return `<aside class="bold-sidebar">${sections.join('')}</aside>`;
}

function buildSidebarContact(contact: CVContactInfo): string {
  const items: string[] = [];
  const svg = (path: string) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  if (contact.email) {
    items.push(`<li>${svg('<rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />')} <span>${escapeHtml(contact.email)}</span></li>`);
  }
  if (contact.phone) {
    items.push(`<li>${svg('<path d="M22 16.92V21a1 1 0 0 1-1.11 1A19.86 19.86 0 0 1 2 3.11 1 1 0 0 1 3 2h4.09a1 1 0 0 1 1 .75 12.38 12.38 0 0 0 .66 2.47 1 1 0 0 1-.23 1.06l-1.7 1.7a16 16 0 0 0 6.29 6.29l1.7-1.7a1 1 0 0 1 1.06-.23 12.38 12.38 0 0 0 2.47.66 1 1 0 0 1 .76 1Z"/>')} <span>${escapeHtml(contact.phone)}</span></li>`);
  }
  if (contact.location) {
    items.push(`<li>${svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>')} <span>${escapeHtml(contact.location)}</span></li>`);
  }
  if (contact.birthDate) {
    items.push(`<li>${svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>')} <span>${escapeHtml(contact.birthDate)}</span></li>`);
  }
  if (contact.linkedinUrl) {
    const href = contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : 'https://' + contact.linkedinUrl;
    const display = contact.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '');
    items.push(`<li>${svg('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>')} <a href="${escapeHtml(href)}">${escapeHtml(display)}</a></li>`);
  }
  if (contact.github) {
    const href = contact.github.startsWith('http') ? contact.github : 'https://github.com/' + contact.github;
    const display = contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
    items.push(`<li>${svg('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>')} <a href="${escapeHtml(href)}">${escapeHtml(display)}</a></li>`);
  }
  if (contact.website) {
    const href = contact.website.startsWith('http') ? contact.website : 'https://' + contact.website;
    items.push(`<li>${svg('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>')} <a href="${escapeHtml(href)}">${escapeHtml(contact.website.replace(/^https?:\/\//, ''))}</a></li>`);
  }

  if (items.length === 0) return '';
  return `<ul class="contact-list">${items.join('')}</ul>`;
}

// ============ Main ============

function generateBoldMain(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  overrides?: CVElementOverrides | null,
): string {
  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, overrides, b.accentKeywords),
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };

  // Main column never includes sidebar sections
  const sidebarSectionNames = new Set(['skills', 'languages', 'certifications', 'interests']);
  let sectionIndex = 0;
  const sections = tokens.sectionOrder
    .filter((name) => !sidebarSectionNames.has(name))
    .map((name) => {
      const render = sectionRenderers[name];
      if (!render) return '';
      const html = render();
      if (!html) return '';
      sectionIndex += 1;
      return wrapBoldSection(name, html, sectionIndex, b.headingStyle);
    })
    .filter(Boolean)
    .join('');

  return `<main class="bold-main">${sections}</main>`;
}

function wrapBoldSection(
  name: string,
  innerHtml: string,
  index: number,
  headingStyle: BoldHeadingStyle,
): string {
  const prefix = headingStyle === 'oversized-numbered'
    ? `<span class="section-number">${String(index).padStart(2, '0')}</span>`
    : '';
  return `<section class="bold-section" data-section="${name}">${innerHtml.replace('<!--SECTION_NUMBER-->', prefix)}</section>`;
}

function sectionTitle(label: string): string {
  return `<h2 class="bold-section-title"><!--SECTION_NUMBER--><span class="section-title-text">${escapeHtml(label)}</span></h2>`;
}

function renderSummary(
  summary: string,
  overrides?: CVElementOverrides | null,
  accentKeywords?: string[],
): string {
  if (!summary) return '';
  if (getOverride(overrides, 'section-summary')?.hidden) return '';
  if (getOverride(overrides, 'summary')?.hidden) return '';
  const style = getOverrideStyle(getOverride(overrides, 'summary'));
  const paragraphs = summary.split('\n').filter(Boolean)
    .map((p) => `<p style="${style}">${applyAccentHighlights(escapeHtml(p), accentKeywords)}</p>`)
    .join('');
  return `${sectionTitle('About')}<div class="bold-item-body">${paragraphs}</div>`;
}

function renderExperience(
  experience: GeneratedCVContent['experience'],
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null,
  accentKeywords?: string[],
): string {
  if (!experience || experience.length === 0) return '';
  if (getOverride(overrides, 'section-experience')?.hidden) return '';

  const asParagraph = tokens.experienceDescriptionFormat === 'paragraph';
  const items = experience.map((exp, i) => {
    if (getOverride(overrides, `experience-${i}`)?.hidden) return '';
    const titleStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-title`));
    const companyStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-company`));
    const periodStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-period`));

    let body = '';
    if (asParagraph && exp.description) {
      const descStyle = getOverrideStyle(getOverride(overrides, `exp-${i}-description`));
      body = `<p style="${descStyle}">${applyAccentHighlights(escapeHtml(exp.description), accentKeywords)}</p>`;
    } else if (exp.highlights?.length) {
      body = `<ul>${exp.highlights.map((h, hi) =>
        `<li style="${getOverrideStyle(getOverride(overrides, `exp-${i}-highlight-${hi}`))}">${applyAccentHighlights(escapeHtml(h), accentKeywords)}</li>`
      ).join('')}</ul>`;
    }

    return `
      <div class="bold-item" data-id="experience-${i}">
        <div class="bold-item-header">
          <div>
            <h3 class="bold-item-title" data-id="exp-${i}-title" style="${titleStyle}">${escapeHtml(exp.title)}</h3>
            <p class="bold-item-subtitle" data-id="exp-${i}-company" style="${companyStyle}">${escapeHtml(exp.company)}${exp.location ? ` · ${escapeHtml(exp.location)}` : ''}</p>
          </div>
          ${exp.period ? `<span class="bold-item-period" data-id="exp-${i}-period" style="${periodStyle}">${escapeHtml(exp.period)}</span>` : ''}
        </div>
        <div class="bold-item-body">${body}</div>
      </div>
    `;
  }).filter(Boolean).join('');

  return `${sectionTitle('Experience')}${items}`;
}

function renderEducation(
  education: GeneratedCVContent['education'],
  overrides?: CVElementOverrides | null,
): string {
  if (!education || education.length === 0) return '';
  if (getOverride(overrides, 'section-education')?.hidden) return '';

  const items = education.map((edu, i) => {
    if (getOverride(overrides, `education-${i}`)?.hidden) return '';
    const degreeStyle = getOverrideStyle(getOverride(overrides, `edu-${i}-degree`));
    const instStyle = getOverrideStyle(getOverride(overrides, `edu-${i}-institution`));
    const yearStyle = getOverrideStyle(getOverride(overrides, `edu-${i}-year`));

    return `
      <div class="bold-item" data-id="education-${i}">
        <div class="bold-item-header">
          <div>
            <h3 class="bold-item-title" data-id="edu-${i}-degree" style="${degreeStyle}">${escapeHtml(edu.degree)}</h3>
            <p class="bold-item-subtitle" data-id="edu-${i}-institution" style="${instStyle}">${escapeHtml(edu.institution)}</p>
          </div>
          ${edu.year ? `<span class="bold-item-period" data-id="edu-${i}-year" style="${yearStyle}">${escapeHtml(edu.year)}</span>` : ''}
        </div>
        ${edu.details ? `<div class="bold-item-body"><p>${escapeHtml(edu.details)}</p></div>` : ''}
      </div>
    `;
  }).filter(Boolean).join('');

  return `${sectionTitle('Education')}${items}`;
}

function renderProjects(
  projects: GeneratedCVContent['projects'],
  overrides?: CVElementOverrides | null,
): string {
  if (!projects || projects.length === 0) return '';
  if (getOverride(overrides, 'section-projects')?.hidden) return '';
  const items = projects.map((proj, i) => {
    if (getOverride(overrides, `project-${i}`)?.hidden) return '';
    const tech = proj.technologies?.length
      ? `<p class="bold-item-subtitle">${proj.technologies.map(escapeHtml).join(' · ')}</p>`
      : '';
    const highlights = proj.highlights?.length
      ? `<ul>${proj.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
      : '';
    const url = proj.url
      ? `<p class="bold-item-period"><a href="${escapeHtml(proj.url)}">${escapeHtml(proj.url)}</a></p>`
      : '';
    return `
      <div class="bold-item" data-id="project-${i}">
        <div class="bold-item-header">
          <div>
            <h3 class="bold-item-title">${escapeHtml(proj.title)}</h3>
            ${tech}
          </div>
          ${proj.period ? `<span class="bold-item-period">${escapeHtml(proj.period)}</span>` : ''}
        </div>
        <div class="bold-item-body">
          <p>${escapeHtml(proj.description)}</p>
          ${highlights}
          ${url}
        </div>
      </div>
    `;
  }).filter(Boolean).join('');
  return `${sectionTitle('Projects')}${items}`;
}

// ============ Skills variants ============

function renderSkills(
  skills: GeneratedCVContent['skills'],
  style: BoldSkillStyle,
  overrides?: CVElementOverrides | null,
): string {
  const renderGroup = (label: string, items: string[], prefix: string): string => {
    if (!items.length) return '';
    const visibleItems = items
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => !getOverride(overrides, `${prefix}-${i}`)?.hidden);

    if (style === 'bars-gradient') {
      const rows = visibleItems.map(({ s, i }) => {
        const pct = 60 + (hashString(s) % 41); // 60-100%
        return `<div class="skill-row" data-id="${prefix}-${i}">
          <span class="skill-name">${escapeHtml(s)}</span>
          <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
      return `<div class="skill-group"><p class="skill-group-label">${label}</p>${rows}</div>`;
    }

    if (style === 'dots-rating') {
      const rows = visibleItems.map(({ s, i }) => {
        const rating = 3 + (hashString(s) % 3); // 3-5 dots
        const dots = Array.from({ length: 5 }, (_, idx) =>
          `<span class="dot ${idx < rating ? 'filled' : ''}"></span>`
        ).join('');
        return `<div class="skill-row" data-id="${prefix}-${i}">
          <span class="skill-name">${escapeHtml(s)}</span>
          <span class="skill-dots">${dots}</span>
        </div>`;
      }).join('');
      return `<div class="skill-group"><p class="skill-group-label">${label}</p>${rows}</div>`;
    }

    if (style === 'icon-tagged') {
      const icon = label === 'Technical'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>';
      const tags = visibleItems.map(({ s, i }) =>
        `<span class="skill-tag-icon" data-id="${prefix}-${i}">${icon}${escapeHtml(s)}</span>`
      ).join('');
      return `<div class="skill-group"><p class="skill-group-label">${label}</p><div class="skill-tags">${tags}</div></div>`;
    }

    // colored-pills
    const tags = visibleItems.map(({ s, i }) =>
      `<span class="skill-pill" data-id="${prefix}-${i}">${escapeHtml(s)}</span>`
    ).join('');
    return `<div class="skill-group"><p class="skill-group-label">${label}</p><div class="skill-tags">${tags}</div></div>`;
  };

  return `${renderGroup('Technical', skills.technical, 'skill-tech')}${renderGroup('Soft', skills.soft, 'skill-soft')}`;
}

function getSkillsCSS(
  style: BoldSkillStyle,
  sidebarStyle: BoldSidebarStyle,
  colors: CVDesignTokens['colors'],
): string {
  const lightText = isSidebarLightText(sidebarStyle);
  const groupLabelColor = lightText ? 'rgba(255,255,255,0.85)' : colors.primary;
  const pillBg = lightText ? 'rgba(255,255,255,0.18)' : colors.secondary;
  const pillText = lightText ? '#ffffff' : colors.primary;
  const trackBg = lightText ? 'rgba(255,255,255,0.2)' : `${colors.primary}20`;
  const fillBg = lightText
    ? 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)'
    : `linear-gradient(90deg, ${colors.accent} 0%, ${colors.primary} 100%)`;

  const base = `
    .skill-group + .skill-group { margin-top: 14px; }
    .skill-group-label {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin: 0 0 8px;
      color: ${groupLabelColor};
    }
    .skill-name {
      font-size: 9.5pt;
      font-weight: 500;
      color: var(--b-sidebar-text);
    }
    .skill-row { margin: 6px 0; }
  `;

  if (style === 'bars-gradient') {
    return `${base}
      .skill-bar-track {
        width: 100%;
        height: 6px;
        background: ${trackBg};
        border-radius: 3px;
        margin-top: 3px;
        overflow: hidden;
      }
      .skill-bar-fill {
        height: 100%;
        background: ${fillBg};
        border-radius: 3px;
      }
    `;
  }

  if (style === 'dots-rating') {
    return `${base}
      .skill-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .skill-dots { display: inline-flex; gap: 4px; }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${trackBg};
      }
      .dot.filled {
        background: ${lightText ? '#ffffff' : colors.accent};
      }
    `;
  }

  if (style === 'icon-tagged') {
    return `${base}
      .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .skill-tag-icon {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: ${pillBg};
        color: ${pillText};
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 9pt;
        font-weight: 500;
      }
      .skill-tag-icon svg {
        width: 11px;
        height: 11px;
        flex-shrink: 0;
      }
    `;
  }

  // colored-pills
  return `${base}
    .skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill-pill {
      background: ${pillBg};
      color: ${pillText};
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 600;
    }
  `;
}

// ============ Heading styles ============

function getHeadingCSS(style: BoldHeadingStyle, colors: CVDesignTokens['colors']): string {
  const base = `
    .bold-section-title {
      font-family: var(--b-font-heading);
      display: flex;
      align-items: baseline;
      gap: 14px;
      margin: 0 0 18px;
      font-weight: 800;
    }
    .bold-section-title .section-title-text {
      display: inline-block;
    }
  `;

  switch (style) {
    case 'oversized-numbered':
      return `${base}
        .bold-section-title { font-size: 20pt; color: var(--b-primary); letter-spacing: -0.01em; }
        .bold-section-title .section-number {
          font-family: var(--b-font-heading);
          font-size: 38pt;
          font-weight: 900;
          color: var(--b-accent);
          line-height: 0.8;
          letter-spacing: -0.04em;
        }
      `;
    case 'kicker-bar':
      return `${base}
        .bold-section-title {
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          font-size: 22pt;
          color: var(--b-primary);
        }
        .bold-section-title::before {
          content: '';
          display: block;
          width: 40px;
          height: 4px;
          background: var(--b-accent);
          border-radius: 2px;
        }
      `;
    case 'gradient-text':
      return `${base}
        .bold-section-title { font-size: 22pt; }
        .bold-section-title .section-title-text {
          background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
      `;
    case 'bracketed':
      return `${base}
        .bold-section-title {
          font-size: 18pt;
          color: var(--b-primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .bold-section-title .section-title-text::before {
          content: '[ ';
          color: var(--b-accent);
          margin-right: 4px;
        }
        .bold-section-title .section-title-text::after {
          content: ' ]';
          color: var(--b-accent);
          margin-left: 4px;
        }
      `;
    case 'stacked-caps':
      // Peter Saville energy — massive uppercase title. The original
      // implementation had max-width:7ch + break-word which sliced
      // "Experience" → "Experie" + "nce". Drop both and just let the
      // title flow naturally at 30pt with tight leading — still a
      // statement, no broken words.
      return `${base}
        .bold-section-title {
          font-size: 30pt;
          font-weight: 900;
          color: var(--b-primary);
          text-transform: uppercase;
          letter-spacing: -0.015em;
          line-height: 0.95;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .bold-section-title .section-number {
          font-family: var(--b-font-heading);
          font-size: 20pt;
          font-weight: 900;
          color: var(--b-accent);
          line-height: 1;
          letter-spacing: -0.02em;
          flex-shrink: 0;
          padding-top: 4px;
        }
        .bold-section-title .section-title-text {
          word-break: normal;
          overflow-wrap: normal;
        }
      `;
    case 'overlap-block':
      // Title sits on a small colored block with an accent tab peeking out
      // behind it (Kruger). Restrained — previous treatment was 22pt and
      // looked like an entire section-spanning banner. Now compact and
      // proportional to the body text so the design feels art-directed,
      // not banner-explosion.
      return `${base}
        .bold-section-title {
          display: block;
          margin-bottom: 18px;
        }
        .bold-section-title .section-title-text {
          font-size: 14pt;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: ${colors.primary};
          padding: 4px 11px 3px;
          display: inline-block;
          position: relative;
          line-height: 1.2;
        }
        .bold-section-title .section-title-text::before {
          content: '';
          position: absolute;
          right: -8px;
          bottom: -5px;
          width: 22px;
          height: 8px;
          background: ${colors.accent};
          z-index: -1;
        }
        .bold-section-title .section-number {
          color: ${colors.accent};
          font-size: 11pt;
          font-weight: 900;
          margin-right: 6px;
          vertical-align: baseline;
        }
      `;
  }
}

// ============ Accent shape (applied near section titles) ============

function getAccentShapeCSS(shape: BoldAccentShape, colors: CVDesignTokens['colors']): string {
  switch (shape) {
    case 'diagonal-stripe':
      return `
        .bold-section { position: relative; }
        .bold-section::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 0;
          bottom: 0;
          width: 3px;
          background: repeating-linear-gradient(
            45deg,
            ${colors.accent},
            ${colors.accent} 4px,
            transparent 4px,
            transparent 8px
          );
          opacity: 0.7;
        }
      `;
    case 'angled-corner':
      return `
        .bold-item {
          position: relative;
          padding-left: 14px;
        }
        .bold-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 4px;
          width: 4px;
          height: calc(100% - 8px);
          background: ${colors.accent};
          border-radius: 2px;
        }
      `;
    case 'colored-badge':
      return `
        .bold-section-title {
          position: relative;
        }
        .bold-section-title .section-title-text {
          position: relative;
        }
        /* Subtle chip behind item subtitle — at 10% bg this looked like
           a Canva pill on every company line. 6% reads as "subtle accent
           hint" instead of "chip". */
        .bold-item-subtitle {
          display: inline-block;
          padding: 1px 7px;
          background: ${colors.accent}10;
          border-radius: 3px;
        }
      `;
    case 'hex-pattern':
      return `
        .bold-main {
          background-image: radial-gradient(${colors.accent}15 1.5px, transparent 1.5px);
          background-size: 18px 18px;
          background-position: 0 0;
        }
      `;
  }
}

// ============ Icon treatment ============

function getIconTreatmentCSS(treatment: string, colors: CVDesignTokens['colors']): string {
  // Most icons live in sidebar contact. Treatment affects stroke weight + fill.
  switch (treatment) {
    case 'solid-filled':
      return `.bold-sidebar .contact-list .icon { fill: currentColor; stroke: none; }`;
    case 'duotone':
      return `
        .bold-sidebar .contact-list .icon {
          stroke-width: 1.6;
          opacity: 0.9;
        }
      `;
    case 'line-with-accent':
      return `
        .bold-sidebar .contact-list .icon {
          stroke: ${colors.accent};
          stroke-width: 2.2;
        }
      `;
    default:
      return '';
  }
}

// ============ Gradient builder ============

function buildGradient(direction: BoldTokens['gradientDirection'], colors: CVDesignTokens['colors']): string {
  switch (direction) {
    case 'none':
      return colors.primary;
    case 'linear-vertical':
      return `linear-gradient(180deg, ${colors.primary} 0%, ${darken(colors.primary, 15)} 100%)`;
    case 'linear-diagonal':
      return `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`;
    case 'radial-burst':
      return `radial-gradient(circle at 20% 20%, ${lighten(colors.primary, 10)} 0%, ${colors.primary} 60%, ${darken(colors.primary, 10)} 100%)`;
    case 'duotone-split':
      // Hard riso-style split: left half primary, right half accent, no blend.
      return `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primary} 50%, ${colors.accent} 50%, ${colors.accent} 100%)`;
    case 'offset-clash':
      // Two contrasting bands with a narrow gap — unexpected, zine-ish.
      return `linear-gradient(110deg, ${colors.primary} 0%, ${colors.primary} 62%, ${colors.accent} 62%, ${colors.accent} 100%)`;
  }
}

// ============ Surface texture ============
//
// Avant-garde CVs need a layer of "made, not typed" — halftone dots, riso
// grain, offset print-registration wobble, or screened stripes. All variants
// are print-safe: no CSS filter, no blend modes that Puppeteer can't render.
// We overlay on the header and sidebar via a ::after pseudo-element with
// pointer-events:none, so actual content stays clickable in preview.

function getSurfaceTextureCSS(
  texture: BoldTokens['surfaceTexture'] | undefined,
  _colors: CVDesignTokens['colors'],
): string {
  if (!texture || texture === 'none') return '';

  // Target both the full-bleed header and the sidebar (the two saturated
  // surfaces in this renderer). Use ::after so we don't fight with the
  // gradient on ::before / the base background.
  const surfaces = '.bold-header, .bold-sidebar-style-solid-color .bold-sidebar, .bold-sidebar-style-gradient .bold-sidebar';

  switch (texture) {
    case 'halftone':
      // Screen-print dot pattern — small semi-transparent black dots on a
      // tight grid. Offset pattern gives the dots a printed feel.
      return `
        ${surfaces} {
          position: relative;
          isolation: isolate;
        }
        ${surfaces}::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle, rgba(0,0,0,0.18) 0.8px, transparent 1.2px);
          background-size: 4px 4px;
          background-position: 0 0;
          mix-blend-mode: multiply;
          z-index: 0;
        }
        ${surfaces} > * { position: relative; z-index: 1; }
      `;

    case 'riso-grain':
      // Subtle noisy dot pattern — finer + more transparent than halftone,
      // and offset so it doesn't look mechanical.
      return `
        ${surfaces} {
          position: relative;
          isolation: isolate;
        }
        ${surfaces}::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.14) 0.5px, transparent 0.9px),
            radial-gradient(circle, rgba(0,0,0,0.10) 0.4px, transparent 0.9px);
          background-size: 3px 3px, 2.5px 2.5px;
          background-position: 0 0, 1px 1px;
          mix-blend-mode: overlay;
          z-index: 0;
        }
        ${surfaces} > * { position: relative; z-index: 1; }
      `;

    case 'screen-print':
      // Mis-registered color offset — tiny ghost-edge of accent color
      // slightly above-right of the surface. Feels like a screen-printed
      // poster where the layers didn't land perfectly.
      return `
        ${surfaces} {
          position: relative;
          isolation: isolate;
        }
        ${surfaces}::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: inherit;
          transform: translate(2px, -2px);
          opacity: 0.18;
          mix-blend-mode: screen;
          z-index: 0;
        }
        ${surfaces} > * { position: relative; z-index: 1; }
      `;

    case 'stripe-texture':
      // Fine repeating diagonal lines — silkscreen feel.
      return `
        ${surfaces} {
          position: relative;
          isolation: isolate;
        }
        ${surfaces}::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 5px);
          z-index: 0;
        }
        ${surfaces} > * { position: relative; z-index: 1; }
      `;
  }
}

// ============ Helpers ============

function darken(hex: string, percent: number): string {
  return adjust(hex, -percent);
}

function lighten(hex: string, percent: number): string {
  return adjust(hex, percent);
}

function adjust(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = (v: number) => Math.max(0, Math.min(255, Math.round(v + (255 * percent) / 100)));
  return `#${a(r).toString(16).padStart(2, '0')}${a(g).toString(16).padStart(2, '0')}${a(b).toString(16).padStart(2, '0')}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

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

// ============ v4 content-driven helpers ============

function bodyDensityValues(d: BoldBodyDensity): { leading: string; tracking: string } {
  switch (d) {
    case 'whisper': return { leading: '1.35', tracking: '0.005em' };
    case 'shout':   return { leading: '1.75', tracking: '0.04em' };
    case 'normal':
    default:        return { leading: '1.5', tracking: '0.01em' };
  }
}

function asymmetryValues(a: BoldAsymmetryStrength): { offset: string; rotation: string } {
  switch (a) {
    case 'none':    return { offset: '0px', rotation: '0deg' };
    case 'subtle':  return { offset: '12px', rotation: '0deg' };
    case 'strong':  return { offset: '32px', rotation: '0deg' };
    case 'extreme': return { offset: '56px', rotation: '-1.5deg' };
    default:        return { offset: '12px', rotation: '0deg' };
  }
}

/**
 * Wrap any occurrence of one of the accentKeywords in body text with a
 * <mark class="accent-hit"> span. Case-insensitive, longest-keyword-first
 * to prevent shorter keywords cannibalising longer ones. Skips HTML tags
 * (operates on plain text only — caller passes escaped text).
 *
 * The keywords are AI-picked from the vacancy or experience — they're
 * the domain-words the recruiter will scan for. Highlighting them
 * elevates the candidate's content into the visual language of the page.
 */
function applyAccentHighlights(escapedText: string, keywords: string[] | undefined): string {
  if (!keywords || keywords.length === 0) return escapedText;
  // Filter out tiny / problematic keywords + escape regex metachars
  const cleaned = keywords
    .filter(k => k && k.trim().length >= 3)
    .map(k => k.trim())
    .sort((a, b) => b.length - a.length); // longest first
  if (cleaned.length === 0) return escapedText;

  let out = escapedText;
  for (const kw of cleaned) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use \b on alphanumeric boundaries; for keywords with spaces, allow
    // adjacent whitespace as the boundary.
    const pattern = /[a-zA-Z0-9]/.test(kw)
      ? new RegExp(`(?<![a-zA-Z0-9])(${escapedKw})(?![a-zA-Z0-9])`, 'gi')
      : new RegExp(`(${escapedKw})`, 'gi');
    out = out.replace(pattern, '<mark class="accent-hit">$1</mark>');
  }
  return out;
}

/**
 * Pick the line of copy that becomes oversized poster-scale type.
 * Prefers the AI-chosen `posterLine`; falls back to first summary sentence.
 */
function resolvePosterLine(
  aiChoice: string | undefined,
  summary: string,
  headline: string | null | undefined,
  fullName: string,
): string {
  if (aiChoice && aiChoice.trim().length > 0) return aiChoice.trim();
  // Fallbacks
  const firstSentence = (summary || '').split(/[.!?]\s+/)[0];
  if (firstSentence && firstSentence.length > 0) return firstSentence;
  if (headline) return headline;
  return fullName;
}

/**
 * Render the candidate's name according to nameTreatment.
 * The result is wrapped in a stable `<span data-id="header-name">` so
 * downstream editing / overrides still work.
 */
function renderNameMarkup(
  fullName: string,
  treatment: BoldNameTreatment,
  headline: string | null | undefined,
): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] || fullName;
  const rest = parts.slice(1).join(' ');
  const allCaps = (s: string) => escapeHtml(s.toUpperCase());

  switch (treatment) {
    case 'first-name-dominant':
      return `<span data-id="header-name" class="name-first-dominant">
        <span class="name-big">${allCaps(first)}</span>
        ${rest ? `<span class="name-small">${allCaps(rest)}</span>` : ''}
      </span>`;
    case 'last-name-dominant':
      return `<span data-id="header-name" class="name-last-dominant">
        ${rest ? `<span class="name-small">${allCaps(first)}</span>` : ''}
        <span class="name-big">${allCaps(rest || first)}</span>
      </span>`;
    case 'stacked':
      return `<span data-id="header-name" class="name-stacked">
        <span class="name-line">${allCaps(first)}</span>
        ${rest ? `<span class="name-line">${allCaps(rest)}</span>` : ''}
      </span>`;
    case 'separated-by-rule':
      return `<span data-id="header-name" class="name-separated">
        <span class="name-line">${allCaps(first)}</span>
        <span class="name-rule"></span>
        ${rest ? `<span class="name-line">${allCaps(rest)}</span>` : ''}
      </span>`;
    case 'first-letter-massive': {
      const firstLetter = (first[0] || '').toUpperCase();
      const firstRest = first.slice(1);
      return `<span data-id="header-name" class="name-letter-massive">
        <span class="name-initial">${escapeHtml(firstLetter)}</span>
        <span class="name-tail">${allCaps(firstRest)}${rest ? ' ' + allCaps(rest) : ''}</span>
      </span>`;
    }
    case 'inline-with-role':
      return `<span data-id="header-name" class="name-inline">
        <span class="name-line">${allCaps(fullName)}</span>
        ${headline ? `<span class="name-divider">—</span><span class="name-role">${escapeHtml(headline)}</span>` : ''}
      </span>`;
    case 'unified':
    default:
      return `<span data-id="header-name" class="name-unified">${allCaps(fullName)}</span>`;
  }
}

/**
 * CSS for all nameTreatment variants. Always emitted (cheap) so any treatment
 * works in any archetype.
 */
function nameTreatmentCSS(): string {
  return `
    .name-unified { font-family: var(--b-font-heading); font-weight: 900; line-height: 0.92; letter-spacing: -0.02em; }
    .name-first-dominant, .name-last-dominant {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
    }
    .name-first-dominant .name-big, .name-last-dominant .name-big {
      font-family: var(--b-font-heading); font-weight: 900; line-height: 0.9;
      letter-spacing: -0.025em; font-size: calc(38pt * var(--b-heading-scale) / 1.8);
    }
    .name-first-dominant .name-small, .name-last-dominant .name-small {
      font-family: var(--b-font-body); font-weight: 500; letter-spacing: 0.18em;
      font-size: 11pt; opacity: 0.78;
    }
    .name-stacked, .name-separated, .name-inline { display: flex; flex-direction: column; gap: 6px; }
    .name-stacked .name-line, .name-separated .name-line {
      font-family: var(--b-font-heading); font-weight: 900;
      line-height: 0.95; letter-spacing: -0.02em;
      font-size: calc(34pt * var(--b-heading-scale) / 1.8);
    }
    .name-separated .name-rule {
      display: block; width: 80px; height: 4px; background: currentColor; margin: 6px 0;
    }
    .name-letter-massive { display: flex; align-items: baseline; gap: 6px; }
    .name-letter-massive .name-initial {
      font-family: var(--b-font-heading); font-weight: 900;
      font-size: calc(72pt * var(--b-heading-scale) / 1.8);
      line-height: 0.8; letter-spacing: -0.04em;
    }
    .name-letter-massive .name-tail {
      font-family: var(--b-font-body); font-weight: 600; letter-spacing: 0.16em;
      font-size: 12pt;
    }
    .name-inline { flex-direction: row; align-items: baseline; gap: 14px; flex-wrap: wrap; }
    .name-inline .name-line {
      font-family: var(--b-font-heading); font-weight: 900;
      letter-spacing: -0.015em;
      font-size: calc(26pt * var(--b-heading-scale) / 1.8);
    }
    .name-inline .name-divider { font-family: var(--b-font-heading); opacity: 0.55; }
    .name-inline .name-role { font-family: var(--b-font-body); font-size: 12pt; opacity: 0.8; }

    /* The accent-hit highlights wrap individual keywords in body text.
       Use a subtle underline that works on ANY background (light or dark
       section fills, gradients, textures) without color-clashing. The
       previous treatment (color + font-weight: 700) became invisible on
       primary-colored section backgrounds and bold-confused the layout. */
    mark.accent-hit {
      background: transparent;
      color: inherit;
      font-weight: inherit;
      padding: 0;
      box-shadow: inset 0 -0.18em 0 ${'rgba(255,255,255,0)'};
      background-image: linear-gradient(180deg, transparent 65%, var(--b-accent) 65%, var(--b-accent) 86%, transparent 86%);
      background-size: 100% 100%;
      background-repeat: no-repeat;
      padding: 0 1px;
    }
  `;
}

// ============ Archetype CSS ============
//
// Each non-sidebar-canva archetype gets a self-contained CSS block. The
// base CSS (generateBoldCSS) provides typography, colors, item-level
// styling. The archetype CSS provides the page-level layout shell.

function generateArchetypeCSS(b: BoldTokens, tokens: CVDesignTokens): string {
  const arch = b.layoutArchetype ?? 'sidebar-canva';
  const colors = tokens.colors;
  const sat = b.paletteSaturation ?? 'duotone';

  // Palette-saturation modifiers shared across archetypes. monochrome-plus-one
  // forces near-greyscale primary + single screaming accent.
  const satCss = paletteSaturationCSS(sat, colors);

  // Marginalia + background numeral CSS is shared across archetypes that
  // opt in (we apply via a wrapper class).
  const marginaliaCss = marginaliaCSS(b.marginalia ?? 'none', colors);
  const numeralCss = backgroundNumeralCSS(b.backgroundNumeral ?? 'none', colors);

  let archetypeCss = '';
  switch (arch) {
    case 'manifesto':
      archetypeCss = manifestoCSS(b, colors);
      break;
    case 'magazine-cover':
      archetypeCss = magazineCoverCSS(b, colors);
      break;
    case 'editorial-inversion':
      archetypeCss = editorialInversionCSS(b, colors);
      break;
    case 'brutalist-grid':
      archetypeCss = brutalistGridCSS(b, colors);
      break;
    case 'vertical-rail':
      archetypeCss = verticalRailCSS(b, colors);
      break;
    case 'mosaic':
      archetypeCss = mosaicCSS(b, colors);
      break;
    case 'typographic-poster':
      archetypeCss = typographicPosterCSS(b, colors);
      break;
    case 'photo-montage':
      archetypeCss = photoMontageCSS(b, colors);
      break;
    case 'sidebar-canva':
    default:
      archetypeCss = '';
  }
  return `${satCss}\n${marginaliaCss}\n${numeralCss}\n${archetypeCss}`;
}

function paletteSaturationCSS(sat: NonNullable<BoldTokens['paletteSaturation']>, colors: CVDesignTokens['colors']): string {
  // We expose a CSS variable --b-saturation-token that downstream rules
  // can read for hints. Mostly we just adjust which palette colors
  // are used in archetype-specific spots.
  switch (sat) {
    case 'monochrome-plus-one':
      return `
        :root {
          --b-sat-primary: #1a1a1a;
          --b-sat-accent: ${colors.accent};
          --b-sat-third: #6a6a6a;
        }
        .bold-cv { --b-mono-tone: #1a1a1a; }
      `;
    case 'duotone':
      return `
        :root {
          --b-sat-primary: ${colors.primary};
          --b-sat-accent: ${colors.accent};
          --b-sat-third: ${colors.primary};
        }
      `;
    case 'tri-tone':
      return `
        :root {
          --b-sat-primary: ${colors.primary};
          --b-sat-accent: ${colors.accent};
          --b-sat-third: ${colors.muted};
        }
      `;
    case 'full-palette':
    default:
      return `
        :root {
          --b-sat-primary: ${colors.primary};
          --b-sat-accent: ${colors.accent};
          --b-sat-third: ${colors.secondary};
        }
      `;
  }
}

function marginaliaCSS(style: BoldMarginaliaStyle, colors: CVDesignTokens['colors']): string {
  switch (style) {
    case 'vertical-strip':
      return `
        .marginalia-vertical {
          position: absolute;
          left: 8px;
          top: 60px;
          bottom: 60px;
          writing-mode: vertical-rl;
          font-family: var(--b-font-body);
          font-size: 7.5pt;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: ${colors.muted};
          opacity: 0.7;
          white-space: nowrap;
        }
      `;
    case 'numbered':
      return `
        .marginalia-numbered .bold-section { position: relative; }
        .marginalia-numbered .bold-section > .section-margin-number {
          position: absolute;
          left: -28px;
          top: 0;
          font-family: var(--b-font-heading);
          font-size: 9pt;
          font-weight: 700;
          color: ${colors.accent};
          letter-spacing: 0.15em;
        }
      `;
    case 'kicker-callouts':
      return `
        .marginalia-kicker .bold-section {
          position: relative;
        }
        .marginalia-kicker .bold-section > .section-margin-kicker {
          position: absolute;
          left: -90px;
          top: 4px;
          width: 80px;
          font-family: var(--b-font-body);
          font-size: 7pt;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: ${colors.muted};
          line-height: 1.3;
        }
      `;
    case 'none':
    default:
      return '';
  }
}

function backgroundNumeralCSS(style: BoldBackgroundNumeral, colors: CVDesignTokens['colors']): string {
  if (style === 'none') return '';
  // Reduced sizes — at 320pt the numeral "AI" was bigger than a column
  // and competed with body text. 180-220pt feels like a faded anchor,
  // not a foreground element. Lower opacity (0.05) for the same reason.
  return `
    .bg-numeral {
      position: absolute;
      pointer-events: none;
      font-family: var(--b-font-heading);
      font-weight: 900;
      color: ${colors.primary};
      opacity: 0.045;
      line-height: 0.85;
      letter-spacing: -0.04em;
      z-index: 0;
      user-select: none;
      white-space: nowrap;
      max-width: 100%;
      overflow: hidden;
    }
    .bg-numeral.bg-numeral-page {
      font-size: 200pt;
      bottom: 40px;
      right: -10px;
    }
    .bg-numeral.bg-numeral-corner {
      font-size: 150pt;
      bottom: -30px;
      left: -10px;
    }
    .bg-numeral.bg-numeral-section {
      font-size: 130pt;
      right: -10px;
      top: -20px;
      opacity: 0.04;
    }
  `;
}

// ============ Archetype-specific CSS ============

function manifestoCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  const cols = Math.max(1, Math.min(4, b.columnCount ?? 2));
  return `
    .archetype-manifesto {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      overflow: hidden;
      padding: 0;
    }
    .archetype-manifesto .manifesto-opener {
      padding: 56px 48px 28px;
      background: var(--b-gradient);
      color: #fff;
      position: relative;
      z-index: 1;
    }
    .archetype-manifesto .manifesto-opener.has-photo {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .archetype-manifesto .manifesto-opener.has-photo .manifesto-opener-text {
      flex: 1;
      min-width: 0;
    }
    .archetype-manifesto .manifesto-photo {
      flex-shrink: 0;
      width: 130px;
      height: 130px;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid rgba(255,255,255,0.85);
    }
    .archetype-manifesto .manifesto-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .archetype-manifesto .manifesto-name {
      font-family: var(--b-font-heading);
      font-size: 48pt;
      font-weight: 900;
      line-height: 0.95;
      letter-spacing: -0.03em;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
    }
    .archetype-manifesto .manifesto-headline {
      font-family: var(--b-font-body);
      font-size: 14pt;
      color: rgba(255,255,255,0.92);
      margin: 14px 0 0;
      max-width: 60ch;
    }
    .archetype-manifesto .manifesto-statement {
      font-family: var(--b-font-heading);
      font-size: 22pt;
      font-weight: 700;
      line-height: 1.15;
      color: ${colors.primary};
      padding: 28px 48px 36px;
      max-width: 720px;
      letter-spacing: -0.01em;
      position: relative;
      z-index: 1;
    }
    .archetype-manifesto .manifesto-statement::before {
      content: '';
      display: block;
      width: 64px;
      height: 6px;
      background: ${colors.accent};
      margin-bottom: 18px;
    }
    .archetype-manifesto .manifesto-grid {
      display: grid;
      grid-template-columns: repeat(${cols}, 1fr);
      gap: 0;
      padding: 16px 48px 56px;
      position: relative;
      z-index: 1;
    }
    .archetype-manifesto .manifesto-grid > .bold-section {
      padding: 20px 16px 20px 0;
      border-top: 2px solid ${colors.primary};
      margin: 0;
    }
    /* Stretch summary-less sections into full width if columnCount is 1 */
    .archetype-manifesto .manifesto-grid > .bold-section.span-full {
      grid-column: 1 / -1;
    }
    .archetype-manifesto .manifesto-contact {
      padding: 0 48px 28px;
      font-family: var(--b-font-body);
      font-size: 9.5pt;
      color: ${colors.muted};
      letter-spacing: 0.05em;
    }
    .archetype-manifesto .manifesto-contact a {
      color: ${colors.primary};
      text-decoration: none;
      margin-right: 16px;
    }
  `;
}

function magazineCoverCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  return `
    .archetype-magazine-cover {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      overflow: hidden;
    }
    .archetype-magazine-cover .cover-hero {
      background: var(--b-gradient);
      color: #fff;
      padding: 56px 48px 48px;
      position: relative;
      min-height: 460px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .archetype-magazine-cover .cover-kicker {
      font-family: var(--b-font-body);
      font-size: 9pt;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.8);
      margin-bottom: 18px;
    }
    .archetype-magazine-cover .cover-name {
      font-family: var(--b-font-heading);
      font-size: 78pt;
      font-weight: 900;
      line-height: 0.88;
      letter-spacing: -0.04em;
      margin: 0;
      color: #fff;
      text-transform: uppercase;
    }
    .archetype-magazine-cover .cover-issue {
      font-family: var(--b-font-heading);
      font-size: 9pt;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.9);
    }
    .archetype-magazine-cover .cover-headline {
      font-family: var(--b-font-body);
      font-size: 14pt;
      color: rgba(255,255,255,0.92);
      margin: 18px 0 0;
      max-width: 50ch;
      font-style: italic;
    }
    .archetype-magazine-cover .cover-portrait {
      position: absolute;
      bottom: 24px;
      right: 32px;
      width: 130px;
      height: 130px;
      border-radius: 50%;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 0 0 6px ${colors.accent};
    }
    .archetype-magazine-cover .cover-portrait img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .archetype-magazine-cover .cover-body {
      padding: 36px 48px 48px;
      column-count: ${Math.max(1, Math.min(2, b.columnCount ?? 1))};
      column-gap: 32px;
      position: relative;
    }
    .archetype-magazine-cover .cover-body .bold-section {
      break-inside: avoid;
      margin-bottom: 24px;
    }
    .archetype-magazine-cover .cover-contact {
      padding: 0 48px 32px;
      font-family: var(--b-font-body);
      font-size: 9pt;
      color: ${colors.muted};
      letter-spacing: 0.06em;
      border-top: 1px solid ${colors.primary}22;
      margin-top: 8px;
      padding-top: 16px;
    }
    .archetype-magazine-cover .cover-contact a {
      color: ${colors.primary};
      text-decoration: none;
      margin-right: 14px;
    }
  `;
}

function editorialInversionCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  return `
    .archetype-editorial-inversion {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      overflow: hidden;
      padding: 48px 56px 32px;
    }
    .archetype-editorial-inversion .inv-kicker {
      font-family: var(--b-font-body);
      font-size: 8.5pt;
      letter-spacing: 0.45em;
      text-transform: uppercase;
      color: ${colors.accent};
      margin-bottom: 10px;
    }
    .archetype-editorial-inversion .inv-lead {
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 28px;
      align-items: start;
      padding-bottom: 28px;
      border-bottom: 4px solid ${colors.primary};
    }
    .archetype-editorial-inversion .inv-lead-text {
      font-family: var(--b-font-heading);
      font-size: 19pt;
      font-weight: 600;
      line-height: 1.25;
      color: ${colors.primary};
      letter-spacing: -0.01em;
    }
    .archetype-editorial-inversion .inv-portrait {
      width: 140px;
      height: 140px;
      overflow: hidden;
      border-radius: 8px;
    }
    .archetype-editorial-inversion .inv-portrait img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .archetype-editorial-inversion .inv-name {
      font-family: var(--b-font-heading);
      font-size: 36pt;
      font-weight: 900;
      line-height: 1.0;
      letter-spacing: -0.03em;
      color: ${colors.primary};
      margin: 16px 0 6px;
      text-transform: uppercase;
    }
    .archetype-editorial-inversion .inv-headline {
      font-family: var(--b-font-body);
      font-size: 12pt;
      color: ${colors.muted};
      font-style: italic;
      margin: 0 0 24px;
    }
    .archetype-editorial-inversion .inv-body {
      column-count: ${Math.max(1, Math.min(2, b.columnCount ?? 2))};
      column-gap: 36px;
      padding: 28px 0;
      position: relative;
    }
    .archetype-editorial-inversion .inv-body .bold-section {
      break-inside: avoid;
      margin-bottom: 24px;
    }
    .archetype-editorial-inversion .inv-contact-footer {
      border-top: 2px solid ${colors.primary};
      padding-top: 18px;
      margin-top: 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px 24px;
      font-family: var(--b-font-body);
      font-size: 9.5pt;
      color: ${colors.text};
      letter-spacing: 0.04em;
    }
    .archetype-editorial-inversion .inv-contact-footer a {
      color: ${colors.primary};
      text-decoration: none;
    }
    .archetype-editorial-inversion .inv-contact-footer .inv-contact-label {
      font-size: 7.5pt;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: ${colors.accent};
      font-weight: 700;
      width: 100%;
      margin-bottom: 6px;
    }
  `;
}

function brutalistGridCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  const cols = Math.max(2, Math.min(4, b.columnCount ?? 3));
  return `
    .archetype-brutalist-grid {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      overflow: hidden;
      padding: 0;
    }
    .archetype-brutalist-grid .brut-header {
      background: ${colors.primary};
      color: #fff;
      padding: 36px 40px 28px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 32px;
      align-items: end;
      border-bottom: 8px solid ${colors.accent};
    }
    .archetype-brutalist-grid .brut-header.has-photo {
      grid-template-columns: auto 1fr auto;
    }
    .archetype-brutalist-grid .brut-photo {
      width: 120px;
      height: 120px;
      overflow: hidden;
      border: 4px solid ${colors.accent};
      align-self: end;
    }
    .archetype-brutalist-grid .brut-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .archetype-brutalist-grid .brut-header-text { min-width: 0; }
    .archetype-brutalist-grid .brut-name {
      font-family: var(--b-font-heading);
      font-size: 44pt;
      font-weight: 900;
      line-height: 0.92;
      letter-spacing: -0.03em;
      margin: 0;
      color: #fff;
      text-transform: uppercase;
    }
    .archetype-brutalist-grid .brut-headline {
      font-family: var(--b-font-body);
      font-size: 12pt;
      color: rgba(255,255,255,0.85);
      margin: 12px 0 0;
      max-width: 56ch;
    }
    .archetype-brutalist-grid .brut-contact {
      font-family: var(--b-font-body);
      font-size: 9pt;
      color: rgba(255,255,255,0.9);
      text-align: right;
      letter-spacing: 0.06em;
      line-height: 1.5;
    }
    .archetype-brutalist-grid .brut-contact a {
      color: #fff;
      text-decoration: none;
      display: block;
    }
    .archetype-brutalist-grid .brut-grid {
      display: grid;
      grid-template-columns: repeat(${cols}, 1fr);
      gap: 0;
      border-top: 0;
    }
    .archetype-brutalist-grid .brut-grid > .bold-section {
      padding: 24px 22px;
      border-right: 2px solid ${colors.primary};
      border-bottom: 2px solid ${colors.primary};
      margin: 0;
      background: var(--b-page-bg);
      position: relative;
    }
    .archetype-brutalist-grid .brut-grid > .bold-section:nth-child(${cols}n) {
      border-right: 0;
    }
    .archetype-brutalist-grid .brut-grid > .bold-section.span-full {
      grid-column: 1 / -1;
      border-right: 0;
    }
    .archetype-brutalist-grid .brut-grid > .bold-section.span-2 {
      grid-column: span 2;
    }
    .archetype-brutalist-grid .brut-grid > .bold-section.tinted {
      background: ${colors.accent};
      color: #fff;
    }
    .archetype-brutalist-grid .brut-grid > .bold-section.tinted .bold-section-title,
    .archetype-brutalist-grid .brut-grid > .bold-section.tinted .bold-item-title,
    .archetype-brutalist-grid .brut-grid > .bold-section.tinted p,
    .archetype-brutalist-grid .brut-grid > .bold-section.tinted li {
      color: #fff !important;
    }
  `;
}

function verticalRailCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  return `
    .archetype-vertical-rail {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      display: grid;
      grid-template-columns: 110px 1fr;
      overflow: hidden;
    }
    .archetype-vertical-rail .rail {
      background: var(--b-gradient);
      color: #fff;
      position: relative;
      padding: 32px 0;
      overflow: hidden;
    }
    .archetype-vertical-rail .rail-name {
      font-family: var(--b-font-heading);
      font-size: 44pt;
      font-weight: 900;
      line-height: 1;
      letter-spacing: -0.03em;
      color: #fff;
      text-transform: uppercase;
      white-space: nowrap;
      position: absolute;
      top: 60px;
      left: 50%;
      writing-mode: vertical-rl;
      /* No transform (would break PDF print). vertical-rl alone provides the rotation. */
    }
    .archetype-vertical-rail .rail-bottom {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-family: var(--b-font-body);
      font-size: 8pt;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.7);
    }
    .archetype-vertical-rail .rail-main {
      padding: 40px 44px 32px;
      position: relative;
      min-height: 1120px;
    }
    .archetype-vertical-rail .rail-main-head {
      margin-bottom: 6px;
    }
    .archetype-vertical-rail .rail-main-head.has-photo {
      display: flex;
      align-items: center;
      gap: 22px;
      margin-bottom: 14px;
    }
    .archetype-vertical-rail .rail-main-head-text { flex: 1; min-width: 0; }
    .archetype-vertical-rail .rail-photo {
      flex-shrink: 0;
      width: 92px;
      height: 92px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid ${colors.accent};
    }
    .archetype-vertical-rail .rail-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .archetype-vertical-rail .rail-headline {
      font-family: var(--b-font-heading);
      font-size: 16pt;
      font-weight: 700;
      color: ${colors.primary};
      margin: 0 0 6px;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }
    .archetype-vertical-rail .rail-kicker {
      font-family: var(--b-font-body);
      font-size: 8.5pt;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: ${colors.accent};
      margin-bottom: 10px;
    }
    .archetype-vertical-rail .rail-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 18px;
      font-size: 9pt;
      color: ${colors.muted};
      margin: 8px 0 28px;
      padding-bottom: 22px;
      border-bottom: 2px solid ${colors.primary};
    }
    .archetype-vertical-rail .rail-contact a {
      color: ${colors.primary};
      text-decoration: none;
    }
    .archetype-vertical-rail .rail-body .bold-section {
      margin-bottom: 26px;
      break-inside: avoid;
    }
  `;
}

function mosaicCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  return `
    .archetype-mosaic {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      grid-auto-rows: minmax(140px, auto);
      gap: 6px;
      padding: 6px;
      overflow: hidden;
    }
    .archetype-mosaic .tile {
      padding: 22px 22px;
      position: relative;
      overflow: hidden;
    }
    .archetype-mosaic .tile-name {
      grid-column: 1 / 3;
      background: var(--b-gradient);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .archetype-mosaic .tile-name .mosaic-name {
      font-family: var(--b-font-heading);
      font-size: 38pt;
      font-weight: 900;
      line-height: 0.9;
      letter-spacing: -0.03em;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
    }
    .archetype-mosaic .tile-name .mosaic-headline {
      font-family: var(--b-font-body);
      font-size: 12pt;
      color: rgba(255,255,255,0.9);
      margin: 12px 0 0;
    }
    .archetype-mosaic .tile-portrait {
      background: ${colors.accent};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
    }
    .archetype-mosaic .tile-portrait img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }
    .archetype-mosaic .tile-portrait.no-photo::before {
      content: '';
      position: absolute;
      inset: 18px;
      background:
        repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 6px, transparent 6px 14px);
    }
    .archetype-mosaic .tile-summary {
      grid-column: 1 / -1;
      background: ${colors.primary};
      color: #fff;
    }
    .archetype-mosaic .tile-summary .bold-section-title { color: #fff !important; }
    .archetype-mosaic .tile-summary p,
    .archetype-mosaic .tile-summary li {
      color: #fff !important;
    }
    .archetype-mosaic .tile-section {
      background: var(--b-page-bg);
      color: ${colors.text};
      border: 2px solid ${colors.primary};
    }
    .archetype-mosaic .tile-section.tinted {
      background: ${colors.accent};
      color: #fff;
      border: 0;
    }
    .archetype-mosaic .tile-section.tinted .bold-section-title,
    .archetype-mosaic .tile-section.tinted .bold-item-title,
    .archetype-mosaic .tile-section.tinted .bold-item-subtitle,
    .archetype-mosaic .tile-section.tinted .bold-item-period,
    .archetype-mosaic .tile-section.tinted p,
    .archetype-mosaic .tile-section.tinted li {
      color: #fff !important;
    }
    /* On tinted tiles drop the chip background on subtitles (it conflicts
       with the tile fill) and make sure dates are bright enough to read.
       Previously the period dates fell to the inherited muted color and
       disappeared into the red/accent bg. */
    .archetype-mosaic .tile-section.tinted .bold-item-subtitle {
      background: rgba(255,255,255,0.14) !important;
    }
    .archetype-mosaic .tile-section.tinted .bold-item-period {
      color: rgba(255,255,255,0.85) !important;
      font-weight: 500;
    }
    .archetype-mosaic .tile-section.span-2 {
      grid-column: span 2;
    }
    .archetype-mosaic .tile-section.span-full {
      grid-column: 1 / -1;
    }
    .archetype-mosaic .tile-contact {
      grid-column: 1 / -1;
      background: ${colors.primary};
      color: #fff;
      padding: 14px 22px;
      font-family: var(--b-font-body);
      font-size: 9pt;
      letter-spacing: 0.06em;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 22px;
    }
    .archetype-mosaic .tile-contact a {
      color: #fff;
      text-decoration: none;
    }
  `;
}

// ============ Archetype HTML renderers ============
//
// Each renderer composes a complete <div class="bold-cv archetype-*">
// shell. They lean on the existing renderSummary/renderExperience/
// renderEducation/renderProjects helpers — those produce the per-section
// content; the archetype controls only the PAGE shell.

function buildSimpleContact(contact: CVContactInfo | null | undefined): string {
  if (!contact) return '';
  const items: string[] = [];
  if (contact.email) items.push(`<span class="contact-item">${escapeHtml(contact.email)}</span>`);
  if (contact.phone) items.push(`<span class="contact-item">${escapeHtml(contact.phone)}</span>`);
  if (contact.location) items.push(`<span class="contact-item">${escapeHtml(contact.location)}</span>`);
  if (contact.linkedinUrl) {
    const href = contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : 'https://' + contact.linkedinUrl;
    items.push(`<a class="contact-item" href="${escapeHtml(href)}">${escapeHtml(contact.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);
  }
  if (contact.website) {
    const href = contact.website.startsWith('http') ? contact.website : 'https://' + contact.website;
    items.push(`<a class="contact-item" href="${escapeHtml(href)}">${escapeHtml(contact.website.replace(/^https?:\/\//, ''))}</a>`);
  }
  if (contact.github) {
    const href = contact.github.startsWith('http') ? contact.github : 'https://github.com/' + contact.github;
    items.push(`<a class="contact-item" href="${escapeHtml(href)}">${escapeHtml(contact.github.replace(/^https?:\/\/(www\.)?github\.com\//, ''))}</a>`);
  }
  // Print-safe separator: explicit ' · ' text node between items. The
  // previous `items.join('')` produced concatenated text (e.g.
  // "NIELS@EMAIL.COM+31681739018APELDOORN, ...") because plain <span>
  // elements have no inherent spacing and only some archetype CSS added
  // margin-right to anchors. Adding the separator inline guarantees
  // visible separation regardless of which archetype renders it.
  return items.join('<span class="contact-sep" aria-hidden="true"> · </span>');
}

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 3)
    .join('');
}

function backgroundNumeralContent(
  style: BoldBackgroundNumeral,
  fullName: string,
  content: GeneratedCVContent,
  heroNumeralValue?: string,
): string {
  // v4: if the AI supplied a literal value, prefer it (more meaningful than derived).
  if (style !== 'none' && heroNumeralValue && heroNumeralValue.trim().length > 0) {
    return heroNumeralValue.trim();
  }
  switch (style) {
    case 'initials':
      return getInitials(fullName);
    case 'year': {
      try {
        return String(new Date().getFullYear());
      } catch {
        return '2026';
      }
    }
    case 'role':
      return (content.headline || '').split(/\s+/)[0]?.toUpperCase() ?? '';
    case 'section-number':
      return '';
    case 'none':
    default:
      return '';
  }
}

function renderManifesto(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  // Manifesto: opener (name + headline) → giant summary statement → grid of sections.
  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, overrides, b.accentKeywords),
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };
  // When the manifestoOpener is on, summary lives in the top statement, not the grid.
  const useStatement = b.manifestoOpener && !!content.summary;
  const skipInGrid = new Set<string>([
    'languages', 'certifications', 'interests', // these stay simple/inline below
  ]);
  if (useStatement) skipInGrid.add('summary');

  // Content-aware span calculation:
  //  - experience: ALWAYS full width (long entries with bullets)
  //  - projects: full width when 3+ entries (each project has title + tech list
  //    + paragraph → wraps heavily in narrow columns)
  //  - summary (when not in opener): full width (paragraph text)
  //  - education: stays in grid (usually short — 2-4 lines per entry)
  // This avoids the 50%-narrow-column problem where Projects has 6 entries
  // and Education has 2: prior to this, Projects got crammed into half-width
  // while Education ended quickly leaving the right side empty.
  const isLongSection = (name: string): boolean => {
    if (name === 'experience') return true;
    if (name === 'projects') return (content.projects?.length ?? 0) >= 3;
    if (name === 'summary') return true;
    return false;
  };

  // First pass: build sections, tag long ones as span-full
  const builtSections: Array<{ name: string; html: string; longByContent: boolean }> = [];
  let idx = 0;
  for (const n of tokens.sectionOrder) {
    if (skipInGrid.has(n) || !sectionRenderers[n]) continue;
    const html = sectionRenderers[n]();
    if (!html) continue;
    idx += 1;
    const numberHint = b.marginalia === 'numbered'
      ? `<span class="section-margin-number">${String(idx).padStart(2, '0')}</span>`
      : '';
    const kickerHint = b.marginalia === 'kicker-callouts'
      ? `<span class="section-margin-kicker">Section ${String(idx).padStart(2, '0')} — ${escapeHtml(n.toUpperCase())}</span>`
      : '';
    builtSections.push({
      name: n,
      html: `${numberHint}${kickerHint}${html.replace('<!--SECTION_NUMBER-->', '')}`,
      longByContent: isLongSection(n),
    });
  }

  // Second pass: if only ONE short section remains in the grid (after
  // pulling out the long ones), promote it to span-full too — otherwise
  // it'd render as a half-width column with the other half empty (the
  // grid-template-columns: repeat(cols, 1fr) reserves slots for them all).
  const shortSections = builtSections.filter(s => !s.longByContent);
  const forceAllSpanFull = shortSections.length === 1;

  const gridSections = builtSections
    .map(({ name, html, longByContent }) => {
      const span = (longByContent || forceAllSpanFull) ? 'span-full' : '';
      return `<section class="bold-section ${span}" data-section="${name}">${html}</section>`;
    })
    .join('');

  // Skills / languages / certifications get a compact row at the bottom.
  const extras = renderManifestoExtras(content, b, overrides);

  const statementText = useStatement
    ? resolvePosterLine(b.posterLine, content.summary, content.headline, fullName)
    : '';
  const statementHtml = useStatement && statementText
    ? `<div class="manifesto-statement">${applyAccentHighlights(escapeHtml(statementText), b.accentKeywords)}</div>`
    : '';

  const numeralText = backgroundNumeralContent(b.backgroundNumeral ?? 'none', fullName, content, b.heroNumeralValue);
  const numeralHtml = numeralText
    ? `<div class="bg-numeral bg-numeral-page">${escapeHtml(numeralText)}</div>`
    : '';
  const marginaliaVert = b.marginalia === 'vertical-strip'
    ? `<div class="marginalia-vertical">${escapeHtml(content.headline || fullName)} — CV</div>`
    : '';

  const wrapClass = [
    'bold-cv archetype-manifesto',
    b.marginalia === 'numbered' ? 'marginalia-numbered' : '',
    b.marginalia === 'kicker-callouts' ? 'marginalia-kicker' : '',
  ].filter(Boolean).join(' ');

  const showPhoto = tokens.showPhoto && !!avatarUrl;
  const photoHtml = showPhoto
    ? `<div class="manifesto-photo"><img src="${escapeHtml(avatarUrl!)}" alt="" /></div>`
    : '';

  return `<div class="${wrapClass}">
    ${numeralHtml}
    ${marginaliaVert}
    <header class="manifesto-opener${showPhoto ? ' has-photo' : ''}">
      <div class="manifesto-opener-text">
        <h1 class="manifesto-name" data-id="header-name">${escapeHtml(fullName)}</h1>
        ${headline ? `<p class="manifesto-headline">${escapeHtml(headline)}</p>` : ''}
      </div>
      ${photoHtml}
    </header>
    ${statementHtml}
    <div class="manifesto-grid">${gridSections}</div>
    ${extras}
    <footer class="manifesto-contact">${buildSimpleContact(contactInfo)}</footer>
  </div>`;
}

function renderManifestoExtras(
  content: GeneratedCVContent,
  b: BoldTokens,
  overrides: CVElementOverrides | null | undefined,
): string {
  const parts: string[] = [];
  if (content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0)) {
    if (!getOverride(overrides, 'section-skills')?.hidden) {
      const techPills = content.skills.technical.slice(0, 12).map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
      const softPills = content.skills.soft.slice(0, 8).map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
      parts.push(`<section class="bold-section span-full" data-section="skills" style="padding: 16px 48px; border-top: 2px solid var(--b-primary);">
        ${sectionTitle('Skills')}
        <div class="skill-tags">${techPills}${softPills}</div>
      </section>`);
    }
  }
  if (content.languages && content.languages.length > 0 && !getOverride(overrides, 'section-languages')?.hidden) {
    const items = content.languages.map((l) => `<span style="margin-right: 18px;">${escapeHtml(l.language)}${l.level ? ' · ' + escapeHtml(l.level) : ''}</span>`).join('');
    parts.push(`<section class="bold-section span-full" data-section="languages" style="padding: 12px 48px; border-top: 1px solid var(--b-primary);">${items}</section>`);
  }
  // Suppress unused parameter warning
  void b;
  return parts.join('');
}

function renderMagazineCover(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, overrides, b.accentKeywords),
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };
  const body = tokens.sectionOrder
    .filter((n) => sectionRenderers[n] && !['languages', 'certifications', 'interests'].includes(n))
    .map((n) => {
      const html = sectionRenderers[n]();
      if (!html) return '';
      return `<section class="bold-section" data-section="${n}">${html.replace('<!--SECTION_NUMBER-->', '')}</section>`;
    })
    .filter(Boolean)
    .join('');

  // Skills/languages row at the bottom
  const skillsHtml = content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0) && !getOverride(overrides, 'section-skills')?.hidden
    ? `<section class="bold-section" data-section="skills">${sectionTitle('Skills')}<div class="skill-tags">${[...content.skills.technical.slice(0, 10), ...content.skills.soft.slice(0, 6)].map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}</div></section>`
    : '';

  const portrait = avatarUrl
    ? `<div class="cover-portrait"><img src="${escapeHtml(avatarUrl)}" alt="" /></div>`
    : '';

  const numeralText = backgroundNumeralContent(b.backgroundNumeral ?? 'none', fullName, content, b.heroNumeralValue);
  const numeralHtml = numeralText
    ? `<div class="bg-numeral bg-numeral-corner">${escapeHtml(numeralText)}</div>`
    : '';
  const year = new Date().getFullYear();

  const coverHeadline = b.posterLine || headline || '';

  return `<div class="bold-cv archetype-magazine-cover">
    ${numeralHtml}
    <header class="cover-hero">
      <div>
        <div class="cover-kicker">Curriculum Vitae · ${year}</div>
        <h1 class="cover-name" data-id="header-name">${renderNameMarkup(fullName, b.nameTreatment ?? 'unified', headline)}</h1>
        ${coverHeadline ? `<p class="cover-headline">${applyAccentHighlights(escapeHtml(coverHeadline), b.accentKeywords)}</p>` : ''}
      </div>
      <div class="cover-issue">№ ${String(year).slice(-2)} — Issue One</div>
      ${portrait}
    </header>
    <div class="cover-body">${body}${skillsHtml}</div>
    <footer class="cover-contact">${buildSimpleContact(contactInfo)}</footer>
  </div>`;
}

function renderEditorialInversion(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const sectionRenderers: Record<string, () => string> = {
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };
  const body = tokens.sectionOrder
    .filter((n) => sectionRenderers[n])
    .map((n) => {
      const html = sectionRenderers[n]();
      return html ? `<section class="bold-section" data-section="${n}">${html.replace('<!--SECTION_NUMBER-->', '')}</section>` : '';
    })
    .filter(Boolean)
    .join('');

  const skillsHtml = content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0)
    ? `<section class="bold-section" data-section="skills">${sectionTitle('Skills')}<div class="skill-tags">${[...content.skills.technical.slice(0, 12), ...content.skills.soft.slice(0, 6)].map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}</div></section>`
    : '';

  const portrait = avatarUrl
    ? `<div class="inv-portrait"><img src="${escapeHtml(avatarUrl)}" alt="" /></div>`
    : '';

  const leadText = resolvePosterLine(b.posterLine, content.summary, content.headline, fullName).slice(0, 320);
  const lead = (content.summary || b.posterLine)
    ? `<div class="inv-lead">
        <div>
          <div class="inv-kicker">A Curriculum Vitae</div>
          <p class="inv-lead-text">${applyAccentHighlights(escapeHtml(leadText), b.accentKeywords)}</p>
        </div>
        ${portrait}
      </div>`
    : '';

  const contactItems: string[] = [];
  if (contactInfo?.email) contactItems.push(`<span>${escapeHtml(contactInfo.email)}</span>`);
  if (contactInfo?.phone) contactItems.push(`<span>${escapeHtml(contactInfo.phone)}</span>`);
  if (contactInfo?.location) contactItems.push(`<span>${escapeHtml(contactInfo.location)}</span>`);
  if (contactInfo?.linkedinUrl) {
    const href = contactInfo.linkedinUrl.startsWith('http') ? contactInfo.linkedinUrl : 'https://' + contactInfo.linkedinUrl;
    contactItems.push(`<a href="${escapeHtml(href)}">${escapeHtml(contactInfo.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);
  }
  if (contactInfo?.website) {
    const href = contactInfo.website.startsWith('http') ? contactInfo.website : 'https://' + contactInfo.website;
    contactItems.push(`<a href="${escapeHtml(href)}">${escapeHtml(contactInfo.website.replace(/^https?:\/\//, ''))}</a>`);
  }

  const numeralText = backgroundNumeralContent(b.backgroundNumeral ?? 'none', fullName, content, b.heroNumeralValue);
  const numeralHtml = numeralText
    ? `<div class="bg-numeral bg-numeral-corner">${escapeHtml(numeralText)}</div>`
    : '';

  return `<div class="bold-cv archetype-editorial-inversion">
    ${numeralHtml}
    ${lead}
    <h1 class="inv-name" data-id="header-name">${escapeHtml(fullName)}</h1>
    ${headline ? `<p class="inv-headline">${escapeHtml(headline)}</p>` : ''}
    <div class="inv-body">${body}${skillsHtml}</div>
    <footer class="inv-contact-footer">
      <div class="inv-contact-label">Contact</div>
      ${contactItems.join('')}
    </footer>
  </div>`;
}

function renderBrutalistGrid(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, overrides, b.accentKeywords),
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };
  let idx = 0;
  const sections = tokens.sectionOrder
    .filter((n) => sectionRenderers[n] && !['languages', 'certifications', 'interests'].includes(n))
    .map((n) => {
      const html = sectionRenderers[n]();
      if (!html) return '';
      idx += 1;
      // Every 4th block gets the tinted accent treatment (gallery rhythm)
      const tinted = idx % 4 === 0 ? 'tinted' : '';
      const span = n === 'experience' ? 'span-full' : (n === 'summary' ? 'span-2' : '');
      return `<section class="bold-section ${span} ${tinted}" data-section="${n}">${html.replace('<!--SECTION_NUMBER-->', '')}</section>`;
    })
    .filter(Boolean)
    .join('');

  // Skills block
  const skillsHtml = content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0) && !getOverride(overrides, 'section-skills')?.hidden
    ? `<section class="bold-section span-full" data-section="skills">${sectionTitle('Skills')}<div class="skill-tags">${[...content.skills.technical.slice(0, 14), ...content.skills.soft.slice(0, 8)].map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}</div></section>`
    : '';

  const contactItems: string[] = [];
  if (contactInfo?.email) contactItems.push(`<a>${escapeHtml(contactInfo.email)}</a>`);
  if (contactInfo?.phone) contactItems.push(`<a>${escapeHtml(contactInfo.phone)}</a>`);
  if (contactInfo?.location) contactItems.push(`<a>${escapeHtml(contactInfo.location)}</a>`);
  if (contactInfo?.linkedinUrl) {
    const href = contactInfo.linkedinUrl.startsWith('http') ? contactInfo.linkedinUrl : 'https://' + contactInfo.linkedinUrl;
    contactItems.push(`<a href="${escapeHtml(href)}">${escapeHtml(contactInfo.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ''))}</a>`);
  }

  const numeralText = backgroundNumeralContent(b.backgroundNumeral ?? 'none', fullName, content, b.heroNumeralValue);
  const numeralHtml = numeralText
    ? `<div class="bg-numeral bg-numeral-corner">${escapeHtml(numeralText)}</div>`
    : '';

  const showPhoto = tokens.showPhoto && !!avatarUrl;
  const photoHtml = showPhoto
    ? `<div class="brut-photo"><img src="${escapeHtml(avatarUrl!)}" alt="" /></div>`
    : '';

  return `<div class="bold-cv archetype-brutalist-grid">
    ${numeralHtml}
    <header class="brut-header${showPhoto ? ' has-photo' : ''}">
      ${photoHtml}
      <div class="brut-header-text">
        <h1 class="brut-name" data-id="header-name">${escapeHtml(fullName)}</h1>
        ${headline ? `<p class="brut-headline">${escapeHtml(headline)}</p>` : ''}
      </div>
      <div class="brut-contact">${contactItems.join('')}</div>
    </header>
    <div class="brut-grid">${sections}${skillsHtml}</div>
  </div>`;
}

function renderVerticalRail(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, overrides, b.accentKeywords),
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };
  let idx = 0;
  const body = tokens.sectionOrder
    .filter((n) => sectionRenderers[n] && !['languages', 'certifications', 'interests'].includes(n))
    .map((n) => {
      const html = sectionRenderers[n]();
      if (!html) return '';
      idx += 1;
      const numberHint = b.marginalia === 'numbered'
        ? `<span class="section-margin-number">${String(idx).padStart(2, '0')}</span>`
        : '';
      return `<section class="bold-section" data-section="${n}">${numberHint}${html.replace('<!--SECTION_NUMBER-->', '')}</section>`;
    })
    .filter(Boolean)
    .join('');

  const skillsHtml = content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0) && !getOverride(overrides, 'section-skills')?.hidden
    ? `<section class="bold-section" data-section="skills">${sectionTitle('Skills')}<div class="skill-tags">${[...content.skills.technical.slice(0, 12), ...content.skills.soft.slice(0, 8)].map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}</div></section>`
    : '';

  const showPhoto = tokens.showPhoto && !!avatarUrl;
  const photoHtml = showPhoto
    ? `<div class="rail-photo"><img src="${escapeHtml(avatarUrl!)}" alt="" /></div>`
    : '';

  const wrapClass = [
    'bold-cv archetype-vertical-rail',
    b.marginalia === 'numbered' ? 'marginalia-numbered' : '',
  ].filter(Boolean).join(' ');

  return `<div class="${wrapClass}">
    <aside class="rail">
      <div class="rail-name" data-id="header-name">${escapeHtml(fullName)}</div>
      <div class="rail-bottom">CV / ${new Date().getFullYear()}</div>
    </aside>
    <main class="rail-main">
      <header class="rail-main-head${showPhoto ? ' has-photo' : ''}">
        <div class="rail-main-head-text">
          <div class="rail-kicker">Curriculum Vitae</div>
          ${headline ? `<h2 class="rail-headline">${escapeHtml(headline)}</h2>` : ''}
        </div>
        ${photoHtml}
      </header>
      <div class="rail-contact">${buildSimpleContact(contactInfo)}</div>
      <div class="rail-body">${body}${skillsHtml}</div>
    </main>
  </div>`;
}

function renderMosaic(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const sectionRenderers: Record<string, () => string> = {
    summary: () => renderSummary(content.summary, overrides, b.accentKeywords),
    experience: () => renderExperience(content.experience, tokens, overrides, b.accentKeywords),
    education: () => renderEducation(content.education, overrides),
    projects: () => renderProjects(content.projects, overrides),
  };

  // Layout pattern: a name-tile (top-left wide), a portrait tile (top-right),
  // then summary spans full, then a mosaic of section tiles. Every 3rd
  // section tile is tinted for visual rhythm.
  const tiles: string[] = [];
  // Name + portrait row
  tiles.push(`<div class="tile tile-name">
    <h1 class="mosaic-name" data-id="header-name">${escapeHtml(fullName)}</h1>
    ${headline ? `<p class="mosaic-headline">${escapeHtml(headline)}</p>` : ''}
  </div>`);
  if (avatarUrl) {
    tiles.push(`<div class="tile tile-portrait"><img src="${escapeHtml(avatarUrl)}" alt="" /></div>`);
  } else {
    tiles.push(`<div class="tile tile-portrait no-photo"></div>`);
  }

  // Summary as a full-width tinted tile
  if (content.summary && !getOverride(overrides, 'section-summary')?.hidden) {
    const summaryHtml = renderSummary(content.summary, overrides, b.accentKeywords);
    if (summaryHtml) {
      tiles.push(`<section class="tile tile-summary bold-section" data-section="summary">${summaryHtml.replace('<!--SECTION_NUMBER-->', '')}</section>`);
    }
  }

  // The other sections
  let idx = 0;
  tokens.sectionOrder
    .filter((n) => n !== 'summary' && sectionRenderers[n] && !['languages', 'certifications', 'interests'].includes(n))
    .forEach((n) => {
      const html = sectionRenderers[n]();
      if (!html) return;
      idx += 1;
      const tinted = idx % 3 === 0 ? 'tinted' : '';
      const span = n === 'experience' ? 'span-full' : (n === 'projects' || n === 'education' ? 'span-2' : '');
      tiles.push(`<section class="tile tile-section bold-section ${tinted} ${span}" data-section="${n}">${html.replace('<!--SECTION_NUMBER-->', '')}</section>`);
    });

  // Skills as final big block
  if (content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0) && !getOverride(overrides, 'section-skills')?.hidden) {
    const techPills = content.skills.technical.slice(0, 12).map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
    const softPills = content.skills.soft.slice(0, 8).map((s) => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
    tiles.push(`<section class="tile tile-section span-full bold-section" data-section="skills">${sectionTitle('Skills')}<div class="skill-tags">${techPills}${softPills}</div></section>`);
  }

  // Contact strip
  tiles.push(`<footer class="tile tile-contact">${buildSimpleContact(contactInfo)}</footer>`);

  // Suppress unused params lint
  void b;

  return `<div class="bold-cv archetype-mosaic">
    ${tiles.join('\n')}
  </div>`;
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
      </script>
    `,
  };
}

// ============================================================================
//
//                     v4: typographic-poster archetype
//
// Type-only protest poster. NO PHOTO. The candidate's name fills the upper
// half of the page; the posterLine becomes a giant blockquote. Below: a
// dense run of small-print sections that read like the credits at the end
// of a film. Body text uses bodyDensity for tracking/leading. Asymmetry
// strength controls how far the poster line is offset from centre.
//
// Best fits: designers, writers, strategists, activists, anyone with a
// strong personal voice.
//
// ============================================================================

function typographicPosterCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  return `
    .archetype-typographic-poster {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      overflow: hidden;
      padding: 0;
    }
    .archetype-typographic-poster .tp-hero {
      padding: 64px 56px 24px;
      position: relative;
      z-index: 2;
    }
    .archetype-typographic-poster .tp-name {
      font-family: var(--b-font-heading);
      font-size: calc(72pt * var(--b-heading-scale) / 1.8);
      font-weight: 900;
      line-height: 0.86;
      letter-spacing: -0.035em;
      color: ${colors.primary};
      text-transform: uppercase;
      margin: 0;
      transform: translateX(var(--b-asym-offset)) rotate(var(--b-asym-rotation));
      transform-origin: left top;
    }
    .archetype-typographic-poster .tp-kicker {
      font-family: var(--b-font-body);
      text-transform: uppercase;
      letter-spacing: 0.32em;
      font-size: 9.5pt;
      color: ${colors.muted};
      margin: 0 0 28px;
    }
    .archetype-typographic-poster .tp-poster-line {
      margin: 36px 0 28px;
      padding: 28px 56px 36px;
      font-family: var(--b-font-heading);
      font-size: calc(32pt * var(--b-heading-scale) / 1.8);
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: -0.015em;
      color: ${colors.accent};
      max-width: 720px;
      position: relative;
      z-index: 2;
      border-top: 4px solid ${colors.primary};
      border-bottom: 4px solid ${colors.primary};
    }
    .archetype-typographic-poster .tp-poster-line::before {
      content: '⸻';
      display: block;
      font-family: var(--b-font-body);
      font-size: 14pt;
      color: ${colors.primary};
      margin-bottom: 12px;
    }
    .archetype-typographic-poster .tp-credits {
      padding: 12px 56px 48px;
      column-count: 2;
      column-gap: 36px;
      column-rule: 1px solid ${colors.primary};
      font-family: var(--b-font-body);
      font-size: 9pt;
      line-height: 1.55;
      color: ${colors.text};
    }
    .archetype-typographic-poster .tp-credits > .bold-section {
      break-inside: avoid;
      margin: 0 0 18px;
    }
    .archetype-typographic-poster .tp-credits .bold-section-title {
      font-family: var(--b-font-heading);
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${colors.primary};
      margin: 0 0 6px;
      padding: 0;
    }
    .archetype-typographic-poster .tp-credits .bold-item {
      padding: 0;
      margin: 0 0 10px;
      background: transparent;
      border: 0;
    }
    .archetype-typographic-poster .tp-credits .bold-item-title {
      font-size: 10pt;
      font-weight: 700;
      margin: 0;
      line-height: 1.2;
    }
    .archetype-typographic-poster .tp-credits .bold-item-subtitle {
      font-size: 9pt;
      color: ${colors.muted};
      margin: 0;
    }
    .archetype-typographic-poster .tp-credits .bold-item-period {
      font-size: 8.5pt;
      color: ${colors.muted};
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.04em;
    }
    .archetype-typographic-poster .tp-credits ul {
      margin: 4px 0 0;
      padding: 0 0 0 14px;
    }
    .archetype-typographic-poster .tp-credits ul li {
      margin: 0 0 3px;
    }
    .archetype-typographic-poster .tp-contact {
      padding: 12px 56px 36px;
      font-family: var(--b-font-body);
      font-size: 8.5pt;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: ${colors.muted};
      border-top: 1px solid ${colors.primary};
    }
    .archetype-typographic-poster .tp-contact a {
      color: ${colors.primary};
      text-decoration: none;
      margin-right: 18px;
    }
    .archetype-typographic-poster .tp-numeral {
      position: absolute;
      top: 80px;
      right: -40px;
      font-family: var(--b-font-heading);
      font-size: 320pt;
      font-weight: 900;
      line-height: 0.8;
      color: ${colors.primary};
      opacity: 0.06;
      pointer-events: none;
      z-index: 1;
    }
    /* Suppress unused-token warnings */
    .archetype-typographic-poster[data-saturation="${b.paletteSaturation ?? 'duotone'}"] {}
  `;
}

function renderTypographicPoster(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const posterLineText = resolvePosterLine(b.posterLine, content.summary, headline, fullName);
  const numeralText = backgroundNumeralContent(b.backgroundNumeral ?? 'none', fullName, content, b.heroNumeralValue);

  // Render dense credits-style sections
  const sectionRenderers: Record<string, () => string> = {
    experience: () => renderCredits('Experience', content.experience.map(e => ({
      title: e.title,
      subtitle: `${e.company}${e.location ? ` · ${e.location}` : ''}`,
      period: e.period || '',
      bullets: e.highlights || [],
    })), overrides, b.accentKeywords),
    education: () => renderCredits('Education', content.education.map(e => ({
      title: e.degree,
      subtitle: e.institution,
      period: e.year || '',
      bullets: [],
    })), overrides),
    projects: () => content.projects && content.projects.length > 0
      ? renderCredits('Projects', content.projects.map(p => ({
          title: p.title,
          subtitle: (p.technologies || []).slice(0, 4).join(' · '),
          period: p.period || '',
          bullets: p.description ? [p.description] : [],
        })), overrides, b.accentKeywords)
      : '',
  };

  const credits = tokens.sectionOrder
    .filter(n => sectionRenderers[n])
    .map(n => sectionRenderers[n]())
    .filter(Boolean)
    .join('');

  // Skills as a single inline line at the very bottom of the credits
  const skillsLine = content.skills && (content.skills.technical.length > 0 || content.skills.soft.length > 0) && !getOverride(overrides, 'section-skills')?.hidden
    ? `<section class="bold-section" data-section="skills">
        ${sectionTitle('Skills')}
        <p style="margin: 0;">${[...content.skills.technical.slice(0, 12), ...content.skills.soft.slice(0, 6)].map(s => escapeHtml(s)).join(' · ')}</p>
      </section>`
    : '';

  return `<div class="bold-cv archetype-typographic-poster">
    ${numeralText ? `<div class="tp-numeral">${escapeHtml(numeralText)}</div>` : ''}
    <header class="tp-hero">
      <div class="tp-kicker">A Curriculum Vitae — ${new Date().getFullYear()}</div>
      <h1 class="tp-name">${renderNameMarkup(fullName, b.nameTreatment ?? 'unified', headline)}</h1>
    </header>
    <div class="tp-poster-line">${applyAccentHighlights(escapeHtml(posterLineText), b.accentKeywords)}</div>
    <div class="tp-credits">${credits}${skillsLine}</div>
    <footer class="tp-contact">${buildSimpleContact(contactInfo)}</footer>
  </div>`;
}

interface CreditEntry {
  title: string;
  subtitle: string;
  period: string;
  bullets: string[];
}

function renderCredits(
  label: string,
  entries: CreditEntry[],
  overrides: CVElementOverrides | null | undefined,
  accentKeywords?: string[],
): string {
  if (entries.length === 0) return '';
  const items = entries.map((e, i) => `
    <div class="bold-item" data-id="entry-${i}">
      <p class="bold-item-title">${escapeHtml(e.title)}</p>
      <p class="bold-item-subtitle">${escapeHtml(e.subtitle)}${e.period ? ` · <span class="bold-item-period">${escapeHtml(e.period)}</span>` : ''}</p>
      ${e.bullets.length > 0 ? `<ul>${e.bullets.slice(0, 3).map(b => `<li>${applyAccentHighlights(escapeHtml(b), accentKeywords)}</li>`).join('')}</ul>` : ''}
    </div>
  `).filter(Boolean).join('');

  return `<section class="bold-section" data-section="${label.toLowerCase()}">
    ${sectionTitle(label)}
    ${items}
  </section>`;
}

// ============================================================================
//
//                       v4: photo-montage archetype
//
// Portrait-dominant magazine cover. Photo bleeds across ~60% of the page;
// info is overlaid in stacked cards on top of (or alongside) the photo.
// REQUIRES an uploaded photo — the normalize step downgrades to magazine-
// cover when no photo is available.
//
// Best fits: performers, art directors, anyone whose face IS the brand.
//
// ============================================================================

function photoMontageCSS(b: BoldTokens, colors: CVDesignTokens['colors']): string {
  return `
    .archetype-photo-montage {
      max-width: 820px;
      margin: 0 auto;
      background: var(--b-page-bg);
      min-height: 1120px;
      position: relative;
      overflow: hidden;
      padding: 0;
    }
    .archetype-photo-montage .pm-cover {
      position: relative;
      height: 640px;
      background: ${colors.primary};
      color: #fff;
      overflow: hidden;
    }
    .archetype-photo-montage .pm-photo {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: contrast(1.05) saturate(1.1);
    }
    .archetype-photo-montage .pm-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg,
        rgba(0,0,0,0.0) 0%,
        rgba(0,0,0,0.05) 40%,
        rgba(0,0,0,0.55) 100%);
    }
    .archetype-photo-montage .pm-cover-content {
      position: absolute;
      left: 36px;
      right: 36px;
      bottom: 32px;
      z-index: 2;
    }
    .archetype-photo-montage .pm-issue {
      font-family: var(--b-font-body);
      font-size: 9.5pt;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.85);
      margin: 0 0 8px;
    }
    .archetype-photo-montage .pm-name {
      font-family: var(--b-font-heading);
      font-size: calc(52pt * var(--b-heading-scale) / 1.8);
      font-weight: 900;
      line-height: 0.92;
      letter-spacing: -0.025em;
      color: #fff;
      margin: 0;
      text-transform: uppercase;
    }
    .archetype-photo-montage .pm-poster-line {
      font-family: var(--b-font-heading);
      font-size: 17pt;
      font-weight: 600;
      line-height: 1.2;
      color: ${colors.accent};
      max-width: 60ch;
      margin: 14px 0 0;
      padding: 12px 0 0;
      border-top: 3px solid ${colors.accent};
    }
    .archetype-photo-montage .pm-cards {
      padding: 32px 36px 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .archetype-photo-montage .pm-card {
      background: var(--b-page-bg);
      border-left: 4px solid ${colors.accent};
      padding: 16px 18px;
      box-shadow: 0 0 0 1px ${colors.primary}22;
    }
    .archetype-photo-montage .pm-card .bold-section-title {
      font-family: var(--b-font-heading);
      font-size: 10.5pt;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${colors.primary};
      margin: 0 0 8px;
    }
    .archetype-photo-montage .pm-card .bold-item {
      padding: 0;
      margin: 0 0 10px;
      background: transparent;
      border: 0;
    }
    .archetype-photo-montage .pm-card .bold-item-title {
      font-size: 10.5pt;
      font-weight: 700;
      margin: 0;
    }
    .archetype-photo-montage .pm-card .bold-item-subtitle {
      font-size: 9pt;
      color: ${colors.muted};
      margin: 0;
    }
    .archetype-photo-montage .pm-card .bold-item-period {
      font-size: 8.5pt;
      color: ${colors.muted};
    }
    .archetype-photo-montage .pm-card ul {
      margin: 4px 0 0;
      padding: 0 0 0 14px;
      font-size: 9pt;
      line-height: 1.45;
    }
    .archetype-photo-montage .pm-card.pm-card-wide {
      grid-column: 1 / -1;
    }
    .archetype-photo-montage .pm-contact {
      padding: 0 36px 32px;
      font-family: var(--b-font-body);
      font-size: 9pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${colors.muted};
    }
    .archetype-photo-montage .pm-contact a {
      color: ${colors.primary};
      text-decoration: none;
      margin-right: 16px;
    }
    /* Suppress unused-token warnings */
    .archetype-photo-montage[data-saturation="${b.paletteSaturation ?? 'duotone'}"] {}
  `;
}

function renderPhotoMontage(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  b: BoldTokens,
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  overrides: CVElementOverrides | null | undefined,
  contactInfo: CVContactInfo | null | undefined,
): string {
  const posterLineText = resolvePosterLine(b.posterLine, content.summary, headline, fullName);
  const year = new Date().getFullYear();

  // The cards: split sections into 2-column layout. Experience gets wide.
  const sectionToCard: Record<string, () => string> = {
    summary: () => {
      if (!content.summary || getOverride(overrides, 'section-summary')?.hidden) return '';
      return `<div class="pm-card pm-card-wide">
        ${sectionTitle('About')}
        <p style="font-size: 10pt; line-height: 1.55;">${applyAccentHighlights(escapeHtml(content.summary.split('\n').filter(Boolean).join(' ')), b.accentKeywords)}</p>
      </div>`;
    },
    experience: () => {
      if (!content.experience || content.experience.length === 0 || getOverride(overrides, 'section-experience')?.hidden) return '';
      const items = content.experience.slice(0, 4).map((e, i) => `
        <div class="bold-item" data-id="experience-${i}">
          <p class="bold-item-title">${escapeHtml(e.title)}</p>
          <p class="bold-item-subtitle">${escapeHtml(e.company)}${e.period ? ` · <span class="bold-item-period">${escapeHtml(e.period)}</span>` : ''}</p>
          ${e.highlights && e.highlights.length > 0 ? `<ul>${e.highlights.slice(0, 2).map(h => `<li>${applyAccentHighlights(escapeHtml(h), b.accentKeywords)}</li>`).join('')}</ul>` : ''}
        </div>
      `).join('');
      return `<div class="pm-card pm-card-wide">${sectionTitle('Experience')}${items}</div>`;
    },
    education: () => {
      if (!content.education || content.education.length === 0 || getOverride(overrides, 'section-education')?.hidden) return '';
      const items = content.education.slice(0, 3).map((e, i) => `
        <div class="bold-item" data-id="education-${i}">
          <p class="bold-item-title">${escapeHtml(e.degree)}</p>
          <p class="bold-item-subtitle">${escapeHtml(e.institution)}${e.year ? ` · <span class="bold-item-period">${escapeHtml(e.year)}</span>` : ''}</p>
        </div>
      `).join('');
      return `<div class="pm-card">${sectionTitle('Education')}${items}</div>`;
    },
    skills: () => {
      if (!content.skills || (content.skills.technical.length === 0 && content.skills.soft.length === 0) || getOverride(overrides, 'section-skills')?.hidden) return '';
      const pills = [...content.skills.technical.slice(0, 8), ...content.skills.soft.slice(0, 5)]
        .map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
      return `<div class="pm-card">${sectionTitle('Skills')}<div class="skill-tags">${pills}</div></div>`;
    },
    languages: () => {
      if (!content.languages || content.languages.length === 0 || getOverride(overrides, 'section-languages')?.hidden) return '';
      const items = content.languages.map(l => `<p style="margin: 2px 0; font-size: 9.5pt;">${escapeHtml(l.language)}${l.level ? ` · <span style="color: var(--b-muted);">${escapeHtml(l.level)}</span>` : ''}</p>`).join('');
      return `<div class="pm-card">${sectionTitle('Languages')}${items}</div>`;
    },
  };

  const cards = tokens.sectionOrder
    .filter(n => sectionToCard[n])
    .map(n => sectionToCard[n]())
    .filter(Boolean)
    .join('');

  const photoBlock = avatarUrl
    ? `<img class="pm-photo" src="${escapeHtml(avatarUrl)}" alt="" />`
    : `<div class="pm-photo" style="background: linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.accent});"></div>`;

  return `<div class="bold-cv archetype-photo-montage">
    <header class="pm-cover">
      ${photoBlock}
      <div class="pm-overlay"></div>
      <div class="pm-cover-content">
        <p class="pm-issue">Curriculum Vitae · ${year} · № ${String(year).slice(-2)}</p>
        <h1 class="pm-name" data-id="header-name">${renderNameMarkup(fullName, b.nameTreatment ?? 'unified', headline)}</h1>
        ${posterLineText ? `<p class="pm-poster-line">${applyAccentHighlights(escapeHtml(posterLineText), b.accentKeywords)}</p>` : ''}
      </div>
    </header>
    <div class="pm-cards">${cards}</div>
    <footer class="pm-contact">${buildSimpleContact(contactInfo)}</footer>
  </div>`;
}
