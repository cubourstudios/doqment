import { describe, expect, it } from "vitest";

import { GST_RATES, invoiceSchema } from "./invoice";

const valid = {
  issueDate: "2026-09-03",
  lineItems: [{ description: "Design work", quantity: "1", unitPrice: "1000" }],
  taxRateBasisPoints: 1800,
};

describe("taxRateBasisPoints", () => {
  it("accepts every rate the form offers", () => {
    for (const rate of GST_RATES) {
      const parsed = invoiceSchema.safeParse({
        ...valid,
        taxRateBasisPoints: rate.value,
      });
      expect(parsed.success).toBe(true);
    }
  });

  /**
   * An odd rate has no integer CGST/SGST half, and computeTax throws a
   * RangeError converting 900.5 to a bigint. The form only ever submits from
   * the fixed set, so this is reachable only by a hand-crafted request.
   */
  it("rejects a rate outside the fixed set", () => {
    for (const rate of [1801, 1, 999, 10000]) {
      const parsed = invoiceSchema.safeParse({
        ...valid,
        taxRateBasisPoints: rate,
      });
      expect(parsed.success).toBe(false);
    }
  });
});
