'use client';

import { useTranslations } from 'next-intl';
import { Check, Send, Sparkles, Edit3, CreditCard, FileText } from 'lucide-react';

export type ActivityKind = 'success' | 'accent' | 'default';
export interface ActivityItem {
  id: string;
  icon: 'check' | 'send' | 'spark' | 'edit' | 'card' | 'file';
  kind: ActivityKind;
  /** Already-localized message — use bold/strong tags for emphasis. */
  message: string;
  time: string;
}

const ICONS = {
  check: Check,
  send: Send,
  spark: Sparkles,
  edit: Edit3,
  card: CreditCard,
  file: FileText,
} as const;

interface ActivityListProps {
  items: ActivityItem[];
}

export function ActivityList({ items }: ActivityListProps) {
  const t = useTranslations('dashboard.activity');

  return (
    <section className="dash-section">
      <div className="dash-section__head">
        <div className="dash-section__head-left">
          <h3 className="dash-section__title">{t('title')}</h3>
          <span className="dash-section__sub">{t('subtitle')}</span>
        </div>
      </div>
      <div className="dash-section__body dash-section__body--p0">
        <div className="activity-list">
          {items.length === 0 && (
            <div style={{ padding: '20px 24px', fontSize: 13, color: 'var(--muted)' }}>
              {t('empty')}
            </div>
          )}
          {items.map((it) => {
            const Icon = ICONS[it.icon];
            return (
              <div className="activity-list__row" key={it.id}>
                <div className="activity-list__icon" data-kind={it.kind}>
                  <Icon size={13} />
                </div>
                <div style={{ flex: 1, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: it.message }} />
                <span className="activity-list__time">{it.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
