'use client';

import { formatTime } from '@arena/shared';
import type { ChatMessageWithMember } from '@/hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageWithMember;
  isOwn: boolean;
  canModerate: boolean;
  onDelete: (messageId: number) => void;
}

export function ChatMessage({ message, isOwn, canModerate, onDelete }: ChatMessageProps) {
  const username = message.members?.username ?? 'Utilisateur supprimé';
  const initial = username[0]?.toUpperCase() ?? '?';
  const time = formatTime(message.created_at);

  if (message.is_removed) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm italic text-gray-400">[Message supprimé]</p>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 px-4 py-2 hover:bg-gray-50">
      {/* Avatar */}
      {message.members?.avatar_url ? (
        <img
          src={message.members.avatar_url}
          alt={username}
          className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
          {initial}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
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
        <p className="break-words text-sm text-gray-700">{message.content}</p>
      </div>
    </div>
  );
}
