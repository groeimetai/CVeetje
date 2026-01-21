import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedLinkedIn, JobVacancy } from '@/types';
import type { LLMProvider } from '@/lib/ai/providers';
import { fillDocumentWithAI } from '@/lib/ai/docx-content-replacer';

/**
 * Options for filling a template
 */
export interface FillOptions {
  aiProvider: LLMProvider;
  aiApiKey: string;
  aiModel: string;
  jobVacancy?: JobVacancy;
}

/**
 * Result of filling a template
 */
export interface FillResult {
  filledBuffer: ArrayBuffer;
  filledFields: string[];
  warnings: string[];
  mode: 'ai' | 'none';
}

// ==================== Helper Functions ====================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extract all text segments from DOCX XML with their indices
 * Returns both the segments and the positions in the XML for replacement
 */
function extractIndexedSegments(docXml: string): {
  segments: { index: number; text: string; start: number; end: number }[];
} {
  const segments: { index: number; text: string; start: number; end: number }[] = [];
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  let index = 0;

  while ((match = regex.exec(docXml)) !== null) {
    segments.push({
      index,
      text: match[1], // The text content
      start: match.index,
      end: match.index + match[0].length,
    });
    index++;
  }

  return { segments };
}

/**
 * Apply filled segments back to the DOCX XML
 * Replaces text content by index while preserving XML structure
 */
function applyFilledSegments(
  docXml: string,
  filledSegments: Record<string, string>
): string {
  let result = docXml;
  let offset = 0; // Track position offset as we make replacements

  const regex = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  let match;
  let index = 0;

  // We need to collect all matches first, then replace in order
  const matches: { fullMatch: string; attrs: string; content: string; start: number }[] = [];

  while ((match = regex.exec(docXml)) !== null) {
    matches.push({
      fullMatch: match[0],
      attrs: match[1],
      content: match[2],
      start: match.index,
    });
  }

  // Apply replacements in reverse order to avoid offset issues
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const indexStr = i.toString();

    if (filledSegments[indexStr] !== undefined) {
      const newContent = escapeXml(filledSegments[indexStr]);
      const newTag = `<w:t${m.attrs}>${newContent}</w:t>`;

      result =
        result.substring(0, m.start) +
        newTag +
        result.substring(m.start + m.fullMatch.length);
    }
  }

  return result;
}

// ==================== Smart Template Filling ====================

/**
 * Fill a DOCX template using AI to intelligently replace all content
 *
 * The AI analyzes the entire document and replaces:
 * - Personal information (names, contact details, location)
 * - Work experience (companies, titles, descriptions, dates)
 * - Education (schools, degrees, dates)
 * - Skills and other sections
 *
 * AI handles any document format - no specific placeholder patterns needed.
 */
export async function fillSmartTemplate(
  docxBuffer: ArrayBuffer,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>,
  options?: FillOptions
): Promise<FillResult> {
  const filledFields: string[] = [];
  const warnings: string[] = [];

  // Validate we have AI credentials
  if (!options?.aiApiKey || !options?.aiProvider || !options?.aiModel) {
    throw new Error('AI mode is required for template filling. Please configure your AI API key.');
  }

  // Load the DOCX as a ZIP
  const zip = await JSZip.loadAsync(docxBuffer);

  // Get the main document XML
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: missing word/document.xml. Note: Only .docx files are supported, not .doc (Word 97-2003) files.');
  }

  let docXml = await documentXmlFile.async('string');

  try {
    // Extract indexed segments from the document
    const { segments } = extractIndexedSegments(docXml);

    // Prepare segments for AI (just index and text)
    const segmentsForAI = segments.map(s => ({ index: s.index, text: s.text }));

    // Get AI to fill the segments
    const aiResult = await fillDocumentWithAI(
      segmentsForAI,
      profileData,
      options.aiProvider,
      options.aiApiKey,
      options.aiModel,
      options.jobVacancy
    );

    // Apply filled segments back to the XML
    docXml = applyFilledSegments(docXml, aiResult.filledSegments);

    // Count filled fields
    const filledCount = Object.keys(aiResult.filledSegments).length;
    for (let i = 0; i < filledCount; i++) {
      filledFields.push(`ai_segment_${i}`);
    }

    // Add AI warnings
    warnings.push(...(aiResult.warnings || []));

    // Update the document
    zip.file('word/document.xml', docXml);

    // Also process headers and footers
    const headerFooterFiles = Object.keys(zip.files).filter(
      name => name.match(/word\/(header|footer)\d*\.xml/)
    );

    for (const fileName of headerFooterFiles) {
      const file = zip.file(fileName);
      if (file) {
        let content = await file.async('string');

        // Extract and fill segments in headers/footers too
        const { segments: hfSegments } = extractIndexedSegments(content);
        if (hfSegments.length > 0) {
          const hfSegmentsForAI = hfSegments.map(s => ({ index: s.index, text: s.text }));

          // Use same AI to fill header/footer segments
          const hfResult = await fillDocumentWithAI(
            hfSegmentsForAI,
            profileData,
            options.aiProvider,
            options.aiApiKey,
            options.aiModel,
            options.jobVacancy
          );

          content = applyFilledSegments(content, hfResult.filledSegments);
        }

        zip.file(fileName, content);
      }
    }

    // Generate the filled DOCX
    const filledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return {
      filledBuffer,
      filledFields,
      warnings,
      mode: filledFields.length > 0 ? 'ai' as const : 'none' as const,
    };
  } catch (aiError) {
    console.error('AI content replacement failed:', aiError);
    throw new Error('Failed to fill template with AI. Please check your API key and try again.');
  }
}

/**
 * Extract raw text from a DOCX for preview/analysis
 */
export async function extractDocxText(docxBuffer: ArrayBuffer): Promise<string> {
  const buffer = Buffer.from(docxBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
