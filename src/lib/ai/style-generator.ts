import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, getModelId } from './providers';
import type {
  JobVacancy,
  CVStyleConfig,
  LLMProvider,
  TokenUsage,
  StyleCreativityLevel,
} from '@/types';

// =============================================================================
// PROGRESSIVE SCHEMAS - 6 STEPS: Layout → Header → Typography → Colors → Skills → Details
// Higher creativity levels have MORE output fields
// =============================================================================

// =============================================================================
// STEP 1: LAYOUT SCHEMAS (Structure & spatial organization)
// =============================================================================

const baseLayoutSchema = z.object({
  // === Page Structure ===
  pageMargins: z.enum(['narrow', 'normal', 'wide']).describe('Page margin size - narrow (15mm) for max content, wide (25mm) for breathing room'),
  contentDensity: z.enum(['dense', 'balanced', 'airy']).describe('How tightly packed the content is'),

  // === Section Organization ===
  sectionDivider: z.enum(['none', 'line', 'accent-bar', 'dots', 'gradient-line', 'double-line']),
  sectionSpacing: z.enum(['tight', 'normal', 'relaxed', 'generous']).describe('Vertical space between major sections'),
  sectionOrder: z.array(z.string()).describe('Order of CV sections'),

  // === Item Layout ===
  itemSpacing: z.enum(['compact', 'normal', 'comfortable']).describe('Space between items within a section'),
  datePosition: z.enum(['right-aligned', 'inline', 'above', 'below']).describe('Where dates appear relative to job titles'),
  locationDisplay: z.enum(['with-company', 'with-date', 'separate-line', 'hidden']).describe('How location info is shown'),

  // === Photo Settings ===
  showPhoto: z.boolean(),
  photoPosition: z.enum(['header-left', 'header-right', 'header-center', 'beside-name']).describe('Where the photo appears'),
  photoSize: z.enum(['small', 'medium', 'large']).describe('Photo dimensions: small=60px, medium=80px, large=100px'),
  photoShape: z.enum(['circle', 'rounded-square', 'square']).describe('Shape of the photo container'),

  // === Visual Hierarchy ===
  bulletStyle: z.enum(['disc', 'circle', 'square', 'dash', 'arrow', 'checkmark', 'none']).describe('Style for bullet points'),
  sectionTitlePosition: z.enum(['left', 'center', 'left-with-line']).describe('Alignment of section headers'),
});

const extendedLayoutSchema = baseLayoutSchema.extend({
  // === Advanced Structure ===
  columnLayout: z.enum(['single', 'sidebar-left', 'sidebar-right']).describe('Overall page column structure'),
  sidebarWidth: z.enum(['narrow', 'medium', 'wide']).optional().describe('Width of sidebar if using sidebar layout'),
  sidebarContent: z.array(z.enum(['contact', 'skills', 'languages', 'certifications', 'photo'])).optional().describe('What goes in sidebar'),

  // === Content Flow ===
  experienceLayout: z.enum(['stacked', 'timeline', 'cards']).describe('How experience items are visually structured'),
  educationLayout: z.enum(['stacked', 'compact', 'cards']).describe('How education items are displayed'),

  // === Whitespace Strategy ===
  whitespaceStrategy: z.enum(['minimal', 'balanced', 'generous']).describe('Overall approach to empty space'),
  paragraphSpacing: z.enum(['tight', 'normal', 'relaxed']).describe('Space between paragraphs/highlights'),

  // === Contact Info ===
  contactLayout: z.enum(['single-line', 'two-lines', 'stacked', 'icons-only']).describe('How contact details are arranged'),
  contactPosition: z.enum(['header', 'sidebar', 'footer']).describe('Where contact info appears'),
  showContactIcons: z.boolean().describe('Whether to show icons next to contact info'),
});

const experimentalLayoutSchema = extendedLayoutSchema.extend({
  // === Creative Layouts ===
  asymmetricLayout: z.boolean().describe('Allow asymmetric, non-traditional layouts'),
  overlappingElements: z.boolean().describe('Allow elements to slightly overlap for visual interest'),

  // === Advanced Visual Features ===
  sectionNumbering: z.boolean().describe('Add numbers to section titles (01. Experience, 02. Education)'),
  progressIndicators: z.boolean().describe('Show visual progress/timeline indicators'),

  // === Micro-interactions for PDF ===
  highlightKeywords: z.boolean().describe('Subtly highlight important keywords'),
  pullQuotes: z.boolean().describe('Allow pull-quote style for summary'),

  // === Grid System ===
  useGridSystem: z.boolean().describe('Use a precise grid for alignment'),
  gridColumns: z.enum(['8', '12', '16']).optional().describe('Number of grid columns'),
});

// =============================================================================
// STEP 2: HEADER SCHEMAS (Eyecatcher - dedicated header styling)
// =============================================================================

const baseHeaderSchema = z.object({
  // === Header Structure ===
  headerStyle: z.enum(['centered', 'left-aligned', 'split', 'banner', 'full-width-accent', 'bold-name', 'minimal', 'card']).describe('Overall header layout style'),
  headerAlignment: z.enum(['left', 'center', 'right']).describe('Text alignment within header'),
  headerHeight: z.enum(['compact', 'standard', 'tall', 'auto']).describe('Vertical height of header area'),

  // === Name Styling ===
  nameSizePt: z.number().describe('Font size for name in points (20-36)'),
  nameWeight: z.enum(['normal', 'medium', 'semibold', 'bold', 'extrabold']).describe('Font weight for name'),
  nameTransform: z.enum(['none', 'uppercase', 'capitalize']).describe('Text transformation for name'),

  // === Headline/Title Styling ===
  showHeadline: z.boolean().describe('Whether to show professional headline/title'),
  headlineSizePt: z.number().describe('Font size for headline in points (12-18)'),
  headlineStyle: z.enum(['normal', 'italic', 'muted', 'accent-color']).describe('Visual style for headline'),

  // === Header Accents ===
  headerAccent: z.enum(['none', 'underline', 'side-bar', 'gradient-bar', 'bottom-border', 'top-border', 'double-line']).describe('Decorative accent element'),
  accentThickness: z.enum(['thin', 'medium', 'thick']).describe('Thickness of accent element'),
  accentPosition: z.enum(['below-name', 'below-header', 'left-side', 'full-width']).describe('Position of accent element'),

  // === Contact Display in Header ===
  contactInHeader: z.boolean().describe('Whether to show contact info in header'),
  contactStyle: z.enum(['inline', 'stacked', 'two-columns', 'icons-only']).describe('How contact info is displayed'),
  contactSeparator: z.enum(['pipe', 'bullet', 'slash', 'space', 'newline']).describe('Separator between contact items'),
});

const extendedHeaderSchema = baseHeaderSchema.extend({
  // === Spacing & Padding ===
  headerPadding: z.enum(['compact', 'normal', 'spacious', 'asymmetric']).describe('Internal padding of header'),
  nameLetterSpacing: z.enum(['tight', 'normal', 'wide', 'extra-wide']).describe('Letter spacing for name'),
  headerMarginBottom: z.enum(['none', 'small', 'medium', 'large']).describe('Space below header'),

  // === Visual Depth ===
  headerBackground: z.enum(['none', 'subtle', 'colored', 'gradient']).describe('Header background style'),
  headerBorder: z.enum(['none', 'bottom', 'all', 'rounded']).describe('Border around/below header'),
  headerRounding: z.enum(['none', 'subtle', 'medium', 'full']).describe('Border radius for header'),

  // === Name Enhancements ===
  nameUnderline: z.enum(['none', 'solid', 'dotted', 'gradient']).describe('Underline style for name'),
  nameHighlight: z.boolean().describe('Whether name has subtle background highlight'),

  // === Headline Enhancements ===
  headlineIcon: z.boolean().describe('Show icon before headline (briefcase, etc)'),
  headlineQuotes: z.boolean().describe('Wrap headline in decorative quotes'),
});

const creativeHeaderSchema = extendedHeaderSchema.extend({
  // === Gradient Options ===
  headerGradientAngle: z.enum(['0', '45', '90', '135', '180', '225', '270', '315']).describe('Angle for gradient backgrounds'),
  gradientStart: z.string().optional().describe('Start color for gradient'),
  gradientEnd: z.string().optional().describe('End color for gradient'),
  gradientType: z.enum(['linear', 'radial']).describe('Type of gradient'),

  // === Advanced Visual Effects ===
  headerOverlay: z.enum(['none', 'subtle-pattern', 'noise', 'geometric']).describe('Overlay pattern on header'),
  nameGradient: z.boolean().describe('Apply gradient to name text'),

  // === Dynamic Elements ===
  dividerStyle: z.enum(['none', 'line', 'fade', 'wave', 'chevron']).describe('Style of divider below header'),
  headerShape: z.enum(['rectangle', 'angled', 'curved', 'wave-bottom']).describe('Shape of header bottom edge'),
});

const experimentalHeaderSchema = creativeHeaderSchema.extend({
  // === Advanced Typography ===
  nameTextShadow: z.boolean().describe('Add subtle text shadow to name'),
  nameSplitStyle: z.enum(['none', 'first-last', 'first-bold']).describe('Split name styling (first name bold, etc)'),
  nameVerticalAlign: z.enum(['top', 'center', 'baseline']).describe('Vertical alignment of name with photo'),

  // === Depth & Dimension ===
  headerShadow: z.enum(['none', 'subtle', 'medium', 'dramatic', 'layered']).describe('Shadow beneath header'),
  headerGradient: z.enum(['none', 'two-color', 'three-color', 'mesh']).describe('Gradient complexity'),
  header3DEffect: z.boolean().describe('Subtle 3D lift effect'),

  // === Experimental Layouts ===
  headerOrientation: z.enum(['horizontal', 'vertical-left']).describe('Header orientation'),
  overlayPhoto: z.boolean().describe('Photo overlaps header boundary'),
  floatingElements: z.boolean().describe('Elements float outside strict bounds'),

  // === Micro-details ===
  nameFirstLetterStyle: z.enum(['none', 'large', 'decorated', 'colored']).describe('Special styling for first letter'),
  taglinePosition: z.enum(['below-name', 'beside-name', 'in-accent']).describe('Position of tagline/headline'),
});

// =============================================================================
// STEP 3: TYPOGRAPHY SCHEMAS (Body content - not name, that's in Header)
// =============================================================================

const baseTypographySchema = z.object({
  // === Font Families ===
  headingFont: z.enum(['inter', 'roboto', 'source-sans', 'playfair', 'open-sans', 'lato', 'montserrat', 'raleway', 'poppins', 'merriweather']).describe('Font for section headings'),
  bodyFont: z.enum(['inter', 'roboto', 'source-sans', 'open-sans', 'lato', 'nunito', 'work-sans']).describe('Font for body text'),

  // === Font Sizes ===
  headingSizePt: z.number().describe('Section heading size in points (11-16)'),
  bodySizePt: z.number().describe('Body text size in points (9-11)'),
  smallTextSizePt: z.number().describe('Small text (dates, labels) size in points (8-10)'),

  // === Line & Paragraph ===
  lineHeight: z.number().describe('Line height multiplier (1.3-1.8)'),
  paragraphSpacing: z.enum(['tight', 'normal', 'relaxed']).describe('Space between paragraphs'),

  // === Font Weights ===
  headingWeight: z.enum(['medium', 'semibold', 'bold']).describe('Weight for section headings'),
  bodyWeight: z.enum(['normal', 'medium']).describe('Weight for body text'),

  // === Text Transforms ===
  headingTransform: z.enum(['none', 'uppercase', 'capitalize']).describe('Text transform for headings'),

  // === Hierarchy ===
  jobTitleSizePt: z.number().describe('Job title/position size in points (10-13)'),
  companySizePt: z.number().describe('Company name size in points (10-12)'),
});

const extendedTypographySchema = baseTypographySchema.extend({
  // === Letter Spacing ===
  sectionTitleLetterSpacing: z.enum(['none', 'subtle', 'wide', 'extra-wide']).describe('Letter spacing for section titles'),
  bodyLetterSpacing: z.enum(['tight', 'normal']).describe('Letter spacing for body text'),

  // === Visual Refinements ===
  headingUnderline: z.enum(['none', 'solid', 'dotted', 'accent']).describe('Underline style for section headings'),
  headingStyle: z.enum(['normal', 'italic']).describe('Font style for headings'),

  // === Spacing Fine-tuning ===
  sectionTitleMarginBottom: z.enum(['tight', 'normal', 'relaxed']).describe('Space below section titles'),
  itemTitleMarginBottom: z.enum(['none', 'tight', 'normal']).describe('Space below job titles'),

  // === Text Colors (semantic) ===
  useMutedDates: z.boolean().describe('Use muted color for dates'),
  useMutedLocations: z.boolean().describe('Use muted color for locations'),

  // === List Styling ===
  bulletIndent: z.enum(['small', 'normal', 'large']).describe('Indentation of bullet points'),
  bulletSpacing: z.enum(['tight', 'normal', 'relaxed']).describe('Space between bullet items'),
});

const creativeTypographySchema = extendedTypographySchema.extend({
  // === Advanced Typography ===
  useDropCap: z.boolean().describe('Large first letter in summary'),
  dropCapStyle: z.enum(['large', 'decorative', 'colored']).optional().describe('Style of drop cap'),

  // === Accent Typography ===
  accentFont: z.enum(['same', 'contrast']).describe('Whether to use contrasting font for accents'),
  highlightStyle: z.enum(['none', 'background', 'underline', 'bold']).describe('How to highlight key terms'),

  // === Section Title Enhancements ===
  sectionTitleIcon: z.boolean().describe('Show icons before section titles'),
  sectionTitleBorder: z.enum(['none', 'left', 'bottom', 'box']).describe('Border style for section titles'),

  // === Quote Styling ===
  quoteStyle: z.enum(['none', 'italic', 'border-left', 'large-quotes']).describe('Style for quoted text/summary'),
});

const experimentalTypographySchema = creativeTypographySchema.extend({
  // === Experimental Features ===
  useVariableFonts: z.boolean().describe('Use variable font weights for smooth transitions'),
  textRendering: z.enum(['auto', 'optimizeLegibility', 'geometricPrecision']).describe('Text rendering optimization'),

  // === Creative Text Effects ===
  gradientHeadings: z.boolean().describe('Apply gradient to section headings'),
  textShadow: z.enum(['none', 'subtle', 'dramatic']).describe('Text shadow on headings'),

  // === Rhythm & Flow ===
  useOpticalSizing: z.boolean().describe('Optical sizing for better readability'),
  hangingPunctuation: z.boolean().describe('Hanging punctuation for cleaner margins'),

  // === Advanced Hierarchy ===
  useSmallCaps: z.boolean().describe('Use small caps for labels/categories'),
  useOldstyleNumerals: z.boolean().describe('Use oldstyle numerals for dates'),
});

// =============================================================================
// STEP 4: COLORS SCHEMAS (Palette - gradient colors now in Header)
// =============================================================================

const baseColorsSchema = z.object({
  // === Style Metadata ===
  styleName: z.string().describe('Creative name for the color scheme (e.g., "Arctic Professional", "Midnight Executive")'),
  industryFit: z.string().describe('Industries/sectors this palette suits (e.g., "Finance, Consulting, Legal")'),
  styleRationale: z.string().describe('Brief explanation of why this palette works for the candidate/job'),
  formalityLevel: z.enum(['casual', 'professional', 'formal']).describe('Overall formality of the color scheme'),

  // === Core Color Palette ===
  primary: z.string().describe('Main brand color - used for name, headings, key accents (hex format)'),
  secondary: z.string().describe('Background/supporting color - very light, for subtle backgrounds (hex format)'),
  accent: z.string().describe('Highlight color - links, icons, decorative elements (hex format)'),
  text: z.string().describe('Main body text color - should be dark for readability (hex format)'),
  muted: z.string().describe('Secondary text color - dates, labels, less important info (hex format)'),

  // === Color Relationships ===
  colorHarmony: z.enum(['monochromatic', 'analogous', 'complementary', 'triadic', 'split-complementary']).describe('Color theory relationship between colors'),
  colorTemperature: z.enum(['cool', 'neutral', 'warm']).describe('Overall temperature of the palette'),
  contrastLevel: z.enum(['subtle', 'moderate', 'high']).describe('How much contrast between elements'),
});

const extendedColorsSchema = baseColorsSchema.extend({
  // === Extended Palette ===
  primaryLight: z.string().optional().describe('Lighter variant of primary for hover states'),
  primaryDark: z.string().optional().describe('Darker variant of primary for emphasis'),
  accentLight: z.string().optional().describe('Lighter variant of accent'),

  // === Semantic Colors ===
  linkColor: z.string().optional().describe('Color for hyperlinks (default: accent)'),
  borderColor: z.string().optional().describe('Default border color'),
  dividerColor: z.string().optional().describe('Color for section dividers'),

  // === Background Options ===
  headerBackground: z.string().optional().describe('Specific background for header area'),
  sectionBackground: z.string().optional().describe('Alternate background for sections'),
  cardBackground: z.string().optional().describe('Background for card-style elements'),

  // === Visual Depth ===
  shadowColor: z.string().optional().describe('Base color for shadows (with alpha)'),
  highlightColor: z.string().optional().describe('Color for highlighted/selected elements'),
});

const creativeColorsSchema = extendedColorsSchema.extend({
  // === Gradient Colors ===
  gradientStart: z.string().optional().describe('Start color for gradients'),
  gradientEnd: z.string().optional().describe('End color for gradients'),
  gradientMiddle: z.string().optional().describe('Optional middle color for complex gradients'),

  // === Accent Variations ===
  accentSecondary: z.string().optional().describe('Secondary accent for visual variety'),
  accentMuted: z.string().optional().describe('Muted version of accent for subtle use'),

  // === Special Effects ===
  glowColor: z.string().optional().describe('Color for glow effects'),
  overlayColor: z.string().optional().describe('Color for overlay effects (with alpha)'),
});

const experimentalColorsSchema = creativeColorsSchema.extend({
  // === Dynamic Color Features ===
  colorMode: z.enum(['light', 'dark', 'auto']).describe('Base color mode'),
  saturationLevel: z.enum(['muted', 'normal', 'vivid']).describe('Overall saturation intensity'),

  // === Advanced Palette ===
  tertiaryColor: z.string().optional().describe('Third brand color for complex designs'),
  quaternaryColor: z.string().optional().describe('Fourth brand color for very complex designs'),

  // === Experimental Features ===
  useColorBlending: z.boolean().describe('Enable advanced color blending effects'),
  chromaticAbstraction: z.enum(['none', 'subtle', 'bold']).describe('Level of chromatic variation'),
});

// =============================================================================
// STEP 4 REFACTORED: Two-phase colors generation for better reliability
// Phase A: Core colors (always generated first - smaller, faster)
// Phase B: Extended colors (added based on creativity level)
// =============================================================================

// Phase A: Core colors schema - always used as first step
const colorsPhaseASchema = z.object({
  // === Style Metadata ===
  styleName: z.string().describe('Creative name for the color scheme (e.g., "Arctic Professional", "Midnight Executive")'),
  industryFit: z.string().describe('Industries/sectors this palette suits (e.g., "Finance, Consulting, Legal")'),
  styleRationale: z.string().describe('Brief explanation of why this palette works for the candidate/job'),
  formalityLevel: z.enum(['casual', 'professional', 'formal']).describe('Overall formality of the color scheme'),

  // === Core Color Palette ===
  primary: z.string().describe('Main brand color - used for name, headings, key accents (hex format)'),
  secondary: z.string().describe('Background/supporting color - very light, for subtle backgrounds (hex format)'),
  accent: z.string().describe('Highlight color - links, icons, decorative elements (hex format)'),
  text: z.string().describe('Main body text color - should be dark for readability (hex format)'),
  muted: z.string().describe('Secondary text color - dates, labels, less important info (hex format)'),

  // === Color Relationships ===
  colorHarmony: z.enum(['monochromatic', 'analogous', 'complementary', 'triadic', 'split-complementary']).describe('Color theory relationship between colors'),
  colorTemperature: z.enum(['cool', 'neutral', 'warm']).describe('Overall temperature of the palette'),
  contrastLevel: z.enum(['subtle', 'moderate', 'high']).describe('How much contrast between elements'),
});

