import { createClient } from '@/lib/supabase/server';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import {
  fetchHeroArticle,
  fetchPressGalleryItems,
} from '@/services/pressGalleryService';
import { PressGalleryClient } from './PressGalleryClient';
import type { Metadata } from 'next';

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
    },
    alternates: {
      canonical: `/${locale}/galerie-de-presse`,
      languages: {
        fr: '/fr/galerie-de-presse',
        en: '/en/galerie-de-presse',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PressGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pressGallery');
  const supabase = await createClient();

  // Fetch data in parallel
  const [heroArticle, initialItems, communitiesRes, userRes] =
    await Promise.all([
      fetchHeroArticle(supabase),
      fetchPressGalleryItems(supabase, {
        filter: 'all',
        sort: 'latest',
        offset: 0,
        limit: 12,
      }),
      supabase
        .from('communities')
        .select('id, name, slug, logo_url')
        .eq('is_active', true)
        .order('name'),
      supabase.auth.getUser(),
    ]);

  const communities = (communitiesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo_url: c.logo_url,
  }));

  const userId = userRes.data?.user?.id ?? null;

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('title'),
    description: t('description'),
    url: `https://latribunedesfans.com/${locale}/galerie-de-presse`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PressGalleryClient
        initialItems={initialItems}
        heroArticle={heroArticle}
        communities={communities}
        userId={userId}
      />
    </>
  );
}
