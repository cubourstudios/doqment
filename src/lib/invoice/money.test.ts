import { describe, expect, it } from "vitest";

import {
  applyRate,
  formatDecimal,
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

describe("grouping by currency", () => {
  /**
   * en-IN groups in lakhs, which is right for rupees and wrong for every other
   * currency the app supports — a US freelancer was shown $1,23,456.78.
   */
  it("groups rupees in lakhs", () => {
    expect(formatMinor(12345678n, "INR")).toBe("₹1,23,456.78");
  });

  it("groups every other currency in thousands", () => {
    expect(formatMinor(12345678n, "USD")).toBe("$123,456.78");
    expect(formatMinor(12345678n, "EUR")).toBe("€123,456.78");
  });

  it("picks the grouping from the currency, not the currency's case", () => {
    // Currency codes arrive from a `varchar` column and from form values, and
    // nothing guarantees the case. "inr" grouped in thousands would show an
    // Indian user $-style digits on their own invoice.
    expect(formatMinor(12345678n, "inr")).toBe("₹1,23,456.78");
  });

  it("groups a zero-decimal currency in thousands and prints no fraction", () => {
    // JPY has no minor unit; a trailing ".00" here is a hundredfold-looking
    // amount to a Japanese client.
    expect(formatMinor(12345678n, "JPY")).toBe("¥12,345,678");
  });

  it("keeps lakh grouping below the point where the locales agree", () => {
    // Under ₹1,00,000 en-IN and en-US group identically, so a test only at
    // lakh scale could pass with either locale hardcoded. This pins the pair.
    expect(formatMinor(9999999n, "INR")).toBe("₹99,999.99");
    expect(formatMinor(9999999n, "USD")).toBe("$99,999.99");
  });
});

/**
 * The path the UI actually takes: totals reach a page as decimal strings read
 * straight from `numeric` columns, so this is where the lakh-versus-thousands
 * bug was visible to a user.
 */
describe("formatDecimal", () => {
  it("groups a stored rupee total in lakhs", () => {
    expect(formatDecimal("118000.00", "INR")).toBe("₹1,18,000.00");
  });

  it("groups a stored total in every other currency in thousands", () => {
    expect(formatDecimal("123456.78", "USD")).toBe("$123,456.78");
  });

  it("agrees with formatMinor for the same amount", () => {
    // Two entry points to one formatter; a fix applied to only one of them is
    // how a total and its line items end up grouped differently on one page.
    expect(formatDecimal("123456.78", "INR")).toBe(
      formatMinor(12345678n, "INR"),
    );
  });

  it("shows a malformed stored value rather than blanking the page", () => {
    // A bad row is a support ticket; a thrown error inside a server component
    // is a blank dashboard for everything else on it too.
    expect(formatDecimal("not a number", "INR")).toBe("INR not a number");
  });
});

/**
 * Half-up on a negative is the case JavaScript gets wrong for free:
 * Math.round(-0.5) is -0, and bigint division truncates towards zero. A credit
 * or an adjustment entered as a negative amount must round the same distance
 * from zero as the positive it reverses, or the two do not cancel.
 */
describe("rounding a negative amount", () => {
  it("rounds a negative half away from zero", () => {
    // -10.005 is -10.01, the mirror of 10.005 -> 10.01.
    expect(parseAmount("-10.005")).toBe(-1001n);
    expect(parseAmount("-10.004")).toBe(-1000n);
  });

  it("mirrors the positive exactly", () => {
    for (const value of ["0.005", "1.005", "12.345", "99.999"]) {
      expect(parseAmount(`-${value}`)).toBe(-parseAmount(value)!);
    }
  });

  it("renders a negative zero-decimal amount without a point", () => {
    expect(toDecimalString(-100n, "JPY")).toBe("-100");
  });

  it("formats a negative rupee amount with the sign outside the symbol", () => {
    expect(formatMinor(-12345678n, "INR")).toBe("-₹1,23,456.78");
  });
});

/**
 * Zero-decimal currencies are the 100x error the module opens by warning
 * about, and every conversion has to agree about the digit count or the error
 * appears at whichever step disagrees.
 */
describe("zero-decimal currencies", () => {
  it("reads the digit count from the currency, not its case", () => {
    // Currency codes come from a `varchar` column and from form values. "jpy"
    // treated as a two-decimal currency is a hundredfold overcharge.
    expect(minorUnitDigits("jpy")).toBe(0);
    expect(minorUnitDigits("JPY")).toBe(0);
    expect(minorUnitDigits("inr")).toBe(2);
  });

  it("rounds a decimal a user typed into a yen field", () => {
    // There is no half yen: 100.5 is 101, and 100.4 is 100.
    expect(parseAmount("100.5", "JPY")).toBe(101n);
    expect(parseAmount("100.4", "JPY")).toBe(100n);
  });

  it("round-trips through the `numeric` column representation", () => {
    for (const value of [0n, 1n, 100n, 12345n, -12345n]) {
      expect(fromDecimalString(toDecimalString(value, "JPY"), "JPY")).toBe(
        value,
      );
    }
  });

  it("formats a stored yen total with no fraction", () => {
    expect(formatDecimal("5000", "JPY")).toBe("¥5,000");
  });
});

describe("fromDecimalString", () => {
  it("throws rather than returning zero for a value that is not a decimal", () => {
    // Callers treat the result as money; a silent 0 would be a wrong invoice
    // rather than a visible failure.
    expect(() => fromDecimalString("not a number")).toThrow();
    expect(() => fromDecimalString("")).toThrow();
  });
});

describe("exactness past the float boundary", () => {
  it("rounds a line exactly on a half-paisa tie", () => {
    // 1.5 x ₹0.05 = ₹0.075. Truncating instead of rounding half-up loses a
    // paisa on every such line, and the printed lines stop adding up.
    expect(lineAmount(5n, 1500n)).toBe(8n);
    expect(lineAmount(3n, 500n)).toBe(2n);
  });

  it("applies a rate exactly above 2^53 minor units", () => {
    // Not a realistic invoice — it is where a rewrite in `number` would first
    // go silently wrong. 18% of 9007199254741008 paise is
    // 1621295865853381.44, so 1621295865853381; the double path multiplies
    // past 53 bits of mantissa and answers one paisa more.
    expect(applyRate(9007199254741008n, 1800)).toBe(1621295865853381n);
  });

  it("keeps a total exact where a double would not represent it", () => {
    expect(fromDecimalString("90071992547410.08")).toBe(9007199254741008n);
    expect(toDecimalString(9007199254741008n)).toBe("90071992547410.08");
  });
});
