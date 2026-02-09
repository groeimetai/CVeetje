import { Timestamp } from 'firebase/firestore';

// ============ Language Types ============

export type OutputLanguage = 'nl' | 'en';

export const LANGUAGE_LABELS: Record<OutputLanguage, string> = {
  nl: 'Nederlands',
  en: 'English',
};

// ============ Input Modality Types ============

export type InputModality = 'text' | 'image' | 'pdf';

export interface LinkedInInputSource {
  type: 'text' | 'file';
  text?: string;
  file?: {
    name: string;
    mediaType: string; // 'application/pdf' | 'image/png' | 'image/jpeg'
    base64: string;    // Base64 encoded data (without data URL prefix)
  };
}

// Multi-source input for profile information
export interface ProfileInputSource {
  id: string; // Unique ID for UI management
  type: 'text' | 'file';
  text?: string;
  file?: {
    name: string;
    mediaType: string; // 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp'
    base64: string;    // Base64 encoded data (without data URL prefix)
  };
}

export interface ProfileInputData {
  sources: ProfileInputSource[];
}

export interface ModelCapabilities {
  structuredOutput: boolean;
  toolCalling: boolean;
  reasoning: boolean;
  inputModalities: InputModality[];
}

// ============ User Types ============

// Now supports any provider from models.dev
export type LLMProvider = string;

// LLM mode: own API key or platform-provided AI
export type LLMMode = 'own-key' | 'platform';

// User roles for access control
export type UserRole = 'user' | 'admin';

export interface UserApiKey {
  provider: string;
  encryptedKey: string;
  model: string;
}

export interface UserCredits {
  free: number;           // Monthly free credits (resets to 10 each month)
  purchased: number;      // Purchased credits (never expires, accumulates)
  lastFreeReset: Timestamp;

  // Deprecated: kept for backward compatibility during migration
  balance?: number;
}

export interface User {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  apiKey: UserApiKey | null;
  llmMode?: LLMMode;                // 'own-key' (default) or 'platform'
  credits: UserCredits;
  role: UserRole;                    // User role (defaults to 'user')
  disabled?: boolean;                // Account disabled by admin
  disabledAt?: Timestamp;            // When the account was disabled
  disabledReason?: string;           // Reason for disabling
  assignedTemplates?: string[];      // IDs from globalTemplates collection
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ LinkedIn Types ============

export interface LinkedInExperience {
  title: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isCurrentRole: boolean;
}

export interface LinkedInEducation {
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: string | null;
  endYear: string | null;
}

export interface LinkedInSkill {
  name: string;
}

export interface LinkedInLanguage {
  language: string;
  proficiency: string | null;
}

export interface LinkedInCertification {
  name: string;
  issuer: string | null;
  issueDate: string | null;
}

export interface ParsedLinkedIn {
  fullName: string;
  headline: string | null;
  location: string | null;
  about: string | null;
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
  languages: LinkedInLanguage[];
  certifications: LinkedInCertification[];
  // Contact info - manually entered by user (not from LinkedIn)
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  website?: string;
  github?: string;
}

// Contact information for CV header
export interface CVContactInfo {
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  website?: string;
  github?: string;
}

// ============ Job Vacancy Types ============

export interface JobCompensation {
  salaryMin?: number;           // Minimum salary (annual)
  salaryMax?: number;           // Maximum salary (annual)
  salaryCurrency?: string;      // EUR, USD, etc.
  salaryPeriod?: 'yearly' | 'monthly' | 'hourly';
  benefits?: string[];          // List of benefits (pension, car, etc.)
  bonusInfo?: string;           // Bonus structure description
  notes?: string;               // Additional compensation notes
}

export type ExperienceLevel = 'junior' | 'medior' | 'senior' | 'lead' | 'executive';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface SalaryEstimate {
  estimatedMin: number;         // Estimated minimum salary (annual, EUR)
  estimatedMax: number;         // Estimated maximum salary (annual, EUR)
  experienceLevel: ExperienceLevel;  // junior/medior/senior/lead/executive
  confidence: ConfidenceLevel;  // How confident is the estimate
  reasoning: string;            // Why this estimate
  marketInsight: string;        // Market context and insights
}

// Experience requirements for fit analysis
export interface ExperienceRequired {
  minYears: number;           // Minimum years required
  maxYears?: number;          // Maximum years (for ranges like "3-5 years")
  level: ExperienceLevel;     // junior/medior/senior/lead/executive
  isStrict: boolean;          // Is this a strict requirement or flexible?
}

export interface JobVacancy {
  title: string;
  company: string | null;
  description: string;
  requirements: string[];
  keywords: string[];
  industry?: string;        // Sector/industry
  location?: string;        // Job location
  employmentType?: string;  // Fulltime/parttime/freelance
  rawText?: string;         // Original vacancy text
  compensation?: JobCompensation; // Optional compensation details
  salaryEstimate?: SalaryEstimate; // AI-estimated salary for this role

