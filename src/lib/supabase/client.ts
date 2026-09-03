import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for browser code. Uses the anon key, so every query it makes
 * is subject to RLS — which is exactly what we want for user-scoped reads.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
