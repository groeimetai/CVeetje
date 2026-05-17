/**
 * AI Phase 1 (PDF): Vision-based template blueprint analysis.
 *
 * Mirror of `template-analyzer.ts` (DOCX), but for PDFs:
 * - Input: page images (PNG data URLs) + page dimensions in PDF points
 * - Output: rich blueprint with BOXES per field (x, y, width, height in PDF
 *   points, top-left origin), font-hints, section classification, and
 *   repeating-block detection.
 *
 * Coordinate convention: we use TOP-LEFT origin throughout the AI flow (more
 * intuitive for the model and matches the page image). Conversion to PDF
 * bottom-left origin happens inside the overlay renderer.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider, type LLMProvider } from './providers';
import { resolveTemperature } from './temperature';
import { withRetry } from './retry';
import type { RenderedPage } from '@/lib/pdf/pdf-to-image';

// ==================== Schema ====================

const fieldKindSchema = z.enum([
  'personal_info',
  'work_experience',
  'education',
  'skills',
  'languages',
  'certifications',
  'profile_summary',
  'special_notes',
  'photo',
  'other',
]);

const profileFieldSchema = z.enum([
  // personal
  'fullName',
  'firstName',
  'lastName',
  'headline',
  'email',
  'phone',
  'location',
  'city',
  'birthDate',
  'nationality',
  'linkedinUrl',
  // experience (with index)
  'experience.title',
  'experience.company',
  'experience.location',
  'experience.period',
  'experience.description',
  // education (with index)
  'education.school',
  'education.degree',
  'education.fieldOfStudy',
  'education.period',
  // skills/languages
  'skill',
  'language.name',
  'language.proficiency',
  'certification',
  // freeform / unknown
  'profile.summary',
  'other',
]);

const fontStyleSchema = z.enum(['normal', 'italic']);
const fontWeightSchema = z.enum(['normal', 'bold']);
const textAlignSchema = z.enum(['left', 'center', 'right']);

export const pdfFieldSchema = z.object({
  id: z.string().describe('Unique field id, e.g. "f0", "f1" — assigned in document reading order'),
  page: z.number().int().describe('1-indexed page number'),
  // Box in PDF points (1pt = 1/72 in), TOP-LEFT origin.
  // x,y is the top-left corner of the writable box; width/height is the box size.
  x: z.number().describe('Left edge in PDF points from page left'),
  y: z.number().describe('Top edge in PDF points from page top (NOT PDF-native bottom origin)'),
  width: z.number().describe('Box width in PDF points — must be the writable area, not just the label'),
  height: z.number().describe('Box height in PDF points'),
  // Classification
  kind: fieldKindSchema.describe('Section this field belongs to'),
  profileField: profileFieldSchema.describe('Which profile attribute fills this slot'),
  index: z.number().int().optional().describe('Index for array fields (0=first experience, 1=second, …)'),
  // Visual hints — used by the overlay renderer
  fontSizeHint: z.number().describe('Estimated font size in points (e.g. 10, 11, 12)'),
  fontWeight: fontWeightSchema.default('normal'),
  fontStyle: fontStyleSchema.default('normal'),
  fontColor: z.string().describe('Hex color, e.g. "#1a1a1a"').default('#111111'),
  align: textAlignSchema.default('left'),
  // Context to help debugging + the fill prompt
  label: z.string().optional().describe('The label visible next to/above this field, if any (e.g. "Email:")'),
  multiLine: z.boolean().default(false).describe('True for description blocks (multi-line)'),
});

export type PDFField = z.infer<typeof pdfFieldSchema>;

export const pdfBlueprintSchema = z.object({
  templateType: z.string().optional().describe('e.g. "recruitment", "academic", "corporate"'),
  // Detected output language of the template (so we can warn if user picks a different one).
  templateLanguage: z.enum(['nl', 'en', 'de', 'fr', 'other', 'unknown']).default('unknown'),
  fields: z.array(pdfFieldSchema),
  // Repeating blocks: groups of fields that form one entry (e.g. experience row)
  repeatingBlocks: z.array(z.object({
    kind: z.enum(['work_experience', 'education', 'skills', 'languages', 'certifications']),
    instances: z.array(z.object({
      fieldIds: z.array(z.string()).describe('Field ids belonging to one instance'),
      // Bounding box of one instance — used by HTML reconstructor to clone if overflow.
      boundingBox: z.object({
        page: z.number().int(),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
    })),
  })).default([]),
  // Photo slot if any.
  photoSlot: z.object({
    page: z.number().int(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

export type PDFBlueprint = z.infer<typeof pdfBlueprintSchema>;

// ==================== Analysis ====================

export interface AnalyzePDFTemplateOptions {
  pages: RenderedPage[];
  profileCounts: { workExperience: number; education: number };
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

/**
 * Send all page images to the AI and ask for a blueprint of all fillable fields.
 */
