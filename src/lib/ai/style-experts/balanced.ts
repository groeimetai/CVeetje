/**
 * Balanced expert — modern, lightly designed CVs.
 *
 * Sits between conservative and creative. The job of this level is to feel
 * VISIBLY different from conservative — a recruiter glancing at both should
 * spot the balanced CV as "considered" / "designed" within a second, while
 * still reading as professional and ATS-friendly.
 *
 * Concretely, balanced gets:
 *   - one (1) accent color tied to the vacancy's industry/company brand
 *   - one (1) designed detail (accented header bar, accent-left section, or
 *     border-left summary) so the page isn't pure black-on-white
 *   - a section title style that uses the accent (underlined / accent-left
 *     instead of plain clean)
 *   - subtle background decorations enabled by default
 *   - a slight page tint when the AI picks a paper/warm/cool palette
 *
 * What balanced does NOT do:
 *   - editorial / magazine layouts (creative owns those)
 *   - banner headers, asymmetric grids, sidebars (creative + experimental)
 *   - drop caps, pull quotes, big section numerals
 *
 * The orchestrator passes a styleHistory; normalize() rotates the lightly-
 * varying fields so two consecutive Balanced CVs don't share font + section
 * style + accent style.
 */

import type { CVDesignTokens } from '@/types/design-tokens';
import type { StyleExpert, PromptContext, BuiltPrompt } from './types';
import { baseDesignTokensSchema } from './shared/base-schema';
import { creativityConstraints, themeDefaults, getIndustryStyleProfile } from '@/lib/cv/templates/themes';
import {
  commonSystemHeader,
  commonSectionOrderFooter,
  buildCommonUserPreamble,
  buildCompanyAnalysisBlock,
  buildClosingDirectives,
} from './shared/prompt-fragments';
import {
  applyBaseValidations,
  clearOtherRendererTokens,
} from './shared/normalize-base';
import { pickFrom, rotateLeastUsed } from './shared/variation';
import { colorMoods } from './shared/color-moods';

const LOG_TAG = 'Style Gen [balanced]';

// Pools the normalize() step rotates over history. These are kept inside the
// balanced constraints so anything we pick is always a legal value.
const BALANCED_POOLS = {
  // Drop pure 'clean' from rotation — clean is what makes balanced look like
  // conservative. The AI may still return clean and we'll allow it the first
  // time, but on repeat generations we rotate away from it.
  sectionStyle: ['underlined', 'accent-left', 'boxed'] as const,
  accentStyle: ['border-left', 'background'] as const,
  nameStyle: ['normal', 'uppercase'] as const,
  // Push at least one non-default skill tag style into the rotation.
  skillTagStyle: ['filled', 'outlined'] as const,
} as const;

