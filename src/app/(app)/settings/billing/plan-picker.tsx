"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING, PRO_FEATURES, type BillingInterval } from "@/lib/billing/pricing";

import { UpgradeButton } from "./upgrade-button";

/**
 * Choosing a plan.
 *
 * Annual is preselected. That is deliberate rather than sneaky: the saving is
 * stated on the control itself and monthly is one tap away, so the default
 * simply reflects the option most people would pick once they have done the
 * arithmetic — and doing that arithmetic for them is the point.
 */
export function PlanPicker({ rail }: { rail: "razorpay" | "stripe" }) {
  const [interval, setInterval] = useState<BillingInterval>("year");

  const pricing = PRICING[rail];
  const selected = interval === "year" ? pricing.annual : pricing.monthly;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-2">
          <span>Pro</span>
          <span className="text-2xl font-semibold tabular-nums">
            {selected.amount}
          </span>
          <span className="text-muted-foreground text-sm font-normal">
            per {selected.interval}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* A segmented control rather than a toggle switch: two named options
            with different prices are a choice between things, not an on/off. */}
        <div
          role="radiogroup"
          aria-label="Billing period"
          className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1"
        >
          {(["month", "year"] as const).map((option) => {
            const price = option === "year" ? pricing.annual : pricing.monthly;
            const isSelected = interval === option;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setInterval(option)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isSelected
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-medium">
                  {option === "year" ? "Yearly" : "Monthly"}
                </span>
                {price.saving ? (
                  <span className="text-muted-foreground text-xs">
                    {price.saving}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {selected.comparedTo ? (
          <p className="text-muted-foreground text-sm">
            {selected.amount} billed yearly, instead of {selected.comparedTo}{" "}
            month by month.
          </p>
        ) : null}

        <ul className="grid gap-2 text-sm">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <UpgradeButton rail={rail} interval={interval} />

        <p className="text-muted-foreground text-xs">
          {rail === "razorpay"
            ? "Billed in rupees through Razorpay. Cancel any time — you keep Pro until the period you have paid for ends."
            : "Billed in US dollars through Stripe. Cancel any time — you keep Pro until the period you have paid for ends."}
        </p>
      </CardContent>
    </Card>
  );
}

/** Shown beside the heading so the current plan is never in doubt. */
export function PlanBadge({ plan }: { plan: "free" | "pro" }) {
  return (
    <Badge variant={plan === "pro" ? "success" : "secondary"}>
      {plan === "pro" ? "Pro" : "Free"}
    </Badge>
  );
}

