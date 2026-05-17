'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ProfileInput } from './profile-input';
import { JobInput } from './job-input';
import { FitAnalysisCard } from './fit-analysis-card';
import { DynamicStylePicker } from './dynamic-style-picker';
import { TemplateStylePicker } from './template-style-picker';
import { CVPreview, type PDFPageMode } from './cv-preview';
import { TemplatePreview } from './template-preview';
import { LanguageSelector } from './wizard/language-selector';
import { ResumeDraftDialog } from './wizard/resume-draft-dialog';
import { NoApiKeyAlert } from './wizard/no-api-key-alert';
import { WizardProgress } from './wizard/wizard-progress';
import { StyleOrTemplateChoice, TemplateSelector } from '@/components/templates';
import { useAuth } from '@/components/auth/auth-context';
import { getCV } from '@/lib/firebase/firestore';
import { useWizardPersistence, type WizardStep } from '@/hooks/use-wizard-persistence';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  TokenUsage,
  StepTokenUsage,
  CVContactInfo,
  OutputLanguage,
  FitAnalysis,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { ApplyQuestion } from '@/lib/jobs/providers/types';
import { ApplyForm } from '@/components/jobs/apply-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ModelInfo, ProviderInfo } from '@/lib/ai/models-registry';
import { findModelInProviders } from '@/lib/ai/models-registry';
import { PLATFORM_MODEL } from '@/lib/ai/platform-config';

const PLATFORM_MODEL_INFO: ModelInfo = {
  id: PLATFORM_MODEL.modelId,
  name: PLATFORM_MODEL.displayName,
  family: 'claude',
  provider: 'Anthropic',
  providerId: PLATFORM_MODEL.provider,
  capabilities: { toolCall: true, reasoning: true, structuredOutput: true },
  pricing: { input: 15, output: 75 },
  limits: { context: 200000, output: 32000 },
  modalities: { input: ['text', 'image', 'pdf'], output: ['text'] },
};

