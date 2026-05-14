// ============ Legacy Style Types ============
//
// `CVStyleConfig` and the dozens of supporting `CVStyle*` interfaces below are
// LEGACY. New code uses `CVDesignTokens` from `./design-tokens` instead.
//
// The legacy types are still exported because older Firestore CV documents have
// a `styleConfig` field, and the renderer falls back to `styleConfigToTokens()`
// (in `src/lib/cv/templates/adapter.ts`) when reading those docs. Producers
// (wizard, style API, generate API) no longer emit styleConfig.

// Creativity level for style generation
export type StyleCreativityLevel =
  | 'conservative'
  | 'balanced'
  | 'creative'
  | 'experimental'
  | 'editorial-paper';

// Print-safe font options
export type FontFamily =
  | 'inter'
  | 'georgia'
  | 'roboto'
  | 'merriweather'
  | 'source-sans'
  | 'playfair'
  | 'open-sans'
  | 'lato'
  | 'montserrat'
  | 'raleway'
  | 'poppins'
  | 'nunito'
  | 'work-sans';

// ============ Layout Types ============

export type ColumnLayout = 'single' | 'sidebar-left' | 'sidebar-right';
export type PageMargins = 'narrow' | 'normal' | 'wide';
export type ContentDensity = 'dense' | 'balanced' | 'airy';
export type SectionSpacing = 'tight' | 'normal' | 'relaxed' | 'generous';
export type ItemSpacing = 'compact' | 'normal' | 'comfortable';
export type DatePosition = 'right-aligned' | 'inline' | 'above' | 'below';
export type LocationDisplay = 'with-company' | 'with-date' | 'separate-line' | 'hidden';
export type PhotoPosition = 'header-left' | 'header-right' | 'header-center' | 'beside-name';
export type PhotoSize = 'small' | 'medium' | 'large';
export type PhotoShape = 'circle' | 'rounded-square' | 'square';
export type BulletStyle = 'disc' | 'circle' | 'square' | 'dash' | 'arrow' | 'checkmark' | 'none';
export type SectionTitlePosition = 'left' | 'center' | 'left-with-line';
export type SidebarWidth = 'narrow' | 'medium' | 'wide';
export type SidebarContentItem = 'contact' | 'skills' | 'languages' | 'certifications' | 'photo';
export type ExperienceLayout = 'stacked' | 'timeline' | 'cards';
export type EducationLayout = 'stacked' | 'compact' | 'cards';
export type WhitespaceStrategy = 'minimal' | 'balanced' | 'generous';
export type ParagraphSpacing = 'tight' | 'normal' | 'relaxed';
export type ContactLayout = 'single-line' | 'two-lines' | 'stacked' | 'icons-only';
export type ContactPosition = 'header' | 'sidebar' | 'footer';
export type GridColumns = '8' | '12' | '16';
export type LayoutStyle = 'single-column';

// Expanded header styles for more creative freedom
export type HeaderStyle =
  | 'centered'
  | 'left-aligned'
  | 'banner'
  | 'full-width-accent'  // Accent bar over full header width
  | 'split'              // Name left, contact right
  | 'minimal'            // Ultra clean, no borders
  | 'bold-name'          // Oversized name, small details
  | 'card';              // Modern card-style with subtle background

// Creative styling options - expanded for visual variety
export type ItemStyle =
  | 'inline'
  | 'card-subtle'
  | 'card-bordered'
  | 'accent-left'        // Colored line on the left
  | 'timeline'           // Timeline style with vertical line
  | 'minimal-dots'       // Dots as markers
  | 'numbered';          // Numbered items (01, 02, 03)

export type HeaderAccent = 'none' | 'underline' | 'side-bar' | 'gradient-bar' | 'bottom-border' | 'top-border' | 'double-line';

export type SectionDividerStyle =
  | 'line'
  | 'dots'
  | 'none'
  | 'accent-bar'
  | 'gradient-line'
  | 'double-line';

