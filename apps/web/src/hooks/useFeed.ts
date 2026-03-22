'use client';

import { useEffect, useReducer, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FEED_INITIAL_LIMIT, FEED_LOAD_MORE_LIMIT, messageSchema } from '@arena/shared';
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

const MAX_FEED_ITEMS = 500;
const REALTIME_DEBOUNCE_MS = 100;

// Explicit column selections (avoid select('*') to exclude large columns like body)
const CHAT_MSG_SELECT = 'id, community_id, member_id, content, image_urls, created_at, edited_at, is_removed, removed_at, removed_by, like_count, dislike_count, reply_count, parent_id, members:members!chat_messages_member_id_fkey(id, username, avatar_url)';
const ARTICLE_SELECT = 'id, community_id, author_id, title, slug, excerpt, cover_image_url, like_count, view_count, published_at, is_published, is_removed, created_at, members:members!articles_author_id_fkey(id, username, avatar_url)';
const PODCAST_SELECT = 'id, community_id, published_by, title, description, audio_url, cover_image_url, duration_seconds, like_count, is_published, is_removed, created_at';

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
    likeCount: row.like_count,
    dislikeCount: row.dislike_count,
    replyCount: row.reply_count,
    editedAt: row.edited_at,
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
    publisher: null,
  };
}

// --- Sort helper ---

function sortByTimestamp(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => new Date(a.feedTimestamp).getTime() - new Date(b.feedTimestamp).getTime(),
  );
}

// --- Reducer ---

interface FeedState {
  messages: FeedMessage[];
  articles: FeedArticle[];
  podcasts: FeedPodcast[];
  loading: boolean;
  sending: boolean;
  hasMoreMessages: boolean;
}

type FeedAction =
  | { type: 'INITIAL_LOAD'; messages: FeedMessage[]; articles: FeedArticle[]; podcasts: FeedPodcast[]; hasMore: boolean }
  | { type: 'ADD_MESSAGE'; message: FeedMessage }
  | { type: 'UPDATE_MESSAGE'; updated: ChatMessageRow }
  | { type: 'PREPEND_MESSAGES'; messages: FeedMessage[]; hasMore: boolean }
  | { type: 'ADD_ARTICLE'; article: FeedArticle }
  | { type: 'UPDATE_ARTICLE'; updated: ArticleRow }
  | { type: 'ADD_PODCAST'; podcast: FeedPodcast }
  | { type: 'UPDATE_PODCAST'; updated: PodcastRow }
  | { type: 'SET_SENDING'; sending: boolean }
  | { type: 'REMOVE_MESSAGE'; messageId: number }
  | { type: 'EDIT_MESSAGE'; messageId: number; content: string };

function evict<T>(arr: T[]): T[] {
  if (arr.length > MAX_FEED_ITEMS) return arr.slice(arr.length - MAX_FEED_ITEMS);
  return arr;
}

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case 'INITIAL_LOAD':
      return {
        ...state,
        messages: action.messages,
        articles: action.articles,
        podcasts: action.podcasts,
        loading: false,
        hasMoreMessages: action.hasMore,
      };

    case 'ADD_MESSAGE':
      return { ...state, messages: evict([...state.messages, action.message]) };

    case 'UPDATE_MESSAGE': {
      const u = action.updated;
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id !== u.id
            ? msg
            : {
                ...msg,
                content: u.content,
                imageUrls: u.image_urls ?? [],
                likeCount: u.like_count,
                dislikeCount: u.dislike_count,
                replyCount: u.reply_count,
                editedAt: u.edited_at,
                isRemoved: u.is_removed ?? false,
                removedAt: u.removed_at,
                removedBy: u.removed_by,
              },
        ),
      };
    }

    case 'PREPEND_MESSAGES':
      return {
        ...state,
        messages: [...action.messages, ...state.messages],
        hasMoreMessages: action.hasMore,
      };

    case 'ADD_ARTICLE':
      return { ...state, articles: evict([...state.articles, action.article]) };

    case 'UPDATE_ARTICLE': {
      const u = action.updated;
      return {
        ...state,
        articles: state.articles.map((art) =>
          art.id !== u.id
            ? art
            : {
                ...art,
                title: u.title,
                excerpt: u.excerpt,
                coverImageUrl: u.cover_image_url,
                likeCount: u.like_count,
                viewCount: u.view_count,
              },
        ),
      };
    }

    case 'ADD_PODCAST':
      return { ...state, podcasts: evict([...state.podcasts, action.podcast]) };

    case 'UPDATE_PODCAST': {
      const u = action.updated;
      return {
        ...state,
        podcasts: state.podcasts.map((pod) =>
          pod.id !== u.id
            ? pod
            : {
                ...pod,
                title: u.title,
                description: u.description,
                coverImageUrl: u.cover_image_url,
                likeCount: u.like_count,
              },
        ),
      };
    }

    case 'SET_SENDING':
      return { ...state, sending: action.sending };

    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id !== action.messageId
            ? msg
            : { ...msg, content: null, imageUrls: [], isRemoved: true },
        ),
      };

    case 'EDIT_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id !== action.messageId
            ? msg
            : { ...msg, content: action.content, editedAt: new Date().toISOString() },
        ),
      };

    default:
      return state;
  }
}

