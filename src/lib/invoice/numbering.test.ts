import { describe, expect, it } from "vitest";

import { getInvoiceSeries } from "@/lib/regions";
import {
  DEFAULT_PREFIX,
  formatInvoiceNumber,
  peekNextInvoiceNumber,
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

/**
 * A stand-in for `db` that answers the counter lookup and records every method
 * the caller reaches for. No Postgres: what is under test is which number the
 * preview arrives at, and that getting there only ever reads.
 */
function fakeDb(rows: { lastNumber: number; prefix: string | null }[]) {
  const methods: string[] = [];

  const chain: unknown = new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== "string") return undefined;
        methods.push(property);
        if (property === "limit") return async () => rows;
        return () => chain;
      },
    },
  );

  return { db: chain as Parameters<typeof peekNextInvoiceNumber>[0], methods };
}

const ISSUED = new Date("2026-09-03T00:00:00Z");

describe("peekNextInvoiceNumber", () => {
  it("shows the number after the one last used", async () => {
    const { db } = fakeDb([{ lastNumber: 7, prefix: "RIYA" }]);

    expect(await peekNextInvoiceNumber(db, "user-1", "IN", ISSUED)).toBe(
      "RIYA/FY2026-27/0008",
    );
  });

  it("starts a user with no counter row at 0001", async () => {
    // First invoice ever, or first of a new financial year: the counter row is
    // created by the reservation, not by the preview.
    const { db } = fakeDb([]);

    expect(await peekNextInvoiceNumber(db, "user-1", "IN", ISSUED)).toBe(
      `${DEFAULT_PREFIX}/FY2026-27/0001`,
    );
  });

  it("falls back to the default prefix when the counter has none", async () => {
    const { db } = fakeDb([{ lastNumber: 3, prefix: null }]);

    expect(await peekNextInvoiceNumber(db, "user-1", "IN", ISSUED)).toBe(
      `${DEFAULT_PREFIX}/FY2026-27/0004`,
    );
  });

  it("uses the series the issue date falls in, not today's", async () => {
    // Back-dating an invoice to 31 March must number it in the old year.
    const { db } = fakeDb([{ lastNumber: 9, prefix: null }]);

    expect(
      await peekNextInvoiceNumber(
        db,
        "user-1",
        "IN",
        new Date("2026-03-31T00:00:00Z"),
      ),
    ).toBe(`${DEFAULT_PREFIX}/FY2025-26/0010`);
  });

  /**
   * The preview must not consume a number. A number reserved for a form the
   * user then abandons is a gap in the series, and a gap in a GST series is
   * the thing the numbering module exists to prevent.
   */
  it("reserves nothing — two previews return the same number", async () => {
    const { db, methods } = fakeDb([{ lastNumber: 7, prefix: null }]);

    const first = await peekNextInvoiceNumber(db, "user-1", "IN", ISSUED);
    const second = await peekNextInvoiceNumber(db, "user-1", "IN", ISSUED);

    expect(second).toBe(first);
    expect(methods).toContain("select");
    for (const write of ["insert", "update", "delete", "execute", "transaction"]) {
      expect(methods).not.toContain(write);
    }
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
