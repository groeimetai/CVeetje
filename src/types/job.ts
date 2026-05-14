import type { OutputLanguage } from './language';
import type { ParsedLinkedIn } from './linkedin';
import type { TokenUsage } from './user';

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

  // Fields for fit analysis
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
