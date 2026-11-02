'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/auth-context';
import { getUserCVs } from '@/lib/firebase/firestore';
import { getRecentJobs, type RecentJob } from '@/lib/recent-jobs';
import type { CV } from '@/types';
import {
  FileText,
  Briefcase,
  Users,
  Search,
  X,
  Home,
  Settings,
  CreditCard,
  LayoutTemplate,
  MessageSquarePlus,
  Send,
  Cpu,
  Scale,
  Mail,
  Columns3,
  User,
} from 'lucide-react';

/** Event om de palette te openen vanaf elders (bv. de mobiele header). */
export const OPEN_PALETTE_EVENT = 'cveetje:open-command-palette';

type IconType = typeof FileText;

interface PaletteEntry {
  group: string;
  key: string;
  label: string;
  hint?: string;
  icon: IconType;
  href: string;
}

interface SavedProfile {
  id: string;
  name?: string;
  headline?: string;
}

interface JobSearchResult {
  slug: string;
  title: string;
  company: string | null;
  location: string | null;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// Labels zijn navigation-keys (vertaald bij render) — gelijk aan de sidebar.
const NAV_ENTRIES: Array<Omit<PaletteEntry, 'label' | 'group'> & { labelKey: string }> = [
  { key: 'nav-dashboard', labelKey: 'dashboard',    icon: Home,              href: '/dashboard' },
  { key: 'nav-cv',        labelKey: 'myCvs',        icon: FileText,          href: '/cv' },
  { key: 'nav-profiles',  labelKey: 'profiles',     icon: Users,             href: '/profiles' },
  { key: 'nav-templates', labelKey: 'templates',    icon: LayoutTemplate,    href: '/templates' },
  { key: 'nav-jobs',      labelKey: 'jobs',         icon: Briefcase,         href: '/jobs' },
  { key: 'nav-apps',      labelKey: 'applications', icon: Send,              href: '/applications' },
  { key: 'nav-credits',   labelKey: 'credits',      icon: CreditCard,        href: '/credits' },
  { key: 'nav-settings',  labelKey: 'settings',     icon: Settings,          href: '/settings' },
  { key: 'nav-feedback',  labelKey: 'feedback',     icon: MessageSquarePlus, href: '/feedback' },
];

// Zelfde admin-items als de sidebar (was een subset van 5).
const ADMIN_NAV: Array<Omit<PaletteEntry, 'label' | 'group'> & { labelKey: string }> = [
  { key: 'adm-users',     labelKey: 'adminUsers',     icon: Users,             href: '/admin/users' },
  { key: 'adm-profiles',  labelKey: 'adminProfiles',  icon: User,              href: '/admin/profielen' },
  { key: 'adm-cvs',       labelKey: 'adminCvs',       icon: FileText,          href: '/admin/cvs' },
  { key: 'adm-disputes',  labelKey: 'adminDisputes',  icon: Scale,             href: '/admin/disputes' },
  { key: 'adm-emails',    labelKey: 'adminEmails',    icon: Mail,              href: '/admin/emails' },
  { key: 'adm-templates', labelKey: 'adminTemplates', icon: LayoutTemplate,    href: '/admin/templates' },
  { key: 'adm-kanban',    labelKey: 'adminKanban',    icon: Columns3,          href: '/admin/kanban' },
  { key: 'adm-feedback',  labelKey: 'adminFeedback',  icon: MessageSquarePlus, href: '/admin/feedback' },
  { key: 'adm-platform',  labelKey: 'adminPlatform',  icon: Cpu,               href: '/admin/platform' },
];

function fmtCV(cv: CV, group: string, untitled: string): PaletteEntry {
  const company = cv.jobVacancy?.company;
  const title = cv.jobVacancy?.title;
  const label = company && title ? `${title} · ${company}` : title || cv.linkedInData?.fullName || untitled;
  return {
    group,
    key: `cv-${cv.id ?? Math.random()}`,
    label,
    icon: FileText,
    href: cv.id ? `/cv/${cv.id}` : '/cv',
  };
}

function fmtProfile(p: SavedProfile, group: string): PaletteEntry {
  return {
    group,
    key: `prof-${p.id}`,
    label: p.name || p.headline || group,
    hint: p.headline,
    icon: Users,
    href: `/profiles/${p.id}`,
  };
}

function fmtJob(j: JobSearchResult | RecentJob, group: string): PaletteEntry {
  return {
    group,
    key: `job-${j.slug}`,
    label: j.title,
    hint: j.company ?? undefined,
    icon: Briefcase,
    href: `/jobs/${j.slug}`,
  };
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { effectiveUserId, isAdmin } = useAuth();
  const t = useTranslations('commandPalette');
  const tNav = useTranslations('navigation');
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [jobResults, setJobResults] = useState<JobSearchResult[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Reset query on open + focus input + lock body scroll
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setRecentJobs(getRecentJobs());
      requestAnimationFrame(() => inputRef.current?.focus());

      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Fetch user CVs + profiles when palette opens (once per session)
  useEffect(() => {
    if (!open || !effectiveUserId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [userCvs, profRes] = await Promise.all([
          getUserCVs(effectiveUserId).catch(() => []),
          fetch('/api/profiles').then((r) => (r.ok ? r.json() : { profiles: [] })).catch(() => ({ profiles: [] })),
        ]);
        if (cancelled) return;
        setCvs(userCvs);
        if (Array.isArray(profRes?.profiles)) setProfiles(profRes.profiles);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open, effectiveUserId]);

  // Live job search when palette has a query
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setJobResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setJobsLoading(true);
      // Bug-fix: de API leest `q` (niet `query`) en geeft `results` terug
      // (niet `jobs`) — vacatures zoeken in de palette deed daardoor niets.
      void fetch(`/api/jobs/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (Array.isArray(data?.results)) setJobResults(data.results.slice(0, 6));
        })
        .catch(() => { /* ignore */ })
        .finally(() => setJobsLoading(false));
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, query]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const all: PaletteEntry[] = [];
    for (const cv of cvs.slice(0, 15)) all.push(fmtCV(cv, t('groups.cvs'), t('untitledCv')));
    for (const p of profiles.slice(0, 10)) all.push(fmtProfile(p, t('groups.profiles')));
    for (const j of jobResults.length ? jobResults : recentJobs.slice(0, 6)) all.push(fmtJob(j, t('groups.jobs')));
    all.push(...NAV_ENTRIES.map((e) => ({ ...e, group: t('groups.navigation'), label: tNav(e.labelKey) })));
    if (isAdmin) all.push(...ADMIN_NAV.map((e) => ({ ...e, group: t('groups.admin'), label: tNav(e.labelKey) })));

    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter((e) =>
      e.label.toLowerCase().includes(q) ||
      (e.hint?.toLowerCase().includes(q) ?? false) ||
      e.group.toLowerCase().includes(q),
    );
  }, [cvs, profiles, jobResults, recentJobs, query, isAdmin, t, tNav]);

  // Reset highlight when results change
  useEffect(() => { setHighlight(0); }, [query, entries.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, entries.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const entry = entries[highlight];
        if (entry) {
          router.push(entry.href);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, entries, highlight, onClose, router]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  const grouped: Record<string, PaletteEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.group]) grouped[entry.group] = [];
    grouped[entry.group].push(entry);
  }

  // Portal to <body> so we escape sticky/backdrop-filter containing blocks in the topbar.
  return createPortal(
    <div className="cmdk-backdrop" onClick={onClose} role="presentation">
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('dialogLabel')}>
        <div className="cmdk__head">
          <Search size={16} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-listbox"
            aria-activedescendant={entries[highlight] ? `cmdk-opt-${entries[highlight].key}` : undefined}
          />
          <button type="button" className="cmdk__close" onClick={onClose} aria-label={t('close')}>
            <X size={14} />
          </button>
        </div>
        <div className="cmdk__list" id="cmdk-listbox" role="listbox" aria-label={t('dialogLabel')}>
          {entries.length === 0 && (
            <div className="cmdk__empty">
              {jobsLoading ? t('searching') : t('noResults')}
            </div>
          )}
          {Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel} role="group" aria-label={groupLabel}>
              <div className="cmdk__group" aria-hidden="true">{groupLabel}</div>
              {items.map((entry) => {
                const Icon = entry.icon;
                const idx = entries.indexOf(entry);
                const active = idx === highlight;
                return (
                  <button
                    type="button"
                    key={entry.key}
                    id={`cmdk-opt-${entry.key}`}
                    role="option"
                    aria-selected={active}
                    className={`cmdk__item${active ? ' is-active' : ''}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => { router.push(entry.href); onClose(); }}
                  >
                    <Icon size={14} className="cmdk__item-icon" />
                    <span className="cmdk__item-label">{entry.label}</span>
                    {entry.hint && <span className="cmdk__item-hint">{entry.hint}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t('hintNavigate')}</span>
          <span><kbd>↵</kbd> {t('hintOpen')}</span>
          <span><kbd>esc</kbd> {t('hintClose')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
