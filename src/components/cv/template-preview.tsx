'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileText,
  FileType,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Download,
  Coins,
  Briefcase,
  MessageSquare,
} from 'lucide-react';
import { TemplateMotivationLetterSection } from './template-motivation-letter-section';
import { TemplateChatPanel } from './template-chat-panel';
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
  // Chat support
  templateId?: string;
  onRefillComplete?: (blob: Blob) => void;
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
  templateId,
  onRefillComplete,
}: TemplatePreviewProps) {
  const t = useTranslations('templatePreview');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(true);
  const [renderError, setRenderError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleContainerRef = useRef<HTMLDivElement>(null);

  // Render DOCX with docx-preview for full visual fidelity
  useEffect(() => {
    const renderDocx = async () => {
      if (!docxBlob || !containerRef.current) return;

      setIsExtracting(true);
      setRenderError(false);

      // Clear previous render
      containerRef.current.innerHTML = '';
      if (styleContainerRef.current) {
        styleContainerRef.current.innerHTML = '';
      }

      try {
        const { renderAsync } = await import('docx-preview');
        await renderAsync(docxBlob, containerRef.current, styleContainerRef.current ?? undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          className: 'docx-preview-wrapper',
        });
      } catch (err) {
        console.error('Failed to render DOCX preview:', err);
        setRenderError(true);
      } finally {
        setIsExtracting(false);
      }
    };

    renderDocx();
  }, [docxBlob]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            {/* Chat toggle button - only show if chat is supported */}
            {templateId && linkedInData && onRefillComplete && (
              <Button
                variant={isChatOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                {language === 'nl' ? 'Assistent' : 'Assistant'}
              </Button>
            )}
          </div>
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

          {/* Textual Preview */}
          <div
            className="relative rounded-lg border bg-white dark:bg-gray-900 overflow-hidden"
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {/* Watermark overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              <div
                className="absolute inset-0 flex flex-wrap justify-around content-around"
                style={{ transform: 'rotate(-30deg)', transformOrigin: 'center', width: '200%', height: '200%', left: '-50%', top: '-50%' }}
              >
                {Array(12).fill(null).map((_, i) => (
                  <span
                    key={i}
                    className="text-gray-300/20 dark:text-gray-600/20 text-2xl font-bold whitespace-nowrap px-12 py-8"
                    style={{ letterSpacing: '4px' }}
                  >
                    CVeetje PREVIEW
                  </span>
                ))}
              </div>
            </div>

            {/* Content Preview - Rendered by docx-preview */}
            <div
              className="max-h-[80vh] overflow-auto relative z-0"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {isExtracting && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    {language === 'nl' ? 'Document laden...' : 'Loading document...'}
                  </span>
                </div>
              )}
              {renderError && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'nl' ? 'Kon document niet laden' : 'Could not load document'}</p>
                </div>
              )}
              <div ref={styleContainerRef} className="hidden" />
              <div
                ref={containerRef}
                className="[&_.docx-preview-wrapper]:p-0 [&_.docx-preview-wrapper]:m-0 [&_.docx-preview-wrapper]:bg-transparent [&_.docx-wrapper]:shadow-none [&_.docx-wrapper]:mx-auto [&_.docx-wrapper]:my-2"
              />
            </div>
          </div>

          {/* Template file indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileType className="h-4 w-4" />
            <span>{fileName}</span>
            <Badge variant="outline" className="text-xs">DOCX</Badge>
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
              <Button
                disabled={credits < 1}
                className="flex-1"
                size="lg"
                onClick={() => onDownload('docx')}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('download')} (.docx)
                <Badge variant="secondary" className="ml-2">
                  <Coins className="h-3 w-3 mr-1" />1 credit
                </Badge>
              </Button>
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

      {/* Template Chat Panel */}
      {templateId && linkedInData && onRefillComplete && (
        <TemplateChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          templateId={templateId}
          linkedInData={linkedInData}
          jobVacancy={jobVacancy || null}
          fitAnalysis={fitAnalysis || null}
          language={language}
          onRefillComplete={onRefillComplete}
          onCreditsRefresh={onCreditsRefresh}
        />
      )}
    </div>
  );
}