export function CVWizard() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams?.get('jobId') ?? null;
  const t = useTranslations('cvWizard');
  const { userData, credits, refreshCredits, hasAIAccess, llmMode, effectiveUserId } = useAuth();

  // Draft persistence
  const { hasDraft, draft, saveDraft, clearDraft, isLoading: isDraftLoading } = useWizardPersistence();
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('linkedin');
  const [linkedInData, setLinkedInData] = useState<ParsedLinkedIn | null>(null);
  const [jobVacancy, setJobVacancy] = useState<JobVacancy | null>(null);
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [designTokens, setDesignTokens] = useState<CVDesignTokens | null>(null);
  // Tracked so the dispute dialog knows what "current" level to exclude
  // from the user's alternatives. Updated when the style is (re)generated
  // and kept in sync via the creativityLevel field stored on the CV doc.
  const [selectedCreativityLevel, setSelectedCreativityLevel] = useState<StyleCreativityLevel>('balanced');
  const [disputeCount, setDisputeCount] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedCVContent | null>(null);
  const [editedContent, setEditedContent] = useState<GeneratedCVContent | null>(null);
  const [editedHeader, setEditedHeader] = useState<{
    fullName: string;
    headline?: string | null;
    contactInfo?: CVContactInfo | null;
  } | null>(null);
  const [editedColors, setEditedColors] = useState<CVDesignTokens['colors'] | null>(null);
  const [elementColors, setElementColors] = useState<Record<string, string | undefined>>({});
  const [cvId, setCvId] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('nl');
  // True zodra de gebruiker de taal expliciet heeft gekozen of een draft heeft
  // teruggehaald. Auto-detect uit jobVacancy overschrijft alleen vóór die wijziging.
  const languageWasUserSetRef = useRef<boolean>(false);
  const handleSetOutputLanguage = useCallback((lang: OutputLanguage) => {
    languageWasUserSetRef.current = true;
    setOutputLanguage(lang);
  }, []);
  // CV options — pre-generate preferences. Default ON if the profile actually
  // has interests; otherwise OFF (no point asking the AI to render nothing).
  const [showInterestsOnCV, setShowInterestsOnCV] = useState<boolean>(false);

  // Model info for file upload support
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Loading/error state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [coverLetterBlob, setCoverLetterBlob] = useState<Blob | null>(null);
  const [isLoadingCoverLetter, setIsLoadingCoverLetter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jobs-board deeplink metadata (fetched once if ?jobId= present)
  const [jobSourceMeta, setJobSourceMeta] = useState<{
    slug: string;
    supportsInAppApply: boolean;
    applyQuestions: ApplyQuestion[];
    sourceProvider: 'adzuna' | 'greenhouse' | 'lever' | 'recruitee';
    externalUrl: string;
  } | null>(null);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  // Token usage tracking
  const [tokenHistory, setTokenHistory] = useState<StepTokenUsage[]>([]);

  // Check for draft on mount
  useEffect(() => {
    if (!isDraftLoading && !draftChecked) {
      if (hasDraft) {
        setShowResumeDialog(true);
      }
      setDraftChecked(true);
    }
  }, [isDraftLoading, hasDraft, draftChecked]);

  // Auto-detect output language from the job vacancy.
  // Runs only if the user hasn't already set a language preference (via selector
  // click or a restored draft). Pure heuristic — no AI call, no network.
  useEffect(() => {
    if (languageWasUserSetRef.current) return;
    if (!jobVacancy?.description) return;
    void (async () => {
      const { detectLanguageFromText } = await import('@/lib/ai/language-detect');
      const detected = detectLanguageFromText(jobVacancy.description);
      if (detected.confidence !== 'low' && detected.language !== outputLanguage) {
        setOutputLanguage(detected.language);
      }
    })();
  }, [jobVacancy?.description, outputLanguage]);

  // Prefill jobVacancy from ?jobId= deeplink (from the public /jobs board)
  const [deeplinkAttempted, setDeeplinkAttempted] = useState(false);
  useEffect(() => {
    if (!draftChecked || deeplinkAttempted) return;
    if (!jobIdParam) {
      setDeeplinkAttempted(true);
      return;
    }
    if (showResumeDialog) return;
    if (jobVacancy) {
      setDeeplinkAttempted(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobIdParam)}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const cached = await res.json();
        if (cancelled) return;

        const vacancy: JobVacancy = {
          title: cached.title,
          company: cached.company ?? null,
          description: cached.description ?? '',
          requirements: [],
          keywords: [],
          industry: cached.industry ?? undefined,
          location: cached.location ?? undefined,
          employmentType: cached.employmentType ?? undefined,
          rawText: cached.description ?? '',
          sourceUrl: typeof cached.url === 'string' && cached.url.length > 0 ? cached.url : null,
          compensation:
            cached.salaryMin || cached.salaryMax
              ? {
                  salaryMin: cached.salaryMin ?? undefined,
                  salaryMax: cached.salaryMax ?? undefined,
                  salaryCurrency: cached.salaryCurrency ?? 'EUR',
                  salaryPeriod: 'yearly',
                }
              : undefined,
        };
        setJobVacancy(vacancy);
        setJobSourceMeta({
          slug: jobIdParam,
          supportsInAppApply: Boolean(cached.supportsInAppApply),
          applyQuestions: Array.isArray(cached.applyQuestions)
            ? (cached.applyQuestions as ApplyQuestion[])
            : [],
          sourceProvider: (cached.sourceProvider ?? 'adzuna') as
            | 'adzuna'
            | 'greenhouse'
            | 'lever'
            | 'recruitee',
          externalUrl: typeof cached.url === 'string' ? cached.url : '',
        });
      } catch (err) {
        console.warn('[wizard] failed to prefill from ?jobId=', err);
      } finally {
        if (!cancelled) setDeeplinkAttempted(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftChecked, deeplinkAttempted, jobIdParam, showResumeDialog, jobVacancy]);

  // Save draft when relevant state changes
  const saveCurrentDraft = useCallback(() => {
    if (linkedInData) {
      saveDraft({
        currentStep,
        linkedInData,
        jobVacancy,
        fitAnalysis,
        designTokens,
        avatarUrl,
        outputLanguage,
        showInterestsOnCV,
      });
    }
  }, [currentStep, linkedInData, jobVacancy, fitAnalysis, designTokens, avatarUrl, outputLanguage, showInterestsOnCV, saveDraft]);

  // Auto-save draft on state changes (debounced by the effect dependencies)
  useEffect(() => {
    if (draftChecked && !showResumeDialog && currentStep !== 'generating' && currentStep !== 'preview') {
      saveCurrentDraft();
    }
  }, [currentStep, linkedInData, jobVacancy, fitAnalysis, designTokens, avatarUrl, outputLanguage, showInterestsOnCV, draftChecked, showResumeDialog, saveCurrentDraft]);

  // Resume from draft
  const handleResumeDraft = () => {
    if (draft) {
      setCurrentStep(draft.currentStep);
      setLinkedInData(draft.linkedInData);
      setJobVacancy(draft.jobVacancy);
      setFitAnalysis(draft.fitAnalysis);
      setDesignTokens(draft.designTokens);
      setAvatarUrl(draft.avatarUrl);
      setOutputLanguage(draft.outputLanguage);
      // Een teruggehaalde draft = de gebruiker had hiermee al gekozen.
      languageWasUserSetRef.current = true;
      setShowInterestsOnCV(
        draft.showInterestsOnCV ?? !!(draft.linkedInData?.interests && draft.linkedInData.interests.length > 0)
      );
    }
    setShowResumeDialog(false);
  };

  // Start fresh (discard draft)
  const handleDiscardDraft = () => {
    clearDraft();
    setShowResumeDialog(false);
  };

  // Helper to add token usage to history
  const addTokenUsage = (step: StepTokenUsage['step'], usage: TokenUsage) => {
    if (!modelInfo?.pricing) return;

    const cost = {
      input: (usage.promptTokens / 1_000_000) * modelInfo.pricing.input,
      output: (usage.completionTokens / 1_000_000) * modelInfo.pricing.output,
      total: 0,
    };
    cost.total = cost.input + cost.output;

    setTokenHistory(prev => [...prev, {
      step,
      usage,
      cost,
      modelId: modelInfo.id,
      timestamp: new Date(),
    }]);
  };

  // Fetch providers to get model capabilities
  useEffect(() => {
    // Platform AI users get a known model info directly
    if (llmMode === 'platform') {
      setModelInfo(PLATFORM_MODEL_INFO);
      return;
    }

    async function fetchProviders() {
      try {
        const response = await fetch('/api/models');
        const data = await response.json();

        if (data.success && data.providers) {
          setProviders(data.providers);

          // Find the user's selected model
          if (userData?.apiKey) {
            const model = findModelInProviders(
              data.providers,
              userData.apiKey.provider,
              userData.apiKey.model
            );
            setModelInfo(model);
          }
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    }

    fetchProviders();
  }, [userData?.apiKey, llmMode]);

  // Update model info when user data changes
  useEffect(() => {
    if (llmMode === 'platform') {
      setModelInfo(PLATFORM_MODEL_INFO);
      return;
    }
    if (providers.length > 0 && userData?.apiKey) {
      const model = findModelInProviders(
        providers,
        userData.apiKey.provider,
        userData.apiKey.model
      );
      setModelInfo(model);
    }
  }, [providers, userData?.apiKey, llmMode]);

  // Track whether user chose template-style mode (upload own design)
  const [useTemplateStyleMode, setUseTemplateStyleMode] = useState(false);
  // Track whether user chose template fill mode (use existing template)
  const [useTemplateMode, setUseTemplateMode] = useState(false);

  // Template preview state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templatePdfBlob, setTemplatePdfBlob] = useState<Blob | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string>('');

  // Determine which step to show in progress bar
  const getStyleStepConfig = (): { id: WizardStep; label: string } => {
    if (useTemplateMode) {
      return { id: 'template' as WizardStep, label: t('steps.template') };
    }
    if (useTemplateStyleMode) {
      return { id: 'template-style' as WizardStep, label: t('steps.templateStyle') };
    }
    return { id: 'style' as WizardStep, label: t('steps.style') };
  };

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'linkedin', label: t('steps.profile') },
    { id: 'job', label: t('steps.job') },
    { id: 'fit-analysis', label: t('steps.fitAnalysis') },
    { id: 'style-choice', label: t('steps.styleChoice') },
    getStyleStepConfig(),
    { id: 'generating', label: t('steps.generating') },
    { id: 'preview', label: t('steps.preview') },
  ];

  // Check if user has AI access (own key or platform mode)
  const hasApiKey = hasAIAccess;

  const handleLinkedInParsed = (data: ParsedLinkedIn) => {
    setLinkedInData(data);
    // Default the CV-options checkbox based on whether the profile has interests.
    setShowInterestsOnCV(!!(data.interests && data.interests.length > 0));
    setCurrentStep('job');
  };

  const handleJobSubmit = (data: JobVacancy | null) => {
    setJobVacancy(data);
    // If there's a job vacancy, go to fit analysis first
    // If skipped (null), go directly to style choice
    if (data) {
      setCurrentStep('fit-analysis');
    } else {
      setCurrentStep('style-choice');
    }
  };

  const handleFitAnalysisContinue = () => {
    setCurrentStep('style-choice');
  };

  // Handle choice between AI style or template-style (own design) or template fill
  const handleChooseStyle = () => {
    setUseTemplateStyleMode(false);
    setUseTemplateMode(false);
    setCurrentStep('style');
  };

  const handleChooseTemplateStyle = () => {
    setUseTemplateStyleMode(true);
    setUseTemplateMode(false);
    setCurrentStep('template-style');
  };

  const handleChooseTemplate = () => {
    setUseTemplateMode(true);
    setUseTemplateStyleMode(false);
    setCurrentStep('template');
  };

  // Handle template fill - go to generating then preview
  const [templateCustomValues, setTemplateCustomValues] = useState<Record<string, string>>({});

  const handleTemplateFill = async (templateId: string, templateName: string, customValues?: Record<string, string>) => {
    setCurrentStep('generating');
    setIsGenerating(true);
    setError(null);
    setSelectedTemplateId(templateId);
    setTemplateFileName(templateName);
    if (customValues) setTemplateCustomValues(customValues);

    try {
      // Fetch DOCX for preview (credits are deducted here)
      // We use DOCX directly for preview as it preserves formatting better
      const response = await fetch(`/api/templates/${templateId}/fill?format=docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileData: linkedInData,
          customValues: customValues || {},
          useAI: true,
          jobVacancy,
          language: outputLanguage,
          fitAnalysis,
          avatarUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate document');
      }

      const docxBlob = await response.blob();
      setTemplatePdfBlob(docxBlob); // Reusing same state, but now it's DOCX
      setCurrentStep('preview');
      refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('template');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle template download (from preview)
  const handleTemplateDownload = async (format: 'pdf' | 'docx') => {
    if (!selectedTemplateId) return;

    // DOCX can be downloaded directly from the blob we already have
    if (format === 'docx' && templatePdfBlob) {
      downloadTemplateBlob(templatePdfBlob, 'docx');
      return;
    }

    // PDF needs to be generated fresh (convert DOCX to PDF on server)
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/templates/${selectedTemplateId}/fill?format=pdf&skipCredit=true`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileData: linkedInData,
            customValues: templateCustomValues,
            useAI: true,
            jobVacancy,
            language: outputLanguage,
            fitAnalysis,
            avatarUrl,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to download PDF');
      }

      const blob = await response.blob();
      downloadTemplateBlob(blob, 'pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to download template blob
  const downloadTemplateBlob = (blob: Blob, extension: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-${linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'template'}-${templateFileName.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handle template fill completion
  const handleFitAnalysisChangeJob = () => {
    // Go back to job input
    setCurrentStep('job');
  };

  const handleStyleGenerated = async (tokens: CVDesignTokens, creativityLevel?: StyleCreativityLevel) => {
    setDesignTokens(tokens);
    if (creativityLevel) {
      setSelectedCreativityLevel(creativityLevel);
    }

    if (!hasApiKey) {
      setError('Please configure your API key in Settings before generating a CV.');
      return;
    }

    // Start content generation
    setCurrentStep('generating');
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/cv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedInData,
          jobVacancy,
          designTokens: tokens,
          avatarUrl,
          language: outputLanguage,
          fitAnalysis,
          creativityLevel: creativityLevel || selectedCreativityLevel,
          includeInterests: showInterestsOnCV,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate CV');
      }

      // Track token usage for CV generation
      if (result.usage) {
        addTokenUsage('generate', result.usage);
      }

      setGeneratedContent(result.content);
      setCvId(result.cvId);
      setCurrentStep('preview');
      // Clear draft since CV was successfully generated
      clearDraft();
      // Refresh credits in case platform AI was used
      if (llmMode === 'platform') refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('style');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!hasApiKey || !linkedInData || !designTokens) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/cv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedInData,
          jobVacancy,
          designTokens,
          avatarUrl,
          language: outputLanguage,
          fitAnalysis,
          includeInterests: showInterestsOnCV,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to regenerate CV');
      }

      // Track token usage for CV regeneration
      if (result.usage) {
        addTokenUsage('regenerate', result.usage);
      }

      setGeneratedContent(result.content);
      setCvId(result.cvId);
      // Refresh credits in case platform AI was used
      if (llmMode === 'platform') refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle content changes from preview editor
  const handleContentChange = (content: GeneratedCVContent) => {
    setEditedContent(content);
  };

  // Handle header changes from preview editor
  const handleHeaderChange = (header: {
    fullName: string;
    headline?: string | null;
    contactInfo?: CVContactInfo | null;
  }) => {
    setEditedHeader(header);
  };

  // Handle colors changes from preview editor
  const handleColorsChange = (colors: CVDesignTokens['colors']) => {
    setEditedColors(colors);
  };

  // Handle element colors changes from preview editor
  const handleElementColorsChange = (newElementColors: Record<string, string | undefined>) => {
    setElementColors(newElementColors);
  };

  // Handle design tokens changes from chat style tools
  const handleTokensChange = useCallback((tokens: CVDesignTokens) => {
    setDesignTokens(tokens);
  }, []);

  // After a dispute is approved the server regenerated content + tokens in
  // Firestore. Pull the fresh CV doc so the preview reflects the new look
  // instead of the stale local state from before the dispute.
  const handleDisputeApproved = useCallback(async () => {
    if (!effectiveUserId || !cvId) return;
    try {
      const fresh = await getCV(effectiveUserId, cvId);
      if (!fresh) return;
      if (fresh.generatedContent) {
        setGeneratedContent(fresh.generatedContent);
        setEditedContent(fresh.generatedContent);
      }
      if (fresh.designTokens) {
        setDesignTokens(fresh.designTokens);
      }
      if (fresh.creativityLevel) {
        setSelectedCreativityLevel(fresh.creativityLevel);
      }
      setDisputeCount(fresh.disputeCount ?? 0);
      setEditedColors(null);
      setElementColors({});
    } catch (err) {
      console.error('[wizard] failed to refresh CV after dispute approve', err);
    }
  }, [effectiveUserId, cvId]);

  const handleDownload = async (pageMode: PDFPageMode = 'multi-page') => {
    if (!cvId || (!pdfDownloaded && credits < 1)) return;

    setIsDownloading(true);
    setError(null);

    try {
      // Send edited content, header, and tokens if user made changes
      // IMPORTANT: Use same logic as preview for all fields:
      // 1. editedHeader values (user edited)
      // 2. generatedContent values (AI generated, for headline)
      // 3. linkedInData values (fallback)
      const effectiveContent = editedContent || generatedContent;
      const headerInfo = {
        fullName: editedHeader?.fullName ?? linkedInData?.fullName ?? '',
        headline: editedHeader?.headline ?? effectiveContent?.headline ?? linkedInData?.headline,
        contactInfo: editedHeader?.contactInfo ?? (linkedInData ? {
          email: linkedInData.email,
          phone: linkedInData.phone,
          location: linkedInData.location || undefined,
          linkedinUrl: linkedInData.linkedinUrl,
          website: linkedInData.website,
          github: linkedInData.github,
          birthDate: linkedInData.birthDate,
        } : undefined),
      };

      // Build effective tokens with edited colors if available
      const effectiveTokens = designTokens && editedColors
        ? { ...designTokens, colors: editedColors }
        : designTokens;

      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent || generatedContent,
          tokens: effectiveTokens,
          header: headerInfo,
          elementColors: Object.keys(elementColors).length > 0 ? elementColors : undefined,
          pageMode,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      setPdfBlob(blob);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv-${linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Mark as downloaded so subsequent downloads are free
      setPdfDownloaded(true);

      // Refresh credits
      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDownloading(false);
    }
  };

  // Fetch motivation letter PDF for current CV (used when opening apply dialog
  // so the generated cover letter is auto-attached). Silently fails if no letter
  // exists or download cannot be produced — user can still apply without one.
  const fetchCoverLetterBlob = useCallback(async () => {
    if (!cvId) return;
    setIsLoadingCoverLetter(true);
    try {
      const letterRes = await fetch(`/api/cv/${cvId}/motivation`);
      if (!letterRes.ok) return;
      const letterData = await letterRes.json().catch(() => null);
      if (!letterData?.letter) return;

      const pdfRes = await fetch(`/api/cv/${cvId}/motivation/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf', letter: letterData.letter }),
      });
      if (!pdfRes.ok) return;
      const blob = await pdfRes.blob();
      setCoverLetterBlob(blob);
    } catch (err) {
      console.warn('[wizard] failed to fetch motivation letter for apply', err);
    } finally {
      setIsLoadingCoverLetter(false);
    }
  }, [cvId]);

  const handleOpenApplyDialog = useCallback(async () => {
    setApplyDialogOpen(true);
    // Fetch motivation letter in parallel with dialog open if not already loaded
    if (!coverLetterBlob && !isLoadingCoverLetter) {
      await fetchCoverLetterBlob();
    }
  }, [coverLetterBlob, isLoadingCoverLetter, fetchCoverLetterBlob]);

  const goBack = () => {
    // Handle template step specially - always go back to style-choice
    if (currentStep === 'template') {
      setCurrentStep('style-choice');
      return;
    }

    // Determine which style step to use
    const styleStep: WizardStep = useTemplateStyleMode ? 'template-style' : 'style';
    const stepOrder: WizardStep[] = ['linkedin', 'job', 'fit-analysis', 'style-choice', styleStep, 'preview'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      // Skip fit-analysis when going back if there's no job vacancy
      if (stepOrder[currentIndex - 1] === 'fit-analysis' && !jobVacancy) {
        setCurrentStep('job');
      } else {
        setCurrentStep(stepOrder[currentIndex - 1]);
      }
    }
  };

  // Start a new CV for a different job vacancy (keeps profile data)
  const handleNewVacancy = () => {
    // Reset job, style, and content - but keep profile data (linkedInData, avatarUrl)
    setJobVacancy(null);
    setFitAnalysis(null);
    setDesignTokens(null);
    setGeneratedContent(null);
    setEditedContent(null);
    setEditedHeader(null);
    setEditedColors(null);
    setElementColors({});
    setCvId(null);
    setError(null);
    // Reset mode flags
    setUseTemplateStyleMode(false);
    setUseTemplateMode(false);
    // Reset template preview state
    setSelectedTemplateId(null);
    setTemplatePdfBlob(null);
    setTemplateFileName('');
    // Reset token history for the new CV - each CV should track its own usage
    setTokenHistory([]);

    // Go to job input step
    setCurrentStep('job');
  };

  // Show AI access warning if not configured
  if (!hasApiKey && currentStep === 'linkedin' && !showResumeDialog) {
    return <NoApiKeyAlert />;
  }

  // Show resume dialog if there's a saved draft
  if (showResumeDialog && draft) {
    return (
      <ResumeDraftDialog
        draft={draft}
        onResume={handleResumeDraft}
        onDiscard={handleDiscardDraft}
      />
    );
  }

  // Loading state while checking for draft
  if (isDraftLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WizardProgress
        steps={steps}
        currentStep={currentStep}
        tokenHistory={tokenHistory}
        modelName={modelInfo?.name}
        llmMode={llmMode}
        credits={credits}
        onBack={goBack}
      />

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      {/* Step content */}
      {currentStep === 'linkedin' && (
        <ProfileInput
          onParsed={handleLinkedInParsed}
          onTokenUsage={(step, usage) => addTokenUsage(step, usage)}
          onCreditsRefresh={refreshCredits}
          initialData={linkedInData}
          initialAvatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
          modelInfo={modelInfo}
          apiKey={userData?.apiKey ? { provider: userData.apiKey.provider, model: userData.apiKey.model } : null}
        />
      )}

      {currentStep === 'job' && (
        <JobInput
          onSubmit={handleJobSubmit}
          onTokenUsage={(usage) => addTokenUsage('job', usage)}
          onCreditsRefresh={refreshCredits}
          initialData={jobVacancy}
          sourceHint={
            jobSourceMeta && jobSourceMeta.sourceProvider === 'adzuna'
              ? {
                  provider: 'adzuna',
                  externalUrl: jobSourceMeta.externalUrl,
                }
              : null
          }
        />
      )}

      {currentStep === 'fit-analysis' && linkedInData && jobVacancy && (
        <FitAnalysisCard
          linkedInData={linkedInData}
          jobVacancy={jobVacancy}
          onContinue={handleFitAnalysisContinue}
          onChangeJob={handleFitAnalysisChangeJob}
          onTokenUsage={(usage) => addTokenUsage('style', usage)}
          onCreditsRefresh={refreshCredits}
          onAnalysisComplete={setFitAnalysis}
          initialAnalysis={fitAnalysis}
        />
      )}

      {currentStep === 'style-choice' && linkedInData && (
        <StyleOrTemplateChoice
          onChooseStyle={handleChooseStyle}
          onChooseTemplateStyle={handleChooseTemplateStyle}
          onChooseTemplate={handleChooseTemplate}
        />
      )}

      {currentStep === 'template-style' && linkedInData && (
        <div className="space-y-6">
          <LanguageSelector value={outputLanguage} onChange={handleSetOutputLanguage} />

          <TemplateStylePicker
            linkedInData={linkedInData}
            jobVacancy={jobVacancy}
            onStyleSelected={handleStyleGenerated}
            onTokenUsage={(usage) => addTokenUsage('style', usage)}
            onCreditsRefresh={refreshCredits}
            onBack={() => setCurrentStep('style-choice')}
          />
        </div>
      )}

      {currentStep === 'style' && linkedInData && (
        <div className="space-y-6">
          <LanguageSelector value={outputLanguage} onChange={handleSetOutputLanguage} />

          {(() => {
            const interestsCount = linkedInData.interests?.length ?? 0;
            const hasInterests = interestsCount > 0;
            return (
              <div className="rounded-lg border bg-card p-4">
                <label className={`flex items-start gap-3 ${hasInterests ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-input"
                    checked={hasInterests && showInterestsOnCV}
                    disabled={!hasInterests}
                    onChange={(e) => setShowInterestsOnCV(e.target.checked)}
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{t('cvOptions.showInterests')}</div>
                    <p className="text-muted-foreground mt-0.5">
                      {hasInterests
                        ? `${interestsCount} ${t('cvOptions.interestsHintCount')}: ${linkedInData.interests!.slice(0, 3).join(', ')}${interestsCount > 3 ? '…' : ''}`
                        : t('cvOptions.noInterestsHint')}
                    </p>
                  </div>
                </label>
              </div>
            );
          })()}

          <DynamicStylePicker
            linkedInData={linkedInData}
            jobVacancy={jobVacancy}
            avatarUrl={avatarUrl}
            onStyleGenerated={handleStyleGenerated}
            onTokenUsage={(usage) => addTokenUsage('style', usage)}
            onCreditsRefresh={refreshCredits}
            initialTokens={designTokens}
          />
        </div>
      )}

      {currentStep === 'template' && linkedInData && (
        <div className="space-y-6">
          <LanguageSelector value={outputLanguage} onChange={handleSetOutputLanguage} />

          <TemplateSelector
            profileData={linkedInData}
            jobVacancy={jobVacancy || undefined}
            fitAnalysis={fitAnalysis || undefined}
            language={outputLanguage}
            onFill={handleTemplateFill}
            onBack={() => setCurrentStep('style-choice')}
          />
        </div>
      )}

      {currentStep === 'generating' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">{t('generating.title')}</h3>
            <p className="text-muted-foreground">
              {t('generating.creating')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('generating.aiDisclosure')}
            </p>
          </div>
        </div>
      )}

      {/* Template Preview - for filled templates */}
      {currentStep === 'preview' && templatePdfBlob && linkedInData && (
        <TemplatePreview
          docxBlob={templatePdfBlob}
          fileName={templateFileName}
          onDownload={handleTemplateDownload}
          onBack={() => {
            setTemplatePdfBlob(null);
            setSelectedTemplateId(null);
            setTemplateFileName('');
            setCurrentStep('template');
          }}
          onNewVacancy={handleNewVacancy}
          isDownloading={isDownloading}
          credits={credits}
          linkedInData={linkedInData}
          jobVacancy={jobVacancy}
          fitAnalysis={fitAnalysis}
          language={outputLanguage}
          onCreditsRefresh={refreshCredits}
          onTokenUsage={(usage) => addTokenUsage('motivation', usage)}
          templateId={selectedTemplateId || undefined}
          onRefillComplete={(blob) => setTemplatePdfBlob(blob)}
        />
      )}

      {/* CV Preview - for AI-generated CVs */}
      {currentStep === 'preview' && generatedContent && linkedInData && designTokens && !templatePdfBlob && jobSourceMeta?.supportsInAppApply && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/5 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <p className="font-semibold text-sm">
              {jobVacancy?.company
                ? `Klaar om te solliciteren bij ${jobVacancy.company}?`
                : 'Klaar om te solliciteren?'}
            </p>
            <p className="text-xs text-muted-foreground">
              {pdfBlob
                ? 'Verstuur je CV direct via CVeetje naar de werkgever.'
                : 'Download eerst je CV, dan kun je hem direct versturen.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => void handleOpenApplyDialog()}
            disabled={!pdfBlob || isLoadingCoverLetter}
          >
            {isLoadingCoverLetter ? 'Even laden…' : 'Solliciteer via CVeetje'}
          </Button>
        </div>
      )}

      {currentStep === 'preview' && generatedContent && linkedInData && designTokens && !templatePdfBlob && (
        <CVPreview
          content={editedContent || generatedContent}
          tokens={designTokens}
          // In the wizard flow the freshly-generated tokens are also the
          // baseline for Reset — they haven't been tweaked yet. If the user
          // navigates away and returns via /cv/[id] the page-level loader
          // passes through cv.originalDesignTokens from Firestore.
          originalDesignTokens={designTokens}
          fullName={editedHeader?.fullName ?? linkedInData.fullName}
          headline={editedHeader?.headline ?? (editedContent || generatedContent).headline ?? linkedInData.headline}
          avatarUrl={avatarUrl}
          contactInfo={editedHeader?.contactInfo ?? {
            email: linkedInData.email,
            phone: linkedInData.phone,
            location: linkedInData.location || undefined,
            linkedinUrl: linkedInData.linkedinUrl,
            website: linkedInData.website,
            github: linkedInData.github,
            birthDate: linkedInData.birthDate,
          }}
          jobVacancy={jobVacancy}
          linkedInData={linkedInData}
          fitAnalysis={fitAnalysis}
          cvId={cvId}
          language={outputLanguage}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          onNewVacancy={handleNewVacancy}
          onCreditsRefresh={refreshCredits}
          onTokenUsage={(usage) => addTokenUsage('motivation', usage)}
          isDownloading={isDownloading}
          isRegenerating={isGenerating}
          credits={credits}
          pdfDownloaded={pdfDownloaded}
          onContentChange={handleContentChange}
          onHeaderChange={handleHeaderChange}
          onColorsChange={handleColorsChange}
          onElementColorsChange={handleElementColorsChange}
          onTokensChange={handleTokensChange}
          currentCreativityLevel={selectedCreativityLevel}
          disputeCount={disputeCount}
          onDisputeApproved={handleDisputeApproved}
        />
      )}

      {jobSourceMeta && pdfBlob && (
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {jobVacancy?.company
                  ? `Solliciteer bij ${jobVacancy.company}`
                  : 'Solliciteren via CVeetje'}
              </DialogTitle>
              <DialogDescription>{jobVacancy?.title}</DialogDescription>
            </DialogHeader>
            <ApplyForm
              jobSlug={jobSourceMeta.slug}
              cvPdfBlob={pdfBlob}
              cvFileName={`cv-${linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}.pdf`}
              coverLetterBlob={coverLetterBlob ?? undefined}
              coverLetterFileName={
                coverLetterBlob
                  ? `motivatiebrief-${linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}.pdf`
                  : undefined
              }
              cvId={cvId}
              questions={jobSourceMeta.applyQuestions}
              defaults={{
                firstName: linkedInData?.fullName?.split(' ')[0],
                lastName: linkedInData?.fullName?.split(' ').slice(1).join(' '),
                email: linkedInData?.email ?? userData?.email ?? undefined,
                phone: linkedInData?.phone ?? undefined,
                linkedinUrl: linkedInData?.linkedinUrl ?? undefined,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
