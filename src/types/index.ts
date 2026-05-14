// Barrel re-export — all types are organized per domain in their own file.
// Add `export *` lines here when adding a new domain file so existing
// `import { X } from '@/types'` consumers continue to work.

export * from './language';
export * from './input';
export * from './user';
export * from './linkedin';
export * from './job';
export * from './cv-style';
export * from './cv';
export * from './dispute';
export * from './api';
export * from './template';
export * from './kanban';
export * from './feedback';

// ============ Re-export Design Tokens (v2 Style System) ============

export type {
  CVDesignTokens,
  ThemeBase,
  FontPairing,
  TypeScale,
  SpacingScale,
  HeaderVariant,
  SectionStyle,
  SkillsDisplay,
  ExperienceDescriptionFormat,
  DesignTokenColors,
  GenerateDesignTokensRequest,
  GenerateDesignTokensResponse,
} from './design-tokens';
