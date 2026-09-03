import "server-only";

import Stripe from "stripe";

import type { BillingProvider, CheckoutSession } from "./types";

/**
 * Stripe rail — US and international.
 *
 * Server-only. The secret key must never reach a bundle, and importing this
 * from a client component would do exactly that.
 */

let client: Stripe | null = null;

export function stripeClient(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");

  client = new Stripe(key);
  return client;
}

export const stripeProvider: BillingProvider = {
  name: "stripe",

  async createSubscription({ userId, email, successUrl, cancelUrl }) {
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) throw new Error("STRIPE_PRICE_ID is not set.");

    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // client_reference_id is how the webhook maps a completed checkout back
      // to a user. Without it the payment succeeds and nobody gets upgraded.
      client_reference_id: userId,
      customer_email: email ?? undefined,
      subscription_data: { metadata: { user_id: userId } },
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL.");

    return { kind: "redirect", url: session.url } satisfies CheckoutSession;
  },

  async createPortalSession({ providerCustomerId, returnUrl }) {
    if (!providerCustomerId) return null;

    const session = await stripeClient().billingPortal.sessions.create({
      customer: providerCustomerId,
      return_url: returnUrl,
    });

    return { kind: "redirect", url: session.url };
  },

  async cancelSubscription(providerSubscriptionId) {
    // Cancel at period end rather than immediately: the user paid for the
    // rest of the month and taking it away on the spot is not our call.
    await stripeClient().subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  },
};
