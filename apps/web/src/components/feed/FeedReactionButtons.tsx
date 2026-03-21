'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Heart, ThumbsDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useBatchLikeStatus } from '@/hooks/useBatchLikeStatus';

interface FeedReactionButtonsProps {
  messageId: number;
  initialLikeCount: number;
  initialDislikeCount: number;
  userId: string | null;
}

export const FeedReactionButtons = memo(function FeedReactionButtons({
  messageId,
  initialLikeCount,
  initialDislikeCount,
  userId,
}: FeedReactionButtonsProps) {
  const batchCtx = useBatchLikeStatus();
  const batchLiked = batchCtx?.isLiked('message', messageId);
  const batchDisliked = batchCtx?.isDisliked(messageId);

  const [isLiked, setIsLiked] = useState(batchLiked ?? false);
  const [isDisliked, setIsDisliked] = useState(batchDisliked ?? false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [likeAnim, setLikeAnim] = useState(false);
  const [dislikeAnim, setDislikeAnim] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());

  // Sync from batch context
  useEffect(() => {
    if (batchLiked !== undefined) setIsLiked(batchLiked);
  }, [batchLiked]);
  useEffect(() => {
    if (batchDisliked !== undefined) setIsDisliked(batchDisliked);
  }, [batchDisliked]);

  // Sync counts from parent (Realtime updates)
  useEffect(() => setLikeCount(initialLikeCount), [initialLikeCount]);
  useEffect(() => setDislikeCount(initialDislikeCount), [initialDislikeCount]);

  const handleLike = useCallback(async () => {
    if (!userId || loading) return;
    setLoading(true);
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);

    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    const supabase = supabaseRef.current;

    // Optimistic update
    if (wasLiked) {
      setIsLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      setIsLiked(true);
      setLikeCount((c) => c + 1);
      if (wasDisliked) {
        setIsDisliked(false);
        setDislikeCount((c) => Math.max(0, c - 1));
      }
    }

    try {
      if (wasLiked) {
        await supabase.from('message_likes').delete().eq('message_id', messageId).eq('member_id', userId);
      } else {
        if (wasDisliked) {
          await supabase.from('message_dislikes').delete().eq('message_id', messageId).eq('member_id', userId);
          batchCtx?.setDisliked(messageId, false);
        }
        await supabase.from('message_likes').insert({ message_id: messageId, member_id: userId });
      }
      batchCtx?.setLiked('message', messageId, !wasLiked);
    } catch {
      // Rollback
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      setLikeCount(initialLikeCount);
      setDislikeCount(initialDislikeCount);
    }
    setLoading(false);
  }, [userId, loading, isLiked, isDisliked, messageId, initialLikeCount, initialDislikeCount, batchCtx]);

  const handleDislike = useCallback(async () => {
    if (!userId || loading) return;
    setLoading(true);
    setDislikeAnim(true);
    setTimeout(() => setDislikeAnim(false), 400);

    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    const supabase = supabaseRef.current;

    // Optimistic update
    if (wasDisliked) {
      setIsDisliked(false);
      setDislikeCount((c) => c - 1);
    } else {
      setIsDisliked(true);
      setDislikeCount((c) => c + 1);
      if (wasLiked) {
        setIsLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    }

    try {
      if (wasDisliked) {
        await supabase.from('message_dislikes').delete().eq('message_id', messageId).eq('member_id', userId);
      } else {
        if (wasLiked) {
          await supabase.from('message_likes').delete().eq('message_id', messageId).eq('member_id', userId);
          batchCtx?.setLiked('message', messageId, false);
        }
        await supabase.from('message_dislikes').insert({ message_id: messageId, member_id: userId });
      }
      batchCtx?.setDisliked(messageId, !wasDisliked);
    } catch {
      // Rollback
      setIsLiked(wasLiked);
      setIsDisliked(wasDisliked);
      setLikeCount(initialLikeCount);
      setDislikeCount(initialDislikeCount);
    }
    setLoading(false);
  }, [userId, loading, isLiked, isDisliked, messageId, initialLikeCount, initialDislikeCount, batchCtx]);

  return (
    <div className="flex items-center gap-0.5">
      {/* Like */}
      <button
        onClick={handleLike}
        disabled={!userId || loading}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

      {/* Dislike */}
      <button
        onClick={handleDislike}
        disabled={!userId || loading}
        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isDisliked
            ? 'text-brand-orange hover:bg-orange-50'
            : 'text-gray-400 hover:bg-gray-100 hover:text-brand-orange'
        }`}
        title={isDisliked ? 'Retirer le dislike' : 'Je n\'aime pas'}
      >
        <ThumbsDown
          className={`h-4 w-4 transition-transform ${dislikeAnim ? 'animate-reaction-shake' : ''}`}
          fill={isDisliked ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
        {dislikeCount > 0 && <span>{dislikeCount}</span>}
      </button>
    </div>
  );
});
