"use client";

import { useActionState } from "react";
import { MailCheckIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { signup, type AuthActionState } from "@/app/(auth)/actions";
import { AuthError } from "@/app/(auth)/auth-error";

export function SignupForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    signup,
    {},
  );

  // Email confirmation is on, so signup ends here rather than at the dashboard.
  // Say plainly what to do next; a silent success looks like a broken form.
  if (state.emailSent) {
    return (
      <div className="bg-muted/40 grid gap-3 rounded-lg border border-dashed px-6 py-8 text-center">
        <MailCheckIcon className="text-primary mx-auto size-8" />
        <p className="text-lg font-semibold tracking-tight">Check your email</p>
        <p className="text-muted-foreground text-base text-pretty">
          We&apos;ve sent you a confirmation link. Open it on this device and
          you&apos;ll be signed straight in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="name" className="min-h-11 text-base">
          Your name
        </Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          className="md:text-base"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" className="min-h-11 text-base">
          Email
        </Label>
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
        <Label htmlFor="password" className="min-h-11 text-base">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          aria-describedby="password-hint"
          className="md:text-base"
          required
        />
        <p id="password-hint" className="text-muted-foreground text-base">
          At least 8 characters.
        </p>
      </div>

      {state.error ? <AuthError>{state.error}</AuthError> : null}

      <SubmitButton pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
