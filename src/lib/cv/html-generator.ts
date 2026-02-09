/**
 * HTML Generator - Token-Based CV Generation
 *
 * Generates HTML from CVDesignTokens and GeneratedCVContent.
 *
 * Features:
 * - 100% print-safe CSS (no transforms, clip-path, hover effects)
 * - CSS Custom Properties for easy theming
 * - Template-based styling (header variants, section styles, skills display)
 * - WYSIWYG: identical output in browser preview and PDF
 */

import type { GeneratedCVContent, CVElementOverrides, ElementOverride, CVContactInfo } from '@/types';
import type { CVDesignTokens, ContactLayout } from '@/types/design-tokens';
import {
  getBaseCSS,
  getHeaderVariantCSS,
  getSectionStyleCSS,
  getSkillsDisplayCSS,
  getAccentStyleCSS,
  getNameStyleCSS,
  getSkillTagStyleCSS,
  getSidebarLayoutCSS,
  fullBleedPageCSS,
} from './templates/base.css';
import {
  getFontUrls,
  getFontPairingCSS,
  getTypeScaleCSS,
  getSpacingScaleCSS,
  getColorsCSS,
  getBorderRadiusCSS,
} from './templates/themes';
import { generateDecorationsHTML, decorationsCSS } from './templates/decorations';
import { contactIcons, contactIconsCSS } from './templates/icons';

// ============ Helper Functions ============

/**
 * Adjust color brightness (for gradient effects)
 * @param hex - Hex color code
 * @param percent - Positive = lighter, negative = darker
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = value + (255 * percent / 100);
    return Math.min(255, Math.max(0, Math.round(adjusted)));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Generate CSS for contact layout variants
 */
function getContactLayoutCSS(layout: ContactLayout): string {
  switch (layout) {
    case 'single-row':
      return `
        /* Contact Layout: Single Row */
        .cv-header .contact-info {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
          align-items: center;
        }
        .cv-header .contact-item {
          display: inline-flex;
          align-items: center;
        }
        .cv-header .contact-item:not(:last-child)::after {
          content: " • ";
          margin: 0 6px;
          opacity: 0.6;
        }
      `;

    case 'double-row':
      return `
        /* Contact Layout: Double Row */
        .cv-header .contact-info {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 16px;
          align-items: center;
        }
        .cv-header .contact-item {
          display: inline-flex;
          align-items: center;
        }
        .cv-header .contact-item:not(:last-child)::after {
          content: "";
        }
      `;

    case 'single-column':
      return `
        /* Contact Layout: Single Column */
        .cv-header .contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
        }
        .cv-header .contact-item {
          display: flex;
          align-items: center;
        }
        .cv-header .contact-item::after {
          content: none !important;
        }
      `;

    case 'double-column':
      return `
        /* Contact Layout: Double Column Grid */
        .cv-header .contact-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px 24px;
          align-items: start;
        }
        .cv-header .contact-item {
          display: flex;
          align-items: center;
        }
        .cv-header .contact-item::after {
          content: none !important;
        }
      `;

    default:
      return '';
  }
}

// ============ Main HTML Generator ============

export interface CVHTMLOptions {
  /** Enable copy protection for preview (watermark, disable select/copy) */
  previewProtection?: boolean;
  /** Custom watermark text */
  watermarkText?: string;
}

