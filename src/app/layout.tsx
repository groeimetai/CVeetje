import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider, AppearanceScript } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'CVeetje - AI-Powered CV Builder',
    template: '%s | CVeetje',
  },
  description: 'Create professional, tailored CVs from your LinkedIn profile in minutes. AI-powered CV generation with job-specific optimization.',
  keywords: ['CV builder', 'resume builder', 'AI CV', 'LinkedIn CV', 'professional CV', 'CV generator', 'sollicitatie'],
  authors: [{ name: 'CVeetje', url: 'https://cveetje.nl' }],
  creator: 'CVeetje',
  publisher: 'CVeetje',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl'),
  openGraph: {
    title: 'CVeetje - AI-Powered CV Builder',
    description: 'Create professional, tailored CVs from your LinkedIn profile in minutes.',
    type: 'website',
    siteName: 'CVeetje',
    locale: 'nl_NL',
    alternateLocale: 'en_US',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'CVeetje - AI-Powered CV Builder' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVeetje - AI-Powered CV Builder',
    description: 'Create professional, tailored CVs from your LinkedIn profile in minutes.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

type RootLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
};

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params;

  return (
    <html
      lang={locale || 'nl'}
      data-theme="light"
      data-palette="clay"
      data-density="comfortable"
      data-fontpair="editorial"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap"
        />
        <AppearanceScript />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
