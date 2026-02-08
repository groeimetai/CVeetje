/**
 * Style Generator v2 - Token-Based Approach
 *
 * Generates CVDesignTokens with a single LLM API call (~20 properties)
 * instead of the original 12+ calls for 150+ properties.
 *
 * Temperature is based on creativity level:
 * - conservative: 0.3 (safe, predictable)
 * - balanced: 0.5 (reasonable variation)
 * - creative: 0.7 (more expressive)
 * - experimental: 0.9 (maximum variation)
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import { withRetry } from './retry';
import type {
  JobVacancy,
  LLMProvider,
  TokenUsage,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { creativityConstraints, themeDefaults } from '@/lib/cv/templates/themes';
import { validateAndFixColorContrast } from '@/lib/cv/templates/color-utils';

// ============ Zod Schema for Design Tokens ============

const designTokensSchema = z.object({
  // Metadata
  styleName: z.string().describe('A descriptive name for this style, e.g., "Executive Professional" or "Creative Tech"'),
  styleRationale: z.string().describe('Brief explanation of why this style fits the profile and job (2-3 sentences)'),
  industryFit: z.string().describe('The industry this style is optimized for, e.g., "technology", "finance", "healthcare", "creative"'),

  // Theme
  themeBase: z.enum(['professional', 'modern', 'creative', 'minimal', 'bold'])
    .describe('Base theme that determines overall aesthetic direction'),

  // Colors - ALL are required and will be used
  colors: z.object({
    primary: z.string().describe('Primary color for name and headings (hex code like #1a365d). Should have good contrast on white.'),
    secondary: z.string().describe('Secondary color for subtle backgrounds (hex code). Should be very light, almost white.'),
    accent: z.string().describe('Accent color for highlights, links, and decorative elements (hex code). Should complement primary.'),
    text: z.string().describe('Main body text color (hex code like #333333). Should be readable.'),
    muted: z.string().describe('Muted text for dates, labels (hex code like #666666). Should be lighter than text.'),
  }),

  // Typography
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
  ]).describe('Font combination: heading font + body font'),

  scale: z.enum(['small', 'medium', 'large'])
    .describe('Typography scale: small for dense content, large for impact'),

  // Layout
  spacing: z.enum(['compact', 'comfortable', 'spacious'])
    .describe('Overall spacing density'),

  // Component variants
  headerVariant: z.enum(['simple', 'accented', 'banner', 'split'])
    .describe('Header layout: simple (clean), accented (left border), banner (full-width color), split (name left, contact right)'),

  sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card'])
    .describe('Section styling: clean (minimal), underlined (accent under title), boxed (background), timeline (vertical line), accent-left (colored left border per section), card (cards with subtle shadow)'),

  skillsDisplay: z.enum(['tags', 'list', 'compact'])
    .describe('How skills are displayed: tags (pills), list (bulleted columns), compact (inline with separators)'),

  experienceDescriptionFormat: z.enum(['bullets', 'paragraph'])
    .describe('Experience format: bullets (opsommingstekens) or paragraph (doorlopende tekst)'),

  contactLayout: z.enum(['single-row', 'double-row', 'single-column', 'double-column'])
    .describe('Contact info layout: single-row (all inline with separators), double-row (split across 2 lines), single-column (vertical stack), double-column (2-column grid)'),

  headerGradient: z.enum(['none', 'subtle', 'radial'])
    .describe('Header background effect: none (solid color), subtle (elegant linear gradient), radial (luxurious radial glow)'),

  // Feature flags
  showPhoto: z.boolean().describe('Whether to show a profile photo if available'),
  useIcons: z.boolean().describe('Whether to show icons in contact info and sections'),
  roundedCorners: z.boolean().describe('Whether to use rounded corners on cards and tags'),
  headerFullBleed: z.boolean().describe('Whether the header extends to page edges (full-bleed) - true for bold/impactful designs, false for classic margins'),

  // Decorations - subtle background shapes
  decorations: z.enum(['none', 'minimal', 'moderate', 'abundant'])
    .describe('Background decorative shapes: none for professional/conservative, minimal-moderate for creative, abundant for experimental'),

  // Section order
  sectionOrder: z.array(z.string())
    .describe('Order of CV sections. Use: summary, experience, education, skills, languages, certifications'),

  // Extended styling tokens (optional)
  accentStyle: z.enum(['none', 'border-left', 'background', 'quote']).optional()
    .describe('Summary section styling: none (plain), border-left (accent border), background (subtle bg), quote (italic with border)'),
  borderRadius: z.enum(['none', 'small', 'medium', 'large', 'pill']).optional()
    .describe('Corner rounding scale: none (sharp), small (4px), medium (8px), large (12px), pill (fully rounded)'),
  pageBackground: z.string().optional()
    .describe('Page background color (hex). Must be very light (near white). Leave empty for white.'),
  nameStyle: z.enum(['normal', 'uppercase', 'extra-bold']).optional()
    .describe('Name styling: normal, uppercase (with letter-spacing), extra-bold (weight 900)'),
  skillTagStyle: z.enum(['filled', 'outlined', 'pill']).optional()
    .describe('Skill tag variant: filled (default bg), outlined (border only), pill (fully rounded)'),
});

// Extended schema for creative mode - includes decorationTheme, layout, sidebarSections
const creativeTokensSchema = designTokensSchema.extend({
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract'])
    .describe(`Industry-based decoration theme:
    - geometric: IT/Tech/Engineering - circuits, hexagons, triangles, grid patterns
    - organic: Healthcare/Pharma/Nature - soft curves, leaves, waves, natural shapes
    - minimal: Finance/Consulting/Legal - subtle lines, corners, clean accents
    - tech: Software/Data/AI - code brackets, nodes, digital patterns
    - creative: Design/Marketing/Art - bold abstract shapes, splashes, dynamic forms
    - abstract: General/Versatile - balanced mix of geometric patterns`),
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional()
    .describe('Page layout: single-column (classic), sidebar-left (sidebar on left with skills/languages/certs), sidebar-right (sidebar on right). Optional — use sidebar for extra visual impact.'),
  sidebarSections: z.array(z.string()).optional()
    .describe('Which sections go in the sidebar (default: skills, languages, certifications). Only used with sidebar layouts.'),
});

// Extended schema for experimental mode - includes layout and custom decorations
// Note: Anthropic API only supports minItems of 0 or 1, so we validate min count in code
const experimentalTokensSchema = creativeTokensSchema.extend({
  layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).optional()
    .describe('Page layout: single-column (classic), sidebar-left (sidebar on left with skills/languages/certs), sidebar-right (sidebar on right)'),
  sidebarSections: z.array(z.string()).optional()
    .describe('Which sections go in the sidebar (default: skills, languages, certifications). Only used with sidebar layouts.'),
  customDecorations: z.array(z.object({
    name: z.string().describe('Unique name for this decoration, e.g., "code-bracket", "data-node", "growth-arrow"'),
    description: z.string().describe('Visual description: what shape/symbol this represents (e.g., "curly brace like { }", "connected dots forming a network node", "upward arrow with bar chart")'),
    placement: z.enum(['corner', 'edge', 'scattered']).describe('Where to place: corner (corners of page), edge (along margins), scattered (random positions)'),
    size: z.enum(['small', 'medium', 'large']).describe('Size of decoration elements'),
    quantity: z.number().describe('How many of this decoration to place (1-5, will be clamped)'),
  })).describe(`Custom decorations that reflect the job/industry. Create 2-5 unique decorations.
Examples:
- Software Developer: code brackets, terminal prompts, git branches
- Data Scientist: scatter plot dots, neural network nodes, bar charts
- Marketing: speech bubbles, trend arrows, target circles
- Finance: growth arrows, pie chart segments, currency symbols
- Healthcare: heartbeat lines, molecule shapes, plus signs
Make them SUBTLE and PROFESSIONAL, not literal clipart!`),
});

// ============ Temperature by Creativity Level ============

const temperatureMap: Record<StyleCreativityLevel, number> = {
  conservative: 0.2,
  balanced: 0.5,
  creative: 0.8,
  experimental: 1.0,
};

// ============ System Prompt ============

function buildSystemPrompt(creativityLevel: StyleCreativityLevel, hasPhoto: boolean): string {
  const constraints = creativityConstraints[creativityLevel];

  return `You are a professional CV/resume design expert. Your task is to generate design tokens for a CV based on the candidate's profile and target job.

IMPORTANT COLOR RULES:
1. Every color MUST be a valid hex code starting with #
2. For BANNER headers: primary color MUST be DARK (it becomes the background, with white text on top)
3. For NON-BANNER headers: primary color should have good contrast against white
4. Secondary color should be very light (tinted version of primary or neutral)
5. Accent color should be vibrant and complement the primary
6. Text and muted colors should be readable (dark grays work well)

COLOR SELECTION STRATEGY:
- The CV should look like it could be company marketing material - matching their brand style
- ONLY use brand colors if you are 100% CERTAIN about them (ING=orange, Rabobank=blue/orange, KPN=green, PostNL=orange, Coolblue=blue, etc.)
- If you're NOT CERTAIN about a company's brand colors: DO NOT GUESS! Create a professional palette that fits the industry instead
- When uncertain, pick colors based on industry conventions and create something unique
- Always ensure colors work well together with good contrast

PHOTO AVAILABILITY: ${hasPhoto ? 'User HAS uploaded a photo - you SHOULD set showPhoto to true' : 'No photo available - set showPhoto to false'}

CREATIVITY LEVEL: ${creativityLevel}
${creativityLevel === 'conservative' ? `
- Themes: ONLY ${constraints.allowedThemes.join(', ')}
- Fonts: ONLY ${constraints.allowedFontPairings.join(', ')}
- Headers: ONLY ${constraints.allowedHeaderVariants.join(', ')}
- Colors: professional, conservative colors appropriate for the company's industry
- showPhoto: false (ATS compatibility)
- sectionStyle: clean or underlined only
- decorations: MUST be 'none' (no background shapes)
- contactLayout: 'single-row' (classic inline format)
- headerGradient: 'none' (solid color only)
` : ''}
${creativityLevel === 'balanced' ? `
- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: preferably ${constraints.allowedFontPairings.join(', ')}
- Headers: simple, accented, or split (avoid banner)
- Colors: base on the target company's brand and industry
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- Try underlined section style with accent color
- decorations: SHOULD be 'minimal' (adds subtle background shapes for visual interest - recommended!)
- contactLayout: 'single-row' or 'double-row' based on content length
- headerGradient: 'none' or 'subtle' for a touch of elegance
` : ''}
${creativityLevel === 'creative' ? `
*** CREATIVE MODE — VARIETY IS KEY ***

Your goal is to create VISUALLY DISTINCT CVs. Every CV should look meaningfully different.

AVAILABLE OPTIONS (choose freely, mix and match):
- Themes: ${constraints.allowedThemes.join(', ')}
- Fonts: all 12 pairings available, including newer ones like 'oswald-source-sans' (condensed impact), 'dm-serif-dm-sans' (warm serif+geometric sans), 'space-grotesk-work-sans' (techy feel), 'libre-baskerville-source-sans' (classic book serif)
- Headers: simple, accented, banner, or split — choose what fits best, don't default to banner every time
- Section styles: clean, underlined, boxed, timeline, accent-left (colored left border), card (subtle shadow cards)
- Colors: vibrant colors inspired by the company's brand - make them pop!
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: consider true for modern feel
- decorations: 'moderate' recommended (noticeable background shapes)
- contactLayout: any option — single-row, double-row, single-column, double-column

LAYOUT OPTIONS:
- 'single-column': classic single column layout
- 'sidebar-left': sidebar on the left with skills/languages/certs — creates a dashboard feel
- 'sidebar-right': sidebar on the right — modern magazine layout
- If using a sidebar, set sidebarSections to ['skills', 'languages', 'certifications'] (NEVER put experience, summary, or education in sidebar)

EXTENDED STYLING (use these for variety!):
- accentStyle: 'none', 'border-left' (accent line on summary), 'background' (subtle bg on summary), 'quote' (italic with border)
- borderRadius: 'none' through 'pill' — experiment with rounded corners
- nameStyle: 'normal', 'uppercase' (with letter-spacing), 'extra-bold' (weight 900)
- skillTagStyle: 'filled' (default), 'outlined' (border only, no fill), 'pill' (fully rounded)
- pageBackground: optional very light tinted background (e.g. #faf8f5 for warm, #f0f4f8 for cool)

ANTI-BORING RULES:
- FORBIDDEN: the combination of clean sections + simple header + inter-inter font. This is too plain for creative mode!
- REQUIRED: at least 1 of accentStyle/nameStyle/skillTagStyle must NOT be its default value
- MUST USE at least 1 of: banner/split header, card/accent-left/timeline sections, or a serif/display font pairing

ENCOURAGE UNEXPECTED COMBINATIONS:
- Serif heading + card sections + outlined skill tags
- Split header + accent-left sections + uppercase name
- Banner header + pill skill tags + quote accent style
- Accented header + timeline sections + extra-bold name

DECORATION THEME (Required for creative mode):
Choose a decorationTheme that matches the target industry/job:
- 'geometric': IT, Tech, Engineering — circuits, hexagons, grid patterns
- 'organic': Healthcare, Pharma, Nature — soft curves, leaves, waves
- 'minimal': Finance, Consulting, Legal — subtle lines, clean accents
- 'tech': Software, Data, AI — code brackets, nodes, digital patterns
- 'creative': Design, Marketing, Art — bold shapes, splashes
- 'abstract': General use — balanced geometric patterns
` : ''}
${creativityLevel === 'experimental' ? `
*** EXPERIMENTAL MODE — MAXIMUM VARIETY & VISUAL IMPACT ***

Your PRIMARY goal: every CV must look UNIQUE. No two experimental CVs should feel the same.

YOU HAVE FULL CREATIVE FREEDOM. Choose freely from ALL available options:

THEMES: any of ${constraints.allowedThemes.join(', ')}
FONTS: all 12 pairings — PREFER display/serif fonts for maximum impact:
  - 'oswald-source-sans': condensed, high-impact headings
  - 'dm-serif-dm-sans': warm, editorial feel
  - 'space-grotesk-work-sans': techy, modern startup vibe
  - 'libre-baskerville-source-sans': classic, sophisticated
  - 'playfair-inter': elegant serif contrast
  - plus all standard pairings

HEADERS: simple, accented, banner, or split — don't always default to banner!
  - 'split' creates an interesting asymmetric layout
  - 'accented' with bold colors can be just as impactful as banner
  - 'simple' with uppercase name + bold colors = clean power

SECTION STYLES: clean, underlined, boxed, timeline, accent-left, card
  - 'card': sections as cards with subtle shadows — modern SaaS feel
  - 'accent-left': colored left border per section — editorial feel
  - 'timeline': vertical storytelling line
  - Mix different approaches for visual interest

LAYOUT: 'single-column', 'sidebar-left', 'sidebar-right'
  - Sidebar layouts place skills/languages/certifications in a sidebar column
  - RECOMMENDED: use sidebar-left or sidebar-right for distinctive layout (unless you have a strong reason not to)
  - Set sidebarSections to ['skills', 'languages', 'certifications'] (NEVER put experience, summary, or education in sidebar)

MANDATORY RULES FOR EXPERIMENTAL MODE:
- REQUIRED: accentStyle, nameStyle, AND skillTagStyle must ALL be set to non-default values (not 'none'/'normal'/'filled')
- REQUIRED: pageBackground must be a tinted color (not plain white) — e.g. #faf8f5 warm, #f5f0eb cream, #f0f4f8 cool blue
- REQUIRED: borderRadius must be 'medium', 'large', or 'pill' (not 'none' or 'small')
- FORBIDDEN: inter-inter font + simple header + clean sections — this is far too plain for experimental!
- RECOMMENDED: sidebar layout unless there's a compelling reason for single-column

EXTENDED STYLING (ALL required for experimental!):
- accentStyle: 'border-left', 'background', or 'quote' (NOT 'none')
- borderRadius: 'medium', 'large', or 'pill' (NOT 'none' or 'small')
- nameStyle: 'uppercase' or 'extra-bold' (NOT 'normal')
- skillTagStyle: 'outlined' or 'pill' (NOT 'filled')
- pageBackground: subtle tinted background (REQUIRED — e.g. #faf8f5 warm, #f5f0eb cream, #f0f4f8 cool blue)

EXAMPLE COMBINATIONS (for inspiration, don't copy exactly):
1. Sidebar-right + accented header + card sections + pill skill tags + dm-serif-dm-sans
2. Single-column + split header + accent-left sections + outlined skills + oswald-source-sans + uppercase name
3. Sidebar-left + banner header + clean sections + extra-bold name + space-grotesk-work-sans
4. Single-column + simple header + timeline sections + quote accent + libre-baskerville-source-sans + warm page background
5. Sidebar-right + banner + boxed sections + pill border-radius + poppins-nunito

COLORS: Be adventurous!
- Don't default to generic blue/gray — use VIBRANT, unexpected colors
- Deep teal, warm terracotta, rich forest green, striking burgundy, electric indigo
- Only use brand colors if 100% CERTAIN about them
- If uncertain, create a bold palette that fits the industry

DECORATIONS: 'abundant' recommended (bold background shapes)
- showPhoto: ${hasPhoto ? 'true recommended' : 'false'}
- useIcons: consider true for modern feel

DECORATION THEME (Required):
Choose a decorationTheme matching the industry:
- 'geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract'

CUSTOM DECORATIONS (Required for experimental mode):
Generate 2-5 unique customDecorations tailored to the JOB and INDUSTRY.
These should be ABSTRACT shapes that SUBTLY represent the field.

This CV should be BOLD, UNIQUE, and MEMORABLE!
` : ''}

SECTION ORDER GUIDELINES:
- Most jobs: summary, experience, education, skills, languages, certifications
- Entry-level: summary, education, experience, skills, languages, certifications
- Technical: summary, skills, experience, education, certifications, languages`;
}

// ============ User Prompt Builder ============

function buildUserPrompt(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced'
): string {
  let prompt = `Generate CV design tokens for this candidate:

CANDIDATE PROFILE:
${linkedInSummary}
`;

  if (jobVacancy) {
    prompt += `
TARGET JOB:
- Title: ${jobVacancy.title}
${jobVacancy.company ? `- Company: ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `- Industry: ${jobVacancy.industry}` : ''}
- Key requirements: ${jobVacancy.keywords.slice(0, 10).join(', ')}
${jobVacancy.description ? `- Job description excerpt: ${jobVacancy.description.slice(0, 500)}...` : ''}
`;

    // Company analysis varies by creativity level
    if (creativityLevel === 'conservative' || creativityLevel === 'balanced') {
      prompt += `
COMPANY ANALYSIS TASK:
Based on the company name "${jobVacancy.company || 'Unknown'}" and industry "${jobVacancy.industry || 'Unknown'}":
1. Consider what type of company this is (startup, corporate, consulting, tech, finance, creative, government, etc.)
2. Think about their likely brand values and culture
3. Consider what style of CV would impress their hiring managers
4. If you're 100% CERTAIN about the company's brand colors, use them to make the CV look like company marketing material

Style guidance by company type:
- Big Tech (Google, Amazon, Microsoft, etc.): Modern, clean, innovative feel
- Consulting/Professional Services: Conservative, executive, structured
- Startups/Scale-ups: Dynamic, bold, shows personality
- Banks/Finance: Traditional, trustworthy, professional
- Healthcare/Pharma: Clean, professional, approachable
- Creative/Marketing/Design agencies: Show design sense, stand out
- Government/Public sector: Conservative, accessible, clear
- Manufacturing/Industrial: Professional, structured, reliable
`;
    } else if (creativityLevel === 'creative') {
      prompt += `
DESIGN INSPIRATION:
The industry is "${jobVacancy.industry || 'Unknown'}" and the company is "${jobVacancy.company || 'Unknown'}".
Use this as INSPIRATION, not as a constraint. Be creative with the visual style while keeping it relevant.
If you're 100% CERTAIN about the company's brand colors, incorporate them boldly.
Otherwise, create a striking palette that fits the industry vibe.
`;
    } else {
      // experimental
      prompt += `
DESIGN CONTEXT (for inspiration only — your creative choices take priority):
Industry: "${jobVacancy.industry || 'Unknown'}", Company: "${jobVacancy.company || 'Unknown'}".
Use the industry/company only as loose inspiration for color direction and decoration themes.
Your primary goal is to create something VISUALLY STRIKING and UNIQUE.
Don't play it safe — make bold choices with layout, typography, and color.
`;
    }
  }

  if (userPreferences) {
    prompt += `
USER PREFERENCES:
${userPreferences}
`;
  }

  // Closing instructions vary by creativity level
  if (creativityLevel === 'experimental') {
    prompt += `
Generate design tokens that:
1. Look VISUALLY UNIQUE — this CV should stand out from every other CV
2. Make BOLD choices: try sidebar layouts, unusual font pairings, striking colors
3. Use the extended styling tokens (accentStyle, borderRadius, nameStyle, skillTagStyle, pageBackground) — don't leave them at defaults
4. Will render well in both screen preview and PDF print
5. Use colors that are VIBRANT and unexpected — avoid generic blue/gray

IMPORTANT: Prioritize visual impact and uniqueness over convention.
This is experimental mode — the user WANTS something that looks different!`;
  } else if (creativityLevel === 'creative') {
    prompt += `
Generate design tokens that:
1. Are visually DISTINCTIVE — this CV should look noticeably different from a standard template
2. Use creative combinations of header styles, section styles, and typography
3. Consider using extended styling tokens (accentStyle, borderRadius, nameStyle, skillTagStyle) for extra personality
4. Will render well in both screen preview and PDF print
5. Use colors that pop and create visual interest

IMPORTANT: Be creative! The user chose creative mode because they want something with personality.`;
  } else {
    prompt += `
Generate design tokens that:
1. Match what this specific company and industry would appreciate
2. Reflect the company's likely culture and values
3. Would impress a hiring manager at this organization
4. Are visually appealing and professional
5. Will render well in both screen preview and PDF print
6. Use colors that work well together and have proper contrast

IMPORTANT: Adapt the style specifically for "${jobVacancy?.company || 'the target company'}"!
Think about what kind of candidate they want to see - and design accordingly.`;
  }

  return prompt;
}

// ============ Main Generation Function ============

export interface StyleGenerationV2Result {
  tokens: CVDesignTokens;
  usage: TokenUsage;
}

export async function generateDesignTokens(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced',
  hasPhoto: boolean = false,
): Promise<StyleGenerationV2Result> {
  const temperature = temperatureMap[creativityLevel];

  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  const systemPrompt = buildSystemPrompt(creativityLevel, hasPhoto);
  const userPrompt = buildUserPrompt(linkedInSummary, jobVacancy, userPreferences, creativityLevel);

  try {
    console.log(`[Style Gen] Starting LLM call: creativity=${creativityLevel}, hasPhoto=${hasPhoto}, temp=${temperature}`);

    // Select schema based on creativity level
    // Creative and experimental both get layout/sidebar support
    const schema = creativityLevel === 'experimental'
      ? experimentalTokensSchema
      : creativityLevel === 'creative'
        ? creativeTokensSchema
        : designTokensSchema;

    console.log(`[Style Gen] Using schema: ${creativityLevel === 'experimental' ? 'experimental' : creativityLevel === 'creative' ? 'creative' : 'base'}`);

    const result = await withRetry(() =>
      generateObject({
        model: aiProvider(modelId),
        schema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature,
      })
    );

    console.log(`[Style Gen] LLM returned:`, JSON.stringify(result.object, null, 2));

    // Validate and fix the generated tokens
    const tokens = validateAndFixTokens(result.object as CVDesignTokens, creativityLevel);

    console.log(`[Style Gen] After validation: theme=${tokens.themeBase}, header=${tokens.headerVariant}, photo=${tokens.showPhoto}, primary=${tokens.colors.primary}, decorationTheme=${tokens.decorationTheme || 'none'}, customDecorations=${tokens.customDecorations?.length || 0}`);

    // Extract usage (Vercel AI SDK uses inputTokens/outputTokens)
    const usage: TokenUsage = {
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
    };

    return { tokens, usage };
  } catch (error) {
    console.error('[Style Gen] LLM FAILED! Using fallback tokens. Error:', error);

    // Return fallback tokens based on creativity level
    return {
      tokens: getFallbackTokens(creativityLevel, jobVacancy?.industry),
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}

// ============ Validation & Fixing ============

function validateAndFixTokens(
  tokens: CVDesignTokens,
  creativityLevel: StyleCreativityLevel
): CVDesignTokens {
  const constraints = creativityConstraints[creativityLevel];

  // Validate theme is allowed for creativity level
  if (!constraints.allowedThemes.includes(tokens.themeBase)) {
    tokens.themeBase = constraints.allowedThemes[0];
  }

  // Validate font pairing
  if (!constraints.allowedFontPairings.includes(tokens.fontPairing)) {
    tokens.fontPairing = constraints.allowedFontPairings[0];
  }

  // Validate header variant
  const allowedHeaders = constraints.allowedHeaderVariants as readonly string[];
  if (!allowedHeaders.includes(tokens.headerVariant)) {
    tokens.headerVariant = constraints.allowedHeaderVariants[0];
  }

  // Validate section style
  const allowedSections = constraints.allowedSectionStyles as readonly string[];
  if (!allowedSections.includes(tokens.sectionStyle)) {
    tokens.sectionStyle = constraints.allowedSectionStyles[0];
  }

  // Validate decorations - IMPORTANT: enforce based on creativity level
  const allowedDecorations = constraints.allowedDecorations as readonly string[];
  if (!tokens.decorations || !allowedDecorations.includes(tokens.decorations)) {
    // Use the default decorations for this creativity level
    tokens.decorations = constraints.defaultDecorations;
    console.log(`[Style Gen] Decorations set to ${tokens.decorations} for ${creativityLevel} mode`);
  }

  // For creative and experimental modes, ensure at least some decorations
  // Creative: force to 'moderate' (its default)
  // Experimental: allow any level except 'none' — at least 'minimal' for visual richness
  if (creativityLevel === 'creative' && tokens.decorations === 'none') {
    tokens.decorations = constraints.defaultDecorations;
    console.log(`[Style Gen] Forcing decorations to ${tokens.decorations} for creative mode (was 'none')`);
  }
  if (creativityLevel === 'experimental' && tokens.decorations === 'none') {
    tokens.decorations = 'minimal';
    console.log(`[Style Gen] Bumping decorations to 'minimal' for experimental mode (was 'none')`);
  }

  // Validate decorationTheme for creative and experimental modes
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const validThemes = ['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract'];
    if (!tokens.decorationTheme || !validThemes.includes(tokens.decorationTheme)) {
      // Default to 'abstract' if not set or invalid
      tokens.decorationTheme = 'abstract';
      console.log(`[Style Gen] Setting default decorationTheme to 'abstract' for ${creativityLevel} mode`);
    }
  }

  // Validate customDecorations for experimental mode
  if (creativityLevel === 'experimental') {
    if (!tokens.customDecorations || tokens.customDecorations.length === 0) {
      console.log(`[Style Gen] No customDecorations provided for experimental mode`);
    } else {
      // Validate each custom decoration
      tokens.customDecorations = tokens.customDecorations
        .filter(d => d.name && d.description && d.placement && d.size && d.quantity)
        .map(d => ({
          name: d.name,
          description: d.description,
          placement: ['corner', 'edge', 'scattered'].includes(d.placement) ? d.placement : 'corner',
          size: ['small', 'medium', 'large'].includes(d.size) ? d.size : 'medium',
          quantity: Math.min(Math.max(d.quantity, 1), 5),
        }));
      console.log(`[Style Gen] Validated ${tokens.customDecorations.length} customDecorations`);
    }
  }

  // Validate contactLayout - default to single-row if not set or invalid
  const validContactLayouts = ['single-row', 'double-row', 'single-column', 'double-column'];
  if (!tokens.contactLayout || !validContactLayouts.includes(tokens.contactLayout)) {
    tokens.contactLayout = 'single-row';
  }

  // Validate new optional tokens against creativity constraints
  const allowedLayouts = constraints.allowedLayouts as readonly string[];
  if (tokens.layout && !allowedLayouts.includes(tokens.layout)) {
    tokens.layout = undefined; // Falls back to single-column in HTML generator
  }

  const allowedBorderRadius = constraints.allowedBorderRadius as readonly string[];
  if (tokens.borderRadius && !allowedBorderRadius.includes(tokens.borderRadius)) {
    tokens.borderRadius = undefined;
  }

  const allowedAccentStyles = constraints.allowedAccentStyles as readonly string[];
  if (tokens.accentStyle && !allowedAccentStyles.includes(tokens.accentStyle)) {
    tokens.accentStyle = undefined;
  }

  const allowedNameStyles = constraints.allowedNameStyles as readonly string[];
  if (tokens.nameStyle && !allowedNameStyles.includes(tokens.nameStyle)) {
    tokens.nameStyle = undefined;
  }

  const allowedSkillTagStyles = constraints.allowedSkillTagStyles as readonly string[];
  if (tokens.skillTagStyle && !allowedSkillTagStyles.includes(tokens.skillTagStyle)) {
    tokens.skillTagStyle = undefined;
  }

  // === 1A: Block dangerous token combinations ===

  // Sidebar + spacious + large = too narrow for main content
  const hasSidebar = tokens.layout === 'sidebar-left' || tokens.layout === 'sidebar-right';
  if (hasSidebar) {
    if (tokens.spacing === 'spacious' && tokens.scale === 'large') {
      tokens.spacing = 'comfortable';
      tokens.scale = 'medium';
      console.log('[Style Gen] Downgraded spacious+large to comfortable+medium for sidebar layout');
    } else if (tokens.spacing === 'spacious') {
      tokens.spacing = 'comfortable';
      console.log('[Style Gen] Downgraded spacious to comfortable for sidebar layout');
    } else if (tokens.scale === 'large') {
      tokens.scale = 'medium';
      console.log('[Style Gen] Downgraded large to medium for sidebar layout');
    }
  }

  // Banner full-bleed + sidebar = conflicting margins
  if (tokens.headerFullBleed && hasSidebar) {
    tokens.headerFullBleed = false;
    console.log('[Style Gen] Disabled headerFullBleed — conflicts with sidebar layout');
  }

  // Long-form content should never go in the narrow sidebar
  if (tokens.sidebarSections && tokens.sidebarSections.length > 0) {
    const heavySections = ['experience', 'summary', 'education'];
    const filtered = tokens.sidebarSections.filter(s => !heavySections.includes(s));
    if (filtered.length !== tokens.sidebarSections.length) {
      console.log(`[Style Gen] Removed heavy sections from sidebar: ${tokens.sidebarSections.filter(s => heavySections.includes(s)).join(', ')}`);
      tokens.sidebarSections = filtered.length > 0 ? filtered : ['skills', 'languages', 'certifications'];
    }
  }

  // Validate pageBackground: must be very light (luminance > 0.85)
  if (tokens.pageBackground) {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(tokens.pageBackground)) {
      tokens.pageBackground = undefined;
    } else {
      const luminance = getRelativeLuminance(tokens.pageBackground);
      if (luminance < 0.85) {
        console.log(`[Style Gen] pageBackground ${tokens.pageBackground} too dark (luminance ${luminance.toFixed(2)}), resetting to white`);
        tokens.pageBackground = undefined;
      }
    }
  }

  // Validate sidebarSections
  if (tokens.sidebarSections) {
    const validSections = ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'];
    tokens.sidebarSections = tokens.sidebarSections.filter(s => validSections.includes(s));
    if (tokens.sidebarSections.length === 0) {
      tokens.sidebarSections = undefined;
    }
  }

  // Validate experienceDescriptionFormat - default to bullets if not set or invalid
  const validDescriptionFormats = ['bullets', 'paragraph'];
  if (!tokens.experienceDescriptionFormat || !validDescriptionFormats.includes(tokens.experienceDescriptionFormat)) {
    tokens.experienceDescriptionFormat = 'bullets';
  }

  // Validate headerGradient - default to none if not set or invalid
  const validGradients = ['none', 'subtle', 'radial'];
  if (!tokens.headerGradient || !validGradients.includes(tokens.headerGradient)) {
    tokens.headerGradient = 'none';
  }

  // Validate colors are proper hex codes
  tokens.colors = validateColors(tokens.colors);

  // Validate and fix color contrast issues
  const contrastResult = validateAndFixColorContrast(tokens.colors, tokens.headerVariant);
  tokens.colors = contrastResult.colors;

  // Log any contrast fixes for debugging
  if (contrastResult.fixes.length > 0) {
    console.log(`[Style Gen] Color contrast fixes applied:`, contrastResult.fixes);
  }

  // Ensure section order includes all standard sections
  tokens.sectionOrder = validateSectionOrder(tokens.sectionOrder);

  // === 2C: Anti-saai validation — ensure enough variety for creative/experimental ===
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const interestingCount = countInterestingChoices(tokens);
    const minimum = creativityLevel === 'experimental' ? 5 : 3;

    if (interestingCount < minimum) {
      console.log(`[Style Gen] Only ${interestingCount} interesting choices for ${creativityLevel} (need ${minimum}), applying variety boosts`);
      applyVarietyBoosts(tokens, minimum - interestingCount, creativityLevel);
    }
  }

  return tokens;
}

function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function validateColors(colors: CVDesignTokens['colors']): CVDesignTokens['colors'] {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  const defaults = {
    primary: '#1a365d',
    secondary: '#f7fafc',
    accent: '#2b6cb0',
    text: '#2d3748',
    muted: '#718096',
  };

  return {
    primary: hexRegex.test(colors.primary) ? colors.primary : defaults.primary,
    secondary: hexRegex.test(colors.secondary) ? colors.secondary : defaults.secondary,
    accent: hexRegex.test(colors.accent) ? colors.accent : defaults.accent,
    text: hexRegex.test(colors.text) ? colors.text : defaults.text,
    muted: hexRegex.test(colors.muted) ? colors.muted : defaults.muted,
  };
}

function validateSectionOrder(order: string[]): string[] {
  const allSections = ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'];

  // Start with provided order, filtering to valid sections
  const validOrder = order.filter(s => allSections.includes(s));

  // Add any missing sections at the end
  for (const section of allSections) {
    if (!validOrder.includes(section)) {
      validOrder.push(section);
    }
  }

  return validOrder;
}

// ============ Variety Helpers ============

/**
 * Count how many "interesting" (non-default) choices are in the tokens.
 * Used to ensure creative/experimental modes look sufficiently different.
 */
