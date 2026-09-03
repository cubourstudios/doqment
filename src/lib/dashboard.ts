import { and, count, desc, eq, isNull, lt, ne } from "drizzle-orm";

import { db } from "@/db";
import { clients, documents, invoices, projects } from "@/db/schema";
import { fromDecimalString } from "@/lib/invoice/money";

/**
 * Dashboard figures.
 *
 * The one number a freelancer actually wants on opening this app is how much
 * they are owed, so that is what the dashboard leads with. Everything else is
 * secondary.
 */

export type DashboardData = {
  outstanding: { amount: bigint; count: number; currency: string };
  overdue: { amount: bigint; count: number };
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
      count: unpaidRows.length,
      currency: defaultCurrency,
    },
    overdue: {
      amount: sumTotals(overdueRows, defaultCurrency),
      count: overdueRows.length,
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
