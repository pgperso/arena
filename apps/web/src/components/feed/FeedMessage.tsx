'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, Pencil } from 'lucide-react';
import { formatTime, getMemberRank, BOT_MEMBER_ID } from '@arena/shared';
import type { FeedMessage as FeedMessageType } from '@arena/shared';
import { FeedActions } from './FeedActions';
import { FeedImageGallery } from './FeedImageGallery';
import { FeedRichContent } from './FeedRichContent';
import { FeedReplyContext } from './FeedReplyContext';
import { Avatar } from '@/components/ui/Avatar';
import { UserPopover } from '@/components/ui/UserPopover';
import { StatusDot } from '@/components/ui/StatusDot';

const STAFF_RANK_MAP: Record<string, { label: string; color: string; bg: string }> = {
  owner: { label: 'Propriétaire', color: 'text-brand-blue', bg: 'bg-brand-blue text-white' },
  admin: { label: 'Arbitre', color: 'text-red-600', bg: 'bg-red-600 text-white' },
  moderator: { label: 'Arbitre', color: 'text-red-600', bg: 'bg-red-600 text-white' },
  creator: { label: 'Créateur', color: 'text-purple-600', bg: 'bg-purple-100 text-purple-700' },
};

interface FeedMessageProps {
  message: FeedMessageType;
  isOwn: boolean;
  canModerate: boolean;
  userId: string | null;
  communityId: number;
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
  onRoleChanged?: (memberId: string, newRole: string | null) => void;
  presenceStatus?: 'online' | 'idle';
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
  const t = useTranslations('common');
  return (
    <div className="absolute -top-3 right-4 z-10 hidden items-center gap-1 rounded-lg bg-red-600 px-1 py-0.5 shadow-md opacity-0 transition group-hover:opacity-100 md:flex">
      {confirmDelete ? (
        <span className="flex items-center gap-2 px-2 py-1 text-xs">
          <button onClick={onConfirmDelete} className="font-bold text-white hover:text-red-200">
            {t('delete')}
          </button>
          <button onClick={onCancelDelete} className="text-red-200 hover:text-white">
            {t('cancel')}
          </button>
        </span>
      ) : (
        <>
          {isOwn && (
            <button onClick={onStartEdit} className="rounded-md p-2 text-white/80 transition hover:bg-red-700 hover:text-white" title={t('edit')}>
              <Pencil className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          {(canModerate || isOwn) && (
            <button onClick={onDelete} className="rounded-md p-2 text-white/80 transition hover:bg-red-700 hover:text-white" title={t('delete')}>
              <Trash2 className="h-4 w-4" strokeWidth={2} />
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
  communityId,
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
  onRoleChanged,
  presenceStatus,
}: FeedMessageProps) {
  const t = useTranslations('tribune');
  const username = message.member?.username ?? t('deletedUser');
  const rank: { label: string; color: string; bg: string } =
    (staffRole ? STAFF_RANK_MAP[staffRole] : undefined) ?? getMemberRank(message.member?.messageCount ?? 0);
  const time = formatTime(message.createdAt);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? '');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [popoverRect, setPopoverRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      setEditContent(message.content ?? '');
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing, message.content]);

  const handleUsernameClick = useCallback((e: React.MouseEvent) => {
    if (!message.memberId || isOwn) return;
    setPopoverRect(e.currentTarget.getBoundingClientRect());
  }, [message.memberId, isOwn]);

  if (message.isRemoved) {
    return (
      <div className="px-4 py-0.5">
        <p className="text-sm italic text-gray-400">[{t('deletedMessage')}]</p>
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
        {t('editSave')}
      </p>
    </div>
  ) : (
    <>
      {message.content && <FeedRichContent content={message.content} />}
    </>
  );

  const usernameClickable = !isOwn && !!message.memberId && canModerate;

  const popover = popoverRect && message.memberId ? (
    <UserPopover
      memberId={message.memberId}
      username={username}
      communityId={communityId}
      currentRole={staffRole}
      canManageRoles={canModerate}
      anchorRect={popoverRect}
      onClose={() => setPopoverRect(null)}
      onRoleChanged={onRoleChanged}
    />
  ) : null;

  // Grouped message: compact, with subtle username
  if (isGrouped && !hasReplyContext) {
    return (
      <div
        className={`group relative py-1.5 pl-[52px] pr-3 transition-colors sm:pl-[60px] sm:pr-4 ${isHighlighted ? 'message-highlight' : 'hover:bg-gray-50'}`}
      >
        <span className="absolute left-2 top-2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">
          {time}
        </span>
        <span
          className={`text-[10px] font-medium text-gray-400 ${usernameClickable ? 'cursor-pointer hover:text-gray-600 hover:underline' : ''}`}
          onClick={usernameClickable ? handleUsernameClick : undefined}
        >
          {username}
        </span>

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
            canModerate={canModerate}
            onReply={() => onReply(message)}
            onStartEdit={isOwn ? onStartEdit : undefined}
            onDelete={(canModerate || isOwn) ? () => onDelete(message.id) : undefined}
          />
        )}
        {popover}
      </div>
    );
  }

  // Full message
  return (
    <div
      className={`group relative px-4 pt-3 pb-1 transition-colors ${isHighlighted ? 'message-highlight' : 'hover:bg-gray-50'}`}
    >
      {hasReplyContext && (
        <div className="mb-0.5 flex items-end pl-4">
          <div className="reply-connector relative -top-0.5" />
          <div className="ml-8">
            <FeedReplyContext
              parentUsername={parentMessage.member?.username ?? t('deletedUser')}
              parentAvatarUrl={parentMessage.member?.avatarUrl}
              parentContent={parentMessage.content}
              onClick={onScrollToMessage ? () => onScrollToMessage(parentMessage.id) : undefined}
            />
          </div>
        </div>
      )}

      {toolbar}

      <div className="flex gap-3">
        <div className="relative mt-0.5 h-8 w-8 flex-shrink-0">
          {message.memberId === BOT_MEMBER_ID ? (
            <img
              src="/images/fanstribune.webp"
              alt={username}
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <>
              <Avatar url={message.member?.avatarUrl} name={username} size="md" />
              {presenceStatus && <StatusDot status={presenceStatus} size="md" />}
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${isOwn ? 'text-brand-blue' : 'text-gray-900'} ${usernameClickable ? 'cursor-pointer hover:underline' : ''}`}
              onClick={usernameClickable ? handleUsernameClick : undefined}
            >
              {username}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${rank.bg}`}>{rank.label}</span>
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
              canModerate={canModerate}
              onReply={() => onReply(message)}
              onStartEdit={isOwn ? onStartEdit : undefined}
              onDelete={(canModerate || isOwn) ? () => onDelete(message.id) : undefined}
            />
          )}
        </div>
      </div>
      {popover}
    </div>
  );
});
