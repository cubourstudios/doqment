"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { onboardingSchema } from "@/lib/schemas/onboarding";
import { getCountryConfig } from "@/lib/regions";

/**
 * `savedAt` rather than a `saved` boolean.
 *
 * useActionState hands back a fresh object each submit, but a boolean that is
 * already true is not a *change*, so a useEffect keyed on it never fires
 * again: the first save confirmed, every save after it wrote to the database
 * in silence and the form looked inert. A timestamp differs on every success.
 */
export type ProfileState = { error?: string; savedAt?: number };

/**
 * Settings reuses the onboarding schema: the fields are the same, and keeping
 * one schema means the two screens cannot drift into validating differently.
 */
export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country"),
    profession: formData.get("profession") ?? "",
    businessName: formData.get("businessName") ?? "",
    businessType: formData.get("businessType") || undefined,
    taxId: formData.get("taxId") ?? "",
    address: formData.get("address") ?? "",
    paymentDetails: formData.get("paymentDetails") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const {
    name,
    country,
    profession,
    businessName,
    businessType,
    taxId,
    address,
    paymentDetails,
  } =
    parsed.data;
  const config = getCountryConfig(country);

  await db
    .update(profiles)
    .set({
      name,
      country: config.code,
      currency: config.currency,
      profession: profession || null,
      businessName: businessName || null,
      businessType: businessType ?? null,
      taxId: taxId || null,
      taxIdType: taxId ? config.taxIdType : null,
      addressJson: address ? { lines: address.split("\n") } : null,
      paymentDetails: paymentDetails || null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, user.id));

  revalidatePath("/settings");
  revalidatePath("/", "layout");

  return { savedAt: Date.now() };
}
