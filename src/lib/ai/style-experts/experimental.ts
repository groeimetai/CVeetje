/**
 * Experimental expert — bold / Canva-style CVs.
 *
 * Uses a dedicated schema extension (`bold` object with 8 orthogonal
 * primitives) that maps to the bold renderer. THE VARIATION FIX lives here:
 * the rotation logic now targets `bold.*` primitives (not the base
 * headerVariant/sectionStyle, which the bold renderer ignores). That was the
 * root cause of "experimental always looks the same" in the wild.
 */

import { z } from 'zod';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleExpert, PromptContext, BuiltPrompt } from './types';
import { baseDesignTokensSchema } from './shared/base-schema';
import { creativityConstraints } from '@/lib/cv/templates/themes';
import {
  commonSystemHeader,
  commonSectionOrderFooter,
  buildCommonUserPreamble,
} from './shared/prompt-fragments';
import {
  applyBaseValidations,
  clearOtherRendererTokens,
  industryToDecorationTheme,
} from './shared/normalize-base';
import { pickFrom, rotateLeastUsed } from './shared/variation';
import { colorMoods } from './shared/color-moods';
import { fontDirections } from './shared/font-directions';

const LOG_TAG = 'Style Gen [experimental]';

// ============ Bold schema ============

const boldSchema = z.object({
  headerLayout: z.enum(['hero-band', 'split-photo', 'tiled', 'asymmetric-burst']).optional().describe(
    'Header: hero-band (gradient band) | split-photo (photo + colored block) | tiled (colored tiles grid) | asymmetric-burst (diagonal gradient)',
  ),
  sidebarStyle: z.enum(['solid-color', 'gradient', 'photo-hero', 'transparent']).optional().describe(
    'Sidebar: solid-color | gradient (primary→accent) | photo-hero (only if photo available) | transparent (quiet)',
  ),
  skillStyle: z.enum(['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills']).optional().describe(
    'Skills in sidebar: bars-gradient | dots-rating | icon-tagged | colored-pills',
  ),
  photoTreatment: z.enum(['circle-halo', 'squircle', 'color-overlay', 'badge-framed']).optional().describe(
    'Photo frame treatment.',
  ),
  accentShape: z.enum(['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern']).optional().describe(
    'Structural accent applied to sections.',
  ),
  iconTreatment: z.enum(['solid-filled', 'duotone', 'line-with-accent']).optional().describe('Contact icons style.'),
  headingStyle: z.enum(['oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed']).optional().describe(
    'Section titles: oversized-numbered (Linear-style) | kicker-bar | gradient-text | bracketed',
  ),
  gradientDirection: z.enum(['none', 'linear-vertical', 'linear-diagonal', 'radial-burst']).optional().describe(
    'Gradient: none | linear-vertical | linear-diagonal (most expressive) | radial-burst',
  ),
});

const experimentalSchema = baseDesignTokensSchema.extend({
  bold: boldSchema.optional().describe('Bold layout tokens — drive the Canva/Linear-style renderer.'),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional(),
  layout: z.enum(['sidebar-left', 'sidebar-right']).optional(),
});

// ============ Bold pools ============
//
// These are the pools the variation-rotator works on. Every primitive the
// bold renderer cares about appears here — so when history has over-used
// one value, we pick the least-used alternative.

const BOLD_POOLS = {
  headerLayout: ['hero-band', 'split-photo', 'tiled', 'asymmetric-burst'] as const,
  sidebarStyle: ['solid-color', 'gradient', 'photo-hero', 'transparent'] as const,
  skillStyle: ['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills'] as const,
  photoTreatment: ['circle-halo', 'squircle', 'color-overlay', 'badge-framed'] as const,
  accentShape: ['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern'] as const,
  iconTreatment: ['solid-filled', 'duotone', 'line-with-accent'] as const,
  headingStyle: ['oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed'] as const,
  gradientDirection: ['none', 'linear-vertical', 'linear-diagonal', 'radial-burst'] as const,
};

