import { getUsage, limitsFor, type Plan } from "./plans";

/**
 * What the user may generate right now, and what it costs.
 *
 * This used to invent its numbers — a fixed "2 free invoices left" and "3
 * credits" — while the rest of the product enforced something else, and the
 * result was four screens giving four different answers to the same question.
 * The dashboard said two invoices remained on an account that billing said had
 * used everything. A limit the user cannot trust is worse than one they cannot
 * see, so everything here is now read from the same source the limit is
 * enforced from.
 *
 * The credits model in the pricing spec — packs, and a per-document charge for
 * non-invoice types — is deliberately NOT represented. It has no tables
 * (`credits`, `credit_transactions`, `documents.paid_at`), nothing charges for
 * a document, and a balance shown for something that cannot be spent or bought
 * is a lie told in the interface. When those exist, `credits` and
 * `perDocumentCost` are what this should grow.
 */

export type Allowance = {
  plan: Plan;
  /** Documents created this month, counted the way the limit counts them. */
  documentsUsed: number;
  /** Null on Pro, which is unlimited. */
  documentsLimit: number | null;
  projectsUsed: number;
  projectsLimit: number | null;
};

export type DocumentEntitlement = {
  allowed: boolean;
  /** Why, in words a user can read. */
  reason: string;
};

export async function getAllowance(
  userId: string,
  plan: Plan,
): Promise<Allowance> {
  const limits = limitsFor(plan);
  const usage = await getUsage(userId);

  return {
    plan,
    documentsUsed: usage.documentsThisMonth,
    documentsLimit: limits.maxDocumentsPerMonth,
    projectsUsed: usage.projects,
    projectsLimit: limits.maxProjects,
  };
}

/** How many are left, never below zero. */
export function remaining(used: number, limit: number | null): number | null {
  return limit === null ? null : Math.max(0, limit - used);
}

/**
 * Whether another document can be generated.
 *
 * Mirrors canCreateDocument rather than re-deciding: the type picker must not
 * offer a document the creation path will then refuse.
 */
export function entitlementFor(allowance: Allowance): DocumentEntitlement {
  if (allowance.documentsLimit === null) {
    return { allowed: true, reason: "Included in Pro" };
  }

  const left = remaining(allowance.documentsUsed, allowance.documentsLimit);

  return left && left > 0
    ? {
        allowed: true,
        reason: `${left} of ${allowance.documentsLimit} left this month`,
      }
    : {
        allowed: false,
        reason: `You've used all ${allowance.documentsLimit} documents this month`,
      };
}
