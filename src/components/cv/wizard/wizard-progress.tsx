'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Coins } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TokenUsageDisplay } from '../token-usage-display';
import type { WizardStep } from '@/hooks/use-wizard-persistence';
import type { LLMMode, StepTokenUsage } from '@/types';

interface WizardProgressProps {
  steps: { id: WizardStep; label: string }[];
  currentStep: WizardStep;
  tokenHistory: StepTokenUsage[];
  modelName?: string;
  llmMode: LLMMode;
  credits: number | null;
  onBack: () => void;
}

export function WizardProgress({
  steps,
  currentStep,
  tokenHistory,
  modelName,
  llmMode,
  credits,
  onBack,
}: WizardProgressProps) {
  const t = useTranslations('cvWizard');
  const tCommon = useTranslations('common');

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="hidden sm:flex justify-between text-sm">
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
      <span className="sm:hidden text-sm font-medium text-primary">
        {steps[currentStepIndex].label} ({currentStepIndex + 1}/{steps.length})
      </span>
      <Progress value={progress} className="h-2" />

      <div className="flex items-center justify-between">
        <div>
          {currentStep !== 'linkedin' && currentStep !== 'generating' && (
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tCommon('back')}
            </Button>
          )}
        </div>
        {llmMode !== 'platform' && (
          <TokenUsageDisplay history={tokenHistory} modelName={modelName} />
        )}
      </div>

      {llmMode === 'platform' &&
        currentStep !== 'preview' &&
        currentStep !== 'generating' && (
          <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Coins className="h-4 w-4 shrink-0" />
              <span>{t('platformCredits.balance', { credits: credits ?? 0 })}</span>
            </div>
            <Link
              href="/settings"
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 ml-2"
            >
              {t('platformCredits.saveTip')}
            </Link>
          </div>
        )}
    </div>
  );
}