function countInterestingChoices(tokens: CVDesignTokens): number {
  let count = 0;

  // Non-boring font pairing
  if (!['inter-inter', 'roboto-roboto', 'lato-lato'].includes(tokens.fontPairing)) count++;
  // Non-simple header
  if (tokens.headerVariant !== 'simple') count++;
  // Non-default section style
  if (!['clean', 'underlined'].includes(tokens.sectionStyle)) count++;
  // Accent style set
  if (tokens.accentStyle && tokens.accentStyle !== 'none') count++;
  // Name style set
  if (tokens.nameStyle && tokens.nameStyle !== 'normal') count++;
  // Skill tag style set
  if (tokens.skillTagStyle && tokens.skillTagStyle !== 'filled') count++;
  // Non-basic border radius
  if (tokens.borderRadius && !['none', 'small'].includes(tokens.borderRadius)) count++;
  // Page background set
  if (tokens.pageBackground) count++;
  // Sidebar layout
  if (tokens.layout === 'sidebar-left' || tokens.layout === 'sidebar-right') count++;
  // Icons enabled
  if (tokens.useIcons) count++;
  // Header gradient
  if (tokens.headerGradient && tokens.headerGradient !== 'none') count++;
  // Non-default contact layout
  if (tokens.contactLayout && tokens.contactLayout !== 'single-row') count++;

  return count;
}

