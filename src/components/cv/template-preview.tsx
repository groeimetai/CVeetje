'use client';

import { useState, useEffect } from 'react';
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
  ArrowLeft,
  CheckCircle,
  Download,
  ChevronDown,
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
  const [extractedHtml, setExtractedHtml] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(true);

  // Extract HTML from DOCX blob for preview
  useEffect(() => {
    const extractContent = async () => {
      if (!docxBlob) return;

      setIsExtracting(true);
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await docxBlob.arrayBuffer();
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Kop 1'] => h1:fresh",
              "p[style-name='Kop 2'] => h2:fresh",
              "p[style-name='Kop 3'] => h3:fresh",
              "p[style-name='Hoofdtekst'] => p:fresh",
              "p[style-name='Body Text'] => p:fresh",
              "p[style-name='Standaard'] => p:fresh",
              "p[style-name='Normal'] => p:fresh",
              "p[style-name='List Paragraph'] => li:fresh",
              "p[style-name='Lijstalinea'] => li:fresh",
              "r[style-name='Strong'] => strong",
              "r[style-name='Emphasis'] => em",
              "r[style-name='Vet'] => strong",
              "r[style-name='Cursief'] => em",
            ],
            ignoreEmptyParagraphs: false,
          }
        );
        setExtractedHtml(result.value);
      } catch (err) {
        console.error('Failed to extract content from DOCX:', err);
        setExtractedHtml(null);
      } finally {
        setIsExtracting(false);
      }
    };

    extractContent();
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

            {/* Content Preview - Shows actual DOCX content */}
            <div
              className="p-6 max-h-[700px] overflow-auto relative z-0"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {isExtracting ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">
                    {language === 'nl' ? 'Document laden...' : 'Loading document...'}
                  </span>
                </div>
              ) : extractedHtml ? (
                <div
                  className="font-sans text-sm leading-relaxed text-foreground max-w-none [&_p]:mb-1 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-1 [&_p:empty]:h-2"
                  dangerouslySetInnerHTML={{ __html: extractedHtml }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'nl' ? 'Kon document niet laden' : 'Could not load document'}</p>
                </div>
              )}
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
