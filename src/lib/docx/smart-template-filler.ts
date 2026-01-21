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
 * Replace FIRST occurrence of text in DOCX XML while preserving styling
 *
 * IMPORTANT: Only replaces the FIRST match, not all matches!
 * This allows the AI to specify multiple replacements for repeated placeholders
 * like "Functie :" which appears multiple times (once per job).
 */
function replaceTextPreservingStyle(docXml: string, searchText: string, replaceText: string): string {
  const escapedSearch = escapeXml(searchText);
  const escapedReplace = escapeXml(replaceText);

  // Track if we've made a replacement (only replace FIRST occurrence)
  let replaced = false;

  // Only replace text within <w:t> tags, keeping the tag structure intact
  const result = docXml.replace(
    /(<w:t[^>]*>)([^<]*?)(<\/w:t>)/g,
    (match, openTag, content, closeTag) => {
      // Skip if we already made a replacement
      if (replaced) {
        return match;
      }

      // Check if this content contains our search text (case-insensitive)
      if (content.toLowerCase().includes(escapedSearch.toLowerCase())) {
        // Replace only the FIRST occurrence within this tag
        const newContent = content.replace(
          new RegExp(escapeRegexPattern(escapedSearch), 'i'), // No 'g' flag - only first match
          escapedReplace
        );
        replaced = true;
        return openTag + newContent + closeTag;
      }
      // Return unchanged if no match
      return match;
    }
  );

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

    // Apply AI replacements to the document XML while preserving styling
    for (const replacement of aiResult.replacements) {
      if (replacement.confidence !== 'low') {
        const originalXml = docXml;
        docXml = replaceTextPreservingStyle(
          docXml,
          replacement.searchText,
          replacement.replaceWith
        );

        // Check if replacement was made
        if (docXml !== originalXml) {
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

        // Apply same AI replacements to headers/footers while preserving styling
        for (const replacement of aiResult.replacements) {
          if (replacement.confidence !== 'low') {
            content = replaceTextPreservingStyle(
              content,
              replacement.searchText,
              replacement.replaceWith
            );
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
