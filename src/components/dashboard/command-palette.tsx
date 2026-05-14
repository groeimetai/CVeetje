'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
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
} from 'lucide-react';

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

const NAV_ENTRIES: PaletteEntry[] = [
  { group: 'Navigatie', key: 'nav-dashboard', label: 'Dashboard',       icon: Home,              href: '/dashboard' },
  { group: 'Navigatie', key: 'nav-cv',        label: "Mijn CV's",        icon: FileText,          href: '/cv' },
  { group: 'Navigatie', key: 'nav-profiles',  label: 'Profielen',        icon: Users,             href: '/profiles' },
  { group: 'Navigatie', key: 'nav-templates', label: 'Templates',        icon: LayoutTemplate,    href: '/templates' },
  { group: 'Navigatie', key: 'nav-jobs',      label: 'Vacatures',        icon: Briefcase,         href: '/jobs' },
  { group: 'Navigatie', key: 'nav-apps',      label: 'Sollicitaties',    icon: Send,              href: '/applications' },
  { group: 'Navigatie', key: 'nav-credits',   label: 'Credits',          icon: CreditCard,        href: '/credits' },
  { group: 'Navigatie', key: 'nav-settings',  label: 'Instellingen',     icon: Settings,          href: '/settings' },
  { group: 'Navigatie', key: 'nav-feedback',  label: 'Feedback',         icon: MessageSquarePlus, href: '/feedback' },
];

const ADMIN_NAV: PaletteEntry[] = [
  { group: 'Admin', key: 'adm-users',     label: 'Admin · Users',     icon: Users,             href: '/admin/users' },
  { group: 'Admin', key: 'adm-cvs',       label: 'Admin · CVs',       icon: FileText,          href: '/admin/cvs' },
  { group: 'Admin', key: 'adm-disputes',  label: 'Admin · Disputes',  icon: Scale,             href: '/admin/disputes' },
  { group: 'Admin', key: 'adm-platform',  label: 'Admin · Platform',  icon: Cpu,               href: '/admin/platform' },
  { group: 'Admin', key: 'adm-feedback',  label: 'Admin · Feedback',  icon: MessageSquarePlus, href: '/admin/feedback' },
];

function fmtCV(cv: CV): PaletteEntry {
  const company = cv.jobVacancy?.company;
  const title = cv.jobVacancy?.title;
  const label = company && title ? `${title} · ${company}` : title || cv.linkedInData?.fullName || 'Naamloos CV';
  return {
    group: "CV's",
    key: `cv-${cv.id ?? Math.random()}`,
    label,
    hint: cv.status,
    icon: FileText,
    href: cv.id ? `/cv/${cv.id}` : '/cv',
  };
}

function fmtProfile(p: SavedProfile): PaletteEntry {
  return {
    group: 'Profielen',
    key: `prof-${p.id}`,
    label: p.name || p.headline || 'Profiel',
    hint: p.headline,
    icon: Users,
    href: `/profiles/${p.id}`,
  };
}

function fmtJob(j: JobSearchResult | RecentJob): PaletteEntry {
  return {
    group: 'Vacatures',
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [jobResults, setJobResults] = useState<JobSearchResult[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Reset query on open + focus input
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setRecentJobs(getRecentJobs());
      requestAnimationFrame(() => inputRef.current?.focus());
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
      void fetch(`/api/jobs/search?query=${encodeURIComponent(query)}&limit=6`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (Array.isArray(data?.jobs)) setJobResults(data.jobs.slice(0, 6));
        })
        .catch(() => { /* ignore */ })
        .finally(() => setJobsLoading(false));
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, query]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const all: PaletteEntry[] = [];
    for (const cv of cvs.slice(0, 15)) all.push(fmtCV(cv));
    for (const p of profiles.slice(0, 10)) all.push(fmtProfile(p));
    for (const j of jobResults.length ? jobResults : recentJobs.slice(0, 6)) all.push(fmtJob(j));
    all.push(...NAV_ENTRIES);
    if (isAdmin) all.push(...ADMIN_NAV);

    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter((e) =>
      e.label.toLowerCase().includes(q) ||
      (e.hint?.toLowerCase().includes(q) ?? false) ||
      e.group.toLowerCase().includes(q),
    );
  }, [cvs, profiles, jobResults, recentJobs, query, isAdmin]);

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

  const grouped: Record<string, PaletteEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.group]) grouped[entry.group] = [];
    grouped[entry.group].push(entry);
  }

  return (
    <div className="cmdk-backdrop" onClick={onClose} role="presentation">
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Zoeken">
        <div className="cmdk__head">
          <Search size={16} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek CV's, vacatures, profielen…"
            aria-label="Zoek-input"
          />
          <button type="button" className="cmdk__close" onClick={onClose} aria-label="Sluiten">
            <X size={14} />
          </button>
        </div>
        <div className="cmdk__list">
          {entries.length === 0 && (
            <div className="cmdk__empty">
              {jobsLoading ? 'Bezig met zoeken…' : 'Geen resultaten.'}
            </div>
          )}
          {Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div className="cmdk__group">{groupLabel}</div>
              {items.map((entry) => {
                const Icon = entry.icon;
                const idx = entries.indexOf(entry);
                const active = idx === highlight;
                return (
                  <button
                    type="button"
                    key={entry.key}
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
          <span><kbd>↑</kbd><kbd>↓</kbd> navigeren</span>
          <span><kbd>↵</kbd> openen</span>
          <span><kbd>esc</kbd> sluiten</span>
        </div>
      </div>
    </div>
  );
}
