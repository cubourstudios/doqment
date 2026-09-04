import { createClient } from "@supabase/supabase-js";

/**
 * Private file storage.
 *
 * Both buckets are private. Nothing here is ever served from a public URL: a
 * user's uploads are their existing contracts and their logo, and a guessable
 * public link to someone's signed NDA would be a serious breach. Every read
 * goes through a short-lived signed URL instead.
 *
 * Paths always begin with the owner's user id, because the storage RLS policy
 * in drizzle/manual/0003_storage.sql matches on that first segment. Code that
 * writes elsewhere in the bucket is rejected by the database, not by
 * convention.
 */

export const SIGNED_URL_TTL_SECONDS = 3600;

export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Service-role Supabase client, for storage operations only.
 *
 * The service role bypasses RLS, so every caller must have already established
 * that the user owns what they are touching. It is used here because signing a
 * URL requires privileges the anon key does not have.
 */
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase storage needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Build a storage path for a user's file.
 *
 * The original filename is not used as the key. A user-supplied name can
 * collide, can contain path separators, and can be long enough to break the
 * key limit; it is kept in the database column instead, where it is only ever
 * data.
 */
export function buildStoragePath(userId: string, fileName: string): string {
  const extension = fileName.includes(".")
    ? `.${fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    : "";

  return `${userId}/${crypto.randomUUID()}${extension}`;
}

export async function uploadFile(
  bucket: "logos" | "uploads",
  path: string,
  file: File,
): Promise<{ error: string | null }> {
  const { error } = await serviceClient()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  return { error: error?.message ?? null };
}

export async function createSignedUrl(
  bucket: "logos" | "uploads",
  path: string,
): Promise<string | null> {
  const { data, error } = await serviceClient()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  return error ? null : (data?.signedUrl ?? null);
}

export async function deleteFile(
  bucket: "logos" | "uploads",
  path: string,
): Promise<void> {
  await serviceClient().storage.from(bucket).remove([path]);
}

/** Human-readable size, for the file list. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
