/**
 * Zod validation schemas for API request bodies
 *
 * These schemas provide:
 * - Type validation at runtime
 * - Max length protection against DoS
 * - Sanitization of user input
 */

import { z } from 'zod';

// ============ Common Validators ============

/** Max lengths for common string fields */
const MAX_LENGTHS = {
  name: 200,
  headline: 500,
  email: 254,
  phone: 50,
  url: 2048,
  shortText: 500,
  mediumText: 2000,
  longText: 10000,
  description: 50000,
  apiKey: 500,
  fileBase64: 10 * 1024 * 1024, // 10MB in base64
};

/** Email validator */
const emailSchema = z.string().email().max(MAX_LENGTHS.email).optional();

/** URL validator */
const urlSchema = z.string().url().max(MAX_LENGTHS.url).optional();

/** Phone number validator (loose - allows international formats) */
const phoneSchema = z.string().max(MAX_LENGTHS.phone).optional();

// ============ LinkedIn / Profile Schemas ============

export const linkedInExperienceSchema = z.object({
  title: z.string().max(MAX_LENGTHS.shortText),
  company: z.string().max(MAX_LENGTHS.name),
  location: z.string().max(MAX_LENGTHS.shortText).nullable(),
  startDate: z.string().max(50),
  endDate: z.string().max(50).nullable(),
  description: z.string().max(MAX_LENGTHS.longText).nullable(),
  isCurrentRole: z.boolean(),
});

export const linkedInEducationSchema = z.object({
  school: z.string().max(MAX_LENGTHS.name),
  degree: z.string().max(MAX_LENGTHS.shortText).nullable(),
  fieldOfStudy: z.string().max(MAX_LENGTHS.shortText).nullable(),
  startYear: z.string().max(10).nullable(),
  endYear: z.string().max(10).nullable(),
});

export const linkedInSkillSchema = z.object({
  name: z.string().max(MAX_LENGTHS.shortText),
});

export const linkedInLanguageSchema = z.object({
  language: z.string().max(100),
  proficiency: z.string().max(100).nullable(),
});

export const linkedInCertificationSchema = z.object({
  name: z.string().max(MAX_LENGTHS.shortText),
  issuer: z.string().max(MAX_LENGTHS.name).nullable(),
  issueDate: z.string().max(50).nullable(),
});

export const parsedLinkedInSchema = z.object({
  fullName: z.string().min(1).max(MAX_LENGTHS.name),
  headline: z.string().max(MAX_LENGTHS.headline).nullable(),
  location: z.string().max(MAX_LENGTHS.shortText).nullable(),
  about: z.string().max(MAX_LENGTHS.longText).nullable(),
  experience: z.array(linkedInExperienceSchema).max(50),
  education: z.array(linkedInEducationSchema).max(20),
  skills: z.array(linkedInSkillSchema).max(100),
  languages: z.array(linkedInLanguageSchema).max(20),
  certifications: z.array(linkedInCertificationSchema).max(50),
  email: emailSchema,
  phone: phoneSchema,
  linkedinUrl: urlSchema,
  website: urlSchema,
  github: urlSchema,
});

// ============ Job Vacancy Schemas ============

export const jobCompensationSchema = z.object({
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().max(10).optional(),
  salaryPeriod: z.enum(['yearly', 'monthly', 'hourly']).optional(),
  benefits: z.array(z.string().max(MAX_LENGTHS.shortText)).max(20).optional(),
  bonusInfo: z.string().max(MAX_LENGTHS.mediumText).optional(),
  notes: z.string().max(MAX_LENGTHS.mediumText).optional(),
});

export const salaryEstimateSchema = z.object({
  estimatedMin: z.number().positive(),
  estimatedMax: z.number().positive(),
  experienceLevel: z.enum(['junior', 'medior', 'senior', 'lead', 'executive']),
  confidence: z.enum(['low', 'medium', 'high']),
  reasoning: z.string().max(MAX_LENGTHS.mediumText),
  marketInsight: z.string().max(MAX_LENGTHS.mediumText),
});

export const jobVacancySchema = z.object({
  title: z.string().min(1).max(MAX_LENGTHS.shortText),
  company: z.string().max(MAX_LENGTHS.name).nullable(),
  description: z.string().max(MAX_LENGTHS.description),
  requirements: z.array(z.string().max(MAX_LENGTHS.mediumText)).max(50),
  keywords: z.array(z.string().max(100)).max(100),
  industry: z.string().max(MAX_LENGTHS.shortText).optional(),
  location: z.string().max(MAX_LENGTHS.shortText).optional(),
  employmentType: z.string().max(100).optional(),
  rawText: z.string().max(MAX_LENGTHS.description).optional(),
  compensation: jobCompensationSchema.optional(),
  salaryEstimate: salaryEstimateSchema.optional(),
});

// ============ CV Style Schemas ============

