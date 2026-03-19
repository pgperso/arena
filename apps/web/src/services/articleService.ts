import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { articleSchema } from '@arena/shared';

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
  },
) {
  const validated = articleSchema.parse({
    title: data.title,
    body: data.body,
    slug: data.slug,
    excerpt: data.excerpt,
    coverImageUrl: data.coverImageUrl,
  });

  return supabase.from('articles').insert({
    community_id: data.communityId,
    author_id: data.authorId,
    title: validated.title,
    slug: validated.slug,
    excerpt: validated.excerpt ?? null,
    body: validated.body,
    cover_image_url: validated.coverImageUrl ?? null,
    is_published: data.isPublished ?? true,
    published_at: data.isPublished !== false ? new Date().toISOString() : null,
  });
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
    .select('*')
    .eq('id', articleId)
    .single();
}

export async function fetchArticlesByAuthor(
  supabase: SupabaseClient<Database>,
  authorId: string,
  communityId: number,
) {
  return supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, is_published, published_at, created_at, updated_at, like_count, view_count, is_removed')
    .eq('author_id', authorId)
    .eq('community_id', communityId)
    .eq('is_removed', false)
    .order('created_at', { ascending: false });
}
