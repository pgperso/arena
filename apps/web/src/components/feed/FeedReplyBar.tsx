'use client';

interface FeedReplyBarProps {
  replyToUsername: string;
  onCancel: () => void;
}

export function FeedReplyBar({ replyToUsername, onCancel }: FeedReplyBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
      <p className="text-xs text-gray-500">
        <svg
          className="mr-1 inline h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
          />
        </svg>
        Répondre à <strong className="font-medium text-gray-700">@{replyToUsername}</strong>
      </p>
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Annuler
      </button>
    </div>
  );
}
