'use client';

import { useTranslations } from 'next-intl';

type FilterType = 'all' | 'articles' | 'podcasts';
type SortType = 'latest' | 'trending';

interface Community {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface PressFilterBarProps {
  filter: FilterType;
  sort: SortType;
  communityId: number | undefined;
  communities: Community[];
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onCommunityChange: (communityId: number | undefined) => void;
}

export function PressFilterBar({
  filter,
  sort,
  communityId,
  communities,
  onFilterChange,
  onSortChange,
  onCommunityChange,
}: PressFilterBarProps) {
  const t = useTranslations('pressGallery');

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'articles', label: t('articles') },
    { key: 'podcasts', label: t('podcasts') },
  ];

  return (
    <div className="border-b border-gray-200 py-3 dark:border-gray-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Community dropdown + Sort */}
        <div className="flex items-center gap-3">
          <select
            value={communityId ?? ''}
            onChange={(e) =>
              onCommunityChange(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:bg-[#1e1e1e] dark:text-gray-300"
          >
            <option value="">{t('allCommunities')}</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => onSortChange('latest')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === 'latest'
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              } rounded-l-lg`}
            >
              {t('latest')}
            </button>
            <button
              onClick={() => onSortChange('trending')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === 'trending'
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              } rounded-r-lg`}
            >
              {t('trending')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
