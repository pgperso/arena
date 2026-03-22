import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { podcastSchema } from '@arena/shared';

export async function createPodcast(
  supabase: SupabaseClient<Database>,
  data: {
    communityId: number;
    publishedBy: string;
    title: string;
    description: string | null;
    audioUrl: string;
    coverImageUrl: string | null;
    durationSeconds: number | null;
    isPublished?: boolean;
  },
) {
  const validated = podcastSchema.parse({
    title: data.title,
    audioUrl: data.audioUrl,
    description: data.description,
    coverImageUrl: data.coverImageUrl,
    durationSeconds: data.durationSeconds,
  });

  return supabase.from('podcasts').insert({
    community_id: data.communityId,
    published_by: data.publishedBy,
    title: validated.title,
    description: validated.description ?? null,
    audio_url: validated.audioUrl,
    cover_image_url: validated.coverImageUrl ?? null,
    duration_seconds: validated.durationSeconds ?? null,
    is_published: data.isPublished ?? true,
  });
}

export async function updatePodcast(
  supabase: SupabaseClient<Database>,
  podcastId: number,
  data: {
    title: string;
    description: string | null;
    audioUrl: string;
    coverImageUrl: string | null;
    durationSeconds: number | null;
    isPublished?: boolean;
  },
) {
  const validated = podcastSchema.parse({
    title: data.title,
    audioUrl: data.audioUrl,
    description: data.description,
    coverImageUrl: data.coverImageUrl,
    durationSeconds: data.durationSeconds,
  });

  const update: Record<string, unknown> = {
    title: validated.title,
    description: validated.description ?? null,
    audio_url: validated.audioUrl,
    cover_image_url: validated.coverImageUrl ?? null,
    duration_seconds: validated.durationSeconds ?? null,
    updated_at: new Date().toISOString(),
  };

  if (data.isPublished !== undefined) {
    update.is_published = data.isPublished;
  }

  return supabase.from('podcasts').update(update).eq('id', podcastId);
}

export async function removePodcast(
  supabase: SupabaseClient<Database>,
  podcastId: number,
  userId: string,
) {
  // Fetch audio + cover URLs before deleting
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('audio_url, cover_image_url')
    .eq('id', podcastId)
    .single();

  // Hard delete the DB record
  const result = await supabase
    .from('podcasts')
    .delete()
    .eq('id', podcastId);

  // Clean up storage files (fire-and-forget, don't block on errors)
  if (podcast) {
    const audioPath = extractStoragePath(podcast.audio_url, 'podcast-audio');
    const coverPath = extractStoragePath(podcast.cover_image_url, 'article-covers');

    if (audioPath) {
      supabase.storage.from('podcast-audio').remove([audioPath]);
    }
    if (coverPath) {
      supabase.storage.from('article-covers').remove([coverPath]);
    }
  }

  return result;
}

/** Extract the storage path from a Supabase public URL */
function extractStoragePath(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

export async function fetchPodcastsByPublisher(
  supabase: SupabaseClient<Database>,
  publishedBy: string,
  communityId: number,
) {
  return supabase
    .from('podcasts')
    .select('id, title, description, audio_url, cover_image_url, duration_seconds, is_published, created_at, updated_at, like_count, is_removed')
    .eq('published_by', publishedBy)
    .eq('community_id', communityId)
    .or('is_removed.eq.false,is_removed.is.null')
    .order('created_at', { ascending: false })
    .limit(100);
}
