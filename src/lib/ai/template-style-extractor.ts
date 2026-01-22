/**
 * Template Style Extractor
 *
 * Uses AI Vision to analyze template images and extract design tokens.
 * The extracted tokens are compatible with the existing CVDesignTokens type.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import type { LLMProvider, TokenUsage } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { validateAndFixColorContrast } from '@/lib/cv/templates/color-utils';

// ============ Zod Schema for Template Analysis ============

const templateStyleSchema = z.object({
  // Metadata
  styleName: z.string().describe('A descriptive name for this style based on what you see, e.g., "Modern Sidebar Blue" or "Classic Executive"'),
  styleRationale: z.string().describe('Brief explanation of the visual characteristics you identified (2-3 sentences)'),
  industryFit: z.string().describe('The industry this style would be best suited for based on its appearance, e.g., "technology", "finance", "creative"'),

  // Theme
  themeBase: z.enum(['professional', 'modern', 'creative', 'minimal', 'bold'])
    .describe('The overall theme that best matches the template: professional (conservative), modern (clean), creative (artistic), minimal (simple), bold (impactful)'),

  // Colors - Extract from the template
  colors: z.object({
    primary: z.string().describe('Primary color used for headings/name/key elements (hex code like #1a365d). Look for the most prominent non-black color.'),
    secondary: z.string().describe('Secondary/background accent color (hex code). Often a lighter or tinted version of primary. Should be very light.'),
    accent: z.string().describe('Accent color for highlights, links, decorations (hex code). A complementary or contrasting color.'),
    text: z.string().describe('Main body text color (hex code like #333333). Usually dark gray or black.'),
    muted: z.string().describe('Muted text for dates, labels (hex code like #666666). Lighter than main text.'),
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
  ]).describe(`Choose the font pairing that best matches what you see:
    - inter-inter: Clean, modern, tech-friendly sans-serif
    - playfair-inter: Elegant serif headings with clean body
    - montserrat-open-sans: Strong geometric headings with friendly body
    - raleway-lato: Stylish thin headings with professional body
    - poppins-nunito: Modern rounded geometric, soft feel
    - roboto-roboto: Standard, versatile, neutral
    - lato-lato: Warm, humanist, approachable
    - merriweather-source-sans: Traditional serif with modern sans body`),

  scale: z.enum(['small', 'medium', 'large'])
    .describe('Typography scale based on the font sizes you see: small (compact, dense), medium (standard), large (spacious, impactful)'),

  // Layout
  spacing: z.enum(['compact', 'comfortable', 'spacious'])
    .describe('Overall spacing density: compact (tight), comfortable (balanced), spacious (generous whitespace)'),

  // Component variants
  headerVariant: z.enum(['simple', 'accented', 'banner', 'split'])
    .describe(`Header layout style:
    - simple: Clean, minimal header with no background
    - accented: Header with a left border/accent line
    - banner: Full-width colored background behind name/contact
    - split: Name on left, contact info aligned right`),

  sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline'])
    .describe(`Section heading style:
    - clean: Plain headings, no decoration
    - underlined: Headings with a line/accent below
    - boxed: Sections with background or border
    - timeline: Vertical line connecting items (for experience/education)`),

  skillsDisplay: z.enum(['tags', 'list', 'compact'])
    .describe(`How skills appear to be displayed:
    - tags: Pill/badge style (rounded backgrounds)
    - list: Bulleted or columned list
    - compact: Inline with separators`),

  contactLayout: z.enum(['single-row', 'double-row', 'single-column', 'double-column'])
    .describe(`Contact information layout:
    - single-row: All items in one line with separators
    - double-row: Split across two lines
    - single-column: Vertical stack
    - double-column: Two-column grid`),

  headerGradient: z.enum(['none', 'subtle', 'radial'])
    .describe('Header background effect: none (solid color), subtle (gradient visible), radial (radial glow effect)'),

  // Feature flags
  showPhoto: z.boolean().describe('Does the template have a space for a profile photo?'),
  useIcons: z.boolean().describe('Are icons used for contact info or sections?'),
  roundedCorners: z.boolean().describe('Are rounded corners used on cards, tags, or images?'),
  headerFullBleed: z.boolean().describe('Does the header extend to the page edges (no margins)?'),

  // Decorations
  decorations: z.enum(['none', 'minimal', 'moderate', 'abundant'])
    .describe(`Background decorative elements:
    - none: Clean, no decorations
    - minimal: Subtle lines or shapes
    - moderate: Noticeable decorative elements
    - abundant: Many decorative shapes/patterns`),

  decorationTheme: z.enum(['geometric', 'organic', 'minimal', 'tech', 'creative', 'abstract'])
    .optional()
    .describe(`If decorations are present, what style:
    - geometric: Triangles, hexagons, grid patterns
    - organic: Curves, waves, natural shapes
    - minimal: Simple lines, dots
    - tech: Code-like, digital patterns
    - creative: Bold abstract shapes
    - abstract: Mixed geometric patterns`),

  // Section order
  sectionOrder: z.array(z.string())
    .describe('Order of sections you see in the template. Use: summary, experience, education, skills, languages, certifications'),
});

// ============ System Prompt ============

const SYSTEM_PROMPT = `You are a professional CV/resume design analyst. Your task is to analyze a CV template image and extract its visual design characteristics.

ANALYSIS GUIDELINES:

1. COLOR EXTRACTION:
   - Look for the most prominent non-black color used for headings, name, or accent elements → this is PRIMARY
   - Look for light background colors or tinted areas → this is SECONDARY (should be very light, almost white)
   - Look for highlight colors, links, or decorative elements → this is ACCENT
   - Identify the main body text color → this is TEXT
   - Identify the color used for dates, labels, secondary info → this is MUTED
   - ALL colors MUST be valid hex codes (#RRGGBB format)
   - If you can't determine a color, use sensible defaults (don't leave blank)

2. LAYOUT ANALYSIS:
   - Header: Does it have a full-width colored background (banner)? A left accent line (accented)? Name/contact split (split)? Or plain (simple)?
   - Sections: Are headings underlined? In boxes? Connected by a timeline? Or clean/plain?
   - Spacing: Is content packed tight (compact), balanced (comfortable), or with lots of whitespace (spacious)?

3. TYPOGRAPHY:
   - Are headings serif or sans-serif? Elegant or modern?
   - Is the body text standard sans-serif or something more distinctive?
   - Choose the font pairing that BEST MATCHES what you see

4. FEATURES:
   - Is there a photo placeholder?
   - Are icons used for contact info or section headers?
   - Are corners rounded on elements?
   - Does the header extend to page edges?

5. DECORATIONS:
   - Are there background shapes, patterns, or decorative elements?
   - If so, are they subtle or prominent?
   - What style are they (geometric, organic, tech-like, etc.)?

6. SECTION ORDER:
   - List the sections in the order they appear
   - Use standard names: summary, experience, education, skills, languages, certifications

Be specific and accurate. The extracted tokens will be used to generate a CV in the same style.`;

// ============ Main Extraction Function ============

export interface ExtractStyleResult {
  success: boolean;
  tokens?: CVDesignTokens;
  usage?: TokenUsage;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

/**
 * Extracts design tokens from a template image using AI Vision
 *
 * @param imageBase64 - Base64-encoded PNG image of the template
 * @param provider - The LLM provider to use
 * @param apiKey - API key for the provider
 * @param model - Model to use (must support vision)
 * @returns Extracted CVDesignTokens
 */
