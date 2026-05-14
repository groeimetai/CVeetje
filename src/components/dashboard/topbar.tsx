'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Bell, ChevronRight, MessageSquarePlus, Search } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { CommandPalette } from '@/components/dashboard/command-palette';

/** Maps a URL segment to the navigation-namespace key. Only segments listed
 *  here go through translation; anything else (CV id, etc.) falls back to a
 *  capitalized segment name. */
const SEGMENT_KEYS: Record<string, string> = {
  dashboard: 'dashboard',
  cv: 'myCvs',
  profiles: 'profiles',
  templates: 'templates',
  jobs: 'jobs',
  applications: 'applications',
  credits: 'credits',
  settings: 'settings',
  feedback: 'feedback',
  admin: 'adminSection',
  new: 'new',
  edit: 'edit',
  preview: 'preview',
};

function titleCase(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getPageKey(pathname: string): { crumbRoot: string; pageKey: string | null } {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'admin') {
    return { crumbRoot: 'admin', pageKey: segments[1] ?? null };
  }
  const root = segments[0] ?? 'dashboard';
  const nested = segments[1];
  return {
    crumbRoot: root === 'dashboard' ? 'dashboard' : root,
    pageKey: nested ?? null,
  };
}

export function DashTopbar() {
  const pathname = usePathname();
  const t = useTranslations('navigation');
  const tDashboard = useTranslations('dashboard');
  const [isMac, setIsMac] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setIsMac(/Mac/i.test(navigator.platform));
  }, []);

  // Global ⌘K / Ctrl-K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const { crumbRoot, pageKey } = useMemo(() => getPageKey(pathname), [pathname]);

  const rootLabel = crumbRoot === 'admin' ? t('adminSection') : t('dashboard');
  let pageLabel: string;
  if (crumbRoot === 'dashboard') {
    pageLabel = tDashboard('overview');
  } else if (pageKey && SEGMENT_KEYS[pageKey]) {
    pageLabel = t(SEGMENT_KEYS[pageKey]);
  } else if (pageKey) {
    pageLabel = titleCase(pageKey);
  } else if (SEGMENT_KEYS[crumbRoot]) {
    pageLabel = t(SEGMENT_KEYS[crumbRoot]);
  } else {
    pageLabel = titleCase(crumbRoot);
  }

  return (
    <div className="dash-topbar">
      <div className="dash-topbar__crumb">
        <span>{rootLabel}</span>
        <ChevronRight size={12} />
        <strong>{pageLabel}</strong>
      </div>

      <button
        type="button"
        className="dash-topbar__search"
        onClick={openPalette}
        aria-label={tDashboard('searchPlaceholder')}
      >
        <Search />
        <input
          type="search"
          placeholder={tDashboard('searchPlaceholder')}
          readOnly
          onClick={(e) => { e.preventDefault(); openPalette(); }}
        />
        <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>

      <div className="dash-topbar__icons">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <Link href="/feedback" className="dash-topbar__icon-btn" title={t('feedback')} aria-label={t('feedback')}>
          <MessageSquarePlus size={16} />
        </Link>
        <button type="button" className="dash-topbar__icon-btn" title="Notificaties" aria-label="Notificaties">
          <Bell size={16} />
        </button>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
