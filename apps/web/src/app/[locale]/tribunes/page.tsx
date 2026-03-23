import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { setRequestLocale } from 'next-intl/server';
import { TribunesClient } from './TribunesClient';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export const metadata = {
  title: 'Mes tribunes',
};

export default async function TribunesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: '/login', locale });

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
