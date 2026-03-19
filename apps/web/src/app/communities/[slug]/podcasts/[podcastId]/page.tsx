import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PodcastPlayer } from '@/components/podcast/PodcastPlayer';

export const revalidate = 300;

interface PodcastPageProps {
  params: Promise<{ slug: string; podcastId: string }>;
}

export async function generateMetadata({ params }: PodcastPageProps) {
  const { podcastId } = await params;
  const id = parseInt(podcastId, 10);
  if (isNaN(id)) return { title: 'Podcast introuvable' };

  const supabase = await createClient();

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('title, description, audio_url')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!podcast) return { title: 'Podcast introuvable' };

  const title = (podcast as { title: string }).title;
  const description = (podcast as { description: string | null }).description;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | La tribune des fans`,
      description: description ?? title,
      type: 'music.song',
      audio: (podcast as { audio_url: string }).audio_url,
    },
  };
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { slug, podcastId } = await params;
  const id = parseInt(podcastId, 10);
  if (isNaN(id)) notFound();

  const supabase = await createClient();

  // Verify community exists
  const { data: communityData } = await supabase
    .from('communities')
    .select('id, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const community = communityData as { id: number; slug: string } | null;
  if (!community) notFound();

  // Load podcast
  const { data: podcastData } = await supabase
    .from('podcasts')
    .select('id, community_id, published_by, title, description, audio_url, cover_image_url, duration_seconds, like_count, is_published, is_removed, created_at')
    .eq('id', id)
    .eq('community_id', community.id)
    .eq('is_published', true)
    .single();

  if (!podcastData) notFound();

  const podcast = podcastData as {
    id: number;
    title: string;
    description: string | null;
    audio_url: string;
    cover_image_url: string | null;
    duration_seconds: number | null;
    like_count: number;
    created_at: string;
    published_by: string | null;
  };

  // Get publisher info
  let publisher: { username: string; avatar_url: string | null } | null = null;
  if (podcast.published_by) {
    const { data: memberData } = await supabase
      .from('members')
      .select('username, avatar_url')
      .eq('id', podcast.published_by)
      .single();
    publisher = memberData as { username: string; avatar_url: string | null } | null;
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <PodcastPlayer
        podcast={{ ...podcast, publisher }}
        communitySlug={slug}
        userId={user?.id ?? null}
      />
    </div>
  );
}