// Phase B schemas - extend core with additional colors based on creativity level
const colorsPhaseBBalancedSchema = z.object({
  // === Extended Palette ===
  primaryLight: z.string().optional().describe('Lighter variant of primary for hover states'),
  primaryDark: z.string().optional().describe('Darker variant of primary for emphasis'),
  accentLight: z.string().optional().describe('Lighter variant of accent'),

  // === Semantic Colors ===
  linkColor: z.string().optional().describe('Color for hyperlinks (default: accent)'),
  borderColor: z.string().optional().describe('Default border color'),
  dividerColor: z.string().optional().describe('Color for section dividers'),

  // === Background Options ===
  headerBackground: z.string().optional().describe('Specific background for header area'),
  sectionBackground: z.string().optional().describe('Alternate background for sections'),
  cardBackground: z.string().optional().describe('Background for card-style elements'),

  // === Visual Depth ===
  shadowColor: z.string().optional().describe('Base color for shadows (with alpha)'),
  highlightColor: z.string().optional().describe('Color for highlighted/selected elements'),
});

const colorsPhaseBCreativeSchema = colorsPhaseBBalancedSchema.extend({
  // === Gradient Colors ===
  gradientStart: z.string().optional().describe('Start color for gradients'),
  gradientEnd: z.string().optional().describe('End color for gradients'),
  gradientMiddle: z.string().optional().describe('Optional middle color for complex gradients'),

  // === Accent Variations ===
  accentSecondary: z.string().optional().describe('Secondary accent for visual variety'),
  accentMuted: z.string().optional().describe('Muted version of accent for subtle use'),

  // === Special Effects ===
  glowColor: z.string().optional().describe('Color for glow effects'),
  overlayColor: z.string().optional().describe('Color for overlay effects (with alpha)'),
});

const colorsPhaseBExperimentalSchema = colorsPhaseBCreativeSchema.extend({
  // === Dynamic Color Features ===
  colorMode: z.enum(['light', 'dark', 'auto']).describe('Base color mode'),
  saturationLevel: z.enum(['muted', 'normal', 'vivid']).describe('Overall saturation intensity'),

  // === Advanced Palette ===
  tertiaryColor: z.string().optional().describe('Third brand color for complex designs'),
  quaternaryColor: z.string().optional().describe('Fourth brand color for very complex designs'),

  // === Experimental Features ===
  useColorBlending: z.boolean().describe('Enable advanced color blending effects'),
  chromaticAbstraction: z.enum(['none', 'subtle', 'bold']).describe('Level of chromatic variation'),
});

// Helper function to get Phase B schema based on creativity level
function getColorsPhaseBSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return null; // No Phase B for conservative
    case 'balanced':
      return colorsPhaseBBalancedSchema;
    case 'creative':
      return colorsPhaseBCreativeSchema;
    case 'experimental':
      return colorsPhaseBExperimentalSchema;
  }
}

// =============================================================================
// STEP 5: SKILLS SCHEMAS (Dedicated skill display options)
// =============================================================================

const baseSkillsSchema = z.object({
  // === Display Format ===
  skillDisplay: z.enum(['tags', 'list', 'grid', 'bars', 'chips', 'categories-with-icons', 'progress-dots']).describe('How skills are visually displayed'),
  skillTagVariant: z.enum(['outlined', 'filled', 'ghost', 'gradient']).describe('Visual style of skill tags/chips'),

  // === Layout Options ===
  skillColumns: z.enum(['auto', '2', '3', '4']).describe('Number of columns for skill layout'),
  skillAlignment: z.enum(['left', 'center', 'justify']).describe('Alignment of skills within container'),

  // === Ordering & Grouping ===
  skillSortOrder: z.enum(['as-provided', 'alphabetical', 'by-relevance']).describe('How skills are ordered'),
  showSkillCount: z.boolean().describe('Whether to show total skill count'),

  // === Visual Spacing ===
  skillGap: z.enum(['tight', 'normal', 'relaxed']).describe('Space between skill items'),
  skillSectionSpacing: z.enum(['compact', 'normal', 'spacious']).describe('Space around skills section'),
});

const extendedSkillsSchema = baseSkillsSchema.extend({
  // === Category Styling ===
  skillCategoryStyle: z.enum(['none', 'header', 'divider', 'badge', 'sidebar']).describe('How skill categories are displayed'),
  categoryOrder: z.array(z.string()).optional().describe('Order of skill categories'),
  showCategoryIcons: z.boolean().describe('Whether to show icons next to category headers'),

  // === Tag Styling ===
  skillTagSize: z.enum(['compact', 'normal', 'large']).describe('Size of skill tags'),
  skillTagShape: z.enum(['rounded', 'pill', 'square']).describe('Shape of skill tags'),
  skillTagBorderWidth: z.enum(['none', 'thin', 'normal']).describe('Border thickness of tags'),

  // === Soft Skills ===
  softSkillsStyle: z.enum(['same', 'italic', 'muted', 'separate-section', 'hidden']).describe('How soft skills differ from technical'),
  softSkillsPosition: z.enum(['mixed', 'after-technical', 'separate-section']).describe('Where soft skills appear'),

  // === Proficiency Indicators ===
  showProficiencyLevel: z.boolean().describe('Whether to show skill proficiency'),
  proficiencyStyle: z.enum(['none', 'dots', 'bars', 'percentage', 'labels']).describe('How proficiency is displayed'),
  proficiencyScale: z.enum(['3', '5', '10']).describe('Scale for proficiency rating'),
});

const creativeSkillsSchema = extendedSkillsSchema.extend({
  // === Advanced Grouping ===
  skillGrouping: z.enum(['none', 'by-category', 'by-proficiency', 'by-type']).describe('How skills are grouped'),
  groupStyle: z.enum(['sections', 'columns', 'tabs', 'accordion']).describe('Visual style of skill groups'),

  // === Visual Enhancements ===
  skillHighlight: z.enum(['none', 'top-skills', 'relevant-skills']).describe('Which skills to visually highlight'),
  highlightStyle: z.enum(['bold', 'colored', 'starred', 'badge']).describe('How highlighted skills appear'),
  highlightCount: z.number().describe('Number of skills to highlight (3-5)'),

  // === Icons & Imagery ===
  useSkillIcons: z.boolean().describe('Whether to use icons for skills'),
  iconSource: z.enum(['none', 'simple-icons', 'emoji', 'custom']).describe('Source of skill icons'),
  iconPosition: z.enum(['before', 'above']).describe('Position of icons relative to skill name'),

  // === Animation & Effects ===
  skillHoverEffect: z.enum(['none', 'lift', 'highlight', 'scale']).describe('Hover effect for skills'),
  tagGradientDirection: z.enum(['horizontal', 'vertical', 'diagonal']).optional().describe('Direction for gradient tags'),
});

const experimentalSkillsSchema = creativeSkillsSchema.extend({
  // === Advanced Visual Features ===
  skillCloud: z.boolean().describe('Display skills as a word cloud'),
  cloudWeighting: z.enum(['equal', 'by-proficiency', 'by-relevance']).describe('How skill sizes vary in cloud'),

  // === Interactive Features (for web CVs) ===
  collapsibleCategories: z.boolean().describe('Allow categories to expand/collapse'),
  skillFiltering: z.boolean().describe('Allow filtering skills by category'),

  // === Endorsements & Validation ===
  showEndorsements: z.boolean().describe('Show LinkedIn-style endorsement counts'),
  showCertifications: z.boolean().describe('Link skills to certifications'),

  // === Custom Styling ===
  customTagColors: z.boolean().describe('Different colors per skill category'),
  categoryColorMap: z.record(z.string(), z.string()).optional().describe('Map of category to color'),

  // === Metrics & Data ===
  showYearsExperience: z.boolean().describe('Show years of experience per skill'),
  yearsDisplayStyle: z.enum(['inline', 'tooltip', 'badge']).describe('How years experience is shown'),

  // === Creative Layouts ===
  radialLayout: z.boolean().describe('Use radial/circular layout for skills'),
  skillMatrix: z.boolean().describe('Display as skill matrix (category vs proficiency)'),
});

// =============================================================================
// STEP 6: DETAILS SCHEMAS (Finishing touches - visual refinements)
// =============================================================================

const baseDetailsSchema = z.object({
  // === Item Styling ===
  itemStyle: z.enum(['inline', 'card-subtle', 'accent-left', 'timeline', 'numbered']).describe('How experience/education items are styled'),
  cornerStyle: z.enum(['sharp', 'rounded', 'pill']).describe('Corner radius for cards and elements'),
  intensity: z.enum(['subtle', 'moderate', 'bold']).describe('How prominent the decorations are'),

  // === Borders & Backgrounds ===
  useBorders: z.boolean().describe('Whether to use borders around items'),
  useBackgrounds: z.boolean().describe('Whether to use colored backgrounds'),
  borderStyle: z.enum(['solid', 'dashed', 'dotted']).describe('Style of borders when used'),

  // === Icons ===
  iconStyle: z.enum(['none', 'minimal', 'filled', 'outlined', 'duotone']).describe('Style of icons throughout CV'),
  iconColor: z.enum(['primary', 'accent', 'muted', 'inherit']).describe('Color scheme for icons'),

  // === Summary Section ===
  summaryFormat: z.enum(['paragraph', 'bullets', 'highlights']).describe('How summary text is formatted'),
  summaryAlignment: z.enum(['left', 'justify']).describe('Text alignment in summary'),

  // === Date & Location Styling ===
  dateStyle: z.enum(['normal', 'muted', 'badge', 'pill']).describe('How dates are styled'),
  locationStyle: z.enum(['normal', 'muted', 'with-icon', 'hidden']).describe('How locations are styled'),
});

const extendedDetailsSchema = baseDetailsSchema.extend({
  // === Advanced Item Styling ===
  itemBorderWidth: z.enum(['none', 'thin', 'normal', 'thick']).describe('Border thickness'),
  itemBorderColor: z.enum(['primary', 'accent', 'muted', 'subtle']).describe('Color of item borders'),
  itemSpacing: z.enum(['tight', 'normal', 'relaxed']).describe('Spacing between experience items'),

  // === Summary Enhancements ===
  summaryStyle: z.enum(['none', 'border-left', 'background', 'border-left-gradient', 'quote', 'card']).describe('Visual treatment of summary section'),
  summaryQuoteStyle: z.enum(['none', 'opening', 'both']).optional().describe('Quote marks around summary'),

  // === Shadow & Depth ===
  itemShadow: z.enum(['none', 'subtle', 'medium', 'layered']).describe('Shadow depth for items'),
  cardElevation: z.enum(['flat', 'raised', 'floating']).describe('Visual elevation of card elements'),

  // === Experience Item Details ===
  companyLogoSize: z.enum(['none', 'small', 'medium']).describe('Size of company logos if available'),
  showJobType: z.boolean().describe('Show employment type (Full-time, Contract, etc.)'),
  bulletPointStyle: z.enum(['disc', 'check', 'arrow', 'dash', 'custom']).describe('Style of bullet points in descriptions'),

  // === Dividers ===
  sectionDividerStyle: z.enum(['none', 'line', 'gradient', 'dots', 'fade']).describe('Style of dividers between sections'),
  dividerWidth: z.enum(['partial', 'full']).describe('Width of section dividers'),

  // === Links ===
  linkStyle: z.enum(['underline', 'color', 'both', 'subtle']).describe('How links are styled'),
  showLinkIcons: z.boolean().describe('Show icons next to links'),
});

const creativeDetailsSchema = extendedDetailsSchema.extend({
  // === Advanced Visual Effects ===
  hoverEffects: z.boolean().describe('Enable hover effects (for web CVs)'),
  microAnimations: z.boolean().describe('Enable subtle animations'),

  // === Timeline Features ===
  timelineStyle: z.enum(['none', 'dots', 'line', 'connected']).describe('Visual timeline connecting items'),
  timelineColor: z.enum(['primary', 'accent', 'gradient']).describe('Color of timeline elements'),

  // === Highlights & Emphasis ===
  achievementStyle: z.enum(['none', 'bold', 'colored', 'badge', 'icon']).describe('How achievements are highlighted'),
  keywordHighlighting: z.boolean().describe('Highlight relevant keywords'),
  highlightColor: z.enum(['accent', 'subtle-accent', 'background']).describe('Color for highlighted elements'),

  // === Company/Education Cards ===
  cardStyle: z.enum(['minimal', 'bordered', 'filled', 'gradient-border']).describe('Visual style for item cards'),
  cardHoverEffect: z.enum(['none', 'lift', 'glow', 'border-highlight']).describe('Hover effect for cards'),

  // === Visual Hierarchy ===
  titleEmphasis: z.enum(['normal', 'bold', 'large', 'colored']).describe('How job titles are emphasized'),
  companyEmphasis: z.enum(['normal', 'muted', 'bold']).describe('How company names are emphasized'),

  // === Special Elements ===
  useProgressBars: z.boolean().describe('Use progress bars for metrics/achievements'),
  progressBarStyle: z.enum(['filled', 'gradient', 'segmented']).optional().describe('Style of progress bars'),
});

const experimentalDetailsSchema = creativeDetailsSchema.extend({
  // === Experimental Visual Features ===
  glassmorphism: z.boolean().describe('Use glassmorphism effect for cards'),
  gradientText: z.boolean().describe('Use gradient for selected text elements'),

  // === 3D Effects ===
  use3DEffects: z.boolean().describe('Enable subtle 3D perspective effects'),
  depthLayers: z.enum(['none', 'subtle', 'prominent']).describe('Visual depth layering'),

  // === Interactive Elements ===
  expandableDetails: z.boolean().describe('Allow expanding/collapsing item details'),
  tooltips: z.boolean().describe('Show tooltips on hover'),

  // === Decorative Elements ===
  usePatterns: z.boolean().describe('Use subtle patterns as backgrounds'),
  patternStyle: z.enum(['none', 'dots', 'lines', 'geometric', 'organic']).describe('Type of background pattern'),
  patternOpacity: z.enum(['barely-visible', 'subtle', 'visible']).describe('How visible patterns are'),

  // === Custom Decorations ===
  decorativeShapes: z.boolean().describe('Add decorative shapes/elements'),
  shapeStyle: z.enum(['none', 'circles', 'squares', 'blobs', 'lines']).describe('Type of decorative shapes'),
  shapePosition: z.enum(['corners', 'background', 'accents']).describe('Where shapes appear'),

  // === Metrics & Numbers ===
  metricsStyle: z.enum(['inline', 'callout', 'badge', 'large-number']).describe('How metrics/numbers are displayed'),
  metricsAnimation: z.boolean().describe('Animate numbers on load (web)'),

  // === Print Optimization ===
  printOptimized: z.boolean().describe('Optimize colors/effects for printing'),
  printRemoveEffects: z.boolean().describe('Remove visual effects for print'),
});

// =============================================================================
// SCHEMA SELECTION FUNCTIONS
// =============================================================================

function getLayoutSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseLayoutSchema;
    case 'balanced':
    case 'creative':
      return extendedLayoutSchema;
    case 'experimental':
      return experimentalLayoutSchema;
  }
}

function getHeaderSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseHeaderSchema;
    case 'balanced':
      return extendedHeaderSchema;
    case 'creative':
      return creativeHeaderSchema;
    case 'experimental':
      return experimentalHeaderSchema;
  }
}

function getTypographySchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseTypographySchema;
    case 'balanced':
      return extendedTypographySchema;
    case 'creative':
      return creativeTypographySchema;
    case 'experimental':
      return experimentalTypographySchema;
  }
}

function getColorsSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseColorsSchema;
    case 'balanced':
      return extendedColorsSchema;
    case 'creative':
      return creativeColorsSchema;
    case 'experimental':
      return experimentalColorsSchema;
  }
}

function getSkillsSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseSkillsSchema;
    case 'balanced':
      return extendedSkillsSchema;
    case 'creative':
      return creativeSkillsSchema;
    case 'experimental':
      return experimentalSkillsSchema;
  }
}

