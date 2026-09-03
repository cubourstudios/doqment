import { and, count, desc, eq, gte, isNull, lt, ne } from "drizzle-orm";

import { db } from "@/db";
import { clients, documents, invoices, projects } from "@/db/schema";
import { fromDecimalString, minorUnitDigits } from "@/lib/invoice/money";

/**
 * Dashboard figures.
 *
 * The one number a freelancer actually wants on opening this app is how much
 * they are owed, so that is what the dashboard leads with. Everything else is
 * secondary.
 */

export type DashboardData = {
  outstanding: {
    amount: bigint;
    count: number;
    currency: string;
    /** Invoices left out of `amount` because they are billed in something else. */
    otherCurrencyCount: number;
  };
  overdue: { amount: bigint; count: number; otherCurrencyCount: number };
  paidThisYear: bigint;
  activeProjects: number;
  recentInvoices: {
    documentId: string;
    invoiceNumber: string;
    total: string;
    currency: string;
    status: string;
    dueDate: string | null;
    clientName: string | null;
  }[];
};

/**
 * Sum invoice totals in minor units.
 *
 * Amounts arrive from `numeric` columns as strings and are converted one at a
 * time rather than summed in SQL, because a mixed-currency account would
 * otherwise silently add rupees to dollars. Freelancers with overseas clients
 * are exactly the users this product targets, so that is not a hypothetical.
 */
function sumTotals(
  rows: { total: string; currency: string }[],
  currency: string,
): bigint {
  return rows
    .filter((row) => row.currency === currency)
    .reduce((total, row) => total + fromDecimalString(row.total, currency), 0n);
}

/**
 * The count that goes with a summed amount.
 *
 * Counting every row while summing only one currency produced a card reading
 * "₹80,000.00 · 3 invoices" where the figure covered two of them, with nothing
 * saying so. The rows left out are reported separately rather than hidden.
 */
function countTotals(
  rows: { currency: string }[],
  currency: string,
): { count: number; otherCurrencyCount: number } {
  const included = rows.filter((row) => row.currency === currency).length;

  return { count: included, otherCurrencyCount: rows.length - included };
}

export type RecentDocument = {
  id: string;
  title: string;
  docType: string;
  createdAt: Date;
  clientName: string | null;
  invoiceStatus: string | null;
  total: string | null;
  currency: string | null;
};

/**
 * The most recent documents of every type, not just invoices.
 *
 * The dashboard used to list invoices alone, which made the other five
 * document types invisible from the home screen — a proposal generated this
 * morning appeared nowhere until you went looking for it. The left join keeps
 * invoice status and amount available for the rows that have them, and null
 * for the rows that do not.
 */
export async function getRecentDocuments(
  userId: string,
  limit = 5,
): Promise<RecentDocument[]> {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      docType: documents.docType,
      createdAt: documents.createdAt,
      clientName: clients.name,
      invoiceStatus: invoices.status,
      total: invoices.total,
      currency: invoices.currency,
    })
    .from(documents)
    .leftJoin(invoices, eq(invoices.documentId, documents.id))
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt))
    .limit(limit);
}

/** One bar on the dashboard chart. */
export type MonthlyTotals = {
  /** "2026-09", for React keys and ordering. */
  month: string;
  /** Axis label: "Sep". */
  label: string;
  /**
   * Major units as plain numbers, not minor-unit bigints.
   *
   * Everything else in this file keeps money in integer minor units for exactly
   * the reasons src/lib/invoice/money.ts sets out. A chart is the one place
   * that cannot: it is drawn in a client component, bigint does not cross the
   * serialisation boundary, and a bar's pixel height is approximate anyway.
   * These are for drawing only — never write them back.
   */
  invoiced: number;
  paid: number;
};

/** The last `months` calendar months, oldest first, including the current one. */
function recentMonths(months: number): { month: string; label: string }[] {
  const now = new Date();
  const out: { month: string; label: string }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({
      month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en", { month: "short", timeZone: "UTC" }),
    });
  }

  return out;
}

/**
 * Invoiced against actually received, by month.
 *
 * The three figures above the chart answer "where do I stand today". This
 * answers the question a freelancer asks next and cannot get from a total:
 * whether the work is trending up, and how far behind the money runs from the
 * invoicing. The gap between the two bars is the whole point of the chart.
 */
