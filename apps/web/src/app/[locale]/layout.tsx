import { headers } from 'next/headers';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TribuneProvider } from '@/contexts/TribuneContext';
import { ADSENSE_CLIENT_ID } from '@arena/shared';
import { routing } from '@/i18n/routing';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: 'La tribune des fans',
    url: 'https://fanstribune.com',
    logo: 'https://fanstribune.com/images/fanstribune.webp',
    description: 'Plateforme communautaire sportive en direct : chat, articles et podcasts pour les fans de hockey, baseball, football et plus.',
    sameAs: [],
    sport: ['Hockey', 'Baseball', 'Football', 'Basketball', 'Soccer'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'La tribune des fans',
    url: 'https://fanstribune.com',
    inLanguage: ['fr-CA', 'en-CA'],
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://fanstribune.com/fr/tribunes/{search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: "C'est quoi La tribune des fans ?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: "La tribune des fans est une plateforme communautaire sportive en direct. Rejoignez des tribunes dédiées à vos équipes favorites pour chatter en temps réel, lire des articles et écouter des podcasts.",
        },
      },
      {
        '@type': 'Question',
        name: 'Comment rejoindre une tribune sportive ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Créez un compte gratuit sur fanstribune.com, puis accédez à la liste des tribunes disponibles. Cliquez sur 'Rejoindre' pour intégrer la tribune de votre équipe favorite.",
        },
      },
      {
        '@type': 'Question',
        name: 'Est-ce que La tribune des fans est gratuit ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Oui, La tribune des fans est entièrement gratuit. Vous pouvez rejoindre des tribunes, chatter, lire des articles et écouter des podcasts sans frais.",
        },
      },
    ],
  },
];

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const nonce = (await headers()).get('x-nonce') ?? '';

  return (
    <html lang={locale}>
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
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <TribuneProvider>
            <div className="flex flex-1 min-h-dvh flex-col">
              <Header />
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
              <Footer />
            </div>
          </TribuneProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
