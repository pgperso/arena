'use client';

interface FeedReplyContextProps {
  parentUsername: string;
  parentContent?: string | null;
  onClick?: () => void;
}

export function FeedReplyContext({ parentUsername, parentContent, onClick }: FeedReplyContextProps) {
  return (
    <button
      onClick={onClick}
      className="mb-0.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
    >
      <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
        />
      </svg>
      <span className="truncate">
        En réponse à <strong className="font-medium text-gray-500">@{parentUsername}</strong>
        {parentContent && (
          <span className="ml-1 font-normal text-gray-400">— {parentContent}</span>
        )}
      </span>
    </button>
  );
}