export async function getMonthlyTotals(
  userId: string,
  currency: string,
  months = 6,
): Promise<MonthlyTotals[]> {
  const buckets = recentMonths(months);
  const earliest = `${buckets[0].month}-01`;

  const rows = await db
    .select({
      issueDate: invoices.issueDate,
      total: invoices.total,
      currency: invoices.currency,
      status: invoices.status,
    })
    .from(invoices)
    .leftJoin(documents, eq(invoices.documentId, documents.id))
    .where(
      and(
        eq(invoices.userId, userId),
        isNull(documents.deletedAt),
        gte(invoices.issueDate, earliest),
      ),
    );

  const byMonth = new Map(
    buckets.map((b) => [b.month, { ...b, invoiced: 0, paid: 0 }]),
  );

  // Not a hardcoded 100: JPY and the other zero-decimal currencies would come
  // out a hundred times too tall.
  const perMajorUnit = 10 ** minorUnitDigits(currency);

  for (const row of rows) {
    // Mixed currencies are excluded rather than added together, the same way
    // the figures above the chart are.
    if (row.currency !== currency || !row.issueDate) continue;

    const bucket = byMonth.get(row.issueDate.slice(0, 7));
    if (!bucket) continue;

    const amount = Number(fromDecimalString(row.total, currency)) / perMajorUnit;
    bucket.invoiced += amount;
    if (row.status === "paid") bucket.paid += amount;
  }

  return [...byMonth.values()];
}

export async function getDashboardData(
  userId: string,
  defaultCurrency: string,
): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);

  const [unpaidRows, paidRows, activeProjectRows, recentRows] =
    await Promise.all([
      db
        .select({
          total: invoices.total,
          currency: invoices.currency,
          dueDate: invoices.dueDate,
          status: invoices.status,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, userId),
            ne(invoices.status, "paid"),
            ne(invoices.status, "cancelled"),
            ne(invoices.status, "draft"),
          ),
        ),

      db
        .select({ total: invoices.total, currency: invoices.currency })
        .from(invoices)
        .where(and(eq(invoices.userId, userId), eq(invoices.status, "paid"))),

      db
        .select({ value: count() })
        .from(projects)
        .where(
          and(eq(projects.userId, userId), eq(projects.status, "active")),
        ),

      db
        .select({
          documentId: invoices.documentId,
          invoiceNumber: invoices.invoiceNumber,
          total: invoices.total,
          currency: invoices.currency,
          status: invoices.status,
          dueDate: invoices.dueDate,
          clientName: clients.name,
        })
        .from(invoices)
        .leftJoin(documents, eq(invoices.documentId, documents.id))
        .leftJoin(projects, eq(documents.projectId, projects.id))
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(invoices.userId, userId), isNull(documents.deletedAt)))
        .orderBy(desc(invoices.issueDate))
        .limit(5),
    ]);

  // Overdue is derived from the due date rather than trusting the stored
  // status, which only changes when someone opens the invoice. An invoice that
  // quietly passed its due date last week is exactly the one worth surfacing.
  const overdueRows = unpaidRows.filter(
    (row) => row.dueDate !== null && row.dueDate < today,
  );

  return {
    outstanding: {
      amount: sumTotals(unpaidRows, defaultCurrency),
      ...countTotals(unpaidRows, defaultCurrency),
      currency: defaultCurrency,
    },
    overdue: {
      amount: sumTotals(overdueRows, defaultCurrency),
      ...countTotals(overdueRows, defaultCurrency),
    },
    paidThisYear: sumTotals(paidRows, defaultCurrency),
    activeProjects: activeProjectRows[0]?.value ?? 0,
    recentInvoices: recentRows,
  };
}

/**
 * Invoices whose due date has passed but whose status has not caught up.
 *
 * Kept as a query rather than a background job: a cron that rewrites rows would
 * need to be right about time zones and would fight the user's own edits, while
 * a freelancer only needs this to be true when they are looking at it.
 */
export async function markOverdueInvoices(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  await db
    .update(invoices)
    .set({ status: "overdue" })
    .where(
      and(
        eq(invoices.userId, userId),
        eq(invoices.status, "sent"),
        lt(invoices.dueDate, today),
      ),
    );
}
