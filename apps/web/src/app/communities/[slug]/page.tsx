import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CommunityPageClient } from './CommunityPageClient';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface CommunityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CommunityPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from('communities')
    .select('name, description')
    .eq('slug', slug)
    .single();

  if (!community) return { title: 'Communauté introuvable' };

  const name = (community as { name: string }).name;
  const description = (community as { description: string | null }).description;

  return {
    title: name,
    description,
    openGraph: {
      title: `${name} | Arena`,
      description: description ?? `Rejoignez la communauté ${name} sur Arena`,
      type: 'website',
    },
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Load community + user in parallel
  const [{ data }, { data: { user } }] = await Promise.all([
    supabase
      .from('communities')
      .select('id, name, slug, description, primary_color, secondary_color, logo_url, banner_url, member_count, is_active, created_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .single(),
    supabase.auth.getUser(),
  ]);

  const community = data as CommunityRow | null;
  if (!community) notFound();

  let isMember = false;
  let canModerate = false;
  let isMuted = false;

  if (user) {
    // Run membership, roles, restrictions checks in parallel
    const [{ data: membership }, { data: roles }, { data: restrictions }] = await Promise.all([
      supabase
        .from('community_members')
        .select('id')
        .eq('community_id', community.id)
        .eq('member_id', user.id)
        .single(),
      supabase
        .from('community_member_roles')
        .select('role_id, roles(code)')
        .eq('community_id', community.id)
        .eq('member_id', user.id),
      supabase
        .from('member_restrictions')
        .select('id')
        .eq('community_id', community.id)
        .eq('member_id', user.id)
        .eq('restriction_type', 'chat:mute')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`),
    ]);

    isMember = !!membership;

    if (roles) {
      canModerate = (roles as { roles: { code: string } | null }[]).some(
        (r) => r.roles?.code === 'admin' || r.roles?.code === 'moderator',
      );
    }

    isMuted = ((restrictions as { id: number }[] | null)?.length ?? 0) > 0;
  }

  return (
    <CommunityPageClient
      community={community}
      isMember={isMember}
      canModerate={canModerate}
      isMuted={isMuted}
      userId={user?.id ?? null}
    />
  );
}
