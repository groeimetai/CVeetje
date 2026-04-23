/**
 * Experimental expert — avant-garde / gallery-style CVs.
 *
 * References: MSCHF, Toilet Paper magazine, David Carson, Peter Saville,
 * Barbara Kruger, Aries Moross, modern museum identities (Stedelijk,
 * Centre Pompidou, MoMA PS1). The goal is "made by someone with a voice",
 * not "made by a SaaS template wizard".
 *
 * Uses a dedicated `bold` object with orthogonal primitives that map to the
 * bold renderer. Variation rotation targets those primitives directly so
 * the level doesn't converge on the same look.
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

const LOG_TAG = 'Style Gen [experimental]';

// ============ Bold schema ============

const boldSchema = z.object({
  headerLayout: z.enum(['hero-band', 'split-photo', 'tiled', 'asymmetric-burst']).optional().describe(
    'Header composition: hero-band (full-width gradient/color band) | split-photo (photo block + colored block) | tiled (colored tiles grid) | asymmetric-burst (diagonal gradient)',
  ),
  sidebarStyle: z.enum(['solid-color', 'gradient', 'photo-hero', 'transparent']).optional().describe(
    'Sidebar treatment: solid-color | gradient | photo-hero (only if photo available) | transparent',
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
  iconTreatment: z.enum(['solid-filled', 'duotone', 'line-with-accent']).optional().describe(
    'Contact icons style.',
  ),
  headingStyle: z.enum([
    'oversized-numbered',
    'kicker-bar',
    'gradient-text',
    'bracketed',
    'stacked-caps',
    'overlap-block',
  ]).optional().describe(
    `Section titles:
    - oversized-numbered: big 01/02/03 numerals
    - kicker-bar: small colored bar over big title
    - gradient-text: gradient fill on title
    - bracketed: [ SECTION ] wrapped uppercase
    - stacked-caps: title stacked vertically in ENORMOUS caps (Peter Saville)
    - overlap-block: title set against a colored block that bleeds past it`,
  ),
  gradientDirection: z.enum([
    'none', 'linear-vertical', 'linear-diagonal', 'radial-burst', 'duotone-split', 'offset-clash',
  ]).optional().describe(
    `Gradient mode: none | linear-vertical | linear-diagonal | radial-burst | duotone-split (riso-style hard split) | offset-clash (two contrasting color bands)`,
  ),
  surfaceTexture: z.enum(['none', 'halftone', 'riso-grain', 'screen-print', 'stripe-texture']).optional().describe(
    `Overlay texture on colored surfaces (header, sidebar):
    - none: flat color
    - halftone: screen-printed dot pattern
    - riso-grain: subtle riso-print noise
    - screen-print: slight mis-registered color offset (Peter Saville)
    - stripe-texture: fine repeating diagonal lines`,
  ),
});

const experimentalSchema = baseDesignTokensSchema.extend({
  bold: boldSchema.optional().describe('Bold layout tokens — drive the avant-garde renderer.'),
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract']).optional(),
  layout: z.enum(['sidebar-left', 'sidebar-right']).optional(),
});

// ============ Bold pools ============

const BOLD_POOLS = {
  headerLayout: ['hero-band', 'split-photo', 'tiled', 'asymmetric-burst'] as const,
  sidebarStyle: ['solid-color', 'gradient', 'photo-hero', 'transparent'] as const,
  skillStyle: ['bars-gradient', 'dots-rating', 'icon-tagged', 'colored-pills'] as const,
  photoTreatment: ['circle-halo', 'squircle', 'color-overlay', 'badge-framed'] as const,
  accentShape: ['diagonal-stripe', 'angled-corner', 'colored-badge', 'hex-pattern'] as const,
  iconTreatment: ['solid-filled', 'duotone', 'line-with-accent'] as const,
  headingStyle: [
    'oversized-numbered', 'kicker-bar', 'gradient-text', 'bracketed', 'stacked-caps', 'overlap-block',
  ] as const,
  gradientDirection: [
    'none', 'linear-vertical', 'linear-diagonal', 'radial-burst', 'duotone-split', 'offset-clash',
  ] as const,
  surfaceTexture: ['none', 'halftone', 'riso-grain', 'screen-print', 'stripe-texture'] as const,
};

// ============ Avant-garde color palettes ============
//
// These REPLACE the generic color-moods pool for experimental. Each is a
// deliberate clash — the kind that makes a CV look art-directed instead of
// Tailwind-defaulted. Hex codes are suggestions only; the AI is expected
// to riff on them, not copy verbatim.
interface AvantPalette {
  name: string;
  description: string;
  primary: string;
  accent: string;
}

function readContextSignals(ctx: PromptContext) {
  const industry = (ctx.jobVacancy?.industry || '').toLowerCase();
  const prefs = (ctx.userPreferences || '').toLowerCase();
  const title = (ctx.jobVacancy?.title || '').toLowerCase();
  const combined = `${industry} ${title} ${prefs}`;

  return {
    industry,
    wantsMinimal: /\b(minimal|minimalistisch|clean|strak|subtle|subtiel|restrained|ingetogen)\b/.test(combined),
    wantsLoud: /\b(bold|avant|avant-garde|edgy|opvallend|statement|experimental|poster)\b/.test(combined),
    isCorporate: /\b(finance|bank|consult|consulting|legal|account|strategy|enterprise)\b/.test(combined),
    isCreativeRole: /\b(creative|design|designer|marketing|brand|art|fashion|agency|content)\b/.test(combined),
  };
}

const avantGardePalettes: AvantPalette[] = [
  {
    name: 'riso-red-teal',
    description: 'Riso-print red + teal. Bright hot red + turquoise, clashing in the best way. Toilet Paper magazine energy.',
    primary: '#d73838',
    accent: '#1d8a99',
  },
  {
    name: 'hot-pink-forest',
    description: 'Hot pink primary + deep forest green accent. Aries Moross poster vibe — unapologetic, confident.',
    primary: '#e91e63',
    accent: '#1b5e20',
  },
  {
    name: 'mustard-plum',
    description: 'Mustard yellow + aubergine plum. Mid-century avant-garde, Bauhaus reprint.',
    primary: '#5a2442',
    accent: '#d4a21a',
  },
  {
    name: 'electric-violet-olive',
    description: 'Electric violet primary + dusty olive accent. Museum identity feel (MoMA PS1, Stedelijk).',
    primary: '#6b21a8',
    accent: '#6e7e3c',
  },
  {
    name: 'sage-hot-coral',
    description: 'Sage green primary + hot coral accent. Unexpected warm-cool split. Apartamento/Cereal hybrid.',
    primary: '#5b7a5c',
    accent: '#f96958',
  },
  {
    name: 'paper-bone-black-red',
    description: 'Bone white page, carbon black primary, single screaming red accent. Barbara Kruger / Vignelli.',
    primary: '#0f0f0f',
    accent: '#d9322b',
  },
  {
    name: 'navy-mustard-pink',
    description: 'Deep navy primary + mustard accent, slight dusty-pink highlights. 1970s art-book feel.',
    primary: '#1e2847',
    accent: '#d6a42b',
  },
  {
    name: 'terracotta-teal',
    description: 'Warm terracotta primary + deep teal accent. Centre Pompidou ceramic-show palette.',
    primary: '#b8613b',
    accent: '#155e63',
  },
  {
    name: 'riso-pink-blue',
    description: 'Hot pink + electric blue — classic riso duotone. Print-zine energy.',
    primary: '#ff3d7f',
    accent: '#2d5fff',
  },
  {
    name: 'black-neon-yellow',
    description: 'Pure black primary with one single neon-yellow accent. Modern gallery poster (Kunsthalle Basel style).',
    primary: '#0a0a0a',
    accent: '#e8fc4a',
  },
];

// ============ Bold validator ============

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
  const surfaceTexture = isValid(raw?.surfaceTexture, BOLD_POOLS.surfaceTexture)
    ? raw!.surfaceTexture
    : pickFrom(BOLD_POOLS.surfaceTexture);

  return {
    headerLayout,
    sidebarStyle,
    skillStyle,
    photoTreatment,
    accentShape,
    iconTreatment,
    headingStyle,
    gradientDirection,
    surfaceTexture,
  };
}

// ============ Prompts ============

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.experimental;
  return `${commonSystemHeader(hasPhoto)}

*** EXPERIMENTAL MODE — AVANT-GARDE / GALLERY ***

Reference points: MSCHF, Toilet Paper magazine, Barbara Kruger, David Carson,
Peter Saville, Aries Moross, Stedelijk Museum identity, Centre Pompidou
posters. The goal is "made by a designer with a voice and an opinion", NOT
"made by a SaaS template".

What this means concretely:
- Colors that CLASH deliberately (hot pink + forest green, red + teal,
  mustard + plum). Not safe Tailwind complements.
- Typography as a statement, not a label. Section titles can be ENORMOUS.
  Stacked uppercase, overlapping blocks, gradient fills — all allowed.
- Flat areas of saturated color PLUS texture (halftone dots, riso-print
  grain, mis-registered offset) so surfaces feel printed / made, not SaaS-flat.
- Compositional tension: asymmetric, off-kilter, blocks that aren't aligned
  to a grid. Intentional imbalance.
- NOT "Canva nor Linear nor Notion nor Stripe". That family is creative
  territory (editorial). Experimental is galleries, zines, museum shops.

A dedicated bold renderer handles this level. Fill the \`bold\` object:

THE BOLD PRIMITIVES:

- **headerLayout** — hero-band | split-photo | tiled | asymmetric-burst
  tiled is strongest for avant-garde (grid of clashing color blocks).
  asymmetric-burst also works (diagonal color field bleeding off the edge).

- **sidebarStyle** — solid-color | gradient | photo-hero | transparent
  Sidebar is always present. For avant-garde, solid-color in the accent
  (not primary) makes a stronger clash; gradient with duotone-split is
  another strong move.

- **skillStyle** — bars-gradient | dots-rating | icon-tagged | colored-pills
  colored-pills in a clashing accent feels most zine-like; bars-gradient
  is the loudest.

- **photoTreatment** — circle-halo | squircle | color-overlay | badge-framed
  color-overlay with a saturated tint is the most art-directed look.

- **accentShape** — diagonal-stripe | angled-corner | colored-badge | hex-pattern
  diagonal-stripe for screen-printed feel, hex-pattern for riso background.

- **iconTreatment** — solid-filled | duotone | line-with-accent

- **headingStyle** — oversized-numbered | kicker-bar | gradient-text | bracketed | stacked-caps | overlap-block
  For avant-garde: stacked-caps (title vertical, ENORMOUS — Peter Saville)
  and overlap-block (title set against a colored block that extends past
  it — Kruger) are the strongest. oversized-numbered also still works.

- **gradientDirection** — none | linear-vertical | linear-diagonal | radial-burst | duotone-split | offset-clash
  duotone-split creates a hard edge between two colors (riso energy).
  offset-clash puts two color bands next to each other without blending.

- **surfaceTexture** — none | halftone | riso-grain | screen-print | stripe-texture
  DO NOT leave at 'none' for this level. Texture is what lifts the design
  out of the "SaaS flat" look. halftone = dots, riso-grain = noise,
  screen-print = slight offset misregistration, stripe-texture = fine lines.

REQUIRED BASE TOKENS:
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: true
- roundedCorners: often false for avant-garde (sharp corners feel more gallery)
- experienceDescriptionFormat: 'bullets'
- themeBase: 'bold' or 'creative'

FONTS (pick from): ${constraints.allowedFontPairings.join(' | ')}
- oswald-source-sans = condensed impact (David Carson / concert posters)
- dm-serif-dm-sans = sharp editorial serif
- playfair-inter = literary with contrast
- space-grotesk-work-sans = techno-gallery (Kunsthalle)
- montserrat-open-sans = geometric assertive

COLORS: the whole reason you're in experimental is to USE COLOR AS A
STATEMENT. The AI-picked color-palette MUST be unexpected. Copy the
reasoning from the examples below, then override with something ELSE that
still clashes — don't just reuse the same palette twice in a row.

Do NOT reach for Tailwind defaults (#0891b2, #be185d, #4f46e5, #f59e0b).
Those feel like a SaaS dashboard. Reach for off-key combinations:
- hot-pink + forest-green
- red + teal (riso-print)
- mustard + aubergine plum
- electric-violet + dusty-olive
- sage-green + hot-coral
- bone-white + pure-black + one screaming red
- navy + mustard + dusty-pink
- terracotta + deep-teal
- black + single neon-yellow accent

EXAMPLE COMBINATIONS (copy the energy, vary the specifics):

1. *Gallery curator* — tiled header, solid-color sidebar, colored-pills
   skills, color-overlay photo, diagonal-stripe accent, solid-filled icons,
   stacked-caps headings, duotone-split gradient, halftone texture.
   Primary #0f0f0f, accent #d9322b. Font: oswald-source-sans.

2. *Art director / publisher* — asymmetric-burst header, gradient sidebar,
   bars-gradient skills, squircle photo, colored-badge accent,
   line-with-accent icons, overlap-block headings, offset-clash gradient,
   screen-print texture. Primary #1e2847, accent #d6a42b. Font: dm-serif-dm-sans.

3. *Independent designer / zine editor* — tiled header, solid-color sidebar
   (in the accent), dots-rating skills, color-overlay photo, hex-pattern
   accent, duotone icons, oversized-numbered headings, duotone-split
   gradient, riso-grain texture. Primary #d73838, accent #1d8a99. Font:
   space-grotesk-work-sans.

4. *Creative technologist* — hero-band header, gradient sidebar,
   icon-tagged skills, badge-framed photo, angled-corner accent, solid-filled
   icons, gradient-text headings, linear-diagonal gradient, stripe-texture.
   Primary #6b21a8, accent #6e7e3c. Font: montserrat-open-sans.

5. *Fashion / cultural role* — split-photo header, solid-color sidebar,
   colored-pills skills, badge-framed photo, colored-badge accent,
   solid-filled icons, overlap-block headings, none gradient, halftone
   texture. Primary #e91e63, accent #1b5e20. Font: playfair-inter.

Vary aggressively. Two experimental CVs for the same industry should share
NO primitives in common.
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  let prompt = buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences);

  if (ctx.jobVacancy) {
    prompt += `
INDUSTRY AS STARTING POINT, NOT CONSTRAINT:
Industry: "${ctx.jobVacancy.industry || 'Unknown'}", Company: "${ctx.jobVacancy.company || 'Unknown'}".

Experimental mode is art-directed — the industry tells you WHICH avant-garde
language to speak, not whether to speak one.

- Tech / creative tech → riso-print energy (red+teal, pink+blue). Halftone
  or riso-grain. space-grotesk or oswald.
- Finance / consulting → gallery-restrained avant-garde (navy+mustard,
  black+neon-yellow, terracotta+teal). Screen-print texture. dm-serif.
- Creative / agency / fashion → full Toilet-Paper / Aries-Moross
  (hot-pink+forest, mustard+plum, electric-violet+olive). Halftone.
  playfair or oswald.
- Healthcare / academic → museum-poster restrained (sage-green+coral,
  terracotta+teal, bone+black+red). Riso-grain. playfair or dm-serif.
- Industrial / engineering → Bauhaus-reprint (mustard+plum, black+yellow,
  navy+mustard). Stripe-texture. space-grotesk or oswald.

If you're 100% CERTAIN about brand colors, you may incorporate them — but
only as ONE half of a clashing pair, not the whole palette. The other half
should come from the avant-garde family.
`;
  }

  // Variation nudge — pick concrete bold primitives to try this round.
  const sidebarPool = ctx.hasPhoto
    ? BOLD_POOLS.sidebarStyle
    : BOLD_POOLS.sidebarStyle.filter(s => s !== 'photo-hero');
  const palette = pickFrom(avantGardePalettes);
  prompt += `
VARIATION NUDGE — pick a concrete avant-garde palette + primitives:
- Suggested palette: "${palette.name}" — ${palette.description} (primary suggestion ${palette.primary}, accent ${palette.accent})
- Try bold.headerLayout = "${pickFrom(BOLD_POOLS.headerLayout)}"
- Try bold.sidebarStyle = "${pickFrom(sidebarPool)}"
- Try bold.headingStyle = "${pickFrom(BOLD_POOLS.headingStyle)}"
- Try bold.gradientDirection = "${pickFrom(BOLD_POOLS.gradientDirection)}"
- Try bold.surfaceTexture = "${pickFrom(BOLD_POOLS.surfaceTexture.filter(t => t !== 'none'))}"
- Try bold.skillStyle = "${pickFrom(BOLD_POOLS.skillStyle)}"

You MAY override these if the job context strongly pulls elsewhere, but
DO use an avant-garde palette (not a Tailwind default).
`;

  prompt += `
Generate tokens for the AVANT-GARDE BOLD RENDERER. The most important part
is the \`bold\` object — fill all 9 fields INCLUDING surfaceTexture.

Non-negotiables:
1. Fill every field in \`bold\`. Do NOT set surfaceTexture = 'none' — pick
   at least a subtle texture (riso-grain if unsure).
2. Use an avant-garde palette (see examples). Tailwind-default saturated
   blues/cyans/magentas are NOT allowed as the whole palette.
3. Vary from previous CVs — this is experimental, repetition is the
   enemy. If history shows a primitive was used, pick a different one.

IMPORTANT: think like a museum exhibition designer or a zine art director
commissioned for this specific role. NOT a Canva template picker.

Priority order:
1. Respect the target vacancy and company context
2. Respect explicit user style instructions
3. Then use avant-garde references/examples only as a language, never as a fixed template`;

  return prompt;
}

function getFallback(industry?: string): CVDesignTokens {
  // Industry → curated avant-garde palette (NOT Tailwind-pop colors).
  const industryPalettes: Record<string, AvantPalette> = {
    technology: avantGardePalettes.find(p => p.name === 'riso-red-teal')!,
    finance: avantGardePalettes.find(p => p.name === 'navy-mustard-pink')!,
    creative: avantGardePalettes.find(p => p.name === 'hot-pink-forest')!,
    healthcare: avantGardePalettes.find(p => p.name === 'sage-hot-coral')!,
    consulting: avantGardePalettes.find(p => p.name === 'terracotta-teal')!,
  };
  const palette = industryPalettes[industry || ''] || avantGardePalettes[0];
  const decorationTheme = industryToDecorationTheme(industry, 'abstract');

  return {
    styleName: 'Avant-garde',
    styleRationale: 'Art-directed, unexpected colors, gallery-poster sensibility.',
    industryFit: industry || 'creative',
    themeBase: 'bold',
    colors: {
      primary: palette.primary,
      secondary: '#faf7f2',
      accent: palette.accent,
      text: '#1a1a1a',
      muted: '#5a5a5a',
    },
    fontPairing: 'oswald-source-sans',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'asymmetric',
    sectionStyle: 'magazine',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-column',
    headerGradient: 'none',
    showPhoto: true,
    useIcons: true,
    roundedCorners: false,
    headerFullBleed: false,
    decorations: 'none',
    decorationTheme,
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications'],
    layout: 'sidebar-left',
    sidebarSections: ['skills', 'languages', 'certifications'],
    borderRadius: 'none',
    accentStyle: 'border-left',
    nameStyle: 'uppercase',
    skillTagStyle: 'outlined',
    pageBackground: '#faf7f2',
    bold: {
      headerLayout: 'tiled',
      sidebarStyle: 'solid-color',
      skillStyle: 'colored-pills',
      photoTreatment: 'color-overlay',
      accentShape: 'diagonal-stripe',
      iconTreatment: 'solid-filled',
      headingStyle: 'stacked-caps',
      gradientDirection: 'duotone-split',
      surfaceTexture: 'halftone',
    },
  };
}

function getContextualFallback(ctx: PromptContext): CVDesignTokens {
  const signals = readContextSignals(ctx);
  const base = getFallback(ctx.jobVacancy?.industry);

  if (signals.isCorporate || signals.wantsMinimal) {
    return {
      ...base,
      styleName: 'Gallery Corporate',
      styleRationale: 'Restrained gallery poster energy suited to finance, consulting and strategy roles.',
      industryFit: ctx.jobVacancy?.industry || 'finance',
      fontPairing: 'dm-serif-dm-sans',
      colors: {
        primary: '#1e2847',
        secondary: '#f7f2ea',
        accent: '#d6a42b',
        text: '#171717',
        muted: '#5d5d5d',
      },
      bold: {
        headerLayout: 'asymmetric-burst',
        sidebarStyle: 'gradient',
        skillStyle: 'dots-rating',
        photoTreatment: 'badge-framed',
        accentShape: 'angled-corner',
        iconTreatment: 'line-with-accent',
        headingStyle: 'overlap-block',
        gradientDirection: 'offset-clash',
        surfaceTexture: 'screen-print',
      },
    };
  }

  if (signals.isCreativeRole || signals.wantsLoud) {
    return {
      ...base,
      styleName: 'Poster Experimental',
      styleRationale: 'High-contrast poster language for creative, brand and culture roles.',
      industryFit: ctx.jobVacancy?.industry || 'creative',
      fontPairing: 'oswald-source-sans',
      colors: {
        primary: '#e91e63',
        secondary: '#faf7f2',
        accent: '#1b5e20',
        text: '#151515',
        muted: '#595959',
      },
      bold: {
        headerLayout: 'tiled',
        sidebarStyle: 'solid-color',
        skillStyle: 'colored-pills',
        photoTreatment: 'color-overlay',
        accentShape: 'diagonal-stripe',
        iconTreatment: 'solid-filled',
        headingStyle: 'stacked-caps',
        gradientDirection: 'duotone-split',
        surfaceTexture: 'halftone',
      },
    };
  }

  return base;
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.experimental;
  const fallback = getContextualFallback(ctx);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    colors: { ...fallback.colors, ...aiColors },
  };

  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = constraints.allowedThemes[0];
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = constraints.allowedFontPairings[0];

  if (typeof rawPartial.showPhoto !== 'boolean') {
    tokens.showPhoto = ctx.hasPhoto;
  }

  // Bold always has a sidebar
  if (tokens.layout !== 'sidebar-left' && tokens.layout !== 'sidebar-right') {
    tokens.layout = Math.random() > 0.5 ? 'sidebar-left' : 'sidebar-right';
  }
  if (!tokens.sidebarSections || tokens.sidebarSections.length === 0) {
    tokens.sidebarSections = ['skills', 'languages', 'certifications'];
  }

  tokens.bold = validateAndFixBoldTokens(tokens.bold, !!tokens.showPhoto);

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'bold');

  // Rotate the bold primitives across history — THE variation fix.
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
      'bold.surfaceTexture': BOLD_POOLS.surfaceTexture,
      fontPairing: constraints.allowedFontPairings,
      layout: ['sidebar-left', 'sidebar-right'],
    },
    LOG_TAG,
  );

  // Final pass after rotation
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
