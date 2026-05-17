/**
 * Hybrid PDF template filler.
 *
 * 1. Render the PDF to images
 * 2. AI vision → blueprint (sections, boxes, font hints, repeating blocks)
 * 3. AI fill → values per fieldId (with job-language translation)
 * 4. Measure fit. If ≥75% of fields fit (with shrink-to-fit) → overlay path.
 *    Otherwise → HTML reconstruction fallback.
 * 5. Optional avatar replacement on the photo slot.
 *
 * Orchestrator only — heavy lifting lives in pdf-to-image, pdf-template-analyzer,
 * pdf-content-replacer, pdf-html-reconstructor.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { renderPdfToImages } from './pdf-to-image';
import { analyzePDFTemplate, type PDFBlueprint, type PDFField } from '@/lib/ai/pdf-template-analyzer';
import { fillPDFFields } from '@/lib/ai/pdf-content-replacer';
import { reconstructPDFFromBlueprint } from '@/lib/ai/pdf-html-reconstructor';
import type { LLMProvider } from '@/lib/ai/providers';
import type { ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';
import { validateAvatarURL } from '@/lib/security/url-validator';

const MIN_FONT_SIZE = 7;
const OVERLAY_FIT_THRESHOLD = 0.75; // ≥75% fields must fit (after shrink) to use overlay path

export type FillMethod = 'pdf-overlay' | 'pdf-html-reconstruct' | 'pdf-acroform';

export interface SmartFillPDFOptions {
  templateBytes: Uint8Array;
  profileData: ParsedLinkedIn;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  jobVacancy?: JobVacancy;
  language?: OutputLanguage;
  fitAnalysis?: FitAnalysis;
  customInstructions?: string;
  customValues?: Record<string, string>;
  avatarUrl?: string | null;
  /** Render scale (default 2.0 ≈ 144 DPI). Lower = faster + cheaper vision call. */
  renderScale?: number;
}

export interface SmartFillPDFResult {
  pdfBytes: Uint8Array;
  method: FillMethod;
  filledCount: number;
  totalFieldCount: number;
  overflowCount: number;
  warnings: string[];
  blueprint: PDFBlueprint;
  usage: { inputTokens: number; outputTokens: number };
}

export async function smartFillPDF(opts: SmartFillPDFOptions): Promise<SmartFillPDFResult> {
  const {
    templateBytes,
    profileData,
    provider,
    apiKey,
    model,
    jobVacancy,
    language = 'nl',
    fitAnalysis,
    customInstructions,
    customValues,
    avatarUrl,
    renderScale = 2.0,
  } = opts;

  const warnings: string[] = [];

  // 1. Render pages
  const pages = await renderPdfToImages(templateBytes, { scale: renderScale });

  // 2. Blueprint
  const { blueprint, usage: analyzeUsage } = await analyzePDFTemplate({
    pages,
    profileCounts: {
      workExperience: profileData.experience?.length ?? 0,
      education: profileData.education?.length ?? 0,
    },
    provider,
    apiKey,
    model,
  });

  if (blueprint.fields.length === 0) {
    throw new Error('No fillable fields detected in template.');
  }

  // 3. Fill values
  const { values, warnings: fillWarnings, usage: fillUsage } = await fillPDFFields({
    blueprint,
    profileData,
    provider,
    apiKey,
    model,
    jobVacancy,
    language,
    fitAnalysis,
    customInstructions,
    customValues,
  });
  warnings.push(...fillWarnings);

  // 4. Fit measurement
  const { fits, overflows } = await measureFit(blueprint, values);
  const filledNonEmpty = [...values.values()].filter(v => v.trim().length > 0).length;
  const overlayRatio = filledNonEmpty > 0 ? fits.size / filledNonEmpty : 1;

  // 5. Path decision
  const useHtmlFallback = overlayRatio < OVERLAY_FIT_THRESHOLD;

  let pdfBytes: Uint8Array;
  let method: FillMethod;

  if (useHtmlFallback) {
    const reconstructed = await reconstructPDFFromBlueprint({
      pages,
      blueprint,
      values,
      profileData,
      provider,
      apiKey,
      model,
      jobVacancy,
      language,
      avatarUrl: avatarUrl ?? null,
    });
    pdfBytes = reconstructed.pdfBytes;
    method = 'pdf-html-reconstruct';
    warnings.push(`Used HTML reconstruction: only ${Math.round(overlayRatio * 100)}% of fields fit the original boxes.`);
    if (reconstructed.warnings) warnings.push(...reconstructed.warnings);
  } else {
    pdfBytes = await drawOverlay(templateBytes, blueprint, values, fits, avatarUrl ?? null, warnings);
    method = 'pdf-overlay';
    if (overflows.size > 0) {
      warnings.push(`${overflows.size} field(s) overflowed and were shrunk or clipped.`);
    }
  }

  return {
    pdfBytes,
    method,
    filledCount: filledNonEmpty,
    totalFieldCount: blueprint.fields.length,
    overflowCount: overflows.size,
    warnings,
    blueprint,
    usage: {
      inputTokens: analyzeUsage.inputTokens + fillUsage.inputTokens,
      outputTokens: analyzeUsage.outputTokens + fillUsage.outputTokens,
    },
  };
}

// ==================== Fit measurement ====================

