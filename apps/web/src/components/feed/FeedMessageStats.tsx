'use client';

import { memo } from 'react';
import { Heart, ThumbsDown, MessageCircle } from 'lucide-react';

interface FeedMessageStatsProps {
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
}

export const FeedMessageStats = memo(function FeedMessageStats({
  likeCount,
  dislikeCount,
  replyCount,
}: FeedMessageStatsProps) {
  if (likeCount === 0 && dislikeCount === 0 && replyCount === 0) return null;

  return (
    <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
      {likeCount > 0 && (
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3" fill="currentColor" strokeWidth={1.5} />
          {likeCount}
        </span>
      )}
      {dislikeCount > 0 && (
        <span className="flex items-center gap-1">
          <ThumbsDown className="h-3 w-3" fill="currentColor" strokeWidth={1.5} />
          {dislikeCount}
        </span>
      )}
      {replyCount > 0 && (
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" strokeWidth={1.5} />
          {replyCount}
        </span>
      )}
    </div>
  );
});