  // New fields for fit analysis
  experienceRequired?: ExperienceRequired;  // Required experience (years + level)
  mustHaveSkills?: string[];                // Absolutely required skills
  niceToHaveSkills?: string[];              // Nice-to-have/bonus skills
  requiredEducation?: string;               // Minimum education level if specified
  requiredCertifications?: string[];        // Specific required certifications
}

// ============ Fit Analysis Types ============

export type FitVerdict = 'excellent' | 'good' | 'moderate' | 'challenging' | 'unlikely';
export type FitWarningSeverity = 'info' | 'warning' | 'critical';
export type FitWarningCategory = 'experience' | 'skills' | 'education' | 'industry' | 'certification';

export interface FitWarning {
  severity: FitWarningSeverity;
  category: FitWarningCategory;
  message: string;           // Short message (e.g., "Onvoldoende ervaring")
  detail: string;            // Detailed explanation
}

export interface FitStrength {
  category: FitWarningCategory | 'general';
  message: string;
  detail: string;
}

export interface FitAnalysis {
  overallScore: number;      // 1-100
  verdict: FitVerdict;
  verdictExplanation: string; // Why this verdict
  warnings: FitWarning[];
  strengths: FitStrength[];
  skillMatch: {
    matched: string[];       // Skills candidate has that job requires
    missing: string[];       // Skills job requires that candidate lacks
    bonus: string[];         // Nice-to-have skills candidate has
    matchPercentage: number; // Percentage of must-have skills matched
  };
  experienceMatch: {
    candidateYears: number;  // Estimated years of relevant experience
    requiredYears: number;   // Years required by job
    gap: number;             // Difference (negative = shortfall)
    levelMatch: boolean;     // Does experience level match?
  };
  advice: string;            // Actionable advice for the candidate
}

export interface FitAnalysisRequest {
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy;
}

export interface FitAnalysisResponse {
  success: boolean;
  analysis?: FitAnalysis;
  usage?: TokenUsage;
  error?: string;
}

// ============ CV Types ============

export type CVTemplate = 'modern' | 'classic' | 'minimal';
export type CVStatus = 'draft' | 'generating' | 'generated' | 'pdf_ready' | 'failed';

export interface CVColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

// ============ Dynamic Style Types ============

// Creativity level for style generation
export type StyleCreativityLevel = 'conservative' | 'balanced' | 'creative' | 'experimental';

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

// Column layout options
export type ColumnLayout = 'single' | 'sidebar-left' | 'sidebar-right';

// Page margin options
export type PageMargins = 'narrow' | 'normal' | 'wide';

// Content density options
export type ContentDensity = 'dense' | 'balanced' | 'airy';

// Section spacing options
export type SectionSpacing = 'tight' | 'normal' | 'relaxed' | 'generous';

// Item spacing options
export type ItemSpacing = 'compact' | 'normal' | 'comfortable';

// Date position options
export type DatePosition = 'right-aligned' | 'inline' | 'above' | 'below';

// Location display options
export type LocationDisplay = 'with-company' | 'with-date' | 'separate-line' | 'hidden';

// Photo position options
export type PhotoPosition = 'header-left' | 'header-right' | 'header-center' | 'beside-name';

// Photo size options
export type PhotoSize = 'small' | 'medium' | 'large';

// Photo shape options
export type PhotoShape = 'circle' | 'rounded-square' | 'square';

// Bullet style options
export type BulletStyle = 'disc' | 'circle' | 'square' | 'dash' | 'arrow' | 'checkmark' | 'none';

// Section title position options
export type SectionTitlePosition = 'left' | 'center' | 'left-with-line';

// Sidebar width options
export type SidebarWidth = 'narrow' | 'medium' | 'wide';

// Sidebar content options
export type SidebarContentItem = 'contact' | 'skills' | 'languages' | 'certifications' | 'photo';

// Experience layout options
export type ExperienceLayout = 'stacked' | 'timeline' | 'cards';

// Education layout options
export type EducationLayout = 'stacked' | 'compact' | 'cards';

// Whitespace strategy options
export type WhitespaceStrategy = 'minimal' | 'balanced' | 'generous';

// Paragraph spacing options
export type ParagraphSpacing = 'tight' | 'normal' | 'relaxed';

// Contact layout options
export type ContactLayout = 'single-line' | 'two-lines' | 'stacked' | 'icons-only';

// Contact position options
export type ContactPosition = 'header' | 'sidebar' | 'footer';

// Grid columns options
export type GridColumns = '8' | '12' | '16';

// Layout style (backward compatibility)
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

// Expanded divider styles
export type SectionDividerStyle =
  | 'line'
  | 'dots'
  | 'none'
  | 'accent-bar'
  | 'gradient-line'      // Gradient line
  | 'double-line';       // Double line

export type SkillDisplayStyle = 'tags' | 'list' | 'bars' | 'grid' | 'chips' | 'categories-with-icons' | 'progress-dots';
export type SpacingDensity = 'compact' | 'normal' | 'spacious';

export interface CVStyleColors {
  primary: string;      // Main colors, name
  secondary: string;    // Background accents
  accent: string;       // Links, highlights
  text: string;         // Body text
  muted: string;        // Secondary text

