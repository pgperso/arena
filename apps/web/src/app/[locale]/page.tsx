import { createClient } from '@/lib/supabase/server';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { CommunityGrid } from '@/components/community/CommunityGrid';
import { TrendingMessages } from '@/components/home/TrendingMessages';
import { AdBanner } from '@/components/ads/AdBanner';
import type { Database } from '@arena/supabase-client';

export const revalidate = 60;

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
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
      .limit(5),
    supabase
      .from('chat_messages')
      .select('id, content, like_count, dislike_count, created_at, members!chat_messages_member_id_fkey(username, avatar_url), communities!chat_messages_community_id_fkey(name, slug)')
      .not('content', 'is', null)
      .is('repost_of_id', null)
      .eq('is_removed', false)
      .gte('created_at', sevenDaysAgo)
      .gt('dislike_count', 0)
      .order('dislike_count', { ascending: false })
      .limit(5),
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
    <div className="flex flex-1 min-h-0 flex-col px-4">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden">
        {/* Header — fixed height */}
        <div className="shrink-0 pt-8 pb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            {t('title')}{' '}
            <span className="text-red-600">{t('titleAccent')}</span>
          </h1>
          <p className="text-sm text-gray-600 md:text-base">
            {t('subtitle')}
          </p>
        </div>

        {/* Trending — fixed height */}
        <div className="shrink-0">
          <TrendingMessages popular={popular} controversial={controversial} />
        </div>

        {/* Tribunes — centered in remaining space */}
        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto pb-4">
          {communities.length > 0 ? (
            <CommunityGrid communities={communities} />
          ) : (
            <p className="text-center text-gray-500">
              Aucune tribune disponible pour le moment.
            </p>
          )}
        </div>

        {/* Ad banner — fixed at bottom */}
        <div className="shrink-0 py-2">
          <AdBanner slotId="home-footer" />
        </div>
      </div>
    </div>
  );
}
