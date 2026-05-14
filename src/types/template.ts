import type { Timestamp } from 'firebase/firestore';
import type { ParsedLinkedIn } from './linkedin';

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
  placeholderType: 'explicit' | 'label-with-space';
  mapping: ProfileFieldMapping;
  confidence: 'low' | 'medium' | 'high';
}

// Individual field position in the template
export interface PDFTemplateField {
  id: string;
  name: string;                    // e.g., "firstName", "lastName"
  label: string;                   // e.g., "Voornaam", "Achternaam"
  page: number;                    // 0-indexed
  x: number;                       // Coordinate from left (in points)
  y: number;                       // Coordinate from bottom (in points)
  width?: number;
  height?: number;
  fontSize?: number;
  fontColor?: string;
  mapping: ProfileFieldMapping;
  isMultiLine?: boolean;
  maxLines?: number;
}

export interface PDFTemplate {
  id: string;
  name: string;
  fileName: string;
  fileType: TemplateFileType;
  storageUrl: string;
  pageCount: number;
  fields: PDFTemplateField[];
  placeholders?: DocxPlaceholder[];
  autoAnalyzed?: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  userId: string;
}

export interface PDFTemplateSummary {
  id: string;
  name: string;
  fileName: string;
  fileType: TemplateFileType;
  pageCount: number;
  fieldCount: number;
  placeholderCount?: number;
  autoAnalyzed?: boolean;
  isGlobal?: boolean;
  globalTemplateId?: string;
  updatedAt: Date;
}

// AI-detected field from template analysis
export interface DetectedTemplateField {
  label: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  suggestedMapping?: ProfileFieldMapping;
  confidence: 'low' | 'medium' | 'high';
}

export interface TemplateAnalysisResult {
  pageCount: number;
  detectedFields: DetectedTemplateField[];
  detectedPlaceholders?: DocxPlaceholder[];
  templateType?: string;
  fileType: TemplateFileType;
}

export interface FillTemplateRequest {
  templateId: string;
  profileData: ParsedLinkedIn;
  customValues?: Record<string, string>;
}

export interface FillTemplateResponse {
  success: boolean;
  pdfUrl?: string;
  pdfBase64?: string;
  error?: string;
}
