import { Timestamp } from 'firebase/firestore';

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

export interface UserApiKey {
  provider: string;
  encryptedKey: string;
  model: string;
}

export interface UserCredits {
  balance: number;
  lastFreeReset: Timestamp;
}

export interface User {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  apiKey: UserApiKey | null;
  credits: UserCredits;
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
}

// ============ Job Vacancy Types ============

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
  | 'open-sans';

// Layout options - simplified to single-column only for reliable PDF rendering
export type LayoutStyle = 'single-column';

// Expanded header styles for more creative freedom
export type HeaderStyle =
  | 'centered'
  | 'left-aligned'
  | 'banner'
  | 'full-width-accent'  // Accent bar over full header width
  | 'split'              // Name left, contact right
  | 'minimal'            // Ultra clean, no borders
  | 'bold-name';         // Oversized name, small details

// Creative styling options - expanded for visual variety
export type ItemStyle =
  | 'inline'
  | 'card-subtle'
  | 'card-bordered'
  | 'accent-left'        // Colored line on the left
  | 'timeline'           // Timeline style with vertical line
  | 'minimal-dots';      // Dots as markers

export type HeaderAccent = 'none' | 'underline' | 'side-bar' | 'gradient-bar';

// Expanded divider styles
export type SectionDividerStyle =
  | 'line'
  | 'dots'
  | 'none'
  | 'accent-bar'
  | 'gradient'           // Gradient line
  | 'double-line';       // Double line

export type SkillDisplayStyle = 'tags' | 'list' | 'bars' | 'grid' | 'chips' | 'categories-with-icons' | 'progress-dots';
export type SpacingDensity = 'compact' | 'normal' | 'spacious';

export interface CVStyleColors {
  primary: string;      // Main colors, name
  secondary: string;    // Background accents
  accent: string;       // Links, highlights
  text: string;         // Body text
  muted: string;        // Secondary text
}

export interface CVStyleTypography {
  headingFont: FontFamily;
  bodyFont: FontFamily;
  nameSizePt: number;       // 20-32pt
  headingSizePt: number;    // 11-16pt
  bodySizePt: number;       // 9-11pt
  lineHeight: number;       // 1.3-1.8
}

// Header gradient angle options for full-width-accent headers
export type HeaderGradientAngle = '45' | '90' | '135' | '180';

// Header padding options
export type HeaderPaddingSize = 'compact' | 'normal' | 'spacious';

// Skill tag visual variants
export type SkillTagVariant = 'filled' | 'outlined' | 'ghost' | 'gradient';

// Border width for accent-left items
export type ItemBorderWidth = 'thin' | 'normal' | 'thick';

export interface CVStyleLayout {
  style: LayoutStyle;
  headerStyle: HeaderStyle;
  sectionOrder: string[];   // Order of sections
  sectionDivider: SectionDividerStyle;
  skillDisplay: SkillDisplayStyle;
  spacing: SpacingDensity;
  showPhoto: boolean;
  headerGradientAngle?: HeaderGradientAngle; // Gradient angle for full-width-accent
  headerPadding?: HeaderPaddingSize;         // Padding size for header
}

// SVG Decoration Types
export type SVGDecorationTheme =
  | 'none'
  | 'geometric'
  | 'organic'
  | 'abstract'
  | 'minimal'
  | 'tech'
  | 'creative';

export type SVGDecorationPlacement =
  | 'corners'
  | 'header'
  | 'background';

export interface SVGDecorationConfig {
  enabled: boolean;
  theme: SVGDecorationTheme;
  placement: SVGDecorationPlacement;
  opacity: number;         // 0.05 - 0.3
  scale: 'small' | 'medium' | 'large';
  colorSource: 'primary' | 'accent' | 'secondary' | 'mixed';
}

export interface SVGDecorationResult {
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  background?: string;
}

export interface CVStyleDecorations {
  intensity: 'subtle' | 'moderate' | 'bold';
  useBorders: boolean;
  useBackgrounds: boolean;
  iconStyle: 'none' | 'minimal' | 'filled';
  cornerStyle: 'sharp' | 'rounded' | 'pill';
  // New creative options for better visual appeal
  itemStyle?: ItemStyle;         // How experience/education items are styled
  headerAccent?: HeaderAccent;   // Decorative accent for the header
  // SVG decorations for creative styles
  svgDecorations?: SVGDecorationConfig;
  // Additional variation options
  skillTagVariant?: SkillTagVariant;  // Visual style for skill tags
  itemBorderWidth?: ItemBorderWidth;  // Border width for accent-left items
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
  summary: string;
  experience: GeneratedCVExperience[];
  education: GeneratedCVEducation[];
  skills: GeneratedCVSkills;
  languages: GeneratedCVLanguage[];
  certifications: string[];
}

// ============ Transaction Types ============

export type TransactionType = 'monthly_free' | 'purchase' | 'cv_generation' | 'refund';

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
  step: 'linkedin' | 'job' | 'style' | 'generate' | 'regenerate';
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
}

export interface CVElementOverrides {
  overrides: ElementOverride[];
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
