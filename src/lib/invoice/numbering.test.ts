import { describe, expect, it } from "vitest";

import { getInvoiceSeries } from "@/lib/regions";
import {
  DEFAULT_PREFIX,
  formatInvoiceNumber,
  seriesResetsOn,
} from "./numbering";

describe("formatInvoiceNumber", () => {
  it("pads the sequence to four digits", () => {
    expect(formatInvoiceNumber("INV", "FY2026-27", 7)).toBe(
      "INV/FY2026-27/0007",
    );
  });

  it("does not truncate past four digits", () => {
    // A prolific user's 10,000th invoice must still be a valid number.
    expect(formatInvoiceNumber("INV", "FY2026-27", 12345)).toBe(
      "INV/FY2026-27/12345",
    );
  });

  it("honours a custom prefix", () => {
    expect(formatInvoiceNumber("RIYA", "FY2026-27", 1)).toBe(
      "RIYA/FY2026-27/0001",
    );
  });

  it("sorts lexicographically in issue order within a series", () => {
    // Padding exists so that a plain string sort matches chronological order.
    const numbers = [3, 1, 20, 2].map((n) =>
      formatInvoiceNumber(DEFAULT_PREFIX, "FY2026-27", n),
    );

    expect([...numbers].sort()).toEqual([
      "INV/FY2026-27/0001",
      "INV/FY2026-27/0002",
      "INV/FY2026-27/0003",
      "INV/FY2026-27/0020",
    ]);
  });
});

/**
 * Series derivation decides when the sequence resets. Getting the boundary
 * wrong means either a duplicate number in a new year or a series that never
 * resets — both are compliance problems in India.
 */
describe("series boundaries", () => {
  it("puts April in the new Indian financial year", () => {
    expect(getInvoiceSeries("IN", new Date("2026-04-01T00:00:00Z"))).toBe(
      "FY2026-27",
    );
  });

  it("keeps 31 March in the old Indian financial year", () => {
    expect(getInvoiceSeries("IN", new Date("2026-03-31T00:00:00Z"))).toBe(
      "FY2025-26",
    );
  });

  it("keeps January to March in the year that began the previous April", () => {
    expect(getInvoiceSeries("IN", new Date("2027-01-15T00:00:00Z"))).toBe(
      "FY2026-27",
    );
  });

  it("uses a plain calendar year where the fiscal year starts in January", () => {
    expect(getInvoiceSeries("US", new Date("2026-06-15T00:00:00Z"))).toBe(
      "2026",
    );
    expect(getInvoiceSeries("US", new Date("2026-12-31T00:00:00Z"))).toBe(
      "2026",
    );
    expect(getInvoiceSeries("US", new Date("2027-01-01T00:00:00Z"))).toBe(
      "2027",
    );
  });

  it("gives an unknown country the calendar-year default", () => {
    expect(getInvoiceSeries(null, new Date("2026-06-15T00:00:00Z"))).toBe(
      "2026",
    );
  });

  it("never reuses a number across a boundary, since the series differs", () => {
    const before = getInvoiceSeries("IN", new Date("2026-03-31T00:00:00Z"));
    const after = getInvoiceSeries("IN", new Date("2026-04-01T00:00:00Z"));

    expect(before).not.toBe(after);
    expect(formatInvoiceNumber("INV", before, 1)).not.toBe(
      formatInvoiceNumber("INV", after, 1),
    );
  });
});

describe("seriesResetsOn", () => {
  it("names April for India", () => {
    expect(seriesResetsOn("IN")).toContain("April");
  });

  it("names 1 January for calendar-year countries", () => {
    expect(seriesResetsOn("US")).toBe("1 January");
  });
});
