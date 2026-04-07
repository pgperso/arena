import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

export interface PressGalleryItem {
  type: 'article' | 'podcast';
  id: number;
  title: string;
  slug?: string;
  excerpt: string | null;
  description: string | null;
  coverImageUrl: string | null;
  coverPositionY: number;
  likeCount: number;
  viewCount: number;
  durationSeconds: number | null;
  publishedAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  communityId: number;
  communityName: string;
  communitySlug: string;
  communityLogoUrl: string | null;
  isLive: boolean;
  youtubeVideoId: string | null;
}

export interface ArticleComment {
  id: number;
  articleId: number;
  memberId: string;
  content: string;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
}

interface FetchOptions {
  filter: 'all' | 'articles' | 'podcasts';
  communityId?: number;
  excludeCommunityId?: number;
  sort: 'latest' | 'trending';
  cursor?: string;
  limit: number;
  excludeIds?: number[];
}

export interface FetchResult {
  items: PressGalleryItem[];
  nextCursor: string | null;
}

const ARTICLE_SELECT = 'id, title, slug, excerpt, cover_image_url, cover_position_y, like_count, view_count, published_at, author_name_override, author_id, communities!inner(id, name, slug, logo_url), members:members!articles_author_id_fkey(username, first_name, last_name, avatar_url, creator_display_name, creator_avatar_url)';
const PODCAST_SELECT = 'id, title, description, cover_image_url, like_count, duration_seconds, created_at, youtube_video_id, is_live, published_by, communities!inner(id, name, slug, logo_url), members:members!podcasts_published_by_fkey(username, avatar_url, creator_display_name, creator_avatar_url)';

export async function fetchFeaturedItems(
  supabase: SupabaseClient<Database>,
): Promise<PressGalleryItem[]> {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('is_published', true)
    .eq('is_removed', false)
    .not('cover_image_url', 'is', null)
    .gte('published_at', twoDaysAgo)
    .order('view_count', { ascending: false })
    .limit(3);

  if (data && data.length > 0) {
    // Sort by engagement score: view_count + like_count * 3
    const sorted = [...data].sort((a, b) => {
      const scoreA = (a as unknown as ArticleRow).view_count + (a as unknown as ArticleRow).like_count * 3;
      const scoreB = (b as unknown as ArticleRow).view_count + (b as unknown as ArticleRow).like_count * 3;
      return scoreB - scoreA;
    });
    return sorted.map((r) => articleToItem(r as unknown as ArticleRow));
  }

  // Fallback: most recent 3 articles with cover image
  const { data: fallback } = await supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('is_published', true)
    .eq('is_removed', false)
    .not('cover_image_url', 'is', null)
    .order('published_at', { ascending: false })
    .limit(3);

  if (!fallback || fallback.length === 0) return [];
  return fallback.map((r) => articleToItem(r as unknown as ArticleRow));
}

