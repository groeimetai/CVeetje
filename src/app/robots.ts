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
          '/dashboard/',
          '/settings/',
          '/credits/',
          '/admin/',
          '/cv/',
          '/profiles/',
          '/verify-email/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
