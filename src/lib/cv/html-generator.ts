/**
 * Shared HTML Generator for CV Preview and PDF
 *
 * This module generates the exact same HTML for both the browser preview
 * and the PDF generator, ensuring WYSIWYG consistency.
 */

import type {
  GeneratedCVContent,
  CVStyleConfig,
  CVColorScheme,
  FontFamily,
  SVGDecorationResult,
  CVElementOverrides,
  ElementOverride,
} from '@/types';
import { generateSVGDecorations } from '@/lib/svg/decorations';

// ============ Color Contrast Utilities ============

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle shorthand hex (#fff -> #ffffff)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 * Returns value between 0 (darkest) and 1 (lightest)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Get contrasting text color based on background luminance
 * Returns dark text for light backgrounds, white text for dark backgrounds
 */
function getContrastColor(bgHex: string): string {
  try {
    const luminance = getLuminance(bgHex);
    // Threshold of 0.5 provides good contrast for most cases
    // Using slightly lower threshold (0.4) to prefer white text more often
    // as it tends to look more professional on colored backgrounds
    return luminance > 0.4 ? '#1a1a1a' : '#ffffff';
  } catch {
    // Fallback to white if hex parsing fails
    return '#ffffff';
  }
}

/**
 * Darken a hex color by a percentage
 * @param hex - The hex color to darken
 * @param percent - Percentage to darken (0-100)
 */
function darkenColor(hex: string, percent: number): string {
  try {
    const rgb = hexToRgb(hex);
    return '#' + [rgb.r, rgb.g, rgb.b]
      .map(v => Math.max(0, Math.round(v * (1 - percent / 100))))
      .map(v => v.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return hex; // Return original if parsing fails
  }
}

/**
 * Get appropriate section title color based on header style
 * For gradient/banner headers, uses a darker variant to avoid color clash
 */
function getSectionTitleColor(
  colors: { primary: string; text: string },
  headerStyle: string
): string {
  // For banner and gradient headers, the primary color is used prominently
  // Section titles should use a darker variant to create visual distinction
  if (['banner', 'full-width-accent'].includes(headerStyle)) {
    return darkenColor(colors.primary, 25); // 25% darker for contrast
  }
  return colors.primary;
}

// ============ Font Configuration ============

// Font mapping for Google Fonts
const fontFamilyMap: Record<FontFamily, string> = {
  'inter': "'Inter', sans-serif",
  'georgia': "'Georgia', serif",
  'roboto': "'Roboto', sans-serif",
  'merriweather': "'Merriweather', serif",
  'source-sans': "'Source Sans 3', sans-serif",
  'playfair': "'Playfair Display', serif",
  'open-sans': "'Open Sans', sans-serif",
};

const googleFontUrls: Record<FontFamily, string> = {
  'inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'georgia': '', // System font
  'roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap',
  'source-sans': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap',
  'playfair': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
};

// Generate a default style config based on color scheme for when AI-generated style is missing
export function getDefaultStyleConfig(colorScheme: CVColorScheme): CVStyleConfig {
  return {
    styleName: 'Professional Modern',
    styleRationale: 'Clean, professional design with modern accents',
    colors: {
      primary: colorScheme.primary,
      secondary: colorScheme.secondary,
      accent: colorScheme.accent,
      text: '#333333',
      muted: '#666666',
    },
    typography: {
      headingFont: 'inter',
      bodyFont: 'inter',
      nameSizePt: 26,
      headingSizePt: 13,
      bodySizePt: 10,
      lineHeight: 1.5,
    },
    layout: {
      style: 'single-column',
      headerStyle: 'left-aligned',
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
      sectionDivider: 'accent-bar',
      skillDisplay: 'tags',
      spacing: 'normal',
      showPhoto: false,
    },
    decorations: {
      intensity: 'moderate',
      useBorders: false,
      useBackgrounds: true,
      iconStyle: 'none',
      cornerStyle: 'rounded',
      itemStyle: 'card-subtle',
      headerAccent: 'underline',
      svgDecorations: {
        enabled: true,
        theme: 'minimal',
        placement: 'corners',
        opacity: 0.12,
        scale: 'medium',
        colorSource: 'primary',
      },
    },
    industryFit: 'general',
    formalityLevel: 'professional',
    customCSS: {
      headerCSS: 'box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08);',
      itemCSS: 'box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06); border-radius: 8px;',
    },
  };
}

// Helper to get override for an element
function getOverride(overrides: CVElementOverrides | null | undefined, elementId: string): ElementOverride | undefined {
  return overrides?.overrides.find(o => o.elementId === elementId);
}

// Generate inline style from override
function getOverrideStyle(override: ElementOverride | undefined): string {
  if (!override) return '';
  const styles: string[] = [];
  if (override.hidden) styles.push('display: none !important');
  if (override.colorOverride) styles.push(`color: ${override.colorOverride} !important`);
  if (override.backgroundOverride) styles.push(`background-color: ${override.backgroundOverride} !important`);
  return styles.length > 0 ? `style="${styles.join('; ')}"` : '';
}

// Generate edit mode script for interactive preview
function generateEditModeScript(): string {
  return `
    <script>
      (function() {
        let editMode = false;
        let selectedElement = null;

        // Listen for edit mode toggle from parent
        window.addEventListener('message', function(e) {
          if (e.data.type === 'setEditMode') {
            editMode = e.data.enabled;
            document.body.classList.toggle('cv-edit-mode', editMode);
            if (!editMode && selectedElement) {
              selectedElement.classList.remove('cv-selected');
              selectedElement = null;
            }
          }
        });

        // Handle element clicks in edit mode
        document.addEventListener('click', function(e) {
          if (!editMode) return;

          e.preventDefault();
          e.stopPropagation();

          // Find closest editable element
          const editable = e.target.closest('[data-element-id]');
          if (!editable) return;

          // Deselect previous
          if (selectedElement) {
            selectedElement.classList.remove('cv-selected');
          }

          // Select new element
          selectedElement = editable;
          selectedElement.classList.add('cv-selected');

          // Send selection to parent
          window.parent.postMessage({
            type: 'elementSelected',
            elementId: editable.dataset.elementId,
            elementType: editable.dataset.elementType,
            elementLabel: editable.dataset.elementLabel || editable.textContent.slice(0, 50)
          }, '*');
        });

        // Handle deselection
        document.addEventListener('click', function(e) {
          if (!editMode) return;
          if (!e.target.closest('[data-element-id]')) {
            if (selectedElement) {
              selectedElement.classList.remove('cv-selected');
              selectedElement = null;
              window.parent.postMessage({ type: 'elementDeselected' }, '*');
            }
          }
        });
      })();
    </script>
  `;
}

// Generate edit mode CSS
function generateEditModeCSS(): string {
  return `
    /* Edit mode styles */
    .cv-edit-mode [data-element-id] {
      cursor: pointer;
      transition: outline 0.15s ease, box-shadow 0.15s ease;
    }

    .cv-edit-mode [data-element-id]:hover {
      outline: 2px dashed #3b82f6;
      outline-offset: 2px;
    }

    .cv-edit-mode [data-element-id].cv-selected {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    /* Hidden elements in edit mode show as faded */
    .cv-edit-mode [data-element-id][style*="display: none"] {
      display: block !important;
      opacity: 0.3;
      position: relative;
    }

    .cv-edit-mode [data-element-id][style*="display: none"]::after {
      content: 'HIDDEN';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
  `;
}

/**
 * Generate complete HTML for CV - used by both preview and PDF
 */
export function generateCVHTML(
  content: GeneratedCVContent,
  style: CVStyleConfig,
  fullName: string,
  avatarUrl?: string | null,
  headline?: string | null,
  elementOverrides?: CVElementOverrides | null,
  editModeEnabled?: boolean
): string {
  const css = generateDynamicStyles(style);
  const fontLinks = getFontLinks(style);

  // Generate SVG decorations if enabled
  const svgDecorations = generateSVGDecorations(
    style.decorations.svgDecorations,
    style.colors
  );
  const svgDecorationsHTML = generateSVGDecorationsHTML(svgDecorations);
  const svgDecorationsCSS = svgDecorations ? generateSVGDecorationsCSS() : '';

  // Generate section content in the specified order
  const sections = style.layout.sectionOrder.map(sectionId => {
    switch (sectionId) {
      case 'summary':
        return generateSummarySection(content.summary, style, elementOverrides);
      case 'experience':
        return generateExperienceSection(content.experience, style, elementOverrides);
      case 'education':
        return generateEducationSection(content.education, style, elementOverrides);
      case 'skills':
        return generateSkillsSection(content.skills, style, elementOverrides);
      case 'languages':
        return content.languages.length > 0
          ? generateLanguagesSection(content.languages, style, elementOverrides)
          : '';
      case 'certifications':
        return content.certifications.length > 0
          ? generateCertificationsSection(content.certifications, style, elementOverrides)
          : '';
      default:
        return '';
    }
  }).filter(Boolean).join('\n');

  // Always use single-column layout for reliable PDF rendering
  const header = generateHeader(fullName, style, avatarUrl, headline, elementOverrides);

  // Generate edit mode CSS and script if enabled
  const editModeCSS = editModeEnabled ? generateEditModeCSS() : '';
  const editModeScript = editModeEnabled ? generateEditModeScript() : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV - ${fullName}</title>
  ${fontLinks}
  <style>
    ${css}
    ${svgDecorationsCSS}
    ${editModeCSS}
  </style>
</head>
<body>
  <div class="cv-wrapper">
    ${svgDecorationsHTML}
    <div class="cv-container">
      ${header}
      ${sections}
    </div>
  </div>
  ${editModeScript}
</body>
</html>`;
}

// Generate SVG decorations HTML wrapper
function generateSVGDecorationsHTML(decorations: SVGDecorationResult | null): string {
  if (!decorations) return '';

  let html = '<div class="svg-decorations">';

  if (decorations.topLeft) {
    html += `<div class="decoration top-left">${decorations.topLeft}</div>`;
  }
  if (decorations.topRight) {
    html += `<div class="decoration top-right">${decorations.topRight}</div>`;
  }
  if (decorations.bottomLeft) {
    html += `<div class="decoration bottom-left">${decorations.bottomLeft}</div>`;
  }
  if (decorations.bottomRight) {
    html += `<div class="decoration bottom-right">${decorations.bottomRight}</div>`;
  }
  if (decorations.background) {
    html += `<div class="decoration background">${decorations.background}</div>`;
  }

  html += '</div>';
  return html;
}

// Generate SVG decorations CSS
function generateSVGDecorationsCSS(): string {
  return `
    .svg-decorations {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }

    .svg-decorations .decoration {
      position: absolute;
    }

    .svg-decorations .decoration.top-left {
      top: 0;
      left: 0;
    }

    .svg-decorations .decoration.top-right {
      top: 0;
      right: 0;
    }

    .svg-decorations .decoration.bottom-left {
      bottom: 0;
      left: 0;
    }

    .svg-decorations .decoration.bottom-right {
      bottom: 0;
      right: 0;
    }

    .svg-decorations .decoration.background {
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .cv-container {
      position: relative;
      z-index: 1;
    }
  `;
}

function getFontLinks(style: CVStyleConfig): string {
  const fonts = new Set([style.typography.headingFont, style.typography.bodyFont]);
  const links: string[] = [];

  fonts.forEach(font => {
    const url = googleFontUrls[font];
    if (url) {
      links.push(`<link href="${url}" rel="stylesheet">`);
    }
  });

  return links.join('\n  ');
}

function generateDynamicStyles(style: CVStyleConfig): string {
  const { colors, typography, layout, decorations } = style;
  const headingFont = fontFamilyMap[typography.headingFont];
  const bodyFont = fontFamilyMap[typography.bodyFont];

  // Spacing values based on density
  const spacingMap = {
    compact: { section: '10pt', item: '8pt' },
    normal: { section: '15pt', item: '12pt' },
    spacious: { section: '20pt', item: '15pt' },
  };
  const spacing = spacingMap[layout.spacing];

  // Border radius based on corner style
  const radiusMap = {
    sharp: '0',
    rounded: '4pt',
    pill: '20pt',
  };
  const borderRadius = radiusMap[decorations.cornerStyle];

  // Decoration intensity adjustments
  const headerBorder = decorations.intensity === 'subtle' ? '1pt' : '2pt';

  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${bodyFont};
      font-size: ${typography.bodySizePt}pt;
      line-height: ${typography.lineHeight};
      color: ${colors.text};
      background: white;
    }

    .cv-wrapper {
      position: relative;
      min-height: 100%;
    }

    .cv-container {
      max-width: 100%;
      padding: 0;
      position: relative;
      z-index: 1;
    }

    /* Header Styles */
    .cv-header {
      margin-bottom: ${spacing.section};
      padding-bottom: ${spacing.item};
      position: relative;
      ${getHeaderStyleCSS(layout.headerStyle, colors, headerBorder, layout.headerGradientAngle, layout.headerPadding)}
    }

    /* Header accent decorations */
    ${getHeaderAccentStyles(decorations.headerAccent, colors, layout.headerStyle)}

    .cv-header.with-accent {
      position: relative;
    }

    .cv-header.centered {
      text-align: center;
    }

    .cv-header.left-aligned {
      text-align: left;
    }

    .name {
      font-family: ${headingFont};
      font-size: ${layout.headerStyle === 'bold-name' ? typography.nameSizePt + 6 : typography.nameSizePt}pt;
      font-weight: 700;
      color: ${['banner', 'full-width-accent'].includes(layout.headerStyle) ? getContrastColor(colors.primary) : colors.primary};
      margin-bottom: 3pt;
      ${layout.headerStyle === 'bold-name' ? 'letter-spacing: -0.5pt;' : ''}
    }

    .headline {
      font-family: ${bodyFont};
      font-size: ${Number(typography.bodySizePt) + 1}pt;
      color: ${['banner', 'full-width-accent'].includes(layout.headerStyle)
        ? (getLuminance(colors.primary) > 0.4 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)')
        : colors.muted};
      margin-top: 0;
      margin-bottom: 5pt;
      font-weight: 500;
    }

    /* Timeline item dot */
    .item.timeline::before {
      content: '';
      position: absolute;
      left: -5pt;
      top: 5pt;
      width: 8pt;
      height: 8pt;
      background: ${colors.primary};
      border-radius: 50%;
    }

    /* Minimal dots marker */
    .item.minimal-dots::before {
      content: '•';
      position: absolute;
      left: 0;
      top: 0;
      color: ${colors.primary};
      font-size: 14pt;
      line-height: 1;
    }

    .avatar-container {
      width: 80pt;
      height: 80pt;
      border-radius: 50%;
      overflow: hidden;
      display: inline-block;
      background: transparent;
      flex-shrink: 0;
      ${decorations.useBorders ? `border: 2pt solid ${colors.primary};` : ''}
    }

    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 0;
      display: block;
    }

    /* Section Styles */
    .cv-section {
      margin-bottom: ${spacing.section};
    }

    .section-title {
      font-family: ${headingFont};
      font-size: ${typography.headingSizePt}pt;
      font-weight: 600;
      color: ${getSectionTitleColor(colors, layout.headerStyle)};
      margin-bottom: ${spacing.item};
      padding-bottom: 3pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      ${getSectionDividerStyles(layout.sectionDivider, colors, decorations)}
    }

    /* Experience & Education Items */
    .item {
      margin-bottom: ${spacing.item};
      ${getItemStyles(decorations.itemStyle, decorations.useBorders, colors, borderRadius, decorations.itemBorderWidth)}
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5pt;
    }

    .item-title {
      font-family: ${headingFont};
      font-size: ${Number(typography.bodySizePt) + 1}pt;
      font-weight: 600;
      color: ${colors.text};
    }

    .item-subtitle {
      font-size: ${typography.bodySizePt}pt;
      color: ${colors.accent};
      font-weight: 500;
    }

    .item-period {
      font-size: ${Number(typography.bodySizePt) - 1}pt;
      color: ${colors.muted};
      white-space: nowrap;
    }

    .highlights {
      margin-left: 15pt;
      margin-top: 5pt;
    }

    .highlights li {
      margin-bottom: 3pt;
      font-size: ${Number(typography.bodySizePt) - 0.5}pt;
    }

    /* Skills Styles */
    .skills-container {
      ${getSkillsContainerStyles(layout.skillDisplay)}
    }

    .skills-category {
      margin-bottom: 8pt;
    }

    .skills-label {
      font-size: ${Number(typography.bodySizePt) - 1}pt;
      font-weight: 600;
      color: ${colors.muted};
      margin-bottom: 4pt;
    }

    .skills-list {
      ${getSkillsListStyles(layout.skillDisplay)}
    }

    .skill-tag {
      font-size: ${Number(typography.bodySizePt) - 1.5}pt;
      padding: 2pt 8pt;
      border-radius: ${borderRadius};
      ${getSkillTagStyles(decorations.skillTagVariant, colors, decorations.useBorders)}
    }

    .skill-tag.soft {
      ${getSkillTagStyles(decorations.skillTagVariant, colors, decorations.useBorders, true)}
    }

    .skill-bar {
      height: 6pt;
      background: ${colors.secondary};
      border-radius: ${borderRadius};
      overflow: hidden;
    }

    .skill-bar-fill {
      height: 100%;
      background: ${colors.primary};
    }

    /* Languages */
    .languages-list {
      display: flex;
      flex-wrap: wrap;
      gap: 15pt;
    }

    .language-item {
      display: flex;
      flex-direction: column;
    }

    .language-name {
      font-weight: 600;
      font-size: ${typography.bodySizePt}pt;
    }

    .language-level {
      font-size: ${Number(typography.bodySizePt) - 1}pt;
      color: ${colors.muted};
    }

    /* Certifications */
    .certifications-list {
      margin-left: 15pt;
    }

    .certifications-list li {
      margin-bottom: 3pt;
      font-size: ${Number(typography.bodySizePt) - 0.5}pt;
    }

    /* Summary */
    .summary {
      font-size: ${typography.bodySizePt}pt;
      line-height: ${typography.lineHeight + 0.1};
      color: ${colors.text};
      ${decorations.useBackgrounds ? `
        background: ${colors.secondary};
        padding: 10pt;
        border-radius: ${borderRadius};
      ` : ''}
    }

    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .cv-header {
        page-break-after: avoid;
      }

      .cv-section {
        page-break-inside: avoid;
        page-break-before: auto;
      }

      .cv-section:first-of-type {
        page-break-before: avoid;
      }

      .item {
        page-break-inside: avoid;
      }

      /* Prevent orphans and widows */
      p, li {
        orphans: 3;
        widows: 3;
      }

      /* Keep highlights together with their parent item */
      .highlights {
        page-break-inside: avoid;
      }
    }

    /* AI-Generated Custom CSS - Full Dynamic Control */
    /* Core sections */
    ${style.customCSS?.headerCSS ? `.cv-header { ${style.customCSS.headerCSS} }` : ''}
    ${style.customCSS?.itemCSS ? `.item, .experience-item, .education-item { ${style.customCSS.itemCSS} }` : ''}
    ${style.customCSS?.sectionCSS ? `.cv-section { ${style.customCSS.sectionCSS} }` : ''}
    ${style.customCSS?.skillsCSS ? `.skills-container, .skills-list { ${style.customCSS.skillsCSS} }` : ''}

    /* Typography elements */
    ${style.customCSS?.nameCSS ? `.name { ${style.customCSS.nameCSS} }` : ''}
    ${style.customCSS?.headlineCSS ? `.headline { ${style.customCSS.headlineCSS} }` : ''}
    ${style.customCSS?.sectionTitleCSS ? `.section-title { ${style.customCSS.sectionTitleCSS} }` : ''}
    ${style.customCSS?.itemTitleCSS ? `.item-title { ${style.customCSS.itemTitleCSS} }` : ''}
    ${style.customCSS?.itemSubtitleCSS ? `.item-subtitle { ${style.customCSS.itemSubtitleCSS} }` : ''}

    /* Content elements */
    ${style.customCSS?.summaryCSS ? `.summary { ${style.customCSS.summaryCSS} }` : ''}
    ${style.customCSS?.highlightsCSS ? `.highlights { ${style.customCSS.highlightsCSS} }` : ''}
    ${style.customCSS?.skillTagCSS ? `.skill-tag { ${style.customCSS.skillTagCSS} }` : ''}

    /* Structural */
    ${style.customCSS?.avatarCSS ? `.avatar-container { ${style.customCSS.avatarCSS} }` : ''}
    ${style.customCSS?.dividerCSS ? `.section-title::after { ${style.customCSS.dividerCSS} }` : ''}
  `;
}

function getSectionDividerStyles(
  divider: string,
  colors: CVStyleConfig['colors'],
  _decorations: CVStyleConfig['decorations']
): string {
  switch (divider) {
    case 'line':
      return `border-bottom: 1pt solid ${colors.secondary};`;
    case 'dots':
      return `border-bottom: 2pt dotted ${colors.muted};`;
    case 'accent-bar':
      return `border-bottom: 3pt solid ${colors.primary}; width: fit-content; padding-right: 20pt;`;
    case 'gradient':
      return `border-bottom: 2pt solid transparent; background-image: linear-gradient(90deg, ${colors.primary}, ${colors.accent}); background-clip: padding-box; -webkit-background-clip: padding-box; width: fit-content; padding-right: 30pt;`;
    case 'double-line':
      return `border-bottom: 1pt solid ${colors.primary}; box-shadow: 0 3pt 0 0 ${colors.secondary};`;
    case 'none':
    default:
      return '';
  }
}

function getItemStyles(
  itemStyle: string | undefined,
  useBorders: boolean,
  colors: CVStyleConfig['colors'],
  borderRadius: string,
  itemBorderWidth?: string
): string {
  // Border width for accent-left style
  const borderWidthMap: Record<string, string> = {
    thin: '2pt',
    normal: '4pt',
    thick: '6pt',
  };
  const accentBorderWidth = borderWidthMap[itemBorderWidth || 'normal'];

  switch (itemStyle) {
    case 'card-subtle':
      return `
        background: ${colors.secondary};
        padding: 12pt;
        border-radius: ${borderRadius};
      `;
    case 'card-bordered':
      return `
        border: 1pt solid ${colors.primary};
        padding: 12pt;
        border-radius: ${borderRadius};
      `;
    case 'accent-left':
      return `
        border-left: ${accentBorderWidth} solid ${colors.primary};
        padding-left: 12pt;
        margin-left: 2pt;
      `;
    case 'timeline':
      return `
        position: relative;
        padding-left: 20pt;
        margin-left: 8pt;
        border-left: 2pt solid ${colors.secondary};
      `;
    case 'minimal-dots':
      return `
        position: relative;
        padding-left: 15pt;
      `;
    case 'inline':
    default:
      // Default inline style - use border-left if useBorders is true
      return useBorders ? `
        border-left: 3pt solid ${colors.primary};
        padding-left: 10pt;
      ` : '';
  }
}

function getHeaderStyleCSS(
  headerStyle: string,
  colors: CVStyleConfig['colors'],
  headerBorder: string,
  headerGradientAngle?: string,
  headerPadding?: string
): string {
  // Header padding values
  const paddingMap: Record<string, string> = {
    compact: '12pt 15pt',
    normal: '18pt 20pt',
    spacious: '25pt 25pt',
  };
  const padding = paddingMap[headerPadding || 'normal'];

  // Gradient angle (default 135deg for diagonal)
  const gradientAngle = headerGradientAngle || '135';

  switch (headerStyle) {
    case 'banner':
      return `
        background: ${colors.primary};
        color: white;
        padding: ${padding};
        margin-bottom: 20pt;
        border-radius: 0;
      `;
    case 'full-width-accent':
      return `
        background: linear-gradient(${gradientAngle}deg, ${colors.primary} 0%, ${colors.accent} 100%);
        color: white;
        padding: ${padding};
        margin-bottom: 18pt;
      `;
    case 'split':
      return `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: ${headerBorder} solid ${colors.primary};
      `;
    case 'minimal':
      return `
        border-bottom: none;
        padding-bottom: 5pt;
      `;
    case 'bold-name':
      return `
        border-bottom: ${headerBorder} solid ${colors.primary};
      `;
    case 'centered':
    case 'left-aligned':
    default:
      return `
        border-bottom: ${headerBorder} solid ${colors.primary};
      `;
  }
}

function getHeaderAccentStyles(
  headerAccent: string | undefined,
  colors: CVStyleConfig['colors'],
  _headerStyle?: string
): string {
  switch (headerAccent) {
    case 'underline':
      return `
        .cv-header::after {
          content: '';
          display: block;
          width: 60pt;
          height: 3pt;
          background: ${colors.accent};
          margin-top: 10pt;
        }
        .cv-header.centered::after {
          margin-left: auto;
          margin-right: auto;
        }
      `;
    case 'side-bar':
      return `
        .cv-header {
          border-left: 5pt solid ${colors.primary};
          padding-left: 15pt;
        }
        .cv-header.centered {
          border-left: none;
          padding-left: 0;
          border-top: 5pt solid ${colors.primary};
          padding-top: 15pt;
        }
      `;
    case 'gradient-bar':
      return `
        .cv-header::before {
          content: '';
          display: block;
          height: 4pt;
          background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
          margin-bottom: 15pt;
        }
      `;
    case 'none':
    default:
      return '';
  }
}

function getSkillTagStyles(
  variant: string | undefined,
  colors: CVStyleConfig['colors'],
  useBorders: boolean,
  isSoft = false
): string {
  // Default to 'filled' if not specified
  const tagVariant = variant || 'filled';

  if (isSoft) {
    // Soft skills use muted colors
    switch (tagVariant) {
      case 'outlined':
        return `
          background: transparent;
          color: ${colors.muted};
          border: 1pt solid ${colors.muted};
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${colors.muted};
          border: none;
          padding-left: 0;
          padding-right: 0;
        `;
      case 'filled':
      default:
        return `
          background: #f0f0f0;
          color: ${colors.muted};
          ${useBorders ? 'border: 1pt solid #ddd;' : ''}
        `;
    }
  }

  // Technical skills use primary colors
  switch (tagVariant) {
    case 'outlined':
      return `
        background: transparent;
        color: ${colors.primary};
        border: 1pt solid ${colors.primary};
      `;
    case 'ghost':
      return `
        background: transparent;
        color: ${colors.primary};
        border: none;
        padding-left: 0;
        padding-right: 0;
        font-weight: 500;
      `;
    case 'filled':
    default:
      return `
        background: ${colors.secondary};
        color: ${colors.primary};
        ${useBorders ? `border: 1pt solid ${colors.primary};` : ''}
      `;
  }
}

function getSkillsContainerStyles(display: string): string {
  switch (display) {
    case 'grid':
      return 'display: grid; grid-template-columns: 1fr 1fr; gap: 8pt;';
    case 'list':
    case 'bars':
      return 'display: flex; flex-direction: column; gap: 8pt;';
    case 'tags':
    default:
      return 'display: flex; flex-direction: column; gap: 8pt;';
  }
}

function getSkillsListStyles(display: string): string {
  switch (display) {
    case 'list':
      return 'display: flex; flex-direction: column; gap: 2pt;';
    case 'bars':
      return 'display: flex; flex-direction: column; gap: 4pt;';
    case 'grid':
    case 'tags':
    default:
      return 'display: flex; flex-wrap: wrap; gap: 5pt;';
  }
}

function generateHeader(
  fullName: string,
  style: CVStyleConfig,
  avatarUrl?: string | null,
  headline?: string | null,
  elementOverrides?: CVElementOverrides | null
): string {
  const headerClass = style.layout.headerStyle;
  const showAvatar = style.layout.showPhoto && avatarUrl;
  const override = getOverride(elementOverrides, 'header');
  const overrideStyle = getOverrideStyle(override);

  return `
    <header class="cv-header ${headerClass}" data-element-id="header" data-element-type="header" data-element-label="Header" ${overrideStyle}>
      ${showAvatar ? `<div class="avatar-container" style="margin-bottom: 10pt;"><img src="${avatarUrl}" alt="${fullName}" class="avatar" /></div>` : ''}
      <h1 class="name">${fullName}</h1>
      ${headline ? `<p class="headline">${headline}</p>` : ''}
    </header>
  `;
}

function generateSummarySection(summary: string, _style: CVStyleConfig, elementOverrides?: CVElementOverrides | null): string {
  const sectionOverride = getOverride(elementOverrides, 'section-summary');
  const summaryOverride = getOverride(elementOverrides, 'summary');
  const sectionStyle = getOverrideStyle(sectionOverride);
  const summaryStyle = getOverrideStyle(summaryOverride);

  return `
    <section class="cv-section" data-element-id="section-summary" data-element-type="section" data-element-label="Summary Section" ${sectionStyle}>
      <h2 class="section-title">Professional Summary</h2>
      <p class="summary" data-element-id="summary" data-element-type="summary" data-element-label="Summary Text" ${summaryStyle}>${summary}</p>
    </section>
  `;
}

function generateExperienceSection(
  experience: GeneratedCVContent['experience'],
  style: CVStyleConfig,
  elementOverrides?: CVElementOverrides | null
): string {
  // Default to 'card-subtle' for better visual appeal instead of plain 'inline'
  const itemStyleClass = style.decorations.itemStyle || 'card-subtle';
  const sectionOverride = getOverride(elementOverrides, 'section-experience');
  const sectionStyle = getOverrideStyle(sectionOverride);

  return `
    <section class="cv-section" data-element-id="section-experience" data-element-type="section" data-element-label="Experience Section" ${sectionStyle}>
      <h2 class="section-title">Experience</h2>
      ${experience.map((exp, i) => {
        const itemOverride = getOverride(elementOverrides, `experience-${i}`);
        const itemStyle = getOverrideStyle(itemOverride);
        return `
        <div class="item ${itemStyleClass}" data-element-id="experience-${i}" data-element-type="experience-item" data-element-label="${exp.title} @ ${exp.company}" ${itemStyle}>
          <div class="item-header">
            <div class="item-title-company">
              <h3 class="item-title">${exp.title}</h3>
              <span class="item-subtitle">${exp.company}${exp.location ? `, ${exp.location}` : ''}</span>
            </div>
            <span class="item-period">${exp.period}</span>
          </div>
          <ul class="highlights">
            ${exp.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      `}).join('')}
    </section>
  `;
}

function generateEducationSection(
  education: GeneratedCVContent['education'],
  style: CVStyleConfig,
  elementOverrides?: CVElementOverrides | null
): string {
  // Default to 'card-subtle' for better visual appeal instead of plain 'inline'
  const itemStyleClass = style.decorations.itemStyle || 'card-subtle';
  const sectionOverride = getOverride(elementOverrides, 'section-education');
  const sectionStyle = getOverrideStyle(sectionOverride);

  return `
    <section class="cv-section" data-element-id="section-education" data-element-type="section" data-element-label="Education Section" ${sectionStyle}>
      <h2 class="section-title">Education</h2>
      ${education.map((edu, i) => {
        const itemOverride = getOverride(elementOverrides, `education-${i}`);
        const itemStyle = getOverrideStyle(itemOverride);
        return `
        <div class="item ${itemStyleClass}" data-element-id="education-${i}" data-element-type="education-item" data-element-label="${edu.degree} @ ${edu.institution}" ${itemStyle}>
          <div class="item-header">
            <div class="item-title-institution">
              <h3 class="item-title">${edu.degree}</h3>
              <span class="item-subtitle">${edu.institution}</span>
            </div>
            <span class="item-period">${edu.year}</span>
          </div>
          ${edu.details ? `<p class="item-details">${edu.details}</p>` : ''}
        </div>
      `}).join('')}
    </section>
  `;
}

function generateSkillsSection(
  skills: GeneratedCVContent['skills'],
  style: CVStyleConfig,
  elementOverrides?: CVElementOverrides | null
): string {
  const sectionOverride = getOverride(elementOverrides, 'section-skills');
  const sectionStyle = getOverrideStyle(sectionOverride);

  const renderSkills = (skillList: string[], issoft = false, category: string) => {
    switch (style.layout.skillDisplay) {
      case 'list':
        return skillList.map((skill, i) => {
          const skillId = `skill-${category}-${i}`;
          const override = getOverride(elementOverrides, skillId);
          const overrideStyle = getOverrideStyle(override);
          return `<div class="skill-item" data-element-id="${skillId}" data-element-type="skill-tag" data-element-label="${skill}" ${overrideStyle}>${skill}</div>`;
        }).join('');
      case 'bars':
        return skillList.map((skill, i) => {
          const skillId = `skill-${category}-${i}`;
          const override = getOverride(elementOverrides, skillId);
          const overrideStyle = getOverrideStyle(override);
          return `
          <div class="skill-bar-item" data-element-id="${skillId}" data-element-type="skill-tag" data-element-label="${skill}" ${overrideStyle}>
            <span class="skill-name">${skill}</span>
            <div class="skill-bar">
              <div class="skill-bar-fill" style="width: ${100 - (i * 10)}%"></div>
            </div>
          </div>
        `}).join('');
      case 'tags':
      case 'grid':
      default:
        return skillList.map((skill, i) => {
          const skillId = `skill-${category}-${i}`;
          const override = getOverride(elementOverrides, skillId);
          const overrideStyle = getOverrideStyle(override);
          return `<span class="skill-tag${issoft ? ' soft' : ''}" data-element-id="${skillId}" data-element-type="skill-tag" data-element-label="${skill}" ${overrideStyle}>${skill}</span>`;
        }).join('');
    }
  };

  return `
    <section class="cv-section" data-element-id="section-skills" data-element-type="section" data-element-label="Skills Section" ${sectionStyle}>
      <h2 class="section-title">Skills</h2>
      <div class="skills-container">
        ${skills.technical.length > 0 ? `
          <div class="skills-category">
            <h4 class="skills-label">Technical</h4>
            <div class="skills-list">
              ${renderSkills(skills.technical, false, 'technical')}
            </div>
          </div>
        ` : ''}
        ${skills.soft.length > 0 ? `
          <div class="skills-category">
            <h4 class="skills-label">Soft Skills</h4>
            <div class="skills-list">
              ${renderSkills(skills.soft, true, 'soft')}
            </div>
          </div>
        ` : ''}
      </div>
    </section>
  `;
}

function generateLanguagesSection(
  languages: GeneratedCVContent['languages'],
  _style: CVStyleConfig,
  elementOverrides?: CVElementOverrides | null
): string {
  const sectionOverride = getOverride(elementOverrides, 'section-languages');
  const sectionStyle = getOverrideStyle(sectionOverride);

  return `
    <section class="cv-section" data-element-id="section-languages" data-element-type="section" data-element-label="Languages Section" ${sectionStyle}>
      <h2 class="section-title">Languages</h2>
      <div class="languages-list">
        ${languages.map((lang, i) => {
          const itemOverride = getOverride(elementOverrides, `language-${i}`);
          const itemStyle = getOverrideStyle(itemOverride);
          return `
          <div class="language-item" data-element-id="language-${i}" data-element-type="language-item" data-element-label="${lang.language}" ${itemStyle}>
            <span class="language-name">${lang.language}</span>
            <span class="language-level">${lang.level}</span>
          </div>
        `}).join('')}
      </div>
    </section>
  `;
}

function generateCertificationsSection(
  certifications: string[],
  _style: CVStyleConfig,
  elementOverrides?: CVElementOverrides | null
): string {
  const sectionOverride = getOverride(elementOverrides, 'section-certifications');
  const sectionStyle = getOverrideStyle(sectionOverride);

  return `
    <section class="cv-section" data-element-id="section-certifications" data-element-type="section" data-element-label="Certifications Section" ${sectionStyle}>
      <h2 class="section-title">Certifications</h2>
      <ul class="certifications-list">
        ${certifications.map((cert, i) => {
          const itemOverride = getOverride(elementOverrides, `certification-${i}`);
          const itemStyle = getOverrideStyle(itemOverride);
          return `<li data-element-id="certification-${i}" data-element-type="certification-item" data-element-label="${cert}" ${itemStyle}>${cert}</li>`;
        }).join('')}
      </ul>
    </section>
  `;
}
