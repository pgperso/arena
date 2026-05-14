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
  featuredItems: PressGalleryItem[];
  mode: 'full' | 'compact';
}

export function HeroSection({ featuredItems, mode }: HeroSectionProps) {
  const t = useTranslations('pressGallery');

  if (featuredItems.length === 0) return null;

  if (mode === 'compact') {
    return <CompactStrip items={featuredItems} label={t('featured')} />;
  }

  return (
    <section className="mb-8">
      <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
        {t('featured')}
      </h2>

      {featuredItems.length === 1 && (
        <SingleHero item={featuredItems[0]} />
      )}

      {featuredItems.length === 2 && (
        <DuoHero items={featuredItems.slice(0, 2)} />
      )}

      {featuredItems.length >= 3 && (
        <TrioHero
          hero={featuredItems[0]}
          secondary={featuredItems.slice(1, 3)}
        />
      )}
    </section>
  );
}

// ─── Single hero: full-width cinematic ───

function SingleHero({ item }: { item: PressGalleryItem }) {
  return (
    <Link href={itemHref(item)} className="group relative block overflow-hidden rounded-xl">
      <div className="relative aspect-[16/9] w-full lg:aspect-[21/9]">
        {item.coverImageUrl ? (
          <Image
            src={item.coverImageUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ objectPosition: `center ${item.coverPositionY}%` }}
            sizes="100vw"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <HeroOverlay item={item} titleClass="text-2xl md:text-4xl" />
      </div>
    </Link>
  );
}

// ─── Duo hero: two equal overlay cards ───

function DuoHero({ items }: { items: PressGalleryItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Link
          key={`${item.type}-${item.id}`}
          href={itemHref(item)}
          className="group relative block overflow-hidden rounded-xl"
        >
          <div className="relative aspect-[16/9] w-full">
            {item.coverImageUrl ? (
              <Image
                src={item.coverImageUrl}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition: `center ${item.coverPositionY}%` }}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <HeroOverlay item={item} titleClass="text-xl md:text-2xl" />
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Trio hero: ESPN layout — 1 large + 2 stacked ───

function TrioHero({ hero, secondary }: { hero: PressGalleryItem; secondary: PressGalleryItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Hero — spans 2 cols, 2 rows on desktop */}
      <Link
        href={itemHref(hero)}
        className="group relative block overflow-hidden rounded-xl lg:col-span-2 lg:row-span-2"
      >
        <div className="relative aspect-[16/9] h-full w-full">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <HeroOverlay item={hero} titleClass="text-2xl md:text-3xl" showExcerpt />
        </div>
      </Link>

      {/* Secondary — vertical cards */}
      {secondary.map((item) => (
        <Link
          key={`${item.type}-${item.id}`}
          href={itemHref(item)}
          className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-[#1e1e1e]"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            {item.coverImageUrl ? (
              <Image
                src={item.coverImageUrl}
                alt={item.title}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ objectPosition: `center ${item.coverPositionY}%` }}
                sizes="(max-width: 1024px) 100vw, 22vw"
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
            <div className="mt-1.5 text-[11px] text-gray-400">
              {item.authorName} &middot; {formatTime(item.publishedAt)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Compact strip (for filtered state) ───

function CompactStrip({ items, label }: { items: PressGalleryItem[]; label: string }) {
  return (
    <section className="mb-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={itemHref(item)}
            className="group flex min-w-[280px] max-w-[320px] shrink-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-[#1e1e1e]"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              {item.coverImageUrl ? (
                <Image
                  src={item.coverImageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                  style={{ objectPosition: `center ${item.coverPositionY}%` }}
                  sizes="64px"
                />
              ) : (
                <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-0.5 flex items-center gap-1">
                {item.communityLogoUrl && (
                  <Image
                    src={item.communityLogoUrl}
                    alt={item.communityName}
                    width={12}
                    height={12}
                    className="h-3 w-3 rounded-full object-cover"
                  />
                )}
                <span className="text-[10px] font-medium text-gray-400">
                  {item.communityName}
                </span>
              </div>
              <h4 className="line-clamp-2 text-xs font-semibold text-gray-900 group-hover:text-brand-blue dark:text-gray-100">
                {item.title}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Shared overlay for hero cards ───

function HeroOverlay({ item, titleClass, showExcerpt }: { item: PressGalleryItem; titleClass: string; showExcerpt?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
      <div className="mb-2 flex items-center gap-2">
        {item.communityLogoUrl && (
          <Image
            src={item.communityLogoUrl}
            alt={item.communityName}
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover"
          />
        )}
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {item.communityName}
        </span>
      </div>

      <h3 className={`mb-2 font-bold leading-tight text-white ${titleClass}`}>
        {item.title}
      </h3>

      {showExcerpt && item.excerpt && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-200 md:text-base">
          {item.excerpt}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-300">
        <span className="font-medium">{item.authorName}</span>
        <span>&middot;</span>
        <span>{formatTime(item.publishedAt)}</span>
      </div>
    </div>
  );
}
