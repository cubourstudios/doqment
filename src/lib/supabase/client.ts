import { createBrowserClient } from "@supabase/ssr";

import { requireSupabaseConfig } from "./env";

/**
 * Supabase client for browser code. Uses the anon key, so every query it makes
 * is subject to RLS — which is exactly what we want for user-scoped reads.
 */
export function createClient() {
  const config = requireSupabaseConfig();

  return createBrowserClient(config.url, config.anonKey);
}