/**
 * Apply variety boosts to make tokens more visually interesting.
 * Upgrades the most impactful tokens to non-default values.
 */
function applyVarietyBoosts(tokens: CVDesignTokens, needed: number, level: StyleCreativityLevel): void {
  let applied = 0;

  // Priority order: most visual impact first
  if (applied < needed && tokens.sectionStyle === 'clean') {
    tokens.sectionStyle = level === 'experimental' ? 'card' : 'accent-left';
    applied++;
    console.log(`[Style Gen] Variety boost: sectionStyle → ${tokens.sectionStyle}`);
  }

  if (applied < needed && tokens.headerVariant === 'simple') {
    tokens.headerVariant = level === 'experimental' ? 'banner' : 'split';
    applied++;
    console.log(`[Style Gen] Variety boost: headerVariant → ${tokens.headerVariant}`);
  }

  if (applied < needed && (!tokens.accentStyle || tokens.accentStyle === 'none')) {
    tokens.accentStyle = 'border-left';
    applied++;
    console.log('[Style Gen] Variety boost: accentStyle → border-left');
  }

  if (applied < needed && (!tokens.nameStyle || tokens.nameStyle === 'normal')) {
    tokens.nameStyle = 'uppercase';
    applied++;
    console.log('[Style Gen] Variety boost: nameStyle → uppercase');
  }

  if (applied < needed && (!tokens.skillTagStyle || tokens.skillTagStyle === 'filled')) {
    tokens.skillTagStyle = level === 'experimental' ? 'pill' : 'outlined';
    applied++;
    console.log(`[Style Gen] Variety boost: skillTagStyle → ${tokens.skillTagStyle}`);
  }

  if (applied < needed && (!tokens.borderRadius || ['none', 'small'].includes(tokens.borderRadius))) {
    tokens.borderRadius = level === 'experimental' ? 'large' : 'medium';
    applied++;
    console.log(`[Style Gen] Variety boost: borderRadius → ${tokens.borderRadius}`);
  }

  if (applied < needed && !tokens.useIcons) {
    tokens.useIcons = true;
    applied++;
    console.log('[Style Gen] Variety boost: useIcons → true');
  }

  if (applied < needed && (!tokens.headerGradient || tokens.headerGradient === 'none')) {
    tokens.headerGradient = 'subtle';
    applied++;
    console.log('[Style Gen] Variety boost: headerGradient → subtle');
  }
}

