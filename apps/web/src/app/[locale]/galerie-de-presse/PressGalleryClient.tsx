'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSupabase } from '@/hooks/useSupabase';
import { HeroSection } from '@/components/press/HeroSection';
import { PressFilterBar } from '@/components/press/PressFilterBar';
import { PressContentCard } from '@/components/press/PressContentCard';
import { AdBanner } from '@/components/ads/AdBanner';
import { AdSlot } from '@/components/ads/AdSlot';
import {
  fetchPressGalleryItems,
  type PressGalleryItem,
} from '@/services/pressGalleryService';

type FilterType = 'all' | 'articles' | 'podcasts';
type SortType = 'latest' | 'trending';
type CategoryType = 'all' | 'sport' | 'taverne';

interface Community {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface PressGalleryClientProps {
  initialItems: PressGalleryItem[];
  initialCursor: string | null;
  featuredItems: PressGalleryItem[];
  taverneItems: PressGalleryItem[];
  communities: Community[];
  userId: string | null;
}

const PAGE_SIZE = 12;

// Pattern: 2 large cards, then 6 standard (3-col), then ad, repeat
const PATTERN_SIZE = 8;
const FEATURE_DUO_SIZE = 2;

export function PressGalleryClient({
  initialItems,
  initialCursor,
  featuredItems,
  taverneItems,
  communities,
}: PressGalleryClientProps) {
  const t = useTranslations('pressGallery');
  const supabase = useSupabase();

  const heroIds = useMemo(
    () => featuredItems.map((i) => i.id),
    [featuredItems],
  );

  const [items, setItems] = useState<PressGalleryItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('latest');
  const [category, setCategory] = useState<CategoryType>('all');
  const [communityId, setCommunityId] = useState<number | undefined>(undefined);

  // Resolve La Taverne community ID for category filtering
  const taverneCommunityId = useMemo(
    () => communities.find((c) => c.slug === 'la-taverne')?.id,
    [communities],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Hero mode: full when defaults, compact when filtered, hidden when no featured
  const heroMode = useMemo(() => {
    if (featuredItems.length === 0) return 'hidden' as const;
    // Hide hero if filtering to podcasts and all featured are articles (or vice versa)
    if (filter === 'podcasts' && featuredItems.every((i) => i.type === 'article')) return 'hidden' as const;
    if (filter === 'articles' && featuredItems.every((i) => i.type === 'podcast')) return 'hidden' as const;
    if (filter === 'all' && sort === 'latest' && communityId === undefined && category === 'all') return 'full' as const;
    return 'compact' as const;
  }, [featuredItems, filter, sort, communityId, category]);

  // Filter featured items to match current filter
  const visibleFeatured = useMemo(() => {
    if (filter === 'articles') return featuredItems.filter((i) => i.type === 'article');
    if (filter === 'podcasts') return featuredItems.filter((i) => i.type === 'podcast');
    return featuredItems;
  }, [featuredItems, filter]);

  const fetchItems = useCallback(
    async (
      f: FilterType,
      s: SortType,
      cat: CategoryType,
      cId: number | undefined,
      cur: string | null,
      append: boolean,
    ) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      // Category → communityId / excludeCommunityId mapping
      const effectiveCommunityId = cat === 'taverne' ? taverneCommunityId : cId;
      const excludeCommunityId = cat === 'sport' ? taverneCommunityId : undefined;

      try {
        const data = await fetchPressGalleryItems(supabase, {
          filter: f,
          sort: s,
          communityId: effectiveCommunityId,
          excludeCommunityId,
          cursor: cur ?? undefined,
          limit: PAGE_SIZE,
          excludeIds: heroIds,
        });

        if (controller.signal.aborted) return;

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setHasMore(data.items.length >= PAGE_SIZE);
        setCursor(data.nextCursor);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('errorLoading'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [supabase, heroIds, taverneCommunityId, t],
  );

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(f, sort, category, communityId, null, false);
  };

  const handleSortChange = (s: SortType) => {
    setSort(s);
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(filter, s, category, communityId, null, false);
  };

  const handleCategoryChange = (cat: CategoryType) => {
    setCategory(cat);
    setCommunityId(undefined); // Reset community filter on category change
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(filter, sort, cat, undefined, null, false);
  };

  const handleCommunityChange = (cId: number | undefined) => {
    setCommunityId(cId);
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(filter, sort, category, cId, null, false);
  };

  const handleLoadMore = () => {
    fetchItems(filter, sort, category, communityId, cursor, true);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
      {/* Second appbar — full width, sticky */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-700 dark:bg-[#1e1e1e]/95">
        <div className="flex items-center gap-4 px-4 py-2">
          <h1 className="shrink-0 text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <div className="flex-1 min-w-0">
            <PressFilterBar
              filter={filter}
              sort={sort}
              category={category}
              communityId={communityId}
              communities={communities}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              onCategoryChange={handleCategoryChange}
              onCommunityChange={handleCommunityChange}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6">

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Hero section */}
        {heroMode !== 'hidden' && (
          <HeroSection featuredItems={visibleFeatured} mode={heroMode} />
        )}

        {/* Ad banner after hero */}
        <AdBanner slotId="press-hero-banner" className="my-6" />

        {/* Content + sidebar */}
        <div className="flex gap-6">
          {/* Main content — unified grid */}
          <div className="flex-1 min-w-0">
            {items.length > 0 && (
              <PatternGrid items={items} />
            )}

            {/* No results */}
            {!loading && items.length === 0 && !error && (
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

            {/* La Taverne section */}
            {taverneItems.length > 0 && (
              <section className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
                <div className="mb-5 flex items-center gap-3">
                  <span className="text-2xl">🍺</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 md:text-2xl">
                      {t('taverne')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('taverneSubtitle')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {taverneItems.map((item) => (
                    <PressContentCard key={`taverne-${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              </section>
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

// ─── Pattern Grid: 2 large + 6 standard + ad, repeat ───

function PatternGrid({ items }: { items: PressGalleryItem[] }) {
  const chunks: { type: 'feature' | 'standard' | 'ad'; items: PressGalleryItem[] }[] = [];
  let idx = 0;

  while (idx < items.length) {
    // Feature duo (2 large cards)
    const featureEnd = Math.min(idx + FEATURE_DUO_SIZE, items.length);
    chunks.push({ type: 'feature', items: items.slice(idx, featureEnd) });
    idx = featureEnd;

    // Standard grid (up to 6 cards)
    if (idx < items.length) {
      const standardEnd = Math.min(idx + (PATTERN_SIZE - FEATURE_DUO_SIZE), items.length);
      chunks.push({ type: 'standard', items: items.slice(idx, standardEnd) });
      idx = standardEnd;
    }

    // Ad slot between cycles
    if (idx < items.length) {
      chunks.push({ type: 'ad', items: [] });
    }
  }

  return (
    <div className="space-y-6">
      {chunks.map((chunk, i) => {
        if (chunk.type === 'ad') {
          return (
            <div key={`ad-${i}`} className="my-6">
              <AdSlot slotId={`feed-ad-press-${i}`} format="in-feed" layoutKey="-6t+ed+2i-1n-4w" />
            </div>
          );
        }

        if (chunk.type === 'feature') {
          return (
            <div key={`feature-${i}`} className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {chunk.items.map((item) => (
                <PressContentCard key={`${item.type}-${item.id}`} item={item} variant="large" />
              ))}
            </div>
          );
        }

        return (
          <div key={`standard-${i}`} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {chunk.items.map((item) => (
              <PressContentCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
