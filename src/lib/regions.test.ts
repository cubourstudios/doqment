import { describe, expect, it } from "vitest";

import { getCountryConfig, getInvoiceSeries } from "./regions";

/**
 * The series is half of the invoice numbering key, so a wrong answer here means
 * duplicate invoice numbers — the one failure mode the PRD calls out as
 * unacceptable. The boundary cases are what matter.
 */
describe("getInvoiceSeries", () => {
  describe("India (April–March financial year)", () => {
    it("puts April 1st in the year that is starting", () => {
      expect(getInvoiceSeries("IN", new Date("2026-04-01T00:00:00Z"))).toBe(
        "FY2026-27",
      );
    });

    it("puts March 31st in the year that is ending", () => {
      expect(getInvoiceSeries("IN", new Date("2026-03-31T23:59:59Z"))).toBe(
        "FY2025-26",
      );
    });

    it("keeps January in the financial year that began the previous April", () => {
      expect(getInvoiceSeries("IN", new Date("2027-01-15T00:00:00Z"))).toBe(
        "FY2026-27",
      );
    });

    it("pads a century-crossing end year to two digits", () => {
      expect(getInvoiceSeries("IN", new Date("2099-06-01T00:00:00Z"))).toBe(
        "FY2099-00",
      );
    });
  });

  describe("calendar-year countries", () => {
    it("uses the plain year for the US", () => {
      expect(getInvoiceSeries("US", new Date("2026-04-01T00:00:00Z"))).toBe(
        "2026",
      );
    });

    it("rolls over at the January boundary", () => {
      expect(getInvoiceSeries("US", new Date("2025-12-31T23:59:59Z"))).toBe(
        "2025",
      );
      expect(getInvoiceSeries("US", new Date("2026-01-01T00:00:00Z"))).toBe(
        "2026",
      );
    });
  });

  describe("Australia (July–June financial year)", () => {
    it("starts a new series in July", () => {
      expect(getInvoiceSeries("AU", new Date("2026-07-01T00:00:00Z"))).toBe(
        "FY2026-27",
      );
      expect(getInvoiceSeries("AU", new Date("2026-06-30T00:00:00Z"))).toBe(
        "FY2025-26",
      );
    });
  });

  it("falls back to a calendar year for an unknown country", () => {
    expect(getInvoiceSeries("ZZ", new Date("2026-04-01T00:00:00Z"))).toBe(
      "2026",
    );
    expect(getInvoiceSeries(null, new Date("2026-04-01T00:00:00Z"))).toBe(
      "2026",
    );
  });
});

describe("getCountryConfig", () => {
  it("returns the configured country", () => {
    const india = getCountryConfig("IN");
    expect(india.currency).toBe("INR");
    expect(india.taxIdLabel).toBe("GSTIN");
    expect(india.region).toBe("IN");
  });

  it("is case-insensitive", () => {
    expect(getCountryConfig("in").currency).toBe("INR");
  });

  it("falls back to the international config but keeps the country code", () => {
    const unknown = getCountryConfig("ZZ");
    expect(unknown.region).toBe("INTL");
    expect(unknown.code).toBe("ZZ");
  });

  it("falls back when no country has been set yet", () => {
    expect(getCountryConfig(null).region).toBe("INTL");
  });
});
