/**
 * Base CSS Templates for CV Generation
 *
 * 100% print-safe CSS that works in both browser preview and PDF generation.
 * No transforms, clip-path, hover effects, or other PDF-incompatible features.
 *
 * Uses CSS Custom Properties (variables) that get filled in by design tokens.
 */

// ============ CSS Custom Property Declarations ============

export const cssVariables = `
  :root {
    /* Colors - populated from design tokens */
    --color-primary: #1a1a1a;
    --color-secondary: #f5f5f5;
    --color-accent: #0066cc;
    --color-text: #333333;
    --color-muted: #666666;
    --color-white: #ffffff;
    --color-border: #e0e0e0;

    /* Typography - populated from design tokens */
    --font-heading: 'Inter', sans-serif;
    --font-body: 'Inter', sans-serif;
    --size-name: 28pt;
    --size-heading: 13pt;
    --size-subheading: 11pt;
    --size-body: 10pt;
    --size-small: 9pt;
    --line-height: 1.5;

    /* Spacing - populated from design tokens */
    --space-section: 20px;
    --space-item: 12px;
    --space-element: 6px;
    --space-page: 20mm;

    /* Border radius - controlled by roundedCorners flag */
    --radius: 4px;
    --radius-large: 8px;
  }
`;

// ============ Print-Safe Base Styles ============

export const baseStyles = `
  /* Reset & Base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    font-family: var(--font-body);
    font-size: var(--size-body);
    line-height: var(--line-height);
    color: var(--color-text);
    background: var(--color-white);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* CV Container */
  .cv-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: var(--space-page);
    background: var(--color-white);
    overflow: visible; /* Allow banner to extend beyond */
  }

  /* Print Optimization */
  @media print {
    html, body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .cv-container {
      padding: 0;
      max-width: none;
    }

    .section {
      break-inside: avoid;
    }

    .item {
      break-inside: avoid;
    }
  }

  /* Typography Base */
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-primary);
  }

  p {
    margin-bottom: var(--space-element);
  }

  a {
    color: var(--color-accent);
    text-decoration: none;
  }

  ul {
    list-style: disc;
    padding-left: 1.5em;
    margin: var(--space-element) 0;
  }

  li {
    margin-bottom: 4px;
  }
`;

// ============ Header Variants ============

export const headerVariants = {
  simple: `
    .cv-header {
      text-align: left;
      padding-bottom: var(--space-section);
      margin-bottom: var(--space-section);
      border-bottom: 1px solid var(--color-border);
    }

    .cv-header h1.name {
      font-size: var(--size-name);
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: var(--space-element);
    }

    .cv-header .headline {
      font-size: var(--size-subheading);
      color: var(--color-muted);
      margin-bottom: var(--space-item);
    }

    .cv-header .contact-info {
      font-size: var(--size-small);
      color: var(--color-muted);
    }

    .cv-header .contact-item {
      display: inline;
    }

    .cv-header .contact-item:not(:last-child)::after {
      content: " • ";
      color: var(--color-muted);
    }
  `,

  accented: `
    .cv-header {
      text-align: left;
      padding-bottom: var(--space-section);
      margin-bottom: var(--space-section);
      border-left: 4px solid var(--color-accent);
      padding-left: var(--space-item);
    }

    .cv-header h1.name {
      font-size: var(--size-name);
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: var(--space-element);
    }

    .cv-header .headline {
      font-size: var(--size-subheading);
      color: var(--color-accent);
      font-weight: 500;
      margin-bottom: var(--space-item);
    }

    .cv-header .contact-info {
      font-size: var(--size-small);
      color: var(--color-muted);
    }

    .cv-header .contact-item {
      display: inline;
    }

    .cv-header .contact-item:not(:last-child)::after {
      content: " | ";
      color: var(--color-border);
    }
  `,

  banner: `
    /* Banner header base styles */
    .cv-header {
      background-color: var(--color-primary);
      color: #ffffff;
      margin-bottom: var(--space-section);
      padding: var(--space-section) var(--space-page);
    }

    .cv-header h1.name {
      font-size: var(--size-name);
      font-weight: 700;
      color: #ffffff;
      margin-bottom: var(--space-element);
    }

    .cv-header .headline {
      font-size: var(--size-subheading);
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: var(--space-item);
    }

    .cv-header .contact-info {
      font-size: var(--size-small);
      color: rgba(255, 255, 255, 0.8);
    }

    .cv-header .contact-item {
      display: inline;
    }

    .cv-header .contact-item:not(:last-child)::after {
      content: " • ";
      opacity: 0.6;
    }

    /* Full-bleed mode: header extends to page edges */
    .cv-container.full-bleed-mode .cv-header {
      margin-top: 0;
      margin-left: 0;
      margin-right: 0;
      padding: 15mm 20mm;
      width: 100%;
    }

    .cv-container.full-bleed-mode .section {
      margin-left: 20mm;
      margin-right: 20mm;
    }

    .cv-container.full-bleed-mode .section:last-child {
      margin-bottom: 15mm;
    }

    /* Page margins for full-bleed PDF */
    .cv-container.full-bleed-mode ~ style,
    .full-bleed-mode {
      --page-margin-first-top: 0;
      --page-margin-top: 15mm;
    }

    @page:first {
      margin-top: 0;
      margin-left: 0;
      margin-right: 0;
      margin-bottom: 15mm;
    }

    @page {
      margin-top: 15mm;
      margin-left: 0;
      margin-right: 0;
      margin-bottom: 15mm;
    }
  `,

  split: `
    .cv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: var(--space-section);
      margin-bottom: var(--space-section);
      border-bottom: 2px solid var(--color-accent);
    }

    .cv-header .header-left {
      flex: 1;
    }

    .cv-header .header-right {
      text-align: right;
    }

    .cv-header h1.name {
      font-size: var(--size-name);
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: var(--space-element);
    }

    .cv-header .headline {
      font-size: var(--size-subheading);
      color: var(--color-muted);
    }

    .cv-header .contact-info {
      font-size: var(--size-small);
      color: var(--color-text);
    }

    .cv-header .contact-item {
      display: block;
      margin-bottom: 4px;
    }
  `,
};

