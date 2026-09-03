/**
 * One interface, two providers.
 *
 * India's payment rails and the rest of the world's barely resemble each other:
 * Razorpay wants a subscription created server-side and opened in its own
 * checkout script, Stripe wants a hosted checkout session. Rather than let that
 * difference spread through the app, both are hidden behind this interface and
 * the caller only ever asks "start a subscription for this user".
 *
 * The rail is chosen by the user's country, because that is what determines
 * which currency they can actually be charged in — an Indian card on a USD
 * subscription attracts a foreign transaction fee and often simply fails.
 */

export type BillingProviderName = "razorpay" | "stripe";

export type CheckoutSession =
  | { kind: "redirect"; url: string }
  | {
      /** Razorpay opens in a client-side script rather than redirecting. */
      kind: "razorpay_subscription";
      subscriptionId: string;
      keyId: string;
    };

export type BillingProvider = {
  name: BillingProviderName;

  createSubscription(input: {
    userId: string;
    email: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;

  /** Where the user manages or cancels an existing subscription. */
  createPortalSession(input: {
    userId: string;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    returnUrl: string;
  }): Promise<CheckoutSession | null>;

  cancelSubscription(providerSubscriptionId: string): Promise<void>;
};

/** India pays in rupees through Razorpay; everyone else in dollars via Stripe. */
export function providerForCountry(
  country: string | null,
): BillingProviderName {
  return country?.toUpperCase() === "IN" ? "razorpay" : "stripe";
}

export const PRICING = {
  razorpay: { amount: "₹299", period: "month" },
  stripe: { amount: "$6", period: "month" },
} as const;
