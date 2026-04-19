'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { FeedContainer } from '@/components/feed/FeedContainer';
import { PressContentCard } from '@/components/press/PressContentCard';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { AdSlot } from '@/components/ads/AdSlot';
import { useSupabase } from '@/hooks/useSupabase';
import { joinCommunity } from '@/services/communityService';
import { useTribune } from '@/contexts/TribuneContext';
import type { PressGalleryItem } from '@/services/pressGalleryService';
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
  hubArticles: PressGalleryItem[];
  hubPodcasts: PressGalleryItem[];
}

export function CommunityPageClient({
  community,
  isMember: initialIsMember,
  canModerate,
  canCreateContent,
  staffRoles,
  isMuted,
  userId,
  hubArticles,
  hubPodcasts,
}: CommunityPageClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const t = useTranslations();
  const { setTribune } = useTribune();
  const [isMember] = useState(initialIsMember);
  const [joining, setJoining] = useState(false);
  const [memberCount] = useState(community.member_count);
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

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  // Auto-scroll active tribune into view + init scroll buttons
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      // Update after scroll animation
      setTimeout(updateScrollButtons, 350);
    }
  }, [userCommunities, updateScrollButtons]);

  // Convert vertical mousewheel to horizontal scroll on desktop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el!.scrollLeft += e.deltaY;
        updateScrollButtons();
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    updateScrollButtons();
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', updateScrollButtons);
    };
  }, [userCommunities, updateScrollButtons]);

  function scrollTribunes(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
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
    // router.refresh() re-fetches the server component. The server now
    // returns isMember=true, which changes the key from "id-false" to
    // "id-true". React destroys this instance and creates a fresh one
    // with initialIsMember=true — all state initializes correctly.
    router.refresh();
  }


  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Horizontal tribune selector — scrollable tabs */}
      {userCommunities && userCommunities.length > 1 && (
        <div className="relative shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e]">
          {/* Left scroll arrow + fade */}
          {canScrollLeft && (
            <button
              onClick={() => scrollTribunes('left')}
              className="absolute left-0 top-0 z-10 hidden h-full items-center bg-gradient-to-r from-gray-50 via-gray-50/90 to-transparent pl-1 pr-3 dark:from-[#1e1e1e] dark:via-[#1e1e1e]/90 md:flex"
            >
              <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 scrollbar-none"
          >
            {/* Galerie de presse — always visible */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6V7.5Z" />
              </svg>
              <span className="whitespace-nowrap">Galerie de presse</span>
            </Link>

            {/* Separator */}
            <div className="mx-0.5 h-5 w-px shrink-0 bg-gray-300 dark:bg-gray-600" />

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
                  <div className="relative shrink-0">
                    <Image
                      src={c.logo_url || '/images/fanstribune.webp'}
                      alt={c.name}
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded object-contain"
                    />
                    {(() => {
                      try {
                        const visits = JSON.parse(localStorage.getItem('tribune_visits') || '{}');
                        const lastVisit = visits[c.id];
                        if (lastVisit && Date.now() - lastVisit < 15 * 60 * 1000) {
                          return <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-500 ring-1 ring-white dark:ring-[#1e1e1e]" />;
                        }
                      } catch { /* ignore */ }
                      return null;
                    })()}
                  </div>
                  <span className="whitespace-nowrap">{c.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right scroll arrow + fade */}
          {canScrollRight && (
            <button
              onClick={() => scrollTribunes('right')}
              className="absolute right-0 top-0 z-10 hidden h-full items-center bg-gradient-to-l from-gray-50 via-gray-50/90 to-transparent pl-3 pr-1 dark:from-[#1e1e1e] dark:via-[#1e1e1e]/90 md:flex"
            >
              <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
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
        <div className="flex-1 overflow-y-auto border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e]">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-10">
            {/* Community header */}
            <header className="mb-8 flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
              <Image
                src={community.logo_url || '/images/fanstribune.webp'}
                alt={community.name}
                width={96}
                height={96}
                className="h-20 w-20 shrink-0 object-contain md:h-24 md:w-24"
                priority
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
                  {community.name}
                </h1>
                {community.description && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400 md:text-base">
                    {community.description}
                  </p>
                )}
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-500">
                  {t('common.members', { count: memberCount })}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  {userId ? (
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
                    >
                      {joining ? t('community.joining') : t('community.joinThisTribune')}
                    </button>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-dark"
                      >
                        {t('auth.loginAction')}
                      </Link>
                      <Link
                        href="/register"
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        {t('auth.register')}
                      </Link>
                    </>
                  )}
                </div>
                {joinError && (
                  <p className="mt-2 text-xs text-red-500">{joinError}</p>
                )}
              </div>
            </header>

            {/* Articles récents */}
            {hubArticles.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
                  {t('community.recentArticles')}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {hubArticles.slice(0, 6).map((item) => (
                    <PressContentCard key={`article-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Ad banner between articles and podcasts */}
            <div className="my-8 flex justify-center">
              <AdSlot slotId="home-mid-banner" format="leaderboard" />
            </div>

            {/* Podcasts récents */}
            {hubPodcasts.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
                  {t('community.recentPodcasts')}
                </h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {hubPodcasts.slice(0, 6).map((item) => (
                    <PressContentCard key={`podcast-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
            )}

            {hubArticles.length === 0 && hubPodcasts.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('community.noContentYet')}
              </p>
            )}

            {/* Join CTA card */}
            <section className="mt-10 rounded-xl border border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-transparent p-6 md:p-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
                  {t('community.joinDiscussionTitle')}
                </h2>
                <p className="mb-5 text-sm text-gray-700 dark:text-gray-300 md:text-base">
                  {t('community.joinDiscussionBody')}
                </p>
                {userId ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
                  >
                    {joining ? t('community.joining') : t('community.joinThisTribune')}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-block rounded-lg bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-dark"
                  >
                    {t('auth.loginAction')}
                  </Link>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
