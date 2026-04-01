import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { articleSchema } from '@arena/shared';
import { announceArticle, cleanupArticleBotMessages } from './botService';

export async function removeArticle(
  supabase: SupabaseClient<Database>,
  articleId: number,
  userId: string,
) {
  // Fetch slug before removing so we can clean up bot messages
  const { data: article } = await supabase
    .from('articles')
    .select('slug')
    .eq('id', articleId)
    .single();

  // Suffix slug to free it for reuse (unique constraint: community_id + slug)
  const freedSlug = article
    ? `${(article as { slug: string }).slug}-deleted-${Date.now()}`
    : undefined;

  const result = await supabase
    .from('articles')
    .update({
      is_removed: true,
      removed_at: new Date().toISOString(),
      removed_by: userId,
      ...(freedSlug ? { slug: freedSlug } : {}),
    } as never)
    .eq('id', articleId);

  // Clean up bot announcement messages (fire-and-forget)
  if (article) {
    void cleanupArticleBotMessages(supabase, (article as { slug: string }).slug);
  }

  return result;
}

export async function createArticle(
  supabase: SupabaseClient<Database>,
  data: {
    communityId: number;
    authorId: string;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    coverImageUrl: string | null;
    coverPositionY?: number;
    isPublished?: boolean;
    authorNameOverride?: string | null;
  },
) {
  const validated = articleSchema.parse({
    title: data.title,
    body: data.body,
    slug: data.slug,
    excerpt: data.excerpt,
    coverImageUrl: data.coverImageUrl,
  });

  const result = await supabase.from('articles').insert({
    community_id: data.communityId,
    author_id: data.authorId,
    title: validated.title,
    slug: validated.slug,
    excerpt: validated.excerpt ?? null,
    body: validated.body,
    cover_image_url: validated.coverImageUrl ?? null,
    cover_position_y: Math.round(data.coverPositionY ?? 50),
    is_published: data.isPublished ?? true,
    published_at: data.isPublished !== false ? new Date().toISOString() : null,
    author_name_override: data.authorNameOverride?.trim() || null,
  } as never);

  // Bot announcement when published (fire-and-forget)
  if (!result.error && data.isPublished !== false) {
    const authorName = data.authorNameOverride?.trim();
    const [{ data: author }, { data: community }] = await Promise.all([
      authorName ? Promise.resolve({ data: null }) : supabase.from('members').select('username').eq('id', data.authorId).single(),
      supabase.from('communities').select('name, slug').eq('id', data.communityId).single(),
    ]);
    const displayName = authorName
      || (author as { username: string } | null)?.username
      || 'Inconnu';
    if (community) {
      const communitySlug = (community as { slug: string }).slug;
      const articleUrl = `https://fanstribune.com/fr/tribunes/${communitySlug}/articles/${validated.slug}`;
      announceArticle(supabase, displayName, (community as { name: string }).name, validated.title, articleUrl);
    }
  }

  return result;
}

export async function updateArticle(
  supabase: SupabaseClient<Database>,
  articleId: number,
  data: {
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    coverImageUrl: string | null;
    coverPositionY?: number;
    isPublished?: boolean;
    authorNameOverride?: string | null;
    communityId?: number;
  },
) {
  const validated = articleSchema.parse({
    title: data.title,
    body: data.body,
    slug: data.slug,
    excerpt: data.excerpt,
    coverImageUrl: data.coverImageUrl,
  });

  const update: Record<string, unknown> = {
    title: validated.title,
    slug: validated.slug,
    excerpt: validated.excerpt ?? null,
    body: validated.body,
    cover_image_url: validated.coverImageUrl ?? null,
    cover_position_y: Math.round(data.coverPositionY ?? 50),
    author_name_override: data.authorNameOverride?.trim() || null,
    ...(data.communityId ? { community_id: data.communityId } : {}),
    updated_at: new Date().toISOString(),
  };

  if (data.isPublished !== undefined) {
    update.is_published = data.isPublished;
    if (data.isPublished) {
      update.published_at = new Date().toISOString();
    }
  }

  return supabase.from('articles').update(update as never).eq('id', articleId);
}

export async function fetchArticle(
  supabase: SupabaseClient<Database>,
  articleId: number,
) {
  return supabase
    .from('articles')
    .select('id, community_id, author_id, title, slug, excerpt, body, cover_image_url, cover_position_y, like_count, view_count, published_at, is_published, is_removed, created_at, updated_at, author_name_override')
    .eq('id', articleId)
    .single();
}

export async function fetchArticlesByAuthor(
  supabase: SupabaseClient<Database>,
  authorId: string,
  communityId?: number,
) {
  let query = supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, cover_position_y, is_published, published_at, created_at, updated_at, like_count, view_count, is_removed, author_name_override, community_id, communities!inner(name, slug)')
    .eq('author_id', authorId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (communityId) {
    query = query.eq('community_id', communityId);
  }

  return query;
}
