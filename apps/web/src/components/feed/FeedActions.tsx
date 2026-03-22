'use client';

import { memo } from 'react';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { FeedReactionButtons } from './FeedReactionButtons';

interface FeedActionsProps {
  messageId: number;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  userId: string | null;
  isOwn: boolean;
  canModerate?: boolean;
  onReply: () => void;
  onStartEdit?: () => void;
  onDelete?: () => void;
}

export const FeedActions = memo(function FeedActions({
  messageId,
  likeCount,
  dislikeCount,
  replyCount,
  userId,
  isOwn,
  canModerate,
  onReply,
  onStartEdit,
  onDelete,
}: FeedActionsProps) {
  const showMobileEdit = isOwn && onStartEdit;
  const showMobileDelete = (canModerate || isOwn) && onDelete;

  return (
    <div className="mt-1 flex items-center gap-1">
      {/* Reply */}
      {!isOwn && (
        <button
          onClick={onReply}
          disabled={!userId}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          title="Répondre"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
          {replyCount > 0 && <span>{replyCount}</span>}
        </button>
      )}
      {isOwn && replyCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300">
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
          {replyCount}
        </span>
      )}

      {/* Like / Dislike */}
      {!isOwn ? (
        <FeedReactionButtons
          messageId={messageId}
          initialLikeCount={likeCount}
          initialDislikeCount={dislikeCount}
          userId={userId}
        />
      ) : (
        <span className="flex items-center gap-2 px-2 py-1 text-xs text-gray-300">
          {likeCount > 0 && <span>{likeCount} ♥</span>}
          {dislikeCount > 0 && <span>{dislikeCount} ↓</span>}
        </span>
      )}

      {/* Mobile-only: edit + delete buttons (desktop uses hover toolbar) */}
      {showMobileEdit && (
        <button
          onClick={onStartEdit}
          className="flex items-center rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 md:hidden"
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
      {showMobileDelete && (
        <button
          onClick={onDelete}
          className="flex items-center rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-500 md:hidden"
          title="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
});