export async function fetchPressGalleryItems(
  supabase: SupabaseClient<Database>,
  options: FetchOptions,
): Promise<FetchResult> {
  const { filter, communityId, excludeCommunityId, sort, cursor, limit, excludeIds } = options;
  const internalOpts = { communityId, excludeCommunityId, sort, cursor, limit, excludeIds };

  if (filter === 'articles') {
    const items = await fetchArticles(supabase, internalOpts);
    return {
      items,
      nextCursor: items.length > 0 ? items[items.length - 1].publishedAt : null,
    };
  }

  if (filter === 'podcasts') {
    const items = await fetchPodcasts(supabase, internalOpts);
    return {
      items,
      nextCursor: items.length > 0 ? items[items.length - 1].publishedAt : null,
    };
  }

  // filter === 'all': fetch both, merge, take first `limit`
  const [articles, podcasts] = await Promise.all([
    fetchArticles(supabase, internalOpts),
    fetchPodcasts(supabase, internalOpts),
  ]);

  const merged = [...articles, ...podcasts];
  if (sort === 'trending') {
    merged.sort((a, b) => (b.viewCount + b.likeCount * 3) - (a.viewCount + a.likeCount * 3));
  } else {
    merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  const items = merged.slice(0, limit);
  return {
    items,
    nextCursor: items.length > 0 ? items[items.length - 1].publishedAt : null,
  };
}

// --- Internal fetch helpers ---

interface InternalFetchOptions {
  communityId?: number;
  excludeCommunityId?: number;
  sort: 'latest' | 'trending';
  cursor?: string;
  limit: number;
  excludeIds?: number[];
}

async function fetchArticles(
  supabase: SupabaseClient<Database>,
  options: InternalFetchOptions,
): Promise<PressGalleryItem[]> {
  const { communityId, excludeCommunityId, sort, cursor, limit, excludeIds } = options;

  let q = supabase
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('is_published', true)
    .eq('is_removed', false);

  if (communityId) q = q.eq('community_id', communityId);
  if (excludeCommunityId) q = q.neq('community_id', excludeCommunityId);
  if (excludeIds && excludeIds.length > 0) {
    q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  if (sort === 'trending') {
    if (cursor) q = q.lt('published_at', cursor);
    q = q.order('view_count', { ascending: false });
  } else {
    if (cursor) q = q.lt('published_at', cursor);
    q = q.order('published_at', { ascending: false });
  }

  const { data } = await q.limit(limit);
  if (!data) return [];
  return data.map((r) => articleToItem(r as unknown as ArticleRow));
}

async function fetchPodcasts(
  supabase: SupabaseClient<Database>,
  options: InternalFetchOptions,
): Promise<PressGalleryItem[]> {
  const { communityId, excludeCommunityId, sort, cursor, limit, excludeIds } = options;

  let q = supabase
    .from('podcasts')
    .select(PODCAST_SELECT)
    .eq('is_published', true)
    .or('is_removed.eq.false,is_removed.is.null');

  if (communityId) q = q.eq('community_id', communityId);
  if (excludeCommunityId) q = q.neq('community_id', excludeCommunityId);
  if (excludeIds && excludeIds.length > 0) {
    q = q.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  if (sort === 'trending') {
    if (cursor) q = q.lt('created_at', cursor);
    q = q.order('like_count', { ascending: false });
  } else {
    if (cursor) q = q.lt('created_at', cursor);
    q = q.order('created_at', { ascending: false });
  }

  const { data } = await q.limit(limit);
  if (!data) return [];
  return data.map((r) => podcastToItem(r as unknown as PodcastRow));
}

// --- Comments ---

export async function fetchArticleComments(
  supabase: SupabaseClient<Database>,
  articleId: number,
): Promise<ArticleComment[]> {
  const { data } = await supabase
    .from('article_comments' as never)
    .select('id, article_id, member_id, content, created_at, members:members!article_comments_member_id_fkey(username, avatar_url)' as never)
    .eq('article_id' as never, articleId as never)
    .eq('is_removed' as never, false as never)
    .order('created_at' as never, { ascending: true } as never)
    .limit(100);

  if (!data) return [];

  return (data as unknown as { id: number; article_id: number; member_id: string; content: string; created_at: string; members: { username: string; avatar_url: string | null } | null }[]).map((r) => ({
    id: r.id,
    articleId: r.article_id,
    memberId: r.member_id,
    content: r.content,
    createdAt: r.created_at,
    username: r.members?.username ?? 'Inconnu',
    avatarUrl: r.members?.avatar_url ?? null,
  }));
}

export async function createArticleComment(
  supabase: SupabaseClient<Database>,
  articleId: number,
  memberId: string,
  content: string,
): Promise<{ error: Error | null }> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) return { error: new Error('Invalid comment') };

  const { error } = await supabase
    .from('article_comments' as never)
    .insert({ article_id: articleId, member_id: memberId, content: trimmed } as never);

  return { error: error ? new Error(error.message) : null };
}

export async function removeArticleComment(
  supabase: SupabaseClient<Database>,
  commentId: number,
  memberId: string,
): Promise<void> {
  await supabase
    .from('article_comments' as never)
    .update({ is_removed: true } as never)
    .eq('id' as never, commentId as never)
    .eq('member_id' as never, memberId as never);
}

// --- Row types & converters ---

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_position_y: number | null;
  like_count: number;
  view_count: number;
  published_at: string | null;
  author_name_override: string | null;
  author_id: string;
  communities: { id: number; name: string; slug: string; logo_url: string | null };
  members: { username: string; first_name: string | null; last_name: string | null; avatar_url: string | null; creator_display_name: string | null; creator_avatar_url: string | null } | null;
}

interface PodcastRow {
  id: number;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  like_count: number;
  duration_seconds: number | null;
  created_at: string;
  youtube_video_id: string | null;
  is_live: boolean;
  published_by: string;
  communities: { id: number; name: string; slug: string; logo_url: string | null };
  members: { username: string; avatar_url: string | null; creator_display_name: string | null; creator_avatar_url: string | null } | null;
}

function articleToItem(r: ArticleRow): PressGalleryItem {
  const m = r.members;
  return {
    type: 'article',
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    description: null,
    coverImageUrl: r.cover_image_url,
    coverPositionY: r.cover_position_y ?? 50,
    likeCount: r.like_count,
    viewCount: r.view_count,
    durationSeconds: null,
    publishedAt: r.published_at ?? new Date().toISOString(),
    authorId: r.author_id,
    authorName: r.author_name_override || (m?.first_name && m?.last_name ? `${m.first_name} ${m.last_name}` : null) || m?.username || 'Inconnu',
    authorAvatarUrl: r.author_name_override ? null : (m?.avatar_url || null),
    communityId: r.communities.id,
    communityName: r.communities.name,
    communitySlug: r.communities.slug,
    communityLogoUrl: r.communities.logo_url,
    isLive: false,
    youtubeVideoId: null,
  };
}

function podcastToItem(r: PodcastRow): PressGalleryItem {
  const m = r.members;
  return {
    type: 'podcast',
    id: r.id,
    title: r.title,
    slug: undefined,
    excerpt: null,
    description: r.description,
    coverImageUrl: r.cover_image_url,
    coverPositionY: 50,
    likeCount: r.like_count,
    viewCount: 0,
    durationSeconds: r.duration_seconds,
    publishedAt: r.created_at,
    authorId: r.published_by,
    authorName: m?.username || 'Inconnu',
    authorAvatarUrl: m?.avatar_url || null,
    communityId: r.communities.id,
    communityName: r.communities.name,
    communitySlug: r.communities.slug,
    communityLogoUrl: r.communities.logo_url,
    isLive: r.is_live ?? false,
    youtubeVideoId: r.youtube_video_id,
  };
}
