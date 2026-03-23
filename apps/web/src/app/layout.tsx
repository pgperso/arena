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
    'Plateforme communautaire sportive en direct. Rejoignez la tribune de votre équipe, chattez en temps réel, lisez des articles et écoutez des podcasts.',
  keywords: ['sport', 'tribune', 'chat en direct', 'hockey', 'baseball', 'football', 'podcast sportif', 'articles sportifs', 'communauté sportive', 'fans', 'La tribune des fans'],
  authors: [{ name: 'La tribune des fans', url: 'https://fanstribune.com' }],
  creator: 'La tribune des fans',
  publisher: 'La tribune des fans',
  openGraph: {
    type: 'website',
    locale: 'fr_CA',
    alternateLocale: 'en_CA',
    siteName: 'La tribune des fans',
    title: 'La tribune des fans - Tribunes sportives en direct',
    description:
      'Plateforme communautaire sportive en direct. Chat, articles et podcasts avec votre équipe.',
    images: [{ url: '/images/fanstribune.webp', width: 512, height: 512, alt: 'La tribune des fans' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La tribune des fans - Tribunes sportives en direct',
    description:
      'Plateforme communautaire sportive en direct. Chat, articles et podcasts avec votre équipe.',
    images: ['/images/fanstribune.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://fanstribune.com',
    languages: {
      'fr-CA': 'https://fanstribune.com/fr',
      'en-CA': 'https://fanstribune.com/en',
    },
  },
  category: 'sports',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