export async function analyzePDFTemplate(
  opts: AnalyzePDFTemplateOptions,
): Promise<{ blueprint: PDFBlueprint; usage: { inputTokens: number; outputTokens: number } }> {
  const { pages, profileCounts, provider, apiKey, model } = opts;

  const aiProvider = createAIProvider(provider, apiKey);

  const systemPrompt = `You are a CV/resume PDF template structure analyzer.

You receive the rendered images of every page of a template the recruiter has supplied,
plus the page dimensions in PDF points. Your job is to identify EVERY fillable area in
the template — the boxes where the candidate's information should go — and classify them.

═══════════════════════════════════════════════
COORDINATE SYSTEM
═══════════════════════════════════════════════
- All coordinates are in PDF POINTS (1pt = 1/72 inch). For A4 the page is 595 wide × 842 tall.
- Use a TOP-LEFT origin: x grows right, y grows DOWN. y=0 is the top edge.
- For each field give the TOP-LEFT corner (x, y) AND the writable box size (width, height).
  The box must be the actual writable area, not just a label rectangle.

═══════════════════════════════════════════════
WHAT TO DETECT
═══════════════════════════════════════════════
- Any visible label/placeholder/empty line/colon-followed-blank or section row
  where candidate info should be written.
- Photo placeholder if present (kind="photo", profileField="other").
- Repeating areas (multiple experience rows, multiple education rows). Output ONE
  field per slot — even empty ones — so the renderer can fill them in order.
- The TOTAL writable width/height (so overlay can do shrink-to-fit when content is large).

═══════════════════════════════════════════════
FIELD IDS
═══════════════════════════════════════════════
- Assign sequential ids: "f0", "f1", "f2" … in reading order (top→bottom, left→right per page).
- For repeating blocks, list per-instance fieldIds and the bounding box of the whole instance.

═══════════════════════════════════════════════
FONT HINTS
═══════════════════════════════════════════════
- Estimate fontSizeHint in points by comparing to the label/heading visible next to the box.
- Bold/italic only when clearly indicated by surrounding style.
- Hex color: dark grey/black is "#111111", muted accents "#555555". If unsure, default.
- align: "left" for most CV fields, "center" for centered headers, "right" for right-aligned dates.

═══════════════════════════════════════════════
REPEATING BLOCK DETECTION
═══════════════════════════════════════════════
- If the template shows e.g. 3 experience rows but profile has ${profileCounts.workExperience} experiences,
  STILL only output the slots that physically exist in the template. The renderer will decide
  whether to overflow into HTML-reconstruction.
- A repeating block instance = one "row" = a group of fields (title, company, period, description).

═══════════════════════════════════════════════
HONESTY
═══════════════════════════════════════════════
- Do NOT invent fields that aren't visually present.
- Do NOT guess profileField when unsure — use "other".
- Better to omit a low-confidence field than to mis-locate one.

PROFILE INFO:
- ${profileCounts.workExperience} work experiences available to fill
- ${profileCounts.education} education entries available to fill`;

  // Build user content: textual page metadata + image of each page
  const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
    {
      type: 'text',
      text: `Analyze this ${pages.length}-page CV template and return the full blueprint. Page dimensions (PDF points):\n` +
        pages.map(p => `  Page ${p.page}: ${Math.round(p.pdfWidth)} × ${Math.round(p.pdfHeight)} pts`).join('\n'),
    },
  ];

  for (const p of pages) {
    userContent.push({ type: 'text', text: `--- Page ${p.page} (${Math.round(p.pdfWidth)} × ${Math.round(p.pdfHeight)} pts) ---` });
    userContent.push({ type: 'image', image: p.dataUrl });
  }

  userContent.push({
    type: 'text',
    text: 'Return the blueprint now. Remember: top-left origin, PDF points, box = writable area.',
  });

  const result = await withRetry(() =>
    generateObject({
      model: aiProvider(model),
      schema: pdfBlueprintSchema,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      temperature: resolveTemperature(provider, model, 0.1),
    })
  );

  return {
    blueprint: result.object,
    usage: {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
    },
  };
}
