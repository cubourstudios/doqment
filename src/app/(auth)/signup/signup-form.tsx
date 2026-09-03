"use client";

import { useActionState } from "react";
import { MailCheckIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { signup, type AuthActionState } from "@/app/(auth)/actions";

export function SignupForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    signup,
    {},
  );

  // Email confirmation is on, so signup ends here rather than at the dashboard.
  // Say plainly what to do next; a silent success looks like a broken form.
  if (state.emailSent) {
    return (
      <div className="grid gap-3 text-center">
        <MailCheckIcon className="text-muted-foreground mx-auto size-8" />
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground text-sm">
          We&apos;ve sent you a confirmation link. Open it on this device and
          you&apos;ll be signed straight in.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-muted-foreground text-sm">At least 8 characters.</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