function getDetailsSchema(level: StyleCreativityLevel) {
  switch (level) {
    case 'conservative':
      return baseDetailsSchema;
    case 'balanced':
      return extendedDetailsSchema;
    case 'creative':
      return creativeDetailsSchema;
    case 'experimental':
      return experimentalDetailsSchema;
  }
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

function buildContextPrompt(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  userPreferences?: string,
): string {
  let context = `## Candidate Profile:\n${linkedInSummary}\n`;

  if (jobVacancy) {
    context += `\n## Target Job:\nTitle: ${jobVacancy.title}\n`;
    if (jobVacancy.company) context += `Company: ${jobVacancy.company}\n`;
    context += `Description: ${jobVacancy.description.substring(0, 500)}...\n`;
  }

  if (userPreferences) {
    context += `\n## User Preferences: ${userPreferences}\n`;
  }

  return context;
}

// =============================================================================
// STEP 1: LAYOUT PROMPTS PER CREATIVITY LEVEL
// =============================================================================

const layoutPrompts: Record<StyleCreativityLevel, (context: string) => string> = {
  conservative: (context) => `Je bent een senior CV-ontwerper gespecialiseerd in TRADITIONELE sectoren: banken, overheid, verzekeraars, advocatenkantoren, accountancy, en corporate consultancy.

${context}

## JOUW TAAK
Ontwerp een layout die vertrouwen uitstraalt, professioneel oogt, en geen enkele recruiter afschrikt. ATS-compatibiliteit is CRUCIAAL.

---

## 📐 PAGE STRUCTURE

### pageMargins
**KIES: 'normal'**
- 'normal' (20mm): Professionele standaard, voldoende witruimte zonder verspilling
- VERMIJD 'narrow': Ziet er goedkoop en druk uit
- VERMIJD 'wide': Verspilt kostbare ruimte voor senior posities met veel ervaring

### contentDensity
**KIES: 'balanced'**
- 'balanced': Optimale leesbaarheid, professionele uitstraling
- 'dense' alleen als kandidaat 15+ jaar ervaring heeft en alles moet passen
- NOOIT 'airy' voor traditionele sectoren (ziet er onervaren uit)

---

## 📑 SECTION ORGANIZATION

### sectionDivider
**KIES: 'line' of 'none'**
- 'line': Simpele horizontale lijn - klassiek, ATS-proof, nooit verkeerd
- 'none': Ultra minimalistisch voor zeer senior posities

**VERMIJD voor conservative:**
- 'accent-bar': Te modern/creatief
- 'dots': Te speels
- 'gradient-line': Veel te creatief
- 'double-line': Gedateerd

### sectionSpacing
**KIES: 'normal'**
- Consistente, professionele afstand tussen secties
- 'tight' alleen bij ruimtegebrek
- NOOIT 'generous' (verspilt ruimte)

### sectionOrder
**STANDAARD VOLGORDE:**
\`["summary", "experience", "education", "skills", "certifications", "languages"]\`

**UITZONDERINGEN:**
- Recent afgestudeerd (< 2 jaar ervaring): education vóór experience
- Veel relevante certificeringen: certifications vóór skills
- Meertalige rol: languages hoger

---

## 📋 ITEM LAYOUT

### itemSpacing
**KIES: 'normal'**
- Duidelijke scheiding tussen banen/opleidingen
- 'compact' alleen als ruimte echt tekort is

### datePosition
**KIES: 'right-aligned'**
- Klassieke, professionele standaard
- Maakt scannen makkelijk voor recruiters
- VERMIJD 'inline' (moeilijker te scannen)
- VERMIJD 'above'/'below' (onconventioneel)

### locationDisplay
**KIES: 'with-company'**
- "Company Name, Amsterdam" - professionele standaard
- 'hidden' als locatie niet relevant is
- NOOIT 'separate-line' (verspilt ruimte)

---

## 📷 PHOTO SETTINGS

### showPhoto
**REGIO-AFHANKELIJK:**
- **true**: Nederland, België, Duitsland, Frankrijk, Zwitserland, Oostenrijk
- **false**: VS, VK, Canada, Australië, Ierland (discriminatie-wetgeving)

### photoPosition
**KIES: 'header-right'**
- Standaard Europese conventie
- Houdt naam/headline links waar ogen eerst kijken
- NOOIT 'header-center' voor conservative

### photoSize
**KIES: 'medium'**
- 80px - professioneel, niet overheersend
- 'small' voor zeer drukke CVs
- NOOIT 'large' (te veel nadruk op uiterlijk)

### photoShape
**KIES: 'circle' of 'rounded-square'**
- 'circle': Moderne standaard, vriendelijk maar professioneel
- 'rounded-square': Iets formeler
- NOOIT 'square' met scherpe hoeken (gedateerd)

---

## 📊 VISUAL HIERARCHY

### bulletStyle
**KIES: 'disc' of 'circle'**
- 'disc': Klassieke bullet, universeel geaccepteerd
- 'circle': Iets lichter, eleganter
- VERMIJD: 'arrow', 'checkmark' (te informeel), 'square' (gedateerd)

### sectionTitlePosition
**KIES: 'left'**
- Standaard, professioneel, ATS-compatibel
- 'left-with-line' acceptabel als sectionDivider='line'
- NOOIT 'center' voor conservative layouts`,

  balanced: (context) => `Je bent een senior CV-ontwerper voor MODERNE PROFESSIONELE bedrijven: tech enterprises (Microsoft, Google, Salesforce), scale-ups, fintech, moderne consultancy (McKinsey Digital, BCG), en corporate innovatie-afdelingen.

${context}

## JOUW TAAK
Ontwerp een layout die modern en professioneel is, maar niet saai. De kandidaat moet opvallen als iemand die bij de tijd is, zonder het te overdrijven.

---

## 📐 PAGE STRUCTURE

### pageMargins
**KIES STRATEGISCH:**
- 'normal' (20mm): Veilige keuze voor de meeste situaties
- 'narrow' (15mm): Bij veel ervaring die moet passen, of tech rollen waar content > witruimte

### contentDensity
**KIES: 'balanced'**
- 'balanced': Optimale mix van content en ademruimte
- 'dense': Acceptabel voor senior tech rollen met veel projecten
- 'airy': Alleen voor design/creative director rollen

---

## 📑 SECTION ORGANIZATION

### sectionDivider
**KIES UIT: 'line', 'accent-bar', of 'gradient-line'**
- 'line': Veilig, professioneel, altijd goed
- 'accent-bar': Moderne touch, werkt goed voor tech bedrijven
- 'gradient-line': Subtiele creativiteit voor innovatieve bedrijven

### sectionSpacing
**KIES: 'normal' of 'relaxed'**
- 'normal': Standaard professioneel
- 'relaxed': Wat meer ademruimte voor senior posities

### sectionOrder
**TECH ROLLEN (developers, engineers, data scientists):**
\`["summary", "skills", "experience", "education", "certifications", "languages"]\`
→ Skills eerst! Recruiters willen tech stack direct zien.

**BUSINESS/MANAGEMENT ROLLEN:**
\`["summary", "experience", "education", "skills", "certifications", "languages"]\`
→ Ervaring en verantwoordelijkheden belangrijker.

**HYBRIDE ROLLEN (product managers, tech leads):**
\`["summary", "experience", "skills", "education", "certifications", "languages"]\`
→ Ervaring eerst, skills snel daarna.

---

## 📋 ITEM LAYOUT

### itemSpacing
**KIES: 'normal' of 'comfortable'**
- 'comfortable': Geeft elke rol meer visuele aandacht
- 'normal': Efficiënt bij veel ervaring

### datePosition
**KIES: 'right-aligned' of 'inline'**
- 'right-aligned': Klassiek, makkelijk scanbaar
- 'inline': "Software Engineer (2020-Present)" - moderner, compacter

### locationDisplay
**KIES: 'with-company' of 'with-date'**
- 'with-company': "Google, Amsterdam"
- 'with-date': Datum en locatie rechts samen - ruimtebesparend

---

## 📷 PHOTO SETTINGS

### showPhoto
**REGIO-AFHANKELIJK** (zelfde als conservative)

### photoPosition
**KIES: 'header-right' of 'beside-name'**
- 'header-right': Veilige standaard
- 'beside-name': Modernere integratie met header

### photoSize
**KIES: 'medium'** (80px)

### photoShape
**KIES: 'circle'**
- Moderne standaard, werkt altijd
- 'rounded-square' voor formelere bedrijven

---

## 📊 VISUAL HIERARCHY

### bulletStyle
**KIES: 'disc', 'circle', of 'dash'**
- 'disc': Veilig, professioneel
- 'circle': Eleganter, lichter
- 'dash': Modern, clean (goed voor tech)

### sectionTitlePosition
**KIES: 'left' of 'left-with-line'**
- 'left-with-line': Voegt visuele structuur toe

---

## 🏗️ EXTENDED FIELDS (Balanced niveau)

### columnLayout
**KIES: 'single'**
- Single column is het veiligst voor ATS en print
- Sidebar layouts later overwegen bij creative niveau

### experienceLayout
**KIES: 'stacked' of 'cards'**
- 'stacked': Klassiek, efficient
- 'cards': Subtiele kaart-achtige achtergrond per rol (modern)

### educationLayout
**KIES: 'stacked' of 'compact'**
- 'stacked': Standaard
- 'compact': Als opleiding minder belangrijk is dan ervaring

### whitespaceStrategy
**KIES: 'balanced'**
- Optimale verhouding content/witruimte

### paragraphSpacing
**KIES: 'normal'**

### contactLayout
**KIES: 'single-line' of 'two-lines'**
- 'single-line': "email@example.com | +31 6 1234 5678 | Amsterdam"
- 'two-lines': Email en telefoon regel 1, LinkedIn en locatie regel 2

### contactPosition
**KIES: 'header'**

### showContactIcons
**KIES: true**
- Moderne touch, verbetert scanbaarheid
- Kleine iconen voor email, telefoon, LinkedIn, locatie`,

  creative: (context) => `Je bent een senior CV-ontwerper voor MODERNE TECH BEDRIJVEN en SCALE-UPS: SaaS bedrijven, startups, tech unicorns, innovatieve agencies, en bedrijven met een sterke design-cultuur.

${context}

## JOUW TAAK
Ontwerp een layout die direct laat zien dat de kandidaat modern, innovatief, en design-bewust is. De CV moet opvallen in een stapel, maar nog steeds professioneel genoeg zijn voor HR.

---

## 📐 PAGE STRUCTURE

### pageMargins
**KIES: 'normal' of 'narrow'**
- 'narrow': Geeft meer ruimte voor content, moderne look
- 'normal': Als design meer ademruimte nodig heeft

### contentDensity
**KIES: 'balanced' of 'airy'**
- 'balanced': Goede standaard
- 'airy': Voor design/creative rollen waar whitespace een statement is

---

## 📑 SECTION ORGANIZATION

### sectionDivider
**KIES: 'accent-bar' of 'gradient-line'**
- 'accent-bar': Dikke gekleurde lijn - modern en opvallend
- 'gradient-line': Subtiele gradient - premium look

### sectionSpacing
**KIES: 'normal' of 'relaxed'**
- 'relaxed': Geeft design meer ruimte om te ademen

### sectionOrder
**TECH/CREATIVE ROLLEN:**
\`["summary", "skills", "experience", "education", "certifications", "languages"]\`
→ Skills ALTIJD eerst voor tech - recruiters scannen hierop

**SENIOR ROLLEN:**
\`["summary", "experience", "skills", "education", "certifications", "languages"]\`

---

## 📋 ITEM LAYOUT

### itemSpacing
**KIES: 'comfortable'**
- Elke ervaring verdient visuele aandacht

### datePosition
**KIES: 'right-aligned' of 'inline'**
- 'inline': Moderner, compacter
- 'right-aligned': Klassiek maar nog steeds goed

### locationDisplay
**KIES: 'with-company' of 'hidden'**
- 'hidden': Als locatie niet relevant is (remote rollen)

---

## 📷 PHOTO SETTINGS

### showPhoto
- **true** voor EU (foto's werken goed bij creatieve bedrijven)
- **false** voor US/UK

### photoPosition
**KIES: 'header-left', 'header-right', of 'beside-name'**
- Meer flexibiliteit in plaatsing

### photoSize
**KIES: 'medium' of 'large'**
- 'large': Acceptabel voor design/creative rollen

### photoShape
**KIES: 'circle'**
- Moderne standaard

---

## 📊 VISUAL HIERARCHY

### bulletStyle
**KIES: 'dash', 'arrow', of 'circle'**
- 'dash': Modern, minimalistisch
- 'arrow': Dynamisch, forward-looking
- 'circle': Clean en elegant

### sectionTitlePosition
**KIES: 'left' of 'left-with-line'**

---

## 🏗️ EXTENDED FIELDS (Creative niveau)

### columnLayout
**KIES: 'single' of 'sidebar-left'**
- 'single': Veilig, maximale ruimte voor content
- 'sidebar-left': Modern, skills/contact in sidebar, experience in main

### sidebarWidth (als sidebar)
**KIES: 'narrow' of 'medium'**
- 'narrow': Skills, contact, languages
- 'medium': Als je ook certifications wil tonen

### sidebarContent (als sidebar)
\`["skills", "contact", "languages", "certifications"]\`

### experienceLayout
**KIES: 'cards' of 'timeline'**
- 'cards': Subtiele kaart-achtergrond per ervaring
- 'timeline': Verticale lijn met stippen - zeer visueel

### educationLayout
**KIES: 'compact' of 'cards'**
- 'compact': Als ervaring belangrijker is
- 'cards': Consistentie met experience

### whitespaceStrategy
**KIES: 'balanced' of 'generous'**
- 'generous': Voor design-gerichte rollen

### paragraphSpacing
**KIES: 'normal' of 'relaxed'**

### contactLayout
**KIES: 'single-line' of 'icons-only'**
- 'icons-only': Zeer modern, alleen iconen met hover/print fallback

### contactPosition
**KIES: 'header' of 'sidebar'**

### showContactIcons
**KIES: true** (altijd voor creative)`,

  experimental: (context) => `Je bent een cutting-edge CV-ontwerper voor CREATIEVE INDUSTRIEËN: design agencies, branding studios, creative tech startups, gaming bedrijven, en rollen waar visuele creativiteit een kerncompetentie is.

${context}

## JOUW TAAK
Ontwerp een layout die een STATEMENT maakt. Dit CV moet visueel communiceren dat de kandidaat design en innovatie begrijpt. Wees bold, maar blijf functioneel.

---

## 📐 PAGE STRUCTURE

### pageMargins
**KIES CREATIEF:**
- 'narrow': Maximale content canvas
- 'wide': Statement maken met whitespace (voor design directors)
- Kies gebaseerd op de visuele boodschap

### contentDensity
**KIES: 'balanced' of 'airy'**
- 'airy': Perfect voor design rollen - whitespace is ook design

---

## 📑 SECTION ORGANIZATION

### sectionDivider
**ALLE OPTIES BESCHIKBAAR:**
- 'gradient-line': Premium, dynamisch
- 'accent-bar': Bold statement
- 'double-line': Retro-modern
- 'dots': Speels, uniek

### sectionSpacing
**KIES: 'relaxed' of 'generous'**
- 'generous': Laat het design ademen

### sectionOrder
**FLEXIBEL - Prioriteer relevantie:**
- Design rollen: Skills eerst (portfolio verwijzing in summary)
- Creative directors: Experience eerst
- Overweeg unieke volgorde als het past bij de kandidaat

---

## 📋 ITEM LAYOUT

### itemSpacing
**KIES: 'comfortable'**

### datePosition
**KIES: 'inline', 'above', of 'below'**
- 'above': Uniek, breekt met conventie op een elegante manier
- 'below': Minder nadruk op data, meer op inhoud

### locationDisplay
**KIES STRATEGISCH:**
- 'hidden': Voor remote-first/global rollen
- 'with-company': Als locatie relevant is

---

## 📷 PHOTO SETTINGS

### showPhoto
**KIES: true** (foto's zijn belangrijk in creatieve industrie)

### photoPosition
**ALLE POSITIES BESCHIKBAAR:**
- 'header-center': Bold statement
- 'beside-name': Geïntegreerd design

### photoSize
**KIES: 'medium' of 'large'**
- 'large': Acceptabel voor visuele rollen

### photoShape
**KIES: 'circle' of 'rounded-square'**

---

## 📊 VISUAL HIERARCHY

### bulletStyle
**KIES CREATIEF:**
- 'arrow': Forward-thinking
- 'checkmark': Achievement-focused
- 'none': Ultra minimalistisch (voor design purists)

### sectionTitlePosition
**KIES: 'left', 'center', of 'left-with-line'**
- 'center': Bold, symmetrisch

---

## 🏗️ EXTENDED FIELDS (Experimental niveau)

### columnLayout
**KIES: 'sidebar-left' of 'sidebar-right'**
- Sidebars maken het ontwerp interessanter
- 'sidebar-left': Skills prominent
- 'sidebar-right': Unconventional, opvallend

### sidebarWidth
**KIES: 'medium' of 'wide'**
- 'wide': Meer visuele balans

### sidebarContent
\`["photo", "contact", "skills", "languages"]\`
→ Photo in sidebar is een moderne aanpak

### experienceLayout
**KIES: 'timeline' of 'cards'**
- 'timeline': Visueel storytelling
- 'cards': Modern UI-geïnspireerd

### educationLayout
**KIES: 'cards'**
- Consistentie met experience

### whitespaceStrategy
**KIES: 'generous'**
- Whitespace is een design keuze

### paragraphSpacing
**KIES: 'relaxed'**

### contactLayout
**KIES: 'icons-only' of 'stacked'**
- 'stacked': Verticaal, uniek

### contactPosition
**KIES: 'sidebar' of 'footer'**
- 'footer': Unconventional, modern

### showContactIcons
**KIES: true**

---

## 🎨 EXPERIMENTAL FIELDS

### asymmetricLayout
**KIES: true of false**
- true: Breekt met grid voor visuele interesse (alleen als het past)
- false: Veiligere optie

### overlappingElements
**KIES: false** (meestal)
- true: Alleen voor zeer creatieve rollen waar dit als portfolio piece dient

### sectionNumbering
**KIES: true of false**
- true: "01. Experience", "02. Skills" - moderne touch

### progressIndicators
**KIES: true of false**
- true: Visuele timeline markers

### highlightKeywords
**KIES: true**
- Subtiele nadruk op belangrijke termen

### pullQuotes
**KIES: true of false**
- true: Summary als quote-style - zeer visueel

### useGridSystem
**KIES: true**
- Strakke alignment voor professionele uitstraling

### gridColumns
**KIES: '12'**
- Standaard design grid`,
};

// =============================================================================
// STEP 2: HEADER PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type LayoutResult = z.infer<typeof baseLayoutSchema> | z.infer<typeof extendedLayoutSchema> | z.infer<typeof experimentalLayoutSchema>;

const headerPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult) => string> = {
  conservative: (context, layout) => `Je bent een senior header-ontwerper gespecialiseerd in TRADITIONELE sectoren. De header is het visitekaartje - eerste indruk is alles!

${context}

## Huidige Layout Context:
- Content Density: ${layout.contentDensity}
- Section Spacing: ${layout.sectionSpacing}
- Photo: ${layout.showPhoto ? `${layout.photoPosition}, ${layout.photoSize}, ${layout.photoShape}` : 'geen foto'}
- Bullets: ${layout.bulletStyle}

---

## 🏛️ HEADER STRUCTURE

### headerStyle
**KIES: 'left-aligned' of 'minimal'**
- 'left-aligned': Standaard professioneel, ATS-proof, werkt ALTIJD
- 'minimal': Ultra clean, voor zeer senior posities
- 'centered': Acceptabel voor C-level/directie posities

**NOOIT voor conservative:**
- 'banner', 'full-width-accent', 'bold-name', 'card' (te creatief)

### headerAlignment
**KIES: 'left'**
- Links is de professionele standaard
- 'center' alleen bij centered headerStyle

### headerHeight
**KIES: 'compact' of 'standard'**
- 'compact': Efficiënt, meer ruimte voor content
- 'standard': Klassieke verhoudingen
- NOOIT 'tall' (verspilt ruimte)

---

## ✍️ NAME STYLING

### nameSizePt
**KIES: 22-26**
- 24pt is de gouden standaard
- Niet groter dan 26pt (te schreeuwerig)
- Niet kleiner dan 22pt (te bescheiden)

### nameWeight
**KIES: 'semibold' of 'bold'**
- 'semibold': Elegant, modern
- 'bold': Klassiek, krachtig
- NOOIT 'extrabold' (te agressief)

### nameTransform
**KIES: 'none' of 'capitalize'**
- 'none': Jan van den Berg (natuurlijk)
- 'capitalize': Jan Van Den Berg (formeler)
- NOOIT 'uppercase' (te agressief voor traditioneel)

---

## 💼 HEADLINE/TITLE

### showHeadline
**KIES: true**
- Altijd headline tonen - recruiters willen direct weten wat je doet

### headlineSizePt
**KIES: 12-14**
- Duidelijk leesbaar, niet concurrerend met naam

### headlineStyle
**KIES: 'muted' of 'normal'**
- 'muted': Subtiele grijstint, elegant onderscheid
- 'normal': Zelfde kleur als body text
- NOOIT 'accent-color' (te opvallend)

---

## 🎨 HEADER ACCENTS

### headerAccent
**KIES: 'none', 'underline', of 'bottom-border'**
- 'none': Ultra minimalistisch
- 'underline': Subtiele lijn onder naam (AANBEVOLEN)
- 'bottom-border': Scheiding header/content

**VERMIJD:** 'gradient-bar', 'side-bar' (te modern)

### accentThickness
**KIES: 'thin'**
- Subtiel is professioneler

### accentPosition
**KIES: 'below-name' of 'below-header'**

---

## 📧 CONTACT IN HEADER

### contactInHeader
**KIES: true**
- Contact info hoort in de header voor snelle toegang

### contactStyle
**KIES: 'inline' of 'stacked'**
- 'inline': email | telefoon | locatie (ruimte-efficiënt)
- 'stacked': Elke item op eigen regel (formeler)

### contactSeparator
**KIES: 'pipe' of 'bullet'**
- 'pipe': | - moderne standaard
- 'bullet': • - klassiek`,

  balanced: (context, layout) => `Je bent een senior header-ontwerper voor MODERNE PROFESSIONELE bedrijven. De header moet opvallen maar professioneel blijven!

${context}

## Huidige Layout Context:
- Content Density: ${layout.contentDensity}
- Section Spacing: ${layout.sectionSpacing}
- Photo: ${layout.showPhoto ? `${layout.photoPosition}, ${layout.photoSize}, ${layout.photoShape}` : 'geen foto'}
- Column Layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}

---

## 🏛️ HEADER STRUCTURE

### headerStyle
**KIES STRATEGISCH:**
- 'left-aligned': Default, werkt altijd
- 'split': Naam links, contact rechts - zeer modern en efficiënt
- 'minimal': Ultra clean voor design-bewuste bedrijven
- 'card': Subtiele kaart-achtergrond voor moderne touch

### headerAlignment
**KIES: 'left'** (standard) of **'center'** (bij split/card)

### headerHeight
**KIES: 'standard' of 'compact'**

---

## ✍️ NAME STYLING

### nameSizePt
**KIES: 24-28**
- 26pt is ideaal voor balanced

### nameWeight
**KIES: 'semibold' of 'bold'**

### nameTransform
**KIES: 'none'**
- Natuurlijke weergave is modern

---

## 💼 HEADLINE/TITLE

### showHeadline
**KIES: true**

### headlineSizePt
**KIES: 13-15**

### headlineStyle
**KIES: 'muted' of 'accent-color'**
- 'accent-color': Subtiele kleurtouch (AANBEVOLEN voor tech)

---

## 🎨 HEADER ACCENTS

### headerAccent
**KIES: 'underline', 'bottom-border', of 'gradient-bar'**
- 'gradient-bar': Premium moderne look

### accentThickness
**KIES: 'thin' of 'medium'**

### accentPosition
**KIES: 'below-name' of 'full-width'**

---

## 📧 CONTACT IN HEADER

### contactInHeader
**KIES: true**

### contactStyle
**KIES: 'inline' of 'two-columns'**
- 'two-columns': Bij split header style

### contactSeparator
**KIES: 'pipe' of 'bullet'**

---

## 🔧 EXTENDED FIELDS (Balanced niveau)

### headerPadding
**KIES: 'normal' of 'spacious'**

### nameLetterSpacing
**KIES: 'tight' of 'normal'**
- 'tight': Modern, Apple-stijl (-0.025em)

### headerMarginBottom
**KIES: 'small' of 'medium'**

### headerBackground
**KIES: 'none' of 'subtle'**
- 'subtle': Zeer lichte achtergrondtint

### headerBorder
**KIES: 'none' of 'bottom'**

### headerRounding
**KIES: 'none' of 'subtle'**

### nameUnderline
**KIES: 'none' of 'solid'**

### nameHighlight
**KIES: false** (meestal)

### headlineIcon
**KIES: false of true**
- true: Klein icoon voor headline (💼 of vergelijkbaar)

### headlineQuotes
**KIES: false**`,

  creative: (context, layout) => `Je bent een header-ontwerper voor MODERNE TECH BEDRIJVEN. De header moet IMPACT maken en de kandidaat positioneren als innovatief!

${context}

## Huidige Layout Context:
- Content Density: ${layout.contentDensity}
- Section Spacing: ${layout.sectionSpacing}
- Photo: ${layout.showPhoto ? `${layout.photoPosition}, ${layout.photoSize}, ${layout.photoShape}` : 'geen foto'}
- Column Layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}
- Experience Layout: ${'experienceLayout' in layout ? layout.experienceLayout : 'stacked'}

---

## 🏛️ HEADER STRUCTURE

### headerStyle
**KIES VOOR IMPACT:**
- 'split': Modern, efficiënt - naam links, contact rechts
- 'banner': Full-width gekleurde header - BOLD statement
- 'card': Moderne kaart-stijl met subtiele achtergrond
- 'left-aligned': Veilig voor enterprise tech

**⚠️ BANNER REGEL:** Primary kleur moet DONKER zijn voor witte tekst!

### headerAlignment
**KIES: 'left' of 'center'**
- 'center' bij banner of card

### headerHeight
**KIES: 'standard' of 'tall'**
- 'tall' bij banner voor meer impact

---

## ✍️ NAME STYLING

### nameSizePt
**KIES: 26-32**
- Grotere naam = meer aanwezigheid
- 28-30pt is sweet spot voor creative

### nameWeight
**KIES: 'bold' of 'extrabold'**
- 'extrabold' voor bold-name style

### nameTransform
**KIES: 'none' of 'uppercase'**
- 'uppercase' voor design/creative rollen

---

## 💼 HEADLINE/TITLE

### showHeadline
**KIES: true**

### headlineSizePt
**KIES: 14-16**

### headlineStyle
**KIES: 'accent-color' of 'italic'**
- 'accent-color': Opvallend, modern
- 'italic': Elegant, onderscheidend

---

## 🎨 HEADER ACCENTS

### headerAccent
**KIES: 'gradient-bar', 'underline', of 'side-bar'**
- 'gradient-bar': Premium look (AANBEVOLEN)
- 'side-bar': Verticale accent lijn

### accentThickness
**KIES: 'medium' of 'thick'**

### accentPosition
**KIES: 'full-width' of 'left-side'**

---

## 📧 CONTACT IN HEADER

### contactInHeader
**KIES: true**

### contactStyle
**KIES: 'inline', 'icons-only', of 'two-columns'**
- 'icons-only': Zeer modern, minimalistisch

### contactSeparator
**KIES: 'space' of 'bullet'**

---

## 🔧 EXTENDED FIELDS

### headerPadding
**KIES: 'spacious'**

### nameLetterSpacing
**KIES: 'tight'** (modern, premium)

### headerMarginBottom
**KIES: 'medium' of 'large'**

### headerBackground
**KIES: 'subtle', 'colored', of 'gradient'**
- 'gradient' bij banner style

### headerBorder
**KIES: 'none' of 'rounded'**

### headerRounding
**KIES: 'subtle' of 'medium'**

### nameUnderline
**KIES: 'none' of 'gradient'**

### nameHighlight
**KIES: true of false**

### headlineIcon
**KIES: true** (moderne touch)

### headlineQuotes
**KIES: false of true**
- true voor creatieve persoonlijke statements

---

## 🎨 CREATIVE FIELDS

### headerGradientAngle
**KIES: '45' of '135'** voor dynamische gradients
- '45': Linksboven naar rechtsonder (ENERGIEK)
- '135': Rechtsboven naar linksonder

### gradientStart
Startkleur - typisch primary of iets donkerder

### gradientEnd
Eindkleur - typisch accent of lichter

### gradientType
**KIES: 'linear'** (standaard) of **'radial'** (uniek)

### headerOverlay
**KIES: 'none' of 'subtle-pattern'**

### nameGradient
**KIES: false** (meestal) of **true** voor design rollen

### dividerStyle
**KIES: 'none', 'line', of 'fade'**
- 'fade': Moderne gradient fade

### headerShape
**KIES: 'rectangle' of 'angled'**
- 'angled': Diagonale bottom edge (modern)`,

  experimental: (context, layout) => `Je bent een cutting-edge header-ontwerper voor CREATIEVE INDUSTRIEËN. De header IS het eerste werk sample - maak het MEMORABEL!

${context}

## Huidige Layout Context:
- Content Density: ${layout.contentDensity}
- Section Spacing: ${layout.sectionSpacing}
- Photo: ${layout.showPhoto ? `${layout.photoPosition}, ${layout.photoSize}, ${layout.photoShape}` : 'geen foto'}
- Column Layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}
- Experimental Features: asymmetric=${'asymmetricLayout' in layout ? layout.asymmetricLayout : false}, numbering=${'sectionNumbering' in layout ? layout.sectionNumbering : false}

---

## 🏛️ HEADER STRUCTURE

### headerStyle
**ALLE OPTIES - WEES BOLD:**
- 'banner': Full-width kleur statement
- 'full-width-accent': Premium gradient bar
- 'bold-name': OVERSIZED naam - voor designers
- 'card': Moderne floating card effect
- 'split': Clean moderne layout

### headerAlignment
**FLEXIBEL:**
- 'left', 'center', of 'right'
- 'right' voor unconventional layouts

### headerHeight
**KIES: 'tall' of 'auto'**
- 'tall' voor visual impact
- 'auto' past zich aan content aan

---

## ✍️ NAME STYLING

### nameSizePt
**KIES: 28-36**
- 32-36pt voor bold-name style - STATEMENT

### nameWeight
**KIES: 'bold' of 'extrabold'**

### nameTransform
**KIES: 'none', 'uppercase', of 'capitalize'**
- 'uppercase' voor design/brand posities

---

## 💼 HEADLINE/TITLE

### showHeadline
**KIES: true**

### headlineSizePt
**KIES: 14-18**

### headlineStyle
**KIES: 'accent-color' of 'italic'**

---

## 🎨 HEADER ACCENTS

### headerAccent
**KIES: 'gradient-bar', 'side-bar', of 'double-line'**
- 'double-line': Unieke retro-modern look

### accentThickness
**KIES: 'medium' of 'thick'**

### accentPosition
**KIES: 'full-width', 'left-side', of 'below-name'**

---

## 📧 CONTACT IN HEADER

### contactInHeader
**KIES: true**

### contactStyle
**KIES: 'icons-only' of 'stacked'**

### contactSeparator
**KIES: 'space' of 'newline'**

---

## 🔧 EXTENDED FIELDS

### headerPadding
**KIES: 'spacious' of 'asymmetric'**
- 'asymmetric' voor visuele interesse

### nameLetterSpacing
**KIES: 'tight', 'wide', of 'extra-wide'**
- 'extra-wide': Luxe uitstraling

### headerMarginBottom
**KIES: 'large'**

### headerBackground
**KIES: 'gradient'**

### headerBorder
**KIES: 'none' of 'rounded'**

### headerRounding
**KIES: 'medium' of 'full'**

### nameUnderline
**KIES: 'gradient'** voor premium effect

### nameHighlight
**KIES: true of false**

### headlineIcon
**KIES: true**

### headlineQuotes
**KIES: true** voor persoonlijke statements

---

## 🎨 CREATIVE FIELDS

### headerGradientAngle
**KIES: '45', '135', '225', of '315'**

### gradientStart / gradientEnd
Kies complementaire kleuren

### gradientType
**KIES: 'linear' of 'radial'**
- 'radial' voor spotlight effect

### headerOverlay
**KIES: 'subtle-pattern', 'noise', of 'geometric'**
- 'geometric' voor tech/design

### nameGradient
**KIES: true** voor design rollen

### dividerStyle
**KIES: 'wave' of 'chevron'**
- Unieke vormen voor creatieve CVs

### headerShape
**KIES: 'angled', 'curved', of 'wave-bottom'**

---

## 🚀 EXPERIMENTAL FIELDS

### nameTextShadow
**KIES: true** bij donkere achtergronden

### nameSplitStyle
**KIES: 'first-last' of 'first-bold'**
- 'first-bold': Voornaam bold, achternaam light

### nameVerticalAlign
**KIES: 'center' of 'baseline'**

### headerShadow
**KIES: 'subtle', 'medium', of 'layered'**
- 'layered': Apple-stijl gestapelde schaduwen

### headerGradient
**KIES: 'two-color' of 'three-color'**
- 'three-color': Rijkere gradient

### header3DEffect
**KIES: true** voor subtiele diepte

### headerOrientation
**KIES: 'horizontal'** (standaard)
- 'vertical-left' voor portfolio-stijl CVs

### overlayPhoto
**KIES: true of false**
- true: Photo overlapt header grens (modern)

### floatingElements
**KIES: false** (meestal)
- true: Elementen buiten strikte grenzen

### nameFirstLetterStyle
**KIES: 'none', 'large', of 'colored'**
- 'large': Oversized eerste letter (drop cap stijl)
- 'colored': Eerste letter in accent kleur

### taglinePosition
**KIES: 'below-name' of 'beside-name'**
- 'beside-name' voor compacte layouts`,
};

