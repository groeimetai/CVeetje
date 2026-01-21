import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedLinkedIn, JobVacancy } from '@/types';
import type { LLMProvider } from '@/lib/ai/providers';
import { analyzeAndGenerateReplacements } from '@/lib/ai/docx-content-replacer';

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

function escapeRegexPattern(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a flexible regex pattern that can match text even when XML tags are between words
 */
function createFlexibleXmlPattern(text: string): RegExp {
  const words = text.split(/\s+/);
  const flexiblePattern = words
    .map(word => escapeRegexPattern(word))
    .join('(?:</w:t></w:r><w:r[^>]*><w:t[^>]*>|\\s+)');
  return new RegExp(flexiblePattern, 'gi');
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
    // Extract text for AI analysis
    const documentText = await extractDocxText(docxBuffer);

    // Get AI-generated replacements
    const aiResult = await analyzeAndGenerateReplacements(
      documentText,
      profileData,
      options.aiProvider,
      options.aiApiKey,
      options.aiModel,
      options.jobVacancy
    );

    // Apply AI replacements to the document XML
    for (const replacement of aiResult.replacements) {
      if (replacement.confidence !== 'low') {
        const searchPattern = escapeXml(replacement.searchText);
        const replaceValue = escapeXml(replacement.replaceWith);

        // Try to find and replace in the XML (handling XML tags between words)
        const flexiblePattern = createFlexibleXmlPattern(searchPattern);
        if (docXml.match(flexiblePattern)) {
          docXml = docXml.replace(flexiblePattern, replaceValue);
          filledFields.push(`ai_${replacement.type}`);
        }
      }
    }

    // Add AI warnings
    warnings.push(...(aiResult.warnings || []));

    // Update the document
    zip.file('word/document.xml', docXml);

    // Also process headers and footers with AI replacements
    const headerFooterFiles = Object.keys(zip.files).filter(
      name => name.match(/word\/(header|footer)\d*\.xml/)
    );

    for (const fileName of headerFooterFiles) {
      const file = zip.file(fileName);
      if (file) {
        let content = await file.async('string');

        // Apply same AI replacements to headers/footers
        for (const replacement of aiResult.replacements) {
          if (replacement.confidence !== 'low') {
            const searchPattern = escapeXml(replacement.searchText);
            const replaceValue = escapeXml(replacement.replaceWith);
            const flexiblePattern = createFlexibleXmlPattern(searchPattern);
            content = content.replace(flexiblePattern, replaceValue);
          }
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
