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
    is_published: true,
    published_at: new Date().toISOString(),
  });
}
