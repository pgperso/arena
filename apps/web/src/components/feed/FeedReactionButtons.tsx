'use client';

import { memo, useState } from 'react';
import { Heart, Annoyed } from 'lucide-react';
import { useMessageReaction } from '@/hooks/useMessageReaction';

interface FeedReactionButtonsProps {
  messageId: number;
  initialLikeCount: number;
  initialDislikeCount: number;
  userId: string | null;
}

// Touch target: min 44x44px on mobile (Apple HIG / Material Design)
const BTN = 'flex items-center gap-1 rounded-full px-2 py-1 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 justify-center text-xs transition disabled:cursor-not-allowed disabled:opacity-50';

export const FeedReactionButtons = memo(function FeedReactionButtons({
  messageId,
  initialLikeCount,
  initialDislikeCount,
  userId,
}: FeedReactionButtonsProps) {
  const { isLiked, isDisliked, likeCount, dislikeCount, toggleLike, toggleDislike, loading } =
    useMessageReaction(messageId, initialLikeCount, initialDislikeCount, userId);

  const [likeAnim, setLikeAnim] = useState(false);
  const [dislikeAnim, setDislikeAnim] = useState(false);

  function handleLike() {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    toggleLike();
  }

  function handleDislike() {
    setDislikeAnim(true);
    setTimeout(() => setDislikeAnim(false), 400);
    toggleDislike();
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={handleLike}
        disabled={!userId || loading}
        className={`${BTN} ${
          isLiked
            ? 'text-red-500 hover:bg-red-50'
            : 'text-gray-400 hover:bg-gray-100 hover:text-red-400'
        }`}
        title={isLiked ? 'Retirer le like' : 'J\'aime'}
      >
        <Heart
          className={`h-4 w-4 transition-transform ${likeAnim ? 'animate-reaction-pop' : ''}`}
          fill={isLiked ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      <button
        onClick={handleDislike}
        disabled={!userId || loading}
        className={`${BTN} ${
          isDisliked
            ? 'text-brand-blue hover:bg-blue-50'
            : 'text-gray-400 hover:bg-gray-100 hover:text-brand-blue'
        }`}
        title={isDisliked ? 'Retirer le dislike' : 'Je n\'aime pas'}
      >
        <Annoyed
          className={`h-4 w-4 transition-transform ${dislikeAnim ? 'animate-reaction-shake' : ''}`}
          strokeWidth={isDisliked ? 2.5 : 1.5}
        />
        {dislikeCount > 0 && <span>{dislikeCount}</span>}
      </button>
    </div>
  );
});
