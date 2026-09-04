import { describe, expect, it } from "vitest";

import { entitlementFor, remaining, type Allowance } from "./allowance";

/**
 * The allowance is the number the user is told; the limit is the number
 * enforced. When those came from two sources, the dashboard said "2 free
 * invoices left" on an account the billing page said had used everything, and
 * the type picker offered a document the create path then refused.
 *
 * So what is worth pinning is agreement and arithmetic: what is left is never
 * negative, an exhausted allowance reads as refused, and Pro's absent limit is
 * never mistaken for a limit of zero.
 */

const free: Allowance = {
  plan: "free",
  documentsUsed: 1,
  documentsLimit: 3,
  projectsUsed: 0,
  projectsLimit: 2,
};

const pro: Allowance = {
  plan: "pro",
  documentsUsed: 40,
  documentsLimit: null,
  projectsUsed: 12,
  projectsLimit: null,
};

describe("remaining", () => {
  it("counts down from the limit", () => {
    expect(remaining(1, 3)).toBe(2);
    expect(remaining(0, 2)).toBe(2);
  });

  it("is null when there is no limit", () => {
    expect(remaining(40, null)).toBeNull();
  });

  /**
   * Usage can exceed a limit, because a cap can be lowered under an existing
   * account — Free went from 5 documents to 3 today. Reporting that as "-2
   * left", or as the fraction "4 of 3" the billing page used to print, reads
   * as a broken product.
   */
  it("never goes negative when usage is over the limit", () => {
    expect(remaining(4, 3)).toBe(0);
    expect(remaining(9, 2)).toBe(0);
  });
});

describe("entitlementFor", () => {
  it("allows another document while the allowance holds", () => {
    const e = entitlementFor(free);

    expect(e.allowed).toBe(true);
    expect(e.reason).toContain("2 of 3");
  });

  it("refuses once the allowance is spent", () => {
    const e = entitlementFor({ ...free, documentsUsed: 3 });

    expect(e.allowed).toBe(false);
    expect(e.reason).toContain("3 documents this month");
  });

  it("still refuses when usage has passed the limit", () => {
    expect(entitlementFor({ ...free, documentsUsed: 5 }).allowed).toBe(false);
  });

  it("allows Pro regardless of how much has been used", () => {
    const e = entitlementFor(pro);

    expect(e.allowed).toBe(true);
    expect(e.reason).toBe("Included in Pro");
  });

  /**
   * A null limit means unlimited, not zero. Reading it as zero would block
   * every paying customer, which is the most expensive direction to fail in.
   */
  it("does not read an absent limit as a limit of zero", () => {
    expect(entitlementFor({ ...pro, documentsUsed: 0 }).allowed).toBe(true);
  });

  it("always gives a reason worth showing", () => {
    for (const allowance of [free, pro, { ...free, documentsUsed: 3 }]) {
      expect(entitlementFor(allowance).reason.trim().length).toBeGreaterThan(0);
    }
  });
});
