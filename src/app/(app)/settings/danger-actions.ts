"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { uploads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

/**
 * Delete the account and everything in it.
 *
 * Every user-owned table cascades from auth.users, so removing the auth user
 * removes the data with it. Storage does not cascade, so the objects are
 * cleared first — otherwise a deleted user's contracts would sit in the bucket
 * indefinitely with nothing left pointing at them.
 */
export async function deleteAccount(formData: FormData) {
  const user = await requireUser();

  // Typing the word is a deliberate speed bump. This is irreversible and takes
  // every invoice with it.
  if (formData.get("confirm") !== "DELETE") {
    redirect("/settings?delete=confirm");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("account deletion needs SUPABASE_SERVICE_ROLE_KEY");
    redirect("/settings?delete=failed");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const files = await db
    .select({ filePath: uploads.filePath })
    .from(uploads)
    .where(eq(uploads.userId, user.id));

  if (files.length > 0) {
    await admin.storage.from("uploads").remove(files.map((f) => f.filePath));
  }

  // The logo lives under the same user-id prefix in its own bucket.
  const { data: logos } = await admin.storage.from("logos").list(user.id);
  if (logos?.length) {
    await admin.storage
      .from("logos")
      .remove(logos.map((file) => `${user.id}/${file.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("failed to delete account", error);
    redirect("/settings?delete=failed");
  }

  // Clear the session cookie too; the user row is gone but the browser does
  // not know that yet.
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();

  redirect("/?deleted=1");
}
