'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-context';
import { getUserCVs } from '@/lib/firebase/firestore';
import { getDaysUntilReset } from '@/lib/credits/manager';
import { getMostRecentJob, type RecentJob } from '@/lib/recent-jobs';
import { NextStepCard } from '@/components/dashboard/next-step';
import { StatRow } from '@/components/dashboard/stat-row';
import { Tracker } from '@/components/dashboard/tracker';
import { CvGridSection } from '@/components/dashboard/cv-grid';
import { JobsFeed } from '@/components/dashboard/jobs-feed';
import { ActivityList, type ActivityItem } from '@/components/dashboard/activity-list';
import type { CV } from '@/types';
import type { ApplicationRecord } from '@/types/application';

type DraftSnapshot = {
  linkedInData?: unknown;
  jobVacancy?: { title?: string; company?: string } | null;
  generatedContent?: unknown;
};

function readDraft(): DraftSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('cveetje_wizard_draft');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? parsed ?? null;
  } catch {
    return null;
  }
}

interface InferredNextStep {
  stage: 'profile' | 'job' | 'cv' | 'apply';
  jobTitle?: string;
  company?: string | null;
  jobSlug?: string;
  matchPercent?: number;
}

function inferStage(
  draft: DraftSnapshot | null,
  cvs: CV[],
  applications: ApplicationRecord[],
  recent: RecentJob | null,
): InferredNextStep {
  // 1. Wizard draft in progress
  if (draft?.generatedContent && draft?.jobVacancy?.title) {
    return { stage: 'apply', jobTitle: draft.jobVacancy.title, company: draft.jobVacancy.company ?? undefined };
  }
  if (draft?.jobVacancy?.title && draft?.linkedInData) {
    return { stage: 'cv', jobTitle: draft.jobVacancy.title, company: draft.jobVacancy.company ?? undefined };
  }

  // 2. Recently viewed job (from JobsFeed clicks etc.)
  if (recent && (draft?.linkedInData || cvs.length > 0)) {
    return { stage: 'cv', jobTitle: recent.title, company: recent.company, jobSlug: recent.slug };
  }

  // 3. Most recent application with status 'applied' — suggest next move
  const recentApp = applications.find((a) => a.status === 'applied');
  if (recentApp) {
    const linkedCV = cvs.find((cv) => cv.id === recentApp.cvId);
    const score = linkedCV?.fitAnalysis?.overallScore;
    return {
      stage: 'apply',
      jobTitle: recentApp.jobTitle,
      company: recentApp.jobCompany,
      jobSlug: recentApp.jobSlug,
      matchPercent: typeof score === 'number' ? score : undefined,
    };
  }

  // 4. Has profile/CVs → suggest picking a job
  if (draft?.linkedInData || cvs.length > 0) {
    return { stage: 'job' };
  }

  // 5. Fresh user
  return { stage: 'profile' };
}