  // === Extended Color Properties (optional) ===
  primaryLight?: string;      // Lighter variant for hover states
  primaryDark?: string;       // Darker variant for emphasis
  accentLight?: string;       // Lighter variant of accent
  linkColor?: string;         // Specific color for links
  borderColor?: string;       // Border color
  successColor?: string;      // Success indicators
  warningColor?: string;      // Warning indicators
  tertiaryColor?: string;     // Third brand color
  quaternaryColor?: string;   // Fourth brand color

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

  // === Extended Typography (new) ===
  smallTextSizePt?: number;           // 8-10pt for dates, labels
  headingWeight?: 'medium' | 'semibold' | 'bold';
  bodyWeight?: 'normal' | 'medium';
  headingTransform?: 'none' | 'uppercase' | 'capitalize';
  jobTitleSizePt?: number;            // 10-13pt
  companySizePt?: number;             // 10-12pt
  sectionTitleLetterSpacing?: 'none' | 'subtle' | 'wide' | 'extra-wide';
}

// === Header Styling (all header-specific properties) ===
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
  headerGradientAngle?: HeaderGradientAngle; // Gradient angle for full-width-accent
  headerPadding?: HeaderPaddingSize;         // Padding size for header

  // === Page Structure (new) ===
  pageMargins?: PageMargins;
  contentDensity?: ContentDensity;

  // === Section Organization (new) ===
  sectionSpacing?: SectionSpacing;

  // === Item Layout (new) ===
  itemSpacing?: ItemSpacing;
  datePosition?: DatePosition;
  locationDisplay?: LocationDisplay;

  // === Photo Settings (new) ===
  photoPosition?: PhotoPosition;
  photoSize?: PhotoSize;
  photoShape?: PhotoShape;

  // === Visual Hierarchy (new) ===
  bulletStyle?: BulletStyle;
  sectionTitlePosition?: SectionTitlePosition;

  // === Column Layout (extended) ===
  columnLayout?: ColumnLayout;
  sidebarWidth?: SidebarWidth;
  sidebarContent?: SidebarContentItem[];

  // === Content Flow (extended) ===
  experienceLayout?: ExperienceLayout;
  educationLayout?: EducationLayout;

  // === Whitespace Strategy (extended) ===
  whitespaceStrategy?: WhitespaceStrategy;
  paragraphSpacing?: ParagraphSpacing;

  // === Contact Info (extended) ===
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
  // New creative options for better visual appeal
  itemStyle?: ItemStyle;         // How experience/education items are styled
  headerAccent?: HeaderAccent;   // Decorative accent for the header
  // Additional variation options
  skillTagVariant?: SkillTagVariant;  // Visual style for skill tags
  itemBorderWidth?: ItemBorderWidth;  // Border width for accent-left items

