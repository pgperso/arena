'use client';

import { formatTime } from '@arena/shared';

interface QuotedMessageData {
  content: string | null;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface FeedQuotedMessageProps {
  message: QuotedMessageData;
}

export function FeedQuotedMessage({ message }: FeedQuotedMessageProps) {
  const initial = message.username[0]?.toUpperCase() ?? '?';

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        {message.avatarUrl ? (
          <img
            src={message.avatarUrl}
            alt={message.username}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
            {initial}
          </div>
        )}
        <span className="text-xs font-medium text-gray-700">{message.username}</span>
        <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
      </div>
      {message.content && (
        <p className="mt-1 line-clamp-3 text-xs text-gray-600">{message.content}</p>
      )}
    </div>
  );
}
