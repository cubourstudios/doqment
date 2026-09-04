"use server";

import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { activeSubscriptionFor } from "@/lib/billing/entitlement";
import {
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  verifyCheckoutSignature,
} from "@/lib/billing/razorpay";
import { railForCountry } from "@/lib/billing/types";
import { isRailConfigured, type BillingInterval } from "@/lib/billing/pricing";

export type BillingState = {
  error?: string;
  razorpay?: { subscriptionId: string; keyId: string };
};

/**
 * Start a subscription.
 *
 * The currency is decided from the user's country rather than offered as a
 * choice. An Indian card on a USD subscription attracts a foreign transaction
 * fee and frequently just fails, so presenting both would be offering people a
 * way to pick the one that does not work for them.
 */
export async function startSubscription(
  interval: BillingInterval,
): Promise<BillingState> {
  const { userId, profile } = await requireProfile();
  const rail = railForCountry(profile.country);

  // Checked before the call rather than caught after it, so an unconfigured
  // rail reads as "not available yet" instead of "something went wrong".
  if (!isRailConfigured(rail)) {
    return {
      error:
        "Paid plans aren't available in your region yet. Nothing you've " +
        "created is affected — the free plan keeps working.",
    };
  }

  try {
    const session = await createRazorpaySubscription({
      userId,
      rail,
      interval,
    });

    // Razorpay opens in its own client-side script, so the ids go back to the
    // browser rather than a redirect happening here.
    return { razorpay: session };
  } catch (error) {
    console.error("failed to start subscription", error);
    return { error: "Couldn't start the checkout. Try again in a moment." };
  }
}

/**
 * Confirm what the browser reported after checkout closed.
 *
 * Deliberately does not grant anything. The plan is changed by the webhook and
 * nowhere else — this handler runs in a browser the user controls, so treating
 * it as proof of payment would mean anyone who can open a console can have
 * Pro. All this decides is which message to show while the webhook lands.
 *
 * Verifying is still worth doing: without it, "payment received" would be a
 * claim made by whatever posted to this action.
 */
export async function confirmCheckout(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): Promise<{ verified: boolean }> {
  // requireProfile so an unauthenticated caller cannot probe signatures.
  await requireProfile();

  const { paymentId, subscriptionId, signature } = input;

  if (!paymentId || !subscriptionId || !signature) return { verified: false };

  try {
    return { verified: verifyCheckoutSignature(input) };
  } catch (error) {
    console.error("failed to verify checkout signature", error);
    return { verified: false };
  }
}

/**
 * Cancel at the end of the paid period, not immediately.
 *
 * The user paid for the rest of the month; taking it away the moment they
 * click cancel is not our call to make, and it is the behaviour that generates
 * chargebacks.
 *
 * Razorpay has no hosted customer portal, so this is the whole of subscription
 * management — which is why it lives in the app rather than behind a link out.
 */
export async function cancelSubscription() {
  const { userId } = await requireProfile();
  const subscription = await activeSubscriptionFor(userId);

  if (!subscription) redirect("/settings/billing");

  try {
    await cancelRazorpaySubscription(subscription.providerSubId);
  } catch (error) {
    console.error("failed to cancel subscription", error);
    redirect("/settings/billing?cancel=failed");
  }

  redirect("/settings/billing?cancel=scheduled");
}
