import { JobsChrome } from '@/components/jobs/jobs-chrome';

export default async function JobsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <JobsChrome locale={locale}>{children}</JobsChrome>;
}
