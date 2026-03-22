'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { formatTime, formatDuration } from '@arena/shared';
import { Avatar } from '@/components/ui/Avatar';
import Image from 'next/image';
import Link from 'next/link';

interface ContentItem {
  type: 'article' | 'podcast';
  id: number;
  title: string;
  slug?: string;
  excerpt?: string | null;
  description?: string | null;
  coverImageUrl: string | null;
  likeCount: number;
  viewCount?: number;
  durationSeconds?: number | null;
  publishedAt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isLive?: boolean;
  youtubeVideoId?: string | null;
}

interface CommunityContentTabProps {
  communityId: number;
  communitySlug: string;
}

type FilterType = 'all' | 'articles' | 'podcasts';

export function CommunityContentTab({ communityId, communitySlug }: CommunityContentTabProps) {
  const supabase = useSupabase();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const [{ data: articles }, { data: podcasts }] = await Promise.all([
        supabase
          .from('articles')
          .select('id, title, slug, excerpt, cover_image_url, like_count, view_count, published_at, members:members!articles_author_id_fkey(username, avatar_url)')
          .eq('community_id', communityId)
          .eq('is_published', true)
          .eq('is_removed', false)
          .order('published_at', { ascending: false })
          .limit(50),
        supabase
          .from('podcasts')
          .select('id, title, description, cover_image_url, like_count, duration_seconds, created_at, members:members!podcasts_published_by_fkey(username, avatar_url)')
          .eq('community_id', communityId)
          .eq('is_published', true)
          .or('is_removed.eq.false,is_removed.is.null')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      const mapped: ContentItem[] = [];

      for (const a of (articles ?? []) as { id: number; title: string; slug: string; excerpt: string | null; cover_image_url: string | null; like_count: number; view_count: number; published_at: string; members: { username: string; avatar_url: string | null } | null }[]) {
        mapped.push({
          type: 'article',
          id: a.id,
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt,
          coverImageUrl: a.cover_image_url,
          likeCount: a.like_count,
          viewCount: a.view_count,
          publishedAt: a.published_at,
          authorName: a.members?.username ?? 'Inconnu',
          authorAvatarUrl: a.members?.avatar_url ?? null,
        });
      }

      for (const p of (podcasts ?? []) as { id: number; title: string; description: string | null; cover_image_url: string | null; like_count: number; duration_seconds: number | null; created_at: string; members: { username: string; avatar_url: string | null } | null }[]) {
        mapped.push({
          type: 'podcast',
          id: p.id,
          title: p.title,
          description: p.description,
          coverImageUrl: p.cover_image_url,
          likeCount: p.like_count,
          durationSeconds: p.duration_seconds,
          publishedAt: p.created_at,
          authorName: p.members?.username ?? 'Inconnu',
          authorAvatarUrl: p.members?.avatar_url ?? null,
        });
      }

      mapped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      setItems(mapped);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [supabase, communityId]);

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === (filter === 'articles' ? 'article' : 'podcast'));

  return (
    <div className="flex h-full flex-col">
      {/* Filter tabs */}
      <div className="flex shrink-0 gap-1 border-b border-gray-200 px-4 py-2">
        {(['all', 'articles', 'podcasts'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f
                ? 'bg-brand-blue text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            {f === 'all' ? 'Tout' : f === 'articles' ? 'Articles' : 'Podcasts'}
          </button>
        ))}
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-sm">Aucun contenu publié</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={
                  item.type === 'article'
                    ? `/tribunes/${communitySlug}/articles/${item.slug}`
                    : `/tribunes/${communitySlug}/podcasts/${item.id}`
                }
                className="flex gap-3 px-4 py-3 transition hover:bg-gray-50"
              >
                {/* Thumbnail */}
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt={item.title}
                    width={80}
                    height={56}
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className={`flex h-14 w-20 shrink-0 items-center justify-center rounded-lg ${
                    item.type === 'article' ? 'bg-purple-100' : 'bg-gray-900'
                  }`}>
                    {item.type === 'article' ? (
                      <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      item.type === 'article'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-900 text-gray-300'
                    }`}>
                      {item.type === 'article' ? 'Article' : 'Podcast'}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatTime(item.publishedAt)}</span>
                    {item.durationSeconds && (
                      <span className="text-[10px] text-gray-400">{formatDuration(item.durationSeconds)}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Avatar url={item.authorAvatarUrl} name={item.authorName} size="xs" />
                    <span className="text-xs text-gray-500">{item.authorName}</span>
                    {item.likeCount > 0 && (
                      <span className="text-xs text-gray-400">{item.likeCount} ♥</span>
                    )}
                    {item.viewCount && item.viewCount > 0 && (
                      <span className="text-xs text-gray-400">{item.viewCount} vues</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
