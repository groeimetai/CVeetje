'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, MessageSquarePlus, Search } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { CommandPalette, OPEN_PALETTE_EVENT } from '@/components/dashboard/command-palette';

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

/** Admin-subpagina's → navigation-keys (voorheen Engelse title-case "Users"). */
const ADMIN_KEYS: Record<string, string> = {
  users: 'adminUsers',
  profielen: 'adminProfiles',
  cvs: 'adminCvs',
  disputes: 'adminDisputes',
  emails: 'adminEmails',
  templates: 'adminTemplates',
  kanban: 'adminKanban',
  feedback: 'adminFeedback',
  platform: 'adminPlatform',
};

/** Root-segment → href voor de klikbare eerste breadcrumb. */
const ROOT_HREF: Record<string, string> = {
  cv: '/cv',
  profiles: '/profiles',
  jobs: '/jobs',
  admin: '/admin/users',
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
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const { crumbRoot, pageKey } = useMemo(() => getPageKey(pathname), [pathname]);

  // Breadcrumb: [sectie] › [pagina]. Onbekende sub-segmenten (CV-/profiel-
  // ID's) tonen "Details" i.p.v. een ge-title-cased ruwe ID.
  let rootLabel: string;
  let pageLabel: string;
  if (crumbRoot === 'admin') {
    rootLabel = t('adminSection');
    pageLabel = pageKey && ADMIN_KEYS[pageKey] ? t(ADMIN_KEYS[pageKey]) : t('adminSection');
  } else if (crumbRoot === 'dashboard') {
    rootLabel = t('dashboard');
    pageLabel = tDashboard('overview');
  } else if (pageKey) {
    rootLabel = SEGMENT_KEYS[crumbRoot] ? t(SEGMENT_KEYS[crumbRoot]) : titleCase(crumbRoot);
    pageLabel = SEGMENT_KEYS[pageKey] ? t(SEGMENT_KEYS[pageKey]) : t('details');
  } else {
    rootLabel = t('dashboard');
    pageLabel = SEGMENT_KEYS[crumbRoot] ? t(SEGMENT_KEYS[crumbRoot]) : titleCase(crumbRoot);
  }
  const rootHref = pageKey && ROOT_HREF[crumbRoot] ? ROOT_HREF[crumbRoot] : crumbRoot === 'dashboard' ? null : '/dashboard';

  return (
    <div className="dash-topbar">
      <div className="dash-topbar__crumb">
        {rootHref ? <Link href={rootHref}>{rootLabel}</Link> : <span>{rootLabel}</span>}
        <ChevronRight size={12} aria-hidden="true" />
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
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
