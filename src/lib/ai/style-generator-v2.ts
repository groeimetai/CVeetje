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
  ]).describe('Font combination: heading font + body font'),

  scale: z.enum(['small', 'medium', 'large'])
    .describe('Typography scale: small for dense content, large for impact'),

  // Layout
  spacing: z.enum(['compact', 'comfortable', 'spacious'])
    .describe('Overall spacing density'),

  // Component variants
  headerVariant: z.enum(['simple', 'accented', 'banner', 'split'])
    .describe('Header layout: simple (clean), accented (left border), banner (full-width color), split (name left, contact right)'),

  sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline'])
    .describe('Section styling: clean (minimal), underlined (accent under title), boxed (background), timeline (vertical line)'),

  skillsDisplay: z.enum(['tags', 'list', 'compact'])
    .describe('How skills are displayed: tags (pills), list (bulleted columns), compact (inline with separators)'),

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
});

// Extended schema for creative mode - includes decorationTheme
const creativeTokensSchema = designTokensSchema.extend({
  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract'])
    .describe(`Industry-based decoration theme:
    - geometric: IT/Tech/Engineering - circuits, hexagons, triangles, grid patterns
    - organic: Healthcare/Pharma/Nature - soft curves, leaves, waves, natural shapes
    - minimal: Finance/Consulting/Legal - subtle lines, corners, clean accents
    - tech: Software/Data/AI - code brackets, nodes, digital patterns
    - creative: Design/Marketing/Art - bold abstract shapes, splashes, dynamic forms
    - abstract: General/Versatile - balanced mix of geometric patterns`),
});

