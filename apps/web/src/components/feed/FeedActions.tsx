'use client';

import { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { FeedReactionButtons } from './FeedReactionButtons';

interface FeedActionsProps {
  messageId: number;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  userId: string | null;
  isOwn: boolean;
  onReply: () => void;
}

export const FeedActions = memo(function FeedActions({
  messageId,
  likeCount,
  dislikeCount,
  replyCount,
  userId,
  isOwn,
  onReply,
}: FeedActionsProps) {
  return (
    <div className="mt-1 flex items-center gap-1">
      {/* Reply — hidden on own messages */}
      {!isOwn && (
        <button
          onClick={onReply}
          disabled={!userId}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          title="Répondre"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
          {replyCount > 0 && <span>{replyCount}</span>}
        </button>
      )}
      {isOwn && replyCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300">
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
          {replyCount}
        </span>
      )}

      {/* Like / Dislike — hidden on own messages */}
      {!isOwn ? (
        <FeedReactionButtons
          messageId={messageId}
          initialLikeCount={likeCount}
          initialDislikeCount={dislikeCount}
          userId={userId}
        />
      ) : (
        <span className="flex items-center gap-2 px-2 py-1 text-xs text-gray-300">
          {likeCount > 0 && <span>{likeCount} ♥</span>}
          {dislikeCount > 0 && <span>{dislikeCount} ↓</span>}
        </span>
      )}
    </div>
  );
});
