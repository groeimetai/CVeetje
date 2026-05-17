/**
 * DesignSpec — The single source of truth for a recipe.
 *
 * Build-time parser (recipes/parse.ts) reads SKILL.md frontmatter + optional
 * DESIGN.md content and emits a typed DesignSpec that the renderer and the
 * tweak UI consume. Validation via Zod, type inference via z.infer.
 *
 * Recipes themselves live as Markdown files (open-design SKILL.md format)
 * under recipes/{route}/{name}/. Verbatim copies from nexu-io/open-design
 * (Apache 2.0) live under recipes/_vendor/ — see /NOTICE.
 */

import { z } from 'zod';

// ============ Route + sourcing ============

export const RouteSchema = z.enum(['safe', 'balanced', 'creative', 'experimental']);
export type Route = z.infer<typeof RouteSchema>;

export const SourceSchema = z.object({
  type: z.enum(['original', 'vendored', 'adapted']),
  upstream: z.string().optional(),
  modifications: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

// ============ Palette (OKLch with override ranges) ============
//
// Lightness 0..100, chroma 0..0.4 (max ~0.37 fits sRGB), hue 0..360.
// `anchor` is the recipe default. `range` is the bounds within which the AI
// or the tweak UI may move that channel.

export const OklchValueSchema = z.object({
  l: z.number().min(0).max(100),
  c: z.number().min(0).max(0.4),
  h: z.number().min(0).max(360),
});
export type OklchValue = z.infer<typeof OklchValueSchema>;

export const OklchTokenSchema = z.object({
  anchor: OklchValueSchema,
  range: z.object({
    l: z.tuple([z.number(), z.number()]),
    c: z.tuple([z.number(), z.number()]),
    h: z.tuple([z.number(), z.number()]),
  }),
});
export type OklchToken = z.infer<typeof OklchTokenSchema>;

export const PaletteRoleSchema = z.enum(['ink', 'paper', 'accent', 'muted', 'surface']);
export type PaletteRole = z.infer<typeof PaletteRoleSchema>;

export const PaletteSchema = z.object({
  ink: OklchTokenSchema,
  paper: OklchTokenSchema,
  accent: OklchTokenSchema,
  muted: OklchTokenSchema,
  surface: OklchTokenSchema,
});
export type Palette = z.infer<typeof PaletteSchema>;

// ============ Typography ============

export const FontPairingIdSchema = z.enum([
  'inter-inter',
  'playfair-inter',
  'montserrat-open-sans',
  'raleway-lato',
  'poppins-nunito',
  'roboto-roboto',
  'lato-lato',
  'merriweather-source-sans',
  'oswald-source-sans',
  'dm-serif-dm-sans',
  'space-grotesk-work-sans',
  'libre-baskerville-source-sans',
]);
export type FontPairingId = z.infer<typeof FontPairingIdSchema>;

// ============ Layout shape + primitives ============

export const LayoutShapeSchema = z.enum(['single-column', 'sidebar', 'editorial-grid', 'poster']);
export type LayoutShape = z.infer<typeof LayoutShapeSchema>;

export const HeaderVariantSchema = z.enum(['stacked', 'banded', 'split', 'hero']);
export type HeaderVariant = z.infer<typeof HeaderVariantSchema>;

export const SectionVariantSchema = z.enum(['clean', 'kicker-rule', 'boxed', 'accent-left', 'numbered']);
export type SectionVariant = z.infer<typeof SectionVariantSchema>;

export const SkillListVariantSchema = z.enum(['tags', 'list', 'comma-prose', 'bars']);
export type SkillListVariant = z.infer<typeof SkillListVariantSchema>;

export const ExperienceItemVariantSchema = z.enum(['bullets', 'paragraph', 'kicker-period']);
export type ExperienceItemVariant = z.infer<typeof ExperienceItemVariantSchema>;

export const SidebarVariantSchema = z.enum(['solid', 'gradient', 'transparent', 'photo-hero', 'inverted']);
export type SidebarVariant = z.infer<typeof SidebarVariantSchema>;

export const PrimitivesSchema = z.object({
  header: HeaderVariantSchema,
  section: SectionVariantSchema,
  skillList: SkillListVariantSchema,
  experienceItem: ExperienceItemVariantSchema,
  sidebar: SidebarVariantSchema.optional(),
});
export type Primitives = z.infer<typeof PrimitivesSchema>;

// ============ Decorators ============

export const DecoratorsSchema = z.object({
  pullQuote: z.boolean(),
  dropCap: z.boolean(),
  marginalia: z.boolean(),
  heroNumeral: z.boolean(),
  posterLine: z.boolean(),
});
export type Decorators = z.infer<typeof DecoratorsSchema>;

// ============ Density ============

export const DensitySchema = z.enum(['compact', 'comfortable', 'airy']);
export type Density = z.infer<typeof DensitySchema>;

// ============ DesignSpec ============

export const DesignSpecSchema = z.object({
  id: z.string().regex(/^(safe|balanced|creative|experimental)\/[a-z0-9-]+$/),
  route: RouteSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  source: SourceSchema,
  industryAffinity: z.array(z.string()).min(2),
  layoutShape: LayoutShapeSchema,
  palette: PaletteSchema,
  allowedFontPairings: z.array(FontPairingIdSchema).min(1),
  primitives: PrimitivesSchema,
  decorators: DecoratorsSchema,
  density: DensitySchema,
});
export type DesignSpec = z.infer<typeof DesignSpecSchema>;
