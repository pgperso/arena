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
  const [communityId, setCommunityId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Hero mode: full when defaults, compact when filtered, hidden when no featured
  const heroMode = useMemo(() => {
    if (featuredItems.length === 0) return 'hidden' as const;
    // Hide hero if filtering to podcasts and all featured are articles (or vice versa)
    if (filter === 'podcasts' && featuredItems.every((i) => i.type === 'article')) return 'hidden' as const;
    if (filter === 'articles' && featuredItems.every((i) => i.type === 'podcast')) return 'hidden' as const;
    if (filter === 'all' && sort === 'latest' && communityId === undefined) return 'full' as const;
    return 'compact' as const;
  }, [featuredItems, filter, sort, communityId]);

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
      cId: number | undefined,
      cur: string | null,
      append: boolean,
    ) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const data = await fetchPressGalleryItems(supabase, {
          filter: f,
          sort: s,
          communityId: cId,
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
    [supabase, heroIds, t],
  );

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(f, sort, communityId, null, false);
  };

  const handleSortChange = (s: SortType) => {
    setSort(s);
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(filter, s, communityId, null, false);
  };

  const handleCommunityChange = (cId: number | undefined) => {
    setCommunityId(cId);
    setItems([]);
    setCursor(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchItems(filter, sort, cId, null, false);
  };

  const handleLoadMore = () => {
    fetchItems(filter, sort, communityId, cursor, true);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {/* Header + Filter bar — sticky */}
        <div className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 pt-4 pb-0 backdrop-blur-sm dark:bg-[#1e1e1e]/95">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = '/tribunes'; }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
              {t('title')}
            </h1>
          </div>
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
        <div className="flex gap-8">
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
