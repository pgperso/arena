'use client';

import { useState, useRef } from 'react';
import { formatTime, formatDuration } from '@arena/shared';
import type { FeedPodcast } from '@arena/shared';
import { FeedLikeButton } from './FeedLikeButton';
import { useSupabase } from '@/hooks/useSupabase';
import Image from 'next/image';
import Link from 'next/link';

interface FeedPodcastCardProps {
  podcast: FeedPodcast;
  communitySlug: string;
  userId: string | null;
  canModerate?: boolean;
}

export function FeedPodcastCard({ podcast, communitySlug, userId, canModerate }: FeedPodcastCardProps) {
  const supabase = useSupabase();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removed, setRemoved] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isOwn = !!(userId && podcast.publisher?.id === userId);
  const canRemove = isOwn || !!canModerate;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(0);
  }

  async function handleRemoveFromFeed() {
    await supabase
      .from('podcasts')
      .update({ is_published: false })
      .eq('id', podcast.id);
    setRemoved(true);
  }

  if (removed) return null;

  return (
    <div className="px-4 py-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <audio
          ref={audioRef}
          src={podcast.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          preload="none"
        />

        <div className="flex gap-3">
          {/* Cover / Play button */}
          <button
            onClick={togglePlay}
            className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-200"
            aria-label={playing ? 'Mettre en pause' : 'Lire'}
          >
            {podcast.coverImageUrl ? (
              <Image
                src={podcast.coverImageUrl}
                alt={podcast.title}
                width={56}
                height={56}
                className="h-14 w-14 object-cover"
                sizes="56px"
              />
            ) : (
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30">
              {playing ? (
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </button>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                Podcast
              </span>
              <span className="text-xs text-gray-400">{formatTime(podcast.createdAt)}</span>
              {podcast.durationSeconds && (
                <span className="text-xs text-gray-400">
                  {formatDuration(podcast.durationSeconds)}
                </span>
              )}
            </div>
            <Link
              href={`/tribunes/${communitySlug}/podcasts/${podcast.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-orange-700 line-clamp-1"
            >
              {podcast.title}
            </Link>
            {podcast.description && (
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{podcast.description}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="mt-3 h-1.5 cursor-pointer rounded-full bg-orange-200"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Actions: like (not own) + remove from feed */}
      <div className="mt-1 flex items-center gap-1 pl-1">
        {!isOwn && (
          <FeedLikeButton
            targetType="podcast"
            targetId={podcast.id}
            initialLikeCount={podcast.likeCount}
            userId={userId}
          />
        )}
        {isOwn && podcast.likeCount > 0 && (
          <span className="px-2 py-1 text-xs text-gray-300">{podcast.likeCount} ♥</span>
        )}
        {canRemove && (
          <button
            onClick={handleRemoveFromFeed}
            className="ml-auto rounded-full px-2 py-1 text-xs text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            Retirer du chat
          </button>
        )}
      </div>
    </div>
  );
}
