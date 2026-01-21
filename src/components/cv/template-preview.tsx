'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, FileType, Loader2, RefreshCw, ArrowLeft, Info, AlertTriangle, CheckCircle } from 'lucide-react';

interface TemplatePreviewProps {
  pdfBlob: Blob;
  fileName: string;
  onDownload: (format: 'pdf' | 'docx') => void;
  onBack: () => void;
  onNewVacancy?: () => void;
  isDownloading: boolean;
  credits: number;
  isDocxTemplate?: boolean;
}

export function TemplatePreview({
  pdfBlob,
  fileName,
  onDownload,
  onBack,
  onNewVacancy,
  isDownloading,
  credits,
  isDocxTemplate = true,
}: TemplatePreviewProps) {
  const t = useTranslations('templatePreview');

  // Create object URL for PDF preview
  const pdfUrl = useMemo(() => {
    return URL.createObjectURL(pdfBlob);
  }, [pdfBlob]);

  // Check if PDF is very small (likely empty or failed conversion)
  const isPdfSmall = pdfBlob.size < 5000; // Less than 5KB is suspicious

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

          {/* PDF Preview or fallback message */}
          {isPdfSmall ? (
            <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-400">{t('previewLimited')}</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {t('previewLimitedDesc')}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="relative rounded-lg border bg-muted/20 overflow-hidden">
              <embed
                src={pdfUrl}
                type="application/pdf"
                width="100%"
                height="800px"
                className="min-h-[600px]"
              />
            </div>
          )}

          {/* Info about original format */}
          {isDocxTemplate && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="ml-2">{t('docxInfo')}</AlertDescription>
            </Alert>
          )}

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {isDocxTemplate && (
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
            )}

            <Button
              variant={isDocxTemplate ? 'outline' : 'default'}
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
    </div>
  );
}
