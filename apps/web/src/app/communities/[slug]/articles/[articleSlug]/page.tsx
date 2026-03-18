import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ArticleView } from '@/components/article/ArticleView';

interface ArticlePageProps {
  params: Promise<{ slug: string; articleSlug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug, articleSlug } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!community) return { title: 'Article introuvable' };

  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt')
    .eq('community_id', (community as { id: number }).id)
    .eq('slug', articleSlug)
    .eq('is_published', true)
    .eq('is_removed', false)
    .single();

  if (!article) return { title: 'Article introuvable' };

  return {
    title: (article as { title: string }).title,
    description: (article as { excerpt: string | null }).excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug, articleSlug } = await params;
  const supabase = await createClient();

  // Load community
  const { data: communityData } = await supabase
    .from('communities')
    .select('id, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const community = communityData as { id: number; slug: string } | null;
  if (!community) notFound();

  // Load article with author
  const { data: articleData } = await supabase
    .from('articles')
    .select('*, members:members!articles_author_id_fkey(id, username, avatar_url)')
    .eq('community_id', community.id)
    .eq('slug', articleSlug)
    .eq('is_published', true)
    .eq('is_removed', false)
    .single();

  if (!articleData) notFound();

  const article = articleData as {
    id: number;
    title: string;
    body: string;
    excerpt: string | null;
    cover_image_url: string | null;
    like_count: number;
    view_count: number;
    published_at: string | null;
    created_at: string;
    members: { id: string; username: string; avatar_url: string | null } | null;
  };

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Increment view count (fire and forget)
  supabase
    .from('articles')
    .update({ view_count: article.view_count + 1 })
    .eq('id', article.id)
    .then(() => {});

  return (
    <div className="min-h-screen bg-white">
      <ArticleView
        article={{
          ...article,
          author: article.members ?? { id: '', username: 'Inconnu', avatar_url: null },
        }}
        communitySlug={slug}
        userId={user?.id ?? null}
      />
    </div>
  );
}