interface FitDecision {
  fontSize: number; // possibly shrunken
  lines: string[]; // pre-wrapped if multiLine
}

/**
 * Measure each filled field against its box.
 * Returns the set that fit (with shrink-to-fit applied) plus the set that overflowed.
 */
async function measureFit(
  blueprint: PDFBlueprint,
  values: Map<string, string>,
): Promise<{ fits: Map<string, FitDecision>; overflows: Set<string> }> {
  // We don't have the embedded fonts yet at this point — use a transient PDFDocument
  // just to embed Helvetica and measure widths. Cheap.
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const fits = new Map<string, FitDecision>();
  const overflows = new Set<string>();

  for (const field of blueprint.fields) {
    const value = values.get(field.id) ?? '';
    if (!value.trim()) continue;

    const font = pickFont(field, { fontRegular, fontBold, fontOblique, fontBoldOblique });

    let fontSize = field.fontSizeHint || 11;
    let decision: FitDecision | null = null;

    while (fontSize >= MIN_FONT_SIZE) {
      const lineHeight = fontSize * 1.2;
      const lines = field.multiLine
        ? wrapText(value, font, fontSize, field.width)
        : [value];
      const fitsWidth = lines.every(l => font.widthOfTextAtSize(l, fontSize) <= field.width);
      const fitsHeight = lines.length * lineHeight <= field.height;
      if (fitsWidth && fitsHeight) {
        decision = { fontSize, lines };
        break;
      }
      fontSize -= 1;
    }

    if (decision) {
      fits.set(field.id, decision);
    } else {
      overflows.add(field.id);
      // Best-effort overlay anyway with smallest font + truncated wrap, used only if we still pick overlay path.
      const lines = field.multiLine
        ? wrapText(value, font, MIN_FONT_SIZE, field.width)
        : [value];
      fits.set(field.id, { fontSize: MIN_FONT_SIZE, lines });
    }
  }

  return { fits, overflows };
}

function pickFont(
  field: PDFField,
  fonts: { fontRegular: PDFFont; fontBold: PDFFont; fontOblique: PDFFont; fontBoldOblique: PDFFont },
): PDFFont {
  const bold = field.fontWeight === 'bold';
  const italic = field.fontStyle === 'italic';
  if (bold && italic) return fonts.fontBoldOblique;
  if (bold) return fonts.fontBold;
  if (italic) return fonts.fontOblique;
  return fonts.fontRegular;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) out.push(current);
    if (raw === '') out.push('');
  }
  return out;
}

// ==================== Overlay drawing ====================

async function drawOverlay(
  templateBytes: Uint8Array,
  blueprint: PDFBlueprint,
  values: Map<string, string>,
  fits: Map<string, FitDecision>,
  avatarUrl: string | null,
  warnings: string[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const pages = pdfDoc.getPages();

  for (const field of blueprint.fields) {
    const value = values.get(field.id) ?? '';
    if (!value.trim()) continue;
    if (field.page < 1 || field.page > pages.length) continue;

    const decision = fits.get(field.id);
    if (!decision) continue;

    const page = pages[field.page - 1];
    const font = pickFont(field, { fontRegular, fontBold, fontOblique, fontBoldOblique });
    drawFieldOverlay(page, field, decision, font);
  }

  // Photo placement
  if (avatarUrl && blueprint.photoSlot) {
    try {
      const result = validateAvatarURL(avatarUrl);
      if (result.valid && result.sanitizedUrl) {
        const photoBytes = await fetchAvatar(result.sanitizedUrl);
        if (photoBytes) {
          const image = await embedAvatar(pdfDoc, photoBytes);
          if (image) {
            const slot = blueprint.photoSlot;
            const page = pages[slot.page - 1];
            const pageHeight = page.getHeight();
            const x = slot.x;
            const y = pageHeight - slot.y - slot.height;
            page.drawImage(image, { x, y, width: slot.width, height: slot.height });
          }
        }
      }
    } catch (err) {
      warnings.push(`Photo replacement failed: ${(err as Error).message}`);
    }
  }

  return pdfDoc.save();
}

function drawFieldOverlay(
  page: PDFPage,
  field: PDFField,
  decision: FitDecision,
  font: PDFFont,
): void {
  const pageHeight = page.getHeight();
  const color = hexToRgb(field.fontColor);
  const lineHeight = decision.fontSize * 1.2;

  decision.lines.forEach((line, i) => {
    if (!line) return;
    const textWidth = font.widthOfTextAtSize(line, decision.fontSize);
    let xDraw = field.x;
    if (field.align === 'center') xDraw = field.x + (field.width - textWidth) / 2;
    else if (field.align === 'right') xDraw = field.x + (field.width - textWidth);

    // pdf-lib origin is bottom-left, blueprint is top-left
    const yTop = field.y + i * lineHeight + decision.fontSize;
    const yPdf = pageHeight - yTop;

    page.drawText(line, {
      x: xDraw,
      y: yPdf,
      size: decision.fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex ?? '');
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  };
}

async function fetchAvatar(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function embedAvatar(pdfDoc: PDFDocument, bytes: Uint8Array) {
  // Sniff PNG vs JPG via magic bytes
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isPng) return pdfDoc.embedPng(bytes);
  if (isJpg) return pdfDoc.embedJpg(bytes);
  return null;
}
