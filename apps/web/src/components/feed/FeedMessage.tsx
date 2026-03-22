'use client';

import { memo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatTime } from '@arena/shared';
import type { FeedMessage as FeedMessageType } from '@arena/shared';
import { FeedActions } from './FeedActions';
import { FeedImageGallery } from './FeedImageGallery';
import { FeedRichContent } from './FeedRichContent';
import { FeedReplyContext } from './FeedReplyContext';
import { Avatar } from '@/components/ui/Avatar';

interface FeedMessageProps {
  message: FeedMessageType;
  isOwn: boolean;
  canModerate: boolean;
  userId: string | null;
  isHighlighted?: boolean;
  onDelete: (messageId: number) => void;
  onReply: (message: FeedMessageType) => void;
  onScrollToMessage?: (messageId: number) => void;
  getMessageById: (id: number) => FeedMessageType | undefined;
}

export const FeedMessage = memo(function FeedMessage({
  message,
  isOwn,
  canModerate,
  userId,
  isHighlighted,
  onDelete,
  onReply,
  onScrollToMessage,
  getMessageById,
}: FeedMessageProps) {
  const username = message.member?.username ?? 'Utilisateur supprimé';
  const time = formatTime(message.createdAt);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (message.isRemoved) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm italic text-gray-400">[Message supprimé]</p>
      </div>
    );
  }

  const parentMessage = message.parentId ? getMessageById(message.parentId) : undefined;
  const hasReplyContext = !!(message.parentId && parentMessage);

  return (
    <div className={`group relative px-4 py-2 transition-colors ${isHighlighted ? 'message-highlight' : 'hover:bg-gray-50'}`}>
      {/* Connector line from reply context to avatar */}
      {hasReplyContext && (
        <div
          className="reply-connector"
          style={{ top: 6, height: 24 }}
        />
      )}

      {/* Reply context */}
      {hasReplyContext && (
        <div className="ml-6 mb-0.5">
          <FeedReplyContext
            parentUsername={parentMessage.member?.username ?? 'Utilisateur supprimé'}
            parentAvatarUrl={parentMessage.member?.avatarUrl}
            parentContent={parentMessage.content}
            onClick={onScrollToMessage ? () => onScrollToMessage(parentMessage.id) : undefined}
          />
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar url={message.member?.avatarUrl} name={username} size="md" className="mt-0.5 flex-shrink-0" />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isOwn ? 'text-brand-blue' : 'text-gray-900'}`}>
              {username}
            </span>
            <span className="text-xs text-gray-400">{time}</span>

            {/* Delete: admin/moderator only */}
            {canModerate && (
              <div className="ml-auto">
                {confirmDelete ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <button
                      onClick={() => {
                        onDelete(message.id);
                        setConfirmDelete(false);
                      }}
                      className="font-semibold text-red-500 transition hover:text-red-700"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-gray-400 transition hover:text-gray-600"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-gray-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )}
          </div>
          {message.content && <FeedRichContent content={message.content} />}
          {message.imageUrls.length > 0 && (
            <FeedImageGallery imageUrls={message.imageUrls} />
          )}

          {/* Actions bar */}
          <FeedActions
            messageId={message.id}
            likeCount={message.likeCount}
            dislikeCount={message.dislikeCount}
            replyCount={message.replyCount}
            userId={userId}
            onReply={() => onReply(message)}
          />
        </div>
      </div>
    </div>
  );
});
