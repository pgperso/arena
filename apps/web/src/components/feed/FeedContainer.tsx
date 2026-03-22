'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { isGroupedMessage } from '@/lib/feedUtils';
import { useFeed } from '@/hooks/useFeed';
import type { FeedMessage as FeedMessageType } from '@arena/shared';
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
import Link from 'next/link';

const ArticleEditor = dynamic(() => import('@/components/article/ArticleEditor').then((m) => m.ArticleEditor), { ssr: false });
const ArticleList = dynamic(() => import('@/components/article/ArticleList').then((m) => m.ArticleList), { ssr: false });
const PodcastEditor = dynamic(() => import('@/components/podcast/PodcastEditor').then((m) => m.PodcastEditor), { ssr: false });
const ModerationPanel = dynamic(() => import('@/components/moderation/ModerationPanel').then((m) => m.ModerationPanel), { ssr: false });

interface FeedContainerProps {
  communityId: number;
  communityName: string;
  communitySlug: string;
  isMember: boolean;
  isMuted: boolean;
  canModerate: boolean;
  staffRoles: Record<string, string>;
}

export function FeedContainer({
  communityId,
  communityName,
  communitySlug,
  isMember,
  isMuted,
  canModerate,
  staffRoles,
}: FeedContainerProps) {
  const router = useRouter();
  const { user, username, avatarUrl } = useAuth();
  const {
    items,
    loading,
    sending,
    hasMore,
    sendMessage,
    sendReply,
    editMessage,
    loadMore,
    deleteMessage,
    getMessageById,
  } = useFeed(communityId, user?.id ?? null);
  const { onlineMembers } = usePresence(communityId, user?.id ?? null, username, avatarUrl);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showArticleList, setShowArticleList] = useState(false);
  const [showPodcastEditor, setShowPodcastEditor] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Virtualizer for feed items (~15-20 DOM nodes instead of 50+)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => feedContainerRef.current,
    estimateSize: (index) => {
      const item = items[index];
      let size = item.feedType === 'article' ? 220 : item.feedType === 'podcast' ? 160 : 72;
      if (index > 0 && isGroupedMessage(item, items[index - 1])) size = 48;
      if ((index + 1) % FEED_AD_INTERVAL === 0) size += 250;
      return size;
    },
    overscan: 5,
  });

  // Scroll to bottom on initial load (instant) and on new messages (smooth)
  const prevItemCountRef = useRef(items.length);
  const justSentRef = useRef(false);
  const initialScrollDone = useRef(false);

  // Initial scroll: when loading finishes and items are available, jump to bottom instantly
  useEffect(() => {
    if (!loading && items.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      // Wait one frame for the virtualizer to measure the scroll element
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
      });
    }
  }, [loading, items.length, virtualizer]);

  // Subsequent messages: smooth scroll to bottom if at bottom or own message
  useEffect(() => {
    if (!initialScrollDone.current) return; // Skip until initial scroll is done
    const prevCount = prevItemCountRef.current;
    prevItemCountRef.current = items.length;
    if (items.length > prevCount && items.length > 0) {
      if (justSentRef.current || autoScroll) {
        virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior: 'smooth' });
        justSentRef.current = false;
        setAutoScroll(true);
      }
    }
  }, [items.length, autoScroll, virtualizer]);

  // Throttled scroll handler: auto-scroll detection + infinite scroll
  const scrollTickRef = useRef(false);
  const rafRef = useRef<number>(0);
  const loadingMoreRef = useRef(false);

  const handleScrollThrottled = useCallback(() => {
    if (scrollTickRef.current) return;
    scrollTickRef.current = true;

    rafRef.current = requestAnimationFrame(() => {
      const el = feedContainerRef.current;
      if (el) {
        // Auto-scroll detection
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        setAutoScroll(atBottom);

        // Infinite scroll: load older messages when near top
        if (hasMore && !loadingMoreRef.current && el.scrollTop < 200) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          const prevHeight = el.scrollHeight;
          loadMore().then(() => {
            requestAnimationFrame(() => {
              // Restore scroll position so user stays at same content
              if (feedContainerRef.current) {
                feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight - prevHeight;
              }
              loadingMoreRef.current = false;
              setLoadingMore(false);
            });
          });
        }
      }
      scrollTickRef.current = false;
    });
  }, [hasMore, loadMore]);

  // Cleanup requestAnimationFrame on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function getInputPlaceholder(): string {
    if (!user) return 'Connectez-vous pour participer';
    if (!isMember) return 'Rejoignez la tribune pour participer';
    if (isMuted) return 'Vous êtes en sourdine dans cette tribune';
    if (replyTarget) return `Répondre à @${replyTarget.member?.username ?? 'utilisateur'}...`;
    return 'Écrire un message... (Enter pour envoyer)';
  }

  const handleSend = useCallback(
    async (content: string, imageUrls?: string[]) => {
      justSentRef.current = true;
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
      const index = items.findIndex(
        (item) => item.feedType === 'message' && item.id === messageId,
      );
      if (index === -1) return;
      virtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 1500);
    },
    [items, virtualizer],
  );

  const inputDisabled = !user || !isMember || isMuted || sending;

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
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Feed area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{communityName}</h2>
            <p className="text-xs text-gray-500">{onlineMembers.length} en ligne</p>
          </div>
          <div className="flex items-center gap-2">
            {canModerate && user && (
              <>
                <button
                  onClick={() => setShowModeration(true)}
                  className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                  title="Modération"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Modérer
                </button>
                <button
                  onClick={() => setShowArticleEditor(true)}
                  className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
                  title="Écrire un article"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Article
                </button>
                <button
                  onClick={() => setShowArticleList(true)}
                  className="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                  title="Gérer mes articles"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  Mes articles
                </button>
                <button
                  onClick={() => setShowPodcastEditor(true)}
                  className="flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100"
                  title="Nouveau podcast"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  Podcast
                </button>
              </>
            )}
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 lg:hidden"
              title="Membres en ligne"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Feed items - virtualized
             relative+absolute pattern ensures the scroll container has explicit
             dimensions immediately, even before flex layout is fully computed.
             This is the same pattern Discord/Slack use for their message areas. */}
        <div className="relative min-h-0 flex-1">
        <div
          ref={feedContainerRef}
          onScroll={handleScrollThrottled}
          className="absolute inset-0 flex flex-col overflow-y-auto"
        >
          {loading ? (
            <FeedSkeleton />
          ) : (
            <BatchLikeProvider
              userId={user?.id ?? null}
              messageIds={messageIds}
              articleIds={articleIds}
              podcastIds={podcastIds}
            >
              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
                  <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <p className="text-sm">Aucun contenu. Soyez le premier à écrire!</p>
                </div>
              ) : (
                <>
                  {/* Loading spinner for infinite scroll */}
                  {loadingMore && (
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
                  )}
                  {/* Virtualized feed list */}
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const item = items[virtualRow.index];
                      const index = virtualRow.index;

                      const isGrouped = index > 0 && isGroupedMessage(item, items[index - 1]);

                      return (
                        <div
                          key={item.feedKey}
                          data-index={virtualRow.index}
                          ref={virtualizer.measureElement}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
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
                          />
                          {(index + 1) % FEED_AD_INTERVAL === 0 && (
                            <AdInFeed index={Math.floor(index / FEED_AD_INTERVAL)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </BatchLikeProvider>
          )}
        </div>
        </div>

        {/* Reply bar */}
        {replyTarget && (
          <FeedReplyBar
            username={replyTarget.member?.username ?? 'utilisateur'}
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
            userId={user?.id ?? null}
          />
        ) : (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center">
            <p className="text-sm text-gray-500">
              <Link href="/login" className="font-medium text-brand-blue hover:underline">
                Connectez-vous
              </Link>{' '}
              ou{' '}
              <Link href="/register" className="font-medium text-brand-blue hover:underline">
                créez un compte
              </Link>{' '}
              pour participer.
            </p>
          </div>
        )}
      </div>

      {/* Online members sidebar */}
      <div
        className={`${
          showMembers ? 'block' : 'hidden'
        } w-full border-t border-gray-200 lg:block lg:w-60 lg:border-l lg:border-t-0`}
      >
        <OnlineMembers members={onlineMembers} />
      </div>

      {/* Article editor overlay */}
      {showArticleEditor && user && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="p-4">
            <ArticleEditor
              communityId={communityId}
              communitySlug={communitySlug}
              userId={user.id}
              onPublished={(slug) => {
                setShowArticleEditor(false);
                router.push(`/tribunes/${communitySlug}/articles/${slug}`);
              }}
              onCancel={() => setShowArticleEditor(false)}
            />
          </div>
        </div>
      )}

      {/* Podcast editor overlay */}
      {showPodcastEditor && user && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
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
