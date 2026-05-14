'use client';

import { useTranslations } from 'next-intl';
import type { OutputLanguage } from '@/types';

interface LanguageSelectorProps {
  value: OutputLanguage;
  onChange: (lang: OutputLanguage) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const t = useTranslations('cvWizard.languageSelection');

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-sm">{t('title')}</p>
          <p className="text-xs text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onChange('nl')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              value === 'nl'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            🇳🇱 {t('dutch')}
          </button>
          <button
            onClick={() => onChange('en')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              value === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            🇬🇧 {t('english')}
          </button>
        </div>
      </div>
    </div>
  );
}
