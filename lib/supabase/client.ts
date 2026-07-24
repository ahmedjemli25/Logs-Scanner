import { createClient } from '@supabase/supabase-js';

// Browser-side Supabase client (Vite public env vars).
let cached: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabase() {
  if (cached) return cached;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  cached = createClient(url, anonKey);
  return cached;
}
