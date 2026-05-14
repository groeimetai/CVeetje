'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Sidebar, MobileHeader } from '@/components/dashboard/sidebar';
import { DashTopbar } from '@/components/dashboard/topbar';
import { AuthProvider, useAuth } from '@/components/auth/auth-context';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';
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

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <ImpersonationBanner />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>
      <div className="dash">
        <Sidebar />
        <div className="dash-main">
          <MobileHeader />
          <DashTopbar />
          <main id="main-content" className="dash-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
}
