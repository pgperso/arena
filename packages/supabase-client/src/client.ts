import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createArenaClient(supabaseUrl: string, supabaseKey: string) {
  return createClient<Database>(supabaseUrl, supabaseKey);
}

export type ArenaClient = ReturnType<typeof createArenaClient>;
