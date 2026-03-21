'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
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
        <svg
          className={`h-4 w-4 transition-transform ${likeAnim ? 'animate-reaction-pop' : ''}`}
          fill={isLiked ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
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
        <svg
          className={`h-4 w-4 transition-transform ${dislikeAnim ? 'animate-reaction-shake' : ''}`}
          fill={isDisliked ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.5a2.25 2.25 0 0 0 2.25 2.25c.592 0 1.092-.365 1.3-.915l.96-2.544a1.5 1.5 0 0 1 1.403-.971h2.399a3 3 0 0 0 2.995-2.823l.267-4a3 3 0 0 0-2.995-3.177H14.75M7.498 15.25H14.75m0-10.5h.128c.876 0 1.585.71 1.585 1.585v.925a3 3 0 0 1-.26 1.22l-.217.476"
          />
        </svg>
        {dislikeCount > 0 && <span>{dislikeCount}</span>}
      </button>
    </div>
  );
});
