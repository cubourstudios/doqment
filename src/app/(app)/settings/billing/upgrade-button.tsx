"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { SubmitButton } from "@/components/auth/submit-button";
import { confirmCheckout, startSubscription, type BillingState } from "./actions";

/** The slice of Razorpay's checkout API this component uses. */
type RazorpayCheckout = {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

/**
 * What happened after the modal closed. `null` means it has not been opened,
 * which is not the same as "nothing happened" and must not look the same.
 */
type Outcome =
  | { kind: "paid" }
  | { kind: "unverified" }
  | { kind: "dismissed" }
  | { kind: "failed"; message: string };

/** Razorpay's failure payload, read defensively — it is not ours to guarantee. */
function failureMessage(response: unknown): string {
  const description = (response as { error?: { description?: unknown } })?.error
    ?.description;

  return typeof description === "string" && description.trim()
    ? description
    : "Your bank declined the payment.";
}

/**
 * Starting a subscription.
 *
 * Razorpay opens its own script over the page rather than redirecting to a
 * hosted page, which is why the subscription id comes back to the client and
 * the checkout is launched from an effect.
 */
export function UpgradeButton({ interval }: { interval: "month" | "year" }) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // useActionState passes (prevState, formData); the action needs neither, so
  // it is wrapped rather than given unused parameters.
  const [state, formAction] = useActionState<BillingState, FormData>(
    () => startSubscription(interval),
    {},
  );

  const onSuccess = useCallback(
    async (response: unknown) => {
      const payload = response as Record<string, unknown>;
      const paymentId = payload?.razorpay_payment_id;
      const subscriptionId = payload?.razorpay_subscription_id;
      const signature = payload?.razorpay_signature;

      /*
       * Verified server-side, but the plan is still granted by the webhook and
       * nothing here. This callback is running in a browser the user controls;
       * trusting it for entitlement would hand Pro to anyone with a console.
       * All the check decides is whether we can honestly say "payment
       * received" or have to say "we are checking".
       */
      const verified =
        typeof paymentId === "string" &&
        typeof subscriptionId === "string" &&
        typeof signature === "string"
          ? (await confirmCheckout({ paymentId, subscriptionId, signature }))
              .verified
          : false;

      setOutcome({ kind: verified ? "paid" : "unverified" });

      // Refresh either way: if the webhook has already landed, the page below
      // is showing a stale free plan.
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!state.razorpay || !window.Razorpay) return;

    const checkout = new window.Razorpay({
      key: state.razorpay.keyId,
      subscription_id: state.razorpay.subscriptionId,
      name: "Doqment",
      description: "Pro subscription",
      handler: onSuccess,
      // Closing the modal is a normal thing to do and used to leave the page
      // completely silent, which reads as the button being broken.
      modal: { ondismiss: () => setOutcome({ kind: "dismissed" }) },
    });

    checkout.on("payment.failed", (response) =>
      setOutcome({ kind: "failed", message: failureMessage(response) }),
    );

    checkout.open();
  }, [state.razorpay, onSuccess]);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

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

      <CheckoutOutcome outcome={outcome} />
    </>
  );
}

function CheckoutOutcome({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) return null;

  if (outcome.kind === "paid") {
    return (
      <p className="text-muted-foreground text-sm">
        Payment received. Pro switches on as soon as Razorpay confirms it —
        usually within a few seconds.
      </p>
    );
  }

  if (outcome.kind === "unverified") {
    // Something came back that we could not verify. Saying "paid" here would
    // be a guess, and saying "failed" would be worse if the money did move.
    return (
      <p role="alert" className="text-sm">
        We couldn&apos;t confirm that payment from here. If it left your
        account, Pro will switch on shortly — nothing needs doing. If it
        doesn&apos;t within a few minutes, get in touch and we&apos;ll sort it.
      </p>
    );
  }

  if (outcome.kind === "dismissed") {
    return (
      <p className="text-muted-foreground text-sm">
        Checkout closed — you haven&apos;t been charged.
      </p>
    );
  }

  return (
    <p role="alert" className="text-destructive text-sm">
      {outcome.message} You haven&apos;t been charged; try again or use a
      different card.
    </p>
  );
}