// For the variation nudge we exclude photo-hero when there's no photo;
// handled at prompt-build time.

function validateAndFixBoldTokens(
  raw: CVDesignTokens['bold'] | undefined,
  showPhoto: boolean,
): NonNullable<CVDesignTokens['bold']> {
  const isValid = <T extends string>(val: unknown, allowed: readonly T[]): val is T =>
    typeof val === 'string' && allowed.includes(val as T);

  const headerLayout = isValid(raw?.headerLayout, BOLD_POOLS.headerLayout)
    ? raw!.headerLayout
    : pickFrom(BOLD_POOLS.headerLayout);

  let sidebarStyle = isValid(raw?.sidebarStyle, BOLD_POOLS.sidebarStyle)
    ? raw!.sidebarStyle
    : pickFrom(BOLD_POOLS.sidebarStyle);
  if (sidebarStyle === 'photo-hero' && !showPhoto) sidebarStyle = 'gradient';

  const skillStyle = isValid(raw?.skillStyle, BOLD_POOLS.skillStyle) ? raw!.skillStyle : pickFrom(BOLD_POOLS.skillStyle);
  const photoTreatment = isValid(raw?.photoTreatment, BOLD_POOLS.photoTreatment) ? raw!.photoTreatment : pickFrom(BOLD_POOLS.photoTreatment);
  const accentShape = isValid(raw?.accentShape, BOLD_POOLS.accentShape) ? raw!.accentShape : pickFrom(BOLD_POOLS.accentShape);
  const iconTreatment = isValid(raw?.iconTreatment, BOLD_POOLS.iconTreatment) ? raw!.iconTreatment : pickFrom(BOLD_POOLS.iconTreatment);
  const headingStyle = isValid(raw?.headingStyle, BOLD_POOLS.headingStyle) ? raw!.headingStyle : pickFrom(BOLD_POOLS.headingStyle);
  const gradientDirection = isValid(raw?.gradientDirection, BOLD_POOLS.gradientDirection)
    ? raw!.gradientDirection
    : pickFrom(BOLD_POOLS.gradientDirection);

  return { headerLayout, sidebarStyle, skillStyle, photoTreatment, accentShape, iconTreatment, headingStyle, gradientDirection };
}

