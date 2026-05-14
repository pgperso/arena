import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { ORIGINAL_CONTENT_CUTOFF, displayCommunityName } from '@arena/shared';

interface TopOfWeekProps {
  locale: string;
}

type TopArticleRow = {
  id: number;
  slug: string;
  title: string;
  view_count: number;
  published_at: string | null;
  communities: { slug: string; name: string; name_en: string | null };
};

/**
 * Server-rendered "Top de la semaine" sidebar widget. Lists the five
 * most-read indexable articles from the past 7 days, with their rank.
 *
 * Why a server component: the list needs to render in SSR HTML so it
 * counts as crawlable internal links (each card is a deep link into an
 * article). Doing this on the client would hide the signal from Google.
 *
 * Why 7 days specifically: short enough to feel "this week's news",
 * long enough that even a slow-traffic site can fill the slot most of
 * the time. The fallback to all-time most-read kicks in if the 7-day
 * pool is empty, so the widget never renders an awkward placeholder.
 */
export async function TopOfWeek({ locale }: TopOfWeekProps) {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Primary: articles published in the last 7 days, ordered by views.
  const select =
    'id, slug, title, view_count, published_at, communities!inner(slug, name, name_en)';

  const { data: weekData } = await supabase
    .from('articles')
    .select(select)
    .eq('is_published', true)
    .eq('is_removed', false)
    .gte('published_at', sevenDaysAgo)
    .gte('published_at', ORIGINAL_CONTENT_CUTOFF)
    .order('view_count', { ascending: false })
    .limit(5);

  let articles = (weekData ?? []) as unknown as TopArticleRow[];

  // Fallback to all-time top if the 7-day window doesn't yield 5 hits.
  // Better to show something useful than an empty widget the day after
  // launch.
  if (articles.length < 5) {
    const { data: fallbackData } = await supabase
      .from('articles')
      .select(select)
      .eq('is_published', true)
      .eq('is_removed', false)
      .gte('published_at', ORIGINAL_CONTENT_CUTOFF)
      .order('view_count', { ascending: false })
      .limit(5);
    articles = (fallbackData ?? []) as unknown as TopArticleRow[];
  }

  if (articles.length === 0) return null;

  const heading = locale === 'fr' ? 'Top de la semaine' : 'Top of the week';

  return (
    <aside
      aria-label={heading}
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-4"
    >
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
        {heading}
      </h2>
      <ol className="space-y-3">
        {articles.map((a, idx) => {
          const communityName = displayCommunityName(
            { name: a.communities.name, name_en: a.communities.name_en },
            locale,
          );
          return (
            <li key={a.id} className="flex gap-3">
              <span className="shrink-0 text-2xl font-extrabold tabular-nums leading-none text-gray-200 dark:text-gray-700">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/tribunes/${a.communities.slug}/articles/${a.slug}`}
                  className="block text-sm font-semibold leading-snug text-gray-900 hover:text-brand-blue dark:text-gray-100"
                >
                  <span className="line-clamp-3">{a.title}</span>
                </Link>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                  {communityName}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
