"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/schemas/onboarding";
import { getCountryConfig } from "@/lib/regions";

export type OnboardingState = { error?: string };

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country"),
    profession: formData.get("profession") ?? "",
    businessName: formData.get("businessName") ?? "",
    businessType: formData.get("businessType") || undefined,
    taxId: formData.get("taxId") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { name, country, profession, businessName, businessType, taxId } =
    parsed.data;

  // Currency and tax-ID type are derived, never asked for: they follow from the
  // country, and asking twice invites contradictory answers.
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
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, user.id));

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
