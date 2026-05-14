'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Briefcase } from 'lucide-react';
import type { NormalizedJob } from '@/lib/jobs/providers/types';

const PALETTE = [
  '#1a2540', '#c2410c', '#0066cc', '#df1b12',
  '#0090e3', '#e1156c', '#1f3a2e', '#d18b00',
  '#003580', '#0abf53', '#ff5b22', '#409cff',
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initialsFor(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function JobsFeed() {
  const t = useTranslations('dashboard.jobsFeed');
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/jobs/search?location=Netherlands&limit=5');
        if (!res.ok) { setLoaded(true); return; }
        const data = await res.json();
        if (cancelled) return;
        const list: NormalizedJob[] = Array.isArray(data?.jobs) ? data.jobs.slice(0, 5) : [];
        setJobs(list);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="dash-section">
      <div className="dash-section__head">
        <div className="dash-section__head-left">
          <h3 className="dash-section__title">{t('title')}</h3>
          <span className="dash-section__sub">{t('subtitle')}</span>
        </div>
        <Link href="/jobs" className="brand-btn brand-btn--outline brand-btn--sm">
          {t('viewAll')}
        </Link>
      </div>
      <div className="dash-section__body dash-section__body--p0">
        <div className="jobs-feed">
          {!loaded && (
            <div style={{ padding: '20px 24px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              Bezig met laden…
            </div>
          )}
          {loaded && jobs.length === 0 && (
            <div style={{ padding: '20px 24px', fontSize: 13, color: 'var(--muted)' }}>
              {t('empty')}
            </div>
          )}
          {jobs.map((j) => {
            const co = j.company ?? '—';
            return (
              <Link key={j.slug} href={`/jobs/${j.slug}`} className="jobs-feed__item">
                <div className="jobs-feed__logo" style={{ background: colorFor(co) }}>{initialsFor(co)}</div>
                <div className="jobs-feed__main">
                  <p className="jobs-feed__title">{j.title}</p>
                  <div className="jobs-feed__meta">
                    <span><Briefcase size={11} />{co}</span>
                    {j.location && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{j.location}</span>
                      </>
                    )}
                    {j.employmentType && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>{j.employmentType}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
