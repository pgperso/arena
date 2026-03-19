'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

type LikeTargetType = 'message' | 'article' | 'podcast';

interface LikeStatusMap {
  messages: Set<number>;
  articles: Set<number>;
  podcasts: Set<number>;
}

interface BatchLikeContextValue {
  isLiked: (type: LikeTargetType, id: number) => boolean;
  setLiked: (type: LikeTargetType, id: number, liked: boolean) => void;
}

const BatchLikeContext = createContext<BatchLikeContextValue | null>(null);

function typeKey(type: LikeTargetType): keyof LikeStatusMap {
  if (type === 'message') return 'messages';
  if (type === 'article') return 'articles';
  return 'podcasts';
}

interface BatchLikeProviderProps {
  userId: string | null;
  messageIds: number[];
  articleIds: number[];
  podcastIds: number[];
  children: React.ReactNode;
}

export function BatchLikeProvider({
  userId,
  messageIds,
  articleIds,
  podcastIds,
  children,
}: BatchLikeProviderProps) {
  const [likeStatus, setLikeStatus] = useState<LikeStatusMap>({
    messages: new Set(),
    articles: new Set(),
    podcasts: new Set(),
  });
  const supabaseRef = useRef(createClient());
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (messageIds.length === 0 && articleIds.length === 0 && podcastIds.length === 0) return;

    let cancelled = false;
    fetchedRef.current = false;

    Promise.all([
      messageIds.length > 0
        ? supabaseRef.current
            .from('message_likes')
            .select('message_id')
            .eq('member_id', userId)
            .in('message_id', messageIds)
        : { data: [] },
      articleIds.length > 0
        ? supabaseRef.current
            .from('article_likes')
            .select('article_id')
            .eq('member_id', userId)
            .in('article_id', articleIds)
        : { data: [] },
      podcastIds.length > 0
        ? supabaseRef.current
            .from('podcast_likes')
            .select('podcast_id')
            .eq('member_id', userId)
            .in('podcast_id', podcastIds)
        : { data: [] },
    ]).then(([msgLikes, artLikes, podLikes]) => {
      if (cancelled) return;
      fetchedRef.current = true;
      setLikeStatus({
        messages: new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (msgLikes.data ?? []).map((r: any) => r.message_id as number),
        ),
        articles: new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (artLikes.data ?? []).map((r: any) => r.article_id as number),
        ),
        podcasts: new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (podLikes.data ?? []).map((r: any) => r.podcast_id as number),
        ),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [userId, messageIds, articleIds, podcastIds]);

  const isLiked = useCallback(
    (type: LikeTargetType, id: number) => likeStatus[typeKey(type)].has(id),
    [likeStatus],
  );

  const setLiked = useCallback((type: LikeTargetType, id: number, liked: boolean) => {
    setLikeStatus((prev) => {
      const key = typeKey(type);
      const next = new Set(prev[key]);
      if (liked) next.add(id);
      else next.delete(id);
      return { ...prev, [key]: next };
    });
  }, []);

  const value = useMemo(() => ({ isLiked, setLiked }), [isLiked, setLiked]);

  return <BatchLikeContext.Provider value={value}>{children}</BatchLikeContext.Provider>;
}

export function useBatchLikeStatus() {
  return useContext(BatchLikeContext);
}
