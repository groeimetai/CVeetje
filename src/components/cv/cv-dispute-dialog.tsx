'use client';

import { useState } from 'react';
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

const LEVELS: { value: StyleCreativityLevel; label: string; description: string }[] = [
  { value: 'conservative', label: 'Veilig', description: 'ATS-vriendelijk, traditioneel' },
  { value: 'balanced', label: 'Gebalanceerd', description: 'Modern maar professioneel' },
  { value: 'creative', label: 'Creatief', description: 'Editorial/magazine layout' },
  { value: 'experimental', label: 'Experimenteel', description: 'Bold/Canva-stijl met kleur' },
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
      setError(`Reden moet minstens ${MIN_REASON} tekens bevatten`);
      return;
    }
    if (!selectedLevel) {
      setError('Kies een ander stijl-niveau');
      return;
    }
    if (selectedLevel === currentLevel) {
      setError('Het gekozen niveau is hetzelfde als het huidige');
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
        setError(data.error || 'Onbekende fout');
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
        onApproved?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout');
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
            CV laten heroverwegen
          </DialogTitle>
          <DialogDescription>
            Klopt er iets niet in je CV? Je kunt tot 3 keer om een heroverweging
            vragen. Een onafhankelijke AI beoordeelt je klacht — bij de derde
            poging komt het bij een admin terecht.
          </DialogDescription>
        </DialogHeader>

        {disabled ? (
          <div className="text-center py-8 space-y-2">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm">
              Maximaal aantal disputes bereikt voor deze CV ({MAX_DISPUTES}/{MAX_DISPUTES}).
            </p>
          </div>
        ) : state.kind === 'form' || state.kind === 'submitting' ? (
          <>
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Poging {disputeCount + 1} van {MAX_DISPUTES}
                {isLast && (
                  <span className="ml-2 text-orange-600 font-medium">
                    (laatste — wordt handmatig beoordeeld)
                  </span>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  Kies een ander stijl-niveau
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {LEVELS.filter((l) => l.value !== currentLevel).map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setSelectedLevel(level.value)}
                      className={`p-3 rounded-md border text-left transition-colors ${
                        selectedLevel === level.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <p className="font-medium text-sm">{level.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {level.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Wat klopt er niet?
                  <span className="text-muted-foreground font-normal">
                    {' '}(min. {MIN_REASON} tekens)
                  </span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Bijvoorbeeld: de datum van mijn afstuderen staat er niet op, of: de kleuren passen niet bij een finance-rol..."
                  rows={4}
                  className="mt-1"
                  disabled={state.kind === 'submitting'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {reason.length}/{MIN_REASON} tekens
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
                Annuleren
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
                  <><Loader2 className="h-4 w-4 animate-spin mr-1" />Bezig met beoordelen...</>
                ) : (
                  'Dispute indienen'
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
                  <p className="font-semibold">Dispute goedgekeurd</p>
                </div>
                <p className="text-sm">
                  Je CV is opnieuw gegenereerd in het niveau{' '}
                  <strong>{LEVELS.find(l => l.value === state.newLevel)?.label}</strong>.
                </p>
                {state.rationale && (
                  <p className="text-xs text-muted-foreground italic">
                    AI: "{state.rationale}"
                  </p>
                )}
              </div>
            )}
            {state.status === 'rejected' && (
              <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded space-y-2">
                <div className="flex items-center gap-2 text-orange-700">
                  <XCircle className="h-5 w-5" />
                  <p className="font-semibold">Dispute afgewezen</p>
                </div>
                <p className="text-sm">
                  De AI-beoordelaar vindt deze CV passend. De CV blijft zoals hij is.
                </p>
                {state.rationale && (
                  <p className="text-xs text-muted-foreground italic">
                    AI: "{state.rationale}"
                  </p>
                )}
                {state.remainingAttempts !== undefined && state.remainingAttempts > 0 && (
                  <p className="text-xs">
                    Je hebt nog {state.remainingAttempts} dispute(s) over.
                  </p>
                )}
              </div>
            )}
            {state.status === 'needs-human' && (
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded space-y-2">
                <div className="flex items-center gap-2 text-blue-700">
                  <UserIcon className="h-5 w-5" />
                  <p className="font-semibold">Wacht op handmatige beoordeling</p>
                </div>
                <p className="text-sm">
                  {state.message || 'Dit is je derde dispute. Een admin beoordeelt hem zo snel mogelijk handmatig.'}
                </p>
              </div>
            )}

            <DialogFooter>
              {state.status === 'approved' ? (
                <Button onClick={() => handleClose(false)}>
                  Bekijk nieuwe CV
                </Button>
              ) : (
                <Button onClick={() => handleClose(false)}>Sluiten</Button>
              )}
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
