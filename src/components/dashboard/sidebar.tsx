'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Home,
  Settings,
  CreditCard,
  Plus,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My CVs', href: '/cv', icon: FileText },
  { name: 'Credits', href: '/credits', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { firebaseUser, userData, credits } = useAuth();

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
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">CVeetje</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <Link href="/cv/new">
          <Button className="w-full mb-4" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New CV
          </Button>
        </Link>

        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Credit Display */}
      <div className="border-t px-3 py-4">
        <div className="rounded-md bg-accent/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Available Credits</p>
          <p className="text-2xl font-bold">{credits}</p>
          <Link href="/credits">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              Get more credits
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
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
