import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { MAX_COMMUNITIES_PER_USER } from '@arena/shared';

export async function joinCommunity(
  supabase: SupabaseClient<Database>,
  communityId: number,
  memberId: string,
) {
  const { count } = await supabase
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId);

  if (count !== null && count >= MAX_COMMUNITIES_PER_USER) {
    return { data: null, error: { message: `Vous ne pouvez pas rejoindre plus de ${MAX_COMMUNITIES_PER_USER} tribunes.` } };
  }

  return supabase.from('community_members').insert({
    community_id: communityId,
    member_id: memberId,
  });
}

export async function leaveCommunity(
  supabase: SupabaseClient<Database>,
  communityId: number,
  memberId: string,
) {
  return supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('member_id', memberId);
}
