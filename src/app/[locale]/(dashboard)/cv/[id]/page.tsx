'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

function getVerdictConfig(verdict: FitVerdict) {
  switch (verdict) {
    case 'excellent':
      return {
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        label: 'Uitstekende match',
      };
    case 'good':
      return {
        color: 'text-blue-700 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: <CheckCircle2 className="h-5 w-5 text-blue-600" />,
        label: 'Goede match',
      };
    case 'moderate':
      return {
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
        label: 'Matige match',
      };
    case 'challenging':
      return {
        color: 'text-orange-700 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
        label: 'Uitdagende match',
      };
    case 'unlikely':
      return {
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        label: 'Onwaarschijnlijke match',
      };
    default:
      return {
        color: 'text-gray-700 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
        borderColor: 'border-gray-200 dark:border-gray-800',
        icon: <Info className="h-5 w-5 text-gray-600" />,
        label: 'Onbekend',
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

function FitAnalysisSection({ fitAnalysis, jobVacancy }: { fitAnalysis: FitAnalysis; jobVacancy?: Pick<import('@/types').JobVacancy, 'title' | 'company' | 'location'> | null }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const verdictConfig = getVerdictConfig(fitAnalysis.verdict);

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Sollicitatie-context
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
            </div>
          )}

          {/* Score and Verdict */}
          <div className={`rounded-lg border p-4 ${verdictConfig.bgColor} ${verdictConfig.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {verdictConfig.icon}
                <span className={`font-semibold ${verdictConfig.color}`}>
                  {verdictConfig.label}
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
              <span className="font-medium text-sm">Skills Match</span>
              <Badge variant="secondary">{fitAnalysis.skillMatch.matchPercentage}%</Badge>
            </div>
            <div className="grid gap-2 text-sm">
              {fitAnalysis.skillMatch.matched.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-green-600 font-medium mr-1">Gevonden:</span>
                  {fitAnalysis.skillMatch.matched.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-700 dark:bg-green-950">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {fitAnalysis.skillMatch.missing.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-red-600 font-medium mr-1">Ontbreken:</span>
                  {fitAnalysis.skillMatch.missing.map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-red-700 border-red-300 bg-red-50 dark:text-red-400 dark:border-red-700 dark:bg-red-950">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
              {fitAnalysis.skillMatch.bonus.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-blue-600 font-medium mr-1">Bonus:</span>
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
              <span className="font-medium text-sm">Ervaring</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>
                Jouw ervaring: <strong>{fitAnalysis.experienceMatch.candidateYears} jaar</strong>
              </span>
              <span>
                Vereist: <strong>{fitAnalysis.experienceMatch.requiredYears} jaar</strong>
              </span>
              {fitAnalysis.experienceMatch.gap !== 0 && (
                <Badge variant={fitAnalysis.experienceMatch.gap >= 0 ? 'secondary' : 'destructive'}>
                  {fitAnalysis.experienceMatch.gap >= 0 ? '+' : ''}{fitAnalysis.experienceMatch.gap} jaar
                </Badge>
              )}
            </div>
          </div>

          {/* Strengths */}
          {fitAnalysis.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Sterke Punten ({fitAnalysis.strengths.length})
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
                Aandachtspunten ({fitAnalysis.warnings.length})
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
                <p className="font-medium text-sm text-primary">Advies</p>
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

export default function CVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser, credits, refreshCredits } = useAuth();

  const [cv, setCV] = useState<(CV & { tokens?: CVDesignTokens }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cvId = params.id as string;

  // Handle saving element overrides
  const handleUpdateOverrides = async (overrides: CVElementOverrides) => {
    if (!firebaseUser || !cvId) return;

    setIsSaving(true);
    try {
      await updateCV(firebaseUser.uid, cvId, { elementOverrides: overrides });
      setCV(prev => prev ? { ...prev, elementOverrides: overrides } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    async function fetchCV() {
      if (firebaseUser && cvId) {
        const cvData = await getCV(firebaseUser.uid, cvId);
        setCV(cvData as CV & { tokens?: CVDesignTokens });
        setLoading(false);
      }
    }
    fetchCV();
  }, [firebaseUser, cvId]);

  const pdfDownloaded = cv?.status === 'pdf_ready';

  const handleDownload = async (pageMode: 'multi-page' | 'single-page' = 'multi-page') => {
    if (!cvId || (!pdfDownloaded && credits < 1)) return;

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
        throw new Error(result.error || 'Failed to generate PDF');
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDownloading(false);
    }
  };

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
          <span className="ml-2">CV not found</span>
        </Alert>
        <Link href="/cv">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CVs
          </Button>
        </Link>
      </div>
    );
  }

  // Get tokens - use stored tokens if available, convert from styleConfig, or use defaults
  let tokens: CVDesignTokens;
  if (cv.tokens) {
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
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {cv.linkedInData?.fullName || 'Untitled CV'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span>{cv.jobVacancy?.title || 'General CV'}</span>
              <span>•</span>
              <span>{tokens.styleName}</span>
              <span>•</span>
              <Badge variant="outline">{cv.status}</Badge>
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

      {!pdfDownloaded && credits < 1 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">
            You need at least 1 credit to download the PDF.{' '}
            <Link href="/credits" className="underline">
              Get more credits
            </Link>
          </span>
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
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>CV Details</CardTitle>
            <CardDescription>
              This CV has not been generated yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{cv.linkedInData.fullName}</p>
              </div>
              {cv.linkedInData.headline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Headline</p>
                  <p>{cv.linkedInData.headline}</p>
                </div>
              )}
              {cv.jobVacancy && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Target Job</p>
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
