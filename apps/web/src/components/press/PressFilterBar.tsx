'use client';

import { useTranslations } from 'next-intl';

type FilterType = 'all' | 'articles' | 'podcasts';
type SortType = 'latest' | 'trending';
type CategoryType = 'all' | 'sport' | 'taverne';

interface Community {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface PressFilterBarProps {
  filter: FilterType;
  sort: SortType;
  category: CategoryType;
  communityId: number | undefined;
  communities: Community[];
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onCategoryChange: (category: CategoryType) => void;
  onCommunityChange: (communityId: number | undefined) => void;
}

export function PressFilterBar({
  filter,
  sort,
  category,
  communityId,
  communities,
  onFilterChange,
  onSortChange,
  onCategoryChange,
  onCommunityChange,
}: PressFilterBarProps) {
  const t = useTranslations('pressGallery');

  const categories: { key: CategoryType; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'sport', label: t('catSport') },
    { key: 'taverne', label: t('catTaverne') },
  ];

  const types: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'articles', label: t('articles') },
    { key: 'podcasts', label: t('podcasts') },
  ];

  // Only show community dropdown when category is 'sport' or 'all'
  const showCommunityDropdown = category !== 'taverne';
  // Filter communities to exclude La Taverne from dropdown
  const filteredCommunities = communities.filter((c) => c.slug !== 'la-taverne');

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Category + Type pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Category pills */}
          {categories.map(({ key, label }) => (
            <button
              key={`cat-${key}`}
              onClick={() => onCategoryChange(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold transition-colors ${
                category === key
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600 shrink-0" />

          {/* Type pills */}
          {types.map(({ key, label }) => (
            <button
              key={`type-${key}`}
              onClick={() => onFilterChange(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Community dropdown + Sort */}
        <div className="flex items-center gap-2">
          {showCommunityDropdown && filteredCommunities.length > 0 && (
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
              {filteredCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

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
