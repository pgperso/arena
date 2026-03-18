'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';
import type { ChatMessageWithMember } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { OnlineMembers } from './OnlineMembers';
import { FeedReplyBar } from '@/components/feed/FeedReplyBar';
import Link from 'next/link';

interface ChatRoomProps {
  communityId: number;
  communityName: string;
  isMember: boolean;
  isMuted: boolean;
  canModerate: boolean;
}

export function ChatRoom({
  communityId,
  communityName,
  isMember,
  isMuted,
  canModerate,
}: ChatRoomProps) {
  const { user, username } = useAuth();
  const {
    messages,
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
  } = useChat(communityId, user?.id ?? null);
  const { onlineMembers } = usePresence(communityId, user?.id ?? null, username);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  // Reply/quote state
  const [replyTarget, setReplyTarget] = useState<ChatMessageWithMember | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<ChatMessageWithMember | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Detect scroll position to toggle auto-scroll
  function handleScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(atBottom);
  }

  // Load more on scroll to top
  function handleScrollTop() {
    const el = messagesContainerRef.current;
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
    if (!user) return 'Connectez-vous pour participer au chat';
    if (!isMember) return 'Rejoignez la communauté pour participer';
    if (isMuted) return 'Vous êtes en sourdine dans cette communauté';
    if (replyTarget) return `Répondre à @${replyTarget.members?.username ?? 'utilisateur'}...`;
    if (quoteTarget) return `Citer @${quoteTarget.members?.username ?? 'utilisateur'}...`;
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

  const handleReply = useCallback((message: ChatMessageWithMember) => {
    setQuoteTarget(null);
    setReplyTarget(message);
  }, []);

  const handleRepost = useCallback(
    async (messageId: number) => {
      await sendRepost(messageId);
    },
    [sendRepost],
  );

  const handleQuote = useCallback((message: ChatMessageWithMember) => {
    setReplyTarget(null);
    setQuoteTarget(message);
  }, []);

  const inputDisabled = !user || !isMember || isMuted || sending;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{communityName}</h2>
            <p className="text-xs text-gray-500">
              {onlineMembers.length} en ligne
            </p>
          </div>
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

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={() => {
            handleScroll();
            handleScrollTop();
          }}
          className="flex-1 overflow-y-auto"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
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
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <svg className="mb-3 h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <p className="text-sm">Aucun message. Soyez le premier à écrire!</p>
                </div>
              ) : (
                <div className="py-2">
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isOwn={msg.member_id === user?.id}
                      canModerate={canModerate}
                      userId={user?.id ?? null}
                      onDelete={deleteMessage}
                      onReply={handleReply}
                      onRepost={handleRepost}
                      onQuote={handleQuote}
                      parentMessage={msg.parent_id ? getMessageById(msg.parent_id) : null}
                      repostedMessage={msg.repost_of_id ? getMessageById(msg.repost_of_id) : null}
                      quotedMessage={msg.quote_of_id ? getMessageById(msg.quote_of_id) : null}
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply/Quote bar */}
        {replyTarget && (
          <FeedReplyBar
            replyToUsername={replyTarget.members?.username ?? 'utilisateur'}
            onCancel={() => setReplyTarget(null)}
          />
        )}
        {quoteTarget && (
          <FeedReplyBar
            replyToUsername={quoteTarget.members?.username ?? 'utilisateur'}
            onCancel={() => setQuoteTarget(null)}
          />
        )}

        {/* Input area */}
        {user ? (
          <ChatInput
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
              pour participer au chat.
            </p>
          </div>
        )}
      </div>

      {/* Online members sidebar - desktop always visible, mobile toggle */}
      <div
        className={`${
          showMembers ? 'block' : 'hidden'
        } w-full border-t border-gray-200 lg:block lg:w-60 lg:border-l lg:border-t-0`}
      >
        <OnlineMembers members={onlineMembers} />
      </div>
    </div>
  );
}
