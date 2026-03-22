'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ThumbsDown, Flame } from 'lucide-react';
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

export function TrendingMessages({ popular, controversial }: TrendingMessagesProps) {
  const allMessages = [
    ...popular.map((msg) => ({ ...msg, variant: 'popular' as const })),
    ...controversial.map((msg) => ({ ...msg, variant: 'controversial' as const })),
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (allMessages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % allMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [allMessages.length]);

  if (allMessages.length === 0) return null;

  const msg = allMessages[currentIndex];
  const isPopular = msg.variant === 'popular';

  return (
    <div className="mx-auto mb-10 max-w-xl">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-brand-orange" strokeWidth={2} />
        <span className="text-sm font-semibold text-gray-500">En ce moment dans les tribunes</span>
      </div>

      <Link
        href={`/tribunes/${msg.communitySlug}`}
        className={`block rounded-2xl border p-5 transition-all duration-500 hover:shadow-lg ${
          isPopular
            ? 'border-red-200 bg-red-50/50 hover:border-red-300'
            : 'border-orange-200 bg-orange-50/50 hover:border-orange-300'
        }`}
      >
        <div className="mb-3 flex items-center gap-2">
          <Avatar url={msg.avatarUrl} name={msg.username} size="sm" />
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-gray-900">{msg.username}</span>
            <span className="ml-2 text-xs text-gray-400">{msg.communityName}</span>
          </div>
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            isPopular
              ? 'bg-red-100 text-red-600'
              : 'bg-orange-100 text-brand-orange'
          }`}>
            {isPopular ? (
              <><Heart className="h-3 w-3" fill="currentColor" strokeWidth={1.5} />{msg.likeCount}</>
            ) : (
              <><ThumbsDown className="h-3 w-3" fill="currentColor" strokeWidth={1.5} />{msg.dislikeCount}</>
            )}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-gray-700">{msg.content}</p>
        <p className="mt-2 text-xs text-gray-400">{formatTime(msg.createdAt)}</p>
      </Link>

      {/* Dots indicator */}
      {allMessages.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {allMessages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'w-4 bg-brand-blue' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
