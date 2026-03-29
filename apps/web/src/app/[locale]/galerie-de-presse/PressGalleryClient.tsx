'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSupabase } from '@/hooks/useSupabase';
import { HeroSection } from '@/components/press/HeroSection';
import { PressFilterBar } from '@/components/press/PressFilterBar';
import { PressArticleCard } from '@/components/press/PressArticleCard';
import { PressPodcastCard } from '@/components/press/PressPodcastCard';
import { AdBanner } from '@/components/ads/AdBanner';
import { AdSlot } from '@/components/ads/AdSlot';
import {
  fetchPressGalleryItems,
  type PressGalleryItem,
} from '@/services/pressGalleryService';

type FilterType = 'all' | 'articles' | 'podcasts';
type SortType = 'latest' | 'trending';

interface Community {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface PressGalleryClientProps {
  initialItems: PressGalleryItem[];
  heroArticle: PressGalleryItem | null;
  communities: Community[];
  userId: string | null;
}

const PAGE_SIZE = 12;

export function PressGalleryClient({
  initialItems,
  heroArticle,
  communities,
}: PressGalleryClientProps) {
  const t = useTranslations('pressGallery');
  const supabase = useSupabase();

  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('latest');
  const [communityId, setCommunityId] = useState<number | undefined>(undefined);

  // Separate hero + secondary from grid
  const heroIds = new Set<string>();
  if (heroArticle) heroIds.add(`${heroArticle.type}-${heroArticle.id}`);
  const secondaryItems = initialItems
    .filter((i) => !heroIds.has(`${i.type}-${i.id}`))
    .slice(0, 2);
  secondaryItems.forEach((i) => heroIds.add(`${i.type}-${i.id}`));

  const initialGridItems = initialItems.filter(
    (i) => !heroIds.has(`${i.type}-${i.id}`),
  );

  const [items, setItems] = useState<PressGalleryItem[]>(initialGridItems);
  const [offset, setOffset] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(
    async (
      f: FilterType,
      s: SortType,
      cId: number | undefined,
      off: number,
      append: boolean,
    ) => {
      setLoading(true);
      try {
        const data = await fetchPressGalleryItems(supabase, {
          filter: f,
          sort: s,
          communityId: cId,
          offset: off,
          limit: PAGE_SIZE,
        });

        if (append) {
          setItems((prev) => [...prev, ...data]);
        } else {
          setItems(data);
        }
        setHasMore(data.length >= PAGE_SIZE);
        setOffset(off + PAGE_SIZE);
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    fetchItems(f, sort, communityId, 0, false);
  };

  const handleSortChange = (s: SortType) => {
    setSort(s);
    fetchItems(filter, s, communityId, 0, false);
  };

  const handleCommunityChange = (cId: number | undefined) => {
    setCommunityId(cId);
    fetchItems(filter, sort, cId, 0, false);
  };

  const handleLoadMore = () => {
    fetchItems(filter, sort, communityId, offset, true);
  };

  // Only show hero section on default filter state
  const showHero =
    filter === 'all' && sort === 'latest' && communityId === undefined;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* Header + Filter bar — sticky together */}
        <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pt-4 pb-0 backdrop-blur-sm dark:bg-[#1e1e1e]/95">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-1 mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t('subtitle')}
          </p>
          <PressFilterBar
          filter={filter}
          sort={sort}
          communityId={communityId}
          communities={communities}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onCommunityChange={handleCommunityChange}
        />
        </div>

        {/* Hero section */}
        {showHero && (
          <HeroSection hero={heroArticle} secondary={secondaryItems} />
        )}

        {/* Ad banner after hero */}
        <AdBanner slotId="press-hero-banner" className="my-6" />

        {/* Content + sidebar */}
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, idx) => {
                const card =
                  item.type === 'article' ? (
                    <PressArticleCard
                      key={`${item.type}-${item.id}`}
                      item={item}
                    />
                  ) : (
                    <PressPodcastCard
                      key={`${item.type}-${item.id}`}
                      item={item}
                    />
                  );

                if (idx > 0 && idx % 6 === 0) {
                  return (
                    <div key={`ad-group-${idx}`} className="contents">
                      <div className="col-span-full">
                        <AdSlot
                          slotId={`feed-ad-press-${idx}`}
                          format="in-feed"
                        />
                      </div>
                      {card}
                    </div>
                  );
                }

                return card;
              })}
            </div>

            {/* No results */}
            {!loading && items.length === 0 && (
              <p className="py-12 text-center text-gray-400">
                {t('noResults')}
              </p>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  {loading ? t('loading') : t('loadMore')}
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden w-[320px] shrink-0 lg:block">
            <div className="sticky top-24">
              <AdSlot slotId="press-sidebar" format="half-page" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
