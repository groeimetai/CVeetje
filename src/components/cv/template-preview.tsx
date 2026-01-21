'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  FileType,
  Loader2,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  Download,
  ChevronDown,
  Coins,
  Briefcase
} from 'lucide-react';
import { TemplateMotivationLetterSection } from './template-motivation-letter-section';
import type { ParsedLinkedIn, JobVacancy, FitAnalysis, OutputLanguage, TokenUsage } from '@/types';

interface TemplatePreviewProps {
  docxBlob: Blob;
  fileName: string;
  onDownload: (format: 'pdf' | 'docx') => void;
  onBack: () => void;
  onNewVacancy?: () => void;
  isDownloading: boolean;
  credits: number;
  // Data for motivation letter
  linkedInData?: ParsedLinkedIn | null;
  jobVacancy?: JobVacancy | null;
  fitAnalysis?: FitAnalysis | null;
  language?: OutputLanguage;
  onCreditsRefresh?: () => void;
  onTokenUsage?: (usage: TokenUsage) => void;
}

export function TemplatePreview({
  docxBlob,
  fileName,
  onDownload,
  onBack,
  onNewVacancy,
  isDownloading,
  credits,
  linkedInData,
  jobVacancy,
  fitAnalysis,
  language = 'nl',
  onCreditsRefresh,
  onTokenUsage,
}: TemplatePreviewProps) {
  const t = useTranslations('templatePreview');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Render DOCX using docx-preview
  useEffect(() => {
    const renderDocx = async () => {
      if (!containerRef.current || !docxBlob) return;

      setIsRendering(true);
      setRenderError(null);

      try {
        // Dynamic import to avoid SSR issues
        const { renderAsync } = await import('docx-preview');

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Convert blob to ArrayBuffer
        const arrayBuffer = await docxBlob.arrayBuffer();

        // Render the DOCX
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx-preview-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
      } catch (err) {
        console.error('Failed to render DOCX:', err);
        setRenderError(err instanceof Error ? err.message : 'Failed to render document');
      } finally {
        setIsRendering(false);
      }
    };

    renderDocx();
  }, [docxBlob]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success message */}
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">{t('fillSuccess')}</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              {t('fillSuccessDesc')}
            </AlertDescription>
          </Alert>

          {/* DOCX Preview */}
          <div className="relative rounded-lg border bg-white overflow-hidden">
            {/* Watermark overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-6xl font-bold text-gray-300/30 dark:text-gray-600/30 whitespace-nowrap select-none"
                    style={{
                      transform: `rotate(-45deg) translate(${(i - 1) * 200}px, ${(i - 1) * 150}px)`,
                    }}
                  >
                    CVeetje PREVIEW
                  </div>
                ))}
              </div>
            </div>

            {/* Loading state */}
            {isRendering && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">{t('rendering')}</span>
              </div>
            )}

            {/* Error state */}
            {renderError && (
              <div className="flex items-center justify-center py-20 text-destructive">
                <span>{renderError}</span>
              </div>
            )}

            {/* DOCX render container */}
            <div
              ref={containerRef}
              className="docx-preview-container min-h-[600px] max-h-[800px] overflow-auto"
              style={{
                // Prevent text selection in preview
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
            {isDownloading ? (
              <Button
                disabled
                className="flex-1"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4 animate-bounce" />
                {t('downloading')}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={credits < 1}
                    className="flex-1"
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('download')}
                    <Badge variant="secondary" className="ml-2">
                      <Coins className="h-3 w-3 mr-1" />1 credit
                    </Badge>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => onDownload('docx')}>
                    <FileType className="mr-2 h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Word (.docx)</span>
                      <span className="text-xs text-muted-foreground">
                        {t('downloadDocxDesc')}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload('pdf')}>
                    <FileText className="mr-2 h-4 w-4 text-red-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">PDF</span>
                      <span className="text-xs text-muted-foreground">
                        {t('downloadPdfDesc')}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              onClick={onBack}
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('changeTemplate')}
            </Button>

            {onNewVacancy && (
              <Button
                variant="outline"
                onClick={onNewVacancy}
                disabled={isDownloading}
                size="lg"
              >
                <Briefcase className="mr-2 h-4 w-4" />
                {t('newVacancy')}
              </Button>
            )}
          </div>

          {/* Credits warning */}
          {credits < 1 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                {t('insufficientCredits')}
              </p>
            </div>
          )}

          {/* Motivation Letter Section */}
          {linkedInData && jobVacancy && (
            <TemplateMotivationLetterSection
              linkedInData={linkedInData}
              jobVacancy={jobVacancy}
              fitAnalysis={fitAnalysis || undefined}
              credits={credits}
              language={language}
              onCreditsUsed={onCreditsRefresh}
              onTokenUsage={onTokenUsage}
            />
          )}
        </CardContent>
      </Card>

      {/* Styles for docx-preview */}
      <style jsx global>{`
        .docx-preview-container .docx-wrapper {
          background: white;
          padding: 20px;
        }
        .docx-preview-container .docx-wrapper > section.docx {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          padding: 40px 60px;
          background: white;
        }
        /* Disable text selection */
        .docx-preview-container * {
          user-select: none !important;
          -webkit-user-select: none !important;
        }
      `}</style>
    </div>
  );
}
