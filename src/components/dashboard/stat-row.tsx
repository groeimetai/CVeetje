'use client';

import { useTranslations } from 'next-intl';
import { MiniBars } from '@/components/brand/mini-bars';

interface StatRowProps {
  cvCount: number;
  readyCount: number;
  appCount: number;
  interviewCount: number;
  offerCount: number;
  matchAvg: number | null;
  matchSampleSize: number;
  credits: number;
  daysUntilReset: number;
  /** 7-bucket sparkline values; if absent, no chart is rendered */
  cvSpark?: number[];
  appSpark?: number[];
}

export function StatRow({
  cvCount,
  readyCount,
  appCount,
  interviewCount,
  offerCount,
  matchAvg,
  matchSampleSize,
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
        <div className="stat-card__hint">{t('cvsHint', { count: readyCount })}</div>
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
        </div>
        <div className="stat-card__value">{credits}</div>
        <div className="stat-card__hint">{t('creditsHint', { days: daysUntilReset })}</div>
      </div>
    </section>
  );
}
