/**
 * Adapter between CVDesignTokens and legacy CVStyleConfig
 *
 * Provides bidirectional conversion for backward compatibility during migration.
 * Eventually the legacy format can be deprecated.
 */

import type { CVStyleConfig, FontFamily } from '@/types';
import type { CVDesignTokens, FontPairing } from '@/types/design-tokens';
import { themeDefaults, typeScales } from './themes';

// ============ Font Pairing to Legacy Fonts ============

const fontPairingToLegacy: Record<FontPairing, { heading: FontFamily; body: FontFamily }> = {
  'inter-inter': { heading: 'inter', body: 'inter' },
  'playfair-inter': { heading: 'playfair', body: 'inter' },
  'montserrat-open-sans': { heading: 'montserrat', body: 'open-sans' },
  'raleway-lato': { heading: 'raleway', body: 'lato' },
  'poppins-nunito': { heading: 'poppins', body: 'nunito' },
  'roboto-roboto': { heading: 'roboto', body: 'roboto' },
  'lato-lato': { heading: 'lato', body: 'lato' },
  'merriweather-source-sans': { heading: 'merriweather', body: 'source-sans' },
  // New font pairings mapped to closest legacy equivalents
  'oswald-source-sans': { heading: 'montserrat', body: 'source-sans' },
  'dm-serif-dm-sans': { heading: 'playfair', body: 'inter' },
  'space-grotesk-work-sans': { heading: 'inter', body: 'inter' },
  'libre-baskerville-source-sans': { heading: 'merriweather', body: 'source-sans' },
};

// ============ Header Variant Mapping ============

const headerVariantToLegacy: Record<string, CVStyleConfig['layout']['headerStyle']> = {
  'simple': 'left-aligned',
  'accented': 'left-aligned',
  'banner': 'banner',
  'split': 'split',
};

// ============ Section Style Mapping ============

const sectionStyleToLegacy: Record<string, CVStyleConfig['layout']['sectionDivider']> = {
  'clean': 'line',
  'underlined': 'accent-bar',
  'boxed': 'none',
  'timeline': 'line',
  'accent-left': 'accent-bar',
  'card': 'none',
};

// ============ Skills Display Mapping ============

const skillsDisplayToLegacy: Record<string, CVStyleConfig['layout']['skillDisplay']> = {
  'tags': 'tags',
  'list': 'list',
  'compact': 'list',
};

// ============ Spacing Mapping ============

const spacingToLegacy: Record<string, CVStyleConfig['layout']['spacing']> = {
  'compact': 'compact',
  'comfortable': 'normal',
  'spacious': 'spacious',
};

// ============ Convert CVDesignTokens to CVStyleConfig ============

