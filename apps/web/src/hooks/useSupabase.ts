'use client';

import { useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSupabase() {
  return useRef(createClient()).current;
}
