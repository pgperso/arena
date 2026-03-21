'use client';

interface FeedReplyBarProps {
  username: string;
  mode: 'reply' | 'quote';
  preview?: string | null;
  onCancel: () => void;
}

export function FeedReplyBar({ username, mode, preview, onCancel }: FeedReplyBarProps) {
  const isQuote = mode === 'quote';

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">
          {isQuote ? (
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
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.2 48.2 0 0 0 5.887-.512c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          ) : (
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
          )}
          {isQuote ? 'Citer' : 'Répondre à'}{' '}
          <strong className="font-medium text-gray-700">@{username}</strong>
        </p>
        {preview && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{preview}</p>
        )}
      </div>
      <button
        onClick={onCancel}
        className="ml-3 flex-shrink-0 text-xs text-gray-400 hover:text-gray-600"
      >
        Annuler
      </button>
    </div>
  );
}
