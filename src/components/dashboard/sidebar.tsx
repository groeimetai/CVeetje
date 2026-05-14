'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Home,
  Settings,
  CreditCard,
  Plus,
  LogOut,
  User,
  Users,
  Menu,
  LayoutTemplate,
  Mail,
  Columns3,
  MessageSquarePlus,
  Briefcase,
  Send,
  Scale,
  Cpu,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/auth-context';
import { signOut } from '@/lib/firebase/auth';
import { getUserCVs } from '@/lib/firebase/firestore';

type IconType = typeof Home;
type NavItem = { key: string; href: string; icon: IconType; pill?: number };
type NavGroup = { label: string; items: NavItem[] };

interface SidebarCounts {
  cvs?: number;
  profiles?: number;
  applications?: number;
}

const ADMIN_NAV: NavItem[] = [
  { key: 'adminUsers', href: '/admin/users', icon: Users },
  { key: 'adminProfiles', href: '/admin/profielen', icon: User },
  { key: 'adminCvs', href: '/admin/cvs', icon: FileText },
  { key: 'adminDisputes', href: '/admin/disputes', icon: Scale },
  { key: 'adminEmails', href: '/admin/emails', icon: Mail },
  { key: 'adminTemplates', href: '/admin/templates', icon: LayoutTemplate },
  { key: 'adminKanban', href: '/admin/kanban', icon: Columns3 },
  { key: 'adminFeedback', href: '/admin/feedback', icon: MessageSquarePlus },
  { key: 'adminPlatform', href: '/admin/platform', icon: Cpu },
];

const COLLAPSE_KEY = 'cveetje-sidebar-collapsed';

function buildGroups(counts: SidebarCounts): NavGroup[] {
  return [
    {
      label: 'make',
      items: [
        { key: 'dashboard', href: '/dashboard', icon: Home },
        { key: 'myCvs', href: '/cv', icon: FileText, pill: counts.cvs },
        { key: 'profiles', href: '/profiles', icon: Users, pill: counts.profiles },
        { key: 'templates', href: '/templates', icon: LayoutTemplate },
      ],
    },
    {
      label: 'apply',
      items: [
        { key: 'jobs', href: '/jobs', icon: Briefcase },
        { key: 'applications', href: '/applications', icon: Send, pill: counts.applications },
      ],
    },
    {
      label: 'account',
      items: [
        { key: 'credits', href: '/credits', icon: CreditCard },
        { key: 'settings', href: '/settings', icon: Settings },
        { key: 'feedback', href: '/feedback', icon: MessageSquarePlus },
      ],
    },
  ];
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || (name[0] ?? 'U').toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() ?? 'U';
  return 'U';
}

function SidebarContent({
  collapsed,
  onToggle,
  onNavigate,
  counts,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  counts: SidebarCounts;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, userData, credits, freeCredits, purchasedCredits, isAdmin } = useAuth();
  const t = useTranslations('navigation');
  const tSidebar = useTranslations('sidebar');

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const displayName =
    userData?.displayName ||
    firebaseUser?.displayName ||
    (firebaseUser?.email ? firebaseUser.email.split('@')[0].replace(/^\w/, (c) => c.toUpperCase()) : null);
  const initials = getInitials(displayName, firebaseUser?.email ?? null);

  const groups = buildGroups(counts);

  return (
    <>
      <div className="dash-sb__head">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo size="sm" />
        </Link>
        {onToggle && (
          <button
            type="button"
            className="dash-sb__head-collapse"
            onClick={onToggle}
            title={collapsed ? 'Uitvouwen' : 'Inklappen'}
            aria-label={collapsed ? 'Sidebar uitvouwen' : 'Sidebar inklappen'}
          >
            <ChevronRight
              size={14}
              style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}
            />
          </button>
        )}
      </div>

      <Link href="/cv/new" onClick={onNavigate} className="dash-sb__newcv">
        <span className="brand-btn brand-btn--primary brand-btn--block" style={{ width: '100%' }}>
          <Plus size={14} />
          <span>{t('newCv')}</span>
        </span>
      </Link>

      <nav className="dash-sb__nav" aria-label="Dashboard navigation">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="dash-sb__section-label">{tSidebar(`groups.${group.label}`)}</div>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onNavigate}
                  data-active={isActive ? 'true' : undefined}
                  title={t(item.key)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon />
                  <span className="dash-sb__label">{t(item.key)}</span>
                  {item.pill != null && item.pill > 0 && <span className="pill">{item.pill}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        {isAdmin && (
          <div>
            <div className="dash-sb__section-label">{t('adminSection')}</div>
            {ADMIN_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onNavigate}
                  data-active={isActive ? 'true' : undefined}
                  title={t(item.key)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon />
                  <span className="dash-sb__label">{t(item.key)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="dash-sb__creditcard">
        <div className="dash-sb__credit-label">Credits</div>
        <div className="dash-sb__credit-num">{credits}</div>
        <div className="dash-sb__credit-meta">
          <span><strong>{freeCredits}</strong> {tSidebar('freeCredits', { count: freeCredits }).replace(/^\d+\s*/, '')}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span><strong>{purchasedCredits}</strong> {tSidebar('purchasedCredits', { count: purchasedCredits }).replace(/^\d+\s*/, '')}</span>
        </div>
        <Link href="/credits" onClick={onNavigate} className="dash-sb__credit-cta">
          + {tSidebar('buyMoreCredits')} <ArrowRight size={11} />
        </Link>
      </div>

      <div className="dash-sb__user">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="dash-sb__userbtn">
              <div className="dash-sb__avatar">{initials}</div>
              <div className="dash-sb__user-text">
                <span>{displayName || tSidebar('user')}</span>
                <span>{firebaseUser?.email}</span>
              </div>
              <ChevronRight size={14} className="dash-sb__userbtn-chev" style={{ transform: 'rotate(90deg)' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings" onClick={onNavigate}>
                <User className="mr-2 h-4 w-4" />
                {t('accountSettings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function useSidebarCounts(): SidebarCounts {
  const { firebaseUser, effectiveUserId } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>({});

  useEffect(() => {
    if (!firebaseUser || !effectiveUserId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [cvs, appsRes, profRes] = await Promise.all([
          getUserCVs(effectiveUserId).catch(() => []),
          fetch('/api/applications').catch(() => null),
          fetch('/api/profiles').catch(() => null),
        ]);
        const next: SidebarCounts = {};
        if (Array.isArray(cvs)) next.cvs = cvs.length;
        if (appsRes?.ok) {
          const data = await appsRes.json().catch(() => null);
          if (Array.isArray(data?.applications)) next.applications = data.applications.length;
        }
        if (profRes?.ok) {
          const data = await profRes.json().catch(() => null);
          if (Array.isArray(data?.profiles)) next.profiles = data.profiles.length;
        }
        if (!cancelled) setCounts(next);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [firebaseUser, effectiveUserId]);

  return counts;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const counts = useSidebarCounts();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY);
      if (stored === '1') setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <aside className={`dash-sb hidden md:flex ${collapsed ? 'dash-sb--collapsed' : ''}`}>
      <SidebarContent collapsed={collapsed} onToggle={toggle} counts={counts} />
    </aside>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const counts = useSidebarCounts();

  return (
    <div className="dash-mobile-header">
      <Link href="/dashboard">
        <Logo size="sm" />
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[var(--sidebar-w)] max-w-[300px]">
          <aside className="dash-sb" style={{ width: '100%', position: 'static', height: '100%' }}>
            <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} counts={counts} />
          </aside>
        </SheetContent>
      </Sheet>
    </div>
  );
}
