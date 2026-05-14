'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

export type WizardStage = 'profile' | 'job' | 'cv' | 'apply';

interface NextStepProps {
  stage: WizardStage;
  jobTitle?: string;
  company?: string;
  matchPercent?: number;
  primaryHref: string;
  secondaryHref?: string;
}

export function NextStepCard({ stage, jobTitle, company, matchPercent, primaryHref, secondaryHref }: NextStepProps) {
  const t = useTranslations('dashboard.next');
  const tP = useTranslations('dashboard.next.progress');

  const stageNumberMap: Record<WizardStage, number> = { profile: 1, job: 2, cv: 3, apply: 4 };
  const stepNum = stageNumberMap[stage];

  const titleMap: Record<WizardStage, { title: string; em: string; sub: string; cta: string; sec?: string }> = {
    profile: {
      title: t('titleProfile'),
      em: t('titleProfileEm'),
      sub: t('titleProfileSub'),
      cta: t('ctaProfile'),
      sec: t('ctaSecondaryProfile'),
    },
    job: {
      title: t('titleJob'),
      em: t('titleJobEm'),
      sub: t('titleJobSub'),
      cta: t('ctaJob'),
      sec: t('ctaSecondaryJob'),
    },
    cv: {
      title: t('titleCv'),
      em: t('titleCvEm'),
      sub: company && jobTitle
        ? `${company} · ${jobTitle}${matchPercent ? ` — ${matchPercent}% match` : ''} — ${t('titleCvSub')}`
        : t('titleCvSub'),
      cta: t('ctaCv'),
      sec: t('ctaSecondary'),
    },
    apply: {
      title: t('titleDone'),
      em: t('titleDoneEm'),
      sub: t('titleDoneSub'),
      cta: t('ctaApply'),
      sec: t('ctaSecondary'),
    },
  };
  const m = titleMap[stage];

  const steps: { num: string; text: string; hint: string; done: boolean; active: boolean }[] = [
    { num: '01', text: tP('profile'), hint: tP('done'), done: stepNum > 1, active: stepNum === 1 },
    { num: '02', text: tP('vacancy'), hint: company ?? tP('skip'), done: stepNum > 2, active: stepNum === 2 },
    { num: '03', text: tP('generate'), hint: tP('oneCredit'), done: stepNum > 3, active: stepNum === 3 },
    { num: '04', text: tP('apply'), hint: tP('oneClick'), done: stepNum > 4, active: stepNum === 4 },
  ];

  return (
    <section className="next-step">
      <div className="next-step__left">
        <div className="next-step__eyebrow">{t('eyebrow', { n: String(stepNum).padStart(2, '0') })}</div>
        <h2 className="next-step__title">
          {m.title}<br /><em>{m.em}</em>
        </h2>
        <p className="next-step__sub">{m.sub}</p>
        <div className="next-step__cta">
          <Link href={primaryHref} className="brand-btn brand-btn--primary">
            {m.cta} <ArrowRight size={14} />
          </Link>
          {secondaryHref && (
            <Link href={secondaryHref} className="brand-btn brand-btn--ghost">
              {m.sec}
            </Link>
          )}
        </div>
      </div>
      <div className="next-step__right">
        <div className="next-step__progress">
          {steps.map((s) => (
            <div
              key={s.num}
              className="next-step__progress-row"
              data-done={s.done ? 'true' : undefined}
              data-active={s.active ? 'true' : undefined}
            >
              <span className="next-step__progress-num">{s.done ? '✓' : s.num.slice(1)}</span>
              <strong>{s.text}</strong>
              <span>{s.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
