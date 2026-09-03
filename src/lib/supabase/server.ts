import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for server components, server actions and route handlers.
 * Reads the session from Next's cookie store; still bound by RLS.
 *
 * `cookies()` is async from Next 15 onward, so this function is too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server components cannot set cookies. That is fine: middleware
            // refreshes the session on every request, so the write here is
            // redundant rather than lost.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS entirely — it is the admin key.
 *
 * Only ever call this from server-only code, and only for work a user cannot
 * do as themselves: deleting an account, writing webhook results, seeding
 * reference data. If a user could legitimately perform the operation, use the
 * request-scoped client above instead so RLS still applies.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
