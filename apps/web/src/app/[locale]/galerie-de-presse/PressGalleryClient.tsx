'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
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
  initialCursor: string | null;
  featuredItems: PressGalleryItem[];
  communities: Community[];
  userId: string | null;
}

const PAGE_SIZE = 12;

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

  const hero = featuredItems.length > 0 ? featuredItems[0] : null;
  const secondaryItems = featuredItems.slice(1);

  const [items, setItems] = useState<PressGalleryItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('latest');
  const [communityId, setCommunityId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchItems = useCallback(
    async (
      f: FilterType,
      s: SortType,
      cId: number | undefined,
      cur: string | null,
      append: boolean,
    ) => {
      // Abort any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }
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

        // Check if this request was aborted
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
        setError(
          err instanceof Error ? err.message : t('errorLoading'),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
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

        {/* Error banner */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* À la une */}
        {showHero && (
          <>
            <h2 className="mt-6 mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              {t('featured')}
            </h2>
            <HeroSection hero={hero} secondary={secondaryItems} />
          </>
        )}

        {/* Ad banner after hero */}
        <AdBanner slotId="press-hero-banner" className="my-6" />

        {/* Content + sidebar */}
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {(() => {
              const articleItems = items.filter((i) => i.type === 'article');
              const podcastItems = items.filter((i) => i.type === 'podcast');
              const showArticles = filter !== 'podcasts' && articleItems.length > 0;
              const showPodcasts = filter !== 'articles' && podcastItems.length > 0;

              return (
                <>
                  {/* Articles section */}
                  {showArticles && (
                    <>
                      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
                        <svg className="h-5 w-5 text-brand-blue" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6V7.5Z" />
                        </svg>
                        {filter === 'all' ? t('articles') : t('latest')}
                      </h2>
                      {(() => {
                        const chunks: PressGalleryItem[][] = [];
                        for (let i = 0; i < articleItems.length; i += 6) {
                          chunks.push(articleItems.slice(i, i + 6));
                        }
                        return chunks.map((chunk, chunkIdx) => (
                          <div key={`chunk-${chunkIdx}`}>
                            {chunkIdx > 0 && (
                              <div className="my-6">
                                <AdSlot slotId={`feed-ad-press-${chunkIdx}`} format="in-feed" layoutKey="-6t+ed+2i-1n-4w" />
                              </div>
                            )}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                              {chunk.map((item) => (
                                <PressArticleCard key={`article-${item.id}`} item={item} />
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </>
                  )}

                  {/* Podcasts section */}
                  {showPodcasts && (
                    <>
                      <h2 className="mt-8 mb-4 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
                        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                        {t('podcasts')}
                      </h2>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {podcastItems.map((item) => (
                          <PressPodcastCard key={`podcast-${item.id}`} item={item} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

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
