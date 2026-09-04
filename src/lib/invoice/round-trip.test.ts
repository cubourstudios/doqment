import { describe, expect, it } from "vitest";

import { calculateInvoice } from "./calculate";
import { addDays, hasAddress, taxRateFromComponents } from "./round-trip";
import { taxBreakdownToJson } from "./tax";

describe("taxRateFromComponents", () => {
  it("sums an intra-state split back to the full rate", () => {
    expect(
      taxRateFromComponents([
        { label: "CGST", rateBasisPoints: 900, amount: "9000.00" },
        { label: "SGST", rateBasisPoints: 900, amount: "9000.00" },
      ]),
    ).toBe(1800);
  });

  it("reads a single IGST line as the full rate", () => {
    expect(
      taxRateFromComponents([
        { label: "IGST", rateBasisPoints: 1800, amount: "18000.00" },
      ]),
    ).toBe(1800);
  });

  it("returns zero when nothing was charged", () => {
    expect(taxRateFromComponents([])).toBe(0);
  });

  /**
   * The regression this function exists to prevent. Taking components[0]
   * would return 9% for an 18% invoice, and because that value is fed back
   * into the edit form, each save would halve it again.
   */
  it("does not drift when an invoice is edited repeatedly", () => {
    const context = {
      supplierCountry: "IN",
      supplierStateCode: "29",
      clientCountry: "IN",
      clientStateCode: "29",
      registered: true,
    };

    let rate = 1800;

    // Three rounds of save-then-reopen.
    for (let round = 0; round < 3; round += 1) {
      const totals = calculateInvoice({
        lineItems: [{ description: "Design", quantity: "1", unitPrice: "1000" }],
        currency: "INR",
        tax: { ...context, rateBasisPoints: rate },
      });

      rate = taxRateFromComponents(
        taxBreakdownToJson(totals.tax, "INR").components,
      );
    }

    expect(rate).toBe(1800);
  });

  it("survives a round trip through the calculator for an export", () => {
    const totals = calculateInvoice({
      lineItems: [{ description: "Design", quantity: "1", unitPrice: "1000" }],
      currency: "INR",
      tax: {
        supplierCountry: "IN",
        supplierStateCode: "29",
        clientCountry: "US",
        clientStateCode: null,
        rateBasisPoints: 1800,
        registered: true,
      },
    });

    // A zero-rated export charges nothing, so reopening it must not invent a
    // rate that was never applied.
    expect(
      taxRateFromComponents(taxBreakdownToJson(totals.tax, "INR").components),
    ).toBe(0);
  });
});

describe("hasAddress", () => {
  it("accepts an address with lines", () => {
    expect(hasAddress({ lines: ["12 MG Road", "Bengaluru"] })).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(hasAddress(null)).toBe(false);
    expect(hasAddress(undefined)).toBe(false);
  });

  it("rejects an empty lines array", () => {
    // Saved and then cleared. Truthy object, no address — the case a plain
    // null check gets wrong.
    expect(hasAddress({ lines: [] })).toBe(false);
  });

  it("rejects lines that are only whitespace", () => {
    expect(hasAddress({ lines: ["", "   "] })).toBe(false);
  });

  it("accepts when at least one line has content", () => {
    expect(hasAddress({ lines: ["", "Bengaluru"] })).toBe(true);
  });

  it("rejects a shape it does not recognise rather than throwing", () => {
    expect(hasAddress({ street: "12 MG Road" })).toBe(false);
    expect(hasAddress("12 MG Road")).toBe(false);
    expect(hasAddress({ lines: "12 MG Road" })).toBe(false);
  });
});

describe("addDays", () => {
  it("adds the usual payment terms", () => {
    expect(addDays("2026-09-03", 0)).toBe("2026-09-03");
    expect(addDays("2026-09-03", 7)).toBe("2026-09-10");
    expect(addDays("2026-09-03", 30)).toBe("2026-10-03");
  });

  it("crosses a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-20", 30)).toBe("2027-01-19");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("stays on the same calendar day regardless of local timezone", () => {
    // The bug this guards: parsing in local time can land on the previous
    // evening, making a Net 30 invoice fall due on day 29.
    expect(addDays("2026-09-03", 30)).toBe("2026-10-03");
    expect(addDays("2026-09-03", 0)).toBe("2026-09-03");
  });

  it("returns empty for an unparseable date rather than throwing", () => {
    expect(addDays("", 30)).toBe("");
    expect(addDays("not-a-date", 30)).toBe("");
  });
});
