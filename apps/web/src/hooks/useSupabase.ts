'use client';

import { useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSupabase() {
  const ref = useRef(createClient());
  return ref.current;
}
