'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { formatTime } from '@arena/shared';
import type { PressGalleryItem } from '@/services/pressGalleryService';

function itemHref(item: PressGalleryItem): string {
  if (item.type === 'article' && item.slug) {
    return `/tribunes/${item.communitySlug}/articles/${item.slug}`;
  }
  return `/tribunes/${item.communitySlug}/podcasts/${item.id}`;
}

interface HeroSectionProps {
  hero: PressGalleryItem | null;
  secondary: PressGalleryItem[];
}

export function HeroSection({ hero, secondary }: HeroSectionProps) {
  const t = useTranslations('pressGallery');

  if (!hero) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
        {t('featured')}
      </h2>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Hero card */}
        <Link
          href={itemHref(hero)}
          className={`group relative block overflow-hidden rounded-xl ${secondary.length > 0 ? 'flex-[2]' : 'flex-1'}`}
        >
          <div className="relative aspect-[16/9] w-full lg:aspect-[16/10]">
            {hero.coverImageUrl ? (
              <Image
                src={hero.coverImageUrl}
                alt={hero.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition: `center ${hero.coverPositionY}%` }}
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            ) : (
              <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
              {/* Community badge */}
              <div className="mb-2 flex items-center gap-2">
                {hero.communityLogoUrl && (
                  <Image
                    src={hero.communityLogoUrl}
                    alt={hero.communityName}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                )}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  {hero.communityName}
                </span>
              </div>

              <h3 className="mb-2 text-2xl font-bold leading-tight text-white md:text-3xl">
                {hero.title}
              </h3>

              {hero.excerpt && (
                <p className="mb-3 line-clamp-2 text-sm text-gray-200 md:text-base">
                  {hero.excerpt}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-300">
                <span className="font-medium">{hero.authorName}</span>
                <span>&middot;</span>
                <span>{formatTime(hero.publishedAt)}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Secondary cards */}
        {secondary.length > 0 && (
        <div className="flex flex-col gap-4 lg:flex-1">
          {secondary.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={itemHref(item)}
              className="group flex overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-[#1e1e1e]"
            >
              <div className="relative aspect-[4/3] w-1/3 shrink-0">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt={item.title}
                    fill
                    loading="lazy"
                    className="object-cover"
                    style={{ objectPosition: `center ${item.coverPositionY}%` }}
                    sizes="(max-width: 1024px) 33vw, 11vw"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
                )}
              </div>

              <div className="flex flex-1 flex-col justify-center p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  {item.communityLogoUrl && (
                    <Image
                      src={item.communityLogoUrl}
                      alt={item.communityName}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded-full object-cover"
                    />
                  )}
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    {item.communityName}
                  </span>
                </div>

                <h4 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-blue dark:text-gray-100">
                  {item.title}
                </h4>

                <div className="mt-1 text-[11px] text-gray-400">
                  {formatTime(item.publishedAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
