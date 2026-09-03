import { describe, expect, it } from "vitest";

import { calculateInvoice, InvoiceCalculationError } from "./calculate";
import { toDecimalString } from "./money";

const taxContext = {
  supplierCountry: "IN",
  supplierStateCode: "29",
  clientCountry: "IN",
  clientStateCode: "29",
  rateBasisPoints: 1800,
  registered: true,
};

function calc(
  lineItems: { description: string; quantity: string; unitPrice: string }[],
  overrides: Partial<Parameters<typeof calculateInvoice>[0]> = {},
) {
  return calculateInvoice({
    lineItems,
    currency: "INR",
    tax: taxContext,
    ...overrides,
  });
}

describe("calculateInvoice", () => {
  it("computes a single-line invoice end to end", () => {
    const result = calc([
      { description: "Design", quantity: "1", unitPrice: "100000" },
    ]);

    expect(toDecimalString(result.subtotal)).toBe("100000.00");
    expect(toDecimalString(result.tax.total)).toBe("18000.00");
    expect(toDecimalString(result.total)).toBe("118000.00");
  });

  it("sums multiple lines", () => {
    const result = calc([
      { description: "Design", quantity: "2", unitPrice: "25000" },
      { description: "Revisions", quantity: "1.5", unitPrice: "10000" },
    ]);

    // 50,000 + 15,000
    expect(toDecimalString(result.subtotal)).toBe("65000.00");
  });

  it("makes printed line amounts add up to the printed subtotal", () => {
    // Each line rounds before summing, so an invoice reader can check the
    // arithmetic by hand and get the same answer.
    const result = calc([
      { description: "a", quantity: "0.333", unitPrice: "100" },
      { description: "b", quantity: "0.333", unitPrice: "100" },
      { description: "c", quantity: "0.333", unitPrice: "100" },
    ]);

    const summed = result.lines.reduce((s, l) => s + l.amount, 0n);
    expect(summed).toBe(result.subtotal);
    expect(toDecimalString(result.subtotal)).toBe("99.90");
  });

  describe("discount", () => {
    it("subtracts before tax", () => {
      const result = calc(
        [{ description: "Design", quantity: "1", unitPrice: "100000" }],
        { discount: "10000" },
      );

      expect(toDecimalString(result.taxableAmount)).toBe("90000.00");
      // Taxing money the client was never asked for would overstate liability.
      expect(toDecimalString(result.tax.total)).toBe("16200.00");
      expect(toDecimalString(result.total)).toBe("106200.00");
    });

    it("treats empty, null and undefined as no discount", () => {
      for (const discount of ["", null, undefined]) {
        const result = calc(
          [{ description: "x", quantity: "1", unitPrice: "100" }],
          { discount },
        );
        expect(result.discount).toBe(0n);
      }
    });

    it("rejects a discount larger than the subtotal", () => {
      expect(() =>
        calc([{ description: "x", quantity: "1", unitPrice: "100" }], {
          discount: "500",
        }),
      ).toThrow(InvoiceCalculationError);
    });

    it("rejects a negative discount", () => {
      expect(() =>
        calc([{ description: "x", quantity: "1", unitPrice: "100" }], {
          discount: "-50",
        }),
      ).toThrow(InvoiceCalculationError);
    });
  });

  describe("input validation", () => {
    it("rejects an invoice with no lines", () => {
      expect(() => calc([])).toThrow(InvoiceCalculationError);
    });

    it("names the offending line rather than dropping it", () => {
      // A line that silently vanishes is noticed after the invoice is sent.
      expect(() =>
        calc([
          { description: "ok", quantity: "1", unitPrice: "100" },
          { description: "bad", quantity: "1", unitPrice: "abc" },
        ]),
      ).toThrow(/Line 2/);
    });

    it("rejects an unparseable quantity", () => {
      expect(() =>
        calc([{ description: "x", quantity: "some", unitPrice: "100" }]),
      ).toThrow(/quantity/);
    });

    it("points a negative price at the discount field", () => {
      expect(() =>
        calc([{ description: "x", quantity: "1", unitPrice: "-100" }]),
      ).toThrow(/discount/);
    });
  });

  describe("tax integration", () => {
    it("zero-rates an export and keeps the note", () => {
      const result = calc(
        [{ description: "Design", quantity: "1", unitPrice: "100000" }],
        { tax: { ...taxContext, clientCountry: "US", clientStateCode: null } },
      );

      expect(result.tax.total).toBe(0n);
      expect(toDecimalString(result.total)).toBe("100000.00");
      expect(result.tax.note).toContain("Export of services");
    });

    it("charges IGST across states", () => {
      const result = calc(
        [{ description: "Design", quantity: "1", unitPrice: "100000" }],
        { tax: { ...taxContext, clientStateCode: "27" } },
      );

      expect(result.tax.components.map((c) => c.label)).toEqual(["IGST"]);
      expect(toDecimalString(result.total)).toBe("118000.00");
    });

    it("charges nothing when unregistered", () => {
      const result = calc(
        [{ description: "Design", quantity: "1", unitPrice: "100000" }],
        { tax: { ...taxContext, registered: false } },
      );

      expect(toDecimalString(result.total)).toBe("100000.00");
    });
  });

  it("handles a zero-decimal currency without inflating the total", () => {
    const result = calculateInvoice({
      lineItems: [{ description: "Design", quantity: "1", unitPrice: "50000" }],
      currency: "JPY",
      tax: { ...taxContext, supplierCountry: "JP", registered: false },
    });

    expect(toDecimalString(result.total, "JPY")).toBe("50000");
  });
});
