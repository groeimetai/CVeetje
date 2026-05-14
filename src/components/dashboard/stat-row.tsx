'use client';

import { useTranslations } from 'next-intl';
import { MiniBars } from '@/components/brand/mini-bars';

interface StatRowProps {
  cvCount: number;
  readyCount: number;
  cvDeltaWeek: number;
  appCount: number;
  interviewCount: number;
  offerCount: number;
  matchAvg: number | null;
  matchSampleSize: number;
  matchDelta: number | null;
  credits: number;
  daysUntilReset: number;
  cvSpark?: number[];
  appSpark?: number[];
}

function Delta({ value, suffix = '', label }: { value: number; suffix?: string; label?: string }) {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <span className={`stat-card__delta${isUp ? '' : ' stat-card__delta--down'}`}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{value}{suffix}{label ? ` ${label}` : ''}
    </span>
  );
}

export function StatRow({
  cvCount,
  readyCount,
  cvDeltaWeek,
  appCount,
  interviewCount,
  offerCount,
  matchAvg,
  matchSampleSize,
  matchDelta,
  credits,
  daysUntilReset,
  cvSpark,
  appSpark,
}: StatRowProps) {
  const t = useTranslations('dashboard.statRow');

  return (
    <section className="stat-row">
      <div className="stat-card">
        <div className="stat-card__top">
          <span className="stat-card__label">{t('cvsLabel')}</span>
          {cvSpark && <MiniBars values={cvSpark} color="var(--accent)" />}
        </div>
        <div className="stat-card__value">{cvCount}</div>
        <div className="stat-card__hint">
          {cvDeltaWeek !== 0 ? <Delta value={cvDeltaWeek} label={t('cvsDeltaSuffix')} /> : t('cvsHint', { count: readyCount })}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__top">
          <span className="stat-card__label">{t('appsLabel')}</span>
          {appSpark && <MiniBars values={appSpark} color="var(--primary)" />}
        </div>
        <div className="stat-card__value">{appCount}</div>
        <div className="stat-card__hint">
          {appCount > 0
            ? t('appsHint', { interview: interviewCount, offers: offerCount })
            : t('appsHintEmpty')}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__top">
          <span className="stat-card__label">{t('matchLabel')}</span>
          {matchDelta != null && matchDelta !== 0 && <Delta value={matchDelta} suffix="%" />}
        </div>
        <div className="stat-card__value">
          {matchAvg != null ? <>{matchAvg}<em>%</em></> : '—'}
        </div>
        <div className="stat-card__hint">
          {matchAvg != null ? t('matchHint', { count: matchSampleSize }) : t('matchHintEmpty')}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__top">
          <span className="stat-card__label">{t('creditsLabel')}</span>
          <span className="brand-badge brand-badge--primary">{credits} op</span>
        </div>
        <div className="stat-card__value">{credits}</div>
        <div className="stat-card__hint">{t('creditsHint', { days: daysUntilReset })}</div>
      </div>
    </section>
  );
}
