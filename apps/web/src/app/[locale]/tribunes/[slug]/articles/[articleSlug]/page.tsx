import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { setRequestLocale } from 'next-intl/server';
import { ArticleView } from '@/components/article/ArticleView';

export const revalidate = 300;

interface ArticlePageProps {
  params: Promise<{ locale: string; slug: string; articleSlug: string }>;
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
    .select('title, excerpt, cover_image_url, published_at')
    .eq('community_id', (community as { id: number }).id)
    .eq('slug', articleSlug)
    .eq('is_published', true)
    .eq('is_removed', false)
    .single();

  if (!article) return { title: 'Article introuvable' };

  const { title, excerpt, cover_image_url, published_at } = article as { title: string; excerpt: string | null; cover_image_url: string | null; published_at: string | null };
  const { locale: loc } = await params;
  const desc = excerpt ?? `${title} — Article sportif sur La tribune des fans. Opinions, analyses et débats.`;
  const url = `https://fanstribune.com/${loc}/tribunes/${slug}/articles/${articleSlug}`;
  const communityName = (await supabase.from('communities').select('name').eq('slug', slug).single()).data as { name: string } | null;

  return {
    title: `${title} | ${communityName?.name ?? 'Tribune'}`,
    description: desc,
    keywords: [
      title,
      communityName?.name,
      `${communityName?.name ?? ''} fans`,
      'article sportif', 'chronique sport', 'opinion sport',
      'tribune sportive', 'La tribune des fans', 'fanstribune',
      'analyse sport', 'débat sportif',
    ].filter(Boolean) as string[],
    openGraph: {
      title: `${title} | La tribune des fans`,
      description: desc,
      type: 'article',
      publishedTime: published_at ?? undefined,
      section: 'Sports',
      tags: [communityName?.name ?? 'Sports', 'Opinion', 'Tribune'],
      url,
      siteName: 'La tribune des fans',
      locale: loc === 'fr' ? 'fr_CA' : 'en_CA',
      images: cover_image_url
        ? [{ url: cover_image_url, alt: title, width: 1200, height: 630 }]
        : [{ url: 'https://fanstribune.com/images/fanstribune.webp', alt: 'La tribune des fans', width: 512, height: 512 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | La tribune des fans`,
      description: desc,
      images: cover_image_url ? [cover_image_url] : ['https://fanstribune.com/images/fanstribune.webp'],
      site: '@fanstribune',
    },
    alternates: {
      canonical: url,
      languages: {
        'fr-CA': `https://fanstribune.com/fr/tribunes/${slug}/articles/${articleSlug}`,
        'en-CA': `https://fanstribune.com/en/tribunes/${slug}/articles/${articleSlug}`,
      },
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug, articleSlug } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  // Load community
  const { data: communityData } = await supabase
    .from('communities')
    .select('id, slug, name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const community = communityData as { id: number; slug: string; name: string } | null;
  if (!community) notFound();

  // Load article with author
  const { data: articleData } = await supabase
    .from('articles')
    .select('id, slug, title, body, excerpt, cover_image_url, cover_position_y, like_count, view_count, published_at, created_at, author_name_override, members:members!articles_author_id_fkey(id, username, first_name, last_name, avatar_url, creator_display_name, creator_avatar_url)')
    .eq('community_id', community.id)
    .eq('slug', articleSlug)
    .eq('is_published', true)
    .eq('is_removed', false)
    .single();

  if (!articleData) notFound();

  const article = articleData as unknown as {
    id: number;
    slug: string;
    title: string;
    body: string;
    excerpt: string | null;
    cover_image_url: string | null;
    cover_position_y: number | null;
    like_count: number;
    view_count: number;
    published_at: string | null;
    created_at: string;
    author_name_override: string | null;
    members: { id: string; username: string; first_name: string | null; last_name: string | null; avatar_url: string | null; creator_display_name: string | null; creator_avatar_url: string | null } | null;
  };

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Increment view count (fire and forget)
  void (async () => { try { await supabase.rpc('increment_article_views' as never, { p_article_id: article.id } as never); } catch { /* ignore */ } })();

  const m = article.members;
  const authorDisplayName = article.author_name_override || (m?.first_name && m?.last_name ? `${m.first_name} ${m.last_name}` : null) || m?.username || 'Inconnu';
  const articleUrl = `https://fanstribune.com/${locale}/tribunes/${slug}/articles/${articleSlug}`;
  const wordCount = article.body.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const lang = locale === 'fr' ? 'fr-CA' : 'en-CA';

  const articleJsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      '@id': articleUrl,
      headline: article.title,
      description: article.excerpt ?? `${article.title} — article sportif sur La tribune des fans`,
      image: article.cover_image_url ?? 'https://fanstribune.com/images/fanstribune.webp',
      datePublished: article.published_at ?? article.created_at,
      dateModified: article.published_at ?? article.created_at,
      url: articleUrl,
      mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
      wordCount,
      articleSection: 'Sports',
      inLanguage: lang,
      publisher: {
        '@type': 'Organization',
        name: 'La tribune des fans',
        url: 'https://fanstribune.com',
        logo: { '@type': 'ImageObject', url: 'https://fanstribune.com/images/fanstribune.webp', width: 512, height: 512 },
      },
      author: {
        '@type': 'Person',
        name: authorDisplayName,
      },
      isAccessibleForFree: true,
      interactionStatistic: [
        { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: article.like_count },
        { '@type': 'InteractionCounter', interactionType: 'https://schema.org/ReadAction', userInteractionCount: article.view_count },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale === 'fr' ? 'Accueil' : 'Home', item: `https://fanstribune.com/${locale}` },
        { '@type': 'ListItem', position: 2, name: community.name, item: `https://fanstribune.com/${locale}/tribunes/${slug}` },
        { '@type': 'ListItem', position: 3, name: article.title },
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl overflow-y-auto bg-white dark:bg-[#1e1e1e]" style={{ height: 'calc(100dvh - 4rem)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }}
      />
      <ArticleView
        article={{
          ...article,
          author: article.members ? {
            id: article.members.id,
            username: article.author_name_override || (article.members.first_name && article.members.last_name ? `${article.members.first_name} ${article.members.last_name}` : null) || article.members.username,
            avatar_url: article.author_name_override ? null : article.members.avatar_url,
          } : { id: '', username: article.author_name_override || 'Inconnu', avatar_url: null },
        }}
        communitySlug={slug}
        userId={user?.id ?? null}
      />
    </div>
  );
}
