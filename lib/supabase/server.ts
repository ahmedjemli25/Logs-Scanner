import { createClient } from '@supabase/supabase-js';

// Supabase helper retained for local app usage.
// Uses Vite public env vars for the SPA and falls back to a service key if available.
export function createServerSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || (!anonKey && !serviceKey)) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient(url, (serviceKey ?? anonKey) as string, {
    auth: { persistSession: false },
  });
}
