'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Award,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Building2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CVPreview } from '@/components/cv/cv-preview';
import { useAuth } from '@/components/auth/auth-context';
import { getCV, updateCV } from '@/lib/firebase/firestore';
import { styleConfigToTokens } from '@/lib/cv/templates/adapter';
import { getDefaultTokens } from '@/lib/cv/html-generator';
import type { CV, GeneratedCVContent, CVStyleConfig, CVElementOverrides, FitAnalysis, FitVerdict, FitWarningSeverity } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { getStyleLabel } from '@/lib/cv-engine/dispatch';

function getVerdictConfig(verdict: FitVerdict) {
  switch (verdict) {
    case 'excellent':
      return {
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        labelKey: 'excellent',
      };
    case 'good':
      return {
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: <CheckCircle2 className="h-5 w-5 text-blue-600" />,
        labelKey: 'good',
      };
    case 'moderate':
      return {
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
        labelKey: 'moderate',
      };
    case 'challenging':
      return {
        color: 'text-orange-700 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        labelKey: 'challenging',
      };
    case 'unlikely':
      return {
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        labelKey: 'unlikely',
      };
    default:
      return {
        color: 'text-gray-700 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
        borderColor: 'border-gray-200 dark:border-gray-800',
        icon: <Info className="h-5 w-5 text-gray-600" />,
        labelKey: 'unknown',
      };
  }
}

function getSeverityConfig(severity: FitWarningSeverity) {
  switch (severity) {
    case 'critical':
      return {
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950',
        icon: <XCircle className="h-4 w-4 text-red-600" />,
      };
    case 'warning':
      return {
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      };
    case 'info':
      return {
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        icon: <Info className="h-4 w-4 text-blue-600" />,
      };
    default:
      return {
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        icon: <Info className="h-4 w-4 text-gray-600" />,
      };
  }
}

