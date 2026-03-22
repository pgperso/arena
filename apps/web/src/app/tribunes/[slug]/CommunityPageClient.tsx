'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { Avatar } from '@/components/ui/Avatar';
import { useSupabase } from '@/hooks/useSupabase';
import { joinCommunity, leaveCommunity } from '@/services/communityService';
import Image from 'next/image';
import Link from 'next/link';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface CommunityPageClientProps {
  community: CommunityRow;
  isMember: boolean;
  canModerate: boolean;
  isMuted: boolean;
  userId: string | null;
  staffRoles: Record<string, string>;
}

export function CommunityPageClient({
  community,
  isMember: initialIsMember,
  canModerate,
  staffRoles,
  isMuted,
  userId,
}: CommunityPageClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [joining, setJoining] = useState(false);
  const [memberCount, setMemberCount] = useState(community.member_count);
  const [showJoinModal, setShowJoinModal] = useState(!initialIsMember);
  const [joinError, setJoinError] = useState<string | null>(null);

  // React-recommended pattern: sync state from server props after router.refresh()
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (initialIsMember && !isMember) {
    setIsMember(true);
    setShowJoinModal(false);
  }

  async function handleJoin() {
    if (!userId) {
      router.push('/login');
      return;
    }
    setJoining(true);
    setJoinError(null);
    const { error } = await joinCommunity(supabase, community.id, userId);
    if (error) {
      setJoinError(error.message);
      setJoining(false);
      return;
    }
    setMemberCount((c) => c + 1);
    // Don't set isMember locally — let the server be the source of truth.
    // router.refresh() re-fetches the server component which will pass
    // initialIsMember=true. The prop sync above handles the state update.
    // This guarantees the page renders from a clean server-validated state.
    router.refresh();
  }

  async function handleLeave() {
    if (!userId) return;
    const { error } = await leaveCommunity(supabase, community.id, userId);
    if (!error) {
      router.push('/');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Join / Login modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              {community.logo_url ? (
                <Image
                  src={community.logo_url}
                  alt={community.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <Avatar
                  name={community.name}
                  url={null}
                  size="lg"
                  color={community.primary_color}
                />
              )}
              <h2 className="text-lg font-bold text-gray-900">{community.name}</h2>
              {community.description && (
                <p className="text-sm text-gray-500">{community.description}</p>
              )}
              <p className="text-sm text-gray-600">
                {memberCount} membre{memberCount !== 1 ? 's' : ''}
              </p>
            </div>

            {userId ? (
              <>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  {joining ? 'Chargement de la tribune...' : 'Rejoindre cette tribune'}
                </button>
                {joinError && (
                  <p className="mt-2 text-center text-xs text-red-500">{joinError}</p>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block w-full rounded-lg bg-brand-blue px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-blue-dark"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 transition hover:border-gray-400"
                >
                  Créer un compte
                </Link>
              </>
            )}
            <Link
              href="/"
              className="mt-3 block w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
            >
              &larr; Retour aux tribunes
            </Link>
          </div>
        </div>
      )}

      {/* Community bar */}
      <div
        className="flex shrink-0 items-center justify-between bg-gray-100 px-4 py-2"
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Tribunes
          </Link>
          <span className="text-gray-300">|</span>
          <Avatar url={community.logo_url} name={community.name} size="md" color={community.primary_color} />
          <span className="font-semibold text-gray-900">{community.name}</span>
          <span className="text-sm text-gray-500">
            {memberCount} membre{memberCount !== 1 ? 's' : ''}
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

      {isMember ? (
        <>
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
                staffRoles={staffRoles}
              />
            </div>

            {/* Right ad sidebar - xl+ only (below online members in FeedContainer) */}
            <AdSidebar position="right" />
          </div>

          {/* Mobile sticky ad banner */}
          <AdAnchor />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">
            Rejoignez cette tribune pour accéder au contenu.
          </p>
        </div>
      )}
    </div>
  );
}
