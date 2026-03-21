'use client';

import Link from 'next/link';
import { Heart, ThumbsDown } from 'lucide-react';
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
          <Heart className="h-3.5 w-3.5" fill={isPopular ? 'currentColor' : 'none'} strokeWidth={1.5} />
          {msg.likeCount}
        </span>
        <span className={`flex items-center gap-1 font-medium ${!isPopular ? 'text-brand-orange' : 'text-gray-400'}`}>
          <ThumbsDown className="h-3.5 w-3.5" fill={!isPopular ? 'currentColor' : 'none'} strokeWidth={1.5} />
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
            <Heart className="h-5 w-5 text-red-500" fill="currentColor" strokeWidth={1.5} />
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
            <ThumbsDown className="h-5 w-5 text-brand-orange" fill="currentColor" strokeWidth={1.5} />
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
