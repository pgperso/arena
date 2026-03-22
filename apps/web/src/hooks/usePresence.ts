'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

export type PresenceStatus = 'online' | 'idle';

export interface PresenceMember {
  memberId: string;
  username: string;
  avatarUrl: string | null;
  status: PresenceStatus;
}

interface UsePresenceReturn {
  onlineMembers: PresenceMember[];
  onlineCount: number;
}

export function usePresence(
  communityId: number,
  userId: string | null,
  username: string | null,
  avatarUrl: string | null = null,
): UsePresenceReturn {
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const supabase = useSupabase();

  // Track visibility for idle detection
  const updateStatus = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !userId || !username) return;
    const status: PresenceStatus = document.visibilityState === 'visible' ? 'online' : 'idle';
    channel.track({ memberId: userId, username, avatarUrl, status });
  }, [userId, username, avatarUrl]);

  useEffect(() => {
    if (!userId || !username) return;

    const channel = supabase.channel(`presence:${communityId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const state = channel.presenceState<{
            memberId: string;
            username: string;
            avatarUrl: string | null;
            status?: PresenceStatus;
          }>();
          const members: PresenceMember[] = [];
          for (const key in state) {
            const presences = state[key];
            if (presences && presences.length > 0) {
              members.push({
                memberId: presences[0].memberId,
                username: presences[0].username,
                avatarUrl: presences[0].avatarUrl,
                status: presences[0].status ?? 'online',
              });
            }
          }
          setOnlineMembers(members);
        }, 500);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const presenceStatus: PresenceStatus = document.visibilityState === 'visible' ? 'online' : 'idle';
          await channel.track({ memberId: userId, username, avatarUrl, status: presenceStatus });
        }
      });

    // Listen to visibility changes for idle detection
    document.addEventListener('visibilitychange', updateStatus);

    return () => {
      clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', updateStatus);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [communityId, userId, username, avatarUrl, supabase, updateStatus]);

  return {
    onlineMembers,
    onlineCount: onlineMembers.length,
  };
}
