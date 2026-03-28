'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { useSupabase } from '@/hooks/useSupabase';
import { joinCommunity } from '@/services/communityService';
import { useTribune } from '@/contexts/TribuneContext';
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
  const { setTribune } = useTribune();
  const [isMember, setIsMember] = useState(initialIsMember);
  const [joining, setJoining] = useState(false);
  const [memberCount, setMemberCount] = useState(community.member_count);
  const [showJoinModal, setShowJoinModal] = useState(!initialIsMember);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Tell the Header we're in a tribune + track last visit for sorting
  useEffect(() => {
    setTribune({ name: community.name, slug: community.slug });
    try {
      const visits = JSON.parse(localStorage.getItem('tribune_visits') || '{}');
      visits[community.id] = Date.now();
      localStorage.setItem('tribune_visits', JSON.stringify(visits));
    } catch { /* ignore */ }
    return () => setTribune(null);
  }, [community.name, community.slug, community.id, setTribune]);

  // Load user's communities for horizontal tribune selector
  const [userCommunities, setUserCommunities] = useState<{ id: number; slug: string; name: string; logo_url: string | null }[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('community_members')
      .select('community_id, communities!inner(id, name, slug, logo_url)')
      .eq('member_id', userId)
      .then(({ data }) => {
        if (data) {
          const comms = (data as unknown as { communities: { id: number; name: string; slug: string; logo_url: string | null } }[])
            .map((d) => d.communities)
            .sort((a, b) => a.name.localeCompare(b.name));
          setUserCommunities(comms);
        }
      });
  }, [supabase, userId]);

  // Auto-scroll active tribune into view
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [userCommunities]);

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


  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Join / Login modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[#1e1e1e] p-6 shadow-xl">
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <Image
                src={community.logo_url || '/images/fanstribune.webp'}
                alt={community.name}
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
              />
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{community.name}</h2>
              {community.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{community.description}</p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  className="mt-2 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:border-gray-400"
                >
                  {t('auth.register')}
                </Link>
              </>
            )}
            <Link
              href="/"
              className="mt-3 block w-full text-center text-sm text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400"
            >
              &larr; {t('common.back')}
            </Link>
          </div>
        </div>
      )}

      {/* Horizontal tribune selector — scrollable tabs */}
      {userCommunities && userCommunities.length > 1 && (
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e]">
          <div
            ref={scrollRef}
            className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 scrollbar-none"
          >
            {userCommunities.map((c) => {
              const isActive = c.id === community.id;
              return (
                <Link
                  key={c.id}
                  ref={isActive ? activeTabRef : undefined}
                  href={`/tribunes/${c.slug}`}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Image
                    src={c.logo_url || '/images/fanstribune.webp'}
                    alt={c.name}
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 rounded object-contain"
                  />
                  <span className="whitespace-nowrap">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {isMember ? (
        <>
          {/* 3-column layout: [Ad left] | [Feed] | [Ad right] */}
          <div className="flex flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700">
            {/* Left ad sidebar - xl+ only */}
            <AdSidebar position="left" />

            {/* Central feed area */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-[#1e1e1e]">
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
        <div className="flex flex-1 items-center justify-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e]">
          <p className="text-sm text-gray-400">
            {t('community.joinToAccess')}
          </p>
        </div>
      )}
    </div>
  );
}
