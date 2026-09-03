import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlusIcon, PlusIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import {
  getDashboardData,
  getMonthlyTotals,
  getRecentDocuments,
  markOverdueInvoices,
} from "@/lib/dashboard";
import { getAllowance } from "@/lib/billing/allowance";
import { getUserPlan } from "@/lib/billing/plans";
import { AllowanceStrip } from "@/components/app/allowance-strip";
import { RecentDocuments } from "@/components/app/recent-documents";
import { RevenueChart } from "@/components/app/revenue-chart";
import { formatMinor } from "@/lib/invoice/money";
import { INVOICE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { invoiceStatusEnum } from "@/db/schema";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  const { userId, profile } = await requireProfile();
  const currency = profile.currency ?? "INR";

  // Catch up any invoice that quietly passed its due date since the last visit,
  // before reading the figures that depend on it.
  await markOverdueInvoices(userId);

  // Both reads hit the same tables; running them together rather than in
  // sequence keeps the dashboard to one round trip's worth of waiting.
  const [data, monthly, recentDocuments] = await Promise.all([
    getDashboardData(userId, currency),
    getMonthlyTotals(userId, currency),
    getRecentDocuments(userId),
  ]);

  // TODO(credits): mocked. See src/lib/billing/allowance.ts.
  const allowance = getAllowance(await getUserPlan(userId), currency);
  const firstName = profile.name?.split(" ")[0];

  const nothingYet =
    data.outstanding.count === 0 &&
    data.activeProjects === 0 &&
    data.recentInvoices.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        {firstName ? `Hello, ${firstName}` : "Hello"}
      </h1>

      <AllowanceStrip allowance={allowance} />

      {nothingYet ? (
        <div className="mt-8 grid place-items-center gap-4 rounded-lg border border-dashed px-6 py-12 text-center">
          <FolderPlusIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            Two ways in. Start a project and we&apos;ll work out which documents
            it needs — or go straight to the one document you came for.
          </p>
          {/* Both entry modes, not just projects: someone who arrived needing
              an NDA today should not have to model their business first. */}
          <div className="grid w-full max-w-sm gap-2 sm:grid-cols-2">
            <Button asChild className="w-full">
              <Link href="/projects/new">New project</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/documents/new">Create a document</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/*
            Money owed leads, because it is the thing a freelancer opens this
            app to find out.

            Outstanding gets its own full-width tile and the other two share a
            row beneath it. Three equal stacked cards cost two and a half
            screens of scrolling on a phone before anything else was reachable,
            which buried the invoice list under the numbers nobody opened the
            app for.
          */}
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            <Stat
              label="Outstanding"
              value={formatMinor(data.outstanding.amount, currency)}
              detail={invoiceCountDetail(
                data.outstanding.count,
                data.outstanding.otherCurrencyCount,
              )}
              emphasis
            />
            <Stat
              label="Overdue"
              value={formatMinor(data.overdue.amount, currency)}
              detail={invoiceCountDetail(
                data.overdue.count,
                data.overdue.otherCurrencyCount,
              )}
              alert={data.overdue.count > 0}
            />
            <Stat
              label="Paid"
              value={formatMinor(data.paidThisYear, currency)}
              detail="Received to date"
            />
          </div>

          <Card className="mt-4">
            <CardContent className="px-4">
              <h2 className="mb-1 text-sm font-medium">Last six months</h2>
              <RevenueChart data={monthly} currency={currency} />
            </CardContent>
          </Card>

          {/* Two entry modes, equal weight, both one tap from here. */}
          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:max-w-md">
            <Button asChild className="w-full">
              <Link href="/projects/new">
                <PlusIcon />
                New project
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/documents/new">
                <PlusIcon />
                Create a document
              </Link>
            </Button>
          </div>

          {recentDocuments.length > 0 ? (
            <section className="mt-8">
              <div className="flex items-center justify-between">
                {/* Every type, not just invoices — a proposal written this
                    morning used to be invisible from the home screen. */}
                <h2 className="font-semibold">Recent documents</h2>
                <Link
                  href="/documents"
                  className="text-muted-foreground hover:text-foreground -my-2 inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
                >
                  All documents
                </Link>
              </div>

              <RecentDocuments rows={recentDocuments} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * The stat cards sum one currency. Saying so is better than a count that
 * silently covers more invoices than the figure above it.
 */
function invoiceCountDetail(count: number, otherCurrencyCount: number): string {
  const invoices = `${count} invoice${count === 1 ? "" : "s"}`;

  return otherCurrencyCount > 0
    ? `${invoices} · ${otherCurrencyCount} in another currency`
    : invoices;
}

function Stat({
  label,
  value,
  detail,
  emphasis,
  alert,
}: {
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
  alert?: boolean;
}) {
  return (
    // py-4 rather than the card default: a tile holding one number does not
    // need the vertical room of a content card, and three of them did.
    <Card className="w-[80%] shrink-0 snap-start gap-0 py-4 sm:w-auto">
      <CardContent className="px-4">
        <p className="text-muted-foreground text-xs sm:text-sm">{label}</p>
        <p
          className={`mt-0.5 font-semibold tracking-tight tabular-nums ${
            emphasis ? "text-2xl" : "text-lg sm:text-xl"
          } ${alert ? "text-destructive" : ""}`}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function InvoiceBadge({
  status,
}: {
  status: (typeof invoiceStatusEnum.enumValues)[number];
}) {
  return (
    <Badge
      variant={
        status === "paid"
          ? "success"
          : status === "overdue"
            ? "destructive"
            : "secondary"
      }
    >
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
