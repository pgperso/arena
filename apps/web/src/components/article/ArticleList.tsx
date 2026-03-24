'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { fetchArticlesByAuthor, fetchArticle, removeArticle } from '@/services/articleService';
import { ArticleEditor } from './ArticleEditor';

interface ArticleRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  like_count: number;
  view_count: number;
  is_removed: boolean;
  author_name_override: string | null;
  community_id: number;
  communities: { name: string; slug: string };
}

interface ArticleListProps {
  communityId: number;
  communitySlug: string;
  userId: string;
  onClose: () => void;
}

export function ArticleList({ communityId, communitySlug, userId, onClose }: ArticleListProps) {
  const supabase = useSupabase();
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<{
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    cover_image_url: string | null;
    is_published: boolean;
    author_name_override?: string | null;
    communityId: number;
    communitySlug: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadArticles = useCallback(async () => {
    const { data } = await fetchArticlesByAuthor(supabase, userId);
    if (data) setArticles(data as unknown as ArticleRow[]);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleEdit = useCallback(async (article: ArticleRow) => {
    const { data } = await fetchArticle(supabase, article.id);
    const art = data as unknown as { id: number; title: string; slug: string; excerpt: string | null; body: string; cover_image_url: string | null; is_published: boolean; author_name_override: string | null } | null;
    if (art) {
      setEditingArticle({
        id: art.id,
        title: art.title,
        slug: art.slug,
        excerpt: art.excerpt,
        body: art.body,
        cover_image_url: art.cover_image_url,
        is_published: art.is_published,
        author_name_override: art.author_name_override,
        communityId: article.community_id,
        communitySlug: article.communities.slug,
      });
    }
  }, [supabase]);

  const handleDelete = useCallback(async (articleId: number) => {
    if (!window.confirm('Supprimer cet article ? Cette action est irréversible.')) return;
    setDeleting(articleId);
    await removeArticle(supabase, articleId, userId);
    setArticles((prev) => prev.filter((a) => a.id !== articleId));
    setDeleting(null);
  }, [supabase, userId]);

  if (editingArticle) {
    return (
      <ArticleEditor
        communityId={editingArticle.communityId}
        communitySlug={editingArticle.communitySlug}
        userId={userId}
        existingArticle={editingArticle}
        onPublished={(_slug, _communitySlug) => {
          setEditingArticle(null);
          loadArticles();
        }}
        onCancel={() => setEditingArticle(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Mes articles</h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Retour
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Aucun article</p>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-gray-900">{article.title}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      article.is_published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {article.is_published ? 'Publié' : 'Brouillon'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">{article.communities.name}</span>
                  {' · '}
                  {article.is_published && article.published_at
                    ? `Publié le ${new Date(article.published_at).toLocaleDateString('fr-FR')}`
                    : `Créé le ${new Date(article.created_at).toLocaleDateString('fr-FR')}`}
                  {' · '}
                  {article.view_count} vues · {article.like_count} likes
                  {article.author_name_override && (
                    <> · par {article.author_name_override}</>
                  )}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <button
                  onClick={() => handleEdit(article)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-blue transition hover:bg-blue-50"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(article.id)}
                  disabled={deleting === article.id}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting === article.id ? '...' : 'Supprimer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
