'use client';

import { formatTime } from '@arena/shared';
import { Avatar } from '@/components/ui/Avatar';

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
  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2">
        <Avatar url={message.avatarUrl} name={message.username} size="xs" />
        <span className="text-xs font-medium text-gray-700">{message.username}</span>
        <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
      </div>
      {message.content && (
        <p className="mt-1 line-clamp-3 text-xs text-gray-600">{message.content}</p>
      )}
    </div>
  );
}
