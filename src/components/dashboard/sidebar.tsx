'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LanguageSwitcher } from '@/components/language-switcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/components/auth/auth-context';
import { signOut } from '@/lib/firebase/auth';

type NavItem = { key: string; href: string; icon: typeof Home };
type NavGroup = { label: string; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  {
    label: 'make',
    items: [
      { key: 'dashboard', href: '/dashboard', icon: Home },
      { key: 'myCvs', href: '/cv', icon: FileText },
      { key: 'profiles', href: '/profiles', icon: Users },
      { key: 'templates', href: '/templates', icon: LayoutTemplate },
    ],
  },
  {
    label: 'apply',
    items: [
      { key: 'jobs', href: '/jobs', icon: Briefcase },
      { key: 'applications', href: '/applications', icon: Send },
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

const adminNavigationItems = [
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

// Sidebar content component (shared between desktop and mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, userData, credits, freeCredits, purchasedCredits, isAdmin } = useAuth();
  const t = useTranslations('navigation');
  const tSidebar = useTranslations('sidebar');

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Get the display name with proper fallbacks
  const getDisplayName = () => {
    if (userData?.displayName) {
      return userData.displayName;
    }
    if (firebaseUser?.displayName) {
      return firebaseUser.displayName;
    }
    if (firebaseUser?.email) {
      const emailName = firebaseUser.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return null;
  };

  const displayName = getDisplayName();

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return firebaseUser?.email?.[0].toUpperCase() || 'U';
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <>
      {/* Navigation */}
      <nav aria-label="Dashboard navigation" className="flex-1 px-3 py-4">
        <Link href="/cv/new" onClick={handleNavClick}>
          <Button className="w-full mb-4 brand-btn brand-btn--primary brand-btn--block">
            <Plus className="mr-2 h-4 w-4" />
            {t('newCv')}
          </Button>
        </Link>

        {navigationGroups.map((group, gi) => (
          <div key={group.label} className={gi === 0 ? '' : 'mt-5'}>
            <div className="px-3 mb-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              {tSidebar(`groups.${group.label}`)}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={handleNavClick}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    <span className="flex-1">{t(item.key)}</span>
                    {isActive && (
                      <span aria-hidden="true" className="ml-2 inline-block size-1.5 rounded-full bg-[color:var(--accent)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div className="mt-5">
            <div className="px-3 mb-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-[color:var(--accent)]">
              {t('adminSection')}
            </div>
            <div className="space-y-0.5">
              {adminNavigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={handleNavClick}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    <span className="flex-1">{t(item.key)}</span>
                    {isActive && (
                      <span aria-hidden="true" className="ml-2 inline-block size-1.5 rounded-full bg-[color:var(--accent)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Credit Display */}
      <div className="border-t px-3 py-4">
        <div className="rounded-md bg-accent/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">{tSidebar('availableCredits')}</p>
          <p className="text-2xl font-bold">{credits}</p>
          <div className="flex gap-2 text-xs text-muted-foreground mt-1">
            <span>{tSidebar('freeCredits', { count: freeCredits })}</span>
            <span>•</span>
            <span>{tSidebar('purchasedCredits', { count: purchasedCredits })}</span>
          </div>
          <Link href="/credits" onClick={handleNavClick}>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1">
              {tSidebar('buyMoreCredits')}
            </Button>
          </Link>
        </div>
      </div>

      {/* User Menu */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2">
              <Avatar className="mr-2 h-8 w-8">
                <AvatarImage src={userData?.photoURL || undefined} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-medium truncate max-w-[140px]">
                  {displayName || firebaseUser?.email || tSidebar('user')}
                </span>
                {displayName && firebaseUser?.email && (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {firebaseUser.email}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings" onClick={handleNavClick}>
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

// Desktop sidebar (hidden on mobile)
export function Sidebar() {
  return (
    <div className="hidden md:flex h-screen sticky top-0 w-64 flex-col border-r bg-card">
      {/* Logo & Theme/Language */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/dashboard">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
      <SidebarContent />
    </div>
  );
}

// Mobile header with hamburger menu
export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4">
      <Link href="/dashboard">
        <Logo size="sm" />
      </Link>
      <div className="flex items-center gap-1">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-14 items-center border-b px-4">
              <Logo size="sm" />
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
