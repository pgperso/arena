import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setRequestLocale } from 'next-intl/server';
import { PodcastPlayer } from '@/components/podcast/PodcastPlayer';

export const revalidate = 300;

interface PodcastPageProps {
  params: Promise<{ locale: string; slug: string; podcastId: string }>;
}

export async function generateMetadata({ params }: PodcastPageProps) {
  const { locale, podcastId, slug } = await params;
  const id = parseInt(podcastId, 10);
  if (isNaN(id)) return { title: 'Podcast introuvable' };

  const supabase = await createClient();

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('title, description, audio_url, cover_image_url')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!podcast) return { title: 'Podcast introuvable' };

  const { title, description, audio_url, cover_image_url } = podcast as { title: string; description: string | null; audio_url: string; cover_image_url: string | null };
  const desc = description ?? `${title} — Podcast sportif sur La tribune des fans. Écoutez maintenant !`;
  const url = `https://fanstribune.com/${locale}/tribunes/${slug}/podcasts/${podcastId}`;

  return {
    title: `${title} | La tribune des fans`,
    description: desc,
    keywords: [title, 'podcast sportif', 'La tribune des fans', 'hockey', 'sports', 'audio'],
    openGraph: {
      title: `${title} | La tribune des fans`,
      description: desc,
      type: 'music.song',
      audio: audio_url,
      url,
      siteName: 'La tribune des fans',
      locale: locale === 'fr' ? 'fr_CA' : 'en_CA',
      images: cover_image_url
        ? [{ url: cover_image_url, alt: title, width: 1200, height: 630 }]
        : [{ url: 'https://fanstribune.com/images/fanstribune.webp', alt: 'La tribune des fans', width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | La tribune des fans`,
      description: desc,
      images: cover_image_url ? [cover_image_url] : ['https://fanstribune.com/images/fanstribune.webp'],
      site: '@fanstribune',
    },
    alternates: {
      canonical: url,
      languages: {
        'fr-CA': `https://fanstribune.com/fr/tribunes/${slug}/podcasts/${podcastId}`,
        'en-CA': `https://fanstribune.com/en/tribunes/${slug}/podcasts/${podcastId}`,
      },
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { locale, slug, podcastId } = await params;
  setRequestLocale(locale);
  const id = parseInt(podcastId, 10);
  if (isNaN(id)) notFound();

  const supabase = await createClient();

  // Verify community exists
  const { data: communityData } = await supabase
    .from('communities')
    .select('id, slug, name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const community = communityData as { id: number; slug: string; name: string } | null;
  if (!community) notFound();

  // Load podcast with publisher info
  const { data: podcastData } = await supabase
    .from('podcasts')
    .select('id, community_id, published_by, title, description, audio_url, cover_image_url, duration_seconds, like_count, is_published, is_removed, created_at, members:members!podcasts_published_by_fkey(username, avatar_url)')
    .eq('id', id)
    .eq('community_id', community.id)
    .eq('is_published', true)
    .single();

  if (!podcastData) notFound();

  const podcast = podcastData as {
    id: number;
    title: string;
    description: string | null;
    audio_url: string;
    cover_image_url: string | null;
    duration_seconds: number | null;
    like_count: number;
    created_at: string;
    published_by: string | null;
    members: { username: string; avatar_url: string | null } | null;
  };

  const publisher = podcast.members;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const podcastUrl = `https://fanstribune.com/${locale}/tribunes/${slug}/podcasts/${podcast.id}`;

  const podcastJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'PodcastEpisode',
      '@id': podcastUrl,
      name: podcast.title,
      description: podcast.description ?? `${podcast.title} — Podcast sportif sur La tribune des fans`,
      url: podcastUrl,
      datePublished: podcast.created_at,
      inLanguage: locale === 'fr' ? 'fr-CA' : 'en-CA',
      duration: podcast.duration_seconds ? `PT${Math.floor(podcast.duration_seconds / 60)}M${podcast.duration_seconds % 60}S` : undefined,
      associatedMedia: {
        '@type': 'MediaObject',
        contentUrl: podcast.audio_url,
        encodingFormat: 'audio/mpeg',
      },
      image: podcast.cover_image_url ?? 'https://fanstribune.com/images/fanstribune.webp',
      author: publisher ? { '@type': 'Person', name: publisher.username } : undefined,
      partOfSeries: {
        '@type': 'PodcastSeries',
        name: 'La tribune des fans',
        url: 'https://fanstribune.com',
      },
      publisher: {
        '@type': 'Organization',
        name: 'La tribune des fans',
        url: 'https://fanstribune.com',
        logo: { '@type': 'ImageObject', url: 'https://fanstribune.com/images/fanstribune.webp' },
      },
      isAccessibleForFree: true,
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: podcast.like_count,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'fr' ? 'Accueil' : 'Home', item: `https://fanstribune.com/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'Tribunes', item: `https://fanstribune.com/${locale}/tribunes` },
        { '@type': 'ListItem', position: 3, name: community.name, item: `https://fanstribune.com/${locale}/tribunes/${slug}` },
        { '@type': 'ListItem', position: 4, name: podcast.title },
      ],
    },
  ];

  return (
    <div className="overflow-y-auto bg-white dark:bg-[#1e1e1e]" style={{ height: 'calc(100dvh - 4rem)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastJsonLd).replace(/</g, '\\u003c') }}
      />
      <PodcastPlayer
        podcast={{ ...podcast, publisher }}
        communitySlug={slug}
        userId={user?.id ?? null}
      />
    </div>
  );
}
