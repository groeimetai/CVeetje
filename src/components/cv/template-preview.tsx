'use client';

import { useState } from 'react';
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
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  GraduationCap,
  Award,
  Globe,
  Linkedin,
  Github,
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

  const labels = {
    nl: {
      personalInfo: 'Persoonlijke Gegevens',
      experience: 'Werkervaring',
      education: 'Opleiding',
      skills: 'Vaardigheden',
      languages: 'Talen',
      summary: 'Samenvatting',
      present: 'Heden',
      targetJob: 'Doelfunctie',
      fitScore: 'Match Score',
    },
    en: {
      personalInfo: 'Personal Information',
      experience: 'Work Experience',
      education: 'Education',
      skills: 'Skills',
      languages: 'Languages',
      summary: 'Summary',
      present: 'Present',
      targetJob: 'Target Position',
      fitScore: 'Fit Score',
    },
  };

  const l = labels[language];

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

            {/* Content Preview */}
            <div
              className="p-6 space-y-6 max-h-[700px] overflow-auto relative z-0"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {linkedInData ? (
                <>
                  {/* Personal Info Section */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                      <User className="h-5 w-5" />
                      {l.personalInfo}
                    </h3>
                    <div className="space-y-2">
                      <p className="text-xl font-bold">{linkedInData.fullName}</p>
                      {linkedInData.headline && (
                        <p className="text-muted-foreground">{linkedInData.headline}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                        {linkedInData.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {linkedInData.email}
                          </span>
                        )}
                        {linkedInData.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {linkedInData.phone}
                          </span>
                        )}
                        {linkedInData.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {linkedInData.location}
                          </span>
                        )}
                        {linkedInData.linkedinUrl && (
                          <span className="flex items-center gap-1">
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </span>
                        )}
                        {linkedInData.github && (
                          <span className="flex items-center gap-1">
                            <Github className="h-4 w-4" />
                            GitHub
                          </span>
                        )}
                        {linkedInData.website && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-4 w-4" />
                            Website
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Target Job & Fit Score */}
                  {jobVacancy && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                        <Briefcase className="h-5 w-5" />
                        {l.targetJob}
                      </h3>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{jobVacancy.title}</p>
                          {jobVacancy.company && (
                            <p className="text-sm text-muted-foreground">{jobVacancy.company}</p>
                          )}
                        </div>
                        {fitAnalysis && (
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {l.fitScore}: {fitAnalysis.overallScore}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {linkedInData.about && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold text-lg mb-3 text-primary">{l.summary}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {linkedInData.about.length > 500
                          ? linkedInData.about.substring(0, 500) + '...'
                          : linkedInData.about}
                      </p>
                    </div>
                  )}

                  {/* Experience */}
                  {linkedInData.experience && linkedInData.experience.length > 0 && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                        <Building2 className="h-5 w-5" />
                        {l.experience}
                      </h3>
                      <div className="space-y-4">
                        {linkedInData.experience.slice(0, 5).map((exp, idx) => (
                          <div key={idx} className="border-l-2 border-primary/30 pl-4">
                            <p className="font-medium">{exp.title}</p>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground">
                              {exp.startDate} - {exp.endDate || l.present}
                              {exp.location && ` • ${exp.location}`}
                            </p>
                            {exp.description && (
                              <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                        {linkedInData.experience.length > 5 && (
                          <p className="text-sm text-muted-foreground italic">
                            +{linkedInData.experience.length - 5} {language === 'nl' ? 'meer ervaringen' : 'more experiences'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {linkedInData.education && linkedInData.education.length > 0 && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                        <GraduationCap className="h-5 w-5" />
                        {l.education}
                      </h3>
                      <div className="space-y-3">
                        {linkedInData.education.slice(0, 3).map((edu, idx) => (
                          <div key={idx} className="border-l-2 border-primary/30 pl-4">
                            <p className="font-medium">{edu.school}</p>
                            {(edu.degree || edu.fieldOfStudy) && (
                              <p className="text-sm text-muted-foreground">
                                {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' - ')}
                              </p>
                            )}
                            {(edu.startYear || edu.endYear) && (
                              <p className="text-xs text-muted-foreground">
                                {edu.startYear} - {edu.endYear || l.present}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {linkedInData.skills && linkedInData.skills.length > 0 && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                        <Award className="h-5 w-5" />
                        {l.skills}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {linkedInData.skills.slice(0, 15).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill.name}
                          </Badge>
                        ))}
                        {linkedInData.skills.length > 15 && (
                          <Badge variant="outline" className="text-xs">
                            +{linkedInData.skills.length - 15}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {linkedInData.languages && linkedInData.languages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-primary">
                        <Globe className="h-5 w-5" />
                        {l.languages}
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {linkedInData.languages.map((lang, idx) => (
                          <span key={idx} className="text-sm">
                            <span className="font-medium">{lang.language}</span>
                            {lang.proficiency && (
                              <span className="text-muted-foreground"> ({lang.proficiency})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{language === 'nl' ? 'Geen profielgegevens beschikbaar' : 'No profile data available'}</p>
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
