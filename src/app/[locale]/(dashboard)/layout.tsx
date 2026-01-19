'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Sidebar, MobileHeader } from '@/components/dashboard/sidebar';
import { AuthProvider, useAuth } from '@/components/auth/auth-context';
import { Footer } from '@/components/footer';
import { Loader2 } from 'lucide-react';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login');
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        <MobileHeader />
        <main className="flex-1 overflow-auto flex flex-col">
          <div className="container mx-auto p-4 md:p-6 flex-1">{children}</div>
          <Footer minimal />
        </main>
      </div>
    </div>
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
