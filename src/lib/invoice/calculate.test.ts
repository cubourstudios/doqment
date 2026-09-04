import { describe, expect, it } from "vitest";

import {
  calculateInvoice,
  InvoiceCalculationError,
  totalsForStorage,
} from "./calculate";
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

describe("a discount that cancels the invoice", () => {
  /**
   * Equal to the subtotal is allowed; only larger is rejected. A job written
   * off in full is a real invoice a freelancer needs on record, and the
   * boundary is one character away from refusing it.
   */
  const result = calc([{ description: "x", quantity: "1", unitPrice: "100" }], {
    discount: "100",
  });

  it("leaves nothing to tax", () => {
    expect(toDecimalString(result.taxableAmount)).toBe("0.00");
    expect(result.tax.total).toBe(0n);
  });

  it("still records what was billed before the discount", () => {
    expect(toDecimalString(result.subtotal)).toBe("100.00");
    expect(toDecimalString(result.discount)).toBe("100.00");
    expect(toDecimalString(result.total)).toBe("0.00");
  });

  it("rejects one paisa more", () => {
    expect(() =>
      calc([{ description: "x", quantity: "1", unitPrice: "100" }], {
        discount: "100.01",
      }),
    ).toThrow(InvoiceCalculationError);
  });
});

/**
 * `subtotal` and `total` are two `numeric` columns on different bases: the
 * subtotal is what was billed before the discount, the total is what is owed
 * after discount and tax. Writing the same basis to both is the kind of error
 * that makes every stored invoice quietly disagree with its own PDF.
 */
describe("totalsForStorage", () => {
  it("stores the pre-discount subtotal and the payable total", () => {
    const result = calc(
      [{ description: "Design", quantity: "1", unitPrice: "100000" }],
      { discount: "10000" },
    );

    // 1,00,000 billed; 90,000 after discount; 18% of that is 16,200.
    expect(totalsForStorage(result, "INR")).toEqual({
      subtotal: "100000.00",
      total: "106200.00",
    });
  });

  it("keeps the stored figures consistent with the parts", () => {
    const result = calc(
      [{ description: "Design", quantity: "1", unitPrice: "100000" }],
      { discount: "10000" },
    );

    expect(result.subtotal - result.discount + result.tax.total).toBe(
      result.total,
    );
  });

  it("stores a zero-decimal currency without a fractional part", () => {
    // The columns are `numeric`, so "50000.00" would survive the insert and
    // read back as ¥50,000 only if every reader remembered to divide.
    const result = calculateInvoice({
      lineItems: [{ description: "Design", quantity: "1", unitPrice: "50000" }],
      currency: "JPY",
      tax: {
        ...taxContext,
        supplierCountry: "JP",
        supplierStateCode: null,
        clientCountry: "JP",
        clientStateCode: null,
        rateBasisPoints: 1000,
      },
    });

    // 10% of ¥50,000 = ¥5,000.
    expect(totalsForStorage(result, "JPY")).toEqual({
      subtotal: "50000",
      total: "55000",
    });
  });
});
