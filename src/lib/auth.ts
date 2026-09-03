import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user, or a redirect to login. Middleware already guards these
 * routes, but pages call this too: it hands back the user id every query needs,
 * and it means a page is never one middleware-matcher edit away from rendering
 * someone else's data.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export type Profile = typeof profiles.$inferSelect;

/**
 * The signed-in user together with their profile. Anyone who hasn't finished
 * onboarding is sent there first — the rest of the app assumes a country, and
 * without one it cannot pick a currency, a template region or a number series.
 */
export async function requireProfile(): Promise<{
  userId: string;
  email: string | undefined;
  profile: Profile;
}> {
  const user = await requireUser();

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  if (!profile || !profile.country) {
    redirect("/onboarding");
  }

  return { userId: user.id, email: user.email, profile };
}
