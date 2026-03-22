'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, ThumbsDown, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [sliding, setSliding] = useState(false);

  const goTo = useCallback((index: number) => {
    setSliding(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setSliding(false);
    }, 200);
  }, []);

  const next = useCallback(() => {
    goTo((currentIndex + 1) % allMessages.length);
  }, [currentIndex, allMessages.length, goTo]);

  const prev = useCallback(() => {
    goTo((currentIndex - 1 + allMessages.length) % allMessages.length);
  }, [currentIndex, allMessages.length, goTo]);

  useEffect(() => {
    if (allMessages.length <= 1) return;
    const interval = setInterval(next, 6000);
    return () => clearInterval(interval);
  }, [allMessages.length, next]);

  if (allMessages.length === 0) return null;

  const msg = allMessages[currentIndex];
  const isPopular = msg.variant === 'popular';

  return (
    <div className="mx-auto mb-12 max-w-2xl">
      <div className="overflow-hidden rounded-2xl bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-brand-orange" strokeWidth={2.5} />
            <span className="text-sm font-bold tracking-wide text-gray-300 uppercase">
              En ce moment
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isPopular
                ? 'bg-red-500/20 text-red-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}>
              {isPopular ? 'Populaire' : 'Controversé'}
            </span>
          </div>
        </div>

        {/* Message card */}
        <div className="relative px-5 py-5">
          <div className={`transition-all duration-200 ${sliding ? 'translate-x-2 opacity-0' : 'translate-x-0 opacity-100'}`}>
            <Link href={`/tribunes/${msg.communitySlug}`} className="block">
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar url={msg.avatarUrl} name={msg.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-white">{msg.username}</span>
                  <span className="ml-2 text-xs font-medium text-gray-500">{msg.communityName}</span>
                </div>
                <span className="text-xs text-gray-500">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="line-clamp-2 text-sm leading-relaxed text-gray-300">{msg.content}</p>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className={`flex items-center gap-1 font-semibold ${isPopular ? 'text-red-400' : 'text-gray-500'}`}>
                  <Heart className="h-3.5 w-3.5" fill={isPopular ? 'currentColor' : 'none'} strokeWidth={1.5} />
                  {msg.likeCount}
                </span>
                <span className={`flex items-center gap-1 font-semibold ${!isPopular ? 'text-orange-400' : 'text-gray-500'}`}>
                  <ThumbsDown className="h-3.5 w-3.5" fill={!isPopular ? 'currentColor' : 'none'} strokeWidth={1.5} />
                  {msg.dislikeCount}
                </span>
              </div>
            </Link>
          </div>

          {/* Nav arrows */}
          {allMessages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-gray-800 p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                onClick={next}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-gray-800 p-1 text-gray-400 transition hover:bg-gray-700 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          )}
        </div>

        {/* Progress dots */}
        {allMessages.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-4">
            {allMessages.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1 rounded-full transition-all ${
                  i === currentIndex ? 'w-5 bg-brand-orange' : 'w-1.5 bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
