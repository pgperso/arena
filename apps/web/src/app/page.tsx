import { createClient } from '@/lib/supabase/server';
import { CommunityGrid } from '@/components/community/CommunityGrid';
import { TrendingMessages } from '@/components/home/TrendingMessages';
import { AdBanner } from '@/components/ads/AdBanner';
import type { Database } from '@arena/supabase-client';

export const revalidate = 60;

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export default async function HomePage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [communitiesRes, popularRes, controversialRes] = await Promise.all([
    supabase
      .from('communities')
      .select('id, name, slug, description, member_count, primary_color, logo_url')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(100),
    supabase
      .from('chat_messages')
      .select('id, content, like_count, dislike_count, created_at, members!chat_messages_member_id_fkey(username, avatar_url), communities!chat_messages_community_id_fkey(name, slug)')
      .not('content', 'is', null)
      .is('repost_of_id', null)
      .eq('is_removed', false)
      .gte('created_at', sevenDaysAgo)
      .gt('like_count', 0)
      .order('like_count', { ascending: false })
      .limit(3),
    supabase
      .from('chat_messages')
      .select('id, content, like_count, dislike_count, created_at, members!chat_messages_member_id_fkey(username, avatar_url), communities!chat_messages_community_id_fkey(name, slug)')
      .not('content', 'is', null)
      .is('repost_of_id', null)
      .eq('is_removed', false)
      .gte('created_at', sevenDaysAgo)
      .gt('dislike_count', 0)
      .order('dislike_count', { ascending: false })
      .limit(3),
  ]);

  const communities = (communitiesRes.data ?? []) as CommunityRow[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapTrending(rows: any[]) {
    return rows
      .filter((r) => r.members && r.communities)
      .map((r) => ({
        id: r.id as number,
        content: r.content as string,
        likeCount: r.like_count as number,
        dislikeCount: r.dislike_count as number,
        createdAt: r.created_at as string,
        username: r.members.username as string,
        avatarUrl: r.members.avatar_url as string | null,
        communityName: r.communities.name as string,
        communitySlug: r.communities.slug as string,
      }));
  }

  const popular = mapTrending(popularRes.data ?? []);
  const controversial = mapTrending(controversialRes.data ?? []);

  return (
    <div className="relative flex min-h-[calc(100dvh_-_4rem)] items-center justify-center px-4 pb-28 pt-12">
      <div className="w-full max-w-7xl">
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            Ta tribune, ton équipe,{' '}
            <span className="text-red-600">ton opinion.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-900">
            Tu veux jouer robuste ? On aime ça quand ça brasse.
          </p>
        </div>

        <TrendingMessages popular={popular} controversial={controversial} />

        {communities.length > 0 ? (
          <CommunityGrid communities={communities} />
        ) : (
          <p className="text-center text-gray-500">
            Aucune tribune disponible pour le moment.
          </p>
        )}
      </div>

      {/* Ad pinned to bottom */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 py-2">
        <AdBanner slotId="home-footer" />
      </div>
    </div>
  );
}
