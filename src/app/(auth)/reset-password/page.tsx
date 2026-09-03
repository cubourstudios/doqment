import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <Card className="gap-0 py-8">
      <CardHeader className="px-6 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <CardDescription className="text-base">
          You&apos;ll be signed in once it&apos;s saved.
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-8 px-6 sm:px-8">
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
