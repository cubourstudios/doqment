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

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const googleEnabled = await isGoogleEnabled();
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <Card className="gap-0 py-8">
      {/* A real <h1>: CardTitle renders a div, which left these pages with no
          heading at all for anyone navigating by headings. */}
      <CardHeader className="px-6 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <CardDescription className="text-base">
          Sign in to your Doqment account.
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-8 grid gap-6 px-6 sm:px-8">
        {error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-base"
          >
            {error}
          </p>
        ) : null}

        {/* Only offered when the project accepts it. signInWithOAuth builds
            its redirect locally and reports no error, so a disabled provider
            is not caught by the action — the browser follows the redirect and
            Supabase answers 400 "provider is not enabled" as raw JSON. */}
        {googleEnabled ? (
          <>
            <GoogleButton next={next} />
            <AuthDivider />
          </>
        ) : null}

        <LoginForm next={next} />

        <p className="text-muted-foreground text-center text-base">
          New here?{" "}
          <AuthLink href="/signup" className="text-foreground">
            Create an account
          </AuthLink>
        </p>
      </CardContent>
    </Card>
  );
}