function buildSystemPrompt(hasPhoto: boolean): string {
  const constraints = creativityConstraints.balanced;

  return `${commonSystemHeader(hasPhoto)}

CREATIVITY LEVEL: balanced (modern professional — visibly designed, never loud)

This is the level for candidates applying to most companies: agencies,
startups, scale-ups, consultancies, healthcare, SaaS, education, retail,
government with a modern brand. The CV should feel CONSIDERED — like
someone with design sensibility made it — while staying ATS-friendly and
single-column.

CRITICAL — what makes balanced different from conservative:
Conservative is all-grey/navy, "simple" header, "clean" sections, no
accents, no decorations. If your output looks like that, you have FAILED
at this level. Balanced MUST add visible signs of design intent:

1. **One accent color**, tied to the target company's industry or (when
   100% confident) brand. The accent shows up in the header bar, section
   underlines, or summary border-left — see structural rules below.
2. **A designed header**: prefer 'accented' (left accent bar) or 'split'
   (name left, contact right with bottom rule) — NOT 'simple'.
3. **A designed section title**: prefer 'underlined' (accent-color rule
   under titles) or 'accent-left' (accent-color bar to the left of each
   section) — NOT 'clean'.
4. **A small summary treatment**: accentStyle = 'border-left' or
   'background' — gives the opening summary a tinted/bordered frame.
5. **Subtle decorations**: decorations = 'minimal'. This adds soft
   background shapes — barely visible, but they break the empty-white look.

If you pick 'simple' header + 'clean' sections + 'none' decorations +
'none' accentStyle, the result will be indistinguishable from
conservative. Don't do that.

ALLOWED VALUES (HARD CONSTRAINTS):
- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: ${constraints.allowedFontPairings.join(', ')}
- Headers: ${constraints.allowedHeaderVariants.join(', ')}  (prefer accented or split; avoid plain simple)
- sectionStyle: ${constraints.allowedSectionStyles.join(', ')}  (prefer underlined or accent-left)
- accentStyle: ${constraints.allowedAccentStyles.join(', ')}  (prefer border-left for the summary)
- nameStyle: ${constraints.allowedNameStyles.join(', ')}
- skillTagStyle: ${constraints.allowedSkillTagStyles.join(', ')}
- decorations: ${constraints.allowedDecorations.join(', ')}  (default to minimal)
- contactLayout: 'single-row' or 'double-row'
- headerGradient: 'none' or 'subtle'
- layout: single-column ONLY (sidebars are creative/experimental territory)
- showPhoto: ${hasPhoto ? 'true' : 'false'}

COLOR RULES (this is where balanced earns its name):
- Pick ONE accent color that fits the vacancy:
  - **Fintech / banking / consulting** → deep navy or burgundy primary
    with a restrained accent (slate-blue, copper, deep gold).
  - **Sustainability / nonprofit / climate / health** → forest, sage,
    moss primary with terracotta or amber accent.
  - **Healthcare / wellness** → teal or sage primary with warm coral.
  - **Tech / SaaS / engineering** → indigo, slate, or deep teal primary
    with electric-cyan, lime, or amber accent.
  - **Creative agency / marketing** → plum, burnt-orange, or rich teal
    primary with contrasting warm accent.
  - **Government / public sector** → ink-navy or charcoal primary with a
    single muted accent.
- ONLY use a specific company brand color when it is COMMON KNOWLEDGE
  and you are CERTAIN it is current. Don't guess. When in doubt, use the
  industry profile above.
- The accent should appear in: section underlines, the accented-header
  side bar, the border-left summary, and section title color.
- Page background ('pageBackground'): for warm palettes a very light
  paper tint (#fbfaf6, #faf8f3) reads more "designed" than pure white.
  For cool palettes a hint of off-white (#f8fafc) works. Always near-white.
- All other text stays dark (#1f2937 — #1a1a1a) for readability.

OUTPUT SHAPE: fill the BASE schema completely. Do NOT fill the
\`editorial\` or \`bold\` objects — those belong to creative/experimental.
${commonSectionOrderFooter}`;
}

function buildUserPrompt(ctx: PromptContext): string {
  const base = [
    buildCommonUserPreamble(ctx.linkedInSummary, ctx.jobVacancy, ctx.userPreferences),
    buildCompanyAnalysisBlock(ctx.jobVacancy),
    buildClosingDirectives(ctx.jobVacancy?.company),
  ].filter(Boolean).join('\n');

  // Variation nudge — sample fresh combinations so repeated calls don't
  // converge on the same "safe" output.
  const mood = pickFrom(colorMoods);
  const sectionStyle = pickFrom(BALANCED_POOLS.sectionStyle);
  const accentStyle = pickFrom(BALANCED_POOLS.accentStyle);
  const headerVariant = pickFrom(['accented', 'split'] as const);

  // Industry-targeted brand-color nudge. We tell the AI WHAT to consider,
  // not what to pick — that stays the AI's job.
  const profile = getIndustryStyleProfile(ctx.jobVacancy?.industry);
  const companyHint = ctx.jobVacancy?.company
    ? `\nCONSIDER THE COMPANY: "${ctx.jobVacancy.company}". If you are 100% confident in their current brand color (very few companies qualify), let that influence the accent. Otherwise, stay with the industry mood below.`
    : '';

  const industryColorHint = profile
    ? `\nIndustry color direction for "${profile.label}": ${profile.colorMood}\nThis is your DEFAULT — only deviate if the vacancy text strongly signals otherwise.`
    : '';

  return `${base}
${companyHint}${industryColorHint}

VARIATION NUDGE (a diversity signal — the industry profile above is still the
primary driver. Use these to break ties when multiple options would work):
- Color mood: "${mood.mood}" — ${mood.description}
- Try headerVariant = "${headerVariant}"
- Try sectionStyle = "${sectionStyle}"
- Try accentStyle = "${accentStyle}" on the summary

NON-NEGOTIABLES for this level:
1. The output MUST be visibly distinct from a plain conservative CV.
   The combination of (sectionStyle, accentStyle, decorations, headerVariant)
   should NOT all be the most-boring option at the same time.
2. The accent color should be USED — set sectionStyle to 'underlined' or
   'accent-left' so the accent actually shows. A vibrant accent on a
   'clean' section title is invisible.
3. Decorations default to 'minimal' unless the vacancy is for a very
   formal role (legal / government / executive search).
4. Set accentStyle to 'border-left' or 'background' on the summary so the
   first paragraph reads as a "lede", not a generic block of text.

Generate tokens.`;
}