// ============ Section Styles ============

export const sectionStyles = {
  clean: `
    .section {
      margin-bottom: var(--space-section);
    }

    .section-title {
      font-size: var(--size-heading);
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: var(--space-item);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `,

  underlined: `
    .section {
      margin-bottom: var(--space-section);
    }

    .section-title {
      font-size: var(--size-heading);
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: var(--space-item);
      padding-bottom: var(--space-element);
      border-bottom: 2px solid var(--color-accent);
      display: inline-block;
    }

    .section-content {
      padding-top: var(--space-element);
    }
  `,

  boxed: `
    .section {
      margin-bottom: var(--space-section);
      background: var(--color-secondary);
      padding: var(--space-item);
      border-radius: var(--radius);
    }

    .section-title {
      font-size: var(--size-heading);
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: var(--space-item);
    }
  `,

  timeline: `
    .section {
      margin-bottom: var(--space-section);
      padding-left: var(--space-item);
      border-left: 2px solid var(--color-border);
    }

    .section-title {
      font-size: var(--size-heading);
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: var(--space-item);
      margin-left: calc(-1 * var(--space-item) - 6px);
      padding-left: calc(var(--space-item) + 10px);
      position: relative;
    }

    .section-title::before {
      content: "";
      position: absolute;
      left: calc(-1 * var(--space-item) - 6px);
      top: 50%;
      width: 10px;
      height: 10px;
      background: var(--color-accent);
      border-radius: 50%;
      transform: translateY(-50%);
    }

    .item {
      position: relative;
      padding-left: 4px;
    }

    .item::before {
      content: "";
      position: absolute;
      left: calc(-1 * var(--space-item) - 4px);
      top: 8px;
      width: 6px;
      height: 6px;
      background: var(--color-border);
      border-radius: 50%;
    }
  `,
};

// ============ Skills Display Styles ============

