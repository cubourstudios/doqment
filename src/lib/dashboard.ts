import { and, count, desc, eq, gte, isNull, lt, ne, or } from "drizzle-orm";

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

/** "2026-09" for a year and a zero-indexed month, normalising overflow. */
function monthKey(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * `months` calendar months ending at `lastMonth`, oldest first.
 *
 * The window used to be derived from the server's UTC clock, which quietly
 * dropped data for anyone ahead of UTC: at 00:30 on 1 October in India it is
 * still 30 September in UTC, so October had no bucket and an invoice dated
 * that day matched nothing and vanished from the chart. Invoice issue dates
 * are plain calendar dates with no zone attached, and the server cannot know
 * the reader's; so the window is anchored on the data instead — see the caller.
 */
function monthsEndingAt(
  lastMonth: string,
  months: number,
): { month: string; label: string }[] {
  const [year, month] = lastMonth.split("-").map(Number);
  const out: { month: string; label: string }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push({
      month: monthKey(d.getUTCFullYear(), d.getUTCMonth()),
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
  // A month of slack on each side of the UTC window, so a reader whose local
  // calendar is ahead of or behind UTC still has their newest invoices in the
  // result set. Which months are actually shown is decided below, from the
  // data, so nothing in range can be silently dropped.
  const now = new Date();
  const utcMonth = monthKey(now.getUTCFullYear(), now.getUTCMonth());
  // One month past UTC is as far ahead as any real time zone can be. Anything
  // beyond it is a post-dated or mistyped invoice, and must not be allowed to
  // drag the window with it — see `newest` below.
  const furthest = monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const fetchFrom = `${monthKey(now.getUTCFullYear(), now.getUTCMonth() - months)}-01`;

  const rows = await db
    .select({
      issueDate: invoices.issueDate,
      total: invoices.total,
      currency: invoices.currency,
      status: invoices.status,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .leftJoin(documents, eq(invoices.documentId, documents.id))
    .where(
      and(
        eq(invoices.userId, userId),
        isNull(documents.deletedAt),
        // Either raised in the window or settled in it. Filtering on issue
        // date alone hid exactly the case the chart is for: an invoice raised
        // eight months ago and paid this month never reached the query, so
        // this month's "received" bar was missing the money that arrived.
        or(
          gte(invoices.issueDate, fetchFrom),
          gte(invoices.paidAt, new Date(fetchFrom)),
        ),
      ),
    );

  // End the window at the newest month the user actually has data in, when
  // that is ahead of UTC — which is what stops an invoice dated "today" in a
  // zone ahead of the server falling outside every bucket.
  const newest = rows.reduce((latest, row) => {
    const month = row.issueDate?.slice(0, 7);
    // Capped: one invoice typed as 2062 would otherwise move the whole window
    // to that year, leaving a card headed "last six months" showing six empty
    // bars and hiding every real invoice, permanently.
    if (!month || month > furthest) return latest;
    return month > latest ? month : latest;
  }, utcMonth);

  const byMonth = new Map(
    monthsEndingAt(newest, months).map((b) => [
      b.month,
      { ...b, invoiced: 0, paid: 0 },
    ]),
  );

  // Not a hardcoded 100: JPY and the other zero-decimal currencies would come
  // out a hundred times too tall.
  const perMajorUnit = 10 ** minorUnitDigits(currency);

  for (const row of rows) {
    // Mixed currencies are excluded rather than added together, the same way
    // the figures above the chart are.
    if (row.currency !== currency || !row.issueDate) continue;

    // Amounts come from a `numeric` column and should always parse; a row that
    // somehow does not must not take the whole dashboard down with it.
    let amount: number;
    try {
      amount = Number(fromDecimalString(row.total, currency)) / perMajorUnit;
    } catch {
      continue;
    }

    if (!Number.isFinite(amount)) continue;

    const issuedIn = byMonth.get(row.issueDate.slice(0, 7));
    if (issuedIn) issuedIn.invoiced += amount;

    /*
     * Received is bucketed by when the money arrived, not when the invoice was
     * raised. Using the issue date put a paid invoice in both bars of the same
     * month, which made the one thing this chart exists to show — how far the
     * money lags the work — impossible to see. An invoice issued in April and
     * paid in September belongs in April's "invoiced" and September's
     * "received".
     */
    if (row.status === "paid") {
      const paidMonth = row.paidAt
        ? monthKey(row.paidAt.getUTCFullYear(), row.paidAt.getUTCMonth())
        : // Paid before paid_at was recorded: fall back to the issue month
          // rather than dropping the amount entirely.
          row.issueDate.slice(0, 7);

      const paidIn = byMonth.get(paidMonth);
      if (paidIn) paidIn.paid += amount;
    }
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
