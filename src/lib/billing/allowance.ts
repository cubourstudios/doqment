import type { Plan } from "./plans";

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

/** TODO(credits): read from the database. These are invented values. */
export function getAllowance(plan: Plan, currency = "INR"): Allowance {
  return {
    plan,
    freeInvoicesRemaining: plan === "pro" ? null : 2,
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
    const left = allowance.freeInvoicesRemaining ?? 0;

    return left > 0
      ? {
          allowed: true,
          reason: `${left} of 3 free this month`,
          cost: 0,
          coveredBy: "allowance",
        }
      : {
          allowed: true,
          reason: "Free invoices used up this month",
          cost: allowance.perDocumentCost,
          coveredBy: allowance.credits > 0 ? "credit" : "payment",
        };
  }

  return allowance.credits > 0
    ? {
        allowed: true,
        reason: `Uses 1 of your ${allowance.credits} credits`,
        cost: 0,
        coveredBy: "credit",
      }
    : {
        allowed: true,
        // Charged at download, never at generation — the user sees the real
        // document watermarked before anything asks them to pay.
        reason: "Charged when you download",
        cost: allowance.perDocumentCost,
        coveredBy: "payment",
      };
}
