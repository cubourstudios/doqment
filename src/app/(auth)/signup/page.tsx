import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthLink } from "@/app/(auth)/auth-link";
import { AuthDivider } from "@/app/(auth)/auth-divider";
import { isGoogleEnabled } from "@/lib/supabase/providers";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  const googleEnabled = await isGoogleEnabled();
  return (
    <Card className="gap-0 py-8">
      <CardHeader className="px-6 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <CardDescription className="text-base">
          Free to start. No card needed.
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-8 grid gap-6 px-6 sm:px-8">
        {/* Only offered when the project accepts it. signInWithOAuth builds
            its redirect locally and reports no error, so a disabled provider
            is not caught by the action — the browser follows the redirect and
            Supabase answers 400 "provider is not enabled" as raw JSON. */}
        {googleEnabled ? (
          <>
            <GoogleButton />
            <AuthDivider />
          </>
        ) : null}

        <AuthDivider />

        <SignupForm />

        <p className="text-muted-foreground text-center text-base">
          Already have an account?{" "}
          <AuthLink href="/login" className="text-foreground">
            Sign in
          </AuthLink>
        </p>
      </CardContent>

      {/* Outside the content well and on its own rule: consent is not another
          form field, and burying it in the same stack as the inputs is how it
          ends up genuinely unread. */}
      <div className="mt-8 border-t px-6 pt-6 sm:px-8">
        <p className="text-muted-foreground text-center text-base text-pretty">
          By creating an account you agree to our terms and privacy policy.
        </p>
        <div className="-mx-3 mt-1 flex flex-wrap items-center justify-center gap-2">
          <AuthLink href="/terms" className="text-foreground font-normal">
            Terms
          </AuthLink>
          <AuthLink href="/privacy" className="text-foreground font-normal">
            Privacy Policy
          </AuthLink>
        </div>
      </div>
    </Card>
  );
}
