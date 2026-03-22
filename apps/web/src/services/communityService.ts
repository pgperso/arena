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

  // Bot announcement in ALL active tribunes (fire-and-forget)
  if (!result.error) {
    const [{ data: member }, { data: community }, { data: allCommunities }] = await Promise.all([
      supabase.from('members').select('username').eq('id', memberId).single(),
      supabase.from('communities').select('name').eq('id', communityId).single(),
      supabase.from('communities').select('id').eq('is_active', true),
    ]);

    if (member && community && allCommunities) {
      const username = (member as { username: string }).username;
      const communityName = (community as { name: string }).name;
      const message = `🏟️ ${username} a rejoint ${communityName} !`;

      // Insert one message per active tribune
      const messages = (allCommunities as { id: number }[]).map((c) => ({
        community_id: c.id,
        member_id: BOT_MEMBER_ID,
        content: message,
      }));

      supabase.from('chat_messages').insert(messages);
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
