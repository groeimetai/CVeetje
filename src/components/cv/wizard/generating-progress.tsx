'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';

/**
 * Voortgang tijdens het genereren. De generatie is één server-call zonder
 * tussentijdse events; we tonen de fases daarom tijd-gebaseerd (met een
 * realistische duur) zodat de gebruiker ziet dat er iets gebeurt, i.p.v. een
 * kale spinner van 30-90 seconden. De laatste fase blijft actief tot de call
 * klaar is.
 */
export function GeneratingProgress({ isTemplate = false }: { isTemplate?: boolean }) {
  const t = useTranslations('cvWizard.generating');
  const phases = (t.raw(isTemplate ? 'templatePhases' : 'phases') as string[]) ?? [];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, phases.length - 1));
    }, 12_000);
    return () => clearInterval(id);
  }, [phases.length]);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-6" role="status" aria-live="polite">
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-sm text-muted-foreground">{t('duration')}</p>
      </div>
      <ol className="w-full max-w-sm space-y-2 text-sm">
        {phases.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            {i < active ? (
              <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            ) : i === active ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" aria-hidden="true" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-muted-foreground/40 shrink-0" aria-hidden="true" />
            )}
            <span className={i <= active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground max-w-sm text-center">{t('aiDisclosure')}</p>
    </div>
  );
}