export type SkillDisplayStyle = 'tags' | 'list' | 'bars' | 'grid' | 'chips' | 'categories-with-icons' | 'progress-dots';
export type SpacingDensity = 'compact' | 'normal' | 'spacious';

export interface CVStyleColors {
  primary: string;      // Main colors, name
  secondary: string;    // Background accents
  accent: string;       // Links, highlights
  text: string;         // Body text
  muted: string;        // Secondary text

  // === Extended Color Properties (optional) ===
  primaryLight?: string;
  primaryDark?: string;
  accentLight?: string;
  linkColor?: string;
  borderColor?: string;
  successColor?: string;
  warningColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;

  // === Color Relationships ===
  colorHarmony?: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'split-complementary';
  colorTemperature?: 'cool' | 'neutral' | 'warm';
  contrastLevel?: 'subtle' | 'moderate' | 'high';
  colorMode?: 'light' | 'dark' | 'auto';
  saturationLevel?: 'muted' | 'normal' | 'vivid';
}

export interface CVStyleTypography {
  headingFont: FontFamily;
  bodyFont: FontFamily;
  nameSizePt: number;       // 20-32pt
  headingSizePt: number;    // 11-16pt
  bodySizePt: number;       // 9-11pt
  lineHeight: number;       // 1.3-1.8

  // === Extended Typography ===
  smallTextSizePt?: number;
  headingWeight?: 'medium' | 'semibold' | 'bold';
  bodyWeight?: 'normal' | 'medium';
  headingTransform?: 'none' | 'uppercase' | 'capitalize';
  jobTitleSizePt?: number;
  companySizePt?: number;
  sectionTitleLetterSpacing?: 'none' | 'subtle' | 'wide' | 'extra-wide';
}

// === Header Styling ===
export type HeaderAlignment = 'left' | 'center' | 'right';
export type HeaderHeight = 'compact' | 'standard' | 'tall' | 'auto';
export type NameWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
export type NameTransform = 'none' | 'uppercase' | 'capitalize';
export type HeadlineStyle = 'normal' | 'italic' | 'muted' | 'accent-color';
export type AccentThickness = 'thin' | 'medium' | 'thick';
export type AccentPosition = 'below-name' | 'below-header' | 'left-side' | 'full-width';
export type ContactSeparator = 'pipe' | 'bullet' | 'slash' | 'space' | 'newline';
export type NameLetterSpacing = 'tight' | 'normal' | 'wide' | 'extra-wide';
export type HeaderMarginBottom = 'none' | 'small' | 'medium' | 'large';
export type HeaderBackground = 'none' | 'subtle' | 'colored' | 'gradient';
export type HeaderBorderStyle = 'none' | 'bottom' | 'all' | 'rounded';
export type HeaderRounding = 'none' | 'subtle' | 'medium' | 'full';
export type NameUnderline = 'none' | 'solid' | 'dotted' | 'gradient';
export type GradientType = 'linear' | 'radial';
export type HeaderOverlay = 'none' | 'subtle-pattern' | 'noise' | 'geometric';
export type DividerStyle = 'none' | 'line' | 'fade' | 'wave' | 'chevron';
export type HeaderShape = 'rectangle' | 'angled' | 'curved' | 'wave-bottom';
export type NameSplitStyle = 'none' | 'first-last' | 'first-bold';
export type NameVerticalAlign = 'top' | 'center' | 'baseline';
export type HeaderShadow = 'none' | 'subtle' | 'medium' | 'dramatic' | 'layered';
export type HeaderGradientStyle = 'none' | 'two-color' | 'three-color' | 'mesh';
export type HeaderOrientation = 'horizontal' | 'vertical-left';
export type NameFirstLetterStyle = 'none' | 'large' | 'decorated' | 'colored';
export type TaglinePosition = 'below-name' | 'beside-name' | 'in-accent';

export interface CVStyleHeader {
  // === Header Structure ===
  headerAlignment?: HeaderAlignment;
  headerHeight?: HeaderHeight;

