'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHAT_MESSAGE_LIMIT } from '@arena/shared';
import type { RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];

export interface ChatMessageWithMember extends ChatMessageRow {
  members: Pick<MemberRow, 'id' | 'username' | 'avatar_url'> | null;
}

interface SendOptions {
  content?: string;
  imageUrls?: string[];
  parentId?: number;
  repostOfId?: number;
  quoteOfId?: number;
}

interface UseChatReturn {
  messages: ChatMessageWithMember[];
  loading: boolean;
  sending: boolean;
  hasMore: boolean;
  sendMessage: (content: string, imageUrls?: string[]) => Promise<void>;
  sendReply: (parentId: number, content: string, imageUrls?: string[]) => Promise<void>;
  sendRepost: (repostOfId: number) => Promise<void>;
  sendQuote: (quoteOfId: number, content: string, imageUrls?: string[]) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  getMessageById: (id: number) => ChatMessageWithMember | undefined;
}

export function useChat(communityId: number, userId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const supabaseRef = useRef(createClient());

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      const { data } = await supabaseRef.current
        .from('chat_messages')
        .select('*, members:members!chat_messages_member_id_fkey(id, username, avatar_url)')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(CHAT_MESSAGE_LIMIT);

      if (data) {
        setMessages(data.reverse() as unknown as ChatMessageWithMember[]);
        setHasMore(data.length === CHAT_MESSAGE_LIMIT);
      }
      setLoading(false);
    }

    loadMessages();
  }, [communityId]);

  // Subscribe to realtime changes
  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`chat:${communityId}`)
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
          const msgWithMember: ChatMessageWithMember = {
            ...newMsg,
            members: member,
          };
          setMessages((prev) => [...prev, msgWithMember]);
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
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updated.id ? { ...msg, ...updated } : msg,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId]);

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

  const loadMore = useCallback(async () => {
    if (!hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    const { data } = await supabaseRef.current
      .from('chat_messages')
      .select('*, members:members!chat_messages_member_id_fkey(id, username, avatar_url)')
      .eq('community_id', communityId)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(CHAT_MESSAGE_LIMIT);

    if (data) {
      setMessages((prev) => [...(data.reverse() as unknown as ChatMessageWithMember[]), ...prev]);
      setHasMore(data.length === CHAT_MESSAGE_LIMIT);
    }
  }, [communityId, hasMore, messages]);

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

  const getMessageById = useCallback(
    (id: number) => messages.find((m) => m.id === id),
    [messages],
  );

  return {
    messages,
    loading,
    sending,
    hasMore,
    sendMessage,
    sendReply,
    sendRepost,
    sendQuote,
    loadMore,
    deleteMessage,
    getMessageById,
  };
}
