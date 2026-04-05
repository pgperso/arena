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
    default: 'La tribune des fans - Sports, actualités et plein d\'autres patentes',
    template: '%s | La tribune des fans',
  },
  description:
    'La tribune des fans : sports, actualités et plein d\'autres patentes. Articles d\'opinion, podcasts, chat en direct et débats. La communauté #1 des fans au Québec.',
  keywords: [
    'tribune sportive', 'chat sport en direct', 'communauté fans hockey',
    'forum hockey', 'forum baseball', 'forum football', 'forum golf', 'PGA Tour fans',
    'Canadiens de Montréal fans', 'Blue Jays fans', 'CF Montréal fans',
    'opinion sportive', 'chronique sport', 'podcast sport québec',
    'article hockey', 'débat sportif', 'chat fans sport',
    'actualité québec', 'opinion politique', 'chronique actualité',
    'La tribune des fans', 'fanstribune',
    'sports community', 'live sports chat', 'sports fan forum',
  ],
  authors: [{ name: 'La tribune des fans', url: 'https://fanstribune.com' }],
  creator: 'La tribune des fans',
  publisher: 'La tribune des fans',
  openGraph: {
    type: 'website',
    locale: 'fr_CA',
    alternateLocale: 'en_CA',
    siteName: 'La tribune des fans',
    title: 'La tribune des fans - Sports, actualités et plein d\'autres patentes',
    description:
      'Articles d\'opinion, podcasts, chat en direct et débats. Sports, actualités et plein d\'autres patentes.',
    images: [{ url: '/images/fanstribune.webp', width: 512, height: 512, alt: 'La tribune des fans' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La tribune des fans - Sports, actualités et plein d\'autres patentes',
    description:
      'Articles d\'opinion, podcasts, chat en direct et débats. Sports, actualités et plein d\'autres patentes.',
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