const initialState: FeedState = {
  messages: [],
  articles: [],
  podcasts: [],
  loading: true,
  sending: false,
  hasMoreMessages: true,
};

// --- Send options ---

interface SendOptions {
  content?: string;
  imageUrls?: string[];
  parentId?: number;
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
  editMessage: (messageId: number, content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  getMessageById: (id: number) => FeedMessage | undefined;
}

export function useFeed(communityId: number, userId: string | null): UseFeedReturn {
  const [state, dispatch] = useReducer(feedReducer, initialState);
  const supabaseRef = useRef(createClient());

  // Client-side member cache to avoid N+1 queries on Realtime INSERTs
  const memberCacheRef = useRef(new Map<string, Pick<MemberRow, 'id' | 'username' | 'avatar_url'>>());

  // Debounce buffer for Realtime events
  const realtimeBufferRef = useRef<FeedAction[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function bufferAndFlush(action: FeedAction) {
    realtimeBufferRef.current.push(action);
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      const batch = realtimeBufferRef.current.splice(0);
      // React 18+ batches synchronous dispatches in setTimeout automatically
      batch.forEach(a => dispatch(a));
    }, REALTIME_DEBOUNCE_MS);
  }

  // Helper: resolve member from cache or fetch
  async function resolveMember(
    memberId: string | null,
  ): Promise<Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null> {
    if (!memberId) return null;
    const cached = memberCacheRef.current.get(memberId);
    if (cached) return cached;
    const { data } = await supabaseRef.current
      .from('members')
      .select('id, username, avatar_url')
      .eq('id', memberId)
      .single();
    const member = data as Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null;
    if (member) memberCacheRef.current.set(member.id, member);
    return member;
  }

  // Merged and sorted feed
  const items = useMemo(
    () => sortByTimestamp([...state.messages, ...state.articles, ...state.podcasts]),
    [state.messages, state.articles, state.podcasts],
  );

  // --- Initial load ---

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      const supabase = supabaseRef.current;

      const [messagesRes, articlesRes, podcastsRes] = await Promise.all([
        supabase
          .from('chat_messages')
          .select(CHAT_MSG_SELECT)
          .eq('community_id', communityId)
          .order('created_at', { ascending: false })
          .limit(FEED_INITIAL_LIMIT),
        supabase
          .from('articles')
          .select(ARTICLE_SELECT)
          .eq('community_id', communityId)
          .eq('is_published', true)
          .eq('is_removed', false)
          .order('published_at', { ascending: false })
          .limit(FEED_INITIAL_LIMIT),
        supabase
          .from('podcasts')
          .select(PODCAST_SELECT)
          .eq('community_id', communityId)
          .eq('is_published', true)
          .or('is_removed.eq.false,is_removed.is.null')
          .order('created_at', { ascending: false })
          .limit(FEED_INITIAL_LIMIT),
      ]);

      if (cancelled) return;

      const messages = (messagesRes.data ?? [])
        .reverse()
        .map((row) => {
          const typed = row as unknown as ChatMessageWithJoin;
          // Populate member cache from initial load
          if (typed.members) memberCacheRef.current.set(typed.members.id, typed.members);
          return messageToFeedItem(typed);
        });

      const articles = (articlesRes.data ?? []).map((row) => {
        const typed = row as unknown as ArticleWithJoin;
        if (typed.members) memberCacheRef.current.set(typed.members.id, typed.members);
        return articleToFeedItem(typed);
      });

      const podcasts = (podcastsRes.data ?? []).map((row) =>
        podcastToFeedItem(row as PodcastRow),
      );

