'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FEED_INITIAL_LIMIT, FEED_LOAD_MORE_LIMIT } from '@arena/shared';
import type {
  FeedItem,
  FeedMessage,
  FeedArticle,
  FeedPodcast,
  FeedMember,
} from '@arena/shared';
import type {
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
type ArticleRow = Database['public']['Tables']['articles']['Row'];
type PodcastRow = Database['public']['Tables']['podcasts']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

// --- Row to FeedItem converters ---

function memberFromRow(
  row: Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null,
): FeedMember | null {
  if (!row) return null;
  return { id: row.id, username: row.username, avatarUrl: row.avatar_url };
}

interface ChatMessageWithJoin extends ChatMessageRow {
  members: Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null;
}

function messageToFeedItem(row: ChatMessageWithJoin): FeedMessage {
  return {
    feedType: 'message',
    feedKey: `msg-${row.id}`,
    feedTimestamp: row.created_at,
    communityId: row.community_id,
    id: row.id,
    memberId: row.member_id,
    content: row.content,
    imageUrls: row.image_urls ?? [],
    parentId: row.parent_id,
    repostOfId: row.repost_of_id,
    quoteOfId: row.quote_of_id,
    likeCount: row.like_count,
    replyCount: row.reply_count,
    repostCount: row.repost_count,
    isRemoved: row.is_removed ?? false,
    removedAt: row.removed_at,
    removedBy: row.removed_by,
    createdAt: row.created_at,
    member: memberFromRow(row.members),
  };
}

interface ArticleWithJoin extends ArticleRow {
  members: Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null;
}

function articleToFeedItem(row: ArticleWithJoin): FeedArticle {
  return {
    feedType: 'article',
    feedKey: `art-${row.id}`,
    feedTimestamp: row.published_at ?? row.created_at,
    communityId: row.community_id,
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImageUrl: row.cover_image_url,
    likeCount: row.like_count,
    viewCount: row.view_count,
    publishedAt: row.published_at ?? row.created_at,
    author: memberFromRow(row.members) ?? { id: row.author_id, username: 'unknown', avatarUrl: null },
  };
}

function podcastToFeedItem(row: PodcastRow): FeedPodcast {
  return {
    feedType: 'podcast',
    feedKey: `pod-${row.id}`,
    feedTimestamp: row.created_at,
    communityId: row.community_id,
    id: row.id,
    title: row.title,
    description: row.description,
    audioUrl: row.audio_url,
    coverImageUrl: row.cover_image_url,
    durationSeconds: row.duration_seconds,
    likeCount: row.like_count,
    createdAt: row.created_at,
    publisher: null, // Podcasts don't have a member join currently
  };
}

// --- Sort helper ---

function sortByTimestamp(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => new Date(a.feedTimestamp).getTime() - new Date(b.feedTimestamp).getTime(),
  );
}

// --- Send options ---

interface SendOptions {
  content?: string;
  imageUrls?: string[];
  parentId?: number;
  repostOfId?: number;
  quoteOfId?: number;
}

// --- Hook return ---

export interface UseFeedReturn {
  items: FeedItem[];
  messages: FeedMessage[];
  loading: boolean;
  sending: boolean;
  hasMore: boolean;
  sendMessage: (content: string, imageUrls?: string[]) => Promise<void>;
  sendReply: (parentId: number, content: string, imageUrls?: string[]) => Promise<void>;
  sendRepost: (repostOfId: number) => Promise<void>;
  sendQuote: (quoteOfId: number, content: string, imageUrls?: string[]) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  getMessageById: (id: number) => FeedMessage | undefined;
}

