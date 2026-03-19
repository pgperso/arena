import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VestiaireClient } from './VestiaireClient';
import { Footer } from '@/components/layout/Footer';
import type { Database } from '@arena/supabase-client';

export const metadata: Metadata = {
  title: 'Mon vestiaire',
};

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export default async function VestiairePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/vestiaire');
  }

  // Fetch member profile
  const { data: member } = await supabase
    .from('members')
    .select('id, username, email, avatar_url, description, created_at')
    .eq('id', user.id)
    .single();

  // Fetch communities the user belongs to
  const { data: memberships } = await supabase
    .from('community_members')
    .select('community_id, joined_at')
    .eq('member_id', user.id);

  let communities: CommunityRow[] = [];
  if (memberships && memberships.length > 0) {
    const communityIds = memberships.map((m) => m.community_id);
    const { data } = await supabase
      .from('communities')
      .select('id, name, slug, description, member_count, primary_color, logo_url')
      .in('id', communityIds)
      .eq('is_active', true)
      .order('name');
    communities = (data ?? []) as CommunityRow[];
  }

  // Fetch admin/moderator roles (join roles table to get role code)
  const { data: memberRoles } = await supabase
    .from('community_member_roles')
    .select('community_id, roles(code)')
    .eq('member_id', user.id);

  const roleMap = new Map<number, string>();
  memberRoles?.forEach((r) => {
    const role = r.roles as unknown as { code: string } | null;
    if (role) roleMap.set(r.community_id, role.code);
  });

  // Fetch admin stats for communities where user is admin/mod
  const adminCommunityIds = Array.from(roleMap.keys());
  let adminStats: Record<number, { articles: number; drafts: number; podcasts: number }> = {};

  if (adminCommunityIds.length > 0) {
    const [articlesRes, draftsRes, podcastsRes] = await Promise.all([
      supabase
        .from('articles')
        .select('community_id', { count: 'exact', head: false })
        .in('community_id', adminCommunityIds)
        .eq('is_published', true)
        .eq('is_removed', false),
      supabase
        .from('articles')
        .select('community_id', { count: 'exact', head: false })
        .in('community_id', adminCommunityIds)
        .eq('is_published', false)
        .eq('is_removed', false),
      supabase
        .from('podcasts')
        .select('community_id', { count: 'exact', head: false })
        .in('community_id', adminCommunityIds)
        .eq('is_published', true)
        .or('is_removed.eq.false,is_removed.is.null'),
    ]);

    // Count per community
    const stats: Record<number, { articles: number; drafts: number; podcasts: number }> = {};
    for (const id of adminCommunityIds) {
      stats[id] = { articles: 0, drafts: 0, podcasts: 0 };
    }
    (articlesRes.data ?? []).forEach((r) => { if (stats[r.community_id]) stats[r.community_id].articles++; });
    (draftsRes.data ?? []).forEach((r) => { if (stats[r.community_id]) stats[r.community_id].drafts++; });
    (podcastsRes.data ?? []).forEach((r) => { if (stats[r.community_id]) stats[r.community_id].podcasts++; });
    adminStats = stats;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <VestiaireClient
          member={member}
          communities={communities}
          roleMap={Object.fromEntries(roleMap)}
          adminStats={adminStats}
          userEmail={user.email ?? ''}
        />
      </div>
      <Footer />
    </div>
  );
}
