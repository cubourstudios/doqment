import { describe, expect, it } from "vitest";

import {
  COUNTRIES,
  FALLBACK_COUNTRY,
  getCountryConfig,
  getInvoiceSeries,
} from "./regions";

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

describe("getInvoiceSeries — how the date and country actually arrive", () => {
  it("reads the date-only string the issue-date input submits", () => {
    // The invoice action does `new Date(input.issueDate)` on a "YYYY-MM-DD"
    // value, which is parsed as UTC midnight. The series is derived with
    // getUTC*, so the calendar day the freelancer picked is the day that
    // decides the financial year — on a server in any timezone.
    expect(getInvoiceSeries("IN", new Date("2026-04-01"))).toBe("FY2026-27");
    expect(getInvoiceSeries("IN", new Date("2026-03-31"))).toBe("FY2025-26");
  });

  it("reads a lower-case country code", () => {
    // profiles.country is a varchar; nothing forces its case. An Indian
    // profile stored as "in" falling through to the calendar-year fallback
    // would number a GST invoice in the wrong series.
    expect(getInvoiceSeries("in", new Date("2026-04-01T00:00:00Z"))).toBe(
      "FY2026-27",
    );
    expect(getInvoiceSeries("au", new Date("2026-07-01T00:00:00Z"))).toBe(
      "FY2026-27",
    );
  });

  it("pads a century-crossing end year for a July financial year too", () => {
    expect(getInvoiceSeries("AU", new Date("2099-07-01T00:00:00Z"))).toBe(
      "FY2099-00",
    );
  });

  it("is deterministic — the same date and country give the same string", () => {
    // The series is half of the numbering key, so a series that varied by
    // call would be a duplicate invoice number.
    const date = new Date("2026-04-01T00:00:00Z");
    expect(getInvoiceSeries("IN", date)).toBe(getInvoiceSeries("IN", date));
  });
});

/**
 * Adding a country is meant to be a row in CONFIGS plus its templates, so a
 * typo there is the whole of the bug. None of these are checkable at the type
 * level.
 */
describe("country configuration", () => {
  it("has no duplicate country codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every country a usable currency, name and region", () => {
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.currency).toMatch(/^[A-Z]{3}$/);
      expect(country.name.length).toBeGreaterThan(1);
      expect(["IN", "US", "INTL"]).toContain(country.region);
    }
  });

  it("gives every country a real month to start its financial year in", () => {
    // A 0 or a 13 here produces a series that never turns over, or turns over
    // on a month that does not exist.
    for (const country of COUNTRIES) {
      expect(Number.isInteger(country.fiscalYearStartMonth)).toBe(true);
      expect(country.fiscalYearStartMonth).toBeGreaterThanOrEqual(1);
      expect(country.fiscalYearStartMonth).toBeLessThanOrEqual(12);
    }
  });

  it("turns every country's series over exactly once in twelve months", () => {
    // Walked from each country's own fiscal start, two years must be two
    // series: a series that changes mid-year would restart the sequence and
    // duplicate numbers, and one that never changes never restarts it.
    for (const country of COUNTRIES) {
      const seen = Array.from({ length: 24 }, (_, offset) =>
        getInvoiceSeries(
          country.code,
          new Date(
            Date.UTC(2026, country.fiscalYearStartMonth - 1 + offset, 1),
          ),
        ),
      );

      expect(new Set(seen).size).toBe(2);
      expect(seen.slice(0, 12).every((s) => s === seen[0])).toBe(true);
      expect(seen.slice(12).every((s) => s === seen[12])).toBe(true);
    }
  });

  it("produces a series that is safe to put in an invoice number", () => {
    // The series is interpolated into "INV/<series>/0001", so anything with a
    // slash or a space in it would make the number unparseable.
    for (const country of [...COUNTRIES.map((c) => c.code), "ZZ", null]) {
      for (const month of [0, 3, 6, 11]) {
        expect(getInvoiceSeries(country, new Date(Date.UTC(2026, month, 15))))
          .toMatch(/^(FY\d{4}-\d{2}|\d{4})$/);
      }
    }
  });

  it("does not let an unknown country mutate the shared fallback", () => {
    // getCountryConfig returns a copy with the code swapped in; mutating the
    // exported constant instead would make the next user's country "ZZ".
    getCountryConfig("ZZ");
    expect(FALLBACK_COUNTRY.code).toBe("XX");
    expect(getCountryConfig(null).code).toBe("XX");
  });
});
