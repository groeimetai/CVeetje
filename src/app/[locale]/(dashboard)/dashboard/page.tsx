'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-context';
import { getUserCVs } from '@/lib/firebase/firestore';
import { getDaysUntilReset } from '@/lib/credits/manager';
import { NextStepCard, type WizardStage } from '@/components/dashboard/next-step';
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

function inferStage(draft: DraftSnapshot | null, cvs: CV[]): { stage: WizardStage; job?: { title: string; company?: string } } {
  if (draft?.generatedContent && draft?.jobVacancy?.title) {
    return { stage: 'apply', job: { title: draft.jobVacancy.title, company: draft.jobVacancy.company } };
  }
  if (draft?.jobVacancy?.title && draft?.linkedInData) {
    return { stage: 'cv', job: { title: draft.jobVacancy.title, company: draft.jobVacancy.company } };
  }
  if (draft?.linkedInData) {
    return { stage: 'job' };
  }
  if (cvs.length > 0) {
    return { stage: 'job' };
  }
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

  const { stage, job } = inferStage(draft, cvs);
  const daysUntilReset = getDaysUntilReset();

  const primaryHref = stage === 'profile'
    ? '/profiles'
    : stage === 'job'
      ? '/jobs'
      : stage === 'cv'
        ? '/cv/new'
        : '/applications';

  const secondaryHref = stage === 'profile'
    ? '/profiles'
    : stage === 'job'
      ? '/jobs'
      : stage === 'cv'
        ? '/jobs'
        : '/cv';

  const activity = useMemo(() => buildActivity(cvs, applications), [cvs, applications]);

  return (
    <>
      <NextStepCard
        stage={stage}
        jobTitle={job?.title}
        company={job?.company}
        primaryHref={primaryHref}
        secondaryHref={secondaryHref}
      />

      <StatRow
        cvCount={cvs.length}
        readyCount={readyCount}
        appCount={applications.length}
        interviewCount={interviewCount}
        offerCount={offerCount}
        matchAvg={matchAvg}
        matchSampleSize={Math.min(cvs.length, 5)}
        credits={credits}
        daysUntilReset={daysUntilReset}
        cvSpark={cvs.length > 0 ? cvSpark : undefined}
        appSpark={applications.length > 0 ? appSpark : undefined}
      />

      <Tracker applications={applications} />

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
