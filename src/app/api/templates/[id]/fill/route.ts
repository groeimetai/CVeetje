import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { fillPDFTemplateAuto, fillPDFTemplate, hasFormFields } from '@/lib/pdf/template-filler';
import { smartFillPDF, type FillMethod as PDFFillMethod } from '@/lib/pdf/smart-pdf-filler';
import { fillSmartTemplate } from '@/lib/docx/smart-template-filler';
import { convertDocxToPdf } from '@/lib/docx/docx-to-pdf';
import { addWatermarkToPdf } from '@/lib/pdf/add-watermark';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import { recordOperationUsage } from '@/lib/ai/usage-tracker';
import type { PDFTemplate, ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';

// POST - Fill a template with profile data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = getAdminDb();

    // Get the template - try personal first, then global
    let templateDoc = await db
      .collection('users')
      .doc(userId)
      .collection('templates')
      .doc(id)
      .get();

    let isGlobalTemplate = false;

    if (!templateDoc.exists) {
      // Check if this is an assigned global template
      const userDoc2 = await db.collection('users').doc(userId).get();
      const assignedTemplates: string[] = userDoc2.data()?.assignedTemplates || [];

      if (assignedTemplates.includes(id)) {
        templateDoc = await db.collection('globalTemplates').doc(id).get();
        isGlobalTemplate = true;
      }

      if (!templateDoc.exists) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    }

    const templateData = templateDoc.data();

    let template: PDFTemplate;
    if (isGlobalTemplate) {
      const fileName = templateData?.fileName || '';
      const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'docx' as const;
      template = {
        id: templateDoc.id,
        name: templateData?.name,
        fileName,
        fileType,
        storageUrl: templateData?.storageUrl,
        pageCount: 1,
        fields: [],
        placeholders: [],
        autoAnalyzed: true,
        createdAt: templateData?.uploadedAt,
        updatedAt: templateData?.uploadedAt,
        userId: templateData?.uploadedBy,
      };
    } else {
      template = {
        id: templateDoc.id,
        name: templateData?.name,
        fileName: templateData?.fileName,
        fileType: templateData?.fileType || 'pdf',
        storageUrl: templateData?.storageUrl,
        pageCount: templateData?.pageCount,
        fields: templateData?.fields || [],
        placeholders: templateData?.placeholders || [],
        autoAnalyzed: templateData?.autoAnalyzed || false,
        createdAt: templateData?.createdAt,
        updatedAt: templateData?.updatedAt,
        userId: templateData?.userId,
      };
    }

    // Parse query parameters
    const url = new URL(request.url);
    const outputFormat = url.searchParams.get('format'); // 'pdf' | 'docx' | null
    const skipCredit = url.searchParams.get('skipCredit') === 'true';
    const isPreview = url.searchParams.get('preview') === 'true'; // Add watermark for preview

    // Parse request body
    const body = await request.json();
    const { profileData, customValues, useAI, jobVacancy, language, fitAnalysis, customInstructions, avatarUrl } = body as {
      profileData: ParsedLinkedIn;
      customValues?: Record<string, string>;
      useAI?: boolean;
      jobVacancy?: JobVacancy;
      language?: OutputLanguage;
      fitAnalysis?: FitAnalysis;
      customInstructions?: string;
      avatarUrl?: string | null;
    };

    if (!profileData) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    // Download the template PDF
    const templateResponse = await fetch(template.storageUrl);
    if (!templateResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch template file' },
        { status: 500 }
      );
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    const templateBytes = new Uint8Array(templateBuffer);

    let filledBytes: Uint8Array;
    let fillMethod: 'form' | 'coordinates' | 'docx-ai' | 'none' | PDFFillMethod = 'none';
    let filledFields: string[] = [];
    let filledCount = 0;
    let outputContentType = 'application/pdf';
    let outputFileName = `filled-${template.fileName}`;
    let aiFillUsage: { inputTokens: number; outputTokens: number } | null = null;
    let aiModelId: string | null = null;
    let pdfFillWarnings: string[] = [];

    if (template.fileType === 'docx') {
      // DOCX template flow - AI fills everything
      // Returns DOCX directly to preserve all styling
      const docxBuffer = templateBuffer;

      // Resolve AI provider — deducts template-fill credits unless skipCredit query param is set
      let docxResolved;
      try {
        docxResolved = await resolveProvider({
          userId,
          operation: 'template-fill',
          skipCreditDeduction: skipCredit,
        });
      } catch (err) {
        if (err instanceof ProviderError) {
          return NextResponse.json({ error: err.message }, { status: err.statusCode });
        }
        throw err;
      }

      const aiOptions = {
        aiProvider: docxResolved.providerName,
        aiApiKey: docxResolved.apiKey,
        aiModel: docxResolved.model,
        jobVacancy,
        language: language || 'nl',
        fitAnalysis,
        customInstructions,
        templateName: template.name,
        avatarUrl,
      };

      // Fill the DOCX template using AI
      const fillResult = await fillSmartTemplate(
        docxBuffer,
        profileData,
        customValues,
        aiOptions
      );

      // Log any warnings
      if (fillResult.warnings.length > 0) {
        console.warn('Template fill warnings:', fillResult.warnings);
      }

      // Return DOCX directly (preserves all styling)
      filledBytes = new Uint8Array(fillResult.filledBuffer);
      outputContentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      outputFileName = `filled-${template.fileName}`;
      fillMethod = 'docx-ai';
      filledCount = fillResult.filledFields.length;
      filledFields = fillResult.filledFields;
      aiFillUsage = fillResult.usage;
      aiModelId = docxResolved.model;
    } else {
      // PDF template flow:
      //  1. If the PDF has interactive AcroForm fields → free, deterministic fill via field names.
      //  2. If the template has pre-configured coordinate fields → free coordinate fill (legacy).
      //  3. Otherwise → AI-vision flow (smartFillPDF): renders pages, detects boxes, fills, overlays
      //     (or falls back to HTML reconstruction when content does not fit).
      const hasFields = await hasFormFields(templateBytes);

      if (hasFields) {
        const autoResult = await fillPDFTemplateAuto(
          templateBytes,
          profileData,
          customValues
        );
        filledBytes = autoResult.pdfBytes;
        fillMethod = autoResult.method === 'form' ? 'pdf-acroform' : autoResult.method;
        filledFields = autoResult.filledFields || [];
        filledCount = filledFields.length;

        // If AcroForm matched zero fields, fall through to AI flow rather than returning a useless PDF.
        if (filledCount === 0) {
          const aiResult = await runSmartFillPDF({
            userId,
            skipCredit,
            templateBytes,
            profileData,
            customValues,
            jobVacancy,
            language,
            fitAnalysis,
            customInstructions,
            avatarUrl,
          });
          filledBytes = aiResult.pdfBytes;
          fillMethod = aiResult.method;
          filledCount = aiResult.filledCount;
          filledFields = []; // AI flow doesn't track field names
          aiFillUsage = aiResult.usage;
          aiModelId = aiResult.modelId;
          pdfFillWarnings = aiResult.warnings;
        }
      } else if (template.fields && template.fields.length > 0) {
        // Pre-configured coordinate fields — free path, useful for admin-tuned templates.
        filledBytes = await fillPDFTemplate(
          templateBytes,
          template,
          profileData,
          customValues
        );
        fillMethod = 'coordinates';
      } else {
        // Flat PDF, no AcroForm, no pre-configured coords → AI-vision flow.
        const aiResult = await runSmartFillPDF({
          userId,
          skipCredit,
          templateBytes,
          profileData,
          customValues,
          jobVacancy,
          language,
          fitAnalysis,
          customInstructions,
          avatarUrl,
        });
        filledBytes = aiResult.pdfBytes;
        fillMethod = aiResult.method;
        filledCount = aiResult.filledCount;
        filledFields = [];
        aiFillUsage = aiResult.usage;
        aiModelId = aiResult.modelId;
        pdfFillWarnings = aiResult.warnings;
      }
    }

    // Save CV record (only on initial fill, not on PDF re-conversion).
    // Credit handling:
    //  - DOCX + PDF AI flows: credits already deducted by resolveProvider({operation: 'template-fill'})
    //    inside the respective fill branches.
    //  - PDF AcroForm / coordinate flow: no AI calls, so charge a flat template-fill credit-cost here.
    const pdfWentThroughAi = template.fileType !== 'docx' && (fillMethod === 'pdf-overlay' || fillMethod === 'pdf-html-reconstruct');

    if (!skipCredit) {
      const cvRef = await db.collection('users').doc(userId).collection('cvs').add({
        linkedInData: profileData,
        jobVacancy: jobVacancy || null,
        template: template.name,
        templateId: template.id,
        templateFileType: template.fileType,
        fillMethod,
        filledCount,
        customValues: customValues || null,
        avatarUrl: avatarUrl || null,
        generatedContent: null,
        pdfUrl: null,
        status: 'generated',
        llmProvider: null,
        llmModel: null,
        language: language || 'nl',
        aiUsage: [],
        aiUsageTotals: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // PDF AcroForm / coordinate flow skipped the AI path → charge the flat template-fill cost.
      // DOCX + PDF AI flows already paid via resolveProvider in their respective branches.
      if (template.fileType !== 'docx' && !pdfWentThroughAi) {
        const { chargePlatformCredits } = await import('@/lib/ai/platform-provider');
        const userDocCheck = await db.collection('users').doc(userId).get();
        const isPlatformMode = (userDocCheck.data()?.llmMode || 'own-key') === 'platform';
        if (isPlatformMode) {
          const { PLATFORM_CREDIT_COSTS } = await import('@/lib/ai/platform-config');
          try {
            await chargePlatformCredits(
              userId,
              PLATFORM_CREDIT_COSTS['template-fill'],
              'template-fill',
            );
          } catch (err) {
            if (err instanceof ProviderError) {
              return NextResponse.json({ error: err.message }, { status: err.statusCode });
            }
            throw err;
          }
        }
      }

      let methodDescription: string;
      switch (fillMethod) {
        case 'pdf-acroform':
          methodDescription = `(auto-filled ${filledFields.length} form fields)`;
          break;
        case 'docx-ai':
          methodDescription = `(DOCX + AI, ${filledCount} replacements)`;
          break;
        case 'coordinates':
          methodDescription = '(coordinate-based)';
          break;
        case 'pdf-overlay':
          methodDescription = `(PDF + AI overlay, ${filledCount} fields)`;
          break;
        case 'pdf-html-reconstruct':
          methodDescription = `(PDF + AI HTML reconstruction, ${filledCount} fields)`;
          break;
        default:
          methodDescription = '';
      }
      if (pdfFillWarnings.length > 0) {
        console.warn('[template-fill] PDF warnings:', pdfFillWarnings);
      }
      // Log the CV creation alongside the AI deduction transaction (already logged by resolveProvider).
      await db.collection('users').doc(userId).collection('transactions').add({
        amount: 0,
        type: 'cv_generation',
        description: `Template filled: ${template.name} ${methodDescription}`,
        molliePaymentId: null,
        cvId: cvRef.id,
        createdAt: new Date(),
      });

      // Record per-CV AI usage for any AI-driven fill (DOCX or PDF AI flow).
      if (aiFillUsage && aiModelId) {
        void recordOperationUsage({
          userId,
          cvId: cvRef.id,
          operation: 'template-fill',
          usage: aiFillUsage,
          modelId: aiModelId,
        });
      }
    }

    // Handle PDF conversion for DOCX templates if requested
    if (template.fileType === 'docx' && outputFormat === 'pdf') {
      // Convert Uint8Array to ArrayBuffer for the PDF conversion
      const arrayBuffer = new ArrayBuffer(filledBytes.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(filledBytes);
      let pdfBuffer = await convertDocxToPdf(arrayBuffer);

      // Add watermark for preview mode
      if (isPreview) {
        const watermarkedPdf = await addWatermarkToPdf(pdfBuffer, 'CVeetje PREVIEW');
        pdfBuffer = Buffer.from(watermarkedPdf);
      }

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${template.name}.pdf"`,
        },
      });
    }

    // Return the filled file
    // DOCX templates return DOCX by default (preserves styling), PDF templates return PDF
    return new NextResponse(Buffer.from(filledBytes), {
      status: 200,
      headers: {
        'Content-Type': outputContentType,
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error filling template:', error);
    return NextResponse.json(
      { error: 'Failed to fill template' },
      { status: 500 }
    );
  }
}

// ==================== Helpers ====================

interface RunSmartFillPDFArgs {
  userId: string;
  skipCredit: boolean;
  templateBytes: Uint8Array;
  profileData: ParsedLinkedIn;
  customValues?: Record<string, string>;
  jobVacancy?: JobVacancy;
  language?: OutputLanguage;
  fitAnalysis?: FitAnalysis;
  customInstructions?: string;
  avatarUrl?: string | null;
}

interface RunSmartFillPDFResult {
  pdfBytes: Uint8Array;
  method: PDFFillMethod;
  filledCount: number;
  warnings: string[];
  usage: { inputTokens: number; outputTokens: number };
  modelId: string;
}

/**
 * Resolve provider (deducts template-fill credits unless skipCredit), then run smartFillPDF.
 * Throws ProviderError (caught upstream) on credit / config issues.
 */
async function runSmartFillPDF(args: RunSmartFillPDFArgs): Promise<RunSmartFillPDFResult> {
  const resolved = await resolveProvider({
    userId: args.userId,
    operation: 'template-fill',
    skipCreditDeduction: args.skipCredit,
  });

  const result = await smartFillPDF({
    templateBytes: args.templateBytes,
    profileData: args.profileData,
    customValues: args.customValues,
    jobVacancy: args.jobVacancy,
    language: args.language ?? 'nl',
    fitAnalysis: args.fitAnalysis,
    customInstructions: args.customInstructions,
    avatarUrl: args.avatarUrl,
    provider: resolved.providerName,
    apiKey: resolved.apiKey,
    model: resolved.model,
  });

  return {
    pdfBytes: result.pdfBytes,
    method: result.method,
    filledCount: result.filledCount,
    warnings: result.warnings,
    usage: result.usage,
    modelId: resolved.model,
  };
}
