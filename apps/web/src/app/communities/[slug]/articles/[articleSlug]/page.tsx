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

  const title = (article as { title: string }).title;
  const excerpt = (article as { excerpt: string | null }).excerpt;

  return {
    title,
    description: excerpt,
    openGraph: {
      title: `${title} | La tribune des fans`,
      description: excerpt ?? title,
      type: 'article',
    },
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

  // Increment view count atomically via RPC (fire and forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.rpc as any)('increment_article_views', { p_article_id: article.id }).then(() => {});

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.cover_image_url ?? undefined,
    datePublished: article.published_at ?? article.created_at,
    author: {
      '@type': 'Person',
      name: article.members?.username ?? 'Inconnu',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }}
      />
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