// =============================================================================
// STEP 3: TYPOGRAPHY PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type HeaderResult = z.infer<typeof baseHeaderSchema> | z.infer<typeof extendedHeaderSchema> | z.infer<typeof creativeHeaderSchema> | z.infer<typeof experimentalHeaderSchema>;

const typographyPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult) => string> = {
  conservative: (context, layout, header) => `Je bent een senior typografie-expert gespecialiseerd in TRADITIONELE sectoren. Goede typografie is onzichtbaar - het ondersteunt de content zonder op te vallen.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Content Density: ${layout.contentDensity}
- Section Spacing: ${layout.sectionSpacing}

---

## 🔤 FONT FAMILIES

### headingFont
**KIES: 'inter' of 'source-sans'**
- 'inter': Moderne standaard, uitstekende leesbaarheid op scherm en print
- 'source-sans': Adobe's professionele font, zeer leesbaar

**VERMIJD voor conservative:**
- 'playfair', 'montserrat', 'raleway' (te decoratief/creatief)

### bodyFont
**KIES: 'inter' of 'source-sans'**
- Zelfde familie als headingFont voor consistentie
- NOOIT verschillende font families voor heading en body in conservative

---

## 📏 FONT SIZES

### headingSizePt
**KIES: 11-12**
- 12pt: Standaard, duidelijk
- 11pt: Bij veel content

### bodySizePt
**KIES: 10**
- 10pt is de professionele standaard
- NOOIT kleiner dan 9pt (onleesbaar)
- NOOIT groter dan 11pt (ziet er amateuristisch uit)

### smallTextSizePt
**KIES: 9**
- Voor datums, locaties, labels

### jobTitleSizePt
**KIES: 11**
- Iets groter dan body voor hiërarchie

### companySizePt
**KIES: 10-11**
- Zelfde als of iets kleiner dan jobTitle

---

## 📐 LINE & PARAGRAPH

### lineHeight
**KIES: 1.5**
- Optimaal voor leesbaarheid
- 1.4 minimum, 1.6 maximum

### paragraphSpacing
**KIES: 'normal'**

---

## 💪 FONT WEIGHTS

### headingWeight
**KIES: 'semibold' of 'bold'**
- 'semibold': Elegant, modern
- 'bold': Klassiek, krachtig

### bodyWeight
**KIES: 'normal'**
- Body text altijd normal weight

---

## 🔠 TEXT TRANSFORMS

### headingTransform
**KIES: 'none' of 'uppercase'**
- 'none': Natuurlijk, vriendelijk
- 'uppercase': Formeler, bij korte section names (max 12 karakters)`,

  balanced: (context, layout, header) => `Je bent een senior typografie-expert voor MODERNE PROFESSIONELE bedrijven. Typografie moet professioneel zijn met subtiele moderne touches.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Content Density: ${layout.contentDensity}
- Column Layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}

---

## 🔤 FONT FAMILIES

### headingFont
**KIES STRATEGISCH:**
- 'inter': Default moderne keuze, werkt overal
- 'roboto': Google-stijl, goed voor tech
- 'open-sans': Vriendelijk, toegankelijk
- 'lato': Elegant, professioneel
- 'montserrat': Modern, geometrisch (voor moderne bedrijven)

### bodyFont
**KIES: Complementair aan headingFont**
- 'inter': Universeel
- 'open-sans': Zeer leesbaar
- 'lato': Elegant
- 'nunito': Vriendelijk, zacht

---

## 📏 FONT SIZES

### headingSizePt
**KIES: 12-13**

### bodySizePt
**KIES: 10**

### smallTextSizePt
**KIES: 8-9**

### jobTitleSizePt
**KIES: 11-12**

### companySizePt
**KIES: 10-11**

---

## 📐 LINE & PARAGRAPH

### lineHeight
**KIES: 1.5**

### paragraphSpacing
**KIES: 'normal' of 'relaxed'**

---

## 💪 FONT WEIGHTS

### headingWeight
**KIES: 'semibold'** (modern standaard)

### bodyWeight
**KIES: 'normal'**

---

## 🔠 TEXT TRANSFORMS

### headingTransform
**KIES: 'none' of 'uppercase'**
- 'uppercase' met 'subtle' letter spacing werkt goed

---

## 🔧 EXTENDED FIELDS (Balanced niveau)

### sectionTitleLetterSpacing
**KIES: 'subtle'** (AANBEVOLEN)
- Voegt verfijning toe zonder overdreven te zijn

### bodyLetterSpacing
**KIES: 'normal'**

### headingUnderline
**KIES: 'none' of 'accent'**
- 'accent': Subtiele lijn in accent kleur

### headingStyle
**KIES: 'normal'**

### sectionTitleMarginBottom
**KIES: 'normal'**

### itemTitleMarginBottom
**KIES: 'tight' of 'normal'**

### useMutedDates
**KIES: true** (AANBEVOLEN)
- Datums in grijstint creëert visuele hiërarchie

### useMutedLocations
**KIES: true**

### bulletIndent
**KIES: 'normal'**

### bulletSpacing
**KIES: 'normal'**`,

  creative: (context, layout, header) => `Je bent een senior typografie-expert voor MODERNE TECH BEDRIJVEN. Typografie is een kans om persoonlijkheid te tonen terwijl je leesbaar blijft.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Content Density: ${layout.contentDensity}
- Experience Layout: ${'experienceLayout' in layout ? layout.experienceLayout : 'stacked'}

---

## 🔤 FONT FAMILIES

### headingFont
**KIES VOOR IMPACT:**
- 'inter': Premium moderne standaard
- 'montserrat': Geometrisch, modern, tech
- 'raleway': Elegant, design-forward
- 'poppins': Friendly, startup-vibe
- 'playfair': Serif voor creatieve rollen (STATEMENT)

### bodyFont
**KIES: Sans-serif voor leesbaarheid**
- 'inter': Universeel excellent
- 'open-sans': Zeer leesbaar
- 'work-sans': Modern, clean
- 'nunito': Zacht, vriendelijk

**TIP:** Contrast heading serif (playfair) met body sans-serif (inter)

---

## 📏 FONT SIZES

### headingSizePt
**KIES: 12-14**
- 14pt voor meer impact

### bodySizePt
**KIES: 10**

### smallTextSizePt
**KIES: 8-9**

### jobTitleSizePt
**KIES: 11-13**

### companySizePt
**KIES: 10-11**

---

## 📐 LINE & PARAGRAPH

### lineHeight
**KIES: 1.5-1.6**

### paragraphSpacing
**KIES: 'normal' of 'relaxed'**

---

## 💪 FONT WEIGHTS

### headingWeight
**KIES: 'semibold' of 'bold'**

### bodyWeight
**KIES: 'normal' of 'medium'**
- 'medium' voor meer presence

---

## 🔠 TEXT TRANSFORMS

### headingTransform
**KIES: 'uppercase'** met letter spacing (MODERN)

---

## 🔧 EXTENDED FIELDS

### sectionTitleLetterSpacing
**KIES: 'wide'** (bij uppercase) of **'subtle'**

### bodyLetterSpacing
**KIES: 'normal'**

### headingUnderline
**KIES: 'accent' of 'none'**

### headingStyle
**KIES: 'normal'**

### sectionTitleMarginBottom
**KIES: 'normal' of 'relaxed'**

### itemTitleMarginBottom
**KIES: 'tight'**

### useMutedDates
**KIES: true**

### useMutedLocations
**KIES: true**

### bulletIndent
**KIES: 'normal' of 'large'**

### bulletSpacing
**KIES: 'normal'**

---

## 🎨 CREATIVE FIELDS

### useDropCap
**KIES: false** (meestal) of **true** voor design CVs
- true: Grote eerste letter in summary

### dropCapStyle (als useDropCap=true)
**KIES: 'large' of 'colored'**

### accentFont
**KIES: 'same' of 'contrast'**
- 'contrast' bij serif heading + sans body

### highlightStyle
**KIES: 'none' of 'bold'**

### sectionTitleIcon
**KIES: true of false**
- true: Icons voor Experience 💼, Education 🎓, etc.

### sectionTitleBorder
**KIES: 'none', 'left', of 'bottom'**
- 'left': Accent lijn links van titel (modern)

### quoteStyle
**KIES: 'none' of 'border-left'**
- 'border-left': Voor summary als quote`,

  experimental: (context, layout, header) => `Je bent een cutting-edge typografie-expert voor CREATIEVE INDUSTRIEËN. Typografie IS design - maak het memorabel.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Naam grootte: ${header.nameSizePt}pt
- Content Density: ${layout.contentDensity}
- Experimental Features: ${'sectionNumbering' in layout ? layout.sectionNumbering : false}

---

## 🔤 FONT FAMILIES

### headingFont
**ALLE OPTIES - WEES BOLD:**
- 'playfair': Elegante serif - perfect voor design/creative
- 'merriweather': Klassieke serif met karakter
- 'montserrat': Geometrisch modern
- 'raleway': Ultra elegant
- 'poppins': Friendly modern

### bodyFont
**KIES COMPLEMENTAIR:**
- 'inter': Premium moderne standaard
- 'work-sans': Design-forward
- 'nunito': Zacht, leesbaar

---

## 📏 FONT SIZES

### headingSizePt
**KIES: 13-15**
- Grotere headings voor impact

### bodySizePt
**KIES: 10**

### smallTextSizePt
**KIES: 8-9**

### jobTitleSizePt
**KIES: 12-13**

### companySizePt
**KIES: 10-11**

---

## 📐 LINE & PARAGRAPH

### lineHeight
**KIES: 1.5-1.6**

### paragraphSpacing
**KIES: 'relaxed'**

---

## 💪 FONT WEIGHTS

### headingWeight
**KIES: 'bold'** voor statement

### bodyWeight
**KIES: 'normal' of 'medium'**

---

## 🔠 TEXT TRANSFORMS

### headingTransform
**KIES: 'uppercase'** met wide letter spacing (SIGNATURE LOOK)

---

## 🔧 EXTENDED FIELDS

### sectionTitleLetterSpacing
**KIES: 'wide' of 'extra-wide'**

### bodyLetterSpacing
**KIES: 'normal'**

### headingUnderline
**KIES: 'accent'**

### headingStyle
**KIES: 'normal' of 'italic'** (bij serif)

### sectionTitleMarginBottom
**KIES: 'relaxed'**

### itemTitleMarginBottom
**KIES: 'tight'**

### useMutedDates
**KIES: true**

### useMutedLocations
**KIES: true**

### bulletIndent
**KIES: 'large'**

### bulletSpacing
**KIES: 'relaxed'**

---

## 🎨 CREATIVE FIELDS

### useDropCap
**KIES: true** voor design CVs

### dropCapStyle
**KIES: 'decorative' of 'colored'**

### accentFont
**KIES: 'contrast'**

### highlightStyle
**KIES: 'background' of 'bold'**

### sectionTitleIcon
**KIES: true**

### sectionTitleBorder
**KIES: 'left' of 'box'**

### quoteStyle
**KIES: 'large-quotes' of 'border-left'**

---

## 🚀 EXPERIMENTAL FIELDS

### useVariableFonts
**KIES: true**
- Vloeiende gewichtstransities

### textRendering
**KIES: 'optimizeLegibility'**

### gradientHeadings
**KIES: true of false**
- true: Gradient op section headings (WOW effect)

### textShadow
**KIES: 'none' of 'subtle'**

### useOpticalSizing
**KIES: true**

### hangingPunctuation
**KIES: true**
- Cleaner margins

### useSmallCaps
**KIES: true**
- Voor labels en categorieën

### useOldstyleNumerals
**KIES: false** (meestal) of **true** voor editorial look`,
};