export function generateCVHTML(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  fullName: string,
  avatarUrl?: string | null,
  headline?: string | null,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null,
  options?: CVHTMLOptions
): string {
  const fontUrls = getFontUrls(tokens.fontPairing);

  // Generate decorations if enabled
  // Use a more random seed that combines name, timestamp, and random component
  // This ensures decorations are different each time while still being deterministic per render
  const nameSeed = fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const timeSeed = Date.now() % 100000; // Use last 5 digits of timestamp for variation
  const randomSeed = Math.floor(Math.random() * 10000); // Additional random component
  const decorationSeed = nameSeed + timeSeed + randomSeed;
  const decorationsHTML = tokens.decorations !== 'none'
    ? generateDecorationsHTML(
        tokens.colors.primary,
        tokens.colors.accent,
        tokens.decorations,
        decorationSeed,
        tokens.decorationTheme,  // Pass theme for creative/experimental modes
        tokens.customDecorations  // Pass custom decorations for experimental mode
      )
    : '';

  // Preview protection features
  const previewProtection = options?.previewProtection ?? false;
  const watermarkText = options?.watermarkText ?? 'PREVIEW';

  const protectionCSS = previewProtection ? `
    /* Copy Protection */
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    /* Watermark overlay */
    .watermark-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }

    .watermark-pattern {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around;
      align-content: space-around;
      transform: rotate(-30deg);
    }

    .watermark-text {
      font-family: Arial, sans-serif;
      font-size: 24px;
      font-weight: bold;
      color: rgba(128, 128, 128, 0.08);
      white-space: nowrap;
      padding: 40px 60px;
      letter-spacing: 4px;
    }
  ` : '';

  const protectionScript = previewProtection ? `
    <script>
      // Disable right-click context menu
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });

      // Disable copy
      document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
      });

      // Disable cut
      document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
      });

      // Disable keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        // Disable F12
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+S (Save)
        if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+A (Select All)
        if (e.ctrlKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+C (Copy)
        if (e.ctrlKey && (e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          return false;
        }
        // Disable Ctrl+P (Print)
        if (e.ctrlKey && (e.key === 'P' || e.key === 'p')) {
          e.preventDefault();
          return false;
        }
      });

      // Disable drag
      document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
      });
    </script>
  ` : '';

  // Generate watermark pattern (multiple texts to cover the page)
  const watermarkHTML = previewProtection ? `
    <div class="watermark-overlay">
      <div class="watermark-pattern">
        ${Array(50).fill(`<span class="watermark-text">${escapeHtml(watermarkText)}</span>`).join('')}
      </div>
    </div>
  ` : '';

  // Determine layout mode
  const isSidebar = tokens.layout && tokens.layout !== 'single-column';
  const sidebarClass = tokens.layout === 'sidebar-left' ? 'sidebar-left' : tokens.layout === 'sidebar-right' ? 'sidebar-right' : '';
  const defaultSidebarSections = ['skills', 'languages', 'certifications'];
  const sidebarSections = tokens.sidebarSections ?? defaultSidebarSections;

  // Generate content based on layout
  let bodyContent: string;
  if (isSidebar) {
    const mainSections = tokens.sectionOrder.filter(s => !sidebarSections.includes(s));
    const sidebarSectionNames = tokens.sectionOrder.filter(s => sidebarSections.includes(s));

    const mainHTML = generateSectionsFromList(mainSections, content, tokens, overrides);
    const sidebarHTML = generateSectionsFromList(sidebarSectionNames, content, tokens, overrides);

    bodyContent = `
    <div class="cv-body ${sidebarClass}">
      <main class="cv-main">${mainHTML}</main>
      <aside class="cv-sidebar">${sidebarHTML}</aside>
    </div>`;
  } else {
    bodyContent = generateSections(content, tokens, overrides);
  }

  return `<!DOCTYPE html>
<!-- Generated with AI assistance by CVeetje (cveetje.nl) -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullName)} - CV</title>
  ${fontUrls.map(url => `<link rel="stylesheet" href="${url}">`).join('\n  ')}
  <style>
    ${generateCSS(tokens)}
    ${protectionCSS}
  </style>
</head>
<body>
  ${watermarkHTML}
  <div class="cv-container${tokens.headerFullBleed ? ' full-bleed-mode' : ''}"${tokens.headerFullBleed ? ' style="padding: 0;"' : ''}>
    ${decorationsHTML}
    ${generateHeader(fullName, headline, avatarUrl, tokens, overrides, contactInfo)}
    ${bodyContent}
  </div>
  ${protectionScript}
</body>
</html>`;
}

// ============ CSS Generator ============

