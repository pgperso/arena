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

  return {
    title: (community as { name: string }).name,
    description: (community as { description: string | null }).description,
  };
}

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Load community
  const { data } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  const community = data as CommunityRow | null;
  if (!community) notFound();

  // Check if current user is a member
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isMember = false;
  let canModerate = false;
  let isMuted = false;

  if (user) {
    // Check membership
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('member_id', user.id)
      .single();

    isMember = !!membership;

    // Check moderation permissions
    const { data: roles } = await supabase
      .from('community_member_roles')
      .select('role_id, roles(code)')
      .eq('community_id', community.id)
      .eq('member_id', user.id);

    if (roles) {
      canModerate = (roles as { roles: { code: string } | null }[]).some(
        (r) => r.roles?.code === 'admin' || r.roles?.code === 'moderator',
      );
    }

    // Check mute restriction
    const { data: restrictions } = await supabase
      .from('member_restrictions')
      .select('id')
      .eq('community_id', community.id)
      .eq('member_id', user.id)
      .eq('restriction_type', 'chat:mute')
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`);

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
