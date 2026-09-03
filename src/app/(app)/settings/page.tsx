import type { Metadata } from "next";
import Link from "next/link";

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
import { Button } from "@/components/ui/button";
import { DeleteAccountButton } from "./delete-account-button";

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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>
            What you can create, and how to change it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/settings/billing">Manage plan</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Everything you have created, as JSON — full document contents, not a
            summary. A product holding your invoices should never be the reason
            you cannot leave it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* A plain link rather than a fetch: the route sets a
              content-disposition header and the browser handles the download,
              which also works when JavaScript has not loaded. */}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href="/api/export" download>
              Export my data
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-10">
        <DeleteAccountButton />
      </div>
    </div>
  );
}