function bucketByWeek(dates: Date[]): number[] {
  const buckets = new Array(7).fill(0);
  const now = Date.now();
  for (const d of dates) {
    const days = Math.floor((now - d.getTime()) / 86_400_000);
    if (days >= 0 && days < 7) buckets[6 - days] += 1;
  }
  return buckets;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try { return (value as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function buildActivity(cvs: CV[], applications: ApplicationRecord[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const cv of cvs.slice(0, 4)) {
    if (cv.status === 'pdf_ready') {
      items.push({
        id: `cv-pdf-${cv.id}`,
        icon: 'check',
        kind: 'success',
        message: `<strong>CV PDF klaar</strong> · ${cv.jobVacancy?.company ?? 'Algemene CV'} — ${cv.jobVacancy?.title ?? 'CV'}`,
        time: fmtTimeShort(toDate(cv.updatedAt) ?? toDate(cv.createdAt)),
      });
    } else if (cv.status === 'generated') {
      items.push({
        id: `cv-gen-${cv.id}`,
        icon: 'spark',
        kind: 'default',
        message: `<strong>Nieuw CV gegenereerd</strong> · ${cv.jobVacancy?.company ?? 'Algemene CV'} — ${cv.jobVacancy?.title ?? 'CV'}`,
        time: fmtTimeShort(toDate(cv.updatedAt) ?? toDate(cv.createdAt)),
      });
    }
  }
  for (const app of applications.slice(0, 4)) {
    items.push({
      id: `app-${app.id}`,
      icon: app.status === 'interview' || app.status === 'offer' || app.status === 'accepted' ? 'check' : 'send',
      kind: app.status === 'interview' || app.status === 'offer' || app.status === 'accepted' ? 'success' : 'accent',
      message: app.status === 'applied'
        ? `<strong>Sollicitatie verstuurd</strong> · ${app.jobCompany ?? '—'} — ${app.jobTitle}`
        : `<strong>Status: ${app.status}</strong> · ${app.jobCompany ?? '—'} — ${app.jobTitle}`,
      time: fmtTimeShort(toDate(app.updatedAt) ?? toDate(app.appliedAt)),
    });
  }

  return items
    .slice(0, 8)
    .sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
}

function fmtTimeShort(date: Date | null): string {
  if (!date) return '—';
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}u`;
  return `${Math.floor(h / 24)}d`;
}

export default function DashboardPage() {
  const { effectiveUserId, credits } = useAuth();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [draft, setDraft] = useState<DraftSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  useEffect(() => {
    if (!effectiveUserId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [userCvs, appsRes] = await Promise.all([
          getUserCVs(effectiveUserId).catch(() => []),
          fetch('/api/applications').then((r) => (r.ok ? r.json() : { applications: [] })).catch(() => ({ applications: [] })),
        ]);
        if (cancelled) return;
        setCvs(userCvs);
        setApplications(Array.isArray(appsRes?.applications) ? appsRes.applications : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveUserId]);

  const readyCount = useMemo(
    () => cvs.filter((cv) => cv.status === 'pdf_ready' || cv.status === 'generated').length,
    [cvs],
  );
  const matchAvg = useMemo(() => {
    const scores = cvs
      .map((cv) => cv.fitAnalysis?.overallScore ?? null)
      .filter((s): s is number => typeof s === 'number')
      .slice(0, 5);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [cvs]);

  const matchDelta = useMemo(() => {
    const scores = cvs
      .map((cv) => cv.fitAnalysis?.overallScore ?? null)
      .filter((s): s is number => typeof s === 'number');
    if (scores.length < 4) return null;
    const recent = scores.slice(0, 3);
    const prev = scores.slice(3, 6);
    if (prev.length === 0) return null;
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
    return Math.round(recentAvg - prevAvg);
  }, [cvs]);

  const cvDeltaWeek = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 86_400_000;
    return cvs.filter((cv) => {
      const d = toDate(cv.createdAt);
      return d && d.getTime() >= oneWeekAgo;
    }).length;
  }, [cvs]);

  const interviewCount = applications.filter((a) => a.status === 'interview').length;
  const offerCount = applications.filter((a) => a.status === 'offer').length;

  const cvSpark = useMemo(
    () => bucketByWeek(cvs.map((cv) => toDate(cv.createdAt)).filter((d): d is Date => d !== null)),
    [cvs],
  );
  const appSpark = useMemo(
    () => bucketByWeek(applications.map((a) => toDate(a.appliedAt)).filter((d): d is Date => d !== null)),
    [applications],
  );

  const [recentJob, setRecentJob] = useState<RecentJob | null>(null);
  useEffect(() => {
    setRecentJob(getMostRecentJob());
  }, []);

  const next = inferStage(draft, cvs, applications, recentJob);
  const daysUntilReset = getDaysUntilReset();

  let primaryHref: string;
  let secondaryHref: string | undefined;
  switch (next.stage) {
    case 'profile':
      primaryHref = '/cv/new';
      secondaryHref = '/profiles';
      break;
    case 'job':
      primaryHref = '/jobs';
      secondaryHref = '/cv';
      break;
    case 'cv':
      primaryHref = next.jobSlug ? `/cv/new?jobId=${encodeURIComponent(next.jobSlug)}` : '/cv/new';
      secondaryHref = next.jobSlug ? `/jobs/${next.jobSlug}` : '/jobs';
      break;
    case 'apply':
      primaryHref = next.jobSlug ? `/jobs/${next.jobSlug}` : '/applications';
      secondaryHref = '/cv';
      break;
  }

  const activity = useMemo(() => buildActivity(cvs, applications), [cvs, applications]);

  return (
    <>
      <NextStepCard
        stage={next.stage}
        jobTitle={next.jobTitle}
        company={next.company ?? undefined}
        matchPercent={next.matchPercent}
        primaryHref={primaryHref}
        secondaryHref={secondaryHref}
      />

      <StatRow
        cvCount={cvs.length}
        readyCount={readyCount}
        cvDeltaWeek={cvDeltaWeek}
        appCount={applications.length}
        interviewCount={interviewCount}
        offerCount={offerCount}
        matchAvg={matchAvg}
        matchSampleSize={Math.min(cvs.length, 5)}
        matchDelta={matchDelta}
        credits={credits}
        daysUntilReset={daysUntilReset}
        cvSpark={cvs.length > 0 ? cvSpark : undefined}
        appSpark={applications.length > 0 ? appSpark : undefined}
      />

      <Tracker applications={applications} cvs={cvs} />

      <div className="dash-cols">
        <CvGridSection cvs={cvs} total={cvs.length} readyCount={readyCount} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <JobsFeed />
          <ActivityList items={activity} />
        </div>
      </div>

      {loading && cvs.length === 0 && (
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Bezig met laden…
        </p>
      )}
    </>
  );
}
