'use client';

import { useState } from 'react';
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
import { X, Plus, Briefcase, Sparkles, CheckCircle, Pencil, ArrowLeft, Loader2, Building2, MapPin, Clock, Euro, ChevronDown, ChevronUp, Gift, TrendingUp, Target, AlertCircle } from 'lucide-react';
import type { JobVacancy, JobCompensation, SalaryEstimate, TokenUsage } from '@/types';

type Mode = 'input' | 'preview' | 'edit';

const editSchema = z.object({
  title: z.string().min(2, 'Functietitel is verplicht'),
  company: z.string().optional(),
  description: z.string().min(20, 'Geef meer details over de functie'),
  industry: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface JobInputProps {
  onSubmit: (data: JobVacancy | null) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  initialData?: JobVacancy | null;
}

export function JobInput({ onSubmit, onTokenUsage, initialData }: JobInputProps) {
  const [mode, setMode] = useState<Mode>(initialData ? 'preview' : 'input');
  const [rawText, setRawText] = useState(initialData?.rawText || '');
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
      setError('Plak een volledige vacaturetekst (minimaal 50 tekens)');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/cv/job/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kon vacature niet analyseren');
      }

      const job = result.data as JobVacancy;

      // Report token usage if available
      if (result.usage && onTokenUsage) {
        onTokenUsage(result.usage);
      }

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
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
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
    const per = period === 'monthly' ? '/maand' : period === 'hourly' ? '/uur' : '/jaar';
    if (min && max) {
      return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}${per}`;
    }
    if (min) return `Vanaf ${curr} ${min.toLocaleString()}${per}`;
    if (max) return `Tot ${curr} ${max.toLocaleString()}${per}`;
    return null;
  };

  // INPUT MODE: Paste vacancy text
  if (mode === 'input') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Vacature toevoegen
          </CardTitle>
          <CardDescription>
            Plak de volledige vacaturetekst en we analyseren automatisch alle relevante informatie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vacancy-text">Vacaturetekst</Label>
            <Textarea
              id="vacancy-text"
              placeholder="Plak hier de volledige vacaturetekst...

Voorbeeld:
Senior Software Engineer bij TechCorp
Locatie: Amsterdam (Hybrid)
Full-time

Over de functie:
We zoeken een ervaren developer...

Wat we vragen:
- 5+ jaar ervaring met React
- Kennis van TypeScript
..."
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Je kunt de hele vacaturetekst plakken - inclusief bedrijfsinfo, vereisten, en extraatjes
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
                  Analyseren...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyseer vacature
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleSkip}>
              Overslaan (Algemene CV)
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
                Vacature geanalyseerd
              </CardTitle>
              <CardDescription>
                Controleer de geëxtraheerde informatie en ga door of pas aan
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleStartOver} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Opnieuw
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
              {parsedJob.industry && (
                <Badge variant="secondary">{parsedJob.industry}</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Samenvatting</Label>
            <p className="text-sm text-muted-foreground">{parsedJob.description}</p>
          </div>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Vereisten</Label>
              <ul className="space-y-1">
                {requirements.map((req, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span className="flex-1">{req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Keywords</Label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(i)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
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
                  <span className="font-medium text-sm">AI Salaris Inschatting</span>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {salaryEstimate.confidence === 'high' ? 'Hoge betrouwbaarheid' :
                     salaryEstimate.confidence === 'medium' ? 'Gemiddelde betrouwbaarheid' : 'Lage betrouwbaarheid'}
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
                        €{salaryEstimate.estimatedMin.toLocaleString()} - €{salaryEstimate.estimatedMax.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">/jaar</span>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {salaryEstimate.experienceLevel} niveau
                    </Badge>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Onderbouwing
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{salaryEstimate.reasoning}</p>
                  </div>

                  {/* Market Insight */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Marktinzicht
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{salaryEstimate.marketInsight}</p>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    * Dit is een AI-inschatting op basis van functie, industrie en locatie. Werkelijke salarissen kunnen afwijken.
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
                <span className="font-medium text-sm">Compensatie & Secundaire Voorwaarden</span>
                {(compensation.salaryMin || compensation.salaryMax || (compensation.benefits && compensation.benefits.length > 0)) && (
                  <Badge variant="secondary" className="text-xs">Ingevuld</Badge>
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
                    <Label className="text-sm font-medium">Salaris</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatSalary(compensation.salaryMin, compensation.salaryMax, compensation.salaryCurrency, compensation.salaryPeriod)}
                    </p>
                  </div>
                )}

                {/* Benefits display */}
                {compensation.benefits && compensation.benefits.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Secundaire voorwaarden</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {compensation.benefits.map((benefit, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          <Gift className="h-3 w-3" />
                          {benefit}
                          <button
                            type="button"
                            onClick={() => removeBenefit(i)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bonus info */}
                {compensation.bonusInfo && (
                  <div>
                    <Label className="text-sm font-medium">Bonus</Label>
                    <p className="text-sm text-muted-foreground">{compensation.bonusInfo}</p>
                  </div>
                )}

                {/* Notes */}
                {compensation.notes && (
                  <div>
                    <Label className="text-sm font-medium">Notities</Label>
                    <p className="text-sm text-muted-foreground">{compensation.notes}</p>
                  </div>
                )}

                {/* If nothing filled yet, show input fields */}
                {!compensation.salaryMin && !compensation.salaryMax && (!compensation.benefits || compensation.benefits.length === 0) && (
                  <p className="text-sm text-muted-foreground pt-3 italic">
                    Klik op &quot;Bewerken&quot; om compensatie details toe te voegen
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleContinue}>Doorgaan</Button>
            <Button variant="outline" onClick={() => setMode('edit')} className="gap-1">
              <Pencil className="h-4 w-4" />
              Bewerken
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
              Vacature bewerken
            </CardTitle>
            <CardDescription>
              Pas de geëxtraheerde informatie aan indien nodig
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('preview')} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleEditSave)} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Functietitel *</Label>
              <Input
                id="title"
                placeholder="bijv. Senior Software Engineer"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Bedrijf</Label>
              <Input
                id="company"
                placeholder="bijv. TechCorp"
                {...register('company')}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="location">Locatie</Label>
              <Input
                id="location"
                placeholder="bijv. Amsterdam"
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">Dienstverband</Label>
              <Input
                id="employmentType"
                placeholder="bijv. Fulltime"
                {...register('employmentType')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Sector</Label>
              <Input
                id="industry"
                placeholder="bijv. Tech"
                {...register('industry')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving *</Label>
            <Textarea
              id="description"
              placeholder="Korte samenvatting van de functie..."
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label>Vereisten</Label>
            <div className="flex gap-2">
              <Input
                placeholder="bijv. 5+ jaar React ervaring"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" variant="outline" onClick={addRequirement}>
                <Plus className="h-4 w-4" />
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
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="bijv. kubernetes"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" variant="outline" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
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
                    >
                      <X className="h-3 w-3" />
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
              <Label className="font-medium">Compensatie & Voorwaarden (optioneel)</Label>
            </div>

            {/* Salary Range */}
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin" className="text-sm">Minimum Salaris</Label>
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
                <Label htmlFor="salaryMax" className="text-sm">Maximum Salaris</Label>
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
                <Label htmlFor="salaryCurrency" className="text-sm">Valuta</Label>
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
                <Label htmlFor="salaryPeriod" className="text-sm">Periode</Label>
                <select
                  id="salaryPeriod"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={compensation.salaryPeriod || 'yearly'}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    salaryPeriod: e.target.value as 'yearly' | 'monthly' | 'hourly',
                  }))}
                >
                  <option value="yearly">Per jaar</option>
                  <option value="monthly">Per maand</option>
                  <option value="hourly">Per uur</option>
                </select>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label className="text-sm">Secundaire voorwaarden</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="bijv. Pensioenregeling, Lease auto, 30 vakantiedagen"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                />
                <Button type="button" variant="outline" onClick={addBenefit}>
                  <Plus className="h-4 w-4" />
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
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Bonus & Notes */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bonusInfo" className="text-sm">Bonus (optioneel)</Label>
                <Input
                  id="bonusInfo"
                  placeholder="bijv. 13e maand, prestatiebonus tot 10%"
                  value={compensation.bonusInfo || ''}
                  onChange={(e) => setCompensation(prev => ({
                    ...prev,
                    bonusInfo: e.target.value || undefined,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compensationNotes" className="text-sm">Notities</Label>
                <Input
                  id="compensationNotes"
                  placeholder="bijv. Afhankelijk van ervaring"
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
            <Button type="submit">Opslaan</Button>
            <Button type="button" variant="outline" onClick={() => setMode('preview')}>
              Annuleren
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
