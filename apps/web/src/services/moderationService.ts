import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

export async function findMemberByUsername(
  supabase: SupabaseClient<Database>,
  username: string,
) {
  return supabase
    .from('members')
    .select('id')
    .eq('username', username)
    .single();
}

export async function checkCommunityMembership(
  supabase: SupabaseClient<Database>,
  communityId: number,
  memberId: string,
) {
  return supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('member_id', memberId)
    .single();
}

export async function applyRestriction(
  supabase: SupabaseClient<Database>,
  data: {
    communityId: number;
    memberId: string;
    restrictionType: string;
    reason: string | null;
    endsAt: string | null;
  },
) {
  return supabase.from('member_restrictions').insert({
    community_id: data.communityId,
    member_id: data.memberId,
    restriction_type: data.restrictionType,
    reason: data.reason,
    ends_at: data.endsAt,
  });
}

export async function removeRestriction(
  supabase: SupabaseClient<Database>,
  restrictionId: number,
) {
  return supabase
    .from('member_restrictions')
    .delete()
    .eq('id', restrictionId);
}

export async function fetchRestrictions(
  supabase: SupabaseClient<Database>,
  communityId: number,
) {
  return supabase
    .from('member_restrictions')
    .select('*, members:members!member_restrictions_member_id_fkey(username)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });
}