// =============================================================================
// STEP 4: COLORS PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type TypographyResult = z.infer<typeof baseTypographySchema> | z.infer<typeof extendedTypographySchema> | z.infer<typeof creativeTypographySchema> | z.infer<typeof experimentalTypographySchema>;

const colorsPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult, typography: TypographyResult) => string> = {
  conservative: (context, layout, header, typography) => `Je bent een senior kleurpalette-expert gespecialiseerd in TRADITIONELE sectoren: banken, overheid, verzekeraars, advocatenkantoren, accountancy, en corporate consultancy. Kleuren moeten vertrouwen en betrouwbaarheid uitstralen.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Heading font: ${typography.headingFont}
- Body font: ${typography.bodyFont}
- Content density: ${layout.contentDensity}

---

## 🎨 STYLE METADATA

### styleName
**CREATIEVE NAAM voor het kleurenschema (2-4 woorden)**
Voorbeelden:
- "Executive Navy" (blauw-gebaseerd, corporate)
- "Charcoal Authority" (grijs-gebaseerd, serieus)
- "Classic Slate" (neutraal, tijdloos)
- "Traditional Blue" (conservatief, betrouwbaar)

### industryFit
**INDUSTRIES waar dit palet past**
Noem 2-4 sectoren, bijv:
- "Finance, Banking, Investment"
- "Legal, Government, Non-profit"
- "Consulting, Accountancy, Insurance"
- "Healthcare Administration, Pharma Corporate"

### styleRationale
**UITLEG waarom dit kleurenschema past (1-2 zinnen)**
Leg uit hoe de kleuren:
- Passen bij de sector van de vacature
- De professionaliteit van de kandidaat onderstrepen
- Vertrouwen wekken bij de lezer

### formalityLevel
**KIES: 'formal'** (altijd voor conservative)
- 'formal' = Zeer traditioneel, geschikt voor boardrooms

---

## 🎨 CORE COLOR PALETTE

### primary (VERPLICHT)
**DONKERE kleur voor naam, headings, section titles**

**AANBEVOLEN PALETTEN:**

#### Finance / Banking / Insurance
- **Deep Navy**: #0f172a (bijna zwart navy)
- **Executive Blue**: #1e3a5f (klassiek corporate blauw)
- **Charcoal**: #1f2937 (neutraal donkergrijs)

#### Legal / Government / Non-profit
- **Classic Navy**: #1e3a8a (traditioneel navy)
- **Slate**: #334155 (neutraal, autoritair)
- **Dark Teal**: #134e4a (conservatief maar met persoonlijkheid)

#### Accountancy / Consulting
- **Steel Blue**: #1e40af (betrouwbaar, professioneel)
- **Graphite**: #374151 (neutraal, veelzijdig)

**REGELS:**
- MOET goed contrasteren met witte achtergrond
- MOET donker genoeg zijn voor leesbaarheid
- GEEN felle/levendige kleuren (rood, oranje, paars, roze)

### secondary (VERPLICHT)
**ZEER LICHTE achtergrondkleur (bijna wit)**

**FORMULE:** Neem primary en maak het 95-98% lichter:
- Navy primary → #f8fafc (light slate)
- Blue primary → #f0f9ff (sky-50)
- Gray primary → #f9fafb (gray-50)

**REGELS:**
- MOET bijna wit zijn (luminance > 0.95)
- SUBTIELE tint van primary (niet puur wit #ffffff)
- Wordt gebruikt voor cards, alternating sections

### accent (VERPLICHT)
**HELDERE versie van primary voor links, icons, highlights**

**FORMULE:** Zelfde hue als primary, maar helderder:
- #0f172a (deep navy) → #1e40af (bright navy)
- #1e3a5f (exec blue) → #2563eb (sky blue)
- #1f2937 (charcoal) → #475569 (slate-600)

**REGELS:**
- MOET uit dezelfde kleurfamilie als primary
- MOET goed zichtbaar zijn voor links
- Niet te fel (geen neon-achtige kleuren)

### text (VERPLICHT)
**KIES: #1e293b** (dark slate)
- Dit is DE standaard voor leesbare body text
- Iets zachter dan puur zwart (#000)
- Werkt met alle achtergronden

### muted (VERPLICHT)
**KIES: #64748b** (slate-500)
- Voor datums, locaties, labels, secundaire info
- Duidelijk onderscheid van main text
- Niet te licht (moet nog leesbaar zijn)

---

## 🌈 COLOR RELATIONSHIPS

### colorHarmony
**KIES: 'monochromatic'** (AANBEVOLEN voor conservative)
- 'monochromatic': Variaties van één kleur (meest conservatief, veilig)
- 'analogous': Acceptabel (blauw + teal bijv.)

**NOOIT voor conservative:**
- 'complementary', 'triadic', 'split-complementary' (te creatief/riskant)

### colorTemperature
**KIES: 'cool' of 'neutral'**
- 'cool': Blauw, grijs, teal (AANBEVOLEN - professioneel, betrouwbaar)
- 'neutral': Puur grijs-gebaseerd (zeer conservatief)

**NOOIT:**
- 'warm': Oranje, rood, bruin (te informeel voor traditionele sectoren)

### contrastLevel
**KIES: 'moderate'** (AANBEVOLEN)
- 'moderate': Duidelijke visuele hiërarchie zonder schreeuwend te zijn
- 'subtle': Acceptabel voor zeer conservatieve toepassingen

**VERMIJD:**
- 'high': Te dramatisch voor traditionele sectoren`,

  balanced: (context, layout, header, typography) => `Je bent een senior kleurpalette-expert voor MODERNE PROFESSIONELE bedrijven: tech enterprises, scale-ups, fintech, moderne consultancy, en corporate innovatie-afdelingen. De kleuren moeten modern én professioneel zijn.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Heading font: ${typography.headingFont}
- Body font: ${typography.bodyFont}
- Content density: ${layout.contentDensity}
- Column layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}

---

## 🎨 STYLE METADATA

### styleName
**CREATIEVE NAAM (2-4 woorden)**
Voorbeelden:
- "Modern Indigo" (tech-geïnspireerd)
- "Arctic Professional" (fris, clean)
- "Midnight Blue" (diep, premium)
- "Slate Tech" (neutraal met edge)
- "Ocean Professional" (teal-gebaseerd)

### industryFit
**INDUSTRIES waar dit palet past**
- "Tech, SaaS, Software Development"
- "Fintech, Digital Banking, InsurTech"
- "Healthcare Tech, BioTech, MedTech"
- "Modern Consulting, Strategy, Innovation"

### styleRationale
**UITLEG waarom dit past (1-2 zinnen)**
Focus op:
- Hoe de kleuren moderniteit uitstralen
- Hoe ze passen bij de bedrijfscultuur
- Hoe ze de kandidaat positioneren

### formalityLevel
**KIES: 'professional'** (standaard voor balanced)
- 'formal': Voor meer traditionele tech bedrijven (IBM, Oracle)
- 'professional': Voor de meeste moderne bedrijven

---

## 🎨 CORE COLOR PALETTE

### primary
**DONKERE kleur voor naam, headings, accents**

**AANBEVOLEN PALETTEN:**

#### Tech / SaaS / Software
- **Indigo**: #4f46e5 (modern, energiek)
- **Deep Blue**: #1e40af (klassiek tech)
- **Violet**: #5b21b6 (innovatief, creatief tech)
- **Slate**: #334155 (neutraal, veelzijdig)

#### Fintech / Digital Finance
- **Ocean Blue**: #0369a1 (betrouwbaar maar modern)
- **Teal**: #0f766e (fris, onderscheidend)
- **Navy Modern**: #1e3a8a (klassiek met moderne touch)

#### Healthcare Tech / BioTech
- **Teal**: #0d9488 (gezondheid, groei)
- **Sky Blue**: #0284c7 (clean, vertrouwenwekkend)
- **Emerald**: #047857 (leven, innovatie)

### secondary
**ZEER LICHTE achtergrondkleur**

**FORMULE:** Tint van primary op ~5% opacity:
- Indigo → #eef2ff (indigo-50)
- Blue → #f0f9ff (sky-50)
- Teal → #f0fdfa (teal-50)
- Slate → #f8fafc (slate-50)

### accent
**HELDERE highlight kleur**
Iets lichter/feller dan primary:
- #4f46e5 → #6366f1 (indigo-500)
- #1e40af → #3b82f6 (blue-500)
- #0d9488 → #14b8a6 (teal-400)

### text
**KIES: #1e293b** (standaard)

### muted
**KIES: #64748b** (standaard)

---

## 🌈 COLOR RELATIONSHIPS

### colorHarmony
**KIES: 'monochromatic' of 'analogous'**
- 'monochromatic': Veilig, professioneel (AANBEVOLEN)
- 'analogous': Blauw+paars, teal+blauw (modern, interessant)

### colorTemperature
**KIES: 'cool' of 'neutral'**
- 'cool': Blauw, paars, teal (meest voorkomend in tech)
- 'neutral': Grijs-gebaseerd (veilig, veelzijdig)

### contrastLevel
**KIES: 'moderate' of 'high'**
- 'moderate': Professioneel, gebalanceerd (AANBEVOLEN)
- 'high': Voor meer visuele impact

---

## 🔧 EXTENDED PALETTE (Balanced niveau)

### primaryLight (optioneel)
**Lichtere variant van primary voor hover states**
- Formule: primary met 20-30% meer luminance
- #1e40af → #3b82f6

### primaryDark (optioneel)
**Donkerdere variant voor extra emphasis**
- Formule: primary met 10-20% minder luminance
- #1e40af → #1e3a8a

### accentLight (optioneel)
**Lichtere accent voor subtiele highlights**
- #3b82f6 → #93c5fd

---

## 🎯 SEMANTIC COLORS

### linkColor (optioneel)
**Specifieke kleur voor hyperlinks**
- Default: accent
- Kan iets feller zijn voor duidelijkheid

### borderColor (optioneel)
**Standaard border kleur**
- Typisch: #e2e8f0 (slate-200) of tint van muted

### dividerColor (optioneel)
**Kleur voor section dividers**
- Kan subtiele tint van accent zijn
- Of: #e2e8f0 voor neutraal

---

## 🏠 BACKGROUND OPTIONS

### headerBackground (optioneel)
**Specifieke achtergrond voor header area**
- 'transparent' of secondary of lichte tint van primary

### sectionBackground (optioneel)
**Alternerende sectie achtergrond**
- Gebruik secondary of iets lichter

### cardBackground (optioneel)
**Achtergrond voor card-style elementen**
- #ffffff of zeer lichte tint

---

## 🌑 VISUAL DEPTH

### shadowColor (optioneel)
**Basis kleur voor schaduwen**
- Formaat: rgba(r, g, b, 0.1)
- Typisch: rgba(15, 23, 42, 0.08) (slate-gebaseerd)

### highlightColor (optioneel)
**Kleur voor highlighted/selected elementen**
- Lichte tint van accent met alpha
- bijv: rgba(99, 102, 241, 0.1)`,

  creative: (context, layout, header, typography) => `Je bent een senior kleurpalette-expert voor MODERNE TECH BEDRIJVEN en SCALE-UPS: SaaS, startups, tech unicorns, innovatieve agencies, en design-forward bedrijven. De kleuren mogen opvallen en persoonlijkheid tonen!

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Header accent: ${header.headerAccent}
- Heading font: ${typography.headingFont}
- Content density: ${layout.contentDensity}
- Experience layout: ${'experienceLayout' in layout ? layout.experienceLayout : 'stacked'}

---

## 🎨 STYLE METADATA

### styleName
**CREATIEVE, MEMORABELE NAAM (2-4 woorden)**
Voorbeelden:
- "Electric Indigo" (energiek, tech)
- "Sunset Gradient" (warm, creatief)
- "Midnight Violet" (premium, design)
- "Emerald Innovation" (groei, startup)
- "Arctic Frost" (fris, modern)
- "Neon Minimal" (bold, startup)

### industryFit
**INDUSTRIES waar dit palet past**
- "Tech Startups, SaaS, Web3"
- "Creative Agencies, Design Studios"
- "Product Design, UX/UI, Digital"
- "Marketing Tech, AdTech, Social Media"
- "Gaming, Entertainment Tech"

### styleRationale
**UITLEG met persoonlijkheid (1-2 zinnen)**
- Welk gevoel roept dit palet op?
- Hoe positioneert het de kandidaat?
- Waarom past het bij de target company culture?

### formalityLevel
**KIES: 'professional' of 'casual'**
- 'professional': Scale-ups, enterprise tech
- 'casual': Startups, creative agencies

---

## 🎨 CORE COLOR PALETTE

### primary
**DONKERE kleur met KARAKTER**

**UITGEBREIDE PALETTEN:**

#### Tech / Startups / SaaS
- **Indigo**: #4f46e5 (modern tech standaard)
- **Violet**: #6d28d9 (innovatief, creative tech)
- **Electric Blue**: #2563eb (energiek, betrouwbaar)
- **Deep Purple**: #7c3aed (premium, design-forward)

#### Creative / Design / Marketing
- **Emerald**: #059669 (groei, sustainability)
- **Rose**: #be185d (bold, creative)
- **Fuchsia**: #a21caf (adventurous, design)
- **Cyan**: #0891b2 (fris, digital)

#### Premium / Luxury Tech
- **Midnight**: #1e1b4b (ultra premium)
- **Dark Violet**: #4c1d95 (luxe, exclusief)

**⚠️ BANNER HEADER REGEL:**
Als headerStyle='banner' of 'full-width-accent':
- primary MOET donker genoeg zijn voor witte tekst
- Check contrast ratio > 4.5:1

### secondary
**SUBTIELE achtergrondkleur**
- Zeer lichte tint van primary (3-7% opacity effect)
- MOET wit genoeg blijven voor tekst leesbaarheid

### accent
**OPVALLENDE highlight kleur**
- Kan feller zijn dan bij conservative/balanced
- Moet nog steeds complementair zijn aan primary

### text
**KIES: #1e293b** of iets lichter #334155

### muted
**KIES: #64748b** of iets donkerder #475569

---

## 🌈 COLOR RELATIONSHIPS

### colorHarmony
**KIES: 'monochromatic', 'analogous', of 'complementary'**
- 'monochromatic': Veilig maar kan bij creative
- 'analogous': Mooie subtiele variatie (bijv. blauw + paars)
- 'complementary': Voor bold statements (voorzichtig!)

### colorTemperature
**KIES: 'cool', 'neutral', of 'warm'**
- 'cool': Blauw, paars, teal (tech standaard)
- 'warm': Oranje, amber, rose (creative agencies)
- 'neutral': Grijs met kleuraccenten

### contrastLevel
**KIES: 'moderate' of 'high'**
- 'moderate': Professioneel maar interessant
- 'high': Bold, statement-making

---

## 🔧 EXTENDED PALETTE

### primaryLight, primaryDark, accentLight
(Zelfde als balanced, maar mag meer contrast hebben)

### linkColor, borderColor, dividerColor
(Zelfde als balanced)

### headerBackground, sectionBackground, cardBackground
(Zelfde als balanced, maar mag meer kleur hebben)

### shadowColor, highlightColor
(Zelfde als balanced)

---

## 🌈 GRADIENT COLORS (Creative niveau)

### gradientStart (optioneel)
**Start kleur voor gradients**
- Typisch: primary of een variatie
- bijv: #4f46e5

### gradientEnd (optioneel)
**Eind kleur voor gradients**
- Typisch: accent of complementaire kleur
- bijv: #7c3aed (voor indigo → violet)

### gradientMiddle (optioneel)
**Midden kleur voor complexe gradients**
- Alleen voor drie-kleur gradients
- Moet smooth transitie maken

**GRADIENT VOORBEELDEN:**
- Indigo → Violet: #4f46e5 → #7c3aed
- Blue → Cyan: #2563eb → #06b6d4
- Emerald → Teal: #059669 → #0d9488
- Rose → Orange: #be185d → #ea580c

---

## 🎨 ACCENT VARIATIONS

### accentSecondary (optioneel)
**Tweede accent kleur voor visuele variatie**
- Complementair of analoog aan primary accent
- Kan gebruikt worden voor secondary highlights

### accentMuted (optioneel)
**Gedempte versie van accent**
- Voor subtiele highlights
- ~30% opacity effect

---

## ✨ SPECIAL EFFECTS

### glowColor (optioneel)
**Kleur voor glow effects**
- Formaat: rgba(r, g, b, 0.3)
- Typisch: accent kleur met alpha
- bijv: rgba(99, 102, 241, 0.3)

### overlayColor (optioneel)
**Kleur voor overlay effects**
- Formaat: rgba(r, g, b, 0.05)
- Subtiele tint voor achtergrond-overlays`,

  experimental: (context, layout, header, typography) => `Je bent een cutting-edge kleurpalette-expert voor CREATIEVE INDUSTRIEËN: design agencies, creative studios, digital innovators, en bedrijven waar visuele impact cruciaal is. De kleuren MOGEN opvallen en een statement maken!

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Header accent: ${header.headerAccent}
${'headerGradient' in header ? `- Header gradient: ${header.headerGradient}` : ''}
- Heading font: ${typography.headingFont}
- Content density: ${layout.contentDensity}
- Experimental features: ${'asymmetricLayout' in layout ? `asymmetric=${layout.asymmetricLayout}` : 'n/a'}

---

## 🎨 STYLE METADATA

### styleName
**BOLD, MEMORABELE NAAM (2-4 woorden)**
Voorbeelden:
- "Neon Dreams" (vibrant, futuristic)
- "Cosmic Purple" (space-inspired)
- "Sunset Blaze" (warm, energetic)
- "Aurora Borealis" (magical, premium)
- "Digital Sunset" (modern, warm tech)
- "Chromatic Bold" (maximalist)

### industryFit
**INDUSTRIES waar dit palet past**
- "Design Studios, Creative Agencies"
- "Gaming, Entertainment, Media"
- "Fashion Tech, Lifestyle Brands"
- "Art Direction, Brand Design"
- "Digital Art, NFT, Web3 Creative"

### styleRationale
**UITLEG met IMPACT (1-2 zinnen)**
- Welk gevoel/emotie roept dit op?
- Hoe maakt dit de kandidaat memorabel?
- Welke statement maakt dit over creativiteit?

### formalityLevel
**KIES: 'casual' of 'professional'**
- 'casual': Creative agencies, studios
- 'professional': Design-forward corporates

---

## 🎨 CORE COLOR PALETTE - VOLLEDIGE VRIJHEID

### primary
**STATEMENT KLEUR**

**ALLE PALETTEN BESCHIKBAAR:**

#### Vibrant Tech
- **Electric Violet**: #7c3aed
- **Hot Pink**: #ec4899
- **Neon Blue**: #0ea5e9
- **Cyber Green**: #10b981

#### Warm & Energetic
- **Sunset Orange**: #ea580c
- **Rose Gold**: #e11d48
- **Amber**: #d97706
- **Coral**: #f43f5e

#### Premium & Deep
- **Midnight Purple**: #4c1d95
- **Deep Emerald**: #047857
- **Rich Teal**: #0f766e
- **Burgundy**: #881337

#### Neutral with Edge
- **Graphite**: #18181b (zinc-900)
- **Charcoal Blue**: #1e293b

### secondary
**LICHTE COMPLEMENTAIRE ACHTERGROND**
- Mag meer kleur hebben dan bij andere niveaus
- Kan subtiele gradient tint hebben

### accent
**OPVALLENDE CONTRAST KLEUR**
- Mag complementair of analoog zijn
- MOET wel werken met primary

### text
**KIES: #1e293b, #18181b, of #0f172a**
(Mag iets donkerder voor meer contrast)

### muted
**KIES: #64748b of #71717a**

---

## 🌈 COLOR RELATIONSHIPS

### colorHarmony
**ALLE OPTIES BESCHIKBAAR:**
- 'monochromatic': Variaties van één kleur
- 'analogous': Naburige kleuren (blauw-paars-pink)
- 'complementary': Tegenovergestelde kleuren (paars-geel)
- 'triadic': Drie gelijk verdeelde kleuren
- 'split-complementary': Complementair met split

**VEILIGE COMBINATIES:**
- Violet + Gold (complementary)
- Blue + Orange (complementary)
- Teal + Coral (split-complementary)
- Pink + Emerald (complementary)

**VERMIJD:**
- Red + Green (kerst)
- Blue + Orange in gelijke hoeveelheden

### colorTemperature
**KIES: 'cool', 'warm', of 'neutral'**
- Alle opties toegestaan
- Consistency binnen het palet is belangrijk

### contrastLevel
**KIES: 'moderate', 'high', of 'subtle'**
- 'high': Voor maximum impact (AANBEVOLEN)
- 'moderate': Nog steeds professioneel
- 'subtle': Voor minimalist designs

---

## 🔧 EXTENDED + CREATIVE FIELDS

(Alle velden van balanced en creative niveau zijn beschikbaar)

### gradientStart, gradientEnd, gradientMiddle
**GRADIENT EXPERIMENTATIE:**
- Drie-kleur gradients toegestaan
- Kan meer dramatische overgangen hebben

### accentSecondary, accentMuted
**MEERDERE ACCENTEN:**
- Kan twee verschillende accent families hebben
- Meer visuele variatie toegestaan

### glowColor, overlayColor
**SPECIAL EFFECTS:**
- Kan meer intense glows hebben
- Overlay kan meer zichtbaar zijn

---

## 🚀 EXPERIMENTAL COLOR FEATURES

### colorMode
**KIES: 'light', 'dark', of 'auto'**
- 'light': Lichte achtergrond (standaard)
- 'dark': Donkere achtergrond met lichte tekst
- 'auto': Adaptief aan context

**⚠️ DARK MODE REGELS:**
Als colorMode='dark':
- secondary wordt donker (#0f172a, #18181b)
- text wordt licht (#f8fafc, #e2e8f0)
- primary/accent moeten genoeg contrast hebben

### saturationLevel
**KIES: 'muted', 'normal', of 'vivid'**
- 'muted': Gedempte, sophisticatede kleuren
- 'normal': Standaard verzadiging
- 'vivid': Levendige, intense kleuren (voor max impact)

---

## 🎨 ADVANCED PALETTE

### tertiaryColor (optioneel)
**Derde merkkleur voor complexe designs**
- Complementair aan primary en accent
- Voor extra visuele lagen

### quaternaryColor (optioneel)
**Vierde merkkleur (zeer zeldzaam)**
- Alleen voor maximalist designs
- Moet nog steeds harmoniëren

---

## 🧪 EXPERIMENTAL FEATURES

### useColorBlending
**KIES: true of false**
- true: Geavanceerde kleur-blend effecten (mix-blend-mode)
- Kan interessante overlaps creëren

### chromaticAbstraction
**KIES: 'none', 'subtle', of 'bold'**
- 'none': Geen abstractie
- 'subtle': Lichte kleurvariatie in grote vlakken
- 'bold': Opvallende kleurblokken en variatie

---

## 🎯 KLEUR HARMONIE PRINCIPES

**GOUDEN REGELS (ook voor experimental):**

1. **60-30-10 Regel:**
   - 60% dominant (secondary/achtergrond)
   - 30% secondary (primary/structuur)
   - 10% accent (highlights)

2. **Contrast voor leesbaarheid:**
   - Tekst moet ALTIJD leesbaar zijn
   - WCAG AA minimum (4.5:1 voor body text)

3. **Geen clashende kleuren:**
   - Vermijd primaire kleur combinaties (rood+geel+blauw)
   - Vermijd complementaire kleuren in gelijke hoeveelheden

4. **Consistency:**
   - Alle kleuren moeten uit hetzelfde "verhaal" komen
   - Random kleuren combineren werkt niet`,
};

