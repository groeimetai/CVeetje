import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/cv/*',  // User CVs are private
          '/dashboard',
          '/settings',
          '/credits',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
