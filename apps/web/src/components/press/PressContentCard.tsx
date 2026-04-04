'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { formatTime } from '@arena/shared';
import type { PressGalleryItem } from '@/services/pressGalleryService';

interface PressContentCardProps {
  item: PressGalleryItem;
  variant?: 'large' | 'standard';
}

function itemHref(item: PressGalleryItem): string {
  if (item.type === 'article' && item.slug) {
    return `/tribunes/${item.communitySlug}/articles/${item.slug}`;
  }
  return `/tribunes/${item.communitySlug}/podcasts/${item.id}`;
}

export function PressContentCard({ item, variant = 'standard' }: PressContentCardProps) {
  const isLarge = variant === 'large';
  const isPodcast = item.type === 'podcast';

  return (
    <Link
      href={itemHref(item)}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-[#1e1e1e]"
    >
      {/* Cover image */}
      <div className={`relative w-full overflow-hidden ${isLarge ? 'aspect-[16/10]' : 'aspect-video'}`}>
        {item.coverImageUrl ? (
          <Image
            src={item.coverImageUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ objectPosition: `center ${item.coverPositionY}%` }}
            sizes={isLarge
              ? '(max-width: 768px) 100vw, 50vw'
              : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
          />
        ) : (
          <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
        )}

        {/* Podcast overlay */}
        {isPodcast && (
          <>
            {/* Play icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-transform group-hover:scale-110">
                <svg className="ml-1 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Podcast badge */}
            <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              Podcast
            </span>

            {/* LIVE badge */}
            {item.isLive && (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                EN DIRECT
              </span>
            )}

            {/* Duration badge */}
            {!item.isLive && item.durationSeconds && item.durationSeconds > 0 && (
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                {Math.round(item.durationSeconds / 60)} min
              </span>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Community badge */}
        <div className="mb-2 flex items-center gap-1.5">
          {item.communityLogoUrl && (
            <Image
              src={item.communityLogoUrl}
              alt={item.communityName}
              width={16}
              height={16}
              className="h-4 w-4 rounded-full object-cover"
            />
          )}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {item.communityName}
          </span>
        </div>

        {/* Title */}
        <h3 className={`mb-1 line-clamp-2 font-semibold text-gray-900 group-hover:text-brand-blue dark:text-gray-100 ${isLarge ? 'text-lg md:text-xl' : ''}`}>
          {item.title}
        </h3>

        {/* Excerpt (large variant only) */}
        {isLarge && (item.excerpt || item.description) && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
            {item.excerpt || item.description}
          </p>
        )}

        {/* Author + date */}
        <div className="mt-auto flex items-center gap-2 text-xs text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {item.authorName}
          </span>
          <span>&middot;</span>
          <span>{formatTime(item.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