function getFallback(industry?: string): CVDesignTokens {
  const defaults = themeDefaults['modern'];
  const profile = getIndustryStyleProfile(industry);

  // Pick the fallback color from the industry profile when we have one —
  // a sustainability role's fallback should not be the default modern indigo.
  const colors = profile
    ? deriveColorsFromMood(profile.colorMood, defaults.suggestedColors)
    : defaults.suggestedColors;

  return {
    styleName: 'Modern Professional',
    styleRationale: 'A modern, lightly designed CV with an industry-tuned accent color and subtle structural details.',
    industryFit: industry || 'general',
    themeBase: 'modern',
    colors,
    fontPairing: defaults.fontPairing,
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'accented',
    sectionStyle: 'underlined',
    skillsDisplay: defaults.skillsDisplay,
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: true,
    useIcons: defaults.useIcons,
    roundedCorners: defaults.roundedCorners,
    headerFullBleed: false,
    decorations: 'minimal',
    accentStyle: 'border-left',
    nameStyle: 'normal',
    skillTagStyle: 'filled',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages', 'certifications', 'interests'],
  };
}

/**
 * Best-effort color derivation from an industry colorMood string. The mood
 * strings are descriptive ("deep navy, burgundy, forest green ...") so we do
 * a cheap keyword match instead of pulling in a color library. When no
 * keyword matches we leave the existing defaults alone.
 */
// Palette presets keyed by descriptive keywords found in industry colorMood
// strings. Each preset is a balanced (primary, accent) pair — primary stays
// dark for header text, accent is the vibrant detail.
const MOOD_PALETTES: Array<{ keywords: RegExp; palette: CVDesignTokens['colors'] }> = [
  { keywords: /navy|trust|deep blue/, palette: { primary: '#1a365d', secondary: '#f1f5f9', accent: '#b88c5a', text: '#1f2937', muted: '#6b7280' } },
  { keywords: /burgundy|wine|plum|berry/, palette: { primary: '#4a1f2a', secondary: '#f6f0ee', accent: '#b88c5a', text: '#1f2937', muted: '#6b7280' } },
  { keywords: /charcoal|slate|industrial|steel/, palette: { primary: '#2b303a', secondary: '#f3f4f6', accent: '#e07b39', text: '#1f2937', muted: '#6b7280' } },
  { keywords: /forest|sage|moss|sustainab|natural/, palette: { primary: '#2f4a3b', secondary: '#f3f5ef', accent: '#c97a4a', text: '#1f2937', muted: '#6b7280' } },
  { keywords: /teal|seafoam|aqua/, palette: { primary: '#1f4a4a', secondary: '#eef5f4', accent: '#d97757', text: '#1f2937', muted: '#6b7280' } },
  { keywords: /indigo|electric|tech/, palette: { primary: '#1f2b5e', secondary: '#f1f3fb', accent: '#06b6d4', text: '#1f2937', muted: '#6b7280' } },
  { keywords: /terracotta|coral|sunset|warm/, palette: { primary: '#3a2f29', secondary: '#fbf6f0', accent: '#c46a3b', text: '#1f2937', muted: '#6b7280' } },
];

function deriveColorsFromMood(
  mood: string,
  fallback: CVDesignTokens['colors'],
): CVDesignTokens['colors'] {
  const lower = mood.toLowerCase();

  // Match by EARLIEST keyword position in the mood string. The mood text
  // typically lists the dominant palette first, so this matches the
  // industry's primary direction (fintech says "deep navy" before "forest
  // green" — we pick navy, not green).
  let bestMatch: { idx: number; palette: CVDesignTokens['colors'] } | null = null;
  for (const { keywords, palette } of MOOD_PALETTES) {
    const m = keywords.exec(lower);
    if (!m) continue;
    if (!bestMatch || m.index < bestMatch.idx) {
      bestMatch = { idx: m.index, palette };
    }
  }
  return bestMatch?.palette ?? fallback;
}

