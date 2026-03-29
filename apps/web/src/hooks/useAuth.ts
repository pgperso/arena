'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  username: string | null;
  avatarUrl: string | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function getUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setUser(user);

        if (user) {
          const { data: member } = await supabase
            .from('members')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();
          if (cancelled) return;
          setUsername(member?.username ?? null);
          setAvatarUrl(member?.avatar_url ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: member } = await supabase
          .from('members')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();
        if (cancelled) return;
        setUsername(member?.username ?? null);
        setAvatarUrl(member?.avatar_url ?? null);
      } else {
        setUsername(null);
        setAvatarUrl(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, username, avatarUrl, loading };
}
