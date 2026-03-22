import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { podcastSchema } from '@arena/shared';

interface PodcastData {
  communityId: number;
  publishedBy: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  coverImageUrl: string | null;
  durationSeconds: number | null;
  youtubeVideoId?: string | null;
  isLive?: boolean;
  isPublished?: boolean;
}

export async function createPodcast(
  supabase: SupabaseClient<Database>,
  data: PodcastData,
) {
  const validated = podcastSchema.parse({
    title: data.title,
    audioUrl: data.audioUrl,
    description: data.description,
    coverImageUrl: data.coverImageUrl,
    durationSeconds: data.durationSeconds,
    youtubeVideoId: data.youtubeVideoId,
    isLive: data.isLive,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- youtube_video_id/is_live require migration 00026
  return (supabase.from('podcasts') as any).insert({
    community_id: data.communityId,
    published_by: data.publishedBy,
    title: validated.title,
    description: validated.description ?? null,
    audio_url: validated.audioUrl ?? '',
    cover_image_url: validated.coverImageUrl ?? null,
    duration_seconds: validated.durationSeconds ?? null,
    is_published: data.isPublished ?? true,
    youtube_video_id: validated.youtubeVideoId ?? null,
    is_live: validated.isLive ?? false,
  });
}

export async function updatePodcast(
  supabase: SupabaseClient<Database>,
  podcastId: number,
  data: Omit<PodcastData, 'communityId' | 'publishedBy'>,
) {
  const validated = podcastSchema.parse({
    title: data.title,
    audioUrl: data.audioUrl,
    description: data.description,
    coverImageUrl: data.coverImageUrl,
    durationSeconds: data.durationSeconds,
    youtubeVideoId: data.youtubeVideoId,
    isLive: data.isLive,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- youtube_video_id/is_live require migration 00026
  return (supabase.from('podcasts') as any).update({
    title: validated.title,
    description: validated.description ?? null,
    audio_url: validated.audioUrl ?? '',
    cover_image_url: validated.coverImageUrl ?? null,
    duration_seconds: validated.durationSeconds ?? null,
    is_published: data.isPublished ?? true,
    youtube_video_id: validated.youtubeVideoId ?? null,
    is_live: validated.isLive ?? false,
    updated_at: new Date().toISOString(),
  }).eq('id', podcastId);
}

export async function removePodcast(
  supabase: SupabaseClient<Database>,
  podcastId: number,
  userId: string,
) {
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('audio_url, cover_image_url')
    .eq('id', podcastId)
    .single();

  const result = await supabase
    .from('podcasts')
    .delete()
    .eq('id', podcastId);

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
    .select('id, title, description, audio_url, cover_image_url, duration_seconds, youtube_video_id, is_live, is_published, created_at, updated_at, like_count, is_removed')
    .eq('published_by', publishedBy)
    .eq('community_id', communityId)
    .or('is_removed.eq.false,is_removed.is.null')
    .order('created_at', { ascending: false })
    .limit(100);
}