// =============================================================================
// STEP 5: SKILLS PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type ColorsResult = z.infer<typeof baseColorsSchema> | z.infer<typeof extendedColorsSchema> | z.infer<typeof creativeColorsSchema> | z.infer<typeof experimentalColorsSchema>;

const skillsPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult, typography: TypographyResult, colors: ColorsResult) => string> = {
  conservative: (context, layout, header, typography, colors) => `Je bent een senior skills-weergave expert gespecialiseerd in TRADITIONELE sectoren: banken, overheid, verzekeraars, advocatenkantoren, accountancy. Skills moeten professioneel en overzichtelijk gepresenteerd worden - geen gimmicks.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Heading font: ${typography.headingFont}
- Body font: ${typography.bodyFont}
- Primary kleur: ${colors.primary}
- Stijl naam: ${colors.styleName}
- Content density: ${layout.contentDensity}

---

## 🎯 DISPLAY FORMAT

### skillDisplay
**KIES: 'tags' of 'list'**
- 'tags': Compacte inline weergave, ruimte-efficiënt, moderne maar professionele look
- 'list': Traditionele bullet-point opsomming, zeer formeel

**NOOIT voor conservative:**
- 'grid': Te creatief/modern
- 'bars': Te visueel/grafisch
- 'chips': Te casual/startup-achtig
- 'categories-with-icons': Te speels
- 'progress-dots': Te grafisch

### skillTagVariant
**KIES: 'outlined' of 'ghost'**
- 'outlined': Clean borders, professioneel (AANBEVOLEN)
- 'ghost': Zeer subtiel, ultra-minimalistisch

**NOOIT voor conservative:**
- 'filled': Te bold/opvallend
- 'gradient': Veel te creatief

---

## 📐 LAYOUT OPTIONS

### skillColumns
**KIES: 'auto' of '2'**
- 'auto': Laat browser optimale verdeling bepalen
- '2': Twee kolommen voor gestructureerd overzicht

### skillAlignment
**KIES: 'left'**
- Links uitlijnen is de professionele standaard
- NOOIT 'center' of 'justify' voor traditionele sectoren

---

## 📋 ORDERING & GROUPING

### skillSortOrder
**KIES: 'by-relevance' of 'as-provided'**
- 'by-relevance': Meest relevante skills eerst (AANBEVOLEN)
- 'as-provided': Volg volgorde van LinkedIn profiel
- VERMIJD 'alphabetical' (lijkt lui/onpersoonlijk)

### showSkillCount
**KIES: false**
- Skill count tonen is niet professioneel voor traditionele sectoren
- De recruiter kan zelf tellen

---

## 📏 VISUAL SPACING

### skillGap
**KIES: 'normal'**
- Gebalanceerde ruimte tussen skills
- 'tight' alleen bij veel skills en weinig ruimte

### skillSectionSpacing
**KIES: 'normal'**
- Consistente spacing met rest van CV`,

  balanced: (context, layout, header, typography, colors) => `Je bent een senior skills-weergave expert voor MODERNE PROFESSIONELE bedrijven: tech enterprises, scale-ups, fintech, moderne consultancy. Skills moeten modern maar professioneel gepresenteerd worden.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Heading font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Accent kleur: ${colors.accent}
- Stijl naam: ${colors.styleName}
- Content density: ${layout.contentDensity}
- Column layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}

---

## 🎯 DISPLAY FORMAT

### skillDisplay
**KIES: 'tags' of 'chips'**
- 'tags': Klassieke skill tags, altijd professioneel (AANBEVOLEN)
- 'chips': Afgeronde pill-shaped tags, modern UI gevoel

**ACCEPTABEL maar voorzichtig:**
- 'grid': Voor tech rollen met veel skills

### skillTagVariant
**KIES: 'outlined' of 'filled'**
- 'outlined': Clean borders, transparante achtergrond (AANBEVOLEN)
- 'filled': Gevulde achtergrond met accent kleur, meer visuele impact

---

## 📐 LAYOUT OPTIONS

### skillColumns
**KIES: 'auto', '2', of '3'**
- 'auto': Flexibele verdeling
- '2': Gestructureerd voor middelmatige skill counts
- '3': Voor zeer veel skills

### skillAlignment
**KIES: 'left' of 'justify'**
- 'left': Veilig, professioneel
- 'justify': Nettere uitlijning bij veel skills

---

## 📋 ORDERING & GROUPING

### skillSortOrder
**KIES: 'by-relevance'** (AANBEVOLEN)
- Zet meest relevante skills voor de vacature bovenaan

### showSkillCount
**KIES: false** (meestal) of **true** als kandidaat 20+ skills heeft
- "27 Skills" kan indrukwekkend zijn voor senior rollen

---

## 📏 VISUAL SPACING

### skillGap
**KIES: 'normal' of 'relaxed'**
- 'relaxed' geeft meer ademruimte

### skillSectionSpacing
**KIES: 'normal'**

---

## 🏷️ CATEGORY STYLING (Balanced niveau)

### skillCategoryStyle
**KIES: 'header' of 'badge'**
- 'header': Categorie naam als header boven skills (AANBEVOLEN)
  - "Technical Skills" / "Soft Skills" / "Tools & Frameworks"
- 'badge': Categorie als kleine badge naast skills
- 'divider': Simpele lijn tussen categorieën
- 'sidebar': Categorieën in linker kolom (bij sidebar layout)

### categoryOrder (optioneel)
**AANBEVOLEN VOLGORDE:**
- Voor tech: ["Technical", "Tools", "Frameworks", "Soft Skills"]
- Voor business: ["Business", "Technical", "Soft Skills"]

### showCategoryIcons
**KIES: false** (meestal) of **true** voor moderne tech bedrijven
- true: 💻 Technical, 🛠️ Tools, 🤝 Soft Skills

---

## 🎨 TAG STYLING

### skillTagSize
**KIES: 'normal'**
- Consistente grootte werkt het beste

### skillTagShape
**KIES: 'rounded' of 'pill'**
- 'rounded': Licht afgeronde hoeken (professioneel)
- 'pill': Volledig afgerond (moderner)

### skillTagBorderWidth
**KIES: 'thin'** voor outlined variant
- Subtiele border is eleganter

---

## 💼 SOFT SKILLS STYLING

### softSkillsStyle
**KIES: 'same' of 'italic'**
- 'same': Zelfde stijl als technical - geen onderscheid
- 'italic': Cursief voor subtiel visueel onderscheid
- 'muted': Lichtere kleur voor secundair belang

### softSkillsPosition
**KIES: 'after-technical' of 'mixed'**
- 'after-technical': Duidelijke scheiding (AANBEVOLEN)
- 'mixed': Alle skills door elkaar (voor generalist rollen)

---

## 📊 PROFICIENCY INDICATORS

### showProficiencyLevel
**KIES: false** (AANBEVOLEN voor balanced)
- Proficiency levels zijn subjectief en kunnen averechts werken
- Als true: alleen voor zeer technische rollen

### proficiencyStyle (als showProficiencyLevel=true)
**KIES: 'labels'**
- 'labels': "Expert", "Advanced", "Intermediate"
- VERMIJD: 'dots', 'bars' (te grafisch voor balanced)

### proficiencyScale
**KIES: '3'**
- Expert / Advanced / Intermediate is voldoende`,

  creative: (context, layout, header, typography, colors) => `Je bent een senior skills-weergave expert voor MODERNE TECH BEDRIJVEN en SCALE-UPS: SaaS, startups, tech unicorns, innovatieve agencies. Skills mogen visueel opvallen en creativiteit tonen!

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Header accent: ${header.headerAccent}
- Heading font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Accent kleur: ${colors.accent}
- Stijl naam: ${colors.styleName}
- Color temperature: ${colors.colorTemperature}

---

## 🎯 DISPLAY FORMAT

### skillDisplay
**KIES VOOR IMPACT:**
- 'tags': Klassiek maar effectief
- 'chips': Modern UI gevoel (AANBEVOLEN voor tech)
- 'grid': Gestructureerd overzicht, goed voor veel skills
- 'categories-with-icons': Visueel rijker met iconen

### skillTagVariant
**KIES: 'outlined', 'filled', of 'gradient'**
- 'outlined': Clean en professioneel
- 'filled': Bold, gevulde achtergrond
- 'gradient': Premium gradient effect (voor creative niveau)

---

## 📐 LAYOUT OPTIONS

### skillColumns
**KIES: '2', '3', of 'auto'**
- '3': Efficient voor veel skills
- '2': Meer ruimte per skill

### skillAlignment
**KIES: 'left' of 'center'**
- 'center': Kan werken bij centered header

---

## 📋 ORDERING & GROUPING

### skillSortOrder
**KIES: 'by-relevance'** (AANBEVOLEN)

### showSkillCount
**KIES: true of false**
- true kan goed werken voor senior tech rollen

---

## 📏 VISUAL SPACING

### skillGap
**KIES: 'normal' of 'relaxed'**

### skillSectionSpacing
**KIES: 'normal' of 'spacious'**

---

## 🏷️ CATEGORY STYLING

### skillCategoryStyle
**KIES: 'header', 'badge', of 'sidebar'**
- 'badge': Moderne look met category badges

### categoryOrder
**AANBEVOLEN VOOR TECH:**
["Languages", "Frameworks", "Tools", "Cloud", "Soft Skills"]

### showCategoryIcons
**KIES: true** (AANBEVOLEN)
- Voegt visuele interesse toe

---

## 🎨 TAG STYLING

### skillTagSize
**KIES: 'normal' of 'compact'**
- 'compact' voor veel skills

### skillTagShape
**KIES: 'pill'** (modern)

### skillTagBorderWidth
**KIES: 'thin' of 'none'**

---

## 💼 SOFT SKILLS STYLING

### softSkillsStyle
**KIES: 'italic', 'separate-section', of 'hidden'**
- 'italic': Subtiel onderscheid
- 'separate-section': Duidelijke scheiding
- 'hidden': Voor pure tech rollen waar soft skills minder relevant zijn

### softSkillsPosition
**KIES: 'separate-section' of 'after-technical'**

---

## 📊 PROFICIENCY INDICATORS

### showProficiencyLevel
**KIES: true of false**
- true: Voor senior tech rollen met duidelijke expertise niveaus

### proficiencyStyle
**KIES: 'dots' of 'bars'**
- 'dots': ●●●○○ - clean en modern
- 'bars': Visuele progress bars

### proficiencyScale
**KIES: '5'** (standaard)

---

## 🎨 ADVANCED GROUPING (Creative niveau)

### skillGrouping
**KIES: 'by-category' of 'by-proficiency'**
- 'by-category': Groepeer per type (Technical, Tools, etc.)
- 'by-proficiency': Groepeer per niveau (Expert, Advanced, etc.)

### groupStyle
**KIES: 'sections' of 'columns'**
- 'sections': Verticale secties per groep
- 'columns': Horizontale kolommen per groep

---

## ⭐ VISUAL ENHANCEMENTS

### skillHighlight
**KIES: 'top-skills' of 'relevant-skills'**
- 'top-skills': Highlight top 5 skills
- 'relevant-skills': Highlight skills die matchen met vacature

### highlightStyle
**KIES: 'bold', 'colored', of 'starred'**
- 'bold': Dikgedrukte text
- 'colored': Accent kleur
- 'starred': ⭐ prefix

### highlightCount
**KIES: 3-5**
- 3-5 highlighted skills is optimaal

---

## 🎨 ICONS & IMAGERY

### useSkillIcons
**KIES: true of false**
- true: Toont tech icons (React, Python, AWS etc.)

### iconSource
**KIES: 'simple-icons' of 'emoji'**
- 'simple-icons': Professionele brand icons
- 'emoji': Fun emoji icons (💻 🐍 ☁️)

### iconPosition
**KIES: 'before'**
- Icons voor de skill naam

---

## ✨ EFFECTS

### skillHoverEffect
**KIES: 'none' of 'lift'**
- 'lift': Subtiele lift on hover (voor web CVs)

### tagGradientDirection (bij gradient variant)
**KIES: 'horizontal' of 'diagonal'**`,

  experimental: (context, layout, header, typography, colors) => `Je bent een cutting-edge skills-weergave expert voor CREATIEVE INDUSTRIEËN: design agencies, creative studios, gaming, entertainment. Skills mogen visueel spectaculair zijn en een statement maken!

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Header accent: ${header.headerAccent}
${'headerGradient' in header ? `- Header gradient: ${header.headerGradient}` : ''}
- Heading font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl naam: ${colors.styleName}
- Formality level: ${colors.formalityLevel}

---

## 🎯 DISPLAY FORMAT - VOLLEDIGE VRIJHEID

### skillDisplay
**ALLE OPTIES BESCHIKBAAR:**
- 'tags': Klassieke skill tags
- 'chips': Moderne pill-shaped tags
- 'grid': Gestructureerd grid
- 'bars': Progress bars met niveau
- 'categories-with-icons': Gegroepeerd met iconen
- 'progress-dots': Stipjes voor niveau (●●●○○)

### skillTagVariant
**KIES: 'filled' of 'gradient'** voor maximale visuele impact
- 'gradient' met accent kleuren is premium

---

## 📐 LAYOUT OPTIONS

### skillColumns
**KIES: '2', '3', '4', of 'auto'**
- '4' voor compacte skill clouds

### skillAlignment
**KIES: 'left', 'center', of 'justify'**
- Alle opties toegestaan

---

## 📋 ORDERING & GROUPING

### skillSortOrder
**KIES: 'by-relevance'** (AANBEVOLEN)

### showSkillCount
**KIES: true** voor indrukwekkende skill counts

---

## 📏 VISUAL SPACING

### skillGap
**KIES: 'normal' of 'tight'**

### skillSectionSpacing
**KIES: 'normal' of 'spacious'**

---

## 🏷️ CATEGORY STYLING

### skillCategoryStyle
**KIES: 'badge'** (visueel distinctief)

### categoryOrder
Pas aan op basis van rol

### showCategoryIcons
**KIES: true**

---

## 🎨 TAG STYLING

### skillTagSize
**KIES: 'normal' of 'large'**

### skillTagShape
**KIES: 'pill' of 'rounded'**

### skillTagBorderWidth
**KIES: 'none' of 'thin'**

---

## 💼 SOFT SKILLS STYLING

### softSkillsStyle
**KIES AFHANKELIJK VAN ROL:**
- 'separate-section': Voor rollen waar soft skills belangrijk zijn
- 'italic': Subtiel onderscheid
- 'hidden': Voor pure tech/design rollen

### softSkillsPosition
**KIES: 'separate-section' of 'after-technical'**

---

## 📊 PROFICIENCY INDICATORS

### showProficiencyLevel
**KIES: true** (AANBEVOLEN voor experimental)

### proficiencyStyle
**KIES: 'dots', 'bars', of 'percentage'**
- 'bars' met gradient is zeer visueel

### proficiencyScale
**KIES: '5'** (standaard) of **'10'** voor meer granulariteit

---

## 🎨 ADVANCED GROUPING

### skillGrouping
**KIES: 'by-category', 'by-proficiency', of 'by-type'**

### groupStyle
**KIES: 'sections', 'columns', of 'accordion'**
- 'accordion': Uitklapbare categorieën (voor web CVs)

---

## ⭐ VISUAL ENHANCEMENTS

### skillHighlight
**KIES: 'top-skills' of 'relevant-skills'**

### highlightStyle
**KIES: 'colored', 'starred', of 'badge'**
- 'badge': Premium badge effect

### highlightCount
**KIES: 3-5**

---

## 🎨 ICONS & IMAGERY

### useSkillIcons
**KIES: true**

### iconSource
**KIES: 'simple-icons'** (brand icons)

### iconPosition
**KIES: 'before' of 'above'**
- 'above' voor grid layouts

---

## ✨ EFFECTS

### skillHoverEffect
**KIES: 'lift', 'highlight', of 'scale'**

### tagGradientDirection
**KIES: 'diagonal'** voor dynamische gradients

---

## 🚀 EXPERIMENTAL FEATURES

### skillCloud
**KIES: true of false**
- true: Skills als word cloud (zeer creatief)

### cloudWeighting
**KIES: 'by-proficiency' of 'by-relevance'**
- Grotere skills = meer expertise/relevantie

---

## 🔄 INTERACTIVE FEATURES (Web CVs)

### collapsibleCategories
**KIES: true of false**
- true: Uitklapbare categorieën

### skillFiltering
**KIES: true of false**
- true: Filter buttons per categorie

---

## 🏆 ENDORSEMENTS & VALIDATION

### showEndorsements
**KIES: true of false**
- true: Toon LinkedIn endorsement counts

### showCertifications
**KIES: true of false**
- true: Link skills aan certificeringen

---

## 🎨 CUSTOM STYLING

### customTagColors
**KIES: true of false**
- true: Verschillende kleuren per categorie

### categoryColorMap (als customTagColors=true)
**VOORBEELD:**
{
  "Languages": "#3b82f6",
  "Frameworks": "#8b5cf6",
  "Tools": "#10b981"
}

---

## 📅 METRICS & DATA

### showYearsExperience
**KIES: true of false**
- true: Toon jaren ervaring per skill

### yearsDisplayStyle
**KIES: 'inline', 'badge', of 'tooltip'**
- 'badge': "5+ years" badge
- 'inline': "Python (8 yrs)"

---

## 🔮 CREATIVE LAYOUTS

### radialLayout
**KIES: false** (meestal)
- true: Circulaire skill layout (zeer experimenteel)

### skillMatrix
**KIES: false** (meestal)
- true: Matrix van category vs proficiency`,
};

