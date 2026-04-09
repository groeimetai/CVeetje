'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertCircle, Check } from 'lucide-react';
import type { ParsedLinkedIn } from '@/types';

interface EnrichmentResult {
  enrichedProfile: ParsedLinkedIn;
  changes: string[];
  changesSummary: string;
}

interface ProfileEnrichDrawerProps {
  profileId: string;
  currentProfile: ParsedLinkedIn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (enriched: ParsedLinkedIn) => void;
}

export function ProfileEnrichDrawer({
  profileId,
  currentProfile,
  open,
  onOpenChange,
  onApply,
}: ProfileEnrichDrawerProps) {
  const t = useTranslations('profiles.enrich');
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<EnrichmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setText('');
    setPreview(null);
    setError(null);
    setIsAnalyzing(false);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError(t('empty'));
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentText: text.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('error'));
      }

      setPreview({
        enrichedProfile: result.enrichedProfile,
        changes: result.changes || [],
        changesSummary: result.changesSummary || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(preview.enrichedProfile);
    reset();
    onOpenChange(false);
  };

  // Derive new items by comparing counts (enrichment endpoint prepends new items)
  const newExperience = preview
    ? preview.enrichedProfile.experience.slice(
        0,
        preview.enrichedProfile.experience.length - currentProfile.experience.length
      )
    : [];
  const newEducation = preview
    ? preview.enrichedProfile.education.slice(
        0,
        preview.enrichedProfile.education.length - currentProfile.education.length
      )
    : [];
  const newSkills = preview
    ? preview.enrichedProfile.skills.slice(currentProfile.skills.length)
    : [];
  const newCertifications = preview
    ? preview.enrichedProfile.certifications.slice(
        0,
        preview.enrichedProfile.certifications.length - currentProfile.certifications.length
      )
    : [];
  const newProjects = preview
    ? (preview.enrichedProfile.projects || []).slice(
        0,
        (preview.enrichedProfile.projects?.length || 0) - (currentProfile.projects?.length || 0)
      )
    : [];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>{t('description')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!preview ? (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('placeholder')}
                rows={10}
                className="resize-none"
                disabled={isAnalyzing}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2 text-sm">{error}</span>
                </Alert>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <div className="ml-2 space-y-1">
                  <p className="text-sm font-medium">{t('preview')}</p>
                  {preview.changesSummary && (
                    <p className="text-sm text-muted-foreground">{preview.changesSummary}</p>
                  )}
                </div>
              </Alert>

              {preview.changes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {preview.changes.map((change, idx) => (
                    <Badge key={idx} variant="secondary">
                      {change}
                    </Badge>
                  ))}
                </div>
              )}

              {newExperience.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · Werkervaring
                  </h4>
                  <div className="space-y-2">
                    {newExperience.map((exp, idx) => (
                      <div key={idx} className="rounded border bg-muted/30 p-3 text-sm">
                        <div className="font-medium">{exp.title}</div>
                        <div className="text-muted-foreground">
                          {exp.company}
                          {exp.startDate && ` · ${exp.startDate}${exp.endDate ? ` – ${exp.endDate}` : ''}`}
                        </div>
                        {exp.description && (
                          <p className="mt-1 text-muted-foreground line-clamp-3">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {newEducation.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · Opleiding
                  </h4>
                  <div className="space-y-2">
                    {newEducation.map((edu, idx) => (
                      <div key={idx} className="rounded border bg-muted/30 p-3 text-sm">
                        <div className="font-medium">{edu.school}</div>
                        {(edu.degree || edu.fieldOfStudy) && (
                          <div className="text-muted-foreground">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {newSkills.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · Vaardigheden
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {newSkills.map((s, idx) => (
                      <Badge key={idx} variant="outline">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {newCertifications.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · Certificaten
                  </h4>
                  <div className="space-y-2">
                    {newCertifications.map((cert, idx) => (
                      <div key={idx} className="rounded border bg-muted/30 p-3 text-sm">
                        <div className="font-medium">{cert.name}</div>
                        {cert.issuer && <div className="text-muted-foreground">{cert.issuer}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {newProjects.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · Projecten
                  </h4>
                  <div className="space-y-2">
                    {newProjects.map((proj, idx) => (
                      <div key={idx} className="rounded border bg-muted/30 p-3 text-sm">
                        <div className="font-medium">{proj.title}</div>
                        {proj.description && (
                          <p className="text-muted-foreground line-clamp-2">{proj.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <p className="text-xs text-muted-foreground italic">{t('applied')}</p>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 border-t px-6 py-4">
          {!preview ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} className="flex-1">
                {t('cancel')}
              </Button>
              <Button onClick={handleAnalyze} disabled={isAnalyzing || !text.trim()} className="flex-1">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t('analyze')}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPreview(null)} className="flex-1">
                {t('cancel')}
              </Button>
              <Button onClick={handleApply} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                {t('applyToForm')}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
