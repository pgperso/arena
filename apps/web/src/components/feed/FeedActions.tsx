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
  onReply: () => void;
}

export const FeedActions = memo(function FeedActions({
  messageId,
  likeCount,
  dislikeCount,
  replyCount,
  userId,
  onReply,
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
        <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
        {replyCount > 0 && <span>{replyCount}</span>}
      </button>

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
