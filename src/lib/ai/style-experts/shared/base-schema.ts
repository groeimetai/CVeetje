/**
 * Base design-tokens schema shared by all style experts.
 *
 * Every field is OPTIONAL at the Zod level — Claude Opus 4.7 under structured
 * output sometimes returns only a subset. Experts' normalize() functions merge
 * the AI output on top of a fully-populated fallback so downstream code sees
 * no undefineds.
 */

import { z } from 'zod';

export const baseDesignTokensSchema = z.object({
  // Metadata
  styleName: z.string().optional().describe('A descriptive name for this style, e.g., "Executive Professional"'),
  styleRationale: z.string().optional().describe('Brief explanation (2-3 sentences) of why this style fits.'),
  industryFit: z.string().optional().describe('Industry this style is optimized for (e.g., "technology").'),

  themeBase: z.enum(['professional', 'modern', 'creative', 'minimal', 'bold']).optional()
    .describe('Base theme direction'),

  colors: z.object({
    primary: z.string().optional().describe('Primary color, hex code (e.g. #1a365d).'),
    secondary: z.string().optional().describe('Secondary color, hex code — very light tinted neutral.'),
    accent: z.string().optional().describe('Accent color, hex code — vibrant, complements primary.'),
    text: z.string().optional().describe('Body text color, hex code (e.g. #333333).'),
    muted: z.string().optional().describe('Muted text color, hex code (e.g. #666666).'),
  }).optional(),

  fontPairing: z.enum([
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
  ]).optional().describe('Font combination: heading font + body font'),

  scale: z.enum(['small', 'medium', 'large']).optional().describe('Typography scale'),
  spacing: z.enum(['compact', 'comfortable', 'spacious']).optional().describe('Overall spacing density'),

  headerVariant: z.enum(['simple', 'accented', 'banner', 'split', 'asymmetric']).optional()
    .describe('Header layout (ignored by editorial/bold renderers — they use their own primitives)'),
  sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card', 'alternating', 'magazine']).optional()
    .describe('Section styling (ignored by editorial/bold renderers)'),
  skillsDisplay: z.enum(['tags', 'list', 'compact', 'bars']).optional()
    .describe('Skills display style'),
  experienceDescriptionFormat: z.enum(['bullets', 'paragraph']).optional()
    .describe('Experience format: bullets or paragraph'),
  contactLayout: z.enum(['single-row', 'double-row', 'single-column', 'double-column']).optional()
    .describe('Contact info layout'),
  headerGradient: z.enum(['none', 'subtle', 'radial']).optional().describe('Header gradient effect'),

  showPhoto: z.boolean().optional(),
  useIcons: z.boolean().optional(),
  roundedCorners: z.boolean().optional(),
  headerFullBleed: z.boolean().optional(),

  decorations: z.enum(['none', 'minimal', 'moderate', 'abundant']).optional(),

  sectionOrder: z.array(z.string()).optional()
    .describe('Section order. Use: summary, experience, projects, education, skills, languages, certifications'),

  // Extended styling tokens
  accentStyle: z.enum(['none', 'border-left', 'background', 'quote']).optional()
    .describe('Summary section styling'),
  borderRadius: z.enum(['none', 'small', 'medium', 'large', 'pill']).optional()
    .describe('Corner rounding scale'),
  pageBackground: z.string().optional()
    .describe('Page background color (hex). Must be very light (near white).'),
  nameStyle: z.enum(['normal', 'uppercase', 'extra-bold']).optional()
    .describe('Name styling'),
  skillTagStyle: z.enum(['filled', 'outlined', 'pill']).optional()
    .describe('Skill tag variant'),
});
