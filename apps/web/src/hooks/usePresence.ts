'use client';

import { useEffect, useState, useRef } from 'react';
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

  // Use refs for values that change but should NOT trigger re-subscription
  const avatarUrlRef = useRef(avatarUrl);
  avatarUrlRef.current = avatarUrl;
  const usernameRef = useRef(username);
  usernameRef.current = username;

  useEffect(() => {
    if (!userId || !username) return;

    const channel = supabase.channel(`presence:${communityId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    function syncPresence() {
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
    }

    function trackStatus() {
      if (!channelRef.current) return;
      const status: PresenceStatus = document.visibilityState === 'visible' ? 'online' : 'idle';
      channelRef.current.track({
        memberId: userId,
        username: usernameRef.current,
        avatarUrl: avatarUrlRef.current,
        status,
      });
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackStatus();
        }
      });

    // Listen to visibility changes for idle detection
    document.addEventListener('visibilitychange', trackStatus);

    return () => {
      clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', trackStatus);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // Only re-subscribe when community or user identity changes
    // avatarUrl changes are picked up via ref (no teardown needed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, userId, username, supabase]);

  return {
    onlineMembers,
    onlineCount: onlineMembers.length,
  };
}
