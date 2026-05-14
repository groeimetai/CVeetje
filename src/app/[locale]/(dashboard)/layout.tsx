'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/components/auth/auth-context';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Loader2 } from 'lucide-react';
import '@/styles/dashboard.css';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { firebaseUser, emailVerified, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
    }
  }, [firebaseUser, loading, router]);

  useEffect(() => {
    if (!loading && firebaseUser && !emailVerified) {
      router.push('/verify-email');
    }
  }, [firebaseUser, emailVerified, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!firebaseUser || !emailVerified) return null;

  return <DashboardShell noIndex>{children}</DashboardShell>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthProvider is now in [locale]/layout.tsx so /jobs etc. share the same context.
  return <DashboardContent>{children}</DashboardContent>;
}
