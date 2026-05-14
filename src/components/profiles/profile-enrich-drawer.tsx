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
import { Loader2, Sparkles, AlertCircle, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import type {
  ParsedLinkedIn,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInSkill,
  LinkedInCertification,
  LinkedInProject,
} from '@/types';

interface UpdatePreview<T> {
  before: T;
  after: T;
  targetIndex: number;
}

interface EnrichmentResult {
  enrichedProfile: ParsedLinkedIn;
  changes: string[];
  changesSummary: string;
  ambiguityWarnings?: string[];
  skippedUpdates?: string[];
  updates?: {
    experience: UpdatePreview<LinkedInExperience>[];
    education: UpdatePreview<LinkedInEducation>[];
    skills: UpdatePreview<LinkedInSkill>[];
    certifications: UpdatePreview<LinkedInCertification>[];
    projects: UpdatePreview<LinkedInProject>[];
  };
}

interface ProfileEnrichDrawerProps {
  profileId: string;
  currentProfile: ParsedLinkedIn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (enriched: ParsedLinkedIn) => void;
}

function fieldDiff(before: string | null | undefined, after: string | null | undefined): boolean {
  return (before ?? '') !== (after ?? '');
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
        ambiguityWarnings: result.ambiguityWarnings || [],
        skippedUpdates: result.skippedUpdates || [],
        updates: result.updates,
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
  const newInterests = preview
    ? (preview.enrichedProfile.interests || []).slice(currentProfile.interests?.length ?? 0)
    : [];

  const hasAnyChange = preview && (
    newExperience.length > 0 || newEducation.length > 0 || newSkills.length > 0 ||
    newCertifications.length > 0 || newProjects.length > 0 || newInterests.length > 0 ||
    (preview.updates?.experience.length ?? 0) > 0 ||
    (preview.updates?.education.length ?? 0) > 0 ||
    (preview.updates?.skills.length ?? 0) > 0 ||
    (preview.updates?.certifications.length ?? 0) > 0 ||
    (preview.updates?.projects.length ?? 0) > 0 ||
    preview.enrichedProfile.headline !== currentProfile.headline ||
    preview.enrichedProfile.about !== currentProfile.about
  );

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

              {(preview.ambiguityWarnings && preview.ambiguityWarnings.length > 0) && (
                <Alert variant="default" className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="ml-2 space-y-1">
                    <p className="text-sm font-medium">{t('ambiguityTitle')}</p>
                    <ul className="text-sm list-disc pl-4 space-y-0.5">
                      {preview.ambiguityWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )}

              {(preview.skippedUpdates && preview.skippedUpdates.length > 0) && (
                <Alert variant="default" className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="ml-2 space-y-1">
                    <p className="text-sm font-medium">{t('skippedTitle')}</p>
                    <ul className="text-sm list-disc pl-4 space-y-0.5">
                      {preview.skippedUpdates.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )}

              {/* ----- UPDATES ----- */}

              {(preview.updates?.experience.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('updatedHeader')} · {t('workExperience')}
                  </h4>
                  <div className="space-y-2">
                    {preview.updates!.experience.map((upd, idx) => (
                      <DiffCard key={idx}>
                        <DiffRow
                          label={t('jobTitle')}
                          before={upd.before.title}
                          after={upd.after.title}
                        />
                        <DiffRow
                          label={t('company')}
                          before={upd.before.company}
                          after={upd.after.company}
                        />
                        <DiffRow
                          label={t('period')}
                          before={`${upd.before.startDate}${upd.before.endDate ? ` – ${upd.before.endDate}` : ' – heden'}`}
                          after={`${upd.after.startDate}${upd.after.endDate ? ` – ${upd.after.endDate}` : ' – heden'}`}
                        />
                        <DiffRow
                          label={t('description')}
                          before={upd.before.description || ''}
                          after={upd.after.description || ''}
                          multiline
                        />
                      </DiffCard>
                    ))}
                  </div>
                </section>
              )}

              {(preview.updates?.education.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('updatedHeader')} · {t('education')}
                  </h4>
                  <div className="space-y-2">
                    {preview.updates!.education.map((upd, idx) => (
                      <DiffCard key={idx}>
                        <DiffRow
                          label={t('school')}
                          before={upd.before.school}
                          after={upd.after.school}
                        />
                        <DiffRow
                          label={t('degree')}
                          before={upd.before.degree || ''}
                          after={upd.after.degree || ''}
                        />
                        <DiffRow
                          label={t('fieldOfStudy')}
                          before={upd.before.fieldOfStudy || ''}
                          after={upd.after.fieldOfStudy || ''}
                        />
                      </DiffCard>
                    ))}
                  </div>
                </section>
              )}

              {(preview.updates?.skills.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('updatedHeader')} · {t('skills')}
                  </h4>
                  <div className="space-y-1">
                    {preview.updates!.skills.map((upd, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="line-through opacity-70">{upd.before.name}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="default">{upd.after.name}</Badge>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(preview.updates?.certifications.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('updatedHeader')} · {t('certifications')}
                  </h4>
                  <div className="space-y-2">
                    {preview.updates!.certifications.map((upd, idx) => (
                      <DiffCard key={idx}>
                        <DiffRow label={t('name')} before={upd.before.name} after={upd.after.name} />
                        <DiffRow label={t('issuer')} before={upd.before.issuer || ''} after={upd.after.issuer || ''} />
                      </DiffCard>
                    ))}
                  </div>
                </section>
              )}

              {(preview.updates?.projects.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('updatedHeader')} · {t('projects')}
                  </h4>
                  <div className="space-y-2">
                    {preview.updates!.projects.map((upd, idx) => (
                      <DiffCard key={idx}>
                        <DiffRow label={t('name')} before={upd.before.title} after={upd.after.title} />
                        <DiffRow label={t('description')} before={upd.before.description || ''} after={upd.after.description || ''} multiline />
                      </DiffCard>
                    ))}
                  </div>
                </section>
              )}

              {/* ----- NEW ITEMS ----- */}

              {newExperience.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · {t('workExperience')}
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
                    {t('changesHeader')} · {t('education')}
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
                    {t('changesHeader')} · {t('skills')}
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
                    {t('changesHeader')} · {t('certifications')}
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
                    {t('changesHeader')} · {t('projects')}
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

              {newInterests.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    {t('changesHeader')} · {t('interests')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {newInterests.map((interest, idx) => (
                      <Badge key={idx} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {hasAnyChange && (
                <p className="text-xs text-muted-foreground italic">{t('applied')}</p>
              )}
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
              <Button onClick={handleApply} disabled={!hasAnyChange} className="flex-1">
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

function DiffCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border bg-muted/30 p-3 text-sm space-y-1.5">
      {children}
    </div>
  );
}

function DiffRow({
  label,
  before,
  after,
  multiline = false,
}: {
  label: string;
  before: string;
  after: string;
  multiline?: boolean;
}) {
  const changed = fieldDiff(before, after);
  if (!changed) {
    // Don't render unchanged fields — keeps the diff card focused.
    return null;
  }
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
      <div className="text-xs text-muted-foreground pt-0.5">{label}</div>
      <div className="space-y-0.5">
        <div className={`text-xs text-muted-foreground line-through ${multiline ? '' : 'truncate'}`}>
          {before || '—'}
        </div>
        <div className={`text-sm font-medium ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
          {after || '—'}
        </div>
      </div>
    </div>
  );
}