      dispatch({
        type: 'INITIAL_LOAD',
        messages,
        articles,
        podcasts,
        hasMore: (messagesRes.data ?? []).length === FEED_INITIAL_LIMIT,
      });
    }

    loadFeed();
    return () => { cancelled = true; };
  }, [communityId]);

  // --- Realtime subscriptions (consolidated: 3 channels → 1) ---

  useEffect(() => {
    // Skip Realtime for anonymous visitors (saves connections)
    if (!userId) return;

    let cancelled = false;
    const supabase = supabaseRef.current;

    const feedChannel = supabase
      .channel(`feed:${communityId}`)
      // chat_messages INSERT
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `community_id=eq.${communityId}` },
        async (payload: RealtimePostgresInsertPayload<ChatMessageRow>) => {
          const newMsg = payload.new;
          const member = await resolveMember(newMsg.member_id);
          if (cancelled) return;
          bufferAndFlush({ type: 'ADD_MESSAGE', message: messageToFeedItem({ ...newMsg, members: member }) });
        },
      )
      // chat_messages UPDATE
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `community_id=eq.${communityId}` },
        (payload: RealtimePostgresUpdatePayload<ChatMessageRow>) => {
          if (cancelled) return;
          bufferAndFlush({ type: 'UPDATE_MESSAGE', updated: payload.new });
        },
      )
      // articles INSERT
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'articles', filter: `community_id=eq.${communityId}` },
        async (payload: RealtimePostgresInsertPayload<ArticleRow>) => {
          const newArt = payload.new;
          if (!newArt.is_published) return;
          const member = await resolveMember(newArt.author_id);
          if (cancelled) return;
          bufferAndFlush({ type: 'ADD_ARTICLE', article: articleToFeedItem({ ...newArt, members: member } as ArticleWithJoin) });
        },
      )
      // articles UPDATE
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'articles', filter: `community_id=eq.${communityId}` },
        (payload: RealtimePostgresUpdatePayload<ArticleRow>) => {
          if (cancelled) return;
          bufferAndFlush({ type: 'UPDATE_ARTICLE', updated: payload.new });
        },
      )
      // podcasts INSERT
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'podcasts', filter: `community_id=eq.${communityId}` },
        (payload: RealtimePostgresInsertPayload<PodcastRow>) => {
          if (cancelled) return;
          const newPod = payload.new;
          if (!newPod.is_published) return;
          bufferAndFlush({ type: 'ADD_PODCAST', podcast: podcastToFeedItem(newPod) });
        },
      )
      // podcasts UPDATE
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'podcasts', filter: `community_id=eq.${communityId}` },
        (payload: RealtimePostgresUpdatePayload<PodcastRow>) => {
          if (cancelled) return;
          bufferAndFlush({ type: 'UPDATE_PODCAST', updated: payload.new });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(flushTimerRef.current);
      supabase.removeChannel(feedChannel);
    };
  }, [communityId, userId]);

  // --- Send messages ---

  const send = useCallback(
    async (options: SendOptions) => {
      if (!userId) return;
      const hasContent = options.content && options.content.trim();
      const hasImages = options.imageUrls && options.imageUrls.length > 0;

      if (!hasContent && !hasImages) return;

      if (hasContent || hasImages) {
        const result = messageSchema.safeParse({
          content: hasContent ? options.content!.trim() : '',
          imageUrls: options.imageUrls,
        });
        if (!result.success) return;
      }

      dispatch({ type: 'SET_SENDING', sending: true });
      try {
        await supabaseRef.current.from('chat_messages').insert({
          community_id: communityId,
          member_id: userId,
          content: hasContent ? options.content!.trim() : null,
          image_urls: options.imageUrls ?? [],
          parent_id: options.parentId ?? null,
        });
      } finally {
        dispatch({ type: 'SET_SENDING', sending: false });
      }
    },
    [communityId, userId],
  );

  const sendMessage = useCallback(
    async (content: string, imageUrls?: string[]) => { await send({ content, imageUrls }); },
    [send],
  );

  const sendReply = useCallback(
    async (parentId: number, content: string, imageUrls?: string[]) => {
      await send({ content, imageUrls, parentId });
    },
    [send],
  );

  const editMessage = useCallback(
    async (messageId: number, content: string) => {
      if (!userId) return;
      const trimmed = content.trim();
      if (!trimmed) return;
      dispatch({ type: 'EDIT_MESSAGE', messageId, content: trimmed });
      await supabaseRef.current
        .from('chat_messages')
        .update({ content: trimmed, edited_at: new Date().toISOString() })
        .eq('id', messageId);
    },
    [userId],
  );

  // --- Load more (messages only) ---

  const loadMore = useCallback(async () => {
    if (!state.hasMoreMessages || state.messages.length === 0) return;

    const oldestMsg = state.messages[0];
    const { data } = await supabaseRef.current
      .from('chat_messages')
      .select(CHAT_MSG_SELECT)
      .eq('community_id', communityId)
      .lt('created_at', oldestMsg.createdAt)
      .order('created_at', { ascending: false })
      .limit(FEED_LOAD_MORE_LIMIT);

    if (data) {
      const olderMsgs = data
        .reverse()
        .map((row) => {
          const typed = row as unknown as ChatMessageWithJoin;
          if (typed.members) memberCacheRef.current.set(typed.members.id, typed.members);
          return messageToFeedItem(typed);
        });
      dispatch({
        type: 'PREPEND_MESSAGES',
        messages: olderMsgs,
        hasMore: data.length === FEED_LOAD_MORE_LIMIT,
      });
    }
  }, [communityId, state.hasMoreMessages, state.messages]);

  // --- Delete ---

  const deleteMessage = useCallback(
    async (messageId: number) => {
      if (!userId) return;
      dispatch({ type: 'REMOVE_MESSAGE', messageId });
      await supabaseRef.current
        .from('chat_messages')
        .update({
          content: null,
          image_urls: [],
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
    (id: number) => state.messages.find((m) => m.id === id),
    [state.messages],
  );

  return {
    items,
    messages: state.messages,
    loading: state.loading,
    sending: state.sending,
    hasMore: state.hasMoreMessages,
    sendMessage,
    sendReply,
    editMessage,
    loadMore,
    deleteMessage,
    getMessageById,
  };
}