export const skillsDisplayStyles = {
  tags: `
    .skills-container {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-element);
    }

    .skill-tag {
      display: inline-block;
      padding: 4px 10px;
      background: var(--color-secondary);
      color: var(--color-text);
      font-size: var(--size-small);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
    }

    .skills-group {
      margin-bottom: var(--space-item);
    }

    .skills-group-title {
      font-size: var(--size-small);
      font-weight: 600;
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: var(--space-element);
    }
  `,

  list: `
    .skills-container {
      columns: 2;
      column-gap: var(--space-section);
    }

    .skill-item {
      margin-bottom: 4px;
      font-size: var(--size-body);
      break-inside: avoid;
    }

    .skill-item::before {
      content: "•";
      color: var(--color-accent);
      margin-right: var(--space-element);
    }

    .skills-group {
      break-inside: avoid;
      margin-bottom: var(--space-item);
    }

    .skills-group-title {
      font-size: var(--size-small);
      font-weight: 600;
      color: var(--color-primary);
      margin-bottom: var(--space-element);
    }
  `,

  compact: `
    .skills-container {
      font-size: var(--size-body);
      line-height: 1.8;
    }

    .skill-item {
      display: inline;
    }

    .skill-item:not(:last-child)::after {
      content: " • ";
      color: var(--color-muted);
    }

    .skills-group {
      margin-bottom: var(--space-item);
    }

    .skills-group-title {
      font-size: var(--size-small);
      font-weight: 600;
      color: var(--color-primary);
      display: block;
      margin-bottom: 4px;
    }
  `,
};

// ============ Item Styles (Experience, Education) ============

export const itemStyles = `
  .item {
    margin-bottom: var(--space-item);
    break-inside: avoid;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
  }

  .item-title {
    font-size: var(--size-subheading);
    font-weight: 600;
    color: var(--color-primary);
  }

  .item-subtitle {
    font-size: var(--size-body);
    color: var(--color-text);
    font-weight: 500;
  }

  .item-meta {
    font-size: var(--size-small);
    color: var(--color-muted);
    text-align: right;
    white-space: nowrap;
  }

  .item-description {
    font-size: var(--size-body);
    color: var(--color-text);
    margin-top: var(--space-element);
  }

  .item-highlights {
    margin-top: var(--space-element);
    padding-left: 1.2em;
  }

  .item-highlights li {
    font-size: var(--size-body);
    margin-bottom: 4px;
  }
`;

// ============ Photo Styles ============

export const photoStyles = `
  .avatar-container {
    width: 80px;
    height: 80px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar-container.circle {
    border-radius: 50%;
  }

  .avatar-container.rounded {
    border-radius: var(--radius-large);
  }

  .avatar-container.square {
    border-radius: 0;
  }

  .avatar-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Photo in header */
  .cv-header.with-photo {
    display: flex;
    gap: var(--space-item);
    align-items: flex-start;
  }

  .cv-header.with-photo .header-content {
    flex: 1;
  }

  .cv-header.with-photo .avatar-container {
    order: -1;
  }

  .cv-header.with-photo.photo-right .avatar-container {
    order: 1;
  }
`;

// ============ Contact Icons ============

export const iconStyles = `
  .icon {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: middle;
    fill: currentColor;
  }

  .contact-item .icon {
    color: var(--color-accent);
  }
`;

// ============ Summary/About Section ============

export const summaryStyles = `
  .summary {
    font-size: var(--size-body);
    line-height: 1.6;
    color: var(--color-text);
  }

  .summary p {
    margin-bottom: var(--space-element);
  }

  .summary p:last-child {
    margin-bottom: 0;
  }
`;

// ============ Languages Section ============

export const languageStyles = `
  .languages-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-item);
  }

  .language-item {
    font-size: var(--size-body);
  }

  .language-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .language-level {
    color: var(--color-muted);
    font-size: var(--size-small);
  }
`;

// ============ Certifications Section ============

export const certificationStyles = `
  .certifications-list {
    list-style: none;
    padding: 0;
  }

  .certification-item {
    margin-bottom: var(--space-element);
    font-size: var(--size-body);
  }

  .certification-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .certification-issuer {
    color: var(--color-muted);
    font-size: var(--size-small);
  }
`;

// ============ Combine All Base Styles ============

export function getBaseCSS(): string {
  // NOTE: Do NOT include cssVariables here - they are provided by the
  // token-based CSS variables from html-generator.ts. Including defaults
  // here would override the token values.
  return [
    baseStyles,
    itemStyles,
    photoStyles,
    iconStyles,
    summaryStyles,
    languageStyles,
    certificationStyles,
  ].join('\n');
}

// ============ Get Variant CSS ============

export function getHeaderVariantCSS(variant: keyof typeof headerVariants): string {
  return headerVariants[variant] || headerVariants.simple;
}

export function getSectionStyleCSS(style: keyof typeof sectionStyles): string {
  return sectionStyles[style] || sectionStyles.clean;
}

export function getSkillsDisplayCSS(display: keyof typeof skillsDisplayStyles): string {
  return skillsDisplayStyles[display] || skillsDisplayStyles.tags;
}