// ============ Fallback Tokens ============

function getFallbackTokens(
  creativityLevel: StyleCreativityLevel,
  industry?: string
): CVDesignTokens {
  // Experimental mode gets bold fallback with abundant decorations
  // Rotate colors based on industry to add variety
  if (creativityLevel === 'experimental') {
    // Pick colors based on industry for variety
    const industryColors: Record<string, { primary: string; secondary: string; accent: string }> = {
      technology: { primary: '#0891b2', secondary: '#ecfeff', accent: '#f59e0b' },  // Teal
      finance: { primary: '#1e3a5f', secondary: '#f0f9ff', accent: '#10b981' },      // Deep blue
      creative: { primary: '#be185d', secondary: '#fdf2f8', accent: '#06b6d4' },     // Magenta
      healthcare: { primary: '#059669', secondary: '#ecfdf5', accent: '#8b5cf6' },   // Emerald
      consulting: { primary: '#4338ca', secondary: '#eef2ff', accent: '#f59e0b' },   // Indigo
      default: { primary: '#dc2626', secondary: '#fef2f2', accent: '#0891b2' },      // Red
    };
    const colors = industryColors[industry || ''] || industryColors.default;

    // Map industry to decoration theme
    const industryToTheme: Record<string, 'geometric' | 'organic' | 'minimal' | 'tech' | 'creative' | 'abstract'> = {
      technology: 'tech',
      finance: 'minimal',
      creative: 'creative',
      healthcare: 'organic',
      consulting: 'minimal',
    };
    const decorationTheme = industryToTheme[industry || ''] || 'abstract';

    return {
      styleName: 'Bold Experimental',
      styleRationale: 'A bold, colorful design that stands out.',
      industryFit: industry || 'technology',
      themeBase: 'bold',
      colors: {
        ...colors,
        text: '#1f2937',
        muted: '#6b7280',
      },
      fontPairing: 'poppins-nunito',
      scale: 'medium',
      spacing: 'comfortable',
      headerVariant: 'banner',
      sectionStyle: 'accent-left',
      skillsDisplay: 'tags',
      experienceDescriptionFormat: 'bullets',
      contactLayout: 'double-column',
      headerGradient: 'radial',
      showPhoto: true,
      useIcons: true,
      roundedCorners: true,
      headerFullBleed: true,
      decorations: 'abundant',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
      layout: 'sidebar-right',
      borderRadius: 'pill',
      accentStyle: 'border-left',
      nameStyle: 'uppercase',
      skillTagStyle: 'pill',
    };
  }

  // Creative mode gets modern fallback with moderate decorations
  if (creativityLevel === 'creative') {
    const defaults = themeDefaults['creative'];
    // Map industry to decoration theme
    const industryToTheme: Record<string, 'geometric' | 'organic' | 'minimal' | 'tech' | 'creative' | 'abstract'> = {
      technology: 'tech',
      finance: 'minimal',
      creative: 'creative',
      healthcare: 'organic',
      consulting: 'minimal',
    };
    const decorationTheme = industryToTheme[industry || ''] || 'creative';

    return {
      styleName: 'Creative Modern',
      styleRationale: 'A creative design with visual impact.',
      industryFit: industry || 'creative',
      themeBase: 'creative',
      colors: defaults.suggestedColors,
      fontPairing: defaults.fontPairing,
      scale: 'medium',
      spacing: 'comfortable',
      headerVariant: 'banner',
      sectionStyle: 'card',
      skillsDisplay: 'tags',
      experienceDescriptionFormat: 'bullets',
      contactLayout: 'double-row',
      headerGradient: 'subtle',
      showPhoto: true,
      useIcons: true,
      roundedCorners: true,
      headerFullBleed: true,
      decorations: 'moderate',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
      borderRadius: 'medium',
      accentStyle: 'background',
      skillTagStyle: 'outlined',
    };
  }

  // Balanced mode gets minimal decorations
  if (creativityLevel === 'balanced') {
    const defaults = themeDefaults['modern'];
    return {
      styleName: 'Modern Professional',
      styleRationale: 'A modern design that balances style with professionalism.',
      industryFit: industry || 'general',
      themeBase: 'modern',
      colors: defaults.suggestedColors,
      fontPairing: defaults.fontPairing,
      scale: 'medium',
      spacing: 'comfortable',
      headerVariant: defaults.headerVariant,
      sectionStyle: defaults.sectionStyle,
      skillsDisplay: defaults.skillsDisplay,
      experienceDescriptionFormat: 'bullets',
      contactLayout: 'single-row',
      headerGradient: 'none',
      showPhoto: false,
      useIcons: defaults.useIcons,
      roundedCorners: defaults.roundedCorners,
      headerFullBleed: false,
      decorations: 'minimal',
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
    };
  }

  // Default fallback for conservative - no decorations
  const defaults = themeDefaults['professional'];
  return {
    styleName: 'Professional Modern',
    styleRationale: 'A clean, professional design that works well across industries.',
    industryFit: industry || 'general',
    themeBase: 'professional',
    colors: defaults.suggestedColors,
    fontPairing: defaults.fontPairing,
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: defaults.headerVariant,
    sectionStyle: defaults.sectionStyle,
    skillsDisplay: defaults.skillsDisplay,
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: false,
    useIcons: defaults.useIcons,
    roundedCorners: defaults.roundedCorners,
    headerFullBleed: false,
    decorations: 'none',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
  };
}

