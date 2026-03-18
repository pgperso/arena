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

interface UseChatReturn {
  messages: ChatMessageWithMember[];
  loading: boolean;
  sending: boolean;
  hasMore: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
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
          // Fetch the member info for the new message
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

  const sendMessage = useCallback(
    async (content: string) => {
      if (!userId || !content.trim()) return;
      setSending(true);
      await supabaseRef.current.from('chat_messages').insert({
        community_id: communityId,
        member_id: userId,
        content: content.trim(),
      });
      setSending(false);
    },
    [communityId, userId],
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

  return { messages, loading, sending, hasMore, sendMessage, loadMore, deleteMessage };
}
