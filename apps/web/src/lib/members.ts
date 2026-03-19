import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

type MemberRow = Database['public']['Tables']['members']['Row'];
type MemberPick = Pick<MemberRow, 'id' | 'username' | 'avatar_url'>;

export async function fetchMemberProfile(
  supabase: SupabaseClient<Database>,
  memberId: string,
): Promise<MemberPick | null> {
  const { data } = await supabase
    .from('members')
    .select('id, username, avatar_url')
    .eq('id', memberId)
    .single();
  return data as MemberPick | null;
}
