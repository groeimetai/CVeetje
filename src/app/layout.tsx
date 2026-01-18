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
  title: 'CVeetje - AI-Powered CV Builder',
  description: 'Create professional, tailored CVs from your LinkedIn profile in minutes. AI-powered CV generation with job-specific optimization.',
  keywords: ['CV builder', 'resume builder', 'AI CV', 'LinkedIn CV', 'professional CV'],
  authors: [{ name: 'CVeetje' }],
  openGraph: {
    title: 'CVeetje - AI-Powered CV Builder',
    description: 'Create professional, tailored CVs from your LinkedIn profile in minutes.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