export async function extractStyleFromTemplate(
  imageBase64: string,
  provider: LLMProvider,
  apiKey: string,
  model: string
): Promise<ExtractStyleResult> {
  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);

  try {
    console.log('[Template Style] Starting AI Vision analysis...');

    const result = await generateObject({
      model: aiProvider(modelId),
      schema: templateStyleSchema,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:image/png;base64,${imageBase64}`,
            },
            {
              type: 'text',
              text: `Analyze this CV/document template image and extract the visual design characteristics.

Return a JSON object with all the design tokens needed to recreate a CV in this style.

Focus on:
1. The exact colors used (as hex codes)
2. The layout structure
3. Typography style
4. Decorative elements
5. Section organization

Be precise with colors - try to identify the exact hex values where possible.`,
            },
          ],
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    console.log('[Template Style] AI analysis complete:', JSON.stringify(result.object, null, 2));

    // Validate and fix the extracted tokens
    const tokens = validateAndFixExtractedTokens(result.object);

    // Extract usage
    const usage: TokenUsage = {
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
    };

    // Determine confidence based on color validity
    const confidence = assessConfidence(result.object);

    return {
      success: true,
      tokens,
      usage,
      confidence,
    };
  } catch (error) {
    console.error('[Template Style] AI analysis failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze template',
    };
  }
}

// ============ Validation & Fixing ============

function validateAndFixExtractedTokens(
  extracted: z.infer<typeof templateStyleSchema>
): CVDesignTokens {
  // Validate and fix colors
  const colors = validateColors(extracted.colors);

  // Fix color contrast issues
  const contrastResult = validateAndFixColorContrast(colors, extracted.headerVariant);

  if (contrastResult.fixes.length > 0) {
    console.log('[Template Style] Color contrast fixes applied:', contrastResult.fixes);
  }

  // Validate section order
  const sectionOrder = validateSectionOrder(extracted.sectionOrder);

  // Build the final tokens object
  const tokens: CVDesignTokens = {
    styleName: extracted.styleName || 'Custom Template Style',
    styleRationale: extracted.styleRationale || 'Style extracted from uploaded template',
    industryFit: extracted.industryFit || 'general',
    themeBase: extracted.themeBase,
    colors: contrastResult.colors,
    fontPairing: extracted.fontPairing,
    scale: extracted.scale,
    spacing: extracted.spacing,
    headerVariant: extracted.headerVariant,
    sectionStyle: extracted.sectionStyle,
    skillsDisplay: extracted.skillsDisplay,
    experienceDescriptionFormat: 'bullets',
    contactLayout: extracted.contactLayout,
    headerGradient: extracted.headerGradient,
    showPhoto: extracted.showPhoto,
    useIcons: extracted.useIcons,
    roundedCorners: extracted.roundedCorners,
    headerFullBleed: extracted.headerFullBleed,
    decorations: extracted.decorations,
    decorationTheme: extracted.decorationTheme,
    sectionOrder,
  };

  return tokens;
}

function validateColors(colors: {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
}): CVDesignTokens['colors'] {
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

function assessConfidence(extracted: z.infer<typeof templateStyleSchema>): 'high' | 'medium' | 'low' {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  // Check how many colors are valid hex codes
  const colorFields = [
    extracted.colors.primary,
    extracted.colors.secondary,
    extracted.colors.accent,
    extracted.colors.text,
    extracted.colors.muted,
  ];

  const validColors = colorFields.filter(c => hexRegex.test(c)).length;

  // Check if we have meaningful metadata
  const hasGoodMetadata = extracted.styleName && extracted.styleName.length > 5 && extracted.styleRationale && extracted.styleRationale.length > 20;

  if (validColors >= 4 && hasGoodMetadata) {
    return 'high';
  } else if (validColors >= 2) {
    return 'medium';
  } else {
    return 'low';
  }
}

// ============ Helper: Get Default Fallback Tokens ============

export function getTemplateStyleFallbackTokens(): CVDesignTokens {
  return {
    styleName: 'Template Default',
    styleRationale: 'Fallback style when template analysis fails',
    industryFit: 'general',
    themeBase: 'professional',
    colors: {
      primary: '#1a365d',
      secondary: '#f7fafc',
      accent: '#2b6cb0',
      text: '#2d3748',
      muted: '#718096',
    },
    fontPairing: 'inter-inter',
    scale: 'medium',
    spacing: 'comfortable',
    headerVariant: 'simple',
    sectionStyle: 'clean',
    skillsDisplay: 'tags',
    experienceDescriptionFormat: 'bullets',
    contactLayout: 'single-row',
    headerGradient: 'none',
    showPhoto: false,
    useIcons: true,
    roundedCorners: false,
    headerFullBleed: false,
    decorations: 'none',
    sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
  };
}
