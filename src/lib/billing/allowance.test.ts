import { describe, expect, it } from "vitest";

import { entitlementFor, getAllowance, type Allowance } from "./allowance";

/**
 * The credits model is mocked — `getAllowance` invents its numbers because the
 * tables do not exist yet. What is real, and what these cover, is the shape of
 * the answer and the branch each case lands in: the UI decides from `cost` and
 * `coveredBy` whether to show a price, and a screen that offers a document for
 * free because the branch was wrong is money quietly not charged.
 *
 * None of this touches billing state, which is exactly why it can be tested
 * before the tables land.
 */

/** A Free user with credits in hand and free invoices left. */
const free: Allowance = {
  plan: "free",
  monthlyAllowance: 5,
  freeInvoicesRemaining: 2,
  credits: 3,
  perDocumentCost: 2900,
  currency: "INR",
};

const OTHER_TYPES = ["nda", "proposal", "contract", "quote", "reminder"];

describe("getAllowance", () => {
  it("gives Pro no invoice ceiling", () => {
    // Null means unlimited here, not "none left" — the two read the same in a
    // careless check, and one of them bills a paying customer per invoice.
    const allowance = getAllowance("pro");

    expect(allowance.freeInvoicesRemaining).toBeNull();
    expect(allowance.plan).toBe("pro");
  });

  it("gives Free a finite invoice allowance", () => {
    expect(getAllowance("free").freeInvoicesRemaining).toBeGreaterThan(0);
  });

  it("defaults to rupees but takes the currency it is given", () => {
    expect(getAllowance("free").currency).toBe("INR");
    expect(getAllowance("free", "USD").currency).toBe("USD");
  });

  it("prices a chargeable document in minor units", () => {
    // 2900 is ₹29.00, not ₹2,900. A major-unit reading here is a hundredfold
    // overcharge at the payment step.
    expect(Number.isInteger(getAllowance("free").perDocumentCost)).toBe(true);
  });
});

describe("entitlementFor — Pro", () => {
  const pro = getAllowance("pro");

  it("covers every document type at no cost", () => {
    for (const docType of ["invoice", ...OTHER_TYPES]) {
      const entitlement = entitlementFor(docType, pro);

      expect(entitlement.allowed).toBe(true);
      expect(entitlement.cost).toBe(0);
      expect(entitlement.coveredBy).toBe("plan");
    }
  });

  it("says the plan covers it, not that credits do", () => {
    // A Pro user shown "uses 1 of your credits" reasonably asks what they are
    // paying the subscription for.
    expect(entitlementFor("invoice", pro).reason).toContain("Pro");
  });

  it("ignores a credit balance that happens to be on the record", () => {
    const entitlement = entitlementFor("nda", { ...pro, credits: 0 });

    expect(entitlement.cost).toBe(0);
    expect(entitlement.coveredBy).toBe("plan");
  });
});

describe("entitlementFor — Free, invoices", () => {
  it("is free while the monthly allowance lasts", () => {
    const entitlement = entitlementFor("invoice", free);

    expect(entitlement.allowed).toBe(true);
    expect(entitlement.cost).toBe(0);
    expect(entitlement.coveredBy).toBe("allowance");
  });

  it("does not spend a credit on an invoice that is already free", () => {
    // Invoices are metered by the allowance, not by credits. Charging a credit
    // here would silently drain the balance the other document types need.
    expect(entitlementFor("invoice", free).coveredBy).not.toBe("credit");
  });

  it("charges once the allowance is used up", () => {
    const entitlement = entitlementFor("invoice", {
      ...free,
      freeInvoicesRemaining: 0,
      credits: 0,
    });

    expect(entitlement.allowed).toBe(true);
    expect(entitlement.cost).toBe(free.perDocumentCost);
    expect(entitlement.coveredBy).toBe("payment");
  });

  it("treats an unknown remaining count as used up, never as unlimited", () => {
    // Null is Pro's "unlimited". Reaching this branch on Free means the real
    // data layer failed to answer, and the safe reading of "I don't know how
    // many are left" is none.
    const entitlement = entitlementFor("invoice", {
      ...free,
      freeInvoicesRemaining: null,
      credits: 0,
    });

    expect(entitlement.cost).toBe(free.perDocumentCost);
  });

  it("says how many are left, so the count is visible before the wall", () => {
    expect(entitlementFor("invoice", free).reason).toContain("2");
  });
});

describe("entitlementFor — Free, everything else", () => {
  it("spends a credit rather than asking for money", () => {
    for (const docType of OTHER_TYPES) {
      const entitlement = entitlementFor(docType, free);

      expect(entitlement.allowed).toBe(true);
      expect(entitlement.cost).toBe(0);
      expect(entitlement.coveredBy).toBe("credit");
    }
  });

  it("charges the per-document price when no credit is held", () => {
    const entitlement = entitlementFor("nda", { ...free, credits: 0 });

    expect(entitlement.cost).toBe(free.perDocumentCost);
    expect(entitlement.coveredBy).toBe("payment");
  });

  it("does not draw on the invoice allowance", () => {
    // The two pools are separate: an NDA must not be free merely because an
    // invoice would be.
    const entitlement = entitlementFor("nda", { ...free, credits: 0 });

    expect(entitlement.coveredBy).not.toBe("allowance");
    expect(entitlement.cost).toBeGreaterThan(0);
  });

  it("still allows the document, charging at download", () => {
    // Generation is never blocked: the user sees the real document,
    // watermarked, before anything asks them to pay for it.
    const entitlement = entitlementFor("proposal", { ...free, credits: 0 });

    expect(entitlement.allowed).toBe(true);
    expect(entitlement.reason).toMatch(/download/i);
  });
});

describe("entitlementFor — invariants", () => {
  const cases: Allowance[] = [
    getAllowance("pro"),
    free,
    { ...free, credits: 0 },
    { ...free, freeInvoicesRemaining: 0 },
    { ...free, freeInvoicesRemaining: 0, credits: 0 },
  ];

  it("always gives a reason a user could read", () => {
    for (const allowance of cases) {
      for (const docType of ["invoice", ...OTHER_TYPES]) {
        expect(entitlementFor(docType, allowance).reason.trim()).not.toBe("");
      }
    }
  });

  it("never returns a negative price", () => {
    for (const allowance of cases) {
      for (const docType of ["invoice", ...OTHER_TYPES]) {
        expect(entitlementFor(docType, allowance).cost).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("reads the allowance without changing it", () => {
    // The same allowance object is asked about once per document type on a
    // list screen; decrementing it in place would price the second row wrong.
    const allowance = { ...free };
    const before = JSON.stringify(allowance);

    for (const docType of ["invoice", ...OTHER_TYPES]) {
      entitlementFor(docType, allowance);
    }

    expect(JSON.stringify(allowance)).toBe(before);
  });

  it("treats an unrecognised document type as chargeable, not as free", () => {
    // A document type added to the seed before it is added here must fall on
    // the paid side; the other way round gives away the product.
    const entitlement = entitlementFor("something-new", {
      ...free,
      credits: 0,
    });

    expect(entitlement.cost).toBe(free.perDocumentCost);
  });
});
