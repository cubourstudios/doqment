import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile, email } = await requireProfile();
  const config = getCountryConfig(profile.country);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your business</CardTitle>
          <CardDescription>
            These details appear on every document you generate. Changing them
            doesn&apos;t alter documents you&apos;ve already created — those
            keep the details they were made with.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} email={email} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Region</CardTitle>
          <CardDescription>
            Derived from your country — it decides your invoice format and
            numbering.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">{profile.currency}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Invoice template</span>
            <span className="font-medium">{config.region}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Numbering resets</span>
            <span className="font-medium">
              {config.fiscalYearStartMonth === 1
                ? "1 January (calendar year)"
                : `Start of the financial year (month ${config.fiscalYearStartMonth})`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
