'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CommunityCard } from './CommunityCard';

interface Community {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  member_count: number;
  logo_url: string | null;
}

interface CommunityGridProps {
  communities: Community[];
}

export function CommunityGrid({ communities }: CommunityGridProps) {
  const { user } = useAuth();
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) {
      setJoinedIds(new Set());
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('community_members')
      .select('community_id')
      .eq('member_id', user.id)
      .limit(500)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setJoinedIds(new Set(data.map((m) => m.community_id)));
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => (
        <CommunityCard
          key={community.id}
          name={community.name}
          slug={community.slug}
          description={community.description}
          memberCount={community.member_count}
          logoUrl={community.logo_url}
          isMember={joinedIds.has(community.id)}
        />
      ))}
    </div>
  );
}