// ============ LinkedIn Summary Helper ============

/**
 * Create a concise summary of LinkedIn data for the LLM prompt.
 * Reused from the original style-generator for compatibility.
 */
export function createLinkedInSummaryV2(linkedIn: {
  fullName: string;
  headline: string | null;
  location: string | null;
  about: string | null;
  experience: Array<{ title: string; company: string; isCurrentRole: boolean }>;
  education: Array<{ school: string; degree: string | null; fieldOfStudy: string | null }>;
  skills: Array<{ name: string }>;
}): string {
  const lines: string[] = [];

  lines.push(`Name: ${linkedIn.fullName}`);

  if (linkedIn.headline) {
    lines.push(`Headline: ${linkedIn.headline}`);
  }

  if (linkedIn.location) {
    lines.push(`Location: ${linkedIn.location}`);
  }

  if (linkedIn.about) {
    // Truncate long about sections
    const about = linkedIn.about.length > 300
      ? linkedIn.about.slice(0, 300) + '...'
      : linkedIn.about;
    lines.push(`About: ${about}`);
  }

  // Current/recent roles
  const recentRoles = linkedIn.experience.slice(0, 3);
  if (recentRoles.length > 0) {
    lines.push('Recent Experience:');
    recentRoles.forEach(exp => {
      const current = exp.isCurrentRole ? ' (current)' : '';
      lines.push(`  - ${exp.title} at ${exp.company}${current}`);
    });
  }

  // Education
  const education = linkedIn.education.slice(0, 2);
  if (education.length > 0) {
    lines.push('Education:');
    education.forEach(edu => {
      const degree = edu.degree ? `${edu.degree}` : '';
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
      lines.push(`  - ${edu.school}${degree ? `: ${degree}` : ''}${field}`);
    });
  }

  // Top skills
  const topSkills = linkedIn.skills.slice(0, 10).map(s => s.name);
  if (topSkills.length > 0) {
    lines.push(`Key Skills: ${topSkills.join(', ')}`);
  }

  return lines.join('\n');
}
