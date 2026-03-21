'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { formatTime } from '@arena/shared';

interface TrendingMessage {
  id: number;
  content: string;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
  communityName: string;
  communitySlug: string;
}

interface TrendingMessagesProps {
  popular: TrendingMessage[];
  controversial: TrendingMessage[];
}

function MessageCard({ msg, variant }: { msg: TrendingMessage; variant: 'popular' | 'controversial' }) {
  const isPopular = variant === 'popular';

  return (
    <Link
      href={`/tribunes/${msg.communitySlug}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar url={msg.avatarUrl} name={msg.username} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-gray-900">{msg.username}</span>
          <span className="ml-2 text-xs text-gray-400">{msg.communityName}</span>
        </div>
        <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
      </div>
      <p className="mb-3 line-clamp-2 text-sm text-gray-700">{msg.content}</p>
      <div className="flex items-center gap-3 text-xs">
        <span className={`flex items-center gap-1 font-medium ${isPopular ? 'text-red-500' : 'text-gray-400'}`}>
          <svg className="h-3.5 w-3.5" fill={isPopular ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {msg.likeCount}
        </span>
        <span className={`flex items-center gap-1 font-medium ${!isPopular ? 'text-brand-orange' : 'text-gray-400'}`}>
          <svg className="h-3.5 w-3.5" fill={!isPopular ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.5a2.25 2.25 0 0 0 2.25 2.25c.592 0 1.092-.365 1.3-.915l.96-2.544a1.5 1.5 0 0 1 1.403-.971h2.399a3 3 0 0 0 2.995-2.823l.267-4a3 3 0 0 0-2.995-3.177H14.75M7.498 15.25H14.75m0-10.5h.128c.876 0 1.585.71 1.585 1.585v.925a3 3 0 0 1-.26 1.22l-.217.476" />
          </svg>
          {msg.dislikeCount}
        </span>
      </div>
    </Link>
  );
}

export function TrendingMessages({ popular, controversial }: TrendingMessagesProps) {
  if (popular.length === 0 && controversial.length === 0) return null;

  return (
    <div className="mb-10 grid gap-8 md:grid-cols-2">
      {/* Popular */}
      {popular.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Les plus populaires
          </h2>
          <div className="space-y-3">
            {popular.map((msg) => (
              <MessageCard key={msg.id} msg={msg} variant="popular" />
            ))}
          </div>
        </div>
      )}

      {/* Controversial */}
      {controversial.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <svg className="h-5 w-5 text-brand-orange" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.5a2.25 2.25 0 0 0 2.25 2.25c.592 0 1.092-.365 1.3-.915l.96-2.544a1.5 1.5 0 0 1 1.403-.971h2.399a3 3 0 0 0 2.995-2.823l.267-4a3 3 0 0 0-2.995-3.177H14.75M7.498 15.25H14.75m0-10.5h.128c.876 0 1.585.71 1.585 1.585v.925a3 3 0 0 1-.26 1.22l-.217.476" />
            </svg>
            Les plus controversés
          </h2>
          <div className="space-y-3">
            {controversial.map((msg) => (
              <MessageCard key={msg.id} msg={msg} variant="controversial" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
