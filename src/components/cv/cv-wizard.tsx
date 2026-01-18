'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ArrowLeft, Loader2, AlertTriangle, Key } from 'lucide-react';
import { ProfileInput } from './profile-input';
import { JobInput } from './job-input';
import { DynamicStylePicker } from './dynamic-style-picker';
import { AvatarUpload } from './avatar-upload';
import { CVPreview } from './cv-preview';
import { TokenUsageDisplay } from './token-usage-display';
import { useAuth } from '@/components/auth/auth-context';
import type {
  ParsedLinkedIn,
  JobVacancy,
  CVStyleConfig,
  GeneratedCVContent,
  TokenUsage,
  StepTokenUsage,
} from '@/types';
import type { ModelInfo, ProviderInfo } from '@/lib/ai/models-registry';
import { findModelInProviders } from '@/lib/ai/models-registry';
import Link from 'next/link';

type WizardStep = 'linkedin' | 'job' | 'style' | 'generating' | 'preview';

export function CVWizard() {
  const router = useRouter();
  const { userData, credits, refreshCredits } = useAuth();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('linkedin');
  const [linkedInData, setLinkedInData] = useState<ParsedLinkedIn | null>(null);
  const [jobVacancy, setJobVacancy] = useState<JobVacancy | null>(null);
  const [styleConfig, setStyleConfig] = useState<CVStyleConfig | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedCVContent | null>(null);
  const [cvId, setCvId] = useState<string | null>(null);

  // Model info for file upload support
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Loading/error state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Token usage tracking
  const [tokenHistory, setTokenHistory] = useState<StepTokenUsage[]>([]);

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

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'linkedin', label: 'Profiel' },
    { id: 'job', label: 'Vacature' },
    { id: 'style', label: 'Stijl' },
    { id: 'generating', label: 'Genereren' },
    { id: 'preview', label: 'Preview' },
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
    setCurrentStep('style');
  };

  const handleStyleGenerated = async (config: CVStyleConfig) => {
    setStyleConfig(config);

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

  const handleDownload = async () => {
    if (!cvId || credits < 1) return;

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
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
    const stepOrder: WizardStep[] = ['linkedin', 'job', 'style', 'preview'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  // Show API key warning if not configured
  if (!hasApiKey && currentStep === 'linkedin') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert>
          <Key className="h-4 w-4" />
          <div className="ml-2">
            <p className="font-medium">API Key Required</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need to configure your own AI API key before creating CVs.
              This allows you to use your preferred AI provider (OpenAI, Anthropic, or Google).
            </p>
            <Link href="/settings">
              <Button className="mt-3" size="sm">
                Configure API Key
              </Button>
            </Link>
          </div>
        </Alert>
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
                Back
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
          onTokenUsage={(usage) => addTokenUsage('linkedin', usage)}
          initialData={linkedInData}
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

      {currentStep === 'style' && linkedInData && (
        <div className="space-y-6">
          {/* Avatar Upload - always shown so user can add photo if desired */}
          <div className="rounded-lg border p-4">
            <AvatarUpload
              avatarUrl={avatarUrl}
              onAvatarChange={setAvatarUrl}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Je foto wordt getoond in de CV als de gekozen stijl dit ondersteunt.
            </p>
          </div>

          <DynamicStylePicker
            linkedInData={linkedInData}
            jobVacancy={jobVacancy}
            onStyleGenerated={handleStyleGenerated}
            onTokenUsage={(usage) => addTokenUsage('style', usage)}
            initialStyleConfig={styleConfig}
          />
        </div>
      )}

      {currentStep === 'generating' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Generating your CV...</h3>
            <p className="text-muted-foreground">
              AI is tailoring your CV based on your profile, the job, and your style preferences.
            </p>
          </div>
        </div>
      )}

      {currentStep === 'preview' && generatedContent && linkedInData && styleConfig && (
        <CVPreview
          content={generatedContent}
          styleConfig={styleConfig}
          fullName={linkedInData.fullName}
          headline={linkedInData.headline}
          avatarUrl={avatarUrl}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          isDownloading={isDownloading}
          isRegenerating={isGenerating}
          credits={credits}
        />
      )}
    </div>
  );
}