function generateCSS(tokens: CVDesignTokens): string {
  // Resolve border radius: borderRadius scale overrides roundedCorners boolean
  const resolvedBorderRadius = tokens.borderRadius ?? (tokens.roundedCorners ? 'small' : 'none');

  // Build CSS variables from tokens
  const cssVariables = `
    :root {
      ${getColorsCSS(tokens.colors)}
      ${getFontPairingCSS(tokens.fontPairing)}
      ${getTypeScaleCSS(tokens.scale)}
      ${getSpacingScaleCSS(tokens.spacing)}
      ${getBorderRadiusCSS(tokens.roundedCorners, resolvedBorderRadius)}
    }
  `;

  // Combine base CSS with variant-specific CSS
  const cssParts = [
    cssVariables,
    getBaseCSS(),
    getHeaderVariantCSS(tokens.headerVariant),
    getSectionStyleCSS(tokens.sectionStyle),
    getSkillsDisplayCSS(tokens.skillsDisplay),
  ];

  // For banner header, add explicit color values to ensure they work
  // even if CSS variables have issues in some browser/iframe contexts
  if (tokens.headerVariant === 'banner') {
    // Generate gradient background if enabled
    let backgroundCSS = `background-color: ${tokens.colors.primary} !important;`;
    if (tokens.headerGradient === 'subtle') {
      // Subtle linear gradient - darker at top, lighter at bottom
      backgroundCSS = `background: linear-gradient(180deg, ${tokens.colors.primary} 0%, ${adjustColorBrightness(tokens.colors.primary, 15)} 100%) !important;`;
    } else if (tokens.headerGradient === 'radial') {
      // Luxurious radial glow from center
      backgroundCSS = `background: radial-gradient(ellipse at 30% 50%, ${adjustColorBrightness(tokens.colors.primary, 20)} 0%, ${tokens.colors.primary} 70%) !important;`;
    }

    cssParts.push(`
      /* Banner header explicit colors (fallback for CSS variable issues) */
      .cv-header {
        ${backgroundCSS}
        color: #ffffff !important;
      }
      .cv-header h1.name {
        color: #ffffff !important;
      }
      .cv-header .headline {
        color: rgba(255, 255, 255, 0.9) !important;
      }
      .cv-header .contact-info,
      .cv-header .contact-item {
        color: rgba(255, 255, 255, 0.8) !important;
      }
      .cv-header .contact-info a {
        color: rgba(255, 255, 255, 0.9) !important;
      }
    `);
  }

  // Add contact layout styles
  cssParts.push(getContactLayoutCSS(tokens.contactLayout));

  // Add decorations CSS if enabled
  if (tokens.decorations !== 'none') {
    cssParts.push(decorationsCSS);
  }

  // Add icons CSS if enabled
  if (tokens.useIcons) {
    cssParts.push(contactIconsCSS);
  }

  // Add accent style CSS (summary styling)
  if (tokens.accentStyle && tokens.accentStyle !== 'none') {
    cssParts.push(getAccentStyleCSS(tokens.accentStyle));
  }

  // Add name style CSS
  if (tokens.nameStyle && tokens.nameStyle !== 'normal') {
    cssParts.push(getNameStyleCSS(tokens.nameStyle));
  }

  // Add skill tag style CSS
  if (tokens.skillTagStyle && tokens.skillTagStyle !== 'filled') {
    cssParts.push(getSkillTagStyleCSS(tokens.skillTagStyle));
  }

  // Add sidebar layout CSS
  if (tokens.layout && tokens.layout !== 'single-column') {
    cssParts.push(getSidebarLayoutCSS());
  }

  // Add full-bleed @page rules ONLY when headerFullBleed is active
  if (tokens.headerFullBleed) {
    cssParts.push(fullBleedPageCSS);
  }

  // Add page background
  if (tokens.pageBackground && tokens.pageBackground !== '#ffffff') {
    cssParts.push(`
      html, body {
        background: ${tokens.pageBackground};
      }
      .cv-container {
        background: ${tokens.pageBackground};
      }
    `);
  }

  return cssParts.join('\n');
}

// ============ Header Generator ============

