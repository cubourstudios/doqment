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
 * **The India price is ₹299/month.** It sits above the ₹250 line an earlier
 * revision aimed under, which is a deliberate trade: Free now carries a
 * per-document charge, so Pro is sold against an accumulating bill rather than
 * against nothing — the pitch is "unlimited after about ten documents", not
 * "cheap". The annual plan is ten months at that rate.
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
 *
 * ## One provider, two currencies
 *
 * Both rails are Razorpay. The split below is a *currency* decision, not a
 * provider one: an Indian customer is charged in rupees, everyone else in
 * dollars, and each currency needs its own Razorpay plan because a Razorpay
 * plan fixes its currency at creation.
 *
 * The USD rail additionally requires International Payments to be enabled on
 * the Razorpay account, which is a separate activation. Until those plan ids
 * are set, `isRailConfigured()` reports the rail as unavailable and the UI
 * says so plainly rather than opening a checkout that would throw.
 */

export type BillingInterval = "month" | "year";

/** Which currency a customer is charged in. Both are billed by Razorpay. */
export type BillingRail = "inr" | "usd";

export type PriceOption = {
  interval: BillingInterval;
  /** Formatted for display, in the currency actually charged. */
  amount: string;
  /** What the same period costs on the monthly plan, for showing the saving. */
  comparedTo?: string;
  /** e.g. "2 months free" */
  saving?: string;
  /** Environment variable holding the Razorpay plan id. */
  envKey: string;
};

export type RailPricing = {
  currency: string;
  /** How the charge is described to the customer. */
  billedAs: string;
  monthly: PriceOption;
  annual: PriceOption;
};

export const PRICING: Record<BillingRail, RailPricing> = {
  inr: {
    currency: "INR",
    billedAs: "Billed in rupees through Razorpay.",
    monthly: {
      interval: "month",
      amount: "₹299",
      envKey: "RAZORPAY_PLAN_ID_MONTHLY",
    },
    annual: {
      interval: "year",
      amount: "₹2,990",
      comparedTo: "₹3,588",
      saving: "2 months free",
      envKey: "RAZORPAY_PLAN_ID_ANNUAL",
    },
  },
  usd: {
    currency: "USD",
    billedAs: "Billed in US dollars through Razorpay.",
    monthly: {
      interval: "month",
      amount: "$6",
      envKey: "RAZORPAY_PLAN_ID_MONTHLY_USD",
    },
    annual: {
      interval: "year",
      amount: "$60",
      comparedTo: "$72",
      saving: "2 months free",
      envKey: "RAZORPAY_PLAN_ID_ANNUAL_USD",
    },
  },
};

/**
 * What Pro actually buys, in the order a prospect cares about.
 *
 * `soon` marks something not built yet. It is listed because it is on the
 * roadmap and priced into the plan, but it must never render as a capability
 * you get on paying today — a pricing page is the last place to be vague about
 * what exists.
 */
export const PRO_FEATURES: readonly { label: string; soon?: boolean }[] = [
  { label: "Unlimited documents of every type" },
  { label: "Unlimited projects" },
  { label: "No Doqment footer" },
  { label: "Your logo and brand colour on every document" },
  { label: "AI proposal drafting from meeting notes", soon: true },
] as const;

export function priceFor(
  rail: BillingRail,
  interval: BillingInterval,
): PriceOption {
  const pricing = PRICING[rail];
  return interval === "year" ? pricing.annual : pricing.monthly;
}

/**
 * The Razorpay plan id for a rail and interval.
 *
 * Read at call time rather than at import: a missing id should fail when
 * someone tries to subscribe, with a message naming the variable, rather than
 * crashing the process on boot.
 */
export function planIdFor(
  rail: BillingRail,
  interval: BillingInterval,
): string {
  const option = priceFor(rail, interval);
  const id = process.env[option.envKey];

  if (!id) {
    throw new Error(
      `${option.envKey} is not set. Create the ${interval}ly ` +
        `${PRICING[rail].currency} plan in the Razorpay dashboard and put ` +
        `its id in that variable.`,
    );
  }

  return id;
}

/**
 * Whether a rail can actually take money.
 *
 * Called from the server so the billing page can offer an honest message
 * instead of an Upgrade button that throws. Both intervals are required: an
 * account with only the monthly plan configured would render a yearly option
 * that fails on tap.
 */
export function isRailConfigured(rail: BillingRail): boolean {
  return Boolean(
    process.env[PRICING[rail].monthly.envKey] &&
      process.env[PRICING[rail].annual.envKey],
  );
}
