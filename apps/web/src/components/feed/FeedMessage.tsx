'use client';

import { memo } from 'react';
import { formatTime } from '@arena/shared';
import type { FeedMessage as FeedMessageType } from '@arena/shared';
import { FeedActions } from './FeedActions';
import { FeedImageGallery } from './FeedImageGallery';
import { FeedRichContent } from './FeedRichContent';
import { FeedReplyContext } from './FeedReplyContext';
import { FeedRepostBadge } from './FeedRepostBadge';
import { FeedQuotedMessage } from './FeedQuotedMessage';
import { Avatar } from '@/components/ui/Avatar';

interface FeedMessageProps {
  message: FeedMessageType;
  isOwn: boolean;
  canModerate: boolean;
  userId: string | null;
  onDelete: (messageId: number) => void;
  onReply: (message: FeedMessageType) => void;
  onRepost: (messageId: number) => void;
  onQuote: (message: FeedMessageType) => void;
  getMessageById: (id: number) => FeedMessageType | undefined;
}

export const FeedMessage = memo(function FeedMessage({
  message,
  isOwn,
  canModerate,
  userId,
  onDelete,
  onReply,
  onRepost,
  onQuote,
  getMessageById,
}: FeedMessageProps) {
  const username = message.member?.username ?? 'Utilisateur supprimé';
  const time = formatTime(message.createdAt);

  if (message.isRemoved) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm italic text-gray-400">[Message supprimé]</p>
      </div>
    );
  }

  // Pure repost (no content, just sharing someone else's message)
  const repostedMessage = message.repostOfId ? getMessageById(message.repostOfId) : undefined;
  if (message.repostOfId && !message.content && repostedMessage) {
    return (
      <div className="py-1">
        <FeedRepostBadge username={username} />
        <FeedMessage
          message={repostedMessage}
          isOwn={repostedMessage.memberId === userId}
          canModerate={canModerate}
          userId={userId}
          onDelete={onDelete}
          onReply={onReply}
          onRepost={onRepost}
          onQuote={onQuote}
          getMessageById={getMessageById}
        />
      </div>
    );
  }

  const parentMessage = message.parentId ? getMessageById(message.parentId) : undefined;
  const quotedMessage = message.quoteOfId ? getMessageById(message.quoteOfId) : undefined;

  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-gray-50">
      {/* Avatar */}
      <Avatar url={message.member?.avatarUrl} name={username} size="md" className="mt-0.5 flex-shrink-0" />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Reply context */}
        {message.parentId && parentMessage && (
          <FeedReplyContext
            parentUsername={parentMessage.member?.username ?? 'Utilisateur supprimé'}
            parentContent={parentMessage.content}
          />
        )}

        <div className="flex items-baseline gap-2">
          <span className={`text-sm font-semibold ${isOwn ? 'text-brand-blue' : 'text-gray-900'}`}>
            {username}
          </span>
          <span className="text-xs text-gray-400">{time}</span>
          {(canModerate || isOwn) && (
            <button
              onClick={() => onDelete(message.id)}
              className="ml-auto hidden text-xs text-gray-400 transition hover:text-red-500 group-hover:inline-block"
              title="Supprimer le message"
            >
              Supprimer
            </button>
          )}
        </div>
        {message.content && <FeedRichContent content={message.content} />}
        {message.imageUrls.length > 0 && (
          <FeedImageGallery imageUrls={message.imageUrls} />
        )}

        {/* Quoted message */}
        {message.quoteOfId && quotedMessage && (
          <FeedQuotedMessage
            message={{
              content: quotedMessage.content,
              username: quotedMessage.member?.username ?? 'Utilisateur supprimé',
              avatarUrl: quotedMessage.member?.avatarUrl ?? null,
              createdAt: quotedMessage.createdAt,
            }}
          />
        )}

        {/* Actions bar */}
        <FeedActions
          messageId={message.id}
          likeCount={message.likeCount}
          replyCount={message.replyCount}
          repostCount={message.repostCount}
          userId={userId}
          onReply={() => onReply(message)}
          onRepost={() => onRepost(message.id)}
          onQuote={() => onQuote(message)}
        />
      </div>
    </div>
  );
});