function generateHeader(
  fullName: string,
  headline: string | null | undefined,
  avatarUrl: string | null | undefined,
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null,
  contactInfo?: CVContactInfo | null
): string {
  const headerOverride = getOverride(overrides, 'header');
  if (headerOverride?.hidden) return '';

  const headerStyle = getOverrideStyle(headerOverride);
  const photoClass = avatarUrl && tokens.showPhoto ? 'with-photo' : '';

  // Generate contact info HTML with optional icons
  const useIcons = tokens.useIcons;
  const contactItems: string[] = [];

  if (contactInfo?.email) {
    const icon = useIcons ? contactIcons.email : '';
    contactItems.push(`<span class="contact-item">${icon}${escapeHtml(contactInfo.email)}</span>`);
  }
  if (contactInfo?.phone) {
    const icon = useIcons ? contactIcons.phone : '';
    contactItems.push(`<span class="contact-item">${icon}${escapeHtml(contactInfo.phone)}</span>`);
  }
  if (contactInfo?.location) {
    const icon = useIcons ? contactIcons.location : '';
    contactItems.push(`<span class="contact-item">${icon}${escapeHtml(contactInfo.location)}</span>`);
  }
  if (contactInfo?.linkedinUrl) {
    const icon = useIcons ? contactIcons.linkedin : '';
    // Format LinkedIn URL nicely
    const linkedinDisplay = contactInfo.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '');
    contactItems.push(`<span class="contact-item">${icon}<a href="${escapeHtml(contactInfo.linkedinUrl.startsWith('http') ? contactInfo.linkedinUrl : 'https://' + contactInfo.linkedinUrl)}">linkedin.com/in/${escapeHtml(linkedinDisplay)}</a></span>`);
  }
  if (contactInfo?.github) {
    const icon = useIcons ? contactIcons.github : '';
    const githubDisplay = contactInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '');
    contactItems.push(`<span class="contact-item">${icon}<a href="${escapeHtml(contactInfo.github.startsWith('http') ? contactInfo.github : 'https://github.com/' + contactInfo.github)}">github.com/${escapeHtml(githubDisplay)}</a></span>`);
  }
  if (contactInfo?.website) {
    const icon = useIcons ? contactIcons.website : '';
    const websiteUrl = contactInfo.website.startsWith('http') ? contactInfo.website : 'https://' + contactInfo.website;
    contactItems.push(`<span class="contact-item">${icon}<a href="${escapeHtml(websiteUrl)}">${escapeHtml(contactInfo.website.replace(/^https?:\/\//, ''))}</a></span>`);
  }

  const contactHtml = contactItems.length > 0
    ? `<div class="contact-info">${contactItems.join('\n          ')}</div>`
    : '';

  // Get element-specific color overrides
  const nameOverride = getOverride(overrides, 'header-name');
  const headlineOverride = getOverride(overrides, 'header-headline');
  const nameStyle = getOverrideStyle(nameOverride);
  const headlineStyle = getOverrideStyle(headlineOverride);

  // For split header, structure is different
  if (tokens.headerVariant === 'split') {
    // When photo is present, wrap name/headline in a container for proper flex layout
    const nameHeadlineContent = `
      <h1 class="name" style="${nameStyle}">${escapeHtml(fullName)}</h1>
      ${headline ? `<p class="headline" style="${headlineStyle}">${escapeHtml(headline)}</p>` : ''}
    `;

    return `
    <header class="cv-header ${photoClass}" style="${headerStyle}">
      <div class="header-left">
        ${avatarUrl && tokens.showPhoto ? generateAvatar(avatarUrl, tokens.roundedCorners) : ''}
        ${avatarUrl && tokens.showPhoto ? `<div class="header-info">${nameHeadlineContent}</div>` : nameHeadlineContent}
      </div>
      <div class="header-right">
        ${contactHtml}
      </div>
    </header>`;
  }

  // Standard header layout (simple, accented, banner)
  return `
  <header class="cv-header ${photoClass}" style="${headerStyle}">
    ${avatarUrl && tokens.showPhoto ? generateAvatar(avatarUrl, tokens.roundedCorners) : ''}
    <div class="header-content">
      <h1 class="name" style="${nameStyle}">${escapeHtml(fullName)}</h1>
      ${headline ? `<p class="headline" style="${headlineStyle}">${escapeHtml(headline)}</p>` : ''}
      ${contactHtml}
    </div>
  </header>`;
}

function generateAvatar(avatarUrl: string, rounded: boolean): string {
  const shapeClass = rounded ? 'circle' : 'square';
  return `
    <div class="avatar-container ${shapeClass}">
      <img src="${escapeHtml(avatarUrl)}" alt="Profile photo" />
    </div>`;
}

// ============ Sections Generator ============

