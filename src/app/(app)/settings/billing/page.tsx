import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { getUsage, getUserPlan, limitsFor } from "@/lib/billing/plans";
import { activeSubscriptionFor } from "@/lib/billing/entitlement";
import { railForCountry } from "@/lib/billing/types";
import { isRailConfigured } from "@/lib/billing/pricing";
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
  const rail = railForCountry(profile.country);
  // Read on the server: the plan ids are not public, so whether a rail can
  // take money is something only the server can answer.
  const railAvailable = isRailConfigured(rail);

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href="/settings"
        className="text-muted-foreground hover:text-foreground -my-2 mb-2 inline-flex min-h-11 items-center gap-1 text-sm"
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

      {params.cancel === "failed" ? (
        <p role="alert" className="bg-muted mt-4 rounded-lg p-3 text-sm">
          We couldn&apos;t cancel that just now. Nothing has changed and you
          have not been charged again — try once more, or email us and
          we&apos;ll do it from our side.
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
          <CardTitle>Your usage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Projects are a standing total, documents reset monthly. Filing
              both under "This month" said something untrue about projects. */}
          <Usage
            label="Projects"
            period="in total"
            used={usage.projects}
            limit={limits.maxProjects}
          />
          <Usage
            label="Documents"
            period="this month"
            used={usage.documentsThisMonth}
            limit={limits.maxDocumentsPerMonth}
          />
        </CardContent>
      </Card>

      {plan === "free" ? (
        <div className="mt-6">
          {/* An Upgrade button that throws is worse than no button. When the
              rail has no plans configured — international, before Razorpay's
              International Payments is switched on — the honest answer is
              that paid plans have not reached that region yet. */}
          {railAvailable ? (
            <PlanPicker rail={rail} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pro isn&apos;t available here yet</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                We can&apos;t take payments in your region yet. Everything on
                the free plan keeps working, and nothing you&apos;ve created is
                affected.
              </CardContent>
            </Card>
          )}
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
  period,
  used,
  limit,
}: {
  label: string;
  period: string;
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
          {/* Clamped: a cap can be lowered under an existing account — Free
              went from 5 documents to 3 — and "4 of 3" reads as a bug. */}
          {Math.min(used, limit)} of {limit}
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
          You&apos;ve used all {limit} {label.toLowerCase()} {period}.
        </p>
      ) : null}
    </div>
  );
}
