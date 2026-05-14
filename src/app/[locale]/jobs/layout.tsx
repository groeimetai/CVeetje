import { AuthProvider } from '@/components/auth/auth-context';
import { JobsShell } from '@/components/jobs/jobs-shell';
import '@/styles/dashboard.css';

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <JobsShell>{children}</JobsShell>
    </AuthProvider>
  );
}