export const cvStyleColorsSchema = z.object({
  primary: z.string().max(50),
  secondary: z.string().max(50),
  accent: z.string().max(50),
  text: z.string().max(50),
  muted: z.string().max(50),
  primaryLight: z.string().max(50).optional(),
  primaryDark: z.string().max(50).optional(),
  accentLight: z.string().max(50).optional(),
  linkColor: z.string().max(50).optional(),
  borderColor: z.string().max(50).optional(),
  successColor: z.string().max(50).optional(),
  warningColor: z.string().max(50).optional(),
  tertiaryColor: z.string().max(50).optional(),
  quaternaryColor: z.string().max(50).optional(),
  colorHarmony: z.enum(['monochromatic', 'analogous', 'complementary', 'triadic', 'split-complementary']).optional(),
  colorTemperature: z.enum(['cool', 'neutral', 'warm']).optional(),
  contrastLevel: z.enum(['subtle', 'moderate', 'high']).optional(),
  colorMode: z.enum(['light', 'dark', 'auto']).optional(),
  saturationLevel: z.enum(['muted', 'normal', 'vivid']).optional(),
});

// Simplified style config validation (full schema would be very large)
export const cvStyleConfigSchema = z.object({
  styleName: z.string().max(MAX_LENGTHS.shortText),
  styleRationale: z.string().max(MAX_LENGTHS.mediumText),
  colors: cvStyleColorsSchema,
  typography: z.object({}).passthrough(), // Allow any typography config
  layout: z.object({}).passthrough(),     // Allow any layout config
  decorations: z.object({}).passthrough(), // Allow any decorations config
  header: z.object({}).passthrough().optional(),
  skills: z.object({}).passthrough().optional(),
  industryFit: z.string().max(100),
  formalityLevel: z.enum(['casual', 'professional', 'formal']),
  customCSS: z.object({}).passthrough().optional(),
});

// ============ API Request Schemas ============

/** CV Generation request */
export const generateCVRequestSchema = z.object({
  linkedInData: parsedLinkedInSchema,
  jobVacancy: jobVacancySchema.nullable(),
  styleConfig: cvStyleConfigSchema,
  avatarUrl: z.string().max(MAX_LENGTHS.url).nullable().optional(),
  language: z.enum(['nl', 'en']).default('nl'),
});

/** Style Generation request */
export const generateStyleRequestSchema = z.object({
  linkedInSummary: z.string().max(MAX_LENGTHS.mediumText),
  jobVacancy: jobVacancySchema.nullable(),
  userPreferences: z.string().max(MAX_LENGTHS.mediumText).optional(),
  creativityLevel: z.enum(['conservative', 'balanced', 'creative', 'experimental']).optional(),
});

/** Profile parse request */
export const profileParseRequestSchema = z.object({
  sources: z.array(z.object({
    id: z.string().max(100),
    type: z.enum(['text', 'file']),
    text: z.string().max(MAX_LENGTHS.description).optional(),
    file: z.object({
      name: z.string().max(MAX_LENGTHS.name),
      mediaType: z.string().max(100),
      base64: z.string().max(MAX_LENGTHS.fileBase64),
    }).optional(),
  })).min(1).max(10),
});

/** Job parse request */
export const jobParseRequestSchema = z.object({
  text: z.string().min(10).max(MAX_LENGTHS.description),
});

/** API key save request */
export const apiKeySaveRequestSchema = z.object({
  provider: z.string().max(100),
  apiKey: z.string().min(1).max(MAX_LENGTHS.apiKey),
  model: z.string().max(100),
});

/** Mollie checkout request */
export const mollieCheckoutRequestSchema = z.object({
  packageId: z.enum(['pack_5', 'pack_15', 'pack_30']),
});

/** Motivation letter request */
export const motivationLetterRequestSchema = z.object({
  personalMotivation: z.string().max(MAX_LENGTHS.mediumText).optional(),
  language: z.enum(['nl', 'en']).default('nl'),
});

/** PDF generation request */
export const pdfGenerateRequestSchema = z.object({
  pageMode: z.enum(['multi-page', 'single-page']).default('multi-page'),
});

/** Profile save request */
export const profileSaveRequestSchema = z.object({
  name: z.string().min(1).max(MAX_LENGTHS.name),
  description: z.string().max(MAX_LENGTHS.mediumText).optional(),
  parsedData: parsedLinkedInSchema,
  avatarUrl: z.string().max(MAX_LENGTHS.url).nullable().optional(),
  isDefault: z.boolean().optional(),
});

// ============ Validation Helpers ============

/**
 * Validate request body against a schema
 * Returns parsed data or throws a formatted error
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ValidationError('Invalid request body', errors);
  }

  return result.data;
}

/**
 * Custom validation error with structured details
 */
export class ValidationError extends Error {
  public readonly errors: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    errors: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      error: this.message,
      details: this.errors,
    };
  }
}

/**
 * Check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
