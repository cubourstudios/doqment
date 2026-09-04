import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { readSupabaseConfig } from "@/lib/supabase/env";

/** Prefixes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/clients",
  "/documents",
  "/settings",
  "/onboarding",
  // Gated like any signed-in page. The page itself relaxes this when Supabase
  // is unconfigured, because then no session can exist to check.
  "/setup",
];

/** Auth pages a signed-in user has no business seeing. */
const AUTH_ROUTES = ["/login", "/signup"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  /*
   * An unconfigured deployment degrades rather than dies.
   *
   * This runs on every request, so throwing here returns Internal Server Error
   * for the entire site — the marketing pages, the login screen, everything —
   * with nothing in the response to say why. That is the worst possible
   * failure for the most likely production mistake.
   *
   * Passing the request through instead is safe: middleware is a convenience
   * layer, not the gate. Every protected page calls `requireUser()` itself,
   * which redirects to /login without a session, so nothing private renders
   * because this returned early.
   */
  const config = readSupabaseConfig();

  if (!config) {
    console.error(
      "Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and/or " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. Sessions cannot be " +
        "refreshed and signing in will fail. Set them in your hosting " +
        "provider's environment variables and redeploy.",
    );
    return response;
  }

  const supabase = createServerClient(
    config.url,
    config.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must be getUser(), not getSession(): getUser revalidates the token with
  // Supabase, and it is also what refreshes an expiring session. Calling it on
  // every request is what makes sessions survive a browser restart.
  //
  // (This file is Next 16's `proxy` convention — the former `middleware.ts`.)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so login can return them there.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and images.
     *
     * Webhook routes are excluded too: payment providers call them without a
     * session, and running auth middleware there would break signature
     * verification by consuming the request.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
