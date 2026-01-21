'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth/auth-context';
import { Loader2, ShieldX } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading, firebaseUser } = useAuth();
  const router = useRouter();
  const t = useTranslations('admin');

  useEffect(() => {
    // If not loading and user is not admin, redirect to dashboard
    if (!loading && firebaseUser && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, loading, firebaseUser, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShieldX className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">{t('accessDenied')}</h1>
        <p className="text-muted-foreground">{t('adminRequired')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
