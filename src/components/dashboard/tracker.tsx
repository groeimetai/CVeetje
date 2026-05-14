'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import type { ApplicationRecord, ApplicationStatus } from '@/types/application';
import type { CV } from '@/types';

interface TrackerProps {
  applications: ApplicationRecord[];
  cvs?: CV[];
}

const COLUMN_ORDER: ApplicationStatus[] = ['applied', 'interview', 'offer', 'accepted'];

const COLOR_PALETTE = [
  '#1a2540', // navy
  '#c2410c', // clay
  '#1f3a2e', // forest
  '#1d3eb8', // ink-blue
  '#0066cc',
  '#df1b12',
  '#0090e3',
  '#e1156c',
  '#0091da',
  '#0abf53',
  '#d18b00',
  '#003580',
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[h % COLOR_PALETTE.length];
}

function initialsFor(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function fmtRelative(date: Date | null | undefined): string {
  if (!date) return '';
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(1, min)}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}u`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w}w`;
  const months = Math.floor(d / 30);
  return `${months}mnd`;
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

export function Tracker({ applications, cvs = [] }: TrackerProps) {
  const t = useTranslations('dashboard.tracker');

  const cvScoreById = new Map<string, number>();
  for (const cv of cvs) {
    const score = cv.fitAnalysis?.overallScore;
    if (typeof score === 'number' && cv.id) cvScoreById.set(cv.id, score);
  }

  const grouped: Record<ApplicationStatus, ApplicationRecord[]> = {
    applied: [],
    interview: [],
    offer: [],
    rejected: [],
    accepted: [],
    withdrawn: [],
  };
  for (const app of applications) {
    if (grouped[app.status]) grouped[app.status].push(app);
  }

  const active = grouped.applied.length + grouped.interview.length + grouped.offer.length;
  const accepted = grouped.accepted.length;

  return (
    <section className="dash-section">
      <div className="dash-section__head">
        <div className="dash-section__head-left">
          <h3 className="dash-section__title">{t('title')}</h3>
          <span className="dash-section__sub">{t('subtitle', { active, accepted })}</span>
        </div>
        <Link href="/applications" className="brand-btn brand-btn--outline brand-btn--sm">
          {t('viewAll')} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="dash-section__body dash-section__body--p0">
        <div className="tracker">
          {COLUMN_ORDER.map((status) => {
            const items = grouped[status].slice(0, 5);
            return (
              <div className="tracker__col" key={status}>
                <div className="tracker__col-head">
                  <span>{t(status)}</span>
                  <span className="tracker__count">{grouped[status].length}</span>
                </div>
                <div className="tracker__cards">
                  {items.length === 0 && <div className="tracker__empty">{t('empty')}</div>}
                  {items.map((app) => {
                    const company = app.jobCompany || '—';
                    const role = app.jobTitle || '—';
                    const time = fmtRelative(toDate(app.appliedAt));
                    const score = app.cvId ? cvScoreById.get(app.cvId) : undefined;
                    return (
                      <Link
                        href={app.jobSlug ? `/jobs/${app.jobSlug}` : '/applications'}
                        className="tracker__card"
                        key={app.id}
                      >
                        <div className="tracker__card-top">
                          <div className="tracker__card-logo" style={{ background: colorFor(company) }}>
                            {initialsFor(company)}
                          </div>
                          <div className="tracker__card-co">{company}</div>
                        </div>
                        <div className="tracker__card-role">{role}</div>
                        <div className="tracker__card-meta">
                          {time && <span>{time}</span>}
                          {typeof score === 'number' && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{score}%</span>
                            </>
                          )}
                          {app.jobLocation && !score && (
                            <>
                              <span style={{ opacity: 0.4 }}>·</span>
                              <span>{app.jobLocation}</span>
                            </>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
