"use client";

import { useActionState, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { SubmitButton } from "@/components/auth/submit-button";
import { startSubscription, type BillingState } from "./actions";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Starting a subscription.
 *
 * Stripe redirects to its hosted checkout, so that path needs nothing here.
 * Razorpay instead opens its own script over the page, which is why the ids
 * come back to the client and the checkout is launched from an effect.
 */
export function UpgradeButton({
  rail,
  interval,
}: {
  rail: "razorpay" | "stripe";
  interval: "month" | "year";
}) {
  const router = useRouter();
  // useActionState passes (prevState, formData); the action needs neither, so
  // it is wrapped rather than given unused parameters.
  const [state, formAction] = useActionState<BillingState, FormData>(
    () => startSubscription(interval),
    {},
  );

  useEffect(() => {
    if (!state.razorpay || !window.Razorpay) return;

    const checkout = new window.Razorpay({
      key: state.razorpay.keyId,
      subscription_id: state.razorpay.subscriptionId,
      name: "Doqment",
      description: "Pro subscription",
      /*
       * The handler only refreshes the page. Entitlement comes from the
       * webhook, never from here — this callback can be replayed or edited in
       * a console, and it never fires at all if someone closes the tab the
       * moment their payment succeeds.
       */
      handler: () => router.refresh(),
    });

    checkout.open();
  }, [state.razorpay, router]);

  return (
    <>
      {rail === "razorpay" ? (
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      ) : null}

      <form action={formAction}>
        <SubmitButton pendingLabel="Starting…" className="w-full">
          Upgrade to Pro
        </SubmitButton>
      </form>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </>
  );
}
