/**
 * Smart DOCX template filler — orchestrator.
 *
 * Coordinates the 2-phase AI-driven approach:
 *   1. Extract structured segments (structure-extractor)
 *   2. AI analyzes template blueprint OR combined analyze+fill (template-analyzer)
 *   3. Duplicate blocks if needed (block-duplicator)
 *   4. AI fills segments with profile data (docx-content-replacer)
 *   5. Apply fills back to XML (structure-extractor)
 *
 * The public interface `fillSmartTemplate()` remains unchanged so the
 * API route (`/api/templates/[id]/fill/route.ts`) needs no changes.
 */

import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import type { LLMProvider } from '@/lib/ai/providers';
import type { ExperienceDescriptionFormat } from '@/types/design-tokens';

import { extractStructuredSegments, applyStructuredFills } from './structure-extractor';
import { analyzeTemplateBlueprint } from '@/lib/ai/template-analyzer';
import { duplicateBlocksInXml } from './block-duplicator';
import { fillStructuredSegments } from '@/lib/ai/docx-content-replacer';

// ==================== Public Types ====================

export interface FillOptions {
  aiProvider: LLMProvider;
  aiApiKey: string;
  aiModel: string;
  jobVacancy?: JobVacancy;
  language?: OutputLanguage;
  fitAnalysis?: FitAnalysis;
  customInstructions?: string;
  descriptionFormat?: ExperienceDescriptionFormat;
}

export interface FillResult {
  filledBuffer: ArrayBuffer;
  filledFields: string[];
  warnings: string[];
  mode: 'ai' | 'none';
}

// ==================== Main Entry Point ====================

/**
 * Fill a DOCX template using AI to intelligently replace all content.
 *
 * Supports any document structure:
 * - Table-based templates (rows/columns for WE, education)
 * - Tab-separated paragraph templates
 * - Simple label:value paragraph templates
 * - Mixed layouts
 */
export async function fillSmartTemplate(
  docxBuffer: ArrayBuffer,
  profileData: ParsedLinkedIn,
  customValues?: Record<string, string>,
  options?: FillOptions,
): Promise<FillResult> {
  const warnings: string[] = [];

  if (!options?.aiApiKey || !options?.aiProvider || !options?.aiModel) {
    throw new Error('AI mode is required for template filling. Please configure your AI API key.');
  }

  // Load DOCX zip
  const zip = await JSZip.loadAsync(docxBuffer);
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('Invalid DOCX file: missing word/document.xml. Only .docx files are supported, not .doc files.');
  }

  let docXml = await documentXmlFile.async('string');
  const language = options.language || 'nl';
  const descriptionFormat = options.descriptionFormat || 'bullets';

  try {
    const profileCounts = {
      workExperience: profileData.experience?.length || 0,
      education: profileData.education?.length || 0,
    };

    // Phase 1: Extract structured segments
    console.log('[smart-template-filler] Phase 1: Extracting structured segments...');
    const extraction = extractStructuredSegments(docXml);
    console.log(`[smart-template-filler] Found ${extraction.segments.length} segments, ${extraction.tables.length} tables`);
    console.log('[smart-template-filler] Template map:\n' + extraction.templateMap);

    // Phase 2: AI analyzes blueprint
    console.log('[smart-template-filler] Phase 2: AI analyzing template blueprint...');
    const blueprint = await analyzeTemplateBlueprint(
      extraction.templateMap,
      profileCounts,
      options.aiProvider,
      options.aiApiKey,
      options.aiModel,
    );
    console.log('[smart-template-filler] Blueprint:', JSON.stringify(blueprint, null, 2));

    // Phase 3: Duplicate blocks if needed
    const needsDuplication = blueprint.repeatingBlocks.some(block => {
      const target = block.sectionType === 'work_experience'
        ? profileCounts.workExperience
        : block.sectionType === 'education'
          ? profileCounts.education
          : 0;
      return block.instances.length < target;
    });

    let fills: Record<string, string>;
    let fillWarnings: string[] = [];

    if (needsDuplication) {
      console.log('[smart-template-filler] Phase 3: Duplicating blocks...');
      const dupResult = duplicateBlocksInXml(
        docXml,
        blueprint,
        extraction.segments,
        extraction.tables,
        profileCounts,
      );
      docXml = dupResult.xml;
      console.log('[smart-template-filler] Duplication details:', dupResult.details);
      warnings.push(...dupResult.details);

      // Re-extract after duplication (positions changed)
      console.log('[smart-template-filler] Re-extracting after duplication...');
      const reExtraction = extractStructuredSegments(docXml);
      console.log(`[smart-template-filler] After duplication: ${reExtraction.segments.length} segments`);

      // Phase 4: AI fills segments (separate call after duplication)
      console.log('[smart-template-filler] Phase 4: AI filling segments...');
      const fillResult = await fillStructuredSegments(
        reExtraction.templateMap,
        blueprint,
        profileData,
        options.aiProvider,
        options.aiApiKey,
        options.aiModel,
        options.jobVacancy,
        language,
        options.fitAnalysis,
        options.customInstructions,
        descriptionFormat,
        customValues,
      );

      fills = fillResult.fills;
      fillWarnings = fillResult.warnings;

      // Phase 5: Apply fills
      console.log(`[smart-template-filler] Phase 5: Applying ${Object.keys(fills).length} fills...`);
      docXml = applyStructuredFills(docXml, fills, reExtraction.segments);
    } else {
      // No duplication needed — use combined analyze+fill in single call for efficiency
      // But we already have the blueprint, so just do the fill
      console.log('[smart-template-filler] No duplication needed, filling directly...');
      const fillResult = await fillStructuredSegments(
        extraction.templateMap,
        blueprint,
        profileData,
        options.aiProvider,
        options.aiApiKey,
        options.aiModel,
        options.jobVacancy,
        language,
        options.fitAnalysis,
        options.customInstructions,
        descriptionFormat,
        customValues,
      );

      fills = fillResult.fills;
      fillWarnings = fillResult.warnings;

      console.log(`[smart-template-filler] Applying ${Object.keys(fills).length} fills...`);
      docXml = applyStructuredFills(docXml, fills, extraction.segments);
    }

    warnings.push(...fillWarnings);

    // Update document XML
    zip.file('word/document.xml', docXml);

    // Process headers and footers with the same approach
    const headerFooterFiles = Object.keys(zip.files).filter(
      name => name.match(/word\/(header|footer)\d*\.xml/)
    );

    for (const fileName of headerFooterFiles) {
      const file = zip.file(fileName);
      if (file) {
        let hfXml = await file.async('string');
        const hfExtraction = extractStructuredSegments(hfXml);

        if (hfExtraction.segments.length > 0) {
          const hfResult = await fillStructuredSegments(
            hfExtraction.templateMap,
            null, // no blueprint needed for headers/footers
            profileData,
            options.aiProvider,
            options.aiApiKey,
            options.aiModel,
            options.jobVacancy,
            language,
            options.fitAnalysis,
            options.customInstructions,
            descriptionFormat,
            customValues,
          );

          hfXml = applyStructuredFills(hfXml, hfResult.fills, hfExtraction.segments);
        }

        zip.file(fileName, hfXml);
      }
    }

    // Generate filled DOCX
    const filledBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    const filledFields = Object.keys(fills).map((_, i) => `ai_segment_${i}`);

    return {
      filledBuffer,
      filledFields,
      warnings,
      mode: filledFields.length > 0 ? 'ai' : 'none',
    };
  } catch (error) {
    console.error('AI content replacement failed:', error);
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
