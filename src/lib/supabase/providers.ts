import "server-only";

/**
 * Which third-party sign-in providers this Supabase project actually accepts.
 *
 * Rendering a "Continue with Google" button on a project where Google is not
 * enabled is worse than not offering it: `signInWithOAuth` builds the redirect
 * URL locally and returns no error, so the server action's failure branch
 * never fires. The browser follows the redirect and Supabase answers
 *
 *   400 {"error_code":"validation_failed",
 *        "msg":"Unsupported provider: provider is not enabled"}
 *
 * which the user meets as raw JSON on a Supabase domain, having simply tried
 * to sign in. The billing page already takes this position with
 * `isRailConfigured()` — do not offer a path that is known to fail.
 *
 * The answer changes only when someone edits the Supabase dashboard, so it is
 * cached for an hour rather than fetched per render. A failed lookup reports
 * "not enabled": hiding a working button is a smaller harm than showing a
 * broken one.
 */
export async function enabledOAuthProviders(): Promise<Set<string>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return new Set();

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return new Set();

    const settings = (await res.json()) as { external?: Record<string, boolean> };

    return new Set(
      Object.entries(settings.external ?? {})
        .filter(([, enabled]) => enabled)
        .map(([name]) => name),
    );
  } catch {
    return new Set();
  }
}

export async function isGoogleEnabled(): Promise<boolean> {
  return (await enabledOAuthProviders()).has("google");
}
