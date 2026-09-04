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

  it("names the field it rejected, so the form can point at it", () => {
    const parsed = invoiceSchema.safeParse({
      ...valid,
      taxRateBasisPoints: 1801,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["taxRateBasisPoints"]);
    }
  });
});

/**
 * The issue date is not just a column: it picks the financial year, which picks
 * the invoice series. `new Date("nonsense")` is an Invalid Date whose year is
 * NaN, and the series formatter turned that into "FYNaN-NaN" — a real invoice
 * number, saved, in a series that can never be reconciled. Rejected here
 * because this is the last place a person can still fix it.
 */
describe("issueDate", () => {
  const withIssueDate = (issueDate: unknown) =>
    invoiceSchema.safeParse({ ...valid, issueDate });

  it("accepts what the date input submits", () => {
    expect(withIssueDate("2026-09-03").success).toBe(true);
  });

  it("rejects free text", () => {
    expect(withIssueDate("nonsense").success).toBe(false);
  });

  it("rejects a date that is not on the calendar", () => {
    // Month 13 and day 00 exist on no calendar; Date.parse gives NaN for both,
    // which is the value that became "FYNaN-NaN".
    expect(withIssueDate("2026-13-45").success).toBe(false);
    expect(withIssueDate("2026-00-10").success).toBe(false);
  });

  it("rejects other date notations rather than guessing at them", () => {
    // "03/09/2026" is the third of September to half the world and the ninth
    // of March to the other half. The form submits ISO; anything else is not
    // a date this schema will interpret.
    for (const value of ["03/09/2026", "2026-9-3", "20260903", "Sep 3 2026"]) {
      expect(withIssueDate(value).success).toBe(false);
    }
  });

  it("is required — an invoice with no issue date has no series", () => {
    expect(withIssueDate("").success).toBe(false);
    expect(withIssueDate(undefined).success).toBe(false);
  });

  it("rejects a timestamp, which would carry a time zone into the series", () => {
    // A date-time near midnight lands in a different day, and near 1 April in
    // a different Indian financial year, depending on the reader's zone.
    expect(withIssueDate("2026-09-03T00:00:00Z").success).toBe(false);
  });
});

describe("dueDate", () => {
  const withDueDate = (dueDate: unknown) =>
    invoiceSchema.safeParse({ ...valid, dueDate });

  it("is optional, since not every invoice sets terms", () => {
    expect(withDueDate("").success).toBe(true);
    expect(withDueDate(undefined).success).toBe(true);
  });

  it("accepts a calendar date", () => {
    expect(withDueDate("2026-10-03").success).toBe(true);
  });

  it("rejects a malformed date rather than letting it through as optional", () => {
    // Optional means "may be absent", not "may be junk": the due date drives
    // the overdue calculation on the dashboard.
    expect(withDueDate("nonsense").success).toBe(false);
    expect(withDueDate("2026-13-45").success).toBe(false);
  });
});

/**
 * The place of supply decides CGST+SGST against IGST, and it is compared
 * against the supplier's two-digit code with a plain `!==`. A loose check here
 * let "9" through, which never matches the "09" stateCodeFromGstin derives, so
 * an intra-state supply came out as IGST — tax under the wrong head, which the
 * client's accountant cannot claim, on an invoice that looks correct.
 *
 * The form never submits this field, so anything in it is hand-crafted.
 */
describe("placeOfSupply", () => {
  it("accepts a two-digit state code", () => {
    for (const code of ["09", "24", "27", "07"]) {
      const parsed = invoiceSchema.safeParse({ ...valid, placeOfSupply: code });
      expect(parsed.success, code).toBe(true);
    }
  });

  it("accepts an absent or empty value, which means 'use the client's state'", () => {
    expect(invoiceSchema.safeParse(valid).success).toBe(true);
    expect(
      invoiceSchema.safeParse({ ...valid, placeOfSupply: "" }).success,
    ).toBe(true);
  });

  it("rejects a single digit, which silently forced IGST", () => {
    expect(
      invoiceSchema.safeParse({ ...valid, placeOfSupply: "9" }).success,
    ).toBe(false);
  });

  it("rejects anything that is not two digits", () => {
    for (const code of ["ab", "0", "123", "0a", " 9", "-1"]) {
      const parsed = invoiceSchema.safeParse({ ...valid, placeOfSupply: code });
      expect(parsed.success, code).toBe(false);
    }
  });
});