// =============================================================================
// STEP 6: DETAILS PROMPTS PER CREATIVITY LEVEL
// =============================================================================

type SkillsResult = z.infer<typeof baseSkillsSchema> | z.infer<typeof extendedSkillsSchema> | z.infer<typeof creativeSkillsSchema> | z.infer<typeof experimentalSkillsSchema>;

const detailsPrompts: Record<StyleCreativityLevel, (context: string, layout: LayoutResult, header: HeaderResult, typography: TypographyResult, colors: ColorsResult, skills: SkillsResult) => string> = {
  conservative: (context, layout, header, typography, colors, skills) => `Je bent een senior detail-expert gespecialiseerd in TRADITIONELE sectoren: banken, overheid, verzekeraars, advocatenkantoren. De finishing touches moeten de professionele uitstraling versterken zonder af te leiden.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Heading font: ${typography.headingFont}
- Body font: ${typography.bodyFont}
- Primary kleur: ${colors.primary}
- Stijl naam: ${colors.styleName}
- Skills display: ${skills.skillDisplay}
- Content density: ${layout.contentDensity}

---

## 🎨 ITEM STYLING

### itemStyle
**KIES: 'inline' of 'card-subtle'**
- 'inline': Geen decoratie, pure tekst - meest conservatief, 100% ATS-compatibel
- 'card-subtle': Zeer lichte achtergrond achter items - subtiel maar professioneel

**NOOIT voor conservative:**
- 'accent-left': Te modern/creatief
- 'timeline': Te visueel
- 'numbered': Te onconventioneel

### cornerStyle
**KIES: 'sharp'**
- Scherpe hoeken zijn professioneel en traditioneel
- 'rounded' is te casual voor traditionele sectoren

### intensity
**KIES: 'subtle'** (ALTIJD)
- Subtiele decoraties ondersteunen content zonder af te leiden

---

## 🔲 BORDERS & BACKGROUNDS

### useBorders
**KIES: false**
- Borders kunnen goedkoop of gedateerd ogen
- Laat witruimte het werk doen

### useBackgrounds
**KIES: false**
- Gekleurde achtergronden zijn niet professioneel voor traditionele sectoren

### borderStyle (als useBorders=true, wat niet aanbevolen is)
**KIES: 'solid'**
- De enige acceptabele optie

---

## 🎯 ICONS

### iconStyle
**KIES: 'none' of 'minimal'**
- 'none': Ultra-conservatief, puur tekst
- 'minimal': Zeer subtiele iconen voor contact info

### iconColor
**KIES: 'muted' of 'inherit'**
- Iconen mogen niet opvallen

---

## 📝 SUMMARY SECTION

### summaryFormat
**KIES: 'paragraph'**
- Traditionele alinea-vorm
- VERMIJD 'bullets' of 'highlights' voor conservative

### summaryAlignment
**KIES: 'left' of 'justify'**
- 'justify' voor formele documenten
- 'left' is ook acceptabel

---

## 📅 DATE & LOCATION STYLING

### dateStyle
**KIES: 'normal' of 'muted'**
- 'normal': Standaard tekst
- 'muted': Iets lichter grijs voor hiërarchie

### locationStyle
**KIES: 'normal' of 'muted'**
- Locatie moet leesbaar maar niet prominent zijn`,

  balanced: (context, layout, header, typography, colors, skills) => `Je bent een senior detail-expert voor MODERNE PROFESSIONELE bedrijven: tech enterprises, scale-ups, fintech, moderne consultancy. De details moeten modern maar professioneel zijn.

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Heading font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Accent kleur: ${colors.accent}
- Stijl naam: ${colors.styleName}
- Skills display: ${skills.skillDisplay}
- Column layout: ${'columnLayout' in layout ? layout.columnLayout : 'single'}

---

## 🎨 ITEM STYLING

### itemStyle
**KIES: 'card-subtle' of 'accent-left'**
- 'card-subtle': Zeer lichte achtergrond - modern, clean (denk: Notion, Linear)
- 'accent-left': Gekleurde lijn links - tech-geïnspireerd

### cornerStyle
**KIES: 'rounded'** (AANBEVOLEN)
- Licht afgeronde hoeken zijn modern en vriendelijk
- 'sharp' voor traditionelere tech bedrijven

### intensity
**KIES: 'subtle' of 'moderate'**
- 'subtle' voor professionele tech
- 'moderate' voor meer visuele impact

---

## 🔲 BORDERS & BACKGROUNDS

### useBorders
**KIES: false** (meestal)
- Clean design zonder borders werkt het beste

### useBackgrounds
**KIES: false** (meestal)
- Backgrounds worden al geregeld via itemStyle

### borderStyle
**KIES: 'solid'** (als nodig)

---

## 🎯 ICONS

### iconStyle
**KIES: 'minimal' of 'outlined'**
- 'minimal': Subtiele lijn-iconen
- 'outlined': Iets dikker maar nog steeds clean

### iconColor
**KIES: 'muted' of 'accent'**
- 'muted': Subtiel, professioneel
- 'accent': Voor meer visuele interesse

---

## 📝 SUMMARY SECTION

### summaryFormat
**KIES: 'paragraph' of 'highlights'**
- 'highlights' met bold keywords kan effectief zijn

### summaryAlignment
**KIES: 'left'**

---

## 📅 DATE & LOCATION STYLING

### dateStyle
**KIES: 'muted'** (AANBEVOLEN)
- Iets lichtere kleur creëert hiërarchie

### locationStyle
**KIES: 'muted' of 'with-icon'**
- 'with-icon': Klein location pin icoon

---

## 🔧 EXTENDED DETAILS (Balanced niveau)

### itemBorderWidth
**KIES: 'thin'** (bij accent-left)
- 2px lijn is subtiel maar zichtbaar

### itemBorderColor
**KIES: 'accent' of 'muted'**

### itemSpacing
**KIES: 'normal'**

---

## 📄 SUMMARY ENHANCEMENTS

### summaryStyle
**KIES: 'border-left' of 'background'**
- 'border-left': Clean accent lijn - AANBEVOLEN
- 'background': Subtiele card achtergrond

### summaryQuoteStyle
**KIES: 'none'**
- Quote marks zijn te decoratief voor balanced

---

## 🌑 SHADOW & DEPTH

### itemShadow
**KIES: 'none' of 'subtle'**
- 'subtle': Zeer lichte schaduw voor depth

### cardElevation
**KIES: 'flat' of 'raised'**
- 'raised': Subtiele elevatie

---

## 📋 EXPERIENCE DETAILS

### companyLogoSize
**KIES: 'none' of 'small'**
- Logo's kunnen afleiden tenzij zeer subtiel

### showJobType
**KIES: true of false**
- true: Voor contracten/freelance rollen

### bulletPointStyle
**KIES: 'disc' of 'arrow'**
- 'disc': Klassiek
- 'arrow': Modern

---

## ➖ DIVIDERS

### sectionDividerStyle
**KIES: 'line' of 'none'**
- 'line': Simpele horizontale lijn

### dividerWidth
**KIES: 'partial' of 'full'**

---

## 🔗 LINKS

### linkStyle
**KIES: 'color' of 'subtle'**
- Links moeten herkenbaar zijn zonder te schreeuwen

### showLinkIcons
**KIES: false** (meestal)`,

  creative: (context, layout, header, typography, colors, skills) => `Je bent een senior detail-expert voor MODERNE TECH BEDRIJVEN en SCALE-UPS: SaaS, startups, tech unicorns. De details mogen creativiteit en vakmanschap tonen!

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Header accent: ${header.headerAccent}
- Heading font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Accent kleur: ${colors.accent}
- Stijl naam: ${colors.styleName}
- Skills display: ${skills.skillDisplay}
- Skill tag variant: ${skills.skillTagVariant}

---

## 🎨 ITEM STYLING

### itemStyle
**KIES: 'card-subtle', 'accent-left', of 'timeline'**
- 'card-subtle': Moderne card look
- 'accent-left': Gekleurde accent lijn (AANBEVOLEN voor tech)
- 'timeline': Verbonden tijdlijn (voor lange carrières)

### cornerStyle
**KIES: 'rounded' of 'pill'**
- 'rounded': Modern, vriendelijk
- 'pill': Zeer afgerond, startup-vibe

### intensity
**KIES: 'subtle' of 'moderate'**
- 'moderate' voor meer visual impact

---

## 🔲 BORDERS & BACKGROUNDS

### useBorders
**KIES: false** (meestal)

### useBackgrounds
**KIES: false** (meestal)

### borderStyle
**KIES: 'solid'**

---

## 🎯 ICONS

### iconStyle
**KIES: 'minimal', 'outlined', of 'duotone'**
- 'duotone': Tweekleurige iconen - premium look

### iconColor
**KIES: 'accent'**
- Iconen in accent kleur voegen visuele interesse toe

---

## 📝 SUMMARY SECTION

### summaryFormat
**KIES: 'paragraph' of 'highlights'**

### summaryAlignment
**KIES: 'left'**

---

## 📅 DATE & LOCATION STYLING

### dateStyle
**KIES: 'muted' of 'badge'**
- 'badge': Datum als kleine badge

### locationStyle
**KIES: 'with-icon'**

---

## 🔧 EXTENDED DETAILS

### itemBorderWidth
**KIES: 'thin' of 'normal'**
- 'normal' voor meer visuele impact

### itemBorderColor
**KIES: 'accent'**

### itemSpacing
**KIES: 'normal' of 'relaxed'**

---

## 📄 SUMMARY ENHANCEMENTS

### summaryStyle
**KIES: 'border-left', 'border-left-gradient', of 'card'**
- 'border-left-gradient': Premium gradient accent

### summaryQuoteStyle
**KIES: 'none' of 'opening'**

---

## 🌑 SHADOW & DEPTH

### itemShadow
**KIES: 'subtle' of 'layered'**
- 'layered': Apple-stijl gestapelde schaduwen

### cardElevation
**KIES: 'raised' of 'floating'**

---

## 📋 EXPERIENCE DETAILS

### companyLogoSize
**KIES: 'small'** (indien beschikbaar)

### showJobType
**KIES: true** voor variatie

### bulletPointStyle
**KIES: 'arrow' of 'check'**
- 'check': ✓ voor accomplishments

---

## ➖ DIVIDERS

### sectionDividerStyle
**KIES: 'gradient' of 'fade'**
- Moderne gradient dividers

### dividerWidth
**KIES: 'partial'**
- Niet full-width is eleganter

---

## 🔗 LINKS

### linkStyle
**KIES: 'color'**

### showLinkIcons
**KIES: true**
- Kleine iconen bij links

---

## ✨ CREATIVE DETAILS

### hoverEffects
**KIES: true of false**
- true voor web CVs

### microAnimations
**KIES: false** (meestal)
- Animaties zijn afleidend in CVs

---

## 📊 TIMELINE FEATURES

### timelineStyle
**KIES: 'dots' of 'line'**
- 'dots': Stippen bij elke rol
- 'line': Verbindende lijn

### timelineColor
**KIES: 'accent'**

---

## ⭐ HIGHLIGHTS & EMPHASIS

### achievementStyle
**KIES: 'bold' of 'colored'**
- Highlight belangrijke achievements

### keywordHighlighting
**KIES: true of false**
- true: Highlight relevante keywords

### highlightColor
**KIES: 'accent' of 'subtle-accent'**

---

## 🎴 CARDS

### cardStyle
**KIES: 'minimal' of 'bordered'**

### cardHoverEffect
**KIES: 'lift'** (voor web)

---

## 📊 HIERARCHY

### titleEmphasis
**KIES: 'bold' of 'colored'**

### companyEmphasis
**KIES: 'normal' of 'muted'**
- Muted laat job title prominenter zijn

---

## 📈 PROGRESS BARS

### useProgressBars
**KIES: false** (meestal)
- Alleen voor duidelijke metrics

### progressBarStyle
**KIES: 'gradient'** (als gebruikt)`,

  experimental: (context, layout, header, typography, colors, skills) => `Je bent een cutting-edge detail-expert voor CREATIEVE INDUSTRIEËN: design agencies, creative studios, gaming, entertainment. De details MOGEN een statement maken en vakmanschap tonen!

${context}

## Huidige Design Context:
- Header stijl: ${header.headerStyle}
- Header accent: ${header.headerAccent}
${'headerGradient' in header ? `- Header gradient: ${header.headerGradient}` : ''}
- Heading font: ${typography.headingFont}
- Primary kleur: ${colors.primary}
- Stijl naam: ${colors.styleName}
- Skills display: ${skills.skillDisplay}
- Formality level: ${colors.formalityLevel}

---

## 🎨 ITEM STYLING - VOLLEDIGE VRIJHEID

### itemStyle
**ALLE OPTIES BESCHIKBAAR:**
- 'inline': Clean, minimalist
- 'card-subtle': Subtiele kaarten
- 'accent-left': Gekleurde accent lijn
- 'timeline': Verbonden tijdlijn
- 'numbered': Genummerde items (01, 02, 03)

### cornerStyle
**KIES: 'rounded' of 'pill'**

### intensity
**KIES: 'moderate' of 'bold'**
- 'bold' voor maximum visual impact

---

## 🔲 BORDERS & BACKGROUNDS

### useBorders
**KIES: true of false**

### useBackgrounds
**KIES: true of false**

### borderStyle
**KIES: 'solid', 'dashed', of 'dotted'**

---

## 🎯 ICONS

### iconStyle
**KIES: 'filled' of 'duotone'**
- Maximum visuele impact

### iconColor
**KIES: 'accent' of 'primary'**

---

## 📝 SUMMARY SECTION

### summaryFormat
**KIES: 'paragraph', 'bullets', of 'highlights'**

### summaryAlignment
**KIES: 'left' of 'justify'**

---

## 📅 DATE & LOCATION STYLING

### dateStyle
**KIES: 'badge' of 'pill'**
- Visueel interessante datum weergave

### locationStyle
**KIES: 'with-icon'**

---

## 🔧 EXTENDED DETAILS

### itemBorderWidth
**KIES: 'normal' of 'thick'**

### itemBorderColor
**KIES: 'accent'**

### itemSpacing
**KIES: 'relaxed'**

---

## 📄 SUMMARY ENHANCEMENTS

### summaryStyle
**KIES: 'border-left-gradient', 'quote', of 'card'**
- 'quote': Met quote marks

### summaryQuoteStyle
**KIES: 'both'**
- Opening én closing quotes

---

## 🌑 SHADOW & DEPTH

### itemShadow
**KIES: 'layered'**

### cardElevation
**KIES: 'floating'**

---

## 📋 EXPERIENCE DETAILS

### companyLogoSize
**KIES: 'small' of 'medium'**

### showJobType
**KIES: true**

### bulletPointStyle
**KIES: 'check' of 'custom'**

---

## ➖ DIVIDERS

### sectionDividerStyle
**KIES: 'gradient', 'dots', of 'fade'**

### dividerWidth
**KIES: 'partial'**

---

## 🔗 LINKS

### linkStyle
**KIES: 'both'**

### showLinkIcons
**KIES: true**

---

## ✨ CREATIVE DETAILS

### hoverEffects
**KIES: true**

### microAnimations
**KIES: true of false**

---

## 📊 TIMELINE FEATURES

### timelineStyle
**KIES: 'connected'**
- Volledig verbonden timeline

### timelineColor
**KIES: 'gradient'**

---

## ⭐ HIGHLIGHTS & EMPHASIS

### achievementStyle
**KIES: 'badge' of 'icon'**

### keywordHighlighting
**KIES: true**

### highlightColor
**KIES: 'accent'**

---

## 🎴 CARDS

### cardStyle
**KIES: 'gradient-border'**
- Gradient border voor premium look

### cardHoverEffect
**KIES: 'glow' of 'border-highlight'**

---

## 📊 HIERARCHY

### titleEmphasis
**KIES: 'large' of 'colored'**

### companyEmphasis
**KIES: 'muted'**

---

## 📈 PROGRESS BARS

### useProgressBars
**KIES: true of false**

### progressBarStyle
**KIES: 'gradient' of 'segmented'**

---

## 🚀 EXPERIMENTAL FEATURES

### glassmorphism
**KIES: true of false**
- Frosted glass effect (zeer modern)

### gradientText
**KIES: true of false**
- Gradient op bepaalde tekstdelen

---

## 🌀 3D EFFECTS

### use3DEffects
**KIES: true of false**
- Subtiele 3D perspectief

### depthLayers
**KIES: 'subtle' of 'prominent'**

---

## 🔄 INTERACTIVE ELEMENTS

### expandableDetails
**KIES: true of false**
- Uitklapbare details (web)

### tooltips
**KIES: true of false**
- Hover tooltips

---

## 🎨 DECORATIVE ELEMENTS

### usePatterns
**KIES: true of false**
- Subtiele achtergrondpatronen

### patternStyle
**KIES: 'dots', 'geometric', of 'organic'**

### patternOpacity
**KIES: 'barely-visible' of 'subtle'**

---

## ✨ CUSTOM DECORATIONS

### decorativeShapes
**KIES: true of false**

### shapeStyle
**KIES: 'circles', 'blobs', of 'lines'**

### shapePosition
**KIES: 'corners' of 'background'**

---

## 📊 METRICS & NUMBERS

### metricsStyle
**KIES: 'callout' of 'large-number'**
- Prominente weergave van cijfers

### metricsAnimation
**KIES: true of false**
- Animerende nummers

---

## 🖨️ PRINT OPTIMIZATION

### printOptimized
**KIES: true**
- Zorg dat het goed print

### printRemoveEffects
**KIES: true**
- Verwijder effecten voor print`,
};

// =============================================================================
// CSS GENERATION HELPERS
// =============================================================================

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

interface CSSOptions {
  headerGradient?: 'none' | 'two-color' | 'three-color' | 'mesh';
  headerShadow?: 'none' | 'subtle' | 'medium' | 'dramatic' | 'layered';
  itemShadow?: 'none' | 'subtle' | 'medium' | 'layered';
  summaryStyle?: 'none' | 'border-left' | 'background' | 'border-left-gradient' | 'quote' | 'card';
  nameLetterSpacing?: 'tight' | 'normal' | 'wide' | 'extra-wide';
  sectionTitleLetterSpacing?: 'none' | 'subtle' | 'wide' | 'extra-wide';
  nameTextShadow?: boolean;
  headerPadding?: 'compact' | 'normal' | 'spacious' | 'asymmetric';
  skillTagSize?: 'compact' | 'normal' | 'large';
  skillCategoryStyle?: 'none' | 'header' | 'divider' | 'badge' | 'sidebar';
}

