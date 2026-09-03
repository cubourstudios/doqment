import { and, eq, sql } from "drizzle-orm";

import { invoiceCounters } from "@/db/schema";
import { getCountryConfig, getInvoiceSeries } from "@/lib/regions";

/**
 * Invoice numbering.
 *
 * Two properties matter legally, not just aesthetically: numbers within a
 * series must have no duplicates and no gaps. Indian GST rules require a
 * consecutive serial number per financial year, and a missing number invites
 * the question of what was on the invoice that was removed.
 *
 * Both properties come from one thing — the row lock taken by
 * `UPDATE ... RETURNING` on the counter row. Reading a counter and then writing
 * it back would race under concurrent requests and issue the same number twice.
 */

/** Formats as PREFIX/SERIES/0001 — e.g. "INV/FY2026-27/0007". */
export function formatInvoiceNumber(
  prefix: string,
  series: string,
  sequence: number,
): string {
  return `${prefix}/${series}/${String(sequence).padStart(4, "0")}`;
}

export const DEFAULT_PREFIX = "INV";

/**
 * Reserve the next number in the user's current series.
 *
 * MUST run inside the same transaction as the invoice insert. Taken alone, a
 * number can be reserved and then lost if the insert fails — which is a gap.
 *
 * The upsert makes first use and subsequent use the same code path: a user with
 * no counter row for this financial year gets one atomically rather than
 * through a check-then-insert that two requests could both pass.
 */
export async function reserveInvoiceNumber(
  tx: {
    execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
    select: (...args: never[]) => never;
  },
  userId: string,
  country: string | null,
  issueDate: Date,
): Promise<{ invoiceNumber: string; series: string; sequence: number }> {
  const series = getInvoiceSeries(country, issueDate);

  // ON CONFLICT ... DO UPDATE both creates the row and increments it, and the
  // conflicting insert blocks on the row lock rather than failing.
  const rows = (await tx.execute(sql`
    INSERT INTO invoice_counters (user_id, series, last_number)
    VALUES (${userId}, ${series}, 1)
    ON CONFLICT (user_id, series)
    DO UPDATE SET last_number = invoice_counters.last_number + 1
    RETURNING last_number, prefix
  `)) as unknown as Array<{ last_number: number; prefix: string | null }>;

  const row = Array.isArray(rows) ? rows[0] : undefined;

  if (!row) {
    throw new Error("failed to reserve an invoice number");
  }

  const sequence = Number(row.last_number);

  return {
    invoiceNumber: formatInvoiceNumber(
      row.prefix ?? DEFAULT_PREFIX,
      series,
      sequence,
    ),
    series,
    sequence,
  };
}

/**
 * What the next number will look like, for display before anything is saved.
 *
 * Explicitly a preview: it reserves nothing, so a concurrent invoice can take
 * the number between showing it and saving. Never store this.
 */
export async function peekNextInvoiceNumber(
  db: {
    select: typeof import("@/db").db.select;
  },
  userId: string,
  country: string | null,
  issueDate: Date,
): Promise<string> {
  const series = getInvoiceSeries(country, issueDate);

  const [counter] = await db
    .select({
      lastNumber: invoiceCounters.lastNumber,
      prefix: invoiceCounters.prefix,
    })
    .from(invoiceCounters)
    .where(
      and(
        eq(invoiceCounters.userId, userId),
        eq(invoiceCounters.series, series),
      ),
    )
    .limit(1);

  return formatInvoiceNumber(
    counter?.prefix ?? DEFAULT_PREFIX,
    series,
    (counter?.lastNumber ?? 0) + 1,
  );
}

/** Where a country's invoice series turns over, for explaining it in the UI. */
export function seriesResetsOn(country: string | null): string {
  const { fiscalYearStartMonth } = getCountryConfig(country);

  return fiscalYearStartMonth === 1
    ? "1 January"
    : new Date(2000, fiscalYearStartMonth - 1, 1).toLocaleDateString("en", {
        day: "numeric",
        month: "long",
      });
}
