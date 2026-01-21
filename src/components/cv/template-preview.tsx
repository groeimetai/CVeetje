'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Download, FileText, FileType, Loader2, RefreshCw, ArrowLeft, Info } from 'lucide-react';

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
  const tCommon = useTranslations('common');

  // Create object URL for PDF preview
  const pdfUrl = useMemo(() => {
    return URL.createObjectURL(pdfBlob);
  }, [pdfBlob]);

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
          {/* PDF Preview */}
          <div className="relative rounded-lg border bg-muted/20 overflow-hidden">
            <embed
              src={pdfUrl}
              type="application/pdf"
              width="100%"
              height="800px"
              className="min-h-[600px]"
            />
          </div>

          {/* Info about original format */}
          {isDocxTemplate && (
            <Alert>
              <Info className="h-4 w-4" />
              <span className="ml-2">{t('docxInfo')}</span>
            </Alert>
          )}

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
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

            {isDocxTemplate && (
              <Button
                variant="outline"
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