// ============ Prompts ============

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.experimental;
  return `${commonSystemHeader(hasPhoto)}

*** EXPERIMENTAL MODE — BOLD / CANVA-STYLE ***

Think Linear.app launch pages, Notion, Stripe, Spotify artist pages, modern
Canva resume templates. Saturated colors, gradients, iconography, progress
bars, colored sidebars. Structural color (blocks and bands), not floating
decorations.

A dedicated bold renderer handles this level. Fill the \`bold\` object with
8 compositional primitives.

THE BOLD PRIMITIVES:

- **headerLayout** — hero-band | split-photo | tiled | asymmetric-burst
  split-photo is most Canva-like. tiled = grid of colored tiles. hero-band =
  full-width gradient. asymmetric-burst = diagonal gradient.
- **sidebarStyle** — solid-color | gradient | photo-hero | transparent
  Sidebar is ALWAYS present in bold. photo-hero needs a photo. transparent = quietest.
- **skillStyle** — bars-gradient | dots-rating | icon-tagged | colored-pills
  bars-gradient is most visual. dots-rating = rating feel.
- **photoTreatment** — circle-halo | squircle | color-overlay | badge-framed
- **accentShape** — diagonal-stripe | angled-corner | colored-badge | hex-pattern
- **iconTreatment** — solid-filled | duotone | line-with-accent
- **headingStyle** — oversized-numbered (Linear) | kicker-bar | gradient-text | bracketed
- **gradientDirection** — none | linear-vertical | linear-diagonal | radial-burst
  linear-diagonal = most expressive (primary→accent 45°).

REQUIRED BASE TOKENS:
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: true
- roundedCorners: usually true
- experienceDescriptionFormat: 'bullets'
- themeBase: 'bold' or 'creative'

FONTS (pick from): ${constraints.allowedFontPairings.join(' | ')}

COLORS: saturated, unexpected color choices driven by the industry.
- Tech: electric blue/cyan accent
- Creative: magenta/coral
- Finance: deep-teal/gold
- Healthcare: emerald/violet
Never default to muted navy + grey.

EXAMPLES:
1. Product designer / startup — split-photo header, gradient sidebar, bars-gradient skills, squircle photo, colored-badge accent, line-with-accent icons, oversized-numbered headings, linear-diagonal. Primary #4f46e5 accent #f59e0b.
2. Marketing lead — hero-band, solid-color sidebar, colored-pills, circle-halo, hex-pattern, solid-filled icons, bracketed headings, linear-diagonal. Primary #be185d accent #fbbf24.
3. Engineering manager — asymmetric-burst, gradient sidebar, icon-tagged, color-overlay, angled-corner, duotone, gradient-text, radial-burst. Primary #0891b2 accent #10b981.
4. Creative director — tiled, photo-hero (if photo), dots-rating, badge-framed, diagonal-stripe, solid-filled, kicker-bar, linear-vertical. Primary #7c2d12 accent #f97316.
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
INDUSTRY & COMPANY DRIVE THIS DESIGN:
Industry: "${ctx.jobVacancy.industry || 'Unknown'}", Company: "${ctx.jobVacancy.company || 'Unknown'}".

Experimental mode is "boldest version of what fits this specific role". A
fintech role = saturated but restrained, geometric, trust-signaling. A creative
agency = loud, expressive color. A healthcare role = warm, human bold choices.

If you're 100% CERTAIN about brand colors (ING=orange, Bol.com=blue,
Coolblue=blue+orange), incorporate them boldly. Otherwise translate the
industry character into structural visual choices via the bold primitives.
`;
  }

  // Variation nudge — pick concrete bold primitives to try this round.
  // Exclude photo-hero from the nudge when there's no photo.
  const sidebarPool = ctx.hasPhoto
    ? BOLD_POOLS.sidebarStyle
    : BOLD_POOLS.sidebarStyle.filter(s => s !== 'photo-hero');
  const mood = pickFrom(colorMoods);
  const fontDir = pickFrom(fontDirections);
  prompt += `
VARIATION NUDGE (diversity signal — pick these unless the job context clearly
prefers something else):
- Suggested color mood: "${mood.mood}" — ${mood.description}
- Typography flavour: ${fontDir.hint}
- Try bold.headerLayout = "${pickFrom(BOLD_POOLS.headerLayout)}"
- Try bold.sidebarStyle = "${pickFrom(sidebarPool)}"
- Try bold.headingStyle = "${pickFrom(BOLD_POOLS.headingStyle)}"
- Try bold.skillStyle = "${pickFrom(BOLD_POOLS.skillStyle)}"
- Try bold.gradientDirection = "${pickFrom(BOLD_POOLS.gradientDirection)}"
`;

  prompt += `
Generate tokens for the BOLD RENDERER. The most important part is the
\`bold\` object — fill all 8 fields.

Non-negotiables:
1. Fill the \`bold\` object with ALL fields.
2. Match bold choices to the JOB CONTEXT — a finance role and a creative
   agency role should produce visibly different bold CVs.
3. Use a bold, saturated palette that fits THIS industry.
4. Base schema fields (headerVariant, sectionStyle, etc.) are IGNORED by
   the bold renderer but required by schema. Pick any valid value.

IMPORTANT: think like an art director hired by THIS company for THIS role.`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  const industryColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    technology: { primary: '#0891b2', secondary: '#ecfeff', accent: '#f59e0b' },
    finance: { primary: '#1e3a5f', secondary: '#f0f9ff', accent: '#10b981' },
    creative: { primary: '#be185d', secondary: '#fdf2f8', accent: '#06b6d4' },
    healthcare: { primary: '#059669', secondary: '#ecfdf5', accent: '#8b5cf6' },
    consulting: { primary: '#4338ca', secondary: '#eef2ff', accent: '#f59e0b' },
    default: { primary: '#dc2626', secondary: '#fef2f2', accent: '#0891b2' },
  };
  const colors = industryColors[industry || ''] || industryColors.default;
  const decorationTheme = industryToDecorationTheme(industry, 'abstract');

  return {
    styleName: 'Bold Experimental',
    styleRationale: 'A bold, colorful design that stands out.',
    industryFit: industry || 'technology',
    themeBase: 'bold',
    colors: { ...colors, text: '#1f2937', muted: '#6b7280' },
    fontPairing: 'oswald-source-sans',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'asymmetric',
    sectionStyle: 'magazine',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'double-column',
    headerGradient: 'radial',
    showPhoto: true,
    useIcons: true,
    roundedCorners: true,
    headerFullBleed: false,
    decorations: 'none',
    decorationTheme,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
    layout: 'sidebar-left',
    sidebarSections: ['skills', 'languages', 'certifications'],
    borderRadius: 'pill',
    accentStyle: 'border-left',
    nameStyle: 'uppercase',
    skillTagStyle: 'pill',
    pageBackground: '#ffffff',
    bold: {
      headerLayout: 'hero-band',
      sidebarStyle: 'gradient',
      skillStyle: 'bars-gradient',
      photoTreatment: 'circle-halo',
      accentShape: 'colored-badge',
      iconTreatment: 'solid-filled',
      headingStyle: 'oversized-numbered',
      gradientDirection: 'linear-diagonal',
    },
  };
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.experimental;
  const fallback = getFallback(ctx.jobVacancy?.industry);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    colors: { ...fallback.colors, ...aiColors },
  };

  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = constraints.allowedThemes[0];
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = constraints.allowedFontPairings[0];

  // Bold always has a sidebar — force a valid layout
  if (tokens.layout !== 'sidebar-left' && tokens.layout !== 'sidebar-right') {
    tokens.layout = Math.random() > 0.5 ? 'sidebar-left' : 'sidebar-right';
  }
  if (!tokens.sidebarSections || tokens.sidebarSections.length === 0) {
    tokens.sidebarSections = ['skills', 'languages', 'certifications'];
  }

  // Resolve bold sub-tokens with photo awareness
  tokens.bold = validateAndFixBoldTokens(tokens.bold, !!tokens.showPhoto);

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'bold');

  // THE ACTUAL FIX: rotate the bold primitives across history, not the base
  // headerVariant/sectionStyle fields which the bold renderer ignores.
  // This is what was missing and why experimental "always looked the same".
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      'bold.headerLayout': BOLD_POOLS.headerLayout,
      'bold.sidebarStyle': tokens.showPhoto
        ? BOLD_POOLS.sidebarStyle
        : BOLD_POOLS.sidebarStyle.filter(s => s !== 'photo-hero'),
      'bold.skillStyle': BOLD_POOLS.skillStyle,
      'bold.headingStyle': BOLD_POOLS.headingStyle,
      'bold.gradientDirection': BOLD_POOLS.gradientDirection,
      'bold.accentShape': BOLD_POOLS.accentShape,
      'bold.photoTreatment': BOLD_POOLS.photoTreatment,
      fontPairing: constraints.allowedFontPairings,
      layout: ['sidebar-left', 'sidebar-right'],
    },
    LOG_TAG,
  );

  // Final pass: make sure bold is still valid after rotation (e.g. if
  // sidebarStyle got rotated to photo-hero but user has no photo).
  tokens.bold = validateAndFixBoldTokens(tokens.bold, !!tokens.showPhoto);

  return tokens;
}

export const experimentalExpert: StyleExpert = {
  level: 'experimental',
  schema: experimentalSchema,
  preferredTemperature: 1.2,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
