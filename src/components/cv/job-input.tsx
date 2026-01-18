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
import { X, Plus, Briefcase, Sparkles, CheckCircle, Pencil, ArrowLeft, Loader2, Building2, MapPin, Clock } from 'lucide-react';
import type { JobVacancy, TokenUsage } from '@/types';

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
    };
    setParsedJob(updatedJob);
    setMode('preview');
  };

  const handleContinue = () => {
    if (parsedJob) {
      onSubmit({
        ...parsedJob,
        requirements,
        keywords,
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
          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-3">
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
