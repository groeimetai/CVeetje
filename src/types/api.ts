import type { ParsedLinkedIn } from './linkedin';
import type { JobVacancy } from './job';
import type { CVTemplate, CVColorScheme, GeneratedCVContent } from './cv';
import type { CVStyleConfig, StyleCreativityLevel } from './cv-style';

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
  linkedInSummary: string;
  jobVacancy: JobVacancy | null;
  userPreferences?: string;
  creativityLevel?: StyleCreativityLevel;
}

export interface GenerateStyleResponse {
  success: boolean;
  styleConfig?: CVStyleConfig;
  error?: string;
}
