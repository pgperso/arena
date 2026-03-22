import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fanstribune.com'),
  title: {
    default: 'La tribune des fans - Tribunes sportives en direct',
    template: '%s | La tribune des fans',
  },
  description:
    'Rejoignez la tribune de votre équipe sportive préférée. Chat en direct, podcasts et plus encore.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'La tribune des fans',
    title: 'La tribune des fans - Tribunes sportives en direct',
    description:
      'Rejoignez la tribune de votre équipe sportive préférée. Chat en direct, podcasts et plus encore.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La tribune des fans - Tribunes sportives en direct',
    description:
      'Rejoignez la tribune de votre équipe sportive préférée. Chat en direct, podcasts et plus encore.',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
