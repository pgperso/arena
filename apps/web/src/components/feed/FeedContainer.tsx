'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFeed } from '@/hooks/useFeed';
import type { FeedMessage as FeedMessageType } from '@arena/shared';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { FeedItem } from './FeedItem';
import { FeedInput } from './FeedInput';
import { FeedSkeleton } from './FeedSkeleton';
import { FeedReplyBar } from './FeedReplyBar';
import { OnlineMembers } from '@/components/chat/OnlineMembers';
import { ArticleEditor } from '@/components/article/ArticleEditor';
import { ModerationPanel } from '@/components/moderation/ModerationPanel';
import { AdInFeed } from '@/components/ads/AdInFeed';
import { FEED_AD_INTERVAL } from '@arena/shared';
import Link from 'next/link';

interface FeedContainerProps {
  communityId: number;
  communityName: string;
  communitySlug: string;
  isMember: boolean;
  isMuted: boolean;
  canModerate: boolean;
}

export function FeedContainer({
  communityId,
  communityName,
  communitySlug,
  isMember,
  isMuted,
  canModerate,
}: FeedContainerProps) {
  const router = useRouter();
  const { user, username } = useAuth();
  const {
    items,
    loading,
    sending,
    hasMore,
    sendMessage,
    sendReply,
    sendRepost,
    sendQuote,
    loadMore,
    deleteMessage,
    getMessageById,
  } = useFeed(communityId, user?.id ?? null);
  const { onlineMembers } = usePresence(communityId, user?.id ?? null, username);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [showModeration, setShowModeration] = useState(false);

  // Reply/quote state
  const [replyTarget, setReplyTarget] = useState<FeedMessageType | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<FeedMessageType | null>(null);

  // Auto-scroll to bottom on new items
  useEffect(() => {
    if (autoScroll && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items, autoScroll]);

  // Detect scroll position to toggle auto-scroll
  function handleScroll() {
    const el = feedContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(atBottom);
  }

  // Load more on scroll to top
  function handleScrollTop() {
    const el = feedContainerRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop < 50) {
      const prevHeight = el.scrollHeight;
      loadMore().then(() => {
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop = el.scrollHeight - prevHeight;
          }
        });
      });
    }
  }

  function getInputPlaceholder(): string {
    if (!user) return 'Connectez-vous pour participer';
    if (!isMember) return 'Rejoignez la communauté pour participer';
    if (isMuted) return 'Vous êtes en sourdine dans cette communauté';
    if (replyTarget) return `Répondre à @${replyTarget.member?.username ?? 'utilisateur'}...`;
    if (quoteTarget) return `Citer @${quoteTarget.member?.username ?? 'utilisateur'}...`;
    return 'Écrire un message... (Enter pour envoyer)';
  }

  const handleSend = useCallback(
    async (content: string, imageUrls?: string[]) => {
      if (replyTarget) {
        await sendReply(replyTarget.id, content, imageUrls);
        setReplyTarget(null);
      } else if (quoteTarget) {
        await sendQuote(quoteTarget.id, content, imageUrls);
        setQuoteTarget(null);
      } else {
        await sendMessage(content, imageUrls);
      }
    },
    [replyTarget, quoteTarget, sendReply, sendQuote, sendMessage],
  );

  const handleReply = useCallback((message: FeedMessageType) => {
    setQuoteTarget(null);
    setReplyTarget(message);
  }, []);

  const handleRepost = useCallback(
    async (messageId: number) => {
      await sendRepost(messageId);
    },
    [sendRepost],
  );

  const handleQuote = useCallback((message: FeedMessageType) => {
    setReplyTarget(null);
    setQuoteTarget(message);
  }, []);

  const inputDisabled = !user || !isMember || isMuted || sending;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Feed area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
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

        {/* Feed items */}
        <div
          ref={feedContainerRef}
          onScroll={() => {
            handleScroll();
            handleScrollTop();
          }}
          className="flex-1 overflow-y-auto"
        >
          {loading ? (
            <FeedSkeleton />
          ) : (
            <>
              {hasMore && (
                <div className="py-3 text-center">
                  <button
                    onClick={loadMore}
                    className="text-sm text-brand-blue hover:underline"
                  >
                    Charger les messages précédents
                  </button>
                </div>
              )}
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <p className="text-sm">Aucun contenu. Soyez le premier à écrire!</p>
                </div>
              ) : (
                <div className="py-2">
                  {items.map((item, index) => (
                    <div key={item.feedKey}>
                      <FeedItem
                        item={item}
                        userId={user?.id ?? null}
                        canModerate={canModerate}
                        communitySlug={communitySlug}
                        onDeleteMessage={deleteMessage}
                        onReply={handleReply}
                        onRepost={handleRepost}
                        onQuote={handleQuote}
                        getMessageById={getMessageById}
                      />
                      {(index + 1) % FEED_AD_INTERVAL === 0 && (
                        <AdInFeed index={Math.floor(index / FEED_AD_INTERVAL)} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div ref={feedEndRef} />
            </>
          )}
        </div>

        {/* Reply/Quote bar */}
        {replyTarget && (
          <FeedReplyBar
            replyToUsername={replyTarget.member?.username ?? 'utilisateur'}
            onCancel={() => setReplyTarget(null)}
          />
        )}
        {quoteTarget && (
          <FeedReplyBar
            replyToUsername={quoteTarget.member?.username ?? 'utilisateur'}
            onCancel={() => setQuoteTarget(null)}
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
                router.push(`/communities/${communitySlug}/articles/${slug}`);
              }}
              onCancel={() => setShowArticleEditor(false)}
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