export function tokensToStyleConfig(tokens: CVDesignTokens): CVStyleConfig {
  const fonts = fontPairingToLegacy[tokens.fontPairing];
  const typeScale = typeScales[tokens.scale];

  // Map borderRadius to legacy cornerStyle
  const resolvedCornerStyle = tokens.borderRadius
    ? (tokens.borderRadius === 'none' ? 'sharp' : tokens.borderRadius === 'pill' ? 'pill' : 'rounded')
    : (tokens.roundedCorners ? 'rounded' : 'sharp');

  // Map sectionStyle including new variants to legacy
  const sectionDivider = sectionStyleToLegacy[tokens.sectionStyle] || 'line';

  return {
    styleName: tokens.styleName,
    styleRationale: tokens.styleRationale,
    industryFit: tokens.industryFit,
    formalityLevel: tokens.themeBase === 'creative' || tokens.themeBase === 'bold'
      ? 'casual'
      : 'professional',

    colors: {
      primary: tokens.colors.primary,
      secondary: tokens.colors.secondary,
      accent: tokens.colors.accent,
      text: tokens.colors.text,
      muted: tokens.colors.muted,
    },

    typography: {
      headingFont: fonts.heading,
      bodyFont: fonts.body,
      nameSizePt: typeScale.name,
      headingSizePt: typeScale.heading,
      bodySizePt: typeScale.body,
      lineHeight: typeScale.lineHeight,
    },

    layout: {
      style: 'single-column',
      headerStyle: headerVariantToLegacy[tokens.headerVariant] || 'left-aligned',
      sectionOrder: tokens.sectionOrder,
      sectionDivider,
      skillDisplay: skillsDisplayToLegacy[tokens.skillsDisplay] || 'tags',
      spacing: spacingToLegacy[tokens.spacing] || 'normal',
      showPhoto: tokens.showPhoto,
    },

    decorations: {
      intensity: tokens.themeBase === 'bold' ? 'bold' : 'moderate',
      useBorders: tokens.sectionStyle === 'boxed' || tokens.sectionStyle === 'card',
      useBackgrounds: tokens.sectionStyle === 'boxed',
      iconStyle: tokens.useIcons ? 'minimal' : 'none',
      cornerStyle: resolvedCornerStyle,
      itemStyle: tokens.sectionStyle === 'timeline' ? 'timeline' : 'card-subtle',
      headerAccent: tokens.headerVariant === 'accented' ? 'side-bar' : 'none',
    },

    header: {
      headerAlignment: tokens.headerVariant === 'split' ? 'left' : 'left',
      nameWeight: tokens.nameStyle === 'extra-bold' ? 'extrabold' : 'bold',
      showHeadline: true,
      headlineStyle: 'muted',
      contactInHeader: true,
      contactStyle: tokens.headerVariant === 'split' ? 'stacked' : 'inline',
    },

    skills: {
      skillDisplay: skillsDisplayToLegacy[tokens.skillsDisplay] || 'tags',
      skillTagVariant: tokens.skillTagStyle === 'pill' ? 'filled' : (tokens.skillTagStyle || 'filled'),
      skillColumns: 'auto',
    },
  };
}

// ============ Convert CVStyleConfig to CVDesignTokens ============

export function styleConfigToTokens(config: CVStyleConfig): CVDesignTokens {
  // Determine font pairing from heading and body fonts
  const fontPairing = determineFontPairing(
    config.typography.headingFont,
    config.typography.bodyFont
  );

  // Determine theme base from various style properties
  const themeBase = determineThemeBase(config);

  // Determine header variant
  const headerVariant = determineHeaderVariant(config);

  // Determine section style
  const sectionStyle = determineSectionStyle(config);

  // Determine scale from font sizes
  const scale = determineScale(config.typography.nameSizePt);

  // Determine spacing
  const spacing = determineSpacing(config.layout.spacing);

  return {
    styleName: config.styleName,
    styleRationale: config.styleRationale,
    industryFit: config.industryFit,
    themeBase,
    colors: {
      primary: config.colors.primary,
      secondary: config.colors.secondary,
      accent: config.colors.accent,
      text: config.colors.text,
      muted: config.colors.muted,
    },
    fontPairing,
    scale,
    spacing,
    headerVariant,
    sectionStyle,
    skillsDisplay: config.layout.skillDisplay === 'tags' ? 'tags'
      : config.layout.skillDisplay === 'list' ? 'list'
      : 'compact',
    experienceDescriptionFormat: 'bullets',
    contactLayout: determineContactLayout(config),
    headerGradient: determineHeaderGradient(themeBase, headerVariant),
    showPhoto: config.layout.showPhoto,
    useIcons: config.decorations.iconStyle !== 'none',
    roundedCorners: config.decorations.cornerStyle === 'rounded' || config.decorations.cornerStyle === 'pill',
    headerFullBleed: headerVariant === 'banner' && themeBase !== 'professional',
    sectionOrder: config.layout.sectionOrder,
    decorations: determineDecorations(config, themeBase),
  };
}

// ============ Helper Functions ============