function normalize(raw: unknown, ctx: PromptContext): CVDesignTokens {
  const constraints = creativityConstraints.balanced;
  const fallback = getFallback(ctx.jobVacancy?.industry);
  const rawPartial = (raw ?? {}) as Partial<CVDesignTokens>;
  const aiColors = rawPartial.colors || {};
  const tokens: CVDesignTokens = {
    ...fallback,
    ...rawPartial,
    colors: { ...fallback.colors, ...aiColors },
  };

  // Balanced should show a portrait whenever one is available unless the AI
  // explicitly opted out. The fallback previously hard-disabled photos.
  if (typeof rawPartial.showPhoto !== 'boolean') {
    tokens.showPhoto = ctx.hasPhoto;
  }

  // Clamp enums to allowed values for this level
  if (!constraints.allowedThemes.includes(tokens.themeBase)) tokens.themeBase = constraints.allowedThemes[0];
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) tokens.fontPairing = constraints.allowedFontPairings[0];

  const allowedHeaders = constraints.allowedHeaderVariants as readonly string[];
  if (!allowedHeaders.includes(tokens.headerVariant)) tokens.headerVariant = constraints.allowedHeaderVariants[0];

  const allowedSections = constraints.allowedSectionStyles as readonly string[];
  if (!allowedSections.includes(tokens.sectionStyle)) tokens.sectionStyle = 'underlined';

  // Balanced is single-column. Sidebar layouts belong to creative+.
  if (tokens.layout && tokens.layout !== 'single-column') {
    console.log(`[${LOG_TAG}] Dropping non-single-column layout "${tokens.layout}" — balanced is single-column only.`);
    tokens.layout = 'single-column';
    tokens.sidebarSections = undefined;
  }

  // --- Anti-conservative escalation ---
  //
  // If the AI produced a token combination that's indistinguishable from
  // conservative (all the safest options at once), nudge ONE of them.
  // This is the core fix for "balanced feels too close to safe".
  const isClean = tokens.sectionStyle === 'clean';
  const isSimple = tokens.headerVariant === 'simple';
  const noDecor = tokens.decorations === 'none';
  const noAccent = !tokens.accentStyle || tokens.accentStyle === 'none';

  // Count how many "boring" defaults we hit. 3+ means the result looks safe.
  const boringCount = [isClean, isSimple, noDecor, noAccent].filter(Boolean).length;
  if (boringCount >= 3) {
    console.log(`[${LOG_TAG}] Output too close to conservative (boringCount=${boringCount}). Escalating section/accent/decorations.`);
    // Always upgrade decorations and accent — cheapest visible change.
    if (noDecor) tokens.decorations = 'minimal';
    if (noAccent) tokens.accentStyle = 'border-left';
    // If sections are still clean, push them to underlined so the accent shows.
    if (isClean) tokens.sectionStyle = 'underlined';
  }

  // Even when not in the "all-boring" trap, we want decorations to default to
  // minimal — that's the level's signature. Only respect 'none' when the AI
  // explicitly set it (and the AI was warned in the prompt that minimal is
  // the default).
  if (rawPartial.decorations === undefined) {
    tokens.decorations = 'minimal';
  }

  // accentStyle default: if AI didn't set it AND fallback didn't override,
  // give the summary a border-left tied to the accent color.
  if (rawPartial.accentStyle === undefined && (!tokens.accentStyle || tokens.accentStyle === 'none')) {
    tokens.accentStyle = 'border-left';
  }

  // Clamp accent / name / skill tag styles to allowed values too.
  const allowedAccents = constraints.allowedAccentStyles as readonly string[];
  if (tokens.accentStyle && !allowedAccents.includes(tokens.accentStyle)) {
    tokens.accentStyle = 'border-left';
  }
  const allowedNames = constraints.allowedNameStyles as readonly string[];
  if (tokens.nameStyle && !allowedNames.includes(tokens.nameStyle)) {
    tokens.nameStyle = 'normal';
  }
  const allowedTags = constraints.allowedSkillTagStyles as readonly string[];
  if (tokens.skillTagStyle && !allowedTags.includes(tokens.skillTagStyle)) {
    tokens.skillTagStyle = 'filled';
  }

  applyBaseValidations(tokens, LOG_TAG);
  clearOtherRendererTokens(tokens, 'none');

  // Rotate the fields that actually vary at this level. We add accentStyle,
  // nameStyle and skillTagStyle so repeated generations cycle through the
  // small "designed details" instead of always landing on the same one.
  rotateLeastUsed(
    tokens,
    ctx.styleHistory,
    {
      fontPairing: constraints.allowedFontPairings,
      headerVariant: allowedHeaders,
      sectionStyle: BALANCED_POOLS.sectionStyle,
      accentStyle: BALANCED_POOLS.accentStyle,
      nameStyle: BALANCED_POOLS.nameStyle,
      skillTagStyle: BALANCED_POOLS.skillTagStyle,
    },
    LOG_TAG,
  );

  return tokens;
}

export const balancedExpert: StyleExpert = {
  level: 'balanced',
  schema: baseDesignTokensSchema,
  preferredTemperature: 0.6,
  buildPrompt(ctx: PromptContext): BuiltPrompt {
    return {
      system: buildSystemPrompt(ctx.hasPhoto),
      user: buildUserPrompt(ctx),
    };
  },
  normalize,
  getFallback,
};
