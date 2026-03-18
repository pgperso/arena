'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChatRoom } from '@/components/chat/ChatRoom';
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
  const [isMember, setIsMember] = useState(initialIsMember);
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!userId) {
      router.push('/login');
      return;
    }
    setJoining(true);
    const supabase = createClient();
    const { error } = await supabase.from('community_members').insert({
      community_id: community.id,
      member_id: userId,
    });
    if (!error) {
      setIsMember(true);
      router.refresh();
    }
    setJoining(false);
  }

  async function handleLeave() {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('member_id', userId);
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
          {community.logo_url ? (
            <img
              src={community.logo_url}
              alt={community.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: community.primary_color }}
            >
              {community.name[0]}
            </div>
          )}
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

      {/* Chat room */}
      <div className="flex-1 overflow-hidden rounded-none border-t border-gray-200 bg-white">
        <ChatRoom
          communityId={community.id}
          communityName={community.name}
          isMember={isMember}
          isMuted={isMuted}
          canModerate={canModerate}
        />
      </div>
    </div>
  );
}
