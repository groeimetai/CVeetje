'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Scale,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-context';
import type { StyleCreativityLevel, DisputeStatus } from '@/types';

interface CVDisputeDialogProps {
  cvId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: StyleCreativityLevel;
  disputeCount: number;
  /** Called after a successful approve → CV is regenerated, parent should refresh */
  onApproved?: () => void;
}

const MAX_DISPUTES = 3;
const MIN_REASON = 20;

// Labels/descriptions live in `cvDispute.levels.<value>.{label,description}`.
const LEVELS: StyleCreativityLevel[] = [
  'conservative',
  'balanced',
  'creative',
  'experimental',
  'editorial-paper',
];

type DialogState =
  | { kind: 'form' }
  | { kind: 'submitting' }
  | { kind: 'result'; status: DisputeStatus; rationale?: string; message?: string; remainingAttempts?: number; newLevel?: StyleCreativityLevel };

export function CVDisputeDialog({
  cvId,
  open,
  onOpenChange,
  currentLevel,
  disputeCount,
  onApproved,
}: CVDisputeDialogProps) {
  const { refreshToken } = useAuth();
  const t = useTranslations('cvDispute');
  const tCommon = useTranslations('common');
  const [state, setState] = useState<DialogState>({ kind: 'form' });
  const [reason, setReason] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<StyleCreativityLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, MAX_DISPUTES - disputeCount);
  const isLast = disputeCount === MAX_DISPUTES - 1;
  const disabled = remaining <= 0;

  const handleSubmit = async () => {
    setError(null);
    if (reason.trim().length < MIN_REASON) {
      setError(t('errors.reasonTooShort', { min: MIN_REASON }));
      return;
    }
    if (!selectedLevel) {
      setError(t('errors.chooseLevel'));
      return;
    }
    if (selectedLevel === currentLevel) {
      setError(t('errors.sameLevel'));
      return;
    }

    setState({ kind: 'submitting' });
    try {
      const token = await refreshToken();
      const response = await fetch(`/api/cv/${cvId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: reason.trim(), requestedLevel: selectedLevel }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('errors.unknown'));
        setState({ kind: 'form' });
        return;
      }

      setState({
        kind: 'result',
        status: data.status,
        rationale: data.rationale,
        message: data.message,
        remainingAttempts: data.remainingAttempts,
        newLevel: data.newLevel,
      });

      if (data.status === 'approved') {
        // Server signals whether the user's manual tweaks were discarded by
        // the regenerate. If so, surface a toast so they know why their
        // earlier color/font choices are gone.
        if (data.tweaksDiscarded) {
          // Toast import is intentional here instead of at the top because
          // this is a rarely-used branch — keeps the bundle lean.
          const { toast } = await import('sonner');
          toast.info(t('tweaksDiscarded'));
        }
        onApproved?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
      setState({ kind: 'form' });
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Reset on close
      setReason('');
      setSelectedLevel(null);
      setError(null);
      setState({ kind: 'form' });
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description', { max: MAX_DISPUTES })}
          </DialogDescription>
        </DialogHeader>

        {disabled ? (
          <div className="text-center py-8 space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm">
              {t('maxReached', { max: MAX_DISPUTES })}
            </p>
          </div>
        ) : state.kind === 'form' || state.kind === 'submitting' ? (
          <>
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {t('attempt', { current: disputeCount + 1, max: MAX_DISPUTES })}
                {isLast && (
                  <span className="ml-2 text-orange-600 font-medium">
                    {t('lastAttempt')}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm font-medium" id="dispute-level-label">
                  {t('errors.chooseLevel')}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2" role="group" aria-labelledby="dispute-level-label">
                  {LEVELS.filter((l) => l !== currentLevel).map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={selectedLevel === level}
                      onClick={() => setSelectedLevel(level)}
                      className={`p-3 rounded-md border text-left transition-colors ${
                        selectedLevel === level
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <p className="font-medium text-sm">{t(`levels.${level}.label`)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(`levels.${level}.description`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="dispute-reason">
                  {t('reasonLabel')}
                  <span className="text-muted-foreground font-normal">
                    {' '}{t('reasonMin', { min: MIN_REASON })}
                  </span>
                </label>
                <Textarea
                  id="dispute-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('reasonPlaceholder')}
                  rows={4}
                  className="mt-1"
                  disabled={state.kind === 'submitting'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('reasonCount', { count: reason.length, min: MIN_REASON })}
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={state.kind === 'submitting'}>
                {tCommon('cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  state.kind === 'submitting' ||
                  reason.trim().length < MIN_REASON ||
                  !selectedLevel
                }
              >
                {state.kind === 'submitting' ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t('submitting')}</>
                ) : (
                  t('submit')
                )}
              </Button>
            </DialogFooter>
          </>
        ) : state.kind === 'result' ? (
          <div className="space-y-4">
            {state.status === 'approved' && (
              <div className="bg-green-500/10 border border-green-500/30 p-4 rounded space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-semibold">{t('approved.title')}</p>
                </div>
                <p className="text-sm">
                  {t.rich('approved.body', {
                    level: state.newLevel ? t(`levels.${state.newLevel}.label`) : '',
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
                {state.rationale && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('aiRationale', { rationale: state.rationale })}
                  </p>
                )}
              </div>
            )}
            {state.status === 'rejected' && (
              <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded space-y-2">
                <div className="flex items-center gap-2 text-orange-700">
                  <XCircle className="h-5 w-5" />
                  <p className="font-semibold">{t('rejected.title')}</p>
                </div>
                <p className="text-sm">
                  {t('rejected.body')}
                </p>
                {state.rationale && (
                  <p className="text-xs text-muted-foreground italic">
                    {t('aiRationale', { rationale: state.rationale })}
                  </p>
                )}
                {state.remainingAttempts !== undefined && state.remainingAttempts > 0 && (
                  <p className="text-xs">
                    {t('rejected.remaining', { count: state.remainingAttempts })}
                  </p>
                )}
              </div>
            )}
            {state.status === 'needs-human' && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded space-y-2">
                <div className="flex items-center gap-2 text-blue-700">
                  <UserIcon className="h-5 w-5" />
                  <p className="font-semibold">{t('needsHuman.title')}</p>
                </div>
                <p className="text-sm">
                  {state.message || t('needsHuman.body')}
                </p>
              </div>
            )}

            <DialogFooter>
              {state.status === 'approved' ? (
                <Button onClick={() => handleClose(false)}>
                  {t('viewNewCv')}
                </Button>
              ) : (
                <Button onClick={() => handleClose(false)}>{tCommon('close')}</Button>
              )}
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