  // === Name Styling ===
  nameWeight?: NameWeight;
  nameTransform?: NameTransform;
  nameLetterSpacing?: NameLetterSpacing;
  nameUnderline?: NameUnderline;
  nameHighlight?: boolean;
  nameGradient?: boolean;
  nameTextShadow?: boolean;
  nameSplitStyle?: NameSplitStyle;
  nameVerticalAlign?: NameVerticalAlign;
  nameFirstLetterStyle?: NameFirstLetterStyle;

  // === Headline Styling ===
  showHeadline?: boolean;
  headlineSizePt?: number;
  headlineStyle?: HeadlineStyle;
  headlineIcon?: boolean;
  headlineQuotes?: boolean;
  taglinePosition?: TaglinePosition;

  // === Accent Styling ===
  accentThickness?: AccentThickness;
  accentPosition?: AccentPosition;

  // === Contact Display ===
  contactInHeader?: boolean;
  contactStyle?: 'inline' | 'stacked' | 'two-columns' | 'icons-only';
  contactSeparator?: ContactSeparator;

  // === Visual Depth ===
  headerMarginBottom?: HeaderMarginBottom;
  headerBackground?: HeaderBackground;
  headerBorder?: HeaderBorderStyle;
  headerRounding?: HeaderRounding;
  headerShadow?: HeaderShadow;
  header3DEffect?: boolean;

  // === Gradient Options ===
  gradientStart?: string;
  gradientEnd?: string;
  gradientType?: GradientType;
  headerGradient?: HeaderGradientStyle;

  // === Advanced Effects ===
  headerOverlay?: HeaderOverlay;
  dividerStyle?: DividerStyle;
  headerShape?: HeaderShape;
  headerOrientation?: HeaderOrientation;
  overlayPhoto?: boolean;
  floatingElements?: boolean;
}

// Header gradient angle options for full-width-accent headers
export type HeaderGradientAngle = '0' | '45' | '90' | '135' | '180' | '225' | '270' | '315';
// Header padding options
export type HeaderPaddingSize = 'compact' | 'normal' | 'spacious' | 'asymmetric';
// Skill tag visual variants
export type SkillTagVariant = 'filled' | 'outlined' | 'ghost' | 'gradient';

// === Skill Styling Types ===
export type SkillColumns = 'auto' | '2' | '3' | '4';
export type SkillAlignment = 'left' | 'center' | 'justify';
export type SkillSortOrder = 'as-provided' | 'alphabetical' | 'by-relevance';
export type SkillGap = 'tight' | 'normal' | 'relaxed';
export type SkillSectionSpacing = 'compact' | 'normal' | 'spacious';
export type SkillCategoryStyle = 'none' | 'header' | 'divider' | 'badge' | 'sidebar';
export type SkillTagSize = 'compact' | 'normal' | 'large';
export type SkillTagShape = 'rounded' | 'pill' | 'square';
export type SkillTagBorderWidth = 'none' | 'thin' | 'normal';
export type SoftSkillsStyle = 'same' | 'italic' | 'muted' | 'separate-section' | 'hidden';
export type SoftSkillsPosition = 'mixed' | 'after-technical' | 'separate-section';
export type ProficiencyStyle = 'none' | 'labels' | 'dots' | 'bars' | 'percentage';
export type ProficiencyScale = '3' | '5' | '10';

export interface CVStyleSkills {
  // === Display Format ===
  skillDisplay: SkillDisplayStyle;
  skillTagVariant: SkillTagVariant;

  // === Layout Options ===
  skillColumns?: SkillColumns;
  skillAlignment?: SkillAlignment;

  // === Ordering & Grouping ===
  skillSortOrder?: SkillSortOrder;
  showSkillCount?: boolean;

  // === Visual Spacing ===
  skillGap?: SkillGap;
  skillSectionSpacing?: SkillSectionSpacing;

