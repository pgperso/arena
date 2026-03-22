'use client';

import { Avatar } from '@/components/ui/Avatar';
import { CornerDownRight } from 'lucide-react';

interface FeedReplyContextProps {
  parentUsername: string;
  parentAvatarUrl?: string | null;
  parentContent?: string | null;
  onClick?: () => void;
}

export function FeedReplyContext({
  parentUsername,
  parentAvatarUrl,
  parentContent,
  onClick,
}: FeedReplyContextProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="mb-1 flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:hover:bg-transparent disabled:hover:text-gray-400"
    >
      <CornerDownRight className="h-3 w-3 flex-shrink-0 rotate-180" strokeWidth={2} />
      <Avatar url={parentAvatarUrl} name={parentUsername} size="xs" />
      <span className="min-w-0 truncate">
        <strong className="font-semibold text-gray-500">{parentUsername}</strong>
        {parentContent && (
          <span className="ml-1 font-normal text-gray-400">{parentContent}</span>
        )}
      </span>
    </button>
  );
}
