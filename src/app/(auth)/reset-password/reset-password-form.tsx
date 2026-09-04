"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { resetPassword, type AuthActionState } from "@/app/(auth)/actions";
import { AuthError } from "@/app/(auth)/auth-error";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    resetPassword,
    {},
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="password" className="min-h-11 text-base">
          New password
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

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword" className="min-h-11 text-base">
          Confirm new password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="md:text-base"
          required
        />
      </div>

      {state.error ? <AuthError>{state.error}</AuthError> : null}

      <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  );
}
