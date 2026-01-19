import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVeetje - AI-Powered CV Builder',
    description: 'Create professional, tailored CVs from your LinkedIn profile in minutes.',
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
    <html lang={locale || 'nl'} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
