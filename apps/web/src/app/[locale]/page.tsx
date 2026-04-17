import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchFeaturedItems,
  fetchPressGalleryItems,
} from '@/services/pressGalleryService';
import { PressGalleryClient } from './galerie-de-presse/PressGalleryClient';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pressGallery' });

  const title = `${t('title')} | La tribune des fans`;
  const description = t('description');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://fanstribune.com/${locale}`,
      siteName: 'La tribune des fans',
      locale: locale === 'fr' ? 'fr_CA' : 'en_CA',
      images: [{ url: 'https://fanstribune.com/images/fanstribune.webp', alt: title, width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://fanstribune.com/images/fanstribune.webp'],
    },
    alternates: {
      canonical: `https://fanstribune.com/${locale}`,
      languages: {
        'fr-CA': 'https://fanstribune.com/fr',
        'en-CA': 'https://fanstribune.com/en',
        'x-default': 'https://fanstribune.com/fr',
      },
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pressGallery');
  const supabase = await createClient();

  let featuredItems: Awaited<ReturnType<typeof fetchFeaturedItems>> = [];
  let initialResult: Awaited<ReturnType<typeof fetchPressGalleryItems>> = { items: [], nextCursor: null };
  let taverneItems: Awaited<ReturnType<typeof fetchPressGalleryItems>>['items'] = [];
  let communities: { id: number; name: string; slug: string; logo_url: string | null }[] = [];
  let userId: string | null = null;

  try {
    const [featured, communitiesRes, userRes] = await Promise.all([
      fetchFeaturedItems(supabase),
      supabase
        .from('communities')
        .select('id, name, slug, logo_url')
        .eq('is_active', true)
        .order('name'),
      supabase.auth.getUser(),
    ]);

    featuredItems = featured;
    communities = (communitiesRes.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logo_url: c.logo_url,
    }));
    userId = userRes.data?.user?.id ?? null;

    const excludeIds = featuredItems.map((i) => i.id);
    const taverne = communities.find((c) => c.slug === 'la-taverne');

    const [mainResult, taverneResult] = await Promise.all([
      fetchPressGalleryItems(supabase, {
        filter: 'all',
        sort: 'latest',
        limit: 12,
        excludeIds,
      }),
      taverne
        ? fetchPressGalleryItems(supabase, {
            filter: 'articles',
            sort: 'latest',
            communityId: taverne.id,
            limit: 6,
          })
        : Promise.resolve({ items: [], nextCursor: null }),
    ]);

    initialResult = mainResult;
    taverneItems = taverneResult.items;
  } catch {
    // Graceful degradation: render with empty data
  }

  const title = `${t('title')} | La tribune des fans`;
  const description = t('description');
  const items = [...featuredItems, ...initialResult.items];
  const nonce = (await headers()).get('x-nonce') ?? '';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `https://fanstribune.com/${locale}`,
      image: 'https://fanstribune.com/images/fanstribune.webp',
      inLanguage: locale === 'fr' ? 'fr-CA' : 'en-CA',
      publisher: {
        '@type': 'Organization',
        name: 'La tribune des fans',
        url: 'https://fanstribune.com',
        logo: { '@type': 'ImageObject', url: 'https://fanstribune.com/images/fanstribune.webp', width: 512, height: 512 },
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: items.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: item.type === 'article'
            ? `https://fanstribune.com/${locale}/tribunes/${item.communitySlug}/articles/${item.slug}`
            : `https://fanstribune.com/${locale}/tribunes/${item.communitySlug}/podcasts/${item.id}`,
          name: item.title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'La tribune des fans',
      alternateName: 'Fans Tribune',
      url: `https://fanstribune.com/${locale}`,
      inLanguage: locale === 'fr' ? 'fr-CA' : 'en-CA',
      potentialAction: {
        '@type': 'SearchAction',
        target: `https://fanstribune.com/${locale}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PressGalleryClient
        initialItems={initialResult.items}
        initialCursor={initialResult.nextCursor}
        featuredItems={featuredItems}
        taverneItems={taverneItems}
        communities={communities}
        userId={userId}
      />
    </>
  );
}
