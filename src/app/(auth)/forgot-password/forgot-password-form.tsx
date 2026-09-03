"use client";

import { useActionState } from "react";
import { MailCheckIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  requestPasswordReset,
  type AuthActionState,
} from "@/app/(auth)/actions";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.emailSent) {
    return (
      <div className="grid gap-3 text-center">
        <MailCheckIcon className="text-muted-foreground mx-auto size-8" />
        <p className="font-medium">Check your email</p>
        {/* Deliberately non-committal about whether the address exists — the
            same wording either way keeps this from confirming who has an
            account. */}
        <p className="text-muted-foreground text-sm">
          If that address has an account, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
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

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  );
}
