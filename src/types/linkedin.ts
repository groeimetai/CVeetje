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

export interface LinkedInProject {
  title: string;
  description: string | null;
  technologies: string[];
  url: string | null;
  startDate: string | null;
  endDate: string | null;
  role: string | null;
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
  projects?: LinkedInProject[];
  // Contact info - manually entered by user (not from LinkedIn)
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  website?: string;
  github?: string;
  // Personal info commonly included on Dutch CVs but not exported by LinkedIn
  birthDate?: string;
  // Hobbies/interests — free-text strings, optional. Surfaces in CV when the
  // user opts in via the wizard checkbox.
  interests?: string[];
}

// Contact information for CV header
export interface CVContactInfo {
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  website?: string;
  github?: string;
  birthDate?: string;
}

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
