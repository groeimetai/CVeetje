'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ExternalLink, Loader2, Send, Sparkles, Zap } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApplyForm } from '@/components/jobs/apply-form';
import { auth } from '@/lib/firebase/config';
import { getUserCVs } from '@/lib/firebase/firestore';
import type { CV } from '@/types';
import type { CachedJob } from '@/lib/jobs/cache';

interface JobApplyPanelProps {
  job: CachedJob;
  locale: string;
}

type AuthState = 'loading' | 'anonymous' | 'authenticated';

export function JobApplyPanel({ job, locale }: JobApplyPanelProps) {
  const t = useTranslations('jobs');

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [cvsLoading, setCvsLoading] = useState(true);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [coverLetterBlob, setCoverLetterBlob] = useState<Blob | null>(null);
  const [preparingApply, setPreparingApply] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingApplied, setMarkingApplied] = useState(false);
  const [markedApplied, setMarkedApplied] = useState(false);

  useEffect(() => {
    if (!auth) {
      setAuthState('anonymous');
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthState(user ? 'authenticated' : 'anonymous');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authState !== 'authenticated' || !firebaseUser) return;
    setCvsLoading(true);
    getUserCVs(firebaseUser.uid)
      .then((all) => {
        // Only CVs that are downloadable: generated or pdf_ready.
        // Skip drafts/failed since they can't be rendered to PDF.
        const usable = all.filter(
          (cv) => cv.status === 'generated' || cv.status === 'pdf_ready',
        );
        setCvs(usable);
        if (usable.length > 0 && !selectedCvId) {
          setSelectedCvId(usable[0].id ?? '');
        }
      })
      .catch((err) => {
        console.warn('[job-apply-panel] failed to load CVs', err);
        setCvs([]);
      })
      .finally(() => setCvsLoading(false));
  }, [authState, firebaseUser, selectedCvId]);

  const selectedCv = cvs.find((cv) => cv.id === selectedCvId) || null;
  const isInApp = job.supportsInAppApply;

  const cvCtaHref = `/cv/new?jobId=${encodeURIComponent(job.slug)}`;

  // Fetch the existing CV's PDF + (optional) motivation letter, then open dialog.
  const handleQuickApply = async () => {
    if (!selectedCv?.id) return;
    setError(null);
    setPreparingApply(true);
    try {
      const pdfRes = await fetch(`/api/cv/${selectedCv.id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!pdfRes.ok) {
        const data = await pdfRes.json().catch(() => null);
        throw new Error(data?.error || 'Failed to load CV PDF');
      }
      const blob = await pdfRes.blob();
      setPdfBlob(blob);

      // Try to load motivation letter for this CV (silent failure: optional).
      try {
        const letterRes = await fetch(`/api/cv/${selectedCv.id}/motivation`);
        if (letterRes.ok) {
          const letterData = await letterRes.json().catch(() => null);
          if (letterData?.letter) {
            const pdfLetterRes = await fetch(
              `/api/cv/${selectedCv.id}/motivation/download`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format: 'pdf', letter: letterData.letter }),
              },
            );
            if (pdfLetterRes.ok) {
              setCoverLetterBlob(await pdfLetterRes.blob());
            }
          }
        }
      } catch {
        // ignore — cover letter is optional
      }

      setApplyDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare apply');
    } finally {
      setPreparingApply(false);
    }
  };

  const handleMarkApplied = async () => {
    setError(null);
    setMarkingApplied(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobSlug: job.slug,
          cvId: selectedCv?.id ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Mark-applied failed');
      }
      setMarkedApplied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record');
    } finally {
      setMarkingApplied(false);
    }
  };

  // Not logged in — single CTA pointing to the wizard via login.
  if (authState === 'anonymous') {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              {isInApp ? (
                <>
                  <Zap className="h-4 w-4 text-primary" />
                  {t('detail.ctaHeading')}
                </>
              ) : (
                t('detail.ctaHeading')
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isInApp ? t('detail.ctaSubheadingInApp') : t('detail.ctaSubheadingExternal')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild>
              <Link href={cvCtaHref}>
                <Sparkles className="h-4 w-4 mr-1" />
                {t('detail.makeCV')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                {isInApp ? t('detail.viewOnEmployer') : t('detail.applyExternal')}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (authState === 'loading') {
    return (
      <Card>
        <CardContent className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {locale === 'nl' ? 'Sollicitatie-opties laden…' : 'Loading apply options…'}
        </CardContent>
      </Card>
    );
  }

  // Authenticated.
  const noCvs = !cvsLoading && cvs.length === 0;

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isInApp ? (
              <Badge className="bg-primary text-primary-foreground">
                <Zap className="h-3 w-3 mr-1" />
                {t('inAppApplyBadge')}
              </Badge>
            ) : (
              <Badge variant="outline">
                <ExternalLink className="h-3 w-3 mr-1" />
                {t('externalApplyBadge')}
              </Badge>
            )}
          </div>

          {isInApp ? (
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-base">
                  {locale === 'nl'
                    ? 'Solliciteer direct met een bestaand CV'
                    : 'Apply directly with an existing CV'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {locale === 'nl'
                    ? 'Kies een CV dat je eerder hebt aangemaakt. We versturen hem (en je motivatiebrief, als die er is) direct naar de werkgever.'
                    : 'Pick a CV you previously created. We send it (and your cover letter, if any) directly to the employer.'}
                </p>
              </div>

              {noCvs ? (
                <Alert>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      {locale === 'nl'
                        ? 'Je hebt nog geen CV staan. Maak er eerst één voor deze vacature.'
                        : "You don't have any CVs yet. Create one for this job first."}
                    </span>
                    <Button asChild size="sm" className="self-start">
                      <Link href={cvCtaHref}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        {t('detail.makeCV')}
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    disabled={cvsLoading || preparingApply}
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {cvs.map((cv) => {
                      const labelTitle =
                        cv.jobVacancy?.title ||
                        (locale === 'nl' ? 'Algemeen CV' : 'General CV');
                      const labelCompany = cv.jobVacancy?.company
                        ? ` @ ${cv.jobVacancy.company}`
                        : '';
                      const created =
                        cv.createdAt?.toDate?.()?.toLocaleDateString(
                          locale === 'nl' ? 'nl-NL' : 'en-US',
                        ) || '';
                      return (
                        <option key={cv.id} value={cv.id}>
                          {labelTitle}
                          {labelCompany}
                          {created ? ` — ${created}` : ''}
                          {cv.status === 'pdf_ready' ? ' ✓' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <Button onClick={handleQuickApply} disabled={!selectedCv || preparingApply}>
                    {preparingApply ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        {locale === 'nl' ? 'Voorbereiden…' : 'Preparing…'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        {locale === 'nl' ? 'Solliciteer met dit CV' : 'Apply with this CV'}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {selectedCv && selectedCv.status !== 'pdf_ready' && (
                <p className="text-xs text-muted-foreground">
                  {locale === 'nl'
                    ? 'Let op: voor dit CV is nog geen PDF gegenereerd — er wordt 1 credit afgetrokken bij het renderen.'
                    : 'Note: no PDF has been rendered yet for this CV — 1 credit will be charged when preparing it.'}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button asChild variant="outline" size="sm">
                  <Link href={cvCtaHref}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {locale === 'nl' ? 'Maak een nieuw CV op maat' : 'Make a new tailored CV'}
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t('detail.viewOnEmployer')}
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-base">
                  {locale === 'nl'
                    ? 'Solliciteer op de werkgever-site'
                    : 'Apply on the employer site'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {locale === 'nl'
                    ? 'Deze werkgever ondersteunt geen 1-klik solliciteren. Open de externe pagina en houd je sollicitatie hier bij.'
                    : "This employer doesn't support 1-click apply. Open the external page and track your application here."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild>
                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t('detail.applyExternal')}
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMarkApplied}
                  disabled={markingApplied || markedApplied}
                >
                  {markingApplied ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      {locale === 'nl' ? 'Bezig…' : 'Saving…'}
                    </>
                  ) : markedApplied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                      {locale === 'nl' ? 'Toegevoegd' : 'Tracked'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      {locale === 'nl'
                        ? 'Markeer als gesolliciteerd'
                        : 'Mark as applied'}
                    </>
                  )}
                </Button>
                <Button asChild variant="ghost">
                  <Link href={cvCtaHref}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    {locale === 'nl' ? 'Maak eerst een CV' : 'Make a CV first'}
                  </Link>
                </Button>
              </div>
              {markedApplied && (
                <Alert className="border-green-300 bg-green-50 dark:bg-green-900/20">
                  <AlertDescription className="text-sm">
                    {locale === 'nl'
                      ? 'Sollicitatie staat nu in "Mijn sollicitaties".'
                      : 'Application added to "My applications".'}{' '}
                    <Link
                      href="/applications"
                      className="underline font-medium ml-1"
                    >
                      {locale === 'nl' ? 'Bekijken' : 'View'}
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {pdfBlob && selectedCv && isInApp && (
        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {job.company
                  ? locale === 'nl'
                    ? `Solliciteer bij ${job.company}`
                    : `Apply at ${job.company}`
                  : locale === 'nl'
                  ? 'Solliciteren via CVeetje'
                  : 'Apply via CVeetje'}
              </DialogTitle>
              <DialogDescription>{job.title}</DialogDescription>
            </DialogHeader>
            <ApplyForm
              jobSlug={job.slug}
              cvPdfBlob={pdfBlob}
              cvFileName={`cv-${selectedCv.linkedInData?.fullName
                ?.toLowerCase()
                .replace(/\s+/g, '-') || 'download'}.pdf`}
              coverLetterBlob={coverLetterBlob ?? undefined}
              coverLetterFileName={
                coverLetterBlob
                  ? `motivatiebrief-${selectedCv.linkedInData?.fullName
                      ?.toLowerCase()
                      .replace(/\s+/g, '-') || 'download'}.pdf`
                  : undefined
              }
              cvId={selectedCv.id ?? null}
              questions={job.applyQuestions}
              defaults={{
                firstName: selectedCv.linkedInData?.fullName?.split(' ')[0],
                lastName: selectedCv.linkedInData?.fullName
                  ?.split(' ')
                  .slice(1)
                  .join(' '),
                email:
                  selectedCv.linkedInData?.email ??
                  firebaseUser?.email ??
                  undefined,
                phone: selectedCv.linkedInData?.phone ?? undefined,
                linkedinUrl: selectedCv.linkedInData?.linkedinUrl ?? undefined,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

