import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { articleSchema } from '@arena/shared';
import { announceArticle } from './botService';

export async function removeArticle(
  supabase: SupabaseClient<Database>,
  articleId: number,
  userId: string,
) {
  return supabase
    .from('articles')
    .update({
      is_removed: true,
      removed_at: new Date().toISOString(),
      removed_by: userId,
    })
    .eq('id', articleId);
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
    is_published: data.isPublished ?? true,
    published_at: data.isPublished !== false ? new Date().toISOString() : null,
    author_name_override: data.authorNameOverride?.trim() || null,
  });

  // Bot announcement when published (fire-and-forget)
  if (!result.error && data.isPublished !== false) {
    const authorName = data.authorNameOverride?.trim();
    const [{ data: author }, { data: community }] = await Promise.all([
      authorName ? Promise.resolve({ data: null }) : supabase.from('members').select('username, creator_display_name').eq('id', data.authorId).single(),
      supabase.from('communities').select('name').eq('id', data.communityId).single(),
    ]);
    const displayName = authorName
      || (author as { creator_display_name: string | null; username: string } | null)?.creator_display_name
      || (author as { username: string } | null)?.username
      || 'Inconnu';
    if (community) {
      announceArticle(supabase, displayName, (community as { name: string }).name, validated.title);
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

  const update: Record<string, unknown> = {
    title: validated.title,
    slug: validated.slug,
    excerpt: validated.excerpt ?? null,
    body: validated.body,
    cover_image_url: validated.coverImageUrl ?? null,
    author_name_override: data.authorNameOverride?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (data.isPublished !== undefined) {
    update.is_published = data.isPublished;
    if (data.isPublished) {
      update.published_at = new Date().toISOString();
    }
  }

  return supabase.from('articles').update(update).eq('id', articleId);
}

export async function fetchArticle(
  supabase: SupabaseClient<Database>,
  articleId: number,
) {
  return supabase
    .from('articles')
    .select('id, community_id, author_id, title, slug, excerpt, body, cover_image_url, like_count, view_count, published_at, is_published, is_removed, created_at, updated_at, author_name_override')
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
    .select('id, title, slug, excerpt, cover_image_url, is_published, published_at, created_at, updated_at, like_count, view_count, is_removed, author_name_override, community_id, communities!inner(name, slug)')
    .eq('author_id', authorId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (communityId) {
    query = query.eq('community_id', communityId);
  }

  return query;
}
