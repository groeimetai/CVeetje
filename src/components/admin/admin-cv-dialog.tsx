'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Briefcase, Calendar, Cpu } from 'lucide-react';
import { generateCVHTML, getDefaultTokens } from '@/lib/cv/html-generator';
import { styleConfigToTokens } from '@/lib/cv/templates/adapter';
import type { GeneratedCVContent, CVStyleConfig } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import type { AdminCV } from '@/lib/firebase/admin-utils';
import { useAuth } from '@/components/auth/auth-context';

interface AdminCVDialogProps {
  cv: AdminCV | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCVDialog({ cv, open, onOpenChange }: AdminCVDialogProps) {
  const t = useTranslations('admin.cvs');
  const tStatus = useTranslations('dashboard.status');
  const { refreshToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvHTML, setCvHTML] = useState<string | null>(null);
  const [cvData, setCvData] = useState<Record<string, unknown> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open || !cv) {
      setCvHTML(null);
      setCvData(null);
      setError(null);
      return;
    }

    async function fetchFullCV() {
      setLoading(true);
      setError(null);
      try {
        // Refresh token to ensure cookie is fresh (prevents 403 on expired tokens)
        const token = await refreshToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`/api/admin/cvs/${cv!.cvId}?userId=${cv!.userId}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch CV');

        const data = await response.json();
        const fullCV = data.cv;
        setCvData(fullCV);

        // Generate HTML preview if content exists
        if (fullCV.generatedContent) {
          let tokens: CVDesignTokens;
          if (fullCV.tokens) {
            tokens = fullCV.tokens as CVDesignTokens;
          } else if (fullCV.styleConfig) {
            tokens = styleConfigToTokens(fullCV.styleConfig as CVStyleConfig);
          } else {
            tokens = getDefaultTokens();
          }

          const linkedIn = fullCV.linkedInData as Record<string, unknown> | undefined;
          const content = fullCV.generatedContent as GeneratedCVContent;

          const html = generateCVHTML(
            content,
            tokens,
            (linkedIn?.fullName as string) || 'Unknown',
            fullCV.avatarUrl as string | null,
            content.headline ?? (linkedIn?.headline as string | null),
            fullCV.elementOverrides as Parameters<typeof generateCVHTML>[5],
            linkedIn ? {
              email: linkedIn.email as string | undefined,
              phone: linkedIn.phone as string | undefined,
              location: (linkedIn.location as string | undefined) || undefined,
              linkedinUrl: linkedIn.linkedinUrl as string | undefined,
              website: linkedIn.website as string | undefined,
              github: linkedIn.github as string | undefined,
            } : null,
          );

          setCvHTML(html);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CV');
      } finally {
        setLoading(false);
      }
    }

    fetchFullCV();
  }, [open, cv]);

  // Auto-resize iframe to content height
  useEffect(() => {
    if (!cvHTML || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const height = doc.documentElement.scrollHeight;
          iframe.style.height = `${Math.min(height + 20, 800)}px`;
        }
      } catch {
        // Cross-origin restriction, use default height
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [cvHTML]);

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      generated: tStatus('generated'),
      pdf_ready: tStatus('ready'),
      generating: tStatus('generating'),
      draft: tStatus('draft'),
      failed: tStatus('failed'),
    };
    return statusMap[status] || status;
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cv?.jobTitle || t('generalCv')}
          </DialogTitle>
          <DialogDescription>
            {t('viewDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* CV Metadata */}
        {cv && (
          <div className="flex flex-wrap gap-4 text-sm border-b pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>{cv.userDisplayName || cv.userEmail}</span>
            </div>
            {cv.jobTitle && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{cv.jobTitle}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(cv.createdAt)}</span>
            </div>
            {cv.llmModel && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Cpu className="h-3.5 w-3.5" />
                <span>{cv.llmModel}</span>
              </div>
            )}
            <Badge variant="outline">{getStatusLabel(cv.status)}</Badge>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
          </div>
        ) : cvHTML ? (
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              srcDoc={cvHTML}
              title="CV Preview"
              className="w-full min-h-[600px]"
              sandbox="allow-same-origin"
              style={{ border: 'none' }}
            />
          </div>
        ) : cvData ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('noContent')}</p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
