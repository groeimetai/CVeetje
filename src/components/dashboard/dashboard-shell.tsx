'use client';

import { Sidebar, MobileHeader } from '@/components/dashboard/sidebar';
import { DashTopbar } from '@/components/dashboard/topbar';
import { ImpersonationBanner } from '@/components/admin/impersonation-banner';

interface DashboardShellProps {
  children: React.ReactNode;
  /** Add 'noindex, nofollow' meta tag (default for private dashboard, off for public /jobs). */
  noIndex?: boolean;
}

/**
 * Visual shell for any logged-in surface: sidebar + topbar + main wrapper.
 * Does NOT perform auth checks — that's the parent layout's responsibility.
 */
export function DashboardShell({ children, noIndex = true }: DashboardShellProps) {
  return (
    <>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
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
