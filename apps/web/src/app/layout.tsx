import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ADSENSE_CLIENT_ID } from '@arena/shared';
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'La tribune des fans',
  url: 'https://fanstribune.com',
  description:
    'Plateforme de tribunes sportives en direct : chat, articles et podcasts.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang="fr">
      <head>
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
          nonce={nonce}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <div className="flex h-screen flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
