/**
 * Reading Supabase's public configuration.
 *
 * These two values were previously read with a `!` in four places. That
 * assertion is a promise to the compiler, not a check: when the variable is
 * genuinely absent the app does not fail here, it fails deep inside
 * `createServerClient` with "supabaseUrl is required" — or, in middleware,
 * takes down every route on the site including the static landing page, with
 * nothing in the response to say why.
 *
 * A misconfigured deployment is the single most likely production failure, so
 * it is worth naming precisely.
 */

export type SupabaseConfig = { url: string; anonKey: string };

/** The config, or null when it has not been set. Never throws. */
export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return url && anonKey ? { url, anonKey } : null;
}

/**
 * The config, or an error naming exactly what is missing.
 *
 * Used where the caller cannot continue without it. The message is written for
 * whoever is reading a deployment log at the time, which is why it says where
 * to set the variable rather than only that it is absent.
 */
export function requireSupabaseConfig(): SupabaseConfig {
  const config = readSupabaseConfig();
  if (config) return config;

  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  throw new Error(
    `Supabase is not configured: ${missing.join(" and ")} ${
      missing.length > 1 ? "are" : "is"
    } not set. ` +
      "Set them in your hosting provider's environment variables (for Vercel: " +
      "Settings → Environment Variables, then redeploy — they are read at " +
      "build time), or in .env.local for local development.",
  );
}
