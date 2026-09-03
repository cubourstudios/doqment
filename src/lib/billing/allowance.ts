import { limitsFor, type Plan } from "./plans";

/**
 * What the user may generate right now, and what it costs.
 *
 * MOCKED. The credits model — free invoice allowance, a credit balance, and a
 * per-document charge for the other types — is a product decision that is not
 * in the database yet: it needs `credits`, `credit_transactions`, and
 * `documents.paid_at` / `charge_amount` before any of it can be true. The UI
 * is built against this shape so the wiring is a one-file change later.
 *
 * Everything below returns invented numbers. Nothing reads or writes billing
 * state, and no screen may take an irreversible action on the strength of it.
 *
 * TODO(credits): replace with a real per-document entitlement check once the
 * tables exist. The shape is deliberately the one that check should return.
 */

/** Documents that are free within an allowance, versus charged per document. */
const METERED_TYPE = "invoice";

export type Allowance = {
  plan: Plan;
  /** The enforced monthly limit. Null on Pro, which is unlimited. */
  monthlyAllowance: number | null;
  /** Free invoices left this month. Null on Pro, which is unlimited. */
  freeInvoicesRemaining: number | null;
  /** Credits held, each covering one chargeable document. */
  credits: number;
  /** Minor units. What a chargeable document costs when no credit is held. */
  perDocumentCost: number;
  currency: string;
};

export type DocumentEntitlement = {
  allowed: boolean;
  /** Why it is chargeable or blocked, in words a user can read. */
  reason: string;
  /** Minor units; 0 when the document is covered. */
  cost: number;
  coveredBy: "plan" | "allowance" | "credit" | "payment";
};

/**
 * TODO(credits): read from the database. The counts are invented; the monthly
 * limit is not — it comes from plans.ts, so the strip cannot advertise an
 * allowance different from the one canCreateDocument actually enforces. Saying
 * "3 free this month" beside a limit of 5 is how a user learns not to trust
 * the number.
 */
export function getAllowance(plan: Plan, currency = "INR"): Allowance {
  const { maxDocumentsPerMonth } = limitsFor(plan);

  return {
    plan,
    monthlyAllowance: maxDocumentsPerMonth,
    freeInvoicesRemaining: maxDocumentsPerMonth === null ? null : 2,
    credits: plan === "pro" ? 0 : 3,
    perDocumentCost: 2900,
    currency,
  };
}

/**
 * Whether this document type can be generated, and at what price.
 *
 * Pro covers everything. On Free, invoices come out of a monthly allowance and
 * every other type costs one credit, or a payment when no credit is held.
 */
export function entitlementFor(
  docType: string,
  allowance: Allowance,
): DocumentEntitlement {
  if (allowance.plan === "pro") {
    return { allowed: true, reason: "Included in Pro", cost: 0, coveredBy: "plan" };
  }

  if (docType === METERED_TYPE) {
    const left = Math.max(0, allowance.freeInvoicesRemaining ?? 0);

    if (left > 0) {
      return {
        allowed: true,
        reason: allowance.monthlyAllowance
          ? `${left} of ${allowance.monthlyAllowance} free this month`
          : `${left} free this month`,
        cost: 0,
        coveredBy: "allowance",
      };
    }
    // Out of allowance: falls through to the credit-or-pay path below, so an
    // invoice and a proposal are priced by the same rule rather than by two
    // branches that could disagree.
  }

  // A held credit covers the document outright — it was paid for when the pack
  // was bought, so the cost here is zero. Reporting both a cost and "covered by
  // credit" is a contradiction the download step would have to resolve.
  if (allowance.credits > 0) {
    return {
      allowed: true,
      reason: `Uses 1 of your ${allowance.credits} credits`,
      cost: 0,
      coveredBy: "credit",
    };
  }

  return {
    allowed: true,
    // Charged at download, never at generation — the user sees the real
    // document watermarked before anything asks them to pay.
    reason: "Charged when you download",
    cost: allowance.perDocumentCost,
    coveredBy: "payment",
  };
}
