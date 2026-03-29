'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { Avatar } from '@/components/ui/Avatar';
import { formatTime } from '@arena/shared';
import {
  fetchArticleComments,
  createArticleComment,
  removeArticleComment,
  type ArticleComment as ArticleCommentType,
} from '@/services/pressGalleryService';

interface ArticleCommentsProps {
  articleId: number;
  userId: string | null;
}

export function ArticleComments({ articleId, userId }: ArticleCommentsProps) {
  const t = useTranslations('pressGallery');
  const supabase = useSupabase();

  const [comments, setComments] = useState<ArticleCommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const data = await fetchArticleComments(supabase, articleId);
    setComments(data);
    setLoading(false);
  }, [supabase, articleId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!userId || !content.trim() || submitting) return;
    setSubmitting(true);
    const { error } = await createArticleComment(
      supabase,
      articleId,
      userId,
      content,
    );
    if (!error) {
      setContent('');
      await loadComments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: number) => {
    if (!userId) return;
    await removeArticleComment(supabase, commentId, userId);
    await loadComments();
  };

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">
        {t('comments')}{' '}
        <span className="text-sm font-normal text-gray-500">
          ({t('commentCount', { count: comments.length })})
        </span>
      </h3>

      {/* Comment form */}
      {userId ? (
        <div className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('writeComment')}
            maxLength={2000}
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-blue focus:outline-none dark:border-gray-600 dark:bg-[#1e1e1e] dark:text-gray-100"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {submitting ? t('submitting') : t('submitComment')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
          <Link href="/login" className="font-medium text-brand-blue hover:underline">
            {t('loginToComment')}
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        </div>
      )}

      {/* Comments list */}
      {!loading && comments.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">
          {t('noComments')}
        </p>
      )}

      {!loading && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 rounded-lg p-2"
            >
              <Avatar
                url={comment.avatarUrl}
                name={comment.username}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {comment.username}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                  {comment.content}
                </p>
              </div>

              {/* Delete button for own comments */}
              {userId === comment.memberId && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="shrink-0 self-start p-1 text-gray-400 transition-colors hover:text-red-500"
                  title={t('deleteComment')}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
