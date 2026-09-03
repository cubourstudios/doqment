import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

import { planIdFor, type BillingInterval, type BillingRail } from "./pricing";
import type { CheckoutSession } from "./types";

/**
 * Razorpay — the only payment rail.
 *
 * Server-only: the SDK uses Node's crypto module and holds the key secret.
 * The checkout UI loads Razorpay's own script in the browser instead.
 *
 * Exported as plain functions rather than a provider object. There is one
 * implementation, so an interface would only add a layer between the caller
 * and the code that does the work.
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

export async function createRazorpaySubscription(input: {
  userId: string;
  rail: BillingRail;
  interval: BillingInterval;
}): Promise<CheckoutSession> {
  const { userId, rail, interval } = input;

  // The plan fixes the currency, so choosing the plan is how the rupee and
  // dollar prices stay apart.
  const plan_id = planIdFor(rail, interval);
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

  return { subscriptionId: subscription.id, keyId };
}

export async function cancelRazorpaySubscription(
  providerSubscriptionId: string,
): Promise<void> {
  // `true` cancels at the end of the paid cycle rather than immediately.
  await razorpayClient().subscriptions.cancel(providerSubscriptionId, true);
}

/**
 * Verify the signature Razorpay's checkout hands back to the browser.
 *
 * Separate from the webhook check below, and computed differently: the webhook
 * signs the entire raw body, while checkout signs two ids joined by a pipe.
 * The order of those ids is not interchangeable —
 *
 *   subscriptions: payment_id | subscription_id
 *   orders:        order_id   | payment_id
 *
 * — and getting it backwards produces a valid-looking mismatch that reads as a
 * forgery. We use the subscription form, because subscriptions are what this
 * product sells.
 *
 * This does *not* grant a plan. Entitlement comes from the webhook and nowhere
 * else: this callback runs in a browser the user controls. What verifying buys
 * is the difference between "paid, waiting on Razorpay to confirm" and "we
 * have no idea what happened" — which is the difference between a confident
 * message and a hopeful one.
 */
export function verifyCheckoutSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not set.");

  return constantTimeEquals(
    createHmac("sha256", secret)
      .update(`${input.paymentId}|${input.subscriptionId}`)
      .digest("hex"),
    input.signature,
  );
}

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

  return constantTimeEquals(expected, signature);
}

function constantTimeEquals(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  // timingSafeEqual throws on a length mismatch, and the lengths are not
  // secret — a hex digest is always the same length — so this is checked first.
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}
