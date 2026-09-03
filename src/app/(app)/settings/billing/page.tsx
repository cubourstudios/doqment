import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon, ChevronLeftIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { getUsage, getUserPlan, limitsFor } from "@/lib/billing/plans";
import { activeSubscriptionFor } from "@/lib/billing/entitlement";
import { PRICING, providerForCountry } from "@/lib/billing/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { UpgradeButton } from "./upgrade-button";
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
  const price = PRICING[rail];

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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Pro — {price.amount}/{price.period}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ul className="grid gap-2 text-sm">
              {[
                "Unlimited projects and documents",
                "No watermark on generated PDFs",
                "25 MB file uploads",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <CheckIcon className="size-4 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <UpgradeButton rail={rail} />

            <p className="text-muted-foreground text-xs">
              {rail === "razorpay"
                ? "Billed in rupees through Razorpay. Cancel any time."
                : "Billed in US dollars through Stripe. Cancel any time."}
            </p>
          </CardContent>
        </Card>
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

  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used} of {limit}
        </span>
      </div>
      <Progress
        value={Math.min(100, (used / limit) * 100)}
        aria-label={`${used} of ${limit} ${label.toLowerCase()} used`}
      />
    </div>
  );
}
