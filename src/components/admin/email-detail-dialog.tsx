'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Mail, User, Calendar, AlertTriangle } from 'lucide-react';
import type { AdminEmail } from '@/app/api/admin/emails/route';

interface EmailDetailDialogProps {
  email: AdminEmail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  ERROR: 'destructive',
  PENDING: 'secondary',
  PROCESSING: 'secondary',
};

export function EmailDetailDialog({ email, open, onOpenChange }: EmailDetailDialogProps) {
  const t = useTranslations('admin.emails');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!email?.html || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const height = doc.documentElement.scrollHeight;
          iframe.style.height = `${Math.min(height + 20, 600)}px`;
        }
      } catch {
        // Cross-origin restriction, use default height
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [email?.html]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  };

  const getRecipient = (to: string | string[]) => {
    return Array.isArray(to) ? to.join(', ') : to;
  };

  const getStatusLabel = (state: string | null) => {
    if (!state) return t('statusPending');
    const map: Record<string, string> = {
      SUCCESS: t('statusSuccess'),
      ERROR: t('statusError'),
      PENDING: t('statusPending'),
      PROCESSING: t('statusProcessing'),
    };
    return map[state] || state;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {email?.subject || t('noSubject')}
          </DialogTitle>
          <DialogDescription>
            {t('dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        {email && (
          <>
            {/* Email Metadata */}
            <div className="flex flex-wrap gap-4 text-sm border-b pb-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{getRecipient(email.to)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{email.subject}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(email.deliveryEndTime || email.createdAt)}</span>
              </div>
              <Badge variant={STATUS_VARIANTS[email.deliveryState || ''] || 'outline'}>
                {getStatusLabel(email.deliveryState)}
              </Badge>
            </div>

            {/* Error info */}
            {email.deliveryError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{t('error')}</p>
                  <p className="mt-1">{email.deliveryError}</p>
                </div>
              </div>
            )}

            {/* Delivery details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">{t('attempts')}</div>
              <div>{email.deliveryAttempts}</div>
              {email.deliveryStartTime && (
                <>
                  <div className="text-muted-foreground">{t('startTime')}</div>
                  <div>{formatDate(email.deliveryStartTime)}</div>
                </>
              )}
              {email.deliveryEndTime && (
                <>
                  <div className="text-muted-foreground">{t('endTime')}</div>
                  <div>{formatDate(email.deliveryEndTime)}</div>
                </>
              )}
            </div>

            {/* HTML Preview */}
            {email.html ? (
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  ref={iframeRef}
                  srcDoc={email.html}
                  title="Email Preview"
                  className="w-full min-h-[300px]"
                  sandbox="allow-same-origin"
                  style={{ border: 'none' }}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('noContent')}</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
