/**
 * Adapter for legacy CVStyleConfig.
 *
 * Producers (wizard, style API, generate API) no longer emit CVStyleConfig — they
 * write CVDesignTokens directly. The reverse direction (styleConfigToTokens) is
 * kept as a read-fallback for older Firestore CV documents that only have a
 * styleConfig field.
 */

import type { CVStyleConfig, FontFamily } from '@/types';
import type { CVDesignTokens, FontPairing } from '@/types/design-tokens';

// Reverse lookup: which font pairing matches a given heading+body combination.
// Used by styleConfigToTokens to convert legacy CV docs to the token system.
const fontPairingByLegacyFonts: Record<FontPairing, { heading: FontFamily; body: FontFamily }> = {
  'inter-inter': { heading: 'inter', body: 'inter' },
  'playfair-inter': { heading: 'playfair', body: 'inter' },
  'montserrat-open-sans': { heading: 'montserrat', body: 'open-sans' },
  'raleway-lato': { heading: 'raleway', body: 'lato' },
  'poppins-nunito': { heading: 'poppins', body: 'nunito' },
  'roboto-roboto': { heading: 'roboto', body: 'roboto' },
  'lato-lato': { heading: 'lato', body: 'lato' },
  'merriweather-source-sans': { heading: 'merriweather', body: 'source-sans' },
  'oswald-source-sans': { heading: 'montserrat', body: 'source-sans' },
  'dm-serif-dm-sans': { heading: 'playfair', body: 'inter' },
  'space-grotesk-work-sans': { heading: 'inter', body: 'inter' },
  'libre-baskerville-source-sans': { heading: 'merriweather', body: 'source-sans' },
};

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
  for (const [pairing, fonts] of Object.entries(fontPairingByLegacyFonts)) {
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
