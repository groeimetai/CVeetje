'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight, ExternalLink, Plus } from 'lucide-react';
import { CvThumb, type CvThumbLayout } from '@/components/brand/cv-thumb';
import type { CV } from '@/types';

interface CvGridProps {
  cvs: CV[];
  total: number;
  readyCount: number;
}

function layoutFromCV(cv: CV): CvThumbLayout {
  const level = cv.creativityLevel;
  if (level === 'creative' || level === 'editorial-paper') return 'editorial';
  if (level === 'experimental') return 'split';
  if (level === 'conservative') return 'minimal';
  return 'split';
}

function fmtRelative(date: Date | null): string {
  if (!date) return '—';
  const ms = Date.now() - date.getTime();
  const h = Math.floor(ms / 3600_000);
  if (h < 1) return 'net nu';
  if (h < 24) return `${h} uur`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} dag`;
  const w = Math.floor(d / 7);
  if (w < 4) return `${w} week`;
  return `${Math.floor(d / 30)} mnd`;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    try { return (value as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  return null;
}

function statusBadge(status: CV['status']): { label: string; variant: 'success' | 'primary' | 'ghost' | 'accent' } {
  switch (status) {
    case 'pdf_ready': return { label: 'PDF klaar', variant: 'success' };
    case 'generated': return { label: 'Gegenereerd', variant: 'primary' };
    case 'generating': return { label: 'Bezig…', variant: 'accent' };
    case 'failed': return { label: 'Mislukt', variant: 'accent' };
    default: return { label: 'Concept', variant: 'ghost' };
  }
}

export function CvGridSection({ cvs, total, readyCount }: CvGridProps) {
  const t = useTranslations('dashboard.cvGrid');

  return (
    <section className="dash-section">
      <div className="dash-section__head">
        <div className="dash-section__head-left">
          <h3 className="dash-section__title">{t('title')}</h3>
          <span className="dash-section__sub">{t('subtitle', { total, ready: readyCount })}</span>
        </div>
        <Link href="/cv" className="brand-btn brand-btn--outline brand-btn--sm">
          {t('viewAll')} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="dash-section__body">
        <div className="cvgrid">
          {cvs.slice(0, 5).map((cv) => {
            const layout = layoutFromCV(cv);
            const role = cv.jobVacancy?.title || t('untitled');
            const company = cv.jobVacancy?.company;
            const name = cv.linkedInData?.fullName || '—';
            const status = statusBadge(cv.status);
            const time = fmtRelative(toDate(cv.createdAt));
            return (
              <Link key={cv.id} href={`/cv/${cv.id}`} className="cvgrid__card">
                <CvThumb layout={layout} name={name} role={role} />
                <div className="cvgrid__card-status">
                  <span className={`brand-badge brand-badge--${status.variant}`}>
                    <span className="brand-badge-dot" />
                    {status.label}
                  </span>
                </div>
                <div className="cvgrid__card-meta">
                  <span className="cvgrid__card-title">{role}</span>
                  <span className="cvgrid__card-sub">
                    {company && <strong>{company}</strong>}
                    {company && ' · '}
                    {name.split(' ').pop()}
                  </span>
                </div>
                <div className="cvgrid__card-foot">
                  <span>{t('ago', { time })}</span>
                  <ExternalLink size={12} style={{ color: 'var(--muted)' }} />
                </div>
              </Link>
            );
          })}
          <Link href="/cv/new" className="cvgrid__card cvgrid__newcard" style={{ borderStyle: 'dashed' }}>
            <div className="cvgrid__newcard-icon"><Plus size={18} /></div>
            <strong style={{ color: 'inherit', fontWeight: 500, fontSize: 14 }}>{t('newCv')}</strong>
            <span style={{ fontSize: 12 }}>{t('newCvSub')}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
