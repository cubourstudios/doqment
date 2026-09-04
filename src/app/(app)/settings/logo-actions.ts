"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  ALLOWED_LOGO_TYPES,
  buildStoragePath,
  deleteFile,
  uploadFile,
} from "@/lib/storage";

export type LogoState = { error?: string };

/** 2 MB. A logo on an A4 invoice is a few hundred pixels wide at most. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Upload a business logo.
 *
 * The column and the private `logos` bucket have existed since the schema was
 * written and nothing ever wrote to either, so every invoice went out
 * unbranded — which for a freelancer is the difference between a document that
 * looks like their business and one that looks like a form.
 *
 * The old file is removed after the new path is saved rather than before. If
 * that delete fails the profile still points at a valid logo and an orphan is
 * left in the bucket; the other order risks a profile pointing at a file that
 * no longer exists.
 */
export async function uploadLogo(
  _prevState: LogoState,
  formData: FormData,
): Promise<LogoState> {
  const user = await requireUser();
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return { error: "That image is larger than 2 MB." };
  }

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { error: "Upload a PNG, JPEG or WebP image." };
  }

  const [existing] = await db
    .select({ logoPath: profiles.logoPath })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  const path = buildStoragePath(user.id, file.name);
  const { error } = await uploadFile("logos", path, file);

  if (error) return { error: "The upload failed. Try again." };

  await db
    .update(profiles)
    .set({ logoPath: path, updatedAt: new Date() })
    .where(eq(profiles.userId, user.id));

  if (existing?.logoPath) await deleteFile("logos", existing.logoPath);

  revalidatePath("/settings");
  return {};
}

export async function removeLogo() {
  const user = await requireUser();

  const [existing] = await db
    .select({ logoPath: profiles.logoPath })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  await db
    .update(profiles)
    .set({ logoPath: null, updatedAt: new Date() })
    .where(eq(profiles.userId, user.id));

  if (existing?.logoPath) await deleteFile("logos", existing.logoPath);

  revalidatePath("/settings");
}
