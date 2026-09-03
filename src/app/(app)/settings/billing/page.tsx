import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { getUsage, getUserPlan, limitsFor } from "@/lib/billing/plans";
import { activeSubscriptionFor } from "@/lib/billing/entitlement";
import { providerForCountry } from "@/lib/billing/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { PlanPicker } from "./plan-picker";
import { CancelButton } from "./cancel-button";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage({
  searchParams,
}: PageProps<"/settings/billing">) {
  const { userId, profile } = await requireProfile();
  const params = await searchParams;

  const [plan, usage, subscription] = await Promise.all([
    getUserPlan(userId),
    getUsage(userId),
    activeSubscriptionFor(userId),
  ]);

  const limits = limitsFor(plan);
  const rail = providerForCountry(profile.country);

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/settings"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Settings
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <Badge variant={plan === "pro" ? "success" : "secondary"}>
          {plan === "pro" ? "Pro" : "Free"}
        </Badge>
      </div>

      {params.checkout === "success" ? (
        <p className="bg-muted mt-4 rounded-lg p-3 text-sm">
          Payment received. Your plan updates as soon as the payment provider
          confirms it — usually within a few seconds.
        </p>
      ) : null}

      {params.cancel === "scheduled" ? (
        <p className="bg-muted mt-4 rounded-lg p-3 text-sm">
          Your subscription will end when the current period does. Nothing
          changes until then.
        </p>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Usage
            label="Projects"
            used={usage.projects}
            limit={limits.maxProjects}
          />
          <Usage
            label="Documents"
            used={usage.documentsThisMonth}
            limit={limits.maxDocumentsPerMonth}
          />
        </CardContent>
      </Card>

      {plan === "free" ? (
        <div className="mt-6">
          <PlanPicker rail={rail} />
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            {subscription?.currentPeriodEnd ? (
              <p className="text-muted-foreground">
                Renews on{" "}
                {subscription.currentPeriodEnd.toLocaleDateString("en", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
            ) : null}
            <CancelButton />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Usage({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  if (limit === null) {
    return (
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{used} · unlimited</span>
      </div>
    );
  }

  const atLimit = used >= limit;

  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span
          className={
            atLimit
              ? "font-medium tabular-nums"
              : "text-muted-foreground tabular-nums"
          }
        >
          {used} of {limit}
        </span>
      </div>
      <Progress
        value={Math.min(100, (used / limit) * 100)}
        aria-label={`${used} of ${limit} ${label.toLowerCase()} used`}
      />
      {/* A full bar and a nearly-full bar look almost identical at a glance,
          so being blocked is stated in words rather than left to be inferred
          from a few pixels. */}
      {atLimit ? (
        <p className="text-muted-foreground text-xs">
          You&apos;ve used all of this month&apos;s {label.toLowerCase()}.
        </p>
      ) : null}
    </div>
  );
}