function determineFontPairing(heading: FontFamily, body: FontFamily): FontPairing {
  // Try to find exact match
  for (const [pairing, fonts] of Object.entries(fontPairingToLegacy)) {
    if (fonts.heading === heading && fonts.body === body) {
      return pairing as FontPairing;
    }
  }

  // Default based on heading font
  if (heading === 'playfair') return 'playfair-inter';
  if (heading === 'montserrat') return 'montserrat-open-sans';
  if (heading === 'raleway') return 'raleway-lato';
  if (heading === 'poppins') return 'poppins-nunito';
  if (heading === 'roboto') return 'roboto-roboto';
  if (heading === 'lato') return 'lato-lato';
  if (heading === 'merriweather') return 'merriweather-source-sans';

  return 'inter-inter';
}

function determineThemeBase(config: CVStyleConfig): CVDesignTokens['themeBase'] {
  // Check decorations intensity
  if (config.decorations.intensity === 'bold') return 'bold';

  // Check header style
  if (config.layout.headerStyle === 'banner') return 'creative';

  // Check formality
  if (config.formalityLevel === 'casual') return 'modern';

  // Check for minimal indicators
  if (
    config.decorations.iconStyle === 'none' &&
    config.decorations.intensity === 'subtle' &&
    !config.decorations.useBackgrounds
  ) {
    return 'minimal';
  }

  // Default to professional
  return 'professional';
}

function determineHeaderVariant(config: CVStyleConfig): CVDesignTokens['headerVariant'] {
  if (config.layout.headerStyle === 'banner') return 'banner';
  if (config.layout.headerStyle === 'split') return 'split';
  if (config.decorations.headerAccent === 'side-bar') return 'accented';
  return 'simple';
}

function determineSectionStyle(config: CVStyleConfig): CVDesignTokens['sectionStyle'] {
  if (config.decorations.itemStyle === 'timeline') return 'timeline';
  if (config.decorations.useBackgrounds) return 'boxed';
  if (config.layout.sectionDivider === 'accent-bar') return 'underlined';
  return 'clean';
}

function determineScale(nameSizePt: number): CVDesignTokens['scale'] {
  if (nameSizePt <= 24) return 'small';
  if (nameSizePt >= 30) return 'large';
  return 'medium';
}

function determineSpacing(spacing: CVStyleConfig['layout']['spacing']): CVDesignTokens['spacing'] {
  if (spacing === 'compact') return 'compact';
  if (spacing === 'spacious') return 'spacious';
  return 'comfortable';
}

function determineDecorations(
  config: CVStyleConfig,
  themeBase: CVDesignTokens['themeBase']
): CVDesignTokens['decorations'] {
  // Bold themes get abundant decorations
  if (themeBase === 'bold') return 'abundant';

  // Creative themes get moderate decorations
  if (themeBase === 'creative') return 'moderate';

  // Modern themes get minimal decorations
  if (themeBase === 'modern') return 'minimal';

  // Check legacy decoration intensity
  if (config.decorations.intensity === 'bold') return 'moderate';
  if (config.decorations.intensity === 'moderate') return 'minimal';

  // Professional and minimal themes get no decorations by default
  return 'none';
}

function determineContactLayout(config: CVStyleConfig): CVDesignTokens['contactLayout'] {
  // If contact style is stacked, use single-column
  if (config.header?.contactStyle === 'stacked') return 'single-column';

  // If header is split, use single-column on the right side
  if (config.layout.headerStyle === 'split') return 'single-column';

  // Default to single-row for inline contact info
  return 'single-row';
}

function determineHeaderGradient(
  themeBase: CVDesignTokens['themeBase'],
  headerVariant: CVDesignTokens['headerVariant']
): CVDesignTokens['headerGradient'] {
  // Only banner headers can have gradients
  if (headerVariant !== 'banner') return 'none';

  // Bold themes get radial gradient
  if (themeBase === 'bold') return 'radial';

  // Creative themes get subtle gradient
  if (themeBase === 'creative') return 'subtle';

  // Other themes get no gradient
  return 'none';
}
