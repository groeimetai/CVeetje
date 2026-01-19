/**
 * CV Templates Module
 *
 * Exports all template-related functionality for the v2 token-based styling system.
 */

// Base CSS and variants
export {
  getBaseCSS,
  getHeaderVariantCSS,
  getSectionStyleCSS,
  getSkillsDisplayCSS,
  cssVariables,
  baseStyles,
  headerVariants,
  sectionStyles,
  skillsDisplayStyles,
  itemStyles,
  photoStyles,
  iconStyles,
  summaryStyles,
  languageStyles,
  certificationStyles,
} from './base.css';

// Theme configurations
export {
  fontPairings,
  typeScales,
  spacingScales,
  themeDefaults,
  creativityConstraints,
  getFontUrls,
  getFontPairingCSS,
  getTypeScaleCSS,
  getSpacingScaleCSS,
  getColorsCSS,
  getBorderRadiusCSS,
} from './themes';

// Adapter for legacy compatibility
export {
  tokensToStyleConfig,
  styleConfigToTokens,
} from './adapter';

// Types re-exported for convenience
export type { CreativityLevel } from './themes';
