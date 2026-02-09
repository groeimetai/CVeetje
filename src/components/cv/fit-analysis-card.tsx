'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target,
  TrendingUp,
  Award,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-context';
import type { FitAnalysis, FitVerdict, FitWarningSeverity, ParsedLinkedIn, JobVacancy, TokenUsage } from '@/types';

interface FitAnalysisCardProps {
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy;
  onContinue: () => void;
  onChangeJob: () => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  onAnalysisComplete?: (analysis: FitAnalysis) => void;
}

// Helper functions for colors and icons
function getVerdictConfig(verdict: FitVerdict): {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
} {
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

function getSeverityConfig(severity: FitWarningSeverity): {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
} {
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

export function FitAnalysisCard({
  linkedInData,
  jobVacancy,
  onContinue,
  onChangeJob,
  onTokenUsage,
  onAnalysisComplete,
}: FitAnalysisCardProps) {
  const t = useTranslations('fitAnalysis');
  const { llmMode } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FitAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmProceed, setConfirmProceed] = useState(false);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cv/fit-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedInData, jobVacancy }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kon fit-analyse niet uitvoeren');
      }

      if (result.success && result.analysis) {
        setAnalysis(result.analysis);
        if (onAnalysisComplete) {
          onAnalysisComplete(result.analysis);
        }
        if (result.usage && onTokenUsage) {
          onTokenUsage(result.usage);
        }
      } else {
        throw new Error(result.error || 'Analyse mislukt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    // If unlikely/challenging, ask for confirmation
    if (analysis && (analysis.verdict === 'unlikely' || analysis.verdict === 'challenging') && !confirmProceed) {
      setConfirmProceed(true);
      return;
    }
    onContinue();
  };

  // Initial state: show button to start analysis
  if (!analysis && !isLoading && !error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {t('beforeAnalysis')}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={runAnalysis} className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('analyzeButton')}
              {llmMode === 'platform' && (
                <Badge variant="secondary" className="ml-1">
                  <Coins className="h-3 w-3 mr-1" />1 credit
                </Badge>
              )}
            </Button>
            <Button variant="outline" onClick={onContinue}>
              {t('skipButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('analyzing')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={runAnalysis} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {t('retryButton')}
              {llmMode === 'platform' && (
                <Badge variant="secondary" className="ml-1">
                  <Coins className="h-3 w-3 mr-1" />1 credit
                </Badge>
              )}
            </Button>
            <Button onClick={onContinue}>
              {t('continueAnywayButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Analysis result
  if (analysis) {
    const verdictConfig = getVerdictConfig(analysis.verdict);
    const hasCriticalWarnings = analysis.warnings.some(w => w.severity === 'critical');

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                {analysis.overallScore}/100
              </Badge>
            </div>

            <Progress value={analysis.overallScore} className="h-2 mb-3" />

            <p className="text-sm text-muted-foreground">
              {analysis.verdictExplanation}
            </p>
          </div>

          {/* Skills Match Summary */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('skillsMatch')}</span>
              <Badge variant="secondary">{analysis.skillMatch.matchPercentage}%</Badge>
            </div>

            <div className="grid gap-2 text-sm">
              {analysis.skillMatch.matched.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-green-600 font-medium mr-1">{t('matchedSkills')}:</span>
                  {analysis.skillMatch.matched.slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-green-700 border-green-300 bg-green-50">
                      {skill}
                    </Badge>
                  ))}
                  {analysis.skillMatch.matched.length > 5 && (
                    <Badge variant="outline">+{analysis.skillMatch.matched.length - 5}</Badge>
                  )}
                </div>
              )}

              {analysis.skillMatch.missing.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-red-600 font-medium mr-1">{t('missingSkills')}:</span>
                  {analysis.skillMatch.missing.slice(0, 5).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-red-700 border-red-300 bg-red-50">
                      {skill}
                    </Badge>
                  ))}
                  {analysis.skillMatch.missing.length > 5 && (
                    <Badge variant="outline">+{analysis.skillMatch.missing.length - 5}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Experience Match */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('experienceMatch')}</span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span>
                {t('yourExperience')}: <strong>{analysis.experienceMatch.candidateYears} {t('years')}</strong>
              </span>
              <span>
                {t('required')}: <strong>{analysis.experienceMatch.requiredYears} {t('years')}</strong>
              </span>
              {analysis.experienceMatch.gap !== 0 && (
                <Badge variant={analysis.experienceMatch.gap >= 0 ? 'secondary' : 'destructive'}>
                  {analysis.experienceMatch.gap >= 0 ? '+' : ''}{analysis.experienceMatch.gap} {t('years')}
                </Badge>
              )}
            </div>
          </div>

          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                {t('warnings')} ({analysis.warnings.length})
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showDetails && (
                <div className="space-y-2">
                  {analysis.warnings.map((warning, i) => {
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
              )}
            </div>
          )}

          {/* Strengths */}
          {analysis.strengths.length > 0 && showDetails && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {t('strengths')} ({analysis.strengths.length})
              </div>
              <div className="space-y-2">
                {analysis.strengths.map((strength, i) => (
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

          {/* Advice */}
          <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm text-primary">{t('advice')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysis.advice}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation for challenging/unlikely */}
          {confirmProceed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('confirmProceedWarning')}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleContinue} className="gap-2">
              {confirmProceed ? t('yesConfirmButton') : t('continueButton')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onChangeJob}>
              {t('changeJobButton')}
            </Button>
            {hasCriticalWarnings && !confirmProceed && (
              <p className="text-xs text-muted-foreground self-center ml-2">
                {t('criticalWarningsNote')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
