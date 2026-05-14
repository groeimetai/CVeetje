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
} from '@/types/design-tokens';
import { getFontUrls, fontPairings } from '../templates/themes';
import { splitInterest } from '../interest-format';

// ============ Public API ============

export interface BoldHTMLOptions {
  previewProtection?: boolean;
  watermarkText?: string;
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

  const css = generateBoldCSS(tokens, bold, fontConfig);
  const header = generateBoldHeader(
    fullName,
    headline,
    avatarUrl,
    tokens,
    bold,
    overrides,
    contactInfo,
  );
  const sidebar = generateBoldSidebar(content, tokens, bold, overrides, avatarUrl, contactInfo);
  const main = generateBoldMain(content, tokens, bold, overrides);

  const protection = buildProtection(previewProtection, watermarkText);

  // Sidebar-left by default (classic Canva). Agent can override via tokens.layout.
  const sidebarSide = tokens.layout === 'sidebar-right' ? 'right' : 'left';

  return `<!DOCTYPE html>
<!-- Generated with AI assistance by CVeetje (cveetje.nl) — bold renderer -->
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
  <div class="bold-cv bold-sidebar-${sidebarSide} bold-header-${bold.headerLayout} bold-sidebar-style-${bold.sidebarStyle}">
    ${header}
    <div class="bold-body">
      ${sidebarSide === 'left' ? sidebar + main : main + sidebar}
    </div>
  </div>
  ${protection.script}
</body>
</html>`;
}

// ============ Resolve Bold Tokens ============

function resolveBoldTokens(tokens: CVDesignTokens): BoldTokens {
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
      min-height: 1120px;
      position: relative;
      overflow: hidden;
    }

    /* ================= Header variants ================= */
    ${getHeaderCSS(b, colors)}

    /* ================= Surface texture overlay ================= */
    ${getSurfaceTextureCSS(b.surfaceTexture, colors)}

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

    /* ================= Icons base ================= */
    ${getIconTreatmentCSS(b.iconTreatment, colors)}

    /* ================= Print ================= */
    @page {
      size: A4;
      margin: 0;
    }
    @media print {
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
      .bold-section, .bold-item { break-inside: avoid; }
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
      return `${base}
        .portrait-badge-framed {
          width: 130px;
          height: 130px;
          background: ${colors.accent};
          padding: 10px;
          border-radius: 12px;
          position: relative;
        }
        .portrait-badge-framed img {
          border-radius: 6px;
        }
        .portrait-badge-framed::before {
          content: '';
          position: absolute;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
          border: 2px solid ${colors.accent};
          border-radius: 16px;
          opacity: 0.4;
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
    summary: () => renderSummary(content.summary, overrides),
    experience: () => renderExperience(content.experience, tokens, overrides),
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

function renderSummary(summary: string, overrides?: CVElementOverrides | null): string {
  if (!summary) return '';
  if (getOverride(overrides, 'section-summary')?.hidden) return '';
  if (getOverride(overrides, 'summary')?.hidden) return '';
  const style = getOverrideStyle(getOverride(overrides, 'summary'));
  const paragraphs = summary.split('\n').filter(Boolean)
    .map((p) => `<p style="${style}">${escapeHtml(p)}</p>`)
    .join('');
  return `${sectionTitle('About')}<div class="bold-item-body">${paragraphs}</div>`;
}

function renderExperience(
  experience: GeneratedCVContent['experience'],
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null,
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
      body = `<p style="${descStyle}">${escapeHtml(exp.description)}</p>`;
    } else if (exp.highlights?.length) {
      body = `<ul>${exp.highlights.map((h, hi) =>
        `<li style="${getOverrideStyle(getOverride(overrides, `exp-${i}-highlight-${hi}`))}">${escapeHtml(h)}</li>`
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
      // Title set against a colored block with an accent tab peeking out
      // behind it (Kruger). Kept as an inline-block so the block sizes to
      // the text (no clipping) and doesn't use negative margins that
      // collided with neighboring content.
      return `${base}
        .bold-section-title {
          display: block;
          margin-bottom: 22px;
        }
        .bold-section-title .section-title-text {
          font-size: 22pt;
          font-weight: 900;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          background: ${colors.primary};
          padding: 8px 16px 6px;
          display: inline-block;
          position: relative;
          line-height: 1.15;
        }
        .bold-section-title .section-title-text::before {
          content: '';
          position: absolute;
          right: -10px;
          bottom: -8px;
          width: 32px;
          height: 14px;
          background: ${colors.accent};
          z-index: -1;
        }
        .bold-section-title .section-number {
          color: ${colors.accent};
          font-size: 14pt;
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
        .bold-item-subtitle {
          display: inline-block;
          padding: 1px 8px;
          background: ${colors.accent}1a;
          border-radius: 4px;
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
