import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { setRequestLocale } from 'next-intl/server';
import { fetchPressGalleryItems } from '@/services/pressGalleryService';
import { CommunityPageClient } from './CommunityPageClient';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export const revalidate = 300;

interface CommunityPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from('communities')
    .select('name, description, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!community) return { title: 'Tribune introuvable', robots: { index: false, follow: false } };

  const { name, description, logo_url } = community as { name: string; description: string | null; logo_url: string | null };
  const isFr = locale === 'fr';
  const desc = description
    ?? (isFr
      ? `Articles, podcasts et discussions sur ${name}. La tribune communautaire des partisans, en direct sur La tribune des fans.`
      : `Articles, podcasts and discussions about ${name}. The fan community tribune, live on Fans Tribune.`);
  const title = `${name} | La tribune des fans`;
  const url = `https://fanstribune.com/${locale}/tribunes/${slug}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: 'website',
      url,
      siteName: 'La tribune des fans',
      locale: isFr ? 'fr_CA' : 'en_CA',
      images: logo_url
        ? [{ url: logo_url, alt: name, width: 512, height: 512 }]
        : [{ url: 'https://fanstribune.com/images/fanstribune.webp', alt: 'La tribune des fans', width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: logo_url ? [logo_url] : ['https://fanstribune.com/images/fanstribune.webp'],
    },
    alternates: {
      canonical: url,
      languages: {
        'fr-CA': `https://fanstribune.com/fr/tribunes/${slug}`,
        'en-CA': `https://fanstribune.com/en/tribunes/${slug}`,
        'x-default': `https://fanstribune.com/fr/tribunes/${slug}`,
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

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  // Load community + user in parallel
  const [{ data }, { data: { user } }] = await Promise.all([
    supabase
      .from('communities')
      .select('id, name, slug, description, primary_color, logo_url, member_count, is_active, created_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .single(),
    supabase.auth.getUser(),
  ]);

  const community = data as CommunityRow | null;
  if (!community) notFound();

  // Load latest published articles + podcasts for this community (public hub content)
  const [hubResult, hubPodcastsResult] = await Promise.all([
    fetchPressGalleryItems(supabase, {
      filter: 'articles',
      sort: 'latest',
      communityId: community.id,
      limit: 12,
    }),
    fetchPressGalleryItems(supabase, {
      filter: 'podcasts',
      sort: 'latest',
      communityId: community.id,
      limit: 6,
    }),
  ]);

  const hubArticles = hubResult.items;
  const hubPodcasts = hubPodcastsResult.items;

  let isMember = false;
  let canModerate = false;
  let canCreateContent = false;
  let isMuted = false;

  if (user) {
    // Run membership, local roles, global owner check, restrictions in parallel
    const [{ data: membership }, { data: localRoles }, { data: globalOwner }, { data: restrictions }] = await Promise.all([
      supabase
        .from('community_members')
        .select('id')
        .eq('community_id', community.id)
        .eq('member_id', user.id)
        .single(),
      // Arbitre check — per tribune
      supabase
        .from('community_member_roles')
        .select('role_id, roles(code)')
        .eq('community_id', community.id)
        .eq('member_id', user.id),
      // Propriétaire check — any tribune (global)
      supabase
        .from('community_member_roles')
        .select('id, roles!inner(code)')
        .eq('member_id', user.id)
        .eq('roles.code', 'owner')
        .limit(1),
      supabase
        .from('member_restrictions')
        .select('id')
        .eq('community_id', community.id)
        .eq('member_id', user.id)
        .eq('restriction_type', 'chat:mute')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`),
    ]);

    isMember = !!membership;

    const isOwner = ((globalOwner as unknown[] | null)?.length ?? 0) > 0;
    if (isOwner) {
      canModerate = true;
      canCreateContent = true;
    } else if (localRoles) {
      const roleCodes = (localRoles as { roles: { code: string } | null }[]).map((r) => r.roles?.code);
      canModerate = roleCodes.some((c) => c === 'admin' || c === 'moderator');
      canCreateContent = canModerate || roleCodes.some((c) => c === 'creator');
    }

    isMuted = ((restrictions as { id: number }[] | null)?.length ?? 0) > 0;
  }

  // Load staff roles for rank display:
  // 1. Local arbitres (per tribune)
  // 2. Global owners (any tribune)
  const [{ data: localStaff }, { data: globalOwners }] = await Promise.all([
    supabase
      .from('community_member_roles')
      .select('member_id, roles(code)')
      .eq('community_id', community.id),
    supabase
      .from('community_member_roles')
      .select('member_id, roles!inner(code)')
      .eq('roles.code', 'owner'),
  ]);

  // Global owners first, then local roles override
  const staffRoles: Record<string, string> = {};
  for (const r of (globalOwners ?? []) as { member_id: string; roles: { code: string } | null }[]) {
    if (r.roles?.code) staffRoles[r.member_id] = r.roles.code;
  }
  for (const r of (localStaff ?? []) as { member_id: string; roles: { code: string } | null }[]) {
    if (r.roles?.code) staffRoles[r.member_id] = r.roles.code;
  }

  // Public JSON-LD so the hub is discoverable and structured for Google.
  const url = `https://fanstribune.com/${locale}/tribunes/${slug}`;
  const hubItems = [...hubArticles, ...hubPodcasts];
  const nonce = (await headers()).get('x-nonce') ?? '';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': url,
      name: `${community.name} | La tribune des fans`,
      description: community.description ?? `Articles, podcasts et discussions sur ${community.name}.`,
      url,
      inLanguage: locale === 'fr' ? 'fr-CA' : 'en-CA',
      image: community.logo_url ?? 'https://fanstribune.com/images/fanstribune.webp',
      publisher: {
        '@type': 'Organization',
        name: 'La tribune des fans',
        url: 'https://fanstribune.com',
        logo: { '@type': 'ImageObject', url: 'https://fanstribune.com/images/fanstribune.webp', width: 512, height: 512 },
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: hubItems.map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: item.type === 'article'
            ? `https://fanstribune.com/${locale}/tribunes/${community.slug}/articles/${item.slug}`
            : `https://fanstribune.com/${locale}/tribunes/${community.slug}/podcasts/${item.id}`,
          name: item.title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'fr' ? 'Accueil' : 'Home', item: `https://fanstribune.com/${locale}` },
        { '@type': 'ListItem', position: 2, name: community.name, item: url },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <CommunityPageClient
        key={`${community.id}-${isMember}`}
        community={community}
        isMember={isMember}
        canModerate={canModerate}
        canCreateContent={canCreateContent}
        isMuted={isMuted}
        userId={user?.id ?? null}
        staffRoles={staffRoles}
        hubArticles={hubArticles}
        hubPodcasts={hubPodcasts}
      />
    </>
  );
}
