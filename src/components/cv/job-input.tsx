'use client';

import { useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Plus, Briefcase, Sparkles, CheckCircle, Pencil, ArrowLeft, Loader2, Building2, MapPin, Clock, Euro, ChevronDown, ChevronUp, Gift, TrendingUp, Target, AlertCircle, ExternalLink, Link2 } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-context';
import type { JobVacancy, JobCompensation, SalaryEstimate, TokenUsage } from '@/types';
import { CreditBadge } from '@/components/cv/credit-badge';

type Mode = 'input' | 'preview' | 'edit';

function createEditSchema(messages: { titleRequired: string; descriptionRequired: string }) {
  return z.object({
    title: z.string().min(2, messages.titleRequired),
    company: z.string().optional(),
    description: z.string().min(20, messages.descriptionRequired),
    industry: z.string().optional(),
    location: z.string().optional(),
    employmentType: z.string().optional(),
  });
}

type EditFormData = z.infer<ReturnType<typeof createEditSchema>>;

interface JobInputProps {
  onSubmit: (data: JobVacancy | null) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  onCreditsRefresh?: () => void;
  initialData?: JobVacancy | null;
  /**
   * Optional hint about how the prefilled job arrived. For Adzuna deeplinks the
   * description is a short snippet and the user benefits from pasting the full
   * vacancy text from the employer site.
   */
  sourceHint?: {
    provider: 'adzuna';
    externalUrl: string;
  } | null;
}

