import { describe, expect, it } from "vitest";

import {
  applyRate,
  formatMinor,
  fromDecimalString,
  lineAmount,
  minorUnitDigits,
  parseAmount,
  parseQuantity,
  roundHalfUp,
  toDecimalString,
} from "./money";

describe("parseAmount", () => {
  it("reads a plain decimal", () => {
    expect(parseAmount("100.50")).toBe(10050n);
  });

  it("reads a whole number", () => {
    expect(parseAmount("100")).toBe(10000n);
  });

  it("accepts thousands separators, which people type", () => {
    expect(parseAmount("1,200.50")).toBe(120050n);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseAmount("  99  ")).toBe(9900n);
  });

  it("pads a single decimal place", () => {
    expect(parseAmount("10.5")).toBe(1050n);
  });

  it("rounds a third decimal place half-up rather than truncating", () => {
    // A user typing 10.005 means 10.01.
    expect(parseAmount("10.005")).toBe(1001n);
    expect(parseAmount("10.004")).toBe(1000n);
  });

  it("handles zero-decimal currencies without inflating them", () => {
    // 100 JPY is 100 minor units, not 10000 — this is a 100x billing error.
    expect(parseAmount("100", "JPY")).toBe(100n);
    expect(minorUnitDigits("JPY")).toBe(0);
  });

  it("returns null rather than zero for junk", () => {
    // Coercing to 0 would put a zero on an invoice.
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("12.34.56")).toBeNull();
    expect(parseAmount("$100")).toBeNull();
  });

  it("reads negatives, so a caller can reject them explicitly", () => {
    expect(parseAmount("-50.25")).toBe(-5025n);
  });
});

describe("roundHalfUp", () => {
  it("rounds a half away from zero", () => {
    expect(roundHalfUp(5n, 2n)).toBe(3n);
    expect(roundHalfUp(-5n, 2n)).toBe(-3n);
  });

  it("rounds below a half down", () => {
    expect(roundHalfUp(4n, 3n)).toBe(1n);
  });

  it("leaves exact division alone", () => {
    expect(roundHalfUp(10n, 5n)).toBe(2n);
  });

  it("refuses to divide by zero", () => {
    expect(() => roundHalfUp(1n, 0n)).toThrow();
  });
});

describe("toDecimalString", () => {
  it("renders minor units as a decimal", () => {
    expect(toDecimalString(10050n)).toBe("100.50");
  });

  it("pads the fraction", () => {
    expect(toDecimalString(5n)).toBe("0.05");
    expect(toDecimalString(50n)).toBe("0.50");
  });

  it("renders zero-decimal currencies without a point", () => {
    expect(toDecimalString(100n, "JPY")).toBe("100");
  });

  it("keeps the sign", () => {
    expect(toDecimalString(-10050n)).toBe("-100.50");
  });

  it("round-trips through the parser", () => {
    for (const value of [0n, 1n, 99n, 10050n, 123456789n]) {
      expect(fromDecimalString(toDecimalString(value))).toBe(value);
    }
  });
});

describe("parseQuantity", () => {
  it("reads a whole quantity", () => {
    expect(parseQuantity("3")).toBe(3000n);
  });

  it("reads fractional hours exactly", () => {
    expect(parseQuantity("1.5")).toBe(1500n);
    expect(parseQuantity("0.25")).toBe(250n);
  });

  it("rounds beyond three decimals", () => {
    expect(parseQuantity("1.0005")).toBe(1001n);
  });

  it("rejects negatives and junk", () => {
    expect(parseQuantity("-1")).toBeNull();
    expect(parseQuantity("many")).toBeNull();
  });
});

describe("lineAmount", () => {
  it("multiplies price by quantity", () => {
    // 3 × ₹100.00
    expect(lineAmount(10000n, 3000n)).toBe(30000n);
  });

  it("handles fractional quantities", () => {
    // 1.5 × ₹100.00 = ₹150.00
    expect(lineAmount(10000n, 1500n)).toBe(15000n);
  });

  it("rounds a fractional paisa half-up", () => {
    // 0.333 × ₹100.00 = ₹33.30
    expect(lineAmount(10000n, 333n)).toBe(3330n);
    // 1.005 × ₹33.33 = ₹33.4966… → ₹33.50
    expect(lineAmount(3333n, 1005n)).toBe(3350n);
  });

  it("avoids the float error that motivates the whole module", () => {
    // 0.1 + 0.2 !== 0.3 in floating point; three lines of ₹0.10 must be ₹0.30.
    const total = lineAmount(10n, 1000n) * 3n;
    expect(toDecimalString(total)).toBe("0.30");
  });
});

describe("applyRate", () => {
  it("applies 18% as basis points", () => {
    expect(applyRate(10000n, 1800)).toBe(1800n);
  });

  it("applies 9% without floating point drift", () => {
    // 9% of ₹1,234.56 = ₹111.1104 → ₹111.11
    expect(applyRate(123456n, 900)).toBe(11111n);
  });

  it("rounds half-up", () => {
    // 5% of ₹0.50 = ₹0.025 → ₹0.03
    expect(applyRate(50n, 500)).toBe(3n);
  });

  it("returns zero for a zero rate", () => {
    expect(applyRate(10000n, 0)).toBe(0n);
  });
});

describe("formatMinor", () => {
  it("formats rupees with the currency symbol", () => {
    expect(formatMinor(120050n, "INR")).toContain("1,200.50");
  });

  it("falls back rather than throwing on an unknown currency", () => {
    expect(formatMinor(10000n, "XYZ")).toContain("100.00");
  });
});
