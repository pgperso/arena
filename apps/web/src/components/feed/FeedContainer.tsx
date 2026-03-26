'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { isGroupedMessage } from '@/lib/feedUtils';
import { useFeed } from '@/hooks/useFeed';
import type { FeedItem as FeedItemType, FeedMessage as FeedMessageType } from '@arena/shared';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { BatchLikeProvider } from '@/hooks/useBatchLikeStatus';
import { FeedItem } from './FeedItem';
import { FeedInput } from './FeedInput';
import { FeedSkeleton } from './FeedSkeleton';
import { FeedReplyBar } from './FeedReplyBar';
import dynamic from 'next/dynamic';
import { OnlineMembers } from '@/components/chat/OnlineMembers';
import { AdInFeed } from '@/components/ads/AdInFeed';
import { FEED_AD_INTERVAL } from '@arena/shared';
import { CommunityContentTab } from './CommunityContentTab';
import { Nordiquometre } from './Nordiquometre';
import { Exposmetre } from './Exposmetre';
import { Link } from '@/i18n/navigation';

const ArticleEditor = dynamic(() => import('@/components/article/ArticleEditor').then((m) => m.ArticleEditor), { ssr: false });
const ArticleList = dynamic(() => import('@/components/article/ArticleList').then((m) => m.ArticleList), { ssr: false });
const PodcastEditor = dynamic(() => import('@/components/podcast/PodcastEditor').then((m) => m.PodcastEditor), { ssr: false });
const ModerationPanel = dynamic(() => import('@/components/moderation/ModerationPanel').then((m) => m.ModerationPanel), { ssr: false });

type DisplayItem =
  | { kind: 'feed'; item: FeedItemType; index: number }
  | { kind: 'ad'; adIndex: number };

interface FeedContainerProps {
  communityId: number;
  communityName: string;
  communitySlug: string;
  isMember: boolean;
  isMuted: boolean;
  canModerate: boolean;
  canCreateContent: boolean;
  staffRoles: Record<string, string>;
  onLeave?: () => void;
}

