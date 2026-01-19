'use client';

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
import { useAuth } from '@/components/auth/auth-context';
import { signOut } from '@/lib/firebase/auth';

const navigationItems = [
  { key: 'dashboard', href: '/dashboard', icon: Home },
  { key: 'profiles', href: '/profiles', icon: Users },
  { key: 'myCvs', href: '/cv', icon: FileText },
  { key: 'credits', href: '/credits', icon: CreditCard },
  { key: 'settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, userData, credits, freeCredits, purchasedCredits } = useAuth();
  const t = useTranslations('navigation');
  const tSidebar = useTranslations('sidebar');
  const tCommon = useTranslations('common');

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const getInitials = () => {
    if (userData?.displayName) {
      return userData.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return firebaseUser?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
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

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <Link href="/cv/new">
          <Button className="w-full mb-4" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('newCv')}
          </Button>
        </Link>

        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
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
          <Link href="/credits">
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
                  {userData?.displayName || 'User'}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {firebaseUser?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings">
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
    </div>
  );
}