  // === Summary Section (extended) ===
  summaryFormat?: SummaryFormat;
  summaryAlignment?: SummaryAlignment;
  summaryStyle?: SummaryStyleOption;
  summaryQuoteStyle?: SummaryQuoteStyle;

  // === Date & Location Styling ===
  dateStyle?: 'normal' | 'muted' | 'badge' | 'pill';
  locationStyle?: 'normal' | 'hidden' | 'muted' | 'with-icon';

  // === Shadow & Depth (extended) ===
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
  headerCSS?: string;           // Extra CSS for .cv-header
  itemCSS?: string;             // Extra CSS for .experience-item, .education-item, .item
  sectionCSS?: string;          // Extra CSS for section containers
  skillsCSS?: string;           // Extra CSS for skills display

  // Typography elements
  nameCSS?: string;             // Extra CSS for .name (the person's name)
  headlineCSS?: string;         // Extra CSS for .headline
  sectionTitleCSS?: string;     // Extra CSS for .section-title
  itemTitleCSS?: string;        // Extra CSS for .item-title (job title, degree)
  itemSubtitleCSS?: string;     // Extra CSS for .item-subtitle (company, institution)

  // Content elements
  summaryCSS?: string;          // Extra CSS for .summary
  highlightsCSS?: string;       // Extra CSS for .highlights (bullet points)
  skillTagCSS?: string;         // Extra CSS for .skill-tag

  // Structural
  avatarCSS?: string;           // Extra CSS for .avatar-container
  dividerCSS?: string;          // Extra CSS for section dividers
}

export interface CVStyleConfig {
  styleName: string;           // "Tech Startup Modern"
  styleRationale: string;      // Explanation why this style fits
  colors: CVStyleColors;
  typography: CVStyleTypography;
  layout: CVStyleLayout;
  decorations: CVStyleDecorations;
  header?: CVStyleHeader;      // Header-specific styling (name, headline, accents)
  skills?: CVStyleSkills;      // Skills-specific styling (tags, categories, layout)
  industryFit: string;         // "technology", "finance", etc.
  formalityLevel: 'casual' | 'professional' | 'formal';
  customCSS?: CVStyleCustomCSS; // AI-generated custom CSS for creative styles
}

