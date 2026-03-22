'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { Avatar } from '@/components/ui/Avatar';
import type { Database } from '@arena/supabase-client';

type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface JoinTribuneModalProps {
  userId: string | null;
  memberCommunityIds: number[];
  onClose: () => void;
}

export function JoinTribuneModal({ userId, memberCommunityIds, onClose }: JoinTribuneModalProps) {
  const supabase = useSupabase();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: coms }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('communities').select('id, name, slug, description, logo_url, primary_color, member_count, category_id, is_active').eq('is_active', true),
      ]);
      setCategories((cats ?? []) as CategoryRow[]);
      setCommunities((coms ?? []) as CommunityRow[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (selectedCategory) setSelectedCategory(null);
        else onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, selectedCategory]);

  const filteredCommunities = selectedCategory
    ? communities.filter((c) => c.category_id === selectedCategory && !memberCommunityIds.includes(c.id))
    : [];

  const sportIcons: Record<string, string> = {
    hockey: '🏒',
    baseball: '⚾',
    football: '🏈',
    soccer: '⚽',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.name ?? 'Tribunes'
                : 'Rejoindre une tribune'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : !selectedCategory ? (
            // Step 1: Pick a category
            <div className="space-y-2">
              {categories.map((cat) => {
                const count = communities.filter((c) => c.category_id === cat.id && !memberCommunityIds.includes(c.id)).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    disabled={count === 0}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    <span className="text-2xl">{sportIcons[cat.slug] ?? '🏅'}</span>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                      <p className="text-xs text-gray-400">
                        {count > 0 ? `${count} tribune${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}` : 'Toutes rejointes'}
                      </p>
                    </div>
                    <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                );
              })}
            </div>
          ) : (
            // Step 2: Pick a tribune
            <div className="space-y-2">
              {filteredCommunities.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  Tu as déjà rejoint toutes les tribunes de cette catégorie.
                </p>
              ) : (
                filteredCommunities.map((com) => (
                  <button
                    key={com.id}
                    onClick={() => {
                      onClose();
                      router.push(`/tribunes/${com.slug}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-gray-50"
                  >
                    <Avatar url={com.logo_url} name={com.name} size="md" color={com.primary_color} />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900">{com.name}</span>
                      {com.description && (
                        <p className="text-xs text-gray-400 line-clamp-1">{com.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{com.member_count} membres</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
