/**
 * Pricing.
 *
 * Kept as data in one file because these numbers are a business decision that
 * will be revised, and hunting them through components is how a price change
 * ends up half-applied.
 *
 * ## The reasoning
 *
 * The buyer is a solo freelancer, usually in India, who is price-sensitive in
 * a specific way: they will pay for something that protects income, but they
 * compare against free tools and against simply using a Word template. The
 * competition is not other SaaS — it is inertia.
 *
 * Three decisions follow from that.
 *
 * **Annual billing is offered at two months free.** This is the single
 * highest-leverage lever in the model. It roughly doubles realised lifetime
 * value against a monthly plan with typical small-SaaS churn, it collects cash
 * up front, and it removes eleven monthly opportunities to reconsider. Two
 * months is the conventional discount and is large enough to be the obvious
 * choice without devaluing the monthly price.
 *
 * **The India price is set below the psychological ₹250 line.** ₹199/month is
 * under what most Indian freelancers spend on a single coffee meeting, and it
 * reads as an easy yes rather than a considered purchase. The annual plan at
 * ₹1,999 lands under ₹2,000, which is the number a freelancer actually
 * budgets against.
 *
 * **International is priced higher, not converted.** $6/month is not ₹199 at
 * any exchange rate, and it should not be — a US freelancer's alternative is
 * Bonsai or FreshBooks at $19-25/month, so $6 is already a sharp discount.
 * Charging Indian prices internationally leaves money on the table; charging
 * US prices in India loses the market.
 *
 * The free tier stays genuinely usable, because the checklist is the thing
 * that convinces someone the product is worth paying for and they need to
 * reach it. What free does not include is an unwatermarked PDF — the moment a
 * document goes to a paying client is the moment the freelancer wants it to
 * look like theirs.
 */

export type BillingInterval = "month" | "year";

export type PriceOption = {
  interval: BillingInterval;
  /** Formatted for display, in the currency actually charged. */
  amount: string;
  /** What the same period costs on the monthly plan, for showing the saving. */
  comparedTo?: string;
  /** e.g. "2 months free" */
  saving?: string;
  /** Environment variable holding the provider's plan or price id. */
  envKey: string;
};

export type RailPricing = {
  currency: string;
  monthly: PriceOption;
  annual: PriceOption;
};

export const PRICING: Record<"razorpay" | "stripe", RailPricing> = {
  razorpay: {
    currency: "INR",
    monthly: {
      interval: "month",
      amount: "₹199",
      envKey: "RAZORPAY_PLAN_ID_MONTHLY",
    },
    annual: {
      interval: "year",
      amount: "₹1,999",
      comparedTo: "₹2,388",
      saving: "2 months free",
      envKey: "RAZORPAY_PLAN_ID_ANNUAL",
    },
  },
  stripe: {
    currency: "USD",
    monthly: {
      interval: "month",
      amount: "$6",
      envKey: "STRIPE_PRICE_ID_MONTHLY",
    },
    annual: {
      interval: "year",
      amount: "$60",
      comparedTo: "$72",
      saving: "2 months free",
      envKey: "STRIPE_PRICE_ID_ANNUAL",
    },
  },
};

/** What Pro actually buys, in the order a prospect cares about. */
export const PRO_FEATURES = [
  "Unlimited projects and documents",
  "No Doqment mark on your PDFs",
  "Every document type, including contracts",
  "25 MB file uploads",
] as const;

export function priceFor(
  rail: "razorpay" | "stripe",
  interval: BillingInterval,
): PriceOption {
  const pricing = PRICING[rail];
  return interval === "year" ? pricing.annual : pricing.monthly;
}

/**
 * The provider id for a plan.
 *
 * Read at call time rather than at import: a missing id should fail when
 * someone tries to subscribe, with a message naming the variable, rather than
 * crashing the process on boot.
 */
export function planIdFor(
  rail: "razorpay" | "stripe",
  interval: BillingInterval,
): string {
  const option = priceFor(rail, interval);
  const id = process.env[option.envKey];

  if (!id) {
    throw new Error(
      `${option.envKey} is not set. Create the ${interval}ly plan in the ` +
        `${rail} dashboard and put its id in that variable.`,
    );
  }

  return id;
}
