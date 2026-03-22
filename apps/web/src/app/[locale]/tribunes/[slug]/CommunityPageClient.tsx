'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { Avatar } from '@/components/ui/Avatar';
import { useSupabase } from '@/hooks/useSupabase';
import { joinCommunity, leaveCommunity } from '@/services/communityService';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface CommunityPageClientProps {
  community: CommunityRow;
  isMember: boolean;
  canModerate: boolean;
  canCreateContent: boolean;
  isMuted: boolean;
  userId: string | null;
  staffRoles: Record<string, string>;
}

export function CommunityPageClient({
  community,
  isMember: initialIsMember,
  canModerate,
  canCreateContent,
  staffRoles,
  isMuted,
  userId,
}: CommunityPageClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const t = useTranslations();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [joining, setJoining] = useState(false);
  const [memberCount, setMemberCount] = useState(community.member_count);
  const [showJoinModal, setShowJoinModal] = useState(!initialIsMember);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
    // router.refresh() re-fetches the server component. The server now
    // returns isMember=true, which changes the key from "id-false" to
    // "id-true". React destroys this instance and creates a fresh one
    // with initialIsMember=true — all state initializes correctly.
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
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      {/* Join / Login modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <Image
                src={community.logo_url || '/images/fanstribune.webp'}
                alt={community.name}
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
              <h2 className="text-lg font-bold text-gray-900">{community.name}</h2>
              {community.description && (
                <p className="text-sm text-gray-500">{community.description}</p>
              )}
              <p className="text-sm text-gray-600">
                {t('common.members', { count: memberCount })}
              </p>
            </div>

            {userId ? (
              <>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  {joining ? t('community.joining') : t('community.joinThisTribune')}
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
                  {t('auth.loginAction')}
                </Link>
                <Link
                  href="/register"
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700 transition hover:border-gray-400"
                >
                  {t('auth.register')}
                </Link>
              </>
            )}
            <Link
              href="/"
              className="mt-3 block w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
            >
              &larr; {t('common.back')}
            </Link>
          </div>
        </div>
      )}

      {/* Community bar */}
      <div
        className="flex shrink-0 items-center justify-between bg-gray-100 px-4 py-2"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-brand-blue-dark sm:px-3"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            <span className="hidden sm:inline">{t('community.backToTribunes')}</span>
          </Link>
          <span className="font-semibold text-gray-900">{community.name}</span>
          <span className="hidden text-sm text-gray-500 sm:inline">
            {t('common.members', { count: memberCount })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {userId && (
            isMember ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600"
              >
                <span className="sm:hidden">{t('community.leave')}</span>
                <span className="hidden sm:inline">{t('community.leaveTribune')}</span>
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {joining ? t('common.loading') : t('community.join')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-gray-900">{t('community.leaveTitle', { name: community.name })}</h3>
            <p className="mb-5 text-sm text-gray-500">
              {t('community.leaveMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { setShowLeaveConfirm(false); handleLeave(); }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                {t('community.leave')}
              </button>
            </div>
          </div>
        </div>
      )}

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
                canCreateContent={canCreateContent}
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
            {t('community.joinToAccess')}
          </p>
        </div>
      )}
    </div>
  );
}