  // === Category Styling ===
  skillCategoryStyle?: SkillCategoryStyle;
  categoryOrder?: string[];
  showCategoryIcons?: boolean;

  // === Tag Styling ===
  skillTagSize?: SkillTagSize;
  skillTagShape?: SkillTagShape;
  skillTagBorderWidth?: SkillTagBorderWidth;

  // === Soft Skills ===
  softSkillsStyle?: SoftSkillsStyle;
  softSkillsPosition?: SoftSkillsPosition;

  // === Proficiency Indicators (creative/experimental) ===
  showProficiencyLevel?: boolean;
  proficiencyStyle?: ProficiencyStyle;
  proficiencyScale?: ProficiencyScale;

  // === Visual Enhancements (creative/experimental) ===
  skillHighlight?: 'none' | 'top-skills' | 'relevant-skills';
  highlightStyle?: 'bold' | 'colored' | 'starred' | 'badge';
  highlightCount?: number;
  useSkillIcons?: boolean;
}

// Border width for accent-left items
export type ItemBorderWidth = 'none' | 'thin' | 'normal' | 'thick';

export interface CVStyleLayout {
  // === Core Layout (backward compatibility) ===
  style: LayoutStyle;
  headerStyle: HeaderStyle;
  sectionOrder: string[];   // Order of sections
  sectionDivider: SectionDividerStyle;
  skillDisplay: SkillDisplayStyle;
  spacing: SpacingDensity;
  showPhoto: boolean;
  headerGradientAngle?: HeaderGradientAngle;
  headerPadding?: HeaderPaddingSize;

  // === Page Structure ===
  pageMargins?: PageMargins;
  contentDensity?: ContentDensity;

  // === Section Organization ===
  sectionSpacing?: SectionSpacing;

  // === Item Layout ===
  itemSpacing?: ItemSpacing;
  datePosition?: DatePosition;
  locationDisplay?: LocationDisplay;

  // === Photo Settings ===
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
  photoShape?: PhotoShape;

  // === Visual Hierarchy ===
  bulletStyle?: BulletStyle;
  sectionTitlePosition?: SectionTitlePosition;

  // === Column Layout ===
  columnLayout?: ColumnLayout;
  sidebarWidth?: SidebarWidth;
  sidebarContent?: SidebarContentItem[];

  // === Content Flow ===
  experienceLayout?: ExperienceLayout;
  educationLayout?: EducationLayout;

  // === Whitespace Strategy ===
  whitespaceStrategy?: WhitespaceStrategy;
  paragraphSpacing?: ParagraphSpacing;

  // === Contact Info ===
  contactLayout?: ContactLayout;
  contactPosition?: ContactPosition;
  showContactIcons?: boolean;

  // === Experimental Features ===
  asymmetricLayout?: boolean;
  overlappingElements?: boolean;
  sectionNumbering?: boolean;
  progressIndicators?: boolean;
  highlightKeywords?: boolean;
  pullQuotes?: boolean;
  useGridSystem?: boolean;
  gridColumns?: GridColumns;
}

// === Detail Styling Types ===
export type SummaryFormat = 'paragraph' | 'bullets' | 'highlights';
export type SummaryAlignment = 'left' | 'justify';
export type SummaryStyleOption = 'none' | 'border-left' | 'background' | 'border-left-gradient' | 'quote' | 'card';
export type SummaryQuoteStyle = 'none' | 'opening' | 'both';
export type BulletPointStyle = 'disc' | 'check' | 'arrow' | 'dash' | 'custom' | 'circle' | 'square' | 'none';
export type SectionDividerStyleOption = 'none' | 'line' | 'gradient' | 'dots' | 'fade';
export type DividerWidth = 'partial' | 'full';
export type LinkStyleOption = 'underline' | 'color' | 'both' | 'subtle';
export type AchievementStyle = 'none' | 'bold' | 'colored' | 'badge' | 'icon';
export type ShadowLevel = 'none' | 'subtle' | 'medium' | 'layered' | 'dramatic';
export type CardElevation = 'flat' | 'raised' | 'floating';
export type CompanyLogoSize = 'none' | 'small' | 'medium';
export type TimelineStyleOption = 'none' | 'dots' | 'line' | 'connected';
export type CardStyleOption = 'minimal' | 'filled' | 'bordered' | 'gradient-border';
export type TitleEmphasis = 'normal' | 'bold' | 'large' | 'colored';
export type CompanyEmphasis = 'normal' | 'bold' | 'muted' | 'accent';

