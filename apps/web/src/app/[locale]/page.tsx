import { createClient } from '@/lib/supabase/server';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { TrendingMessages } from '@/components/home/TrendingMessages';
import { HomeCTA } from '@/components/home/HomeCTA';

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [popularRes, controversialRes] = await Promise.all([
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
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center">
        {/* Hero */}
        <div className="shrink-0 pt-6 pb-4 text-center md:pt-12 md:pb-8">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
            {t('title')}{' '}
            <span className="text-red-600">{t('titleAccent')}</span>
          </h1>
          <p className="mb-6 text-sm text-gray-600 md:mb-8 md:text-lg">
            {t('subtitle')}
          </p>
          <HomeCTA />
        </div>

        {/* Trending */}
        <div className="min-h-0 flex-1">
          <TrendingMessages popular={popular} controversial={controversial} />
        </div>
      </div>
    </div>
  );
}
