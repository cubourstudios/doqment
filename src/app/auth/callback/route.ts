import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Lands both OAuth returns and email-confirmation links.
 *
 * After exchanging the code for a session, decide where the user actually
 * belongs: someone whose profile has no country has not finished onboarding,
 * and sending them to the dashboard would show them an app that cannot format
 * their currency or number their invoices.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link is invalid or has expired.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link is invalid or has expired.")}`,
    );
  }

  // An explicit, in-app destination wins — this is how the password-reset flow
  // routes to /reset-password. Reject absolute URLs so the parameter cannot be
  // used as an open redirect.
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("country")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    profile?.country ? `${origin}/dashboard` : `${origin}/onboarding`,
  );
}