export interface CVStyleDecorations {
  intensity: 'subtle' | 'moderate' | 'bold';
  useBorders: boolean;
  useBackgrounds: boolean;
  iconStyle: 'none' | 'minimal' | 'filled' | 'outlined' | 'duotone';
  cornerStyle: 'sharp' | 'rounded' | 'pill';
  itemStyle?: ItemStyle;
  headerAccent?: HeaderAccent;
  skillTagVariant?: SkillTagVariant;
  itemBorderWidth?: ItemBorderWidth;

  // === Summary Section ===
  summaryFormat?: SummaryFormat;
  summaryAlignment?: SummaryAlignment;
  summaryStyle?: SummaryStyleOption;
  summaryQuoteStyle?: SummaryQuoteStyle;

  // === Date & Location Styling ===
  dateStyle?: 'normal' | 'muted' | 'badge' | 'pill';
  locationStyle?: 'normal' | 'hidden' | 'muted' | 'with-icon';

  // === Shadow & Depth ===
  itemShadow?: ShadowLevel;
  cardElevation?: CardElevation;

  // === Experience Details ===
  companyLogoSize?: CompanyLogoSize;
  showJobType?: boolean;
  bulletPointStyle?: BulletPointStyle;

  // === Dividers ===
  sectionDividerStyle?: SectionDividerStyleOption;
  dividerWidth?: DividerWidth;

  // === Links ===
  linkStyle?: LinkStyleOption;
  showLinkIcons?: boolean;

  // === Visual Effects (creative/experimental) ===
  hoverEffects?: boolean;
  microAnimations?: boolean;
  timelineStyle?: TimelineStyleOption;
  timelineColor?: 'primary' | 'accent' | 'muted' | 'gradient';

  // === Highlights & Emphasis ===
  achievementStyle?: AchievementStyle;
  keywordHighlighting?: boolean;
  highlightColor?: 'accent' | 'subtle-accent' | 'background';

  // === Cards ===
  cardStyle?: CardStyleOption;
  cardHoverEffect?: 'none' | 'lift' | 'glow' | 'border-highlight';

  // === Hierarchy ===
  titleEmphasis?: TitleEmphasis;
  companyEmphasis?: CompanyEmphasis;
}

// Custom CSS for AI-generated creative styling
export interface CVStyleCustomCSS {
  // Core sections
  headerCSS?: string;
  itemCSS?: string;
  sectionCSS?: string;
  skillsCSS?: string;

  // Typography elements
  nameCSS?: string;
  headlineCSS?: string;
  sectionTitleCSS?: string;
  itemTitleCSS?: string;
  itemSubtitleCSS?: string;

  // Content elements
  summaryCSS?: string;
  highlightsCSS?: string;
  skillTagCSS?: string;

  // Structural
  avatarCSS?: string;
  dividerCSS?: string;
}

/**
 * @deprecated Use `CVDesignTokens` from `./design-tokens` for new code. This
 * type is retained for backwards-compatible reads of older Firestore CV docs
 * via the `styleConfigToTokens()` adapter.
 */
export interface CVStyleConfig {
  styleName: string;
  styleRationale: string;
  colors: CVStyleColors;
  typography: CVStyleTypography;
  layout: CVStyleLayout;
  decorations: CVStyleDecorations;
  header?: CVStyleHeader;
  skills?: CVStyleSkills;
  industryFit: string;
  formalityLevel: 'casual' | 'professional' | 'formal';
  customCSS?: CVStyleCustomCSS;
}
