'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, FileType, Loader2, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react';

interface TemplatePreviewProps {
  docxBlob: Blob;
  fileName: string;
  onDownload: (format: 'pdf' | 'docx') => void;
  onBack: () => void;
  onNewVacancy?: () => void;
  isDownloading: boolean;
  credits: number;
}

export function TemplatePreview({
  docxBlob,
  fileName,
  onDownload,
  onBack,
  onNewVacancy,
  isDownloading,
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

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => onDownload('docx')}
              disabled={isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('downloading')}
                </>
              ) : (
                <>
                  <FileType className="mr-2 h-4 w-4" />
                  {t('downloadDocx')}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => onDownload('pdf')}
              disabled={isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('downloading')}
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {t('downloadPdf')}
                </>
              )}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('changeTemplate')}
            </Button>

            {onNewVacancy && (
              <Button variant="outline" onClick={onNewVacancy} className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('newVacancy')}
              </Button>
            )}
          </div>
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