export function FeedContainer({
  communityId,
  communityName,
  communitySlug,
  isMember,
  isMuted,
  canModerate,
  canCreateContent,
  staffRoles,
  onLeave,
}: FeedContainerProps) {
  const router = useRouter();
  const t = useTranslations('tribune');
  const { user, username, avatarUrl } = useAuth();
  const {
    items,
    loading,
    hasMore,
    sendMessage,
    sendReply,
    editMessage,
    loadMore,
    deleteMessage,
    getMessageById,
  } = useFeed(communityId, user?.id ?? null);
  const { onlineMembers } = usePresence(communityId, user?.id ?? null, username, avatarUrl);

  // Build a status map for quick lookup in messages
  const onlineStatuses = useMemo(() => {
    const map: Record<string, 'online' | 'idle'> = {};
    for (const m of onlineMembers) {
      map[m.memberId] = m.status;
    }
    return map;
  }, [onlineMembers]);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showArticleList, setShowArticleList] = useState(false);
  const [showPodcastEditor, setShowPodcastEditor] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'content' | 'nordiquometre' | 'exposmetre'>('chat');
  const isNordiques = communitySlug === 'nordiques-quebec' || communitySlug === 'nordiques-de-quebec';
  const isExpos = communitySlug === 'expos-de-montreal' || communitySlug === 'expos-montreal';

  // Reply state
  const [replyTarget, setReplyTarget] = useState<FeedMessageType | null>(null);

  // Edit state — only one message at a time (Discord behavior)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);

  // Mutable staff roles (updated when owner changes a role via popover)
  const [liveStaffRoles, setLiveStaffRoles] = useState(staffRoles);
  const handleRoleChanged = useCallback((memberId: string, newRole: string | null) => {
    setLiveStaffRoles((prev) => {
      const next = { ...prev };
      if (newRole) {
        next[memberId] = newRole;
      } else {
        delete next[memberId];
      }
      return next;
    });
  }, []);

  // Interleave ads into the items list
  const displayItems: DisplayItem[] = useMemo(() => {
    const result: DisplayItem[] = [];
    items.forEach((item, i) => {
      result.push({ kind: 'feed', item, index: i });
      if ((i + 1) % FEED_AD_INTERVAL === 0) {
        result.push({ kind: 'ad', adIndex: Math.floor(i / FEED_AD_INTERVAL) });
      }
    });
    return result;
  }, [items]);

  // Find active live podcast for sticky player
  const activeLive = useMemo(() => {
    return items.find(
      (item) => item.feedType === 'podcast' && item.isLive && item.youtubeVideoId,
    ) as (FeedItemType & { feedType: 'podcast'; youtubeVideoId: string }) | undefined;
  }, [items]);

  function getInputPlaceholder(): string {
    if (!user) return `${t('loginToChat')} ${t('toParticipate')}`;
    if (!isMember) return t('joinToChat');
    if (isMuted) return t('muted');
    if (replyTarget) return t('replyTo', { username: replyTarget.member?.username ?? t('deletedUser') });
    return t('writeMessage');
  }

  const handleSend = useCallback(
    async (content: string, imageUrls?: string[]) => {
      if (replyTarget) {
        await sendReply(replyTarget.id, content, imageUrls);
        setReplyTarget(null);
      } else {
        await sendMessage(content, imageUrls);
      }
    },
    [replyTarget, sendReply, sendMessage],
  );

  const handleReply = useCallback((message: FeedMessageType) => {
    setReplyTarget(message);
  }, []);

  const scrollToMessage = useCallback(
    (messageId: number) => {
      const index = displayItems.findIndex(
        (d) => d.kind === 'feed' && d.item.feedType === 'message' && d.item.id === messageId,
      );
      if (index === -1) return;
      virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    },
    [displayItems],
  );

  const handleStartReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadMore().then(() => setLoadingMore(false));
  }, [hasMore, loadingMore, loadMore]);

  const inputDisabled = !user || !isMember || isMuted;

  // Collect IDs for batch like queries (3 queries instead of 50+)
  const { messageIds, articleIds, podcastIds } = useMemo(() => {
    const mIds: number[] = [];
    const aIds: number[] = [];
    const pIds: number[] = [];
    for (const item of items) {
      if (item.feedType === 'message') mIds.push(item.id);
      else if (item.feedType === 'article') aIds.push(item.id);
      else if (item.feedType === 'podcast') pIds.push(item.id);
    }
    return { messageIds: mIds, articleIds: aIds, podcastIds: pIds };
  }, [items]);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Feed area */}
      <div className="relative flex flex-1 flex-col overflow-hidden dark:border-x dark:border-gray-700">
        {/* Header — compact on mobile (no name, just actions), full on desktop */}
        <div className="flex shrink-0 items-center justify-end border-b border-gray-200 dark:border-gray-700 px-3 py-1.5 md:justify-between md:px-4 md:py-3">
          <div className="hidden md:block">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{communityName}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('online', { count: onlineMembers.length })}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop: full buttons */}
            {canModerate && user && (
              <button
                onClick={() => setShowModeration(true)}
                className="hidden items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 md:flex"
                title={t('moderate')}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                {t('moderate')}
              </button>
            )}
            {canCreateContent && user && (
              <>
                <button
                  onClick={() => setShowArticleEditor(true)}
                  className="hidden items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100 md:flex"
                  title={t('article')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  {t('article')}
                </button>
                <button
                  onClick={() => setShowArticleList(true)}
                  className="hidden items-center gap-1 rounded-lg bg-gray-50 dark:bg-[#1e1e1e] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] md:flex"
                  title={t('myArticles')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  {t('myArticles')}
                </button>
                <button
                  onClick={() => setShowPodcastEditor(true)}
                  className="hidden items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100 md:flex"
                  title={t('podcast')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  {t('podcast')}
                </button>
              </>
            )}
            {/* Mobile: ⋯ menu for admin/creator actions + leave */}
            {user && (
              <AdminMenu
                canModerate={canModerate}
                canCreateContent={canCreateContent}
                onModerate={() => setShowModeration(true)}
                onArticle={() => setShowArticleEditor(true)}
                onMyArticles={() => setShowArticleList(true)}
                onPodcast={() => setShowPodcastEditor(true)}
                onLeave={onLeave}
              />
            )}
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="rounded-lg p-2 text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300 lg:hidden"
              title={t('membersOnline')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab bar: Tribune / Contenu */}
        <div className="flex shrink-0 gap-1 bg-gray-100 dark:bg-[#1e1e1e] px-3 py-1.5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-brand-blue text-brand-blue dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 dark:bg-[#272525] hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            {t('tabTribune')}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              activeTab === 'content'
                ? 'bg-white dark:bg-brand-blue text-brand-blue dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 dark:bg-[#272525] hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            {t('tabContent')}
          </button>
          {isNordiques && (
            <button
              onClick={() => setActiveTab('nordiquometre')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                activeTab === 'nordiquometre'
                  ? 'bg-white dark:bg-brand-blue text-brand-blue dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 dark:bg-[#272525] hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
              </svg>
              Nordiquomètre
            </button>
          )}
          {isExpos && (
            <button
              onClick={() => setActiveTab('exposmetre')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
                activeTab === 'exposmetre'
                  ? 'bg-white dark:bg-brand-blue text-brand-blue dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 dark:bg-[#272525] hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
              </svg>
              Exposmètre
            </button>
          )}
        </div>

        {activeTab === 'nordiquometre' ? (
          <Nordiquometre canModerate={canModerate} />
        ) : activeTab === 'exposmetre' ? (
          <Exposmetre canModerate={canModerate} />
        ) : activeTab === 'content' ? (
          <CommunityContentTab communityId={communityId} communitySlug={communitySlug} userId={user?.id ?? null} canModerate={canModerate} />
        ) : (
        <>
        {/* Live banner — small notification, click to scroll to the live card */}
        {activeLive && (
          <button
            onClick={() => {
              const idx = displayItems.findIndex(
                (d) => d.kind === 'feed' && d.item.feedType === 'podcast' && d.item.id === activeLive.id,
              );
              if (idx !== -1) virtuosoRef.current?.scrollToIndex({ index: idx, align: 'start', behavior: 'smooth' });
            }}
            className="flex w-full shrink-0 items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-left text-sm transition hover:bg-red-100"
          >
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="font-semibold text-red-700">{t('liveNow')}</span>
            <span className="truncate text-red-600">{activeLive.title}</span>
          </button>
        )}

        {/* Feed items — react-virtuoso handles measurement, scroll, and positioning */}
        <div className="min-h-0 flex-1 overflow-x-hidden">
          {loading ? (
            <FeedSkeleton />
          ) : (
            <BatchLikeProvider
              userId={user?.id ?? null}
              messageIds={messageIds}
              articleIds={articleIds}
              podcastIds={podcastIds}
            >
              {displayItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <p className="text-sm">{t('noContent')}</p>
                </div>
              ) : (
                <Virtuoso
                  ref={virtuosoRef}
                  data={displayItems}
                  initialTopMostItemIndex={displayItems.length - 1}
                  followOutput="smooth"
                  atBottomStateChange={setAtBottom}
                  atBottomThreshold={100}
                  overscan={200}
                  startReached={handleStartReached}
                  components={{
                    Header: loadingMore ? () => (
                      <div className="flex justify-center py-3">
                        <svg
                          className="h-5 w-5 animate-spin text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : undefined,
                  }}
                  itemContent={(virtuosoIndex, displayItem) => {
                    if (displayItem.kind === 'ad') {
                      return <AdInFeed index={displayItem.adIndex} />;
                    }

                    const { item, index } = displayItem;
                    const isGrouped = index > 0 && isGroupedMessage(item, items[index - 1]);

                    return (
                      <FeedItem
                        item={item}
                        userId={user?.id ?? null}
                        canModerate={canModerate}
                        communityId={communityId}
                        staffRoles={liveStaffRoles}
                        communitySlug={communitySlug}
                        isHighlighted={item.feedType === 'message' && item.id === highlightedMessageId}
                        isGrouped={isGrouped}
                        onDeleteMessage={deleteMessage}
                        onEditMessage={editMessage}
                        editingMessageId={editingMessageId}
                        onStartEdit={setEditingMessageId}
                        onReply={handleReply}
                        onScrollToMessage={scrollToMessage}
                        getMessageById={getMessageById}
                        onRoleChanged={handleRoleChanged}
                        onlineStatuses={onlineStatuses}
                      />
                    );
                  }}
                />
              )}
            </BatchLikeProvider>
          )}
        </div>

        {/* Jump to bottom — Discord-style */}
        {!atBottom && displayItems.length > 0 && (
          <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
            <button
              onClick={() => {
                virtuosoRef.current?.scrollToIndex({ index: displayItems.length - 1, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-brand-blue-dark"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
              {t('recentMessages')}
            </button>
          </div>
        )}

        {/* Reply bar */}
        {replyTarget && (
          <FeedReplyBar
            username={replyTarget.member?.username ?? t('deletedUser')}
            preview={replyTarget.content}
            onCancel={() => setReplyTarget(null)}
          />
        )}

        {/* Input area */}
        {user ? (
          <FeedInput
            onSend={handleSend}
            disabled={inputDisabled}
            placeholder={getInputPlaceholder()}
            communityId={communityId}
            userId={user.id}
            autoFocus={!!replyTarget}
          />
        ) : (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1e1e1e] px-4 py-3 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/login" className="font-medium text-brand-blue hover:underline">
                {t('loginToChat')}
              </Link>{' '}
              {t('orRegister')}{' '}
              <Link href="/register" className="font-medium text-brand-blue hover:underline">
                {t('registerToChat')}
              </Link>{' '}
              {t('toParticipate')}
            </p>
          </div>
        )}
        </>
        )}
      </div>

      {/* Online members sidebar */}
      <div
        className={`${
          showMembers ? 'block' : 'hidden'
        } w-full border-t border-gray-200 dark:border-gray-700 lg:block lg:w-60 lg:border-l lg:border-r lg:border-t-0`}
      >
        <OnlineMembers members={onlineMembers} />
      </div>

      {/* Article editor overlay */}
      {showArticleEditor && user && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="p-4">
            <ArticleEditor
              communityId={communityId}
              communitySlug={communitySlug}
              userId={user.id}
              onPublished={(slug, targetSlug) => {
                setShowArticleEditor(false);
                router.push(`/tribunes/${targetSlug}/articles/${slug}`);
              }}
              onCancel={() => setShowArticleEditor(false)}
            />
          </div>
        </div>
      )}

      {/* Podcast editor overlay */}
      {showPodcastEditor && user && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="p-4">
            <PodcastEditor
              communityId={communityId}
              userId={user.id}
              onSaved={() => setShowPodcastEditor(false)}
              onCancel={() => setShowPodcastEditor(false)}
            />
          </div>
        </div>
      )}

      {/* Article list overlay */}
      {showArticleList && user && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="p-4">
            <ArticleList
              communityId={communityId}
              communitySlug={communitySlug}
              userId={user.id}
              onClose={() => setShowArticleList(false)}
            />
          </div>
        </div>
      )}

      {/* Moderation panel */}
      {showModeration && (
        <ModerationPanel
          communityId={communityId}
          onClose={() => setShowModeration(false)}
        />
      )}
    </div>
  );
}

// ── Mobile admin/creator menu ──

function AdminMenu({
  canModerate,
  canCreateContent,
  onModerate,
  onArticle,
  onMyArticles,
  onPodcast,
  onLeave,
}: {
  canModerate: boolean;
  canCreateContent: boolean;
  onModerate: () => void;
  onArticle: () => void;
  onMyArticles: () => void;
  onPodcast: () => void;
  onLeave?: () => void;
}) {
  const t = useTranslations('tribune');
  const tc = useTranslations('community');
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] py-1 shadow-lg">
            {canModerate && (
              <button
                onClick={() => { setOpen(false); onModerate(); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-700 transition hover:bg-red-50 dark:hover:bg-red-950"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                {t('moderate')}
              </button>
            )}
            {canCreateContent && (
              <>
                <button
                  onClick={() => { setOpen(false); onArticle(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-purple-700 transition hover:bg-purple-50 dark:hover:bg-purple-950"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  {t('article')}
                </button>
                <button
                  onClick={() => { setOpen(false); onMyArticles(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-[#1e1e1e]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  {t('myArticles')}
                </button>
                <button
                  onClick={() => { setOpen(false); onPodcast(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-orange-700 transition hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  {t('podcast')}
                </button>
              </>
            )}
            {onLeave && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setOpen(false); onLeave(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-3.129 3.129m0 5.657-3.182-3.182" />
                  </svg>
                  {tc('leaveTribune')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
