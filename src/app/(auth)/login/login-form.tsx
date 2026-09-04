"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { login, type AuthActionState } from "@/app/(auth)/actions";
import { AuthError } from "@/app/(auth)/auth-error";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthActionState, FormData>(login, {});

  return (
    <form action={formAction} className="grid gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="grid gap-2">
        {/* min-h-11 on every label, not just the one that shares its row with
            "Forgot?": it makes the label itself a full-size target (tapping it
            focuses the field) and keeps all the fields on one rhythm instead
            of one row being taller than the rest. */}
        <Label htmlFor="email" className="min-h-11 text-base">
          Email
        </Label>
        {/* md:text-base overrides the shared Input's md:text-sm: 14px inputs
            are below this app's floor at every breakpoint, not just on the
            phone where iOS would zoom. */}
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          className="md:text-base"
          required
        />
      </div>

      <div className="grid gap-2">
        {/* The row is 44px tall in its own right, so "Forgot?" gets a full-size
            target without a negative margin bleeding it into the field below. */}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <Label htmlFor="password" className="min-h-11 text-base">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mr-3 inline-flex min-h-11 items-center rounded-md px-3 text-base underline-offset-4 transition-colors hover:underline focus-visible:ring-[3px] focus-visible:outline-none"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="md:text-base"
          required
        />
      </div>

      {state.error ? <AuthError>{state.error}</AuthError> : null}

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
