import { describe, expect, it } from "vitest";

import { getInvoiceSeries } from "@/lib/regions";
import {
  DEFAULT_PREFIX,
  formatInvoiceNumber,
  peekNextInvoiceNumber,
  reserveInvoiceNumber,
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

/**
 * A stand-in for a transaction handle. It answers the upsert with whatever the
 * driver would have returned and records the statement, and its `select`
 * throws: reserving a number must never read the counter and write it back,
 * because two concurrent requests would both read the same value and issue the
 * same invoice number.
 */
function fakeTx(rows: unknown) {
  type Tx = Parameters<typeof reserveInvoiceNumber>[0];
  const statements: string[] = [];

  const tx = {
    execute: async (query: Parameters<Tx["execute"]>[0]) => {
      statements.push(JSON.stringify(query));
      return rows;
    },
    select: (() => {
      throw new Error("reserveInvoiceNumber must not read the counter row");
    }) as Tx["select"],
  };

  return { tx: tx as Tx, statements };
}

describe("reserveInvoiceNumber", () => {
  it("issues the first number of a series", async () => {
    const { tx } = fakeTx([{ last_number: 1, prefix: null }]);

    expect(await reserveInvoiceNumber(tx, "user-1", "IN", ISSUED)).toEqual({
      invoiceNumber: "INV/FY2026-27/0001",
      series: "FY2026-27",
      sequence: 1,
    });
  });

  it("issues the number the counter came back with, under the user's prefix", async () => {
    const { tx } = fakeTx([{ last_number: 8, prefix: "RIYA" }]);

    expect(await reserveInvoiceNumber(tx, "user-1", "IN", ISSUED)).toEqual({
      invoiceNumber: "RIYA/FY2026-27/0008",
      series: "FY2026-27",
      sequence: 8,
    });
  });

  it("numbers a back-dated invoice in the series it was issued in", async () => {
    // An invoice dated 31 March belongs to the financial year that is ending,
    // whatever today is. Numbering it in the new year would leave a gap in one
    // series and an out-of-order number in the other.
    const { tx } = fakeTx([{ last_number: 42, prefix: null }]);

    const result = await reserveInvoiceNumber(
      tx,
      "user-1",
      "IN",
      new Date("2026-03-31T00:00:00Z"),
    );

    expect(result.series).toBe("FY2025-26");
    expect(result.invoiceNumber).toBe("INV/FY2025-26/0042");
  });

  it("uses the plain calendar year for a calendar-year country", async () => {
    const { tx } = fakeTx([{ last_number: 3, prefix: null }]);

    expect(await reserveInvoiceNumber(tx, "user-1", "US", ISSUED)).toEqual({
      invoiceNumber: "INV/2026/0003",
      series: "2026",
      sequence: 3,
    });
  });

  it("reads a counter the driver hands back as a string", async () => {
    // postgres.js returns some numeric columns as strings. Left as one, the
    // sequence would go into the `sequence` column and every later comparison
    // as text — "10" < "9" — even though the printed number looks right.
    const { tx } = fakeTx([{ last_number: "8", prefix: null }]);

    const result = await reserveInvoiceNumber(tx, "user-1", "IN", ISSUED);

    expect(result.sequence).toBe(8);
    expect(result.invoiceNumber).toBe("INV/FY2026-27/0008");
  });

  it("refuses to invent a number when the upsert returns nothing", async () => {
    // Better to fail the transaction than to write an invoice with a made-up
    // or duplicated number.
    const { tx } = fakeTx([]);

    await expect(
      reserveInvoiceNumber(tx, "user-1", "IN", ISSUED),
    ).rejects.toThrow(/reserve/);
  });

  it("refuses a result that is not a row set", async () => {
    const { tx } = fakeTx(undefined);

    await expect(
      reserveInvoiceNumber(tx, "user-1", "IN", ISSUED),
    ).rejects.toThrow(/reserve/);
  });

  /**
   * The no-gaps, no-duplicates guarantee comes entirely from the row lock that
   * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` takes. Concurrency cannot
   * be unit tested, but the shape it depends on can: one statement, an upsert,
   * and no read of the counter beforehand.
   */
  it("takes the number in a single atomic statement", async () => {
    const { tx, statements } = fakeTx([{ last_number: 1, prefix: null }]);

    await reserveInvoiceNumber(tx, "user-1", "IN", ISSUED);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain("ON CONFLICT");
    expect(statements[0]).toContain("DO UPDATE");
    expect(statements[0]).toContain("RETURNING");
  });

  it("scopes the counter to the user and the series", async () => {
    // This connection bypasses RLS, so the user filter has to be in the
    // statement. Without it a counter would be shared across accounts.
    const { tx, statements } = fakeTx([{ last_number: 1, prefix: null }]);

    await reserveInvoiceNumber(tx, "user-1", "IN", ISSUED);

    expect(statements[0]).toContain("user-1");
    expect(statements[0]).toContain("FY2026-27");
  });
});

describe("peekNextInvoiceNumber — calendar-year countries", () => {
  it("previews against the calendar-year series", async () => {
    const { db } = fakeDb([{ lastNumber: 11, prefix: null }]);

    expect(await peekNextInvoiceNumber(db, "user-1", "US", ISSUED)).toBe(
      `${DEFAULT_PREFIX}/2026/0012`,
    );
  });
});

describe("seriesResetsOn — financial-year countries", () => {
  it("names July for Australia", () => {
    // Australia's year starts in July, not April: telling an Australian user
    // their numbering resets in April would be advice about another country.
    expect(seriesResetsOn("AU")).toContain("July");
    expect(seriesResetsOn("AU")).not.toContain("April");
  });

  it("names 1 January for an unconfigured country", () => {
    expect(seriesResetsOn(null)).toBe("1 January");
  });
});

/**
 * One format for every country. The January branch was hardcoded "1 January"
 * while the rest came from en's month-first ordering as "April 1", so the same
 * sentence in the UI read differently depending on where the user was.
 */
describe("seriesResetsOn formatting", () => {
  it("is day-first for every fiscal year start", () => {
    expect(seriesResetsOn("IN")).toBe("1 April");
    expect(seriesResetsOn("AU")).toBe("1 July");
    expect(seriesResetsOn("US")).toBe("1 January");
    expect(seriesResetsOn("GB")).toBe("1 January");
    // An unconfigured country falls back to a calendar year.
    expect(seriesResetsOn(null)).toBe("1 January");
  });
});
