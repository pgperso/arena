'use client';

import { X } from 'lucide-react';

interface FeedReplyBarProps {
  username: string;
  preview?: string | null;
  onCancel: () => void;
}

export function FeedReplyBar({ username, preview, onCancel }: FeedReplyBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-l-2 border-brand-blue bg-gray-100 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-gray-500">
          Répondre à <strong className="font-semibold text-gray-700">@{username}</strong>
          {preview && (
            <span className="ml-1.5 text-gray-400">— {preview}</span>
          )}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="flex-shrink-0 rounded p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
