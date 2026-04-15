import { MetadataRoute } from 'next';
import { listRecentCachedJobSlugs } from '@/lib/jobs/cache';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';
  const locales = ['nl', 'en'];

  const publicRoutes = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/jobs', changeFrequency: 'hourly' as const, priority: 0.9 },
    { path: '/login', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/register', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/ai-transparency', changeFrequency: 'yearly' as const, priority: 0.4 },
  ];

  const staticEntries = publicRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  );

  let jobEntries: MetadataRoute.Sitemap = [];
  try {
    const jobs = await listRecentCachedJobSlugs(5000);
    jobEntries = jobs.flatMap((job) =>
      locales.map((locale) => ({
        url: `${baseUrl}/${locale}/jobs/${job.slug}`,
        lastModified: new Date(job.fetchedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    );
  } catch (err) {
    console.warn('[sitemap] failed to list jobs', err);
  }

  return [...staticEntries, ...jobEntries];
}