function FitAnalysisSection({ fitAnalysis, jobVacancy }: { fitAnalysis: FitAnalysis; jobVacancy?: Pick<import('@/types').JobVacancy, 'title' | 'company' | 'location' | 'sourceUrl'> | null }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const t = useTranslations('cvDetail');
  const tFit = useTranslations('fitAnalysis');
  const verdictConfig = getVerdictConfig(fitAnalysis.verdict);

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            {t('fitContextTitle')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={verdictConfig.color}>
              {fitAnalysis.overallScore}/100
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Vacancy info */}
          {jobVacancy && (jobVacancy.title || jobVacancy.company) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {jobVacancy.title && <span className="font-medium text-foreground">{jobVacancy.title}</span>}
              {jobVacancy.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {jobVacancy.company}
                </span>
              )}
              {jobVacancy.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {jobVacancy.location}
                </span>
              )}
              {jobVacancy.sourceUrl && (
                <a
                  href={jobVacancy.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('originalVacancy')}
                </a>
              )}
            </div>
          )}

          {/* Score and Verdict */}
          <div className={`rounded-lg border p-4 ${verdictConfig.bgColor} ${verdictConfig.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {verdictConfig.icon}
                <span className={`font-semibold ${verdictConfig.color}`}>
                  {t(`verdict.${verdictConfig.labelKey}`)}
                </span>
              </div>
              <Badge variant="outline" className={verdictConfig.color}>
                {fitAnalysis.overallScore}/100
              </Badge>
            </div>
            <Progress value={fitAnalysis.overallScore} className="h-2 mb-3" />
            <p className="text-sm text-muted-foreground">
              {fitAnalysis.verdictExplanation}
            </p>
          </div>

          {/* Skills Match */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{tFit('skillsMatch')}</span>
              <Badge variant="secondary">{fitAnalysis.skillMatch.matchPercentage}%</Badge>
            </div>
            <div className="grid gap-2 text-sm">
              {fitAnalysis.skillMatch.matched.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-green-600 font-medium mr-1">{tFit('matchedSkills')}:</span>
                  {fitAnalysis.skillMatch.matched.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-950">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {fitAnalysis.skillMatch.missing.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-red-600 font-medium mr-1">{tFit('missingSkills')}:</span>
                  {fitAnalysis.skillMatch.missing.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-700 dark:bg-red-950">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {fitAnalysis.skillMatch.bonus.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-blue-600 font-medium mr-1">{t('bonusSkills')}:</span>
                  {fitAnalysis.skillMatch.bonus.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:bg-blue-950">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Experience Match */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{tFit('experienceMatch')}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>
                {tFit('yourExperience')}: <strong>{fitAnalysis.experienceMatch.candidateYears} {tFit('years')}</strong>
              </span>
              <span>
                {tFit('required')}: <strong>{fitAnalysis.experienceMatch.requiredYears} {tFit('years')}</strong>
              </span>
              {fitAnalysis.experienceMatch.gap !== 0 && (
                <Badge variant={fitAnalysis.experienceMatch.gap >= 0 ? 'secondary' : 'destructive'}>
                  {fitAnalysis.experienceMatch.gap >= 0 ? '+' : ''}{fitAnalysis.experienceMatch.gap} {tFit('years')}
                </Badge>
              )}
            </div>
          </div>

          {/* Strengths */}
          {fitAnalysis.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {tFit('strengths')} ({fitAnalysis.strengths.length})
              </div>
              <div className="space-y-2">
                {fitAnalysis.strengths.slice(0, 3).map((strength, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                  >
                    <p className="font-medium text-sm text-green-700 dark:text-green-400">
                      {strength.message}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {strength.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {fitAnalysis.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                {tFit('warnings')} ({fitAnalysis.warnings.length})
              </div>
              <div className="space-y-2">
                {fitAnalysis.warnings.map((warning, i) => {
                  const config = getSeverityConfig(warning.severity);
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-3 ${config.bgColor} border`}
                    >
                      <div className="flex items-start gap-2">
                        {config.icon}
                        <div>
                          <p className={`font-medium text-sm ${config.color}`}>
                            {warning.message}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {warning.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advice */}
          <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-primary">{tFit('advice')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {fitAnalysis.advice}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const STATUS_KEY: Record<string, string> = {
  pdf_ready: 'ready',
  generated: 'generated',
  generating: 'generating',
  failed: 'failed',
  draft: 'draft',
};

