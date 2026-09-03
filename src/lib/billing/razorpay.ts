import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

import { planIdFor } from "./pricing";
import type { BillingProvider, CheckoutSession } from "./types";

/**
 * Razorpay rail — India.
 *
 * Server-only: the SDK uses Node's crypto module and holds the key secret.
 * The checkout UI loads Razorpay's own script in the browser instead.
 */

let client: Razorpay | null = null;

export function razorpayClient(): Razorpay {
  if (client) return client;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set.");
  }

  client = new Razorpay({ key_id, key_secret });
  return client;
}

export const razorpayProvider: BillingProvider = {
  name: "razorpay",

  async createSubscription({ userId, interval }) {
    const plan_id = planIdFor("razorpay", interval);
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!keyId) throw new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not set.");

    const subscription = await razorpayClient().subscriptions.create({
      plan_id,
      // Razorpay requires a finite count, so this is ten years of either
      // billing period — effectively indefinite, and far beyond any realistic
      // subscription life.
      total_count: interval === "year" ? 10 : 120,
      customer_notify: 1,
      // notes is the only field that survives the round trip to the webhook,
      // so it carries the mapping back to a user.
      notes: { user_id: userId },
    });

    return {
      kind: "razorpay_subscription",
      subscriptionId: subscription.id,
      keyId,
    } satisfies CheckoutSession;
  },

  async createPortalSession() {
    // Razorpay has no hosted customer portal. Cancellation happens in-app.
    return null;
  },

  async cancelSubscription(providerSubscriptionId) {
    // `1` cancels at the end of the paid cycle rather than immediately.
    await razorpayClient().subscriptions.cancel(providerSubscriptionId, true);
  },
};

/**
 * Verify a Razorpay webhook signature.
 *
 * Compared with timingSafeEqual rather than `===`. A plain comparison leaks
 * how much of the signature matched through its timing, which is enough to
 * forge one given patience — and a forged webhook here grants a paid plan.
 */
export function verifyRazorpaySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
