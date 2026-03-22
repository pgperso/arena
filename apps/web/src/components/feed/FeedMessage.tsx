'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { formatTime, getMemberRank } from '@arena/shared';
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
  isGrouped?: boolean;
  editing?: boolean;
  staffRole?: string;
  onDelete: (messageId: number) => void;
  onEdit: (messageId: number, content: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onReply: (message: FeedMessageType) => void;
  onScrollToMessage?: (messageId: number) => void;
  getMessageById: (id: number) => FeedMessageType | undefined;
}

function MessageToolbar({
  isOwn,
  canModerate,
  confirmDelete,
  onStartEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  isOwn: boolean;
  canModerate: boolean;
  confirmDelete: boolean;
  onStartEdit: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div className="absolute -top-3 right-4 z-10 flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1 py-0.5 shadow-sm opacity-0 transition group-hover:opacity-100">
      {confirmDelete ? (
        <span className="flex items-center gap-1.5 px-1 text-xs">
          <button onClick={onConfirmDelete} className="font-semibold text-red-500 hover:text-red-700">
            Supprimer
          </button>
          <button onClick={onCancelDelete} className="text-gray-400 hover:text-gray-600">
            Annuler
          </button>
        </span>
      ) : (
        <>
          {isOwn && (
            <button onClick={onStartEdit} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Modifier">
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
          {(canModerate || isOwn) && (
            <button onClick={onDelete} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500" title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const FeedMessage = memo(function FeedMessage({
  message,
  isOwn,
  canModerate,
  userId,
  isHighlighted,
  isGrouped,
  editing,
  staffRole,
  onDelete,
  onEdit,
  onStartEdit,
  onCancelEdit,
  onReply,
  onScrollToMessage,
  getMessageById,
}: FeedMessageProps) {
  const username = message.member?.username ?? 'Utilisateur supprimé';
  const staffRankMap: Record<string, { label: string; color: string }> = {
    owner: { label: 'Propriétaire', color: 'text-yellow-500' },
    admin: { label: 'Arbitre', color: 'text-red-500' },
    moderator: { label: 'Arbitre', color: 'text-red-500' },
  };
  const rank: { label: string; color: string } =
    (staffRole ? staffRankMap[staffRole] : undefined) ?? getMemberRank(message.member?.messageCount ?? 0);
  const time = formatTime(message.createdAt);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? '');
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      setEditContent(message.content ?? '');
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing, message.content]);

  if (message.isRemoved) {
    return (
      <div className="px-4 py-0.5">
        <p className="text-sm italic text-gray-400">[Message supprimé]</p>
      </div>
    );
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = editContent.trim();
      if (trimmed && trimmed !== message.content) {
        onEdit(message.id, trimmed);
      }
      onCancelEdit();
    }
    if (e.key === 'Escape') {
      onCancelEdit();
    }
  }

  const showToolbar = (isOwn || canModerate) && !editing;
  const parentMessage = message.parentId ? getMessageById(message.parentId) : undefined;
  const hasReplyContext = !!(message.parentId && parentMessage);

  const toolbar = showToolbar ? (
    <MessageToolbar
      isOwn={isOwn}
      canModerate={canModerate}
      confirmDelete={confirmDelete}
      onStartEdit={onStartEdit}
      onDelete={() => setConfirmDelete(true)}
      onConfirmDelete={() => { onDelete(message.id); setConfirmDelete(false); }}
      onCancelDelete={() => setConfirmDelete(false)}
    />
  ) : null;

  const contentBlock = editing ? (
    <div className="mt-0.5">
      <textarea
        ref={editRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleEditKeyDown}
        rows={1}
        className="w-full resize-none rounded-md border border-brand-blue bg-gray-50 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-brand-blue"
        style={{ height: 'auto', minHeight: '2rem' }}
        onInput={(e) => {
          const t = e.currentTarget;
          t.style.height = 'auto';
          t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
        }}
      />
      <p className="mt-0.5 text-[10px] text-gray-400">
        Enter pour sauvegarder · Escape pour annuler
      </p>
    </div>
  ) : (
    <>
      {message.content && <FeedRichContent content={message.content} />}
    </>
  );

  // Grouped message: compact, with subtle username
  if (isGrouped && !hasReplyContext) {
    return (
      <div className={`group relative py-0.5 pl-[60px] pr-4 transition-colors ${isHighlighted ? 'message-highlight' : 'hover:bg-gray-50'}`}>
        <span className="absolute left-2 top-1 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">
          {time}
        </span>
        <span className="text-[10px] font-medium text-gray-400">{username}</span>

        {toolbar}
        {contentBlock}
        {!editing && message.imageUrls.length > 0 && (
          <FeedImageGallery imageUrls={message.imageUrls} />
        )}

        {!editing && (
          <FeedActions
            messageId={message.id}
            likeCount={message.likeCount}
            dislikeCount={message.dislikeCount}
            replyCount={message.replyCount}
            userId={userId}
            isOwn={isOwn}
            onReply={() => onReply(message)}
          />
        )}
      </div>
    );
  }

  // Full message
  return (
    <div className={`group relative px-4 pt-3 pb-1 transition-colors ${isHighlighted ? 'message-highlight' : 'hover:bg-gray-50'}`}>
      {hasReplyContext && (
        <div className="mb-0.5 flex items-end pl-4">
          <div className="reply-connector relative -top-0.5" />
          <div className="ml-8">
            <FeedReplyContext
              parentUsername={parentMessage.member?.username ?? 'Utilisateur supprimé'}
              parentAvatarUrl={parentMessage.member?.avatarUrl}
              parentContent={parentMessage.content}
              onClick={onScrollToMessage ? () => onScrollToMessage(parentMessage.id) : undefined}
            />
          </div>
        </div>
      )}

      {toolbar}

      <div className="flex gap-3">
        <Avatar url={message.member?.avatarUrl} name={username} size="md" className="mt-0.5 flex-shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isOwn ? 'text-brand-blue' : 'text-gray-900'}`}>
              {username}
            </span>
            <span className={`text-[10px] font-bold ${rank.color}`}>{rank.label}</span>
            <span className="text-xs text-gray-400">{time}</span>
          </div>

          {contentBlock}
          {!editing && message.imageUrls.length > 0 && (
            <FeedImageGallery imageUrls={message.imageUrls} />
          )}

          {!editing && (
            <FeedActions
              messageId={message.id}
              likeCount={message.likeCount}
              dislikeCount={message.dislikeCount}
              replyCount={message.replyCount}
              userId={userId}
              isOwn={isOwn}
              onReply={() => onReply(message)}
            />
          )}
        </div>
      </div>
    </div>
  );
});
