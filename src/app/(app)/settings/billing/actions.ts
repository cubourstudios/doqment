"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { requireProfile } from "@/lib/auth";
import {
  activeSubscriptionFor,
  stripeCustomerIdFor,
} from "@/lib/billing/entitlement";
import { razorpayProvider } from "@/lib/billing/razorpay";
import { stripeProvider } from "@/lib/billing/stripe";
import { providerForCountry } from "@/lib/billing/types";
import type { BillingInterval } from "@/lib/billing/pricing";

export type BillingState = {
  error?: string;
  razorpay?: { subscriptionId: string; keyId: string };
};

async function appUrl() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = (await headers()).get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

/**
 * Start a subscription.
 *
 * The rail is decided from the user's country rather than offered as a choice.
 * An Indian card on a USD subscription attracts a foreign transaction fee and
 * frequently just fails, so presenting both would be offering people a way to
 * pick the one that does not work for them.
 */
export async function startSubscription(
  interval: BillingInterval,
): Promise<BillingState> {
  const { userId, profile } = await requireProfile();
  const base = await appUrl();

  const provider =
    providerForCountry(profile.country) === "razorpay"
      ? razorpayProvider
      : stripeProvider;

  let session;
  try {
    session = await provider.createSubscription({
      userId,
      email: null,
      interval,
      successUrl: `${base}/settings/billing?checkout=success`,
      cancelUrl: `${base}/settings/billing?checkout=cancelled`,
    });
  } catch (error) {
    console.error("failed to start subscription", error);
    return {
      error: "Couldn't start the checkout. Try again in a moment.",
    };
  }

  if (session.kind === "redirect") redirect(session.url);

  // Razorpay opens in its own client-side script, so the ids go back to the
  // browser rather than a redirect happening here.
  return {
    razorpay: {
      subscriptionId: session.subscriptionId,
      keyId: session.keyId,
    },
  };
}

export async function manageSubscription() {
  const { userId, profile } = await requireProfile();
  const base = await appUrl();

  if (providerForCountry(profile.country) === "stripe") {
    const customerId = await stripeCustomerIdFor(userId);
    const session = await stripeProvider.createPortalSession({
      userId,
      providerCustomerId: customerId,
      providerSubscriptionId: null,
      returnUrl: `${base}/settings/billing`,
    });

    if (session?.kind === "redirect") redirect(session.url);
  }

  redirect("/settings/billing?portal=unavailable");
}

/**
 * Cancel at the end of the paid period, not immediately.
 *
 * The user paid for the rest of the month; taking it away the moment they
 * click cancel is not our call to make, and it is the behaviour that generates
 * chargebacks.
 */
export async function cancelSubscription() {
  const { userId, profile } = await requireProfile();
  const subscription = await activeSubscriptionFor(userId);

  if (!subscription) redirect("/settings/billing");

  const provider =
    providerForCountry(profile.country) === "razorpay"
      ? razorpayProvider
      : stripeProvider;

  try {
    await provider.cancelSubscription(subscription.providerSubId);
  } catch (error) {
    console.error("failed to cancel subscription", error);
    redirect("/settings/billing?cancel=failed");
  }

  redirect("/settings/billing?cancel=scheduled");
}
