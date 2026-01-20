'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, Key, RefreshCw, Trash2 } from 'lucide-react';
import { ProfileInput } from './profile-input';
import { JobInput } from './job-input';
import { FitAnalysisCard } from './fit-analysis-card';
import { DynamicStylePicker } from './dynamic-style-picker';
import { CVPreview, type PDFPageMode } from './cv-preview';
import { TokenUsageDisplay } from './token-usage-display';
import { StyleOrTemplateChoice, TemplateSelector } from '@/components/templates';
import { useAuth } from '@/components/auth/auth-context';
import { useWizardPersistence, formatTimeAgo, type WizardStep } from '@/hooks/use-wizard-persistence';
import type {
  ParsedLinkedIn,
  JobVacancy,
  CVStyleConfig,
  GeneratedCVContent,
  TokenUsage,
  StepTokenUsage,
  CVContactInfo,
  OutputLanguage,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { ModelInfo, ProviderInfo } from '@/lib/ai/models-registry';
import { findModelInProviders } from '@/lib/ai/models-registry';
import Link from 'next/link';

export function CVWizard() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('cvWizard');
  const tCommon = useTranslations('common');
  const { userData, credits, refreshCredits } = useAuth();

  // Draft persistence
  const { hasDraft, draft, saveDraft, clearDraft, isLoading: isDraftLoading } = useWizardPersistence();
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [draftChecked, setDraftChecked] = useState(false);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('linkedin');
  const [linkedInData, setLinkedInData] = useState<ParsedLinkedIn | null>(null);
  const [jobVacancy, setJobVacancy] = useState<JobVacancy | null>(null);
  const [styleConfig, setStyleConfig] = useState<CVStyleConfig | null>(null);
  const [designTokens, setDesignTokens] = useState<CVDesignTokens | null>(null);
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

  // Model info for file upload support
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Loading/error state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Save draft when relevant state changes
  const saveCurrentDraft = useCallback(() => {
    if (linkedInData) {
      saveDraft({
        currentStep,
        linkedInData,
        jobVacancy,
        styleConfig,
        designTokens,
        avatarUrl,
        outputLanguage,
      });
    }
  }, [currentStep, linkedInData, jobVacancy, styleConfig, designTokens, avatarUrl, outputLanguage, saveDraft]);

  // Auto-save draft on state changes (debounced by the effect dependencies)
  useEffect(() => {
    if (draftChecked && !showResumeDialog && currentStep !== 'generating' && currentStep !== 'preview') {
      saveCurrentDraft();
    }
  }, [currentStep, linkedInData, jobVacancy, styleConfig, designTokens, avatarUrl, outputLanguage, draftChecked, showResumeDialog, saveCurrentDraft]);

  // Resume from draft
  const handleResumeDraft = () => {
    if (draft) {
      setCurrentStep(draft.currentStep);
      setLinkedInData(draft.linkedInData);
      setJobVacancy(draft.jobVacancy);
      setStyleConfig(draft.styleConfig);
      setDesignTokens(draft.designTokens);
      setAvatarUrl(draft.avatarUrl);
      setOutputLanguage(draft.outputLanguage);
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
  }, [userData?.apiKey]);

  // Update model info when user data changes
  useEffect(() => {
    if (providers.length > 0 && userData?.apiKey) {
      const model = findModelInProviders(
        providers,
        userData.apiKey.provider,
        userData.apiKey.model
      );
      setModelInfo(model);
    }
  }, [providers, userData?.apiKey]);

  // Track whether user chose template mode
  const [useTemplateMode, setUseTemplateMode] = useState(false);

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'linkedin', label: t('steps.profile') },
    { id: 'job', label: t('steps.job') },
    { id: 'fit-analysis', label: t('steps.fitAnalysis') },
    { id: 'style-choice', label: t('steps.styleChoice') },
    ...(useTemplateMode
      ? [{ id: 'template' as WizardStep, label: t('steps.template') }]
      : [{ id: 'style' as WizardStep, label: t('steps.style') }]),
    { id: 'generating', label: t('steps.generating') },
    { id: 'preview', label: t('steps.preview') },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Check if user has API key configured
  const hasApiKey = !!userData?.apiKey;

  const handleLinkedInParsed = (data: ParsedLinkedIn) => {
    setLinkedInData(data);
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

  // Handle choice between own style or template
  const handleChooseStyle = () => {
    setUseTemplateMode(false);
    setCurrentStep('style');
  };

  const handleChooseTemplate = () => {
    setUseTemplateMode(true);
    setCurrentStep('template');
  };

  // Handle template fill completion
  const handleTemplateFilled = (pdfBlob: Blob, templateName: string) => {
    // Download the filled PDF directly
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cv-${linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}-${templateName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Refresh credits
    refreshCredits();

    // Clear draft since template was filled
    clearDraft();
  };

  const handleFitAnalysisChangeJob = () => {
    // Go back to job input
    setCurrentStep('job');
  };

  const handleStyleGenerated = async (config: CVStyleConfig, tokens: CVDesignTokens) => {
    setStyleConfig(config);
    setDesignTokens(tokens);

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
          styleConfig: config,
          avatarUrl,
          language: outputLanguage,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('style');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!hasApiKey || !linkedInData || !styleConfig) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/cv/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedInData,
          jobVacancy,
          styleConfig,
          avatarUrl,
          language: outputLanguage,
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

  const handleDownload = async (pageMode: PDFPageMode = 'multi-page') => {
    if (!cvId || credits < 1) return;

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

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv-${linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Refresh credits
      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDownloading(false);
    }
  };

  const goBack = () => {
    const stepOrder: WizardStep[] = ['linkedin', 'job', 'fit-analysis', 'style-choice', useTemplateMode ? 'template' : 'style', 'preview'];
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
    setStyleConfig(null);
    setDesignTokens(null);
    setGeneratedContent(null);
    setEditedContent(null);
    setEditedHeader(null);
    setEditedColors(null);
    setElementColors({});
    setCvId(null);
    setError(null);
    // Reset token history for the new CV - each CV should track its own usage
    setTokenHistory([]);

    // Go to job input step
    setCurrentStep('job');
  };

  // Show API key warning if not configured
  if (!hasApiKey && currentStep === 'linkedin' && !showResumeDialog) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert>
          <Key className="h-4 w-4" />
          <div className="ml-2">
            <p className="font-medium">{t('noApiKey.title')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('noApiKey.description')}
            </p>
            <Link href="/settings">
              <Button className="mt-3" size="sm">
                {t('noApiKey.button')}
              </Button>
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  // Show resume dialog if there's a saved draft
  if (showResumeDialog && draft) {
    const stepLabels: Record<WizardStep, string> = {
      linkedin: t('steps.profile'),
      job: t('steps.job'),
      'fit-analysis': t('steps.fitAnalysis'),
      'style-choice': t('steps.styleChoice'),
      style: t('steps.style'),
      template: t('steps.template'),
      generating: t('steps.generating'),
      preview: t('steps.preview'),
    };

    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              {t('resumeDraft.title')}
            </CardTitle>
            <CardDescription>
              {t('resumeDraft.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Draft info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('resumeDraft.profile')}:</span>
                <span className="font-medium">{draft.linkedInData?.fullName || '-'}</span>
              </div>
              {draft.jobVacancy && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('resumeDraft.vacancy')}:</span>
                  <span className="font-medium truncate max-w-[200px]">
                    {draft.jobVacancy.title}
                    {draft.jobVacancy.company && ` @ ${draft.jobVacancy.company}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('resumeDraft.step')}:</span>
                <span className="font-medium">{stepLabels[draft.currentStep]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('resumeDraft.saved')}:</span>
                <span className="font-medium">{formatTimeAgo(draft.savedAt, locale)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleResumeDraft} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('resumeDraft.resume')}
              </Button>
              <Button variant="outline" onClick={handleDiscardDraft} className="flex-1">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('resumeDraft.startNew')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
      {/* Progress bar with token counter */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={
                index <= currentStepIndex
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              }
            >
              {step.label}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-2" />

        {/* Token counter integrated below progress bar */}
        <div className="flex items-center justify-between">
          <div>
            {/* Back button */}
            {currentStep !== 'linkedin' && currentStep !== 'generating' && (
              <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tCommon('back')}
              </Button>
            )}
          </div>
          <TokenUsageDisplay history={tokenHistory} modelName={modelInfo?.name} />
        </div>
      </div>

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
          initialData={jobVacancy}
        />
      )}

      {currentStep === 'fit-analysis' && linkedInData && jobVacancy && (
        <FitAnalysisCard
          linkedInData={linkedInData}
          jobVacancy={jobVacancy}
          onContinue={handleFitAnalysisContinue}
          onChangeJob={handleFitAnalysisChangeJob}
          onTokenUsage={(usage) => addTokenUsage('style', usage)}
        />
      )}

      {currentStep === 'style-choice' && linkedInData && (
        <StyleOrTemplateChoice
          onChooseStyle={handleChooseStyle}
          onChooseTemplate={handleChooseTemplate}
        />
      )}

      {currentStep === 'template' && linkedInData && (
        <TemplateSelector
          profileData={linkedInData}
          onFill={handleTemplateFilled}
          onBack={() => setCurrentStep('style-choice')}
        />
      )}

      {currentStep === 'style' && linkedInData && (
        <div className="space-y-6">
          {/* Language Selection */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t('languageSelection.title')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('languageSelection.description')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOutputLanguage('nl')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    outputLanguage === 'nl'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  🇳🇱 {t('languageSelection.dutch')}
                </button>
                <button
                  onClick={() => setOutputLanguage('en')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    outputLanguage === 'en'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  🇬🇧 {t('languageSelection.english')}
                </button>
              </div>
            </div>
          </div>

          <DynamicStylePicker
            linkedInData={linkedInData}
            jobVacancy={jobVacancy}
            avatarUrl={avatarUrl}
            onStyleGenerated={handleStyleGenerated}
            onTokenUsage={(usage) => addTokenUsage('style', usage)}
            initialStyleConfig={styleConfig}
            initialTokens={designTokens}
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
          </div>
        </div>
      )}

      {currentStep === 'preview' && generatedContent && linkedInData && designTokens && (
        <CVPreview
          content={editedContent || generatedContent}
          tokens={designTokens}
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
          }}
          jobVacancy={jobVacancy}
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
          onContentChange={handleContentChange}
          onHeaderChange={handleHeaderChange}
          onColorsChange={handleColorsChange}
          onElementColorsChange={handleElementColorsChange}
        />
      )}
    </div>
  );
}
