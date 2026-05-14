'use client';

import { useLocale, useTranslations } from 'next-intl';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatTimeAgo,
  type WizardDraft,
  type WizardStep,
} from '@/hooks/use-wizard-persistence';

interface ResumeDraftDialogProps {
  draft: WizardDraft;
  onResume: () => void;
  onDiscard: () => void;
}

export function ResumeDraftDialog({ draft, onResume, onDiscard }: ResumeDraftDialogProps) {
  const locale = useLocale();
  const t = useTranslations('cvWizard');

  const stepLabels: Record<WizardStep, string> = {
    linkedin: t('steps.profile'),
    job: t('steps.job'),
    'fit-analysis': t('steps.fitAnalysis'),
    'style-choice': t('steps.styleChoice'),
    style: t('steps.style'),
    'template-style': t('steps.templateStyle'),
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
          <CardDescription>{t('resumeDraft.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={onResume} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('resumeDraft.resume')}
            </Button>
            <Button variant="outline" onClick={onDiscard} className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('resumeDraft.startNew')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
