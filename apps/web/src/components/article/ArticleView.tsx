'use client';

import { useMemo } from 'react';
import { formatTime, ARTICLE_AD_WORD_THRESHOLD } from '@arena/shared';
import DOMPurify from 'isomorphic-dompurify';
import { FeedLikeButton } from '@/components/feed/FeedLikeButton';
import { AdSlot } from '@/components/ads/AdSlot';
import { AdInArticle } from '@/components/ads/AdInArticle';
import { Avatar } from '@/components/ui/Avatar';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

interface ArticleViewProps {
  article: {
    id: number;
    title: string;
    body: string;
    excerpt: string | null;
    cover_image_url: string | null;
    like_count: number;
    view_count: number;
    published_at: string | null;
    created_at: string;
    author: {
      id: string;
      username: string;
      avatar_url: string | null;
    };
  };
  communitySlug: string;
  userId: string | null;
}

/**
 * Split sanitized HTML at the closest </p> after a word threshold.
 */
function splitHtmlAtParagraph(html: string, wordThreshold: number): [string, string] | null {
  const textOnly = html.replace(/<[^>]*>/g, ' ');
  const words = textOnly.trim().split(/\s+/);
  if (words.length < wordThreshold * 1.5) return null; // Not long enough to split

  // Find the Nth word position in the original HTML
  let wordCount = 0;
  let inTag = false;
  let splitSearchStart = 0;

  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') {
      inTag = true;
      continue;
    }
    if (html[i] === '>') {
      inTag = false;
      continue;
    }
    if (inTag) continue;

    if (/\s/.test(html[i]) && i > 0 && !/\s/.test(html[i - 1])) {
      wordCount++;
      if (wordCount >= wordThreshold) {
        splitSearchStart = i;
        break;
      }
    }
  }

  if (splitSearchStart === 0) return null;

  // Find the next </p> after the threshold
  const closingTag = '</p>';
  const splitIndex = html.indexOf(closingTag, splitSearchStart);
  if (splitIndex === -1) return null;

  const cutPoint = splitIndex + closingTag.length;
  return [html.slice(0, cutPoint), html.slice(cutPoint)];
}

export function ArticleView({ article, communitySlug, userId }: ArticleViewProps) {
  const sanitizedBody = useMemo(() => DOMPurify.sanitize(article.body, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'strong', 'em', 'b', 'i', 'u', 's',
      'ul', 'ol', 'li', 'blockquote', 'img', 'br', 'hr',
      'code', 'pre', 'span', 'div', 'figure', 'figcaption',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel', 'id'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    ALLOW_DATA_ATTR: false,
  }), [article.body]);
  const bodyParts = useMemo(
    () => splitHtmlAtParagraph(sanitizedBody, ARTICLE_AD_WORD_THRESHOLD),
    [sanitizedBody],
  );

  return (
    <div className="flex justify-center gap-8 px-4 py-6">
      {/* Main article content */}
      <article className="max-w-3xl flex-1 overflow-hidden">
        {/* Back link */}
        <Link
          href={`/tribunes/${communitySlug}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Retour au feed
        </Link>

        {/* Cover image */}
        {article.cover_image_url && (
          <div className="relative mb-6 h-64 overflow-hidden rounded-xl">
            <Image
              src={article.cover_image_url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              priority
            />
          </div>
        )}

        {/* Title */}
        <h1 className="mb-3 text-3xl font-bold text-gray-900">{article.title}</h1>

        {/* Author & meta */}
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
          <Avatar url={article.author.avatar_url} name={article.author.username} size="lg" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{article.author.username}</p>
            <p className="text-xs text-gray-400">
              {formatTime(article.published_at ?? article.created_at)}
              {article.view_count > 0 && ` · ${article.view_count} vue${article.view_count > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Article body with in-article ad */}
        {bodyParts ? (
          <>
            <div
              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-brand-blue prose-img:max-w-full prose-img:rounded-xl prose-img:h-auto"
              dangerouslySetInnerHTML={{ __html: bodyParts[0] }}
            />
            <AdInArticle />
            <div
              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-brand-blue prose-img:max-w-full prose-img:rounded-xl prose-img:h-auto"
              dangerouslySetInnerHTML={{ __html: bodyParts[1] }}
            />
          </>
        ) : (
          <div
            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-brand-blue prose-img:max-w-full prose-img:rounded-xl prose-img:h-auto"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        )}

        {/* End-of-article ad */}
        <div className="my-6 flex justify-center">
          <AdSlot slotId="article-end" format="large-rectangle" />
        </div>

        {/* Like */}
        <div className="border-t border-gray-100 pt-4">
          <FeedLikeButton
            targetType="article"
            targetId={article.id}
            initialLikeCount={article.like_count}
            userId={userId}
          />
        </div>
      </article>

      {/* Sticky sidebar ad - desktop only */}
      <aside className="hidden w-[320px] flex-shrink-0 lg:block">
        <div className="sticky top-20">
          <AdSlot slotId="article-sidebar" format="half-page" />
        </div>
      </aside>
    </div>
  );
}
