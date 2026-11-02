'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Coins } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TokenUsageDisplay } from '../token-usage-display';
import type { WizardStep } from '@/hooks/use-wizard-persistence';
import type { LLMMode, StepTokenUsage } from '@/types';
import { PLATFORM_CREDIT_COSTS } from '@/lib/ai/platform-config';

/**
 * De wizard heeft intern 8+ stappen (incl. tussenstappen als "Keuze" en
 * "Pin"). Voor de gebruiker groeperen we die in 5 fases, zodat de
 * voortgangsbalk niet van 2/8 naar 5/8 springt wanneer een optionele stap
 * wordt overgeslagen.
 */
export type WizardPhase = 'profile' | 'job' | 'match' | 'design' | 'result';

const PHASE_OF: Record<WizardStep, WizardPhase> = {
  linkedin: 'profile',
  job: 'job',
  'fit-analysis': 'match',
  'required-items': 'match',
  'style-choice': 'design',
  style: 'design',
  'template-style': 'design',
  template: 'design',
  generating: 'result',
  preview: 'result',
};

const PHASES: WizardPhase[] = ['profile', 'job', 'match', 'design', 'result'];

/** Eerste stap van een fase — doel bij klikken op een afgeronde fase. */
const PHASE_ENTRY: Record<WizardPhase, WizardStep> = {
  profile: 'linkedin',
  job: 'job',
  match: 'fit-analysis',
  design: 'style-choice',
  result: 'preview',
};

interface WizardProgressProps {
  currentStep: WizardStep;
  /** Er is een vacature gekozen; zonder vacature wordt "Match" overgeslagen. */
  hasVacancy: boolean;
  /** Er is al een CV gegenereerd (resultaat bereikbaar). */
  hasResult: boolean;
  tokenHistory: StepTokenUsage[];
  modelName?: string;
  llmMode: LLMMode;
  credits: number | null;
  onBack: () => void;
  onNavigate: (step: WizardStep) => void;
}

export function WizardProgress({
  currentStep,
  hasVacancy,
  hasResult,
  tokenHistory,
  modelName,
  llmMode,
  credits,
  onBack,
  onNavigate,
}: WizardProgressProps) {
  const t = useTranslations('cvWizard');
  const tCommon = useTranslations('common');

  const currentPhase = PHASE_OF[currentStep];
  const currentIndex = PHASES.indexOf(currentPhase);
  const progress = ((currentIndex + 1) / PHASES.length) * 100;
  const busy = currentStep === 'generating';

  const isSkipped = (phase: WizardPhase) => phase === 'match' && !hasVacancy && PHASES.indexOf(phase) < currentIndex;
  const canNavigate = (phase: WizardPhase, index: number) => {
    if (busy || phase === currentPhase || isSkipped(phase)) return false;
    if (phase === 'result') return hasResult;
    return index < currentIndex;
  };

  // Indicatie van de totale kosten van een CV (platform-modus).
  const estimate =
    PLATFORM_CREDIT_COSTS['job-parse'] +
    PLATFORM_CREDIT_COSTS['fit-analysis'] +
    PLATFORM_CREDIT_COSTS['style-generate'] +
    PLATFORM_CREDIT_COSTS['cv-generate'];

  return (
    <div className="space-y-3">
      <nav aria-label={t('progressLabel')}>
        <ol className="hidden sm:flex justify-between text-sm">
          {PHASES.map((phase, index) => {
            const done = index < currentIndex && !isSkipped(phase);
            const active = phase === currentPhase;
            const label = t(`phases.${phase}`);
            const content = (
              <>
                {done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{label}</span>
                {isSkipped(phase) && <span className="text-xs font-normal">({t('phaseSkipped')})</span>}
              </>
            );
            const cls = `inline-flex items-center gap-1 ${
              active ? 'text-primary font-semibold' : done ? 'text-primary font-medium' : 'text-muted-foreground'
            }`;
            return (
              <li key={phase} aria-current={active ? 'step' : undefined}>
                {canNavigate(phase, index) ? (
                  <button
                    type="button"
                    className={`${cls} underline-offset-4 hover:underline`}
                    onClick={() => onNavigate(PHASE_ENTRY[phase])}
                  >
                    {content}
                  </button>
                ) : (
                  <span className={cls}>{content}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <span className="sm:hidden text-sm font-medium text-primary">
        {t(`phases.${currentPhase}`)} ({currentIndex + 1}/{PHASES.length})
      </span>
      <Progress value={progress} className="h-2" aria-label={t('progressLabel')} />

      <div className="flex items-center justify-between">
        <div>
          {currentStep !== 'linkedin' && !busy && (
            <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {tCommon('back')}
            </Button>
          )}
        </div>
        {llmMode !== 'platform' && (
          <TokenUsageDisplay history={tokenHistory} modelName={modelName} />
        )}
      </div>

      {llmMode === 'platform' && currentStep !== 'preview' && !busy && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t('platformCredits.balance', { credits: credits ?? 0 })}
              {currentStep === 'linkedin' && (
                <span className="text-amber-700/80 dark:text-amber-300/80">
                  {' · '}
                  {t('platformCredits.estimate', { credits: estimate })}
                </span>
              )}
            </span>
          </div>
          <Link
            href="/settings"
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0"
          >
            {t('platformCredits.saveTip')}
          </Link>
        </div>
      )}
    </div>
  );
}
