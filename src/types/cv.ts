import type { Timestamp } from 'firebase/firestore';
import type { OutputLanguage } from './language';
import type { ParsedLinkedIn } from './linkedin';
import type { JobVacancy, FitAnalysis, GeneratedMotivationLetter } from './job';
import type { CVStyleConfig, StyleCreativityLevel } from './cv-style';
import type { CVDesignTokens } from './design-tokens';

export type CVTemplate = 'modern' | 'classic' | 'minimal';
export type CVStatus = 'draft' | 'generating' | 'generated' | 'pdf_ready' | 'failed';

export interface CVColorScheme {
  primary: string;
  secondary: string;
  accent: string;
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

export interface GeneratedCVProject {
  title: string;
  description: string;
  technologies: string[];
  url: string | null;
  period: string;
  highlights: string[];
}

export interface GeneratedCVContent {
  headline: string; // Professional headline adapted for the target job
  summary: string;
  experience: GeneratedCVExperience[];
  education: GeneratedCVEducation[];
  skills: GeneratedCVSkills;
  languages: GeneratedCVLanguage[];
  certifications: string[];
  projects?: GeneratedCVProject[];
  interests?: string[]; // Personal interests/hobbies. Each item is either a bare hobby name ("Schaken") or a hobby with a short vacancy-relevant framing the AI added ("Schaken — strategisch denken"). Names always come from the source profile; the framing (after " — ") is the AI's contribution. See src/lib/cv/interest-format.ts.
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
  elementId: string;
  elementType: EditableElementType;
  hidden: boolean;
  colorOverride?: string;
  backgroundOverride?: string;
  textOverride?: string;
}

// Text content edits for CV preview
export interface CVTextEdits {
  summary?: string;
  experienceHighlights?: Record<number, Record<number, string>>;
  experienceTitles?: Record<number, string>;
  educationDegrees?: Record<number, string>;
  skillsOverrides?: {
    technical?: string[];
    soft?: string[];
  };
}

export interface CVElementOverrides {
  overrides: ElementOverride[];
  textEdits?: CVTextEdits;
  lastModified: Date;
}

// ============ CV Document ============

export interface CV {
  id?: string;
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  template: CVTemplate;
  colorScheme: CVColorScheme;
  brandStyle: string | null;
  /** @deprecated Legacy field. New CVs are written with `styleConfig: null` and rely on `designTokens` instead. */
  styleConfig: CVStyleConfig | null;
  designTokens?: CVDesignTokens | null;
  avatarUrl: string | null;
  generatedContent: GeneratedCVContent | null;
  elementOverrides?: CVElementOverrides | null;
  pdfUrl: string | null;
  status: CVStatus;
  llmProvider: string | null;
  llmModel: string | null;
  fitAnalysis?: FitAnalysis | null;
  motivationLetter?: GeneratedMotivationLetter | null;
  language?: OutputLanguage;
  // Dispute system state — a user can request up to 3 reviews when they
  // believe the AI got something wrong. Attempts 1 and 2 go through an AI
  // gatekeeper; attempt 3 escalates to human admin review.
  disputeCount?: number;
  creativityLevel?: StyleCreativityLevel;
  creativityLevelHistory?: StyleCreativityLevel[];

  // Per-CV AI usage telemetry — populated by recordOperationUsage()
  // so the admin/owner can see exactly which operations were billed and
  // their token cost, and so pricing can be recalibrated from real data.
  aiUsage?: CVAIUsageEntry[];
  aiUsageTotals?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CVAIUsageEntry {
  operation: string;          // PlatformOperation, but stored as string for forward-compat
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelId: string;
  timestamp: Date | Timestamp;
}
