import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 3600;

const BASE_URL = 'https://fanstribune.com';

function withAlternates(path: string) {
  return {
    url: `${BASE_URL}${path}`,
    alternates: {
      languages: {
        'fr-CA': `${BASE_URL}/fr${path}`,
        'en-CA': `${BASE_URL}/en${path}`,
        'x-default': `${BASE_URL}/fr${path}`,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const entries: MetadataRoute.Sitemap = [
    { ...withAlternates('/'), lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { ...withAlternates('/tribunes'), lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { ...withAlternates('/politique-confidentialite'), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { ...withAlternates('/galerie-de-presse'), lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.85 },
    { ...withAlternates('/a-propos'), lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { ...withAlternates('/conditions-utilisation'), lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { ...withAlternates('/contact'), lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
  ];

  // Communities
  const { data: communities } = await supabase
    .from('communities')
    .select('slug, updated_at')
    .eq('is_active', true)
    .limit(1000);

  if (communities) {
    for (const c of communities) {
      entries.push({
        ...withAlternates(`/tribunes/${c.slug}`),
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  }

  // Articles
  const { data: articles } = await supabase
    .from('articles')
    .select('slug, community_id, updated_at, communities!inner(slug)')
    .eq('is_published', true)
    .eq('is_removed', false)
    .limit(5000);

  if (articles) {
    for (const a of articles as (typeof articles)[number][]) {
      const communitySlug = (a as Record<string, unknown>).communities as { slug: string } | null;
      if (communitySlug) {
        entries.push({
          ...withAlternates(`/tribunes/${communitySlug.slug}/articles/${a.slug}`),
          lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  }

  // Podcasts
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('id, updated_at, communities!inner(slug)')
    .eq('is_published', true)
    .limit(5000);

  if (podcasts) {
    for (const p of podcasts as (typeof podcasts)[number][]) {
      const communitySlug = (p as Record<string, unknown>).communities as { slug: string } | null;
      if (communitySlug) {
        entries.push({
          ...withAlternates(`/tribunes/${communitySlug.slug}/podcasts/${p.id}`),
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
