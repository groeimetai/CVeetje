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
 * Replace text in DOCX XML while preserving styling
 *
 * This function handles text that may be split across multiple <w:t> tags
 * and preserves the XML structure (and thus the styling) around the text.
 */
function replaceTextPreservingStyle(docXml: string, searchText: string, replaceText: string): string {
  // First, try simple replacement within a single <w:t> tag
  const escapedSearch = escapeXml(searchText);
  const escapedReplace = escapeXml(replaceText);

  // Pattern to find text within <w:t> tags
  // This preserves the <w:t> tag and its attributes
  const simplePattern = new RegExp(
    `(<w:t[^>]*>)([^<]*${escapeRegexPattern(escapedSearch)}[^<]*)(</w:t>)`,
    'gi'
  );

  let result = docXml;
  let replaced = false;

  // Try simple replacement first (text in single <w:t> tag)
  if (simplePattern.test(result)) {
    result = result.replace(simplePattern, (match, openTag, content, closeTag) => {
      replaced = true;
      const newContent = content.replace(new RegExp(escapeRegexPattern(escapedSearch), 'gi'), escapedReplace);
      return openTag + newContent + closeTag;
    });
  }

  if (replaced) {
    return result;
  }

  // If not found in single tag, try to handle text split across multiple runs
  // This is more complex - we need to find the text across multiple <w:t> tags
  // and replace while keeping the first run's styling

  // Extract all text content and their positions
  const textRuns: { start: number; end: number; text: string; fullMatch: string }[] = [];
  const runPattern = /<w:r[^>]*>[\s\S]*?<w:t[^>]*>([^<]*)<\/w:t>[\s\S]*?<\/w:r>/g;
  let match;

  while ((match = runPattern.exec(docXml)) !== null) {
    textRuns.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      fullMatch: match[0]
    });
  }

  // Concatenate adjacent text runs and look for our search text
  const searchLower = searchText.toLowerCase();
  let concatenatedText = '';
  let runIndices: number[] = [];

  for (let i = 0; i < textRuns.length; i++) {
    concatenatedText += textRuns[i].text;
    runIndices.push(i);

    // Check if we found our search text
    if (concatenatedText.toLowerCase().includes(searchLower)) {
      // Found it! Now we need to replace across these runs
      const startIdx = concatenatedText.toLowerCase().indexOf(searchLower);
      const endIdx = startIdx + searchText.length;

      // Find which runs contain the text
      let charCount = 0;
      let firstRunIdx = -1;
      let lastRunIdx = -1;
      let offsetInFirstRun = 0;

      for (const idx of runIndices) {
        const runText = textRuns[idx].text;
        const runStart = charCount;
        const runEnd = charCount + runText.length;

        if (firstRunIdx === -1 && runEnd > startIdx) {
          firstRunIdx = idx;
          offsetInFirstRun = startIdx - runStart;
        }
        if (runEnd >= endIdx) {
          lastRunIdx = idx;
          break;
        }
        charCount += runText.length;
      }

      if (firstRunIdx !== -1 && lastRunIdx !== -1) {
        // Replace in the first run, keeping its styling
        const firstRun = textRuns[firstRunIdx];
        const beforeText = firstRun.text.substring(0, offsetInFirstRun);
        const afterText = firstRunIdx === lastRunIdx
          ? firstRun.text.substring(offsetInFirstRun + searchText.length)
          : '';

        // Create new content for first run
        const newFirstRunContent = firstRun.fullMatch.replace(
          />([^<]*)<\/w:t>/,
          `>${escapeXml(beforeText + replaceText + afterText)}</w:t>`
        );

        // Build the new XML
        let newXml = docXml.substring(0, firstRun.start) + newFirstRunContent;

        // Skip middle runs (they get absorbed into first run)
        // Add everything after the last run
        if (lastRunIdx > firstRunIdx) {
          newXml += docXml.substring(textRuns[lastRunIdx].end);
        } else {
          newXml += docXml.substring(firstRun.end);
        }

        return newXml;
      }

      // Reset for next potential match
      concatenatedText = '';
      runIndices = [];
    }

    // Keep a sliding window of runs (max 10)
    if (runIndices.length > 10) {
      const removed = runIndices.shift()!;
      concatenatedText = concatenatedText.substring(textRuns[removed].text.length);
    }
  }

  // If still not found, return original
  return docXml;
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
