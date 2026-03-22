import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { MAX_COMMUNITIES_PER_USER } from '@arena/shared';

const BOT_MEMBER_ID = '00000000-0000-0000-0000-000000000001';

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

  const result = await supabase.from('community_members').insert({
    community_id: communityId,
    member_id: memberId,
  });

  // Send bot announcement (fire-and-forget)
  if (!result.error) {
    // Get username and community name for the announcement
    const [{ data: member }, { data: community }] = await Promise.all([
      supabase.from('members').select('username').eq('id', memberId).single(),
      supabase.from('communities').select('name').eq('id', communityId).single(),
    ]);

    if (member && community) {
      const username = (member as { username: string }).username;
      const communityName = (community as { name: string }).name;

      supabase.from('chat_messages').insert({
        community_id: communityId,
        member_id: BOT_MEMBER_ID,
        content: `🏟️ ${username} a rejoint ${communityName} !`,
      });
    }
  }

  return result;
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
