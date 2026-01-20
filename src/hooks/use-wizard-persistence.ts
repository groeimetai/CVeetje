'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  ParsedLinkedIn,
  JobVacancy,
  CVStyleConfig,
  OutputLanguage,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

const STORAGE_KEY = 'cveetje_wizard_draft';
const EXPIRY_HOURS = 24; // Draft expires after 24 hours

export type WizardStep = 'linkedin' | 'job' | 'fit-analysis' | 'style' | 'generating' | 'preview';

export interface WizardDraft {
  currentStep: WizardStep;
  linkedInData: ParsedLinkedIn | null;
  jobVacancy: JobVacancy | null;
  styleConfig: CVStyleConfig | null;
  designTokens: CVDesignTokens | null;
  avatarUrl: string | null;
  outputLanguage: OutputLanguage;
  savedAt: number; // timestamp
}

interface UseWizardPersistenceResult {
  hasDraft: boolean;
  draft: WizardDraft | null;
  saveDraft: (draft: Omit<WizardDraft, 'savedAt'>) => void;
  clearDraft: () => void;
  isLoading: boolean;
}

function isValidDraft(data: unknown): data is WizardDraft {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  // Check required fields
  if (!d.currentStep || !d.savedAt) return false;

  // Check if draft hasn't expired
  const savedAt = d.savedAt as number;
  const expiryTime = savedAt + (EXPIRY_HOURS * 60 * 60 * 1000);
  if (Date.now() > expiryTime) return false;

  // Draft must have at least profile data to be useful
  if (!d.linkedInData) return false;

  return true;
}

export function useWizardPersistence(): UseWizardPersistenceResult {
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidDraft(parsed)) {
          setDraft(parsed);
        } else {
          // Clear invalid/expired draft
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load wizard draft:', err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveDraft = useCallback((draftData: Omit<WizardDraft, 'savedAt'>) => {
    // Don't save if we're in generating or preview step (after CV is generated)
    if (draftData.currentStep === 'generating' || draftData.currentStep === 'preview') {
      return;
    }

    // Don't save if there's no profile data
    if (!draftData.linkedInData) {
      return;
    }

    const fullDraft: WizardDraft = {
      ...draftData,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullDraft));
      setDraft(fullDraft);
    } catch (err) {
      console.error('Failed to save wizard draft:', err);
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setDraft(null);
    } catch (err) {
      console.error('Failed to clear wizard draft:', err);
    }
  }, []);

  return {
    hasDraft: draft !== null && draft.currentStep !== 'linkedin',
    draft,
    saveDraft,
    clearDraft,
    isLoading,
  };
}

// Helper to format time ago
export function formatTimeAgo(timestamp: number, locale: string = 'nl'): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  const intervals = {
    nl: {
      hour: { singular: 'uur', plural: 'uur' },
      minute: { singular: 'minuut', plural: 'minuten' },
      second: { singular: 'seconde', plural: 'seconden' },
      ago: 'geleden',
    },
    en: {
      hour: { singular: 'hour', plural: 'hours' },
      minute: { singular: 'minute', plural: 'minutes' },
      second: { singular: 'second', plural: 'seconds' },
      ago: 'ago',
    },
  };

  const t = intervals[locale as keyof typeof intervals] || intervals.nl;

  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${hours === 1 ? t.hour.singular : t.hour.plural} ${t.ago}`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? t.minute.singular : t.minute.plural} ${t.ago}`;
  }
  return `${seconds} ${seconds === 1 ? t.second.singular : t.second.plural} ${t.ago}`;
}