function generateSections(
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null
): string {
  const sectionGenerators: Record<string, () => string> = {
    summary: () => generateSummary(content.summary, overrides),
    experience: () => generateExperience(content.experience, tokens, overrides),
    education: () => generateEducation(content.education, overrides),
    skills: () => generateSkills(content.skills, tokens, overrides),
    languages: () => generateLanguages(content.languages, overrides),
    certifications: () => generateCertifications(content.certifications, overrides),
  };

  return tokens.sectionOrder
    .map(sectionName => {
      const generator = sectionGenerators[sectionName];
      return generator ? generator() : '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Generate sections from an explicit list of section names (for sidebar layout split)
 */
function generateSectionsFromList(
  sectionNames: string[],
  content: GeneratedCVContent,
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null
): string {
  const sectionGenerators: Record<string, () => string> = {
    summary: () => generateSummary(content.summary, overrides),
    experience: () => generateExperience(content.experience, tokens, overrides),
    education: () => generateEducation(content.education, overrides),
    skills: () => generateSkills(content.skills, tokens, overrides),
    languages: () => generateLanguages(content.languages, overrides),
    certifications: () => generateCertifications(content.certifications, overrides),
  };

  return sectionNames
    .map(name => {
      const generator = sectionGenerators[name];
      return generator ? generator() : '';
    })
    .filter(Boolean)
    .join('\n');
}

// ============ Summary Section ============

function generateSummary(
  summary: string,
  overrides?: CVElementOverrides | null
): string {
  if (!summary) return '';

  const sectionOverride = getOverride(overrides, 'section-summary');
  if (sectionOverride?.hidden) return '';

  const summaryOverride = getOverride(overrides, 'summary');
  if (summaryOverride?.hidden) return '';

  const summaryStyle = getOverrideStyle(summaryOverride);

  return `
  <section class="section" data-section="summary">
    <h2 class="section-title">Summary</h2>
    <div class="section-content">
      <div class="summary" style="${summaryStyle}">
        ${summary.split('\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}
      </div>
    </div>
  </section>`;
}

// ============ Experience Section ============

function generateExperience(
  experience: GeneratedCVContent['experience'],
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null
): string {
  if (!experience || experience.length === 0) return '';

  const sectionOverride = getOverride(overrides, 'section-experience');
  if (sectionOverride?.hidden) return '';

  const items = experience.map((exp, index) => {
    const itemOverride = getOverride(overrides, `experience-${index}`);
    if (itemOverride?.hidden) return '';

    // Get element-specific color overrides
    const titleStyle = getOverrideStyle(getOverride(overrides, `exp-${index}-title`));
    const companyStyle = getOverrideStyle(getOverride(overrides, `exp-${index}-company`));
    const periodStyle = getOverrideStyle(getOverride(overrides, `exp-${index}-period`));

    // Generate content based on format (paragraph vs bullets)
    let contentHtml = '';

    // Check if we should use paragraph format
    if (tokens.experienceDescriptionFormat === 'paragraph' && exp.description) {
      // Paragraph format
      const descStyle = getOverrideStyle(getOverride(overrides, `exp-${index}-description`));
      contentHtml = `<p class="item-description" style="${descStyle}">${escapeHtml(exp.description)}</p>`;
    } else if (exp.highlights && exp.highlights.length > 0) {
      // Bullet format (default)
      contentHtml = `<ul class="item-highlights">
          ${exp.highlights.map((h, hIndex) => {
            const highlightStyle = getOverrideStyle(getOverride(overrides, `exp-${index}-highlight-${hIndex}`));
            return `<li style="${highlightStyle}">${escapeHtml(h)}</li>`;
          }).join('')}
        </ul>`;
    }

    return `
      <div class="item" data-id="experience-${index}" style="${getOverrideStyle(itemOverride)}">
        <div class="item-header">
          <div>
            <div class="item-title" style="${titleStyle}">${escapeHtml(exp.title)}</div>
            <div class="item-subtitle" style="${companyStyle}">${escapeHtml(exp.company)}</div>
          </div>
          <div class="item-meta">
            ${exp.period ? `<span class="period" style="${periodStyle}">${escapeHtml(exp.period)}</span>` : ''}
            ${exp.location ? `<br><span class="location">${escapeHtml(exp.location)}</span>` : ''}
          </div>
        </div>
        ${contentHtml}
      </div>`;
  }).filter(Boolean).join('');

  return `
  <section class="section" data-section="experience">
    <h2 class="section-title">Experience</h2>
    <div class="section-content">
      ${items}
    </div>
  </section>`;
}

// ============ Education Section ============

function generateEducation(
  education: GeneratedCVContent['education'],
  overrides?: CVElementOverrides | null
): string {
  if (!education || education.length === 0) return '';

  const sectionOverride = getOverride(overrides, 'section-education');
  if (sectionOverride?.hidden) return '';

  const items = education.map((edu, index) => {
    const itemOverride = getOverride(overrides, `education-${index}`);
    if (itemOverride?.hidden) return '';

    // Get element-specific color overrides
    const degreeStyle = getOverrideStyle(getOverride(overrides, `edu-${index}-degree`));
    const institutionStyle = getOverrideStyle(getOverride(overrides, `edu-${index}-institution`));
    const yearStyle = getOverrideStyle(getOverride(overrides, `edu-${index}-year`));
    const detailsStyle = getOverrideStyle(getOverride(overrides, `edu-${index}-details`));

    return `
      <div class="item" data-id="education-${index}" style="${getOverrideStyle(itemOverride)}">
        <div class="item-header">
          <div>
            <div class="item-title" style="${degreeStyle}">${escapeHtml(edu.degree)}</div>
            <div class="item-subtitle" style="${institutionStyle}">${escapeHtml(edu.institution)}</div>
          </div>
          <div class="item-meta">
            ${edu.year ? `<span class="period" style="${yearStyle}">${escapeHtml(edu.year)}</span>` : ''}
          </div>
        </div>
        ${edu.details ? `<p class="item-description" style="${detailsStyle}">${escapeHtml(edu.details)}</p>` : ''}
      </div>`;
  }).filter(Boolean).join('');

  return `
  <section class="section" data-section="education">
    <h2 class="section-title">Education</h2>
    <div class="section-content">
      ${items}
    </div>
  </section>`;
}

// ============ Skills Section ============

function generateSkills(
  skills: GeneratedCVContent['skills'],
  tokens: CVDesignTokens,
  overrides?: CVElementOverrides | null
): string {
  if (!skills || (skills.technical.length === 0 && skills.soft.length === 0)) return '';

  const sectionOverride = getOverride(overrides, 'section-skills');
  if (sectionOverride?.hidden) return '';

  const displayStyle = tokens.skillsDisplay;

  // Generate based on display style
  let skillsContent = '';

  if (displayStyle === 'tags') {
    skillsContent = generateSkillsTags(skills, overrides);
  } else if (displayStyle === 'list') {
    skillsContent = generateSkillsList(skills, overrides);
  } else {
    skillsContent = generateSkillsCompact(skills, overrides);
  }

  return `
  <section class="section" data-section="skills">
    <h2 class="section-title">Skills</h2>
    <div class="section-content">
      ${skillsContent}
    </div>
  </section>`;
}

function generateSkillsTags(
  skills: GeneratedCVContent['skills'],
  overrides?: CVElementOverrides | null
): string {
  const renderGroup = (title: string, items: string[], prefix: string) => {
    if (items.length === 0) return '';

    const tags = items.map((skill, index) => {
      const itemOverride = getOverride(overrides, `${prefix}-${index}`);
      if (itemOverride?.hidden) return '';
      return `<span class="skill-tag" data-id="${prefix}-${index}" style="${getOverrideStyle(itemOverride)}">${escapeHtml(skill)}</span>`;
    }).filter(Boolean).join('');

    return `
      <div class="skills-group">
        <div class="skills-group-title">${title}</div>
        <div class="skills-container">${tags}</div>
      </div>`;
  };

  return `
    ${renderGroup('Technical', skills.technical, 'skill-tech')}
    ${renderGroup('Soft Skills', skills.soft, 'skill-soft')}
  `;
}

function generateSkillsList(
  skills: GeneratedCVContent['skills'],
  overrides?: CVElementOverrides | null
): string {
  const renderGroup = (title: string, items: string[], prefix: string) => {
    if (items.length === 0) return '';

    const listItems = items.map((skill, index) => {
      const itemOverride = getOverride(overrides, `${prefix}-${index}`);
      if (itemOverride?.hidden) return '';
      return `<div class="skill-item" data-id="${prefix}-${index}" style="${getOverrideStyle(itemOverride)}">${escapeHtml(skill)}</div>`;
    }).filter(Boolean).join('');

    return `
      <div class="skills-group">
        <div class="skills-group-title">${title}</div>
        <div class="skills-container">${listItems}</div>
      </div>`;
  };

  return `
    ${renderGroup('Technical', skills.technical, 'skill-tech')}
    ${renderGroup('Soft Skills', skills.soft, 'skill-soft')}
  `;
}

function generateSkillsCompact(
  skills: GeneratedCVContent['skills'],
  overrides?: CVElementOverrides | null
): string {
  const renderGroup = (title: string, items: string[], prefix: string) => {
    if (items.length === 0) return '';

    const skillItems = items.map((skill, index) => {
      const itemOverride = getOverride(overrides, `${prefix}-${index}`);
      if (itemOverride?.hidden) return '';
      return `<span class="skill-item" data-id="${prefix}-${index}" style="${getOverrideStyle(itemOverride)}">${escapeHtml(skill)}</span>`;
    }).filter(Boolean).join('');

    return `
      <div class="skills-group">
        <span class="skills-group-title">${title}: </span>
        <div class="skills-container">${skillItems}</div>
      </div>`;
  };

  return `
    ${renderGroup('Technical', skills.technical, 'skill-tech')}
    ${renderGroup('Soft Skills', skills.soft, 'skill-soft')}
  `;
}

// ============ Languages Section ============

function generateLanguages(
  languages: GeneratedCVContent['languages'],
  overrides?: CVElementOverrides | null
): string {
  if (!languages || languages.length === 0) return '';

  const sectionOverride = getOverride(overrides, 'section-languages');
  if (sectionOverride?.hidden) return '';

  const items = languages.map((lang, index) => {
    const itemOverride = getOverride(overrides, `language-${index}`);
    if (itemOverride?.hidden) return '';

    return `
      <div class="language-item" data-id="language-${index}" style="${getOverrideStyle(itemOverride)}">
        <span class="language-name">${escapeHtml(lang.language)}</span>
        ${lang.level ? ` <span class="language-level">(${escapeHtml(lang.level)})</span>` : ''}
      </div>`;
  }).filter(Boolean).join('');

  return `
  <section class="section" data-section="languages">
    <h2 class="section-title">Languages</h2>
    <div class="section-content">
      <div class="languages-list">
        ${items}
      </div>
    </div>
  </section>`;
}

// ============ Certifications Section ============

function generateCertifications(
  certifications: string[],
  overrides?: CVElementOverrides | null
): string {
  if (!certifications || certifications.length === 0) return '';

  const sectionOverride = getOverride(overrides, 'section-certifications');
  if (sectionOverride?.hidden) return '';

  const items = certifications.map((cert, index) => {
    const itemOverride = getOverride(overrides, `certification-${index}`);
    if (itemOverride?.hidden) return '';

    return `
      <li class="certification-item" data-id="certification-${index}" style="${getOverrideStyle(itemOverride)}">
        <span class="certification-name">${escapeHtml(cert)}</span>
      </li>`;
  }).filter(Boolean).join('');

  return `
  <section class="section" data-section="certifications">
    <h2 class="section-title">Certifications</h2>
    <div class="section-content">
      <ul class="certifications-list">
        ${items}
      </ul>
    </div>
  </section>`;
}

// ============ Override Helpers ============

function getOverride(
  overrides: CVElementOverrides | null | undefined,
  elementId: string
): ElementOverride | undefined {
  return overrides?.overrides.find(o => o.elementId === elementId);
}

function getOverrideStyle(override: ElementOverride | undefined): string {
  if (!override) return '';

  const styles: string[] = [];

  if (override.colorOverride) {
    styles.push(`color: ${override.colorOverride}`);
  }

  if (override.backgroundOverride) {
    styles.push(`background-color: ${override.backgroundOverride}`);
  }

  return styles.join('; ');
}

// ============ Utility Functions ============

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}

// ============ Default Tokens Generator ============

/**
 * Generate default design tokens for fallback scenarios.
 * Used when AI generation fails or for quick preview.
 */
export function getDefaultTokens(): CVDesignTokens {
  return {
    styleName: 'Professional Modern',
    styleRationale: 'Clean, professional design suitable for most industries.',
    industryFit: 'general',
    themeBase: 'professional',
    colors: {
      primary: '#1a365d',
      secondary: '#f7fafc',
      accent: '#2b6cb0',
      text: '#2d3748',
      muted: '#718096',
    },
    fontPairing: 'inter-inter',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'simple',
    sectionStyle: 'underlined',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: false,
    useIcons: false,
    roundedCorners: true,
    headerFullBleed: false,
    decorations: 'none',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
  };
}
