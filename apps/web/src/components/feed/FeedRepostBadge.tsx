'use client';

interface FeedRepostBadgeProps {
  username: string;
}

export function FeedRepostBadge({ username }: FeedRepostBadgeProps) {
  return (
    <div className="mb-1 flex items-center gap-1 px-4 text-xs text-gray-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3"
        />
      </svg>
      <span>
        <strong className="font-medium text-gray-500">{username}</strong> a repartagé
      </span>
    </div>
  );
}
