'use client';

import { useEffect, useState, useRef } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

export interface PresenceMember {
  memberId: string;
  username: string;
  avatarUrl: string | null;
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
  const supabase = useSupabase();

  useEffect(() => {
    if (!userId || !username) return;

    const channel = supabase.channel(`presence:${communityId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          const state = channel.presenceState<{
            memberId: string;
            username: string;
            avatarUrl: string | null;
          }>();
          const members: PresenceMember[] = [];
          for (const key in state) {
            const presences = state[key];
            if (presences && presences.length > 0) {
              members.push({
                memberId: presences[0].memberId,
                username: presences[0].username,
                avatarUrl: presences[0].avatarUrl,
              });
            }
          }
          setOnlineMembers(members);
        }, 500);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            memberId: userId,
            username,
            avatarUrl,
          });
        }
      });

    return () => {
      clearTimeout(debounceRef.current);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [communityId, userId, username, avatarUrl]);

  return {
    onlineMembers,
    onlineCount: onlineMembers.length,
  };
}