export default function CVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tDashboard = useTranslations('dashboard');
  const t = useTranslations('cvDetail');
  const { firebaseUser, effectiveUserId, credits, refreshCredits } = useAuth();

  const [cv, setCV] = useState<(CV & { tokens?: CVDesignTokens }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cvId = params.id as string;

  // Handle saving element overrides
  const handleUpdateOverrides = async (overrides: CVElementOverrides) => {
    if (!effectiveUserId || !cvId) return;

    setIsSaving(true);
    try {
      await updateCV(effectiveUserId, cvId, { elementOverrides: overrides });
      setCV(prev => prev ? { ...prev, elementOverrides: overrides } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const fetchCV = useCallback(async () => {
    if (!effectiveUserId || !cvId) return;
    // Bug-fix: zonder try/finally bleef de spinner eeuwig draaien als getCV faalde.
    try {
      const cvData = await getCV(effectiveUserId, cvId);
      setCV(cvData as CV & { tokens?: CVDesignTokens });
    } catch (err) {
      console.error('[cv/[id]] getCV failed:', err);
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, cvId, t]);

  useEffect(() => {
    fetchCV();
  }, [fetchCV]);

  const pdfDownloaded = cv?.status === 'pdf_ready';


  const handleDownload = async (pageMode: 'multi-page' | 'single-page' = 'multi-page') => {
    if (!cvId) return; // PDF-download is gratis

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageMode }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || t('errors.pdfFailed'));
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv-${cv?.linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Refresh credits
      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsDownloading(false);
    }
  };

  // "Download PDF" vanuit de CV-lijst linkt naar ?download=true; die
  // parameter werd nergens afgehandeld.
  const autoDownloadDone = useRef(false);
  useEffect(() => {
    if (!cv || autoDownloadDone.current || searchParams?.get('download') !== 'true') return;
    autoDownloadDone.current = true;
    void handleDownload('multi-page');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cv, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{t('notFound')}</span>
        </Alert>
        <Link href="/cv">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToCvs')}
          </Button>
        </Link>
      </div>
    );
  }

  // Get tokens — prefer the doc's `designTokens` (v1 or v2 shape). The
  // dispatcher in renderCV handles both shapes; CVPreview's internal v1/v2
  // gates do the same. Fall back to a converted styleConfig (very legacy
  // docs) or to v1 defaults so the page never crashes on a missing field.
  let tokens: CVDesignTokens;
  if (cv.designTokens) {
    tokens = cv.designTokens as CVDesignTokens;
  } else if (cv.tokens) {
    tokens = cv.tokens;
  } else if (cv.styleConfig) {
    tokens = styleConfigToTokens(cv.styleConfig as CVStyleConfig);
  } else {
    tokens = getDefaultTokens();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-4">
          <Link href="/cv">
            <Button variant="ghost" size="icon" aria-label={t('backToCvs')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {cv.linkedInData?.fullName || tDashboard('recentCvs.untitled')}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span>{cv.jobVacancy?.title || tDashboard('recentCvs.generalCv')}</span>
              {getStyleLabel(tokens) && (
                <>
                  <span aria-hidden="true">•</span>
                  <span>{getStyleLabel(tokens)}</span>
                </>
              )}
              <span aria-hidden="true">•</span>
              <Badge variant="outline">{tDashboard(`status.${STATUS_KEY[cv.status] ?? 'draft'}`)}</Badge>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}


      {/* Fit Analysis Context */}
      {cv.fitAnalysis && (
        <FitAnalysisSection fitAnalysis={cv.fitAnalysis} jobVacancy={cv.jobVacancy} />
      )}

      {/* CV Content */}
      {cv.generatedContent ? (
        <CVPreview
          content={cv.generatedContent as GeneratedCVContent}
          tokens={tokens}
          originalDesignTokens={cv.originalDesignTokens ?? cv.designTokens ?? null}
          fullName={cv.linkedInData.fullName}
          headline={(cv.generatedContent as GeneratedCVContent).headline ?? cv.linkedInData.headline}
          avatarUrl={cv.avatarUrl}
          contactInfo={{
            email: cv.linkedInData.email,
            phone: cv.linkedInData.phone,
            location: cv.linkedInData.location || undefined,
            linkedinUrl: cv.linkedInData.linkedinUrl,
            website: cv.linkedInData.website,
            github: cv.linkedInData.github,
            birthDate: cv.linkedInData.birthDate,
          }}
          jobVacancy={cv.jobVacancy}
          cvId={cvId}
          language={cv.language || 'nl'}
          onDownload={handleDownload}
          onRegenerate={() => router.push('/cv/new')}
          onCreditsRefresh={refreshCredits}
          isDownloading={isDownloading}
          isRegenerating={false}
          credits={credits}
          pdfDownloaded={pdfDownloaded}
          elementOverrides={cv.elementOverrides}
          onUpdateOverrides={handleUpdateOverrides}
          disputeCount={cv.disputeCount ?? 0}
          currentCreativityLevel={cv.creativityLevel ?? 'balanced'}
          onDisputeApproved={fetchCV}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('details.title')}</CardTitle>
            <CardDescription>
              {t('details.notGenerated')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('details.name')}</p>
                <p>{cv.linkedInData.fullName}</p>
              </div>
              {cv.linkedInData.headline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('details.headline')}</p>
                  <p>{cv.linkedInData.headline}</p>
                </div>
              )}
              {cv.jobVacancy && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('details.targetJob')}</p>
                  <p>{cv.jobVacancy.title}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
