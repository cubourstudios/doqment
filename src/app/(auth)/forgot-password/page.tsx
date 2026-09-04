import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { AuthLink } from "@/app/(auth)/auth-link";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="gap-0 py-8">
      <CardHeader className="px-6 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset your password
        </h1>
        <CardDescription className="text-base">
          We&apos;ll email you a link to set a new one.
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-8 grid gap-6 px-6 sm:px-8">
        <ForgotPasswordForm />

        <p className="text-center">
          <AuthLink href="/login" className="text-foreground">
            Back to sign in
          </AuthLink>
        </p>
      </CardContent>
    </Card>
  );
}