// Extended schema for experimental mode - includes custom decorations
const experimentalTokensSchema = creativeTokensSchema.extend({
  customDecorations: z.array(z.object({
    name: z.string().describe('Unique name for this decoration, e.g., "code-bracket", "data-node", "growth-arrow"'),
    description: z.string().describe('Visual description: what shape/symbol this represents (e.g., "curly brace like { }", "connected dots forming a network node", "upward arrow with bar chart")'),
    placement: z.enum(['corner', 'edge', 'scattered']).describe('Where to place: corner (corners of page), edge (along margins), scattered (random positions)'),
    size: z.enum(['small', 'medium', 'large']).describe('Size of decoration elements'),
    quantity: z.number().min(1).max(5).describe('How many of this decoration to place (1-5)'),
  })).min(2).max(5).describe(`Custom decorations that reflect the job/industry. Create 2-5 unique decorations.
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
  conservative: 0.3,
  balanced: 0.5,
  creative: 0.7,
  experimental: 0.9,
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
- Go creative! Use bold colors and interesting font combos
- Headers: banner or split for visual impact
- sectionStyle: timeline or boxed
- Colors: vibrant colors inspired by the company's brand - make them pop!
- showPhoto: ${hasPhoto ? 'true' : 'false'}
- useIcons: true
- roundedCorners: true
- decorations: MUST be 'moderate' (adds noticeable background shapes for visual appeal - this is creative mode!)
- contactLayout: 'double-row' or 'double-column' for visual balance
- headerGradient: 'subtle' (elegant gradient adds sophistication)

DECORATION THEME (Required for creative mode):
Choose a decorationTheme that matches the target industry/job:
- 'geometric': Best for IT, Tech, Engineering - circuits, hexagons, grid patterns
- 'organic': Best for Healthcare, Pharma, Nature - soft curves, leaves, waves
- 'minimal': Best for Finance, Consulting, Legal - subtle lines, clean accents
- 'tech': Best for Software, Data, AI - code brackets, nodes, digital patterns
- 'creative': Best for Design, Marketing, Art - bold shapes, splashes
- 'abstract': General use - balanced geometric patterns
` : ''}
${creativityLevel === 'experimental' ? `
*** EXPERIMENTAL MODE - MAXIMUM VISUAL IMPACT ***

REQUIRED settings for experimental:
- themeBase: MUST be 'bold' or 'creative'
- headerVariant: MUST be 'banner' (full-width colored header)
- primary: MUST be a DARK, striking color for the banner background
  * Use company brand colors ONLY if you're 100% certain about them
  * If you don't know the company's exact brand colors, DO NOT GUESS
  * For unknown brands, create a bold professional palette fitting the industry
- accent: MUST be vibrant and contrast with primary, complementing the brand
- secondary: Light tinted version of primary
- sectionStyle: MUST be 'timeline' for visual storytelling
- fontPairing: MUST be 'playfair-inter' or 'poppins-nunito' for personality
- showPhoto: ${hasPhoto ? 'MUST be true' : 'false'}
- useIcons: MUST be true
- roundedCorners: true
- spacing: 'comfortable' or 'spacious'
- decorations: MUST be 'abundant' (bold background shapes for maximum visual impact)
- contactLayout: 'double-column' for modern grid layout, or 'double-row' for elegant spacing
- headerGradient: 'radial' for luxurious glow effect, or 'subtle' for elegant depth

DECORATION THEME (Required):
Choose a decorationTheme matching the industry (same as creative mode).

CUSTOM DECORATIONS (Required for experimental mode):
Generate 2-5 unique customDecorations tailored to the JOB and INDUSTRY.
These should be ABSTRACT shapes that SUBTLY represent the field - NOT literal icons!

Examples by profession:
- Software Developer: code-bracket (curly brace shape), terminal-cursor (blinking line), git-branch (forking lines)
- Data Scientist: scatter-dots (clustered points), neural-node (connected circles), data-flow (flowing lines)
- Marketing Manager: trend-arrow (upward curve), speech-bubble (rounded shape), target-ring (concentric circles)
- Finance Analyst: growth-chart (rising bars), pie-segment (curved wedge), currency-wave (wavy line)
- Healthcare Professional: pulse-line (heartbeat wave), molecule (hexagon with dots), care-plus (soft cross)
- Designer: grid-dots (dot matrix), shape-morph (abstract blob), palette-swatches (overlapping rectangles)

IMPORTANT: Make them SUBTLE and ABSTRACT, not literal clipart! They should enhance, not distract.

COLOR SELECTION APPROACH:
1. Only use brand colors if you're 100% CERTAIN (don't guess!)
2. If uncertain about brand, create a bold palette that fits the industry
3. The CV should look like professional company marketing material

This CV should be BOLD, COLORFUL, and STAND OUT!
DO NOT use gray or black as primary - use VIBRANT colors!
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
  userPreferences?: string
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
  }

  if (userPreferences) {
    prompt += `
USER PREFERENCES:
${userPreferences}
`;
  }

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
  const userPrompt = buildUserPrompt(linkedInSummary, jobVacancy, userPreferences);

  try {
    console.log(`[Style Gen] Starting LLM call: creativity=${creativityLevel}, hasPhoto=${hasPhoto}, temp=${temperature}`);

    // Select schema based on creativity level
    const schema = creativityLevel === 'experimental'
      ? experimentalTokensSchema
      : creativityLevel === 'creative'
        ? creativeTokensSchema
        : designTokensSchema;

    console.log(`[Style Gen] Using schema: ${creativityLevel === 'experimental' ? 'experimental' : creativityLevel === 'creative' ? 'creative' : 'base'}`);

    const result = await generateObject({
      model: aiProvider(modelId),
      schema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature,
    });

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

  // For creative and experimental modes, force decorations (don't allow 'none')
  if ((creativityLevel === 'creative' || creativityLevel === 'experimental') && tokens.decorations === 'none') {
    tokens.decorations = constraints.defaultDecorations;
    console.log(`[Style Gen] Forcing decorations to ${tokens.decorations} for ${creativityLevel} mode (was 'none')`);
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

  return tokens;
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
      sectionStyle: 'timeline',
      skillsDisplay: 'tags',
      contactLayout: 'double-column',
      headerGradient: 'radial',
      showPhoto: true,
      useIcons: true,
      roundedCorners: true,
      headerFullBleed: true,
      decorations: 'abundant',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
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
      sectionStyle: 'boxed',
      skillsDisplay: 'tags',
      contactLayout: 'double-row',
      headerGradient: 'subtle',
      showPhoto: true,
      useIcons: true,
      roundedCorners: true,
      headerFullBleed: true,
      decorations: 'moderate',
      decorationTheme,
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
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
