'use client';

import { formatTime } from '@arena/shared';
import type { FeedArticle } from '@arena/shared';
import { FeedLikeButton } from './FeedLikeButton';
import { Avatar } from '@/components/ui/Avatar';
import { useSupabase } from '@/hooks/useSupabase';
import { removeArticle } from '@/services/articleService';
import Image from 'next/image';
import Link from 'next/link';

interface FeedArticleCardProps {
  article: FeedArticle;
  communitySlug: string;
  userId: string | null;
  canModerate?: boolean;
}

export function FeedArticleCard({ article, communitySlug, userId, canModerate }: FeedArticleCardProps) {
  const supabase = useSupabase();

  return (
    <div className="px-4 py-3">
      <Link
        href={`/communities/${communitySlug}/articles/${article.slug}`}
        className="block overflow-hidden rounded-xl border border-gray-200 transition hover:border-gray-300 hover:shadow-sm"
      >
        {/* Cover image */}
        {article.coverImageUrl && (
          <div className="relative h-40 w-full bg-gray-100">
            <Image
              src={article.coverImageUrl}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        )}

        <div className="p-4">
          {/* Article badge */}
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              Article
            </span>
            <span className="text-xs text-gray-400">{formatTime(article.publishedAt)}</span>
          </div>

          {/* Title */}
          <h3 className="mb-1 text-base font-semibold text-gray-900 line-clamp-2">
            {article.title}
          </h3>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="mb-3 text-sm text-gray-500 line-clamp-2">{article.excerpt}</p>
          )}

          {/* Author + stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar url={article.author.avatarUrl} name={article.author.username} size="xs" />
              <span className="text-xs font-medium text-gray-700">{article.author.username}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              {article.viewCount > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {article.viewCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Like button + moderation actions */}
      <div className="mt-1 flex items-center gap-1 pl-1">
        <FeedLikeButton
          targetType="article"
          targetId={article.id}
          initialLikeCount={article.likeCount}
          userId={userId}
        />
        {canModerate && userId && (
          <button
            onClick={() => removeArticle(supabase, article.id, userId)}
            className="ml-auto rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-500"
            title="Supprimer l'article"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
