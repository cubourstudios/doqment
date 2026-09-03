import type { BillingRail } from "./pricing";

/**
 * One provider: Razorpay.
 *
 * There was briefly a second rail behind a `BillingProvider` interface, on the
 * theory that India needed Razorpay and everyone else needed Stripe. It is
 * gone. Razorpay bills both currencies, and an abstraction over a single
 * implementation is a layer that hides the one thing worth reading.
 *
 * What survives the simplification is the part that was never about
 * providers: which *currency* a customer is charged in. That still follows
 * from their country, because a Razorpay plan fixes its currency at creation
 * and an Indian customer on a USD plan pays a foreign transaction fee for the
 * privilege.
 */

/**
 * Razorpay never redirects — it opens its own script over the page — so this
 * carries the ids the browser needs to launch that checkout.
 */
export type CheckoutSession = {
  subscriptionId: string;
  keyId: string;
};

/** India is billed in rupees; everyone else in dollars. */
export function railForCountry(country: string | null): BillingRail {
  return country?.toUpperCase() === "IN" ? "inr" : "usd";
}

// Pricing lives in ./pricing.ts, which is where the numbers and the reasoning
// behind them are kept together.
export type { BillingInterval, BillingRail } from "./pricing";