export interface CV {
  id?: string;
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  template: CVTemplate;
  colorScheme: CVColorScheme;
  brandStyle: string | null;
  styleConfig: CVStyleConfig | null;  // Dynamic AI-generated style
  designTokens?: import('./design-tokens').CVDesignTokens | null; // Design tokens for style history tracking
  avatarUrl: string | null;           // Optional profile photo
  generatedContent: GeneratedCVContent | null;
  elementOverrides?: CVElementOverrides | null; // User's manual element edits
  pdfUrl: string | null;
  status: CVStatus;
  llmProvider: string | null;
  llmModel: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============ Generated CV Content (Structured Output) ============

export interface GeneratedCVExperience {
  title: string;
  company: string;
  location: string | null;
  period: string;
  highlights: string[];
  description?: string;  // Optional paragraph format description (alternative to highlights)
  relevanceScore?: number; // 1-5, how relevant to target job (used for ordering, not displayed)
}

export interface GeneratedCVEducation {
  degree: string;
  institution: string;
  year: string;
  details: string | null;
}

export interface GeneratedCVSkills {
  technical: string[];
  soft: string[];
}

export interface GeneratedCVLanguage {
  language: string;
  level: string;
}

export interface GeneratedCVContent {
  headline: string; // Professional headline adapted for the target job
  summary: string;
  experience: GeneratedCVExperience[];
  education: GeneratedCVEducation[];
  skills: GeneratedCVSkills;
  languages: GeneratedCVLanguage[];
  certifications: string[];
}

// ============ Transaction Types ============

export type TransactionType =
  | 'monthly_free'
  | 'purchase'
  | 'cv_generation'
  | 'refund'
  | 'platform_ai'
  | 'platform_ai_refund';

export interface CreditTransaction {
  id?: string;
  amount: number;
  type: TransactionType;
  description: string;
  molliePaymentId: string | null;
  cvId: string | null;
  createdAt: Timestamp;
}

// ============ Token Usage Types ============

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface TokenCost {
  input: number;   // USD
  output: number;  // USD
  total: number;   // USD
}

export interface StepTokenUsage {
  step: 'profile-parse' | 'profile-enrich' | 'linkedin-export' | 'job' | 'style' | 'generate' | 'regenerate' | 'motivation';
  usage: TokenUsage;
  cost: TokenCost;
  modelId: string;
  timestamp: Date;
}

// ============ Element Override Types (Interactive Preview Editing) ============

export type EditableElementType =
  | 'section'           // Whole section (experience, skills, etc.)
  | 'experience-item'   // Individual job
  | 'education-item'    // Individual education entry
  | 'skill-tag'         // Individual skill
  | 'language-item'     // Individual language
  | 'certification-item' // Individual certification
  | 'summary'           // Summary text
  | 'header';           // CV header

export interface ElementOverride {
  elementId: string;            // Unique identifier (e.g., "experience-0", "skill-react")
  elementType: EditableElementType;
  hidden: boolean;              // Whether element is hidden
  colorOverride?: string;       // Override text/accent color
  backgroundOverride?: string;  // Override background color
  textOverride?: string;        // Override text content
}

// Text content edits for CV preview
export interface CVTextEdits {
  summary?: string;
  experienceHighlights?: Record<number, Record<number, string>>; // experience index -> highlight index -> text
  experienceTitles?: Record<number, string>;    // experience index -> title
  educationDegrees?: Record<number, string>;    // education index -> degree text
  skillsOverrides?: {
    technical?: string[];  // Override technical skills
    soft?: string[];       // Override soft skills
  };
}

export interface CVElementOverrides {
  overrides: ElementOverride[];
  textEdits?: CVTextEdits;       // Text content edits
  lastModified: Date;
}

// ============ API Types ============

export interface GenerateCVRequest {
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  template: CVTemplate;
  colorScheme: CVColorScheme;
}

export interface GenerateCVResponse {
  success: boolean;
  cvId?: string;
  content?: GeneratedCVContent;
  error?: string;
}

export interface GenerateStyleRequest {
  linkedInSummary: string;        // Brief summary of profile for context
  jobVacancy: JobVacancy | null;
  userPreferences?: string;       // Optional user preferences like "formal", "blue colors"
  creativityLevel?: StyleCreativityLevel;  // How creative the AI should be with styling
}

export interface GenerateStyleResponse {
  success: boolean;
  styleConfig?: CVStyleConfig;
  error?: string;
}

// ============ Re-export Design Tokens (v2 Style System) ============

export type {
  CVDesignTokens,
  ThemeBase,
  FontPairing,
  TypeScale,
  SpacingScale,
  HeaderVariant,
  SectionStyle,
  SkillsDisplay,
  ExperienceDescriptionFormat,
  DesignTokenColors,
  GenerateDesignTokensRequest,
  GenerateDesignTokensResponse,
} from './design-tokens';

// ============ Saved Profile Types ============

export interface SavedProfile {
  id: string;
  name: string;                    // User-defined name, e.g., "ServiceNow Developer"
  description?: string;            // Optional description
  parsedData: ParsedLinkedIn;      // The cached parsed profile data
  avatarUrl?: string | null;       // Profile photo URL (uploaded separately)
  sourceInfo?: {                   // Metadata about original sources
    inputType: 'text' | 'file' | 'mixed';
    fileNames?: string[];          // Names of uploaded files
    lastUpdated: Date;
  };
  isDefault?: boolean;             // Mark as default profile
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedProfileSummary {
  id: string;
  name: string;
  description?: string;
  headline: string | null;         // From parsedData for quick display
  experienceCount: number;         // Number of experiences
  avatarUrl?: string | null;       // Profile photo URL for display
  isDefault?: boolean;
  updatedAt: Date;
}

// ============ Motivation Letter Types ============

export interface MotivationLetterInput {
  personalMotivation?: string; // Optional user input about what motivates them
}

export interface GeneratedMotivationLetter {
  opening: string;           // Opening paragraph (attention grabber)
  whyCompany: string;        // Why this company/role
  whyMe: string;             // Why I'm a good fit (experience + skills)
  motivation: string;        // Personal motivation and enthusiasm
  closing: string;           // Call to action and closing
  fullText: string;          // Complete letter as formatted text
}

export interface MotivationLetterRequest {
  cvId: string;
  personalMotivation?: string;
  language: OutputLanguage;
}

export interface MotivationLetterResponse {
  success: boolean;
  letter?: GeneratedMotivationLetter;
  usage?: TokenUsage;
  error?: string;
}

// ============ Global Template Types ============

export interface GlobalTemplate {
  id: string;
  name: string;
  fileName: string;
  storagePath: string;
  storageUrl?: string;
  uploadedBy: string;
  uploadedAt: Date | Timestamp;
  fileSize: number;
}

// ============ PDF/DOCX Template Types ============

// Supported template file types
export type TemplateFileType = 'pdf' | 'docx';

// Field mapping - which profile data goes into this field
export type ProfileFieldMapping =
  | { type: 'personal'; field: 'firstName' | 'lastName' | 'fullName' | 'birthDate' | 'nationality' | 'city' | 'email' | 'phone' }
  | { type: 'experience'; index: number; field: 'company' | 'title' | 'period' | 'description' | 'location' }
  | { type: 'education'; index: number; field: 'school' | 'degree' | 'fieldOfStudy' | 'period' }
  | { type: 'skill'; index: number }
  | { type: 'language'; index: number; field: 'language' | 'proficiency' }
  | { type: 'certification'; index: number }
  | { type: 'custom'; value: string };

// DOCX placeholder - detected placeholder in a DOCX template
export interface DocxPlaceholder {
  id: string;
  originalText: string;               // "{{naam}}" or "[FUNCTIE]" or "Voornaam: _____"
  placeholderType: 'explicit' | 'label-with-space'; // Type of placeholder pattern
  mapping: ProfileFieldMapping;
  confidence: 'low' | 'medium' | 'high';
}

// Individual field position in the template
export interface PDFTemplateField {
  id: string;
  name: string;                    // e.g., "firstName", "lastName"
  label: string;                   // e.g., "Voornaam", "Achternaam"
  page: number;                    // 0-indexed
  x: number;                       // Coordinate from left (in points, 1pt = 1/72 inch)
  y: number;                       // Coordinate from bottom (in points)
  width?: number;                  // Max width for text wrapping
  height?: number;                 // Max height for multi-line text
  fontSize?: number;               // Default: 11
  fontColor?: string;              // Default: #000000
  mapping: ProfileFieldMapping;    // Which profile data goes here
  isMultiLine?: boolean;           // Whether to wrap text
  maxLines?: number;               // Maximum number of lines for multi-line fields
}

// Template metadata
export interface PDFTemplate {
  id: string;
  name: string;
  fileName: string;
  fileType: TemplateFileType;         // 'pdf' or 'docx'
  storageUrl: string;
  pageCount: number;
  fields: PDFTemplateField[];
  placeholders?: DocxPlaceholder[];    // For DOCX templates
  autoAnalyzed?: boolean;              // AI has analyzed this template
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  userId: string;
}

// Summary for list views
export interface PDFTemplateSummary {
  id: string;
  name: string;
  fileName: string;
  fileType: TemplateFileType;
  pageCount: number;
  fieldCount: number;
  placeholderCount?: number;           // For DOCX templates
  autoAnalyzed?: boolean;
  isGlobal?: boolean;                  // True if this is a global template assigned by admin
  globalTemplateId?: string;           // ID in globalTemplates collection
  updatedAt: Date;
}

// AI-detected field from template analysis
export interface DetectedTemplateField {
  label: string;                   // Detected label text (e.g., "Voornaam:")
  page: number;
  x: number;                       // Estimated x coordinate
  y: number;                       // Estimated y coordinate
  width?: number;                  // Estimated width
  suggestedMapping?: ProfileFieldMapping; // AI's suggested mapping
  confidence: 'low' | 'medium' | 'high';
}

// Response from template analysis
export interface TemplateAnalysisResult {
  pageCount: number;
  detectedFields: DetectedTemplateField[];
  detectedPlaceholders?: DocxPlaceholder[];  // For DOCX templates
  templateType?: string;           // e.g., "recruitment", "academic", "generic"
  fileType: TemplateFileType;
}

// Request to fill a template
export interface FillTemplateRequest {
  templateId: string;
  profileData: ParsedLinkedIn;
  customValues?: Record<string, string>; // For custom field mappings
}

// Response from filling a template
export interface FillTemplateResponse {
  success: boolean;
  pdfUrl?: string;                 // URL to download filled PDF
  pdfBase64?: string;              // Base64 encoded PDF (alternative)
  error?: string;
}
