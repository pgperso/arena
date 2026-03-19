'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { Avatar } from '@/components/ui/Avatar';
import { useSupabase } from '@/hooks/useSupabase';
import { joinCommunity, leaveCommunity } from '@/services/communityService';
import Link from 'next/link';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface CommunityPageClientProps {
  community: CommunityRow;
  isMember: boolean;
  canModerate: boolean;
  isMuted: boolean;
  userId: string | null;
}

export function CommunityPageClient({
  community,
  isMember: initialIsMember,
  canModerate,
  isMuted,
  userId,
}: CommunityPageClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!userId) {
      router.push('/login');
      return;
    }
    setJoining(true);
    const { error } = await joinCommunity(supabase, community.id, userId);
    if (!error) {
      setIsMember(true);
      router.refresh();
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!userId) return;
    const { error } = await leaveCommunity(supabase, community.id, userId);
    if (!error) {
      setIsMember(false);
      router.refresh();
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Community bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: community.primary_color + '10' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Communautés
          </Link>
          <span className="text-gray-300">|</span>
          <Avatar url={community.logo_url} name={community.name} size="md" color={community.primary_color} />
          <span className="font-semibold text-gray-900">{community.name}</span>
          <span className="text-sm text-gray-500">
            {community.member_count} membre{community.member_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {userId && (
            isMember ? (
              <button
                onClick={handleLeave}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600"
              >
                Quitter
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {joining ? 'En cours...' : 'Rejoindre'}
              </button>
            )
          )}
        </div>
      </div>

      {/* 3-column layout: [Ad left] | [Feed] | [Ad right] */}
      <div className="flex flex-1 overflow-hidden border-t border-gray-200">
        {/* Left ad sidebar - xl+ only */}
        <AdSidebar position="left" />

        {/* Central feed area */}
        <div className="flex-1 overflow-hidden bg-white">
          <FeedContainer
            communityId={community.id}
            communityName={community.name}
            communitySlug={community.slug}
            isMember={isMember}
            isMuted={isMuted}
            canModerate={canModerate}
          />
        </div>

        {/* Right ad sidebar - xl+ only (below online members in FeedContainer) */}
        <AdSidebar position="right" />
      </div>

      {/* Mobile sticky ad banner */}
      <AdAnchor />
    </div>
  );
}
