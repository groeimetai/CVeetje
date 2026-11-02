'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Promise-gebaseerde bevestigingsdialoog als vervanger voor `window.confirm()`.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: t('deleteConfirm'), destructive: true }))) return;
 *
 * Eén consistente, toegankelijke en vertaalde dialoog in de hele app i.p.v.
 * de native browser-popup (die niet te stylen of te vertalen is).
 */

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!opts} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
            {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>{opts?.cancelLabel ?? t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={opts?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {opts?.confirmLabel ?? (opts?.destructive ? t('delete') : t('confirm'))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  // Fallback buiten de provider (bv. publieke pagina's): native confirm.
  return ctx ?? (async (o) => window.confirm(o.title));
}