export function useFeed(communityId: number, userId: string | null): UseFeedReturn {
  const [rawMessages, setRawMessages] = useState<FeedMessage[]>([]);
  const [rawArticles, setRawArticles] = useState<FeedArticle[]>([]);
  const [rawPodcasts, setRawPodcasts] = useState<FeedPodcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const supabaseRef = useRef(createClient());

  // Merged and sorted feed
  const items = useMemo(
    () => sortByTimestamp([...rawMessages, ...rawArticles, ...rawPodcasts]),
    [rawMessages, rawArticles, rawPodcasts],
  );

  // --- Initial load ---

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      setLoading(true);
      const supabase = supabaseRef.current;

      const [messagesRes, articlesRes, podcastsRes] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('*, members:members!chat_messages_member_id_fkey(id, username, avatar_url)')
          .eq('community_id', communityId)
          .order('created_at', { ascending: false })
          .limit(FEED_INITIAL_LIMIT),
        supabase
          .from('articles')
          .select('*, members:members!articles_author_id_fkey(id, username, avatar_url)')
          .eq('community_id', communityId)
          .eq('is_published', true)
          .eq('is_removed', false)
          .order('published_at', { ascending: false })
          .limit(FEED_INITIAL_LIMIT),
        supabase
          .from('podcasts')
          .select('*')
          .eq('community_id', communityId)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(FEED_INITIAL_LIMIT),
      ]);

      if (cancelled) return;

      if (messagesRes.data) {
        const msgs = messagesRes.data
          .reverse()
          .map((row) => messageToFeedItem(row as unknown as ChatMessageWithJoin));
        setRawMessages(msgs);
        setHasMoreMessages(messagesRes.data.length === FEED_INITIAL_LIMIT);
      }

      if (articlesRes.data) {
        setRawArticles(
          articlesRes.data.map((row) => articleToFeedItem(row as unknown as ArticleWithJoin)),
        );
      }

      if (podcastsRes.data) {
        setRawPodcasts(podcastsRes.data.map((row) => podcastToFeedItem(row as PodcastRow)));
      }

      setLoading(false);
    }

    loadFeed();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  // --- Realtime subscriptions ---

  useEffect(() => {
    const supabase = supabaseRef.current;

    // Channel 1: chat_messages
    const msgChannel = supabase
      .channel(`feed-msg:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `community_id=eq.${communityId}`,
        },
        async (payload: RealtimePostgresInsertPayload<ChatMessageRow>) => {
          const newMsg = payload.new;
          let member: Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null = null;
          if (newMsg.member_id) {
            const { data } = await supabase
              .from('members')
              .select('id, username, avatar_url')
              .eq('id', newMsg.member_id)
              .single();
            member = data as Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null;
          }
          const feedMsg = messageToFeedItem({ ...newMsg, members: member });
          setRawMessages((prev) => [...prev, feedMsg]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `community_id=eq.${communityId}`,
        },
        (payload: RealtimePostgresUpdatePayload<ChatMessageRow>) => {
          const updated = payload.new;
          setRawMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== updated.id) return msg;
              return {
                ...msg,
                content: updated.content,
                imageUrls: updated.image_urls ?? [],
                likeCount: updated.like_count,
                replyCount: updated.reply_count,
                repostCount: updated.repost_count,
                isRemoved: updated.is_removed ?? false,
                removedAt: updated.removed_at,
                removedBy: updated.removed_by,
              };
            }),
          );
        },
      )
      .subscribe();

    // Channel 2: articles
    const artChannel = supabase
      .channel(`feed-art:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'articles',
          filter: `community_id=eq.${communityId}`,
        },
        async (payload: RealtimePostgresInsertPayload<ArticleRow>) => {
          const newArt = payload.new;
          if (!newArt.is_published) return;
          let member: Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null = null;
          if (newArt.author_id) {
            const { data } = await supabase
              .from('members')
              .select('id, username, avatar_url')
              .eq('id', newArt.author_id)
              .single();
            member = data as Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null;
          }
          const feedArt = articleToFeedItem({ ...newArt, members: member } as ArticleWithJoin);
          setRawArticles((prev) => [...prev, feedArt]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles',
          filter: `community_id=eq.${communityId}`,
        },
        (payload: RealtimePostgresUpdatePayload<ArticleRow>) => {
          const updated = payload.new;
          setRawArticles((prev) =>
            prev.map((art) => {
              if (art.id !== updated.id) return art;
              return {
                ...art,
                title: updated.title,
                excerpt: updated.excerpt,
                coverImageUrl: updated.cover_image_url,
                likeCount: updated.like_count,
                viewCount: updated.view_count,
              };
            }),
          );
        },
      )
      .subscribe();

    // Channel 3: podcasts
    const podChannel = supabase
      .channel(`feed-pod:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcasts',
          filter: `community_id=eq.${communityId}`,
        },
        (payload: RealtimePostgresInsertPayload<PodcastRow>) => {
          const newPod = payload.new;
          if (!newPod.is_published) return;
          const feedPod = podcastToFeedItem(newPod);
          setRawPodcasts((prev) => [...prev, feedPod]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'podcasts',
          filter: `community_id=eq.${communityId}`,
        },
        (payload: RealtimePostgresUpdatePayload<PodcastRow>) => {
          const updated = payload.new;
          setRawPodcasts((prev) =>
            prev.map((pod) => {
              if (pod.id !== updated.id) return pod;
              return {
                ...pod,
                title: updated.title,
                description: updated.description,
                coverImageUrl: updated.cover_image_url,
                likeCount: updated.like_count,
              };
            }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(artChannel);
      supabase.removeChannel(podChannel);
    };
  }, [communityId]);

  // --- Send messages ---

  const send = useCallback(
    async (options: SendOptions) => {
      if (!userId) return;
      const hasContent = options.content && options.content.trim();
      const hasImages = options.imageUrls && options.imageUrls.length > 0;
      const isRepost = !!options.repostOfId;

      if (!hasContent && !hasImages && !isRepost) return;

      setSending(true);
      await supabaseRef.current.from('chat_messages').insert({
        community_id: communityId,
        member_id: userId,
        content: hasContent ? options.content!.trim() : null,
        image_urls: options.imageUrls ?? [],
        parent_id: options.parentId ?? null,
        repost_of_id: options.repostOfId ?? null,
        quote_of_id: options.quoteOfId ?? null,
      });
      setSending(false);
    },
    [communityId, userId],
  );

  const sendMessage = useCallback(
    async (content: string, imageUrls?: string[]) => {
      await send({ content, imageUrls });
    },
    [send],
  );

  const sendReply = useCallback(
    async (parentId: number, content: string, imageUrls?: string[]) => {
      await send({ content, imageUrls, parentId });
    },
    [send],
  );

  const sendRepost = useCallback(
    async (repostOfId: number) => {
      await send({ repostOfId });
    },
    [send],
  );

  const sendQuote = useCallback(
    async (quoteOfId: number, content: string, imageUrls?: string[]) => {
      await send({ content, imageUrls, quoteOfId });
    },
    [send],
  );

  // --- Load more (messages only for now) ---

  const loadMore = useCallback(async () => {
    if (!hasMoreMessages || rawMessages.length === 0) return;

    const oldestMsg = rawMessages[0];
    const { data } = await supabaseRef.current
      .from('chat_messages')
      .select('*, members:members!chat_messages_member_id_fkey(id, username, avatar_url)')
      .eq('community_id', communityId)
      .lt('created_at', oldestMsg.createdAt)
      .order('created_at', { ascending: false })
      .limit(FEED_LOAD_MORE_LIMIT);

    if (data) {
      const olderMsgs = data
        .reverse()
        .map((row) => messageToFeedItem(row as unknown as ChatMessageWithJoin));
      setRawMessages((prev) => [...olderMsgs, ...prev]);
      setHasMoreMessages(data.length === FEED_LOAD_MORE_LIMIT);
    }
  }, [communityId, hasMoreMessages, rawMessages]);

  // --- Delete ---

  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!userId) return;
      await supabaseRef.current
        .from('chat_messages')
        .update({
          is_removed: true,
          removed_at: new Date().toISOString(),
          removed_by: userId,
        })
        .eq('id', messageId);
    },
    [userId],
  );

  // --- Lookup ---

  const getMessageById = useCallback(
    (id: number) => rawMessages.find((m) => m.id === id),
    [rawMessages],
  );

  return {
    items,
    messages: rawMessages,
    loading,
    sending,
    hasMore: hasMoreMessages,
    sendMessage,
    sendReply,
    sendRepost,
    sendQuote,
    loadMore,
    deleteMessage,
    getMessageById,
  };
}
