'use client';

import { memo } from 'react';
import { FeedReactionButtons } from './FeedReactionButtons';
import { FeedRepostMenu } from './FeedRepostMenu';

interface FeedActionsProps {
  messageId: number;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  repostCount: number;
  userId: string | null;
  onReply: () => void;
  onRepost: () => void;
  onQuote: () => void;
}

export const FeedActions = memo(function FeedActions({
  messageId,
  likeCount,
  dislikeCount,
  replyCount,
  repostCount,
  userId,
  onReply,
  onRepost,
  onQuote,
}: FeedActionsProps) {
  return (
    <div className="mt-1 flex items-center gap-1">
      {/* Reply */}
      <button
        onClick={onReply}
        disabled={!userId}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        title="Répondre"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
          />
        </svg>
        {replyCount > 0 && <span>{replyCount}</span>}
      </button>

      {/* Repost/Quote */}
      <FeedRepostMenu
        onRepost={onRepost}
        onQuote={onQuote}
        disabled={!userId}
        repostCount={repostCount}
      />

      {/* Like / Dislike */}
      <FeedReactionButtons
        messageId={messageId}
        initialLikeCount={likeCount}
        initialDislikeCount={dislikeCount}
        userId={userId}
      />
    </div>
  );
});