export function JobInput({
  onSubmit,
  onTokenUsage,
  onCreditsRefresh,
  initialData,
  sourceHint,
}: JobInputProps) {
  const t = useTranslations('jobInput');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const editSchema = useMemo(
    () => createEditSchema({
      titleRequired: t('errors.titleRequired'),
      descriptionRequired: t('errors.descriptionRequired'),
    }),
    [t]
  );
  const { llmMode } = useAuth();
  const [mode, setMode] = useState<Mode>(initialData ? 'preview' : 'input');
  const [rawText, setRawText] = useState(initialData?.rawText || '');
  const [sourceUrl, setSourceUrl] = useState<string>(initialData?.sourceUrl ?? sourceHint?.externalUrl ?? '');
  const [parsedJob, setParsedJob] = useState<JobVacancy | null>(initialData || null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<string[]>(initialData?.requirements || []);
  const [keywords, setKeywords] = useState<string[]>(initialData?.keywords || []);
  const [newRequirement, setNewRequirement] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [showCompensation, setShowCompensation] = useState(!!initialData?.compensation);
  const [compensation, setCompensation] = useState<JobCompensation>(initialData?.compensation || {});
  const [newBenefit, setNewBenefit] = useState('');
  const [showSalaryEstimate, setShowSalaryEstimate] = useState(!!initialData?.salaryEstimate);
  const [salaryEstimate, setSalaryEstimate] = useState<SalaryEstimate | undefined>(initialData?.salaryEstimate);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: initialData?.title || '',
      company: initialData?.company || '',
      description: initialData?.description || '',
      industry: initialData?.industry || '',
      location: initialData?.location || '',
      employmentType: initialData?.employmentType || '',
    },
  });

  const handleParse = async () => {
    if (!rawText.trim() || rawText.trim().length < 50) {
      setError(t('errors.textTooShort'));
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const trimmedSourceUrl = sourceUrl.trim();
      const response = await fetch('/api/cv/job/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          sourceUrl: trimmedSourceUrl || sourceHint?.externalUrl || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.couldNotAnalyze'));
      }

      const job = result.data as JobVacancy;

      // Report token usage if available
      if (result.usage && onTokenUsage) {
        onTokenUsage(result.usage);
      }

      onCreditsRefresh?.();
      setParsedJob(job);
      setRequirements(job.requirements || []);
      setKeywords(job.keywords || []);

      // Set compensation from parsed data
      if (job.compensation) {
        setCompensation(job.compensation);
        setShowCompensation(true);
      }

      // Set salary estimate from parsed data
      if (job.salaryEstimate) {
        setSalaryEstimate(job.salaryEstimate);
        setShowSalaryEstimate(true);
      }

      // Update form values for edit mode
      setValue('title', job.title);
      setValue('company', job.company || '');
      setValue('description', job.description);
      setValue('industry', job.industry || '');
      setValue('location', job.location || '');
      setValue('employmentType', job.employmentType || '');

      setMode('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWentWrong'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleEditSave = (data: EditFormData) => {
    // Only include compensation if it has meaningful data
    const hasCompensation = compensation.salaryMin || compensation.salaryMax ||
      (compensation.benefits && compensation.benefits.length > 0) ||
      compensation.bonusInfo || compensation.notes;

    const updatedJob: JobVacancy = {
      title: data.title,
      company: data.company || null,
      description: data.description,
      requirements,
      keywords,
      industry: data.industry || undefined,
      location: data.location || undefined,
      employmentType: data.employmentType || undefined,
      rawText: parsedJob?.rawText || rawText,
      sourceUrl: sourceUrl.trim() || parsedJob?.sourceUrl || null,
      compensation: hasCompensation ? compensation : undefined,
    };
    setParsedJob(updatedJob);
    setMode('preview');
  };

  const handleContinue = () => {
    if (parsedJob) {
      // Only include compensation if it has meaningful data
      const hasCompensation = compensation.salaryMin || compensation.salaryMax ||
        (compensation.benefits && compensation.benefits.length > 0) ||
        compensation.bonusInfo || compensation.notes;

      onSubmit({
        ...parsedJob,
        requirements,
        keywords,
        compensation: hasCompensation ? compensation : undefined,
        sourceUrl: sourceUrl.trim() || parsedJob.sourceUrl || null,
      });
    }
  };

  const handleSkip = () => {
    onSubmit(null);
  };

  const handleStartOver = () => {
    setMode('input');
    setRawText('');
    setParsedJob(null);
    setRequirements([]);
    setKeywords([]);
    setCompensation({});
    setShowCompensation(false);
    setSalaryEstimate(undefined);
    setShowSalaryEstimate(false);
    setNewBenefit('');
    setError(null);
    reset();
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setRequirements([...requirements, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setCompensation(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setCompensation(prev => ({
      ...prev,
      benefits: (prev.benefits || []).filter((_, i) => i !== index),
    }));
  };

  const formatSalary = (min?: number, max?: number, currency?: string, period?: string) => {
    if (!min && !max) return null;
    const curr = currency || 'EUR';
    const per = t(
      period === 'monthly'
        ? 'salary.periodSuffix.monthly'
        : period === 'hourly'
          ? 'salary.periodSuffix.hourly'
          : 'salary.periodSuffix.yearly'
    );
    if (min && max) {
      return t('salary.range', { currency: curr, min: format.number(min), max: format.number(max), period: per });
    }
    if (min) return t('salary.from', { currency: curr, min: format.number(min), period: per });
    if (max) return t('salary.to', { currency: curr, max: format.number(max), period: per });
    return null;
  };

  // INPUT MODE: Paste vacancy text
  if (mode === 'input') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vacancy-url" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              {t('urlLabel')}
            </Label>
            <Input
              id="vacancy-url"
              type="url"
              inputMode="url"
              placeholder="https://www.linkedin.com/jobs/view/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t('urlHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vacancy-text">{t('pasteVacancy')}</Label>
            <Textarea
              id="vacancy-text"
              placeholder={t('vacancyPlaceholder')}
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t('pasteHint')}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={isParsing || rawText.trim().length < 50}
              className="gap-2"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('analyzing')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t('analyze')}
                  {llmMode === 'platform' && (
                    <CreditBadge operation="job-parse" />
                  )}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleSkip}>
              {t('skipVacancy')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PREVIEW MODE: Show parsed results
  if (mode === 'preview' && parsedJob) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {t('preview.title')}
              </CardTitle>
              <CardDescription>
                {t('preview.description')}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleStartOver} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              {t('preview.startOver')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sourceHint?.provider === 'adzuna' &&
            (parsedJob.description?.length ?? 0) < 600 && (
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="space-y-2">
                  <p className="text-sm font-medium">
                    {t('adzuna.title')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('adzuna.body')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sourceHint.externalUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={sourceHint.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('adzuna.openSite')}
                        </a>
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setMode('input')}>
                      {t('adzuna.pasteFull')}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

          {/* Main info */}
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{parsedJob.title}</h3>
              {parsedJob.company && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {parsedJob.company}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {parsedJob.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {parsedJob.location}
                </span>
              )}
              {parsedJob.employmentType && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {parsedJob.employmentType}
                </span>
              )}
              {parsedJob.sourceUrl && (
                <a
                  href={parsedJob.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('preview.originalVacancy')}
                </a>
              )}
              {parsedJob.industry && (
                <Badge variant="secondary">{parsedJob.industry}</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">{t('preview.summary')}</Label>
            <p className="text-sm text-muted-foreground">{parsedJob.description}</p>
          </div>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('parsed.requirements')}</Label>
              <ul className="space-y-1">
                {requirements.map((req, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span className="flex-1">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={t('removeRequirement')}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('parsed.keywords')}</Label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(i)}
                      className="hover:text-destructive"
                      aria-label={t('removeKeyword')}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Salary Estimate Section (AI Analysis) */}
          {salaryEstimate && (
            <div className="border rounded-lg border-primary/20 bg-primary/5">
              <button
                type="button"
                onClick={() => setShowSalaryEstimate(!showSalaryEstimate)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{t('salary.aiEstimate')}</span>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {salaryEstimate.confidence === 'high' ? t('parsed.salaryConfidence.high') :
                     salaryEstimate.confidence === 'medium' ? t('parsed.salaryConfidence.medium') : t('parsed.salaryConfidence.low')}
                  </Badge>
                </div>
                {showSalaryEstimate ? (
                  <ChevronUp className="h-4 w-4 text-primary" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-primary" />
                )}
              </button>

              {showSalaryEstimate && (
                <div className="px-4 pb-4 space-y-4 border-t border-primary/20">
                  {/* Salary Range */}
                  <div className="pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-lg">
                        €{format.number(salaryEstimate.estimatedMin)} - €{format.number(salaryEstimate.estimatedMax)}
                      </span>
                      <span className="text-sm text-muted-foreground">{t('salary.perYear')}</span>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {t('salary.level', { level: salaryEstimate.experienceLevel })}
                    </Badge>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t('salary.reasoning')}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{salaryEstimate.reasoning}</p>
                  </div>

                  {/* Market Insight */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {t('salary.marketInsight')}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{salaryEstimate.marketInsight}</p>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    {t('salary.disclaimer')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Compensation Section (Collapsible) */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowCompensation(!showCompensation)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{t('compensation.title')}</span>
                {(compensation.salaryMin || compensation.salaryMax || (compensation.benefits && compensation.benefits.length > 0)) && (
                  <Badge variant="secondary" className="text-xs">{t('compensation.filled')}</Badge>
                )}
              </div>
              {showCompensation ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showCompensation && (
              <div className="px-4 pb-4 space-y-3 border-t">
                {/* Salary display */}
                {(compensation.salaryMin || compensation.salaryMax) && (
                  <div className="pt-3">
                    <Label className="text-sm font-medium">{t('compensation.salary')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatSalary(compensation.salaryMin, compensation.salaryMax, compensation.salaryCurrency, compensation.salaryPeriod)}
                    </p>
                  </div>
                )}

                {/* Benefits display */}
                {compensation.benefits && compensation.benefits.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">{t('compensation.benefits')}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {compensation.benefits.map((benefit, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          <Gift className="h-3 w-3" />
                          {benefit}
                          <button
                            type="button"
                            onClick={() => removeBenefit(i)}
                            className="hover:text-destructive"
                            aria-label={t('removeBenefit')}
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bonus info */}
                {compensation.bonusInfo && (
                  <div>
                    <Label className="text-sm font-medium">{t('compensation.bonus')}</Label>
                    <p className="text-sm text-muted-foreground">{compensation.bonusInfo}</p>
                  </div>
                )}

                {/* Notes */}
                {compensation.notes && (
                  <div>
                    <Label className="text-sm font-medium">{t('compensation.notes')}</Label>
                    <p className="text-sm text-muted-foreground">{compensation.notes}</p>
                  </div>
                )}

                {/* If nothing filled yet, show input fields */}
                {!compensation.salaryMin && !compensation.salaryMax && (!compensation.benefits || compensation.benefits.length === 0) && (
                  <p className="text-sm text-muted-foreground pt-3 italic">
                    {t('compensation.emptyHint')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleContinue}>{t('continueWithJob')}</Button>
            <Button variant="outline" onClick={() => setMode('edit')} className="gap-1">
              <Pencil className="h-4 w-4" />
              {tCommon('edit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // EDIT MODE: Manual adjustments
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {t('edit.title')}
            </CardTitle>
            <CardDescription>
              {t('edit.description')}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('preview')} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            {tCommon('back')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleEditSave)} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">{t('edit.titleLabel')}</Label>
              <Input
                id="title"
                placeholder={t('edit.titlePlaceholder')}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">{t('parsed.company')}</Label>
              <Input
                id="company"
                placeholder={t('edit.companyPlaceholder')}
                {...register('company')}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location">{t('parsed.location')}</Label>
              <Input
                id="location"
                placeholder={t('edit.locationPlaceholder')}
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">{t('edit.employmentType')}</Label>
              <Input
                id="employmentType"
                placeholder={t('edit.employmentTypePlaceholder')}
                {...register('employmentType')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">{t('edit.industry')}</Label>
              <Input
                id="industry"
                placeholder={t('edit.industryPlaceholder')}
                {...register('industry')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('edit.descriptionLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('edit.descriptionPlaceholder')}
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label>{t('parsed.requirements')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('edit.requirementPlaceholder')}
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" variant="outline" onClick={addRequirement} aria-label={t('parsed.addRequirement')}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {requirements.length > 0 && (
              <ul className="space-y-1 mt-2">
                {requirements.map((req, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">{req}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRequirement(i)}
                      aria-label={t('removeRequirement')}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>{t('parsed.keywords')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('edit.keywordPlaceholder')}
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" variant="outline" onClick={addKeyword} aria-label={t('parsed.addKeyword')}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(i)}
                      className="hover:text-destructive"
                      aria-label={t('removeKeyword')}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Compensation Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium">{t('compensation.editTitle')}</Label>
            </div>

            {/* Salary Range */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin" className="text-sm">{t('compensation.salaryMin')}</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="60000"
                  value={compensation.salaryMin || ''}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    salaryMin: e.target.value ? parseInt(e.target.value) : undefined,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax" className="text-sm">{t('compensation.salaryMax')}</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="80000"
                  value={compensation.salaryMax || ''}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    salaryMax: e.target.value ? parseInt(e.target.value) : undefined,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryCurrency" className="text-sm">{t('compensation.currency')}</Label>
                <select
                  id="salaryCurrency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={compensation.salaryCurrency || 'EUR'}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    salaryCurrency: e.target.value,
                  }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryPeriod" className="text-sm">{t('compensation.period')}</Label>
                <select
                  id="salaryPeriod"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={compensation.salaryPeriod || 'yearly'}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    salaryPeriod: e.target.value as 'yearly' | 'monthly' | 'hourly',
                  }))}
                >
                  <option value="yearly">{t('compensation.perYear')}</option>
                  <option value="monthly">{t('compensation.perMonth')}</option>
                  <option value="hourly">{t('compensation.perHour')}</option>
                </select>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label className="text-sm">{t('compensation.benefits')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('compensation.benefitPlaceholder')}
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                />
                <Button type="button" variant="outline" onClick={addBenefit} aria-label={t('parsed.addBenefit')}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              {compensation.benefits && compensation.benefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {compensation.benefits.map((benefit, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Gift className="h-3 w-3" />
                      {benefit}
                      <button
                        type="button"
                        onClick={() => removeBenefit(i)}
                        className="hover:text-destructive"
                        aria-label={t('removeBenefit')}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Bonus & Notes */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bonusInfo" className="text-sm">{t('compensation.bonusOptional')}</Label>
                <Input
                  id="bonusInfo"
                  placeholder={t('compensation.bonusPlaceholder')}
                  value={compensation.bonusInfo || ''}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    bonusInfo: e.target.value || undefined,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensationNotes" className="text-sm">{t('compensation.notes')}</Label>
                <Input
                  id="compensationNotes"
                  placeholder={t('compensation.notesPlaceholder')}
                  value={compensation.notes || ''}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    notes: e.target.value || undefined,
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit">{tCommon('save')}</Button>
            <Button type="button" variant="outline" onClick={() => setMode('preview')}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
