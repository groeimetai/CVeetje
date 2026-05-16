import { MetadataRoute } from 'next';
import { listRecentCachedJobSlugs } from '@/lib/jobs/cache';
import { listAllSlugs as listAllBlogSlugs } from '@/content/blog';
import { allPersonaSlugs } from '@/content/personas';
import { allRolePageSlugs } from '@/content/role-pages';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';
  const locales = ['nl', 'en'] as const;

  const publicRoutes = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/jobs', changeFrequency: 'hourly' as const, priority: 0.9 },
    { path: '/blog', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/voor', changeFrequency: 'monthly' as const, priority: 0.85 },
    { path: '/faq', changeFrequency: 'monthly' as const, priority: 0.85 },
    { path: '/cv-voorbeeld', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/cv-template', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/motivatiebrief-generator', changeFrequency: 'monthly' as const, priority: 0.85 },
    { path: '/cv-op-maat-maken', changeFrequency: 'monthly' as const, priority: 0.85 },
    { path: '/cv-stijlen', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.85 },
    { path: '/login', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/register', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/ai-transparency', changeFrequency: 'yearly' as const, priority: 0.4 },
    { path: '/compliance', changeFrequency: 'yearly' as const, priority: 0.4 },
    { path: '/cookies', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/sub-processors', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  const staticEntries = publicRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
  );

  const blogEntries: MetadataRoute.Sitemap = listAllBlogSlugs().map((s) => ({
    url: `${baseUrl}/${s.locale}/blog/${s.slug}`,
    lastModified: new Date(s.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const personaEntries: MetadataRoute.Sitemap = allPersonaSlugs().map((s) => ({
    url: `${baseUrl}/${s.locale}/voor/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const rolePageEntries: MetadataRoute.Sitemap = allRolePageSlugs().map((s) => ({
    url: `${baseUrl}/${s.locale}/${s.kind === 'voorbeeld' ? 'cv-voorbeeld' : 'cv-template'}/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

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

  return [...staticEntries, ...blogEntries, ...personaEntries, ...rolePageEntries, ...jobEntries];
}