function generateCustomCSS(
  options: CSSOptions,
  colors: { primary: string; secondary: string; accent: string }
): Record<string, string | undefined> {
  const { primary, secondary, accent } = colors;
  const css: Record<string, string | undefined> = {};

  // Header CSS
  const headerParts: string[] = [];
  if (options.headerGradient === 'two-color') {
    headerParts.push(`background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`);
  } else if (options.headerGradient === 'three-color') {
    headerParts.push(`background: linear-gradient(135deg, ${primary} 0%, ${accent} 60%, ${adjustColorBrightness(accent, 20)} 100%)`);
  }
  if (options.headerShadow === 'subtle') {
    headerParts.push('box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.05)');
  } else if (options.headerShadow === 'medium') {
    headerParts.push('box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08)');
  }
  const paddingMap = { compact: '1.5rem 2rem', normal: '2rem 2.5rem', spacious: '2.5rem 3rem', asymmetric: '2rem 3rem 1.5rem 2rem' };
  if (options.headerPadding) {
    headerParts.push(`padding: ${paddingMap[options.headerPadding]}`);
  }
  if (headerParts.length > 0) {
    css.headerCSS = headerParts.join('; ') + ';';
  }

  // Item CSS
  const itemParts: string[] = [];
  if (options.itemShadow === 'subtle') {
    itemParts.push('box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03)');
  } else if (options.itemShadow === 'layered') {
    itemParts.push('box-shadow: 0 1px 2px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.02), 0 4px 8px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.03)');
  }
  if (itemParts.length > 0) {
    css.itemCSS = itemParts.join('; ') + ';';
  }

  // Name CSS
  const nameParts: string[] = [];
  const letterSpacingMap = { tight: '-0.025em', normal: '-0.01em', wide: '0.01em', 'extra-wide': '0.05em' };
  if (options.nameLetterSpacing) {
    nameParts.push(`letter-spacing: ${letterSpacingMap[options.nameLetterSpacing]}`);
  }
  if (options.nameTextShadow) {
    nameParts.push('text-shadow: 0 1px 2px rgba(0,0,0,0.08)');
  }
  nameParts.push('-webkit-font-smoothing: antialiased');
  css.nameCSS = nameParts.join('; ') + ';';

  // Section Title CSS
  const titleParts: string[] = [];
  const titleSpacingMap = { none: '0.02em', subtle: '0.05em', wide: '0.1em', 'extra-wide': '0.15em' };
  if (options.sectionTitleLetterSpacing) {
    titleParts.push(`letter-spacing: ${titleSpacingMap[options.sectionTitleLetterSpacing]}`);
  }
  titleParts.push('text-transform: uppercase');
  titleParts.push('font-weight: 600');
  titleParts.push(`color: ${primary}`);
  titleParts.push(`border-bottom: 2px solid ${accent}`);
  titleParts.push('padding-bottom: 0.5rem');
  titleParts.push('margin-bottom: 1.25rem');
  css.sectionTitleCSS = titleParts.join('; ') + ';';

  // Summary CSS
  if (options.summaryStyle === 'border-left') {
    css.summaryCSS = `border-left: 3px solid ${accent}; padding-left: 1.25rem; margin-left: 0;`;
  } else if (options.summaryStyle === 'background') {
    css.summaryCSS = `background: ${secondary}; padding: 1.25rem 1.5rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.03);`;
  } else if (options.summaryStyle === 'border-left-gradient') {
    css.summaryCSS = `border-left: 3px solid ${accent}; padding-left: 1.25rem; background: linear-gradient(90deg, ${secondary} 0%, transparent 50%); border-radius: 0 8px 8px 0;`;
  }

  // Skill Tag CSS with size option
  const skillSizeMap = { compact: '0.75rem', normal: '0.875rem', large: '1rem' };
  const skillPaddingMap = { compact: '0.25rem 0.625rem', normal: '0.375rem 0.875rem', large: '0.5rem 1rem' };
  const fontSize = skillSizeMap[options.skillTagSize || 'normal'];
  const padding = skillPaddingMap[options.skillTagSize || 'normal'];
  css.skillTagCSS = `padding: ${padding}; border-radius: 6px; font-size: ${fontSize}; font-weight: 500; border: 1px solid ${accent}30; background: ${secondary};`;

  // Section and Divider CSS
  css.sectionCSS = 'margin-bottom: 2rem;';
  css.dividerCSS = `height: 1px; background: linear-gradient(90deg, ${accent}40 0%, transparent 100%); margin: 1.5rem 0;`;

  return css;
}

// =============================================================================
// MAIN GENERATION FUNCTION - 6 STEPS
// =============================================================================

export interface GenerateStyleResult {
  styleConfig: CVStyleConfig;
  usage: TokenUsage;
}

// Progress callback type for streaming progress updates
export interface StyleGenerationProgress {
  step: number;
  stepName: string;
  status: 'started' | 'completed';
  result?: string;
}

export type StyleProgressCallback = (progress: StyleGenerationProgress) => void;

export async function generateCVStyle(
  linkedInSummary: string,
  jobVacancy: JobVacancy | null,
  provider: LLMProvider,
  apiKey: string,
  model: string,
  userPreferences?: string,
  creativityLevel: StyleCreativityLevel = 'balanced',
  onProgress?: StyleProgressCallback
): Promise<GenerateStyleResult> {
  console.log(`[Style Gen] Starting 6-step generation with provider: ${provider}, model: ${model}, creativity: ${creativityLevel}`);
  const startTime = Date.now();

  const aiProvider = createAIProvider(provider, apiKey);
  const modelId = getModelId(provider, model);
  const aiModel = aiProvider(modelId);

  const context = buildContextPrompt(linkedInSummary, jobVacancy, userPreferences);

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  // =========================================================================
  // STEP 1: Layout (structure only)
  // =========================================================================
  console.log(`[Style Gen] Step 1/6: Generating layout...`);
  onProgress?.({ step: 1, stepName: 'Layout', status: 'started' });
  const layoutResult = await generateObject({
    model: aiModel,
    schema: getLayoutSchema(creativityLevel),
    prompt: layoutPrompts[creativityLevel](context),
  });
  totalPromptTokens += layoutResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += layoutResult.usage?.outputTokens ?? 0;
  const layoutSummary = `${layoutResult.object.sectionDivider}, ${layoutResult.object.contentDensity}`;
  console.log(`[Style Gen] Step 1 complete: divider=${layoutResult.object.sectionDivider}, density=${layoutResult.object.contentDensity}, margins=${layoutResult.object.pageMargins}`);
  onProgress?.({ step: 1, stepName: 'Layout', status: 'completed', result: layoutSummary });

  // =========================================================================
  // STEP 2: Header (eyecatcher - dedicated header styling)
  // =========================================================================
  console.log(`[Style Gen] Step 2/6: Generating header...`);
  onProgress?.({ step: 2, stepName: 'Header', status: 'started' });
  const headerResult = await generateObject({
    model: aiModel,
    schema: getHeaderSchema(creativityLevel),
    prompt: headerPrompts[creativityLevel](context, layoutResult.object),
  });
  totalPromptTokens += headerResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += headerResult.usage?.outputTokens ?? 0;
  const headerSummary = `${headerResult.object.headerStyle}, ${headerResult.object.headerAccent}`;
  console.log(`[Style Gen] Step 2 complete: headerStyle=${headerResult.object.headerStyle}, accent=${headerResult.object.headerAccent}`);
  onProgress?.({ step: 2, stepName: 'Header', status: 'completed', result: headerSummary });

  // =========================================================================
  // STEP 3: Typography (body content fonts)
  // =========================================================================
  console.log(`[Style Gen] Step 3/6: Generating typography...`);
  onProgress?.({ step: 3, stepName: 'Typography', status: 'started' });
  const typographyResult = await generateObject({
    model: aiModel,
    schema: getTypographySchema(creativityLevel),
    prompt: typographyPrompts[creativityLevel](context, layoutResult.object, headerResult.object),
  });
  totalPromptTokens += typographyResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += typographyResult.usage?.outputTokens ?? 0;
  const typographySummary = `${typographyResult.object.headingFont}, ${typographyResult.object.bodyFont}`;
  console.log(`[Style Gen] Step 3 complete: heading=${typographyResult.object.headingFont}, body=${typographyResult.object.bodyFont}`);
  onProgress?.({ step: 3, stepName: 'Typography', status: 'completed', result: typographySummary });

  // =========================================================================
  // STEP 4: Colors (palette)
  // =========================================================================
  console.log(`[Style Gen] Step 4/6: Generating colors...`);
  onProgress?.({ step: 4, stepName: 'Colors', status: 'started' });
  const colorsResult = await generateObject({
    model: aiModel,
    schema: getColorsSchema(creativityLevel),
    prompt: colorsPrompts[creativityLevel](context, layoutResult.object, headerResult.object, typographyResult.object),
  });
  totalPromptTokens += colorsResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += colorsResult.usage?.outputTokens ?? 0;
  const colorsSummary = `${colorsResult.object.styleName}`;
  console.log(`[Style Gen] Step 4 complete: style="${colorsResult.object.styleName}", primary=${colorsResult.object.primary}`);
  onProgress?.({ step: 4, stepName: 'Colors', status: 'completed', result: colorsSummary });

  // =========================================================================
  // STEP 5: Skills (dedicated skill display options)
  // =========================================================================
  console.log(`[Style Gen] Step 5/6: Generating skills display...`);
  onProgress?.({ step: 5, stepName: 'Skills', status: 'started' });
  const skillsResult = await generateObject({
    model: aiModel,
    schema: getSkillsSchema(creativityLevel),
    prompt: skillsPrompts[creativityLevel](context, layoutResult.object, headerResult.object, typographyResult.object, colorsResult.object),
  });
  totalPromptTokens += skillsResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += skillsResult.usage?.outputTokens ?? 0;
  const skillsSummary = `${skillsResult.object.skillDisplay}, ${skillsResult.object.skillTagVariant}`;
  console.log(`[Style Gen] Step 5 complete: display=${skillsResult.object.skillDisplay}, variant=${skillsResult.object.skillTagVariant}`);
  onProgress?.({ step: 5, stepName: 'Skills', status: 'completed', result: skillsSummary });

  // =========================================================================
  // STEP 6: Details (finishing touches)
  // =========================================================================
  console.log(`[Style Gen] Step 6/6: Generating details...`);
  onProgress?.({ step: 6, stepName: 'Details', status: 'started' });
  const detailsResult = await generateObject({
    model: aiModel,
    schema: getDetailsSchema(creativityLevel),
    prompt: detailsPrompts[creativityLevel](context, layoutResult.object, headerResult.object, typographyResult.object, colorsResult.object, skillsResult.object),
  });
  totalPromptTokens += detailsResult.usage?.inputTokens ?? 0;
  totalCompletionTokens += detailsResult.usage?.outputTokens ?? 0;
  const detailsSummary = `${detailsResult.object.itemStyle}, ${detailsResult.object.cornerStyle}`;
  console.log(`[Style Gen] Step 6 complete: itemStyle=${detailsResult.object.itemStyle}, corners=${detailsResult.object.cornerStyle}`);
  onProgress?.({ step: 6, stepName: 'Details', status: 'completed', result: detailsSummary });

  // =========================================================================
  // Generate Custom CSS for creative/experimental levels
  // =========================================================================
  let customCSS: Record<string, string | undefined> | undefined;

  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const extendedDetails = detailsResult.object as z.infer<typeof extendedDetailsSchema>;
    const extendedTypography = typographyResult.object as z.infer<typeof extendedTypographySchema>;
    const extendedHeader = headerResult.object as z.infer<typeof extendedHeaderSchema>;
    const creativeSkills = skillsResult.object as z.infer<typeof creativeSkillsSchema>;

    const cssOptions: CSSOptions = {
      summaryStyle: extendedDetails.summaryStyle,
      itemShadow: extendedDetails.itemShadow,
      sectionTitleLetterSpacing: extendedTypography.sectionTitleLetterSpacing,
      headerPadding: extendedHeader.headerPadding,
      nameLetterSpacing: extendedHeader.nameLetterSpacing,
      skillTagSize: creativeSkills.skillTagSize,
      skillCategoryStyle: creativeSkills.skillCategoryStyle,
    };

    if (creativityLevel === 'experimental') {
      const experimentalHeader = headerResult.object as z.infer<typeof experimentalHeaderSchema>;
      cssOptions.headerGradient = experimentalHeader.headerGradient;
      cssOptions.headerShadow = experimentalHeader.headerShadow;
      cssOptions.nameTextShadow = experimentalHeader.nameTextShadow;
    }

    customCSS = generateCustomCSS(cssOptions, {
      primary: colorsResult.object.primary,
      secondary: colorsResult.object.secondary,
      accent: colorsResult.object.accent,
    });
    console.log(`[Style Gen] Custom CSS generated for ${creativityLevel} level`);
  }

  // =========================================================================
  // Combine all results into final CVStyleConfig
  // =========================================================================
  const layoutObj = layoutResult.object;
  const headerObj = headerResult.object;
  const typographyObj = typographyResult.object;
  const colorsObj = colorsResult.object;
  const skillsObj = skillsResult.object;
  const detailsObj = detailsResult.object;

  // Map content density to spacing for backward compatibility
  const spacingMap: Record<string, 'compact' | 'normal' | 'spacious'> = {
    dense: 'compact',
    balanced: 'normal',
    airy: 'spacious',
  };

  // Build layout object - combining layout and some header fields for backward compatibility
  const layoutConfig: CVStyleConfig['layout'] = {
    // === Core Layout (backward compatibility) ===
    style: 'single-column',
    headerStyle: headerObj.headerStyle,
    sectionOrder: layoutObj.sectionOrder,
    sectionDivider: layoutObj.sectionDivider,
    skillDisplay: skillsObj.skillDisplay,
    spacing: spacingMap[layoutObj.contentDensity] || 'normal',
    showPhoto: layoutObj.showPhoto,

    // === New Page Structure fields ===
    pageMargins: layoutObj.pageMargins,
    contentDensity: layoutObj.contentDensity,

    // === New Section Organization fields ===
    sectionSpacing: layoutObj.sectionSpacing,

    // === New Item Layout fields ===
    itemSpacing: layoutObj.itemSpacing,
    datePosition: layoutObj.datePosition,
    locationDisplay: layoutObj.locationDisplay,

    // === New Photo Settings fields ===
    photoPosition: layoutObj.photoPosition,
    photoSize: layoutObj.photoSize,
    photoShape: layoutObj.photoShape,

    // === New Visual Hierarchy fields ===
    bulletStyle: layoutObj.bulletStyle,
    sectionTitlePosition: layoutObj.sectionTitlePosition,
  };

  // Add extended layout fields (balanced and above)
  if (creativityLevel === 'balanced' || creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const extendedLayout = layoutObj as z.infer<typeof extendedLayoutSchema>;
    layoutConfig.columnLayout = extendedLayout.columnLayout;
    layoutConfig.sidebarWidth = extendedLayout.sidebarWidth;
    layoutConfig.sidebarContent = extendedLayout.sidebarContent;
    layoutConfig.experienceLayout = extendedLayout.experienceLayout;
    layoutConfig.educationLayout = extendedLayout.educationLayout;
    layoutConfig.whitespaceStrategy = extendedLayout.whitespaceStrategy;
    layoutConfig.paragraphSpacing = extendedLayout.paragraphSpacing;
    layoutConfig.contactLayout = extendedLayout.contactLayout;
    layoutConfig.contactPosition = extendedLayout.contactPosition;
    layoutConfig.showContactIcons = extendedLayout.showContactIcons;

    // Add extended header fields
    const extendedHeader = headerObj as z.infer<typeof extendedHeaderSchema>;
    layoutConfig.headerPadding = extendedHeader.headerPadding;
  }

  // Add creative/experimental header fields
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const creativeHeader = headerObj as z.infer<typeof creativeHeaderSchema>;
    layoutConfig.headerGradientAngle = creativeHeader.headerGradientAngle;
  }

  // Add experimental layout fields
  if (creativityLevel === 'experimental') {
    const experimentalLayout = layoutObj as z.infer<typeof experimentalLayoutSchema>;
    layoutConfig.asymmetricLayout = experimentalLayout.asymmetricLayout;
    layoutConfig.overlappingElements = experimentalLayout.overlappingElements;
    layoutConfig.sectionNumbering = experimentalLayout.sectionNumbering;
    layoutConfig.progressIndicators = experimentalLayout.progressIndicators;
    layoutConfig.highlightKeywords = experimentalLayout.highlightKeywords;
    layoutConfig.pullQuotes = experimentalLayout.pullQuotes;
    layoutConfig.useGridSystem = experimentalLayout.useGridSystem;
    layoutConfig.gridColumns = experimentalLayout.gridColumns;
  }

  // Build decorations object
  const decorationsConfig: CVStyleConfig['decorations'] = {
    intensity: detailsObj.intensity,
    useBorders: detailsObj.useBorders,
    useBackgrounds: detailsObj.useBackgrounds,
    iconStyle: detailsObj.iconStyle,
    cornerStyle: detailsObj.cornerStyle,
    itemStyle: detailsObj.itemStyle,
    headerAccent: headerObj.headerAccent,
    skillTagVariant: skillsObj.skillTagVariant,
    svgDecorations: {
      enabled: false,
      theme: 'none',
      placement: 'corners',
      opacity: 0.1,
      scale: 'small',
      colorSource: 'accent',
    },
  };

  // Add extended details fields
  if (creativityLevel === 'creative' || creativityLevel === 'experimental') {
    const extendedDetails = detailsObj as z.infer<typeof extendedDetailsSchema>;
    if (extendedDetails.itemBorderWidth) {
      decorationsConfig.itemBorderWidth = extendedDetails.itemBorderWidth;
    }
  }

  const styleConfig: CVStyleConfig = {
    styleName: colorsObj.styleName,
    styleRationale: colorsObj.styleRationale,
    industryFit: colorsObj.industryFit,
    formalityLevel: colorsObj.formalityLevel,
    colors: {
      primary: colorsObj.primary,
      secondary: colorsObj.secondary,
      accent: colorsObj.accent,
      text: colorsObj.text,
      muted: colorsObj.muted,
    },
    typography: {
      headingFont: typographyObj.headingFont,
      bodyFont: typographyObj.bodyFont,
      nameSizePt: headerObj.nameSizePt,
      headingSizePt: typographyObj.headingSizePt,
      bodySizePt: typographyObj.bodySizePt,
      lineHeight: typographyObj.lineHeight,
    },
    layout: layoutConfig,
    decorations: decorationsConfig,
    customCSS: customCSS,
  };

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Style Gen] All 6 steps complete! Total time: ${duration}s`);

  return {
    styleConfig,
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    },
  };
}

// =============================================================================
// Helper function to create a summary of LinkedIn data
// =============================================================================
export function createLinkedInSummary(linkedIn: {
  fullName: string;
  headline?: string | null;
  location?: string | null;
  about?: string | null;
  experience: Array<{ title: string; company: string }>;
  skills: Array<{ name: string }>;
}): string {
  const parts: string[] = [];

  parts.push(`Name: ${linkedIn.fullName}`);

  if (linkedIn.headline) {
    parts.push(`Current Role: ${linkedIn.headline}`);
  }

  if (linkedIn.location) {
    parts.push(`Location: ${linkedIn.location}`);
  }

  if (linkedIn.experience.length > 0) {
    const recentRoles = linkedIn.experience.slice(0, 3)
      .map(exp => `${exp.title} at ${exp.company}`)
      .join(', ');
    parts.push(`Recent Experience: ${recentRoles}`);
  }

  if (linkedIn.skills.length > 0) {
    const topSkills = linkedIn.skills.slice(0, 5)
      .map(s => s.name)
      .join(', ');
    parts.push(`Key Skills: ${topSkills}`);
  }

  if (linkedIn.about) {
    const aboutShort = linkedIn.about.length > 200
      ? linkedIn.about.substring(0, 200) + '...'
      : linkedIn.about;
    parts.push(`About: ${aboutShort}`);
  }

  return parts.join('\n');
}
