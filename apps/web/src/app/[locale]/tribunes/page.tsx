import type { Metadata } from 'next';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { setRequestLocale } from 'next-intl/server';
import { TribunesClient } from './TribunesClient';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === 'fr';
  const title = isFr
    ? 'Mes tribunes | La tribune des fans'
    : 'My tribunes | Fans Tribune';
  const description = isFr
    ? 'Accédez à vos tribunes sportives et rejoignez de nouvelles communautés.'
    : 'Access your sports tribunes and join new communities.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://fanstribune.com/${locale}/tribunes`,
      siteName: 'La tribune des fans',
      locale: isFr ? 'fr_CA' : 'en_CA',
      images: [{ url: 'https://fanstribune.com/images/fanstribune.webp', alt: 'La tribune des fans', width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://fanstribune.com/images/fanstribune.webp'],
    },
    alternates: {
      canonical: `https://fanstribune.com/${locale}/tribunes`,
      languages: {
        'fr-CA': 'https://fanstribune.com/fr/tribunes',
        'en-CA': 'https://fanstribune.com/en/tribunes',
        'x-default': 'https://fanstribune.com/fr/tribunes',
      },
    },
    robots: { index: false, follow: false },
  };
}

export default async function TribunesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // Non-logged-in visitors (including Googlebot) get sent to the home, which
  // is the public Press Gallery, instead of a login wall.
  if (!user) return redirect({ href: '/', locale });

  // Fetch user's joined communities
  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('member_id', user.id);

  const joinedIds = (memberships ?? []).map((m) => m.community_id);

  let communities: CommunityRow[] = [];
  if (joinedIds.length > 0) {
    const { data } = await supabase
      .from('communities')
      .select('id, name, slug, description, member_count, primary_color, logo_url')
      .in('id', joinedIds)
      .eq('is_active', true)
      .order('name');
    communities = (data ?? []) as CommunityRow[];
  }

  return (
    <TribunesClient
      communities={communities}
      userId={user.id}
      memberCommunityIds={joinedIds}
    />
  );
}
