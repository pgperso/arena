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

  if (!community) return { title: 'Tribune introuvable' };

  const name = (community as { name: string }).name;
  const description = (community as { description: string | null }).description;

  return {
    title: name,
    description,
    openGraph: {
      title: `${name} | La tribune des fans`,
      description: description ?? `Rejoignez la tribune ${name} sur La tribune des fans`,
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
      .select('id, name, slug, description, primary_color, logo_url, member_count, is_active, created_at')
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
    // Run membership, local roles, global owner check, restrictions in parallel
    const [{ data: membership }, { data: localRoles }, { data: globalOwner }, { data: restrictions }] = await Promise.all([
      supabase
        .from('community_members')
        .select('id')
        .eq('community_id', community.id)
        .eq('member_id', user.id)
        .single(),
      // Arbitre check — per tribune
      supabase
        .from('community_member_roles')
        .select('role_id, roles(code)')
        .eq('community_id', community.id)
        .eq('member_id', user.id),
      // Propriétaire check — any tribune (global)
      supabase
        .from('community_member_roles')
        .select('id, roles!inner(code)')
        .eq('member_id', user.id)
        .eq('roles.code', 'owner')
        .limit(1),
      supabase
        .from('member_restrictions')
        .select('id')
        .eq('community_id', community.id)
        .eq('member_id', user.id)
        .eq('restriction_type', 'chat:mute')
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`),
    ]);

    isMember = !!membership;

    const isOwner = ((globalOwner as unknown[] | null)?.length ?? 0) > 0;
    if (isOwner) {
      canModerate = true;
    } else if (localRoles) {
      canModerate = (localRoles as { roles: { code: string } | null }[]).some(
        (r) => r.roles?.code === 'admin' || r.roles?.code === 'moderator',
      );
    }

    isMuted = ((restrictions as { id: number }[] | null)?.length ?? 0) > 0;
  }

  // Load staff roles for rank display:
  // 1. Local arbitres (per tribune)
  // 2. Global owners (any tribune)
  const [{ data: localStaff }, { data: globalOwners }] = await Promise.all([
    supabase
      .from('community_member_roles')
      .select('member_id, roles(code)')
      .eq('community_id', community.id),
    supabase
      .from('community_member_roles')
      .select('member_id, roles!inner(code)')
      .eq('roles.code', 'owner'),
  ]);

  const modRoles = [
    ...(localStaff ?? []),
    ...(globalOwners ?? []),
  ] as { member_id: string; roles: { code: string } | null }[];

  const staffRoles: Record<string, string> = {};
  for (const r of (modRoles as { member_id: string; roles: { code: string } | null }[] ?? [])) {
    if (r.roles?.code) staffRoles[r.member_id] = r.roles.code;
  }

  return (
    <CommunityPageClient
      community={community}
      isMember={isMember}
      canModerate={canModerate}
      isMuted={isMuted}
      userId={user?.id ?? null}
      staffRoles={staffRoles}
    />
  );
}
