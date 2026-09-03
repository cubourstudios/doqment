import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("country, name")
    .eq("user_id", user.id)
    .maybeSingle();

  // Already onboarded — don't make anyone answer these twice.
  if (profile?.country) {
    redirect("/dashboard");
  }

  const defaultName =
    profile?.name ?? (user.user_metadata?.name as string | undefined) ?? "";

  return (
    <main className="safe-top safe-bottom mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Set up your account</CardTitle>
          <CardDescription>
            Six quick questions, once. They decide your currency, your invoice
            format and what your documents say about you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultName={defaultName} />
        </CardContent>
      </Card>
    </main>
  );
}
