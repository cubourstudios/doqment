import type { Metadata } from "next";
import Link from "next/link";
import { FolderPlusIcon, PlusIcon } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { getDashboardData, markOverdueInvoices } from "@/lib/dashboard";
import { formatDecimal, formatMinor } from "@/lib/invoice/money";
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

  const data = await getDashboardData(userId, currency);
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

      {nothingYet ? (
        <div className="mt-8 grid place-items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <FolderPlusIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            Start with a project. Tell us the client and roughly what it&apos;s
            worth, and we&apos;ll work out which documents it needs.
          </p>
          <Button asChild>
            <Link href="/projects/new">Create your first project</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Money owed leads, because it is the thing a freelancer opens this
              app to find out. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
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

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/projects/new">
                <PlusIcon />
                New project
              </Link>
            </Button>
          </div>

          {data.recentInvoices.length > 0 ? (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Recent invoices</h2>
                <Link
                  href="/documents"
                  className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                >
                  All documents
                </Link>
              </div>

              <ul className="grid gap-2">
                {data.recentInvoices.map((invoice) => (
                  <li key={invoice.documentId}>
                    <Link
                      href={`/documents/${invoice.documentId}`}
                      className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {invoice.invoiceNumber}
                        </span>
                        <span className="text-muted-foreground block truncate text-sm">
                          {invoice.clientName ?? "No client"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="font-medium tabular-nums">
                          {formatDecimal(invoice.total, invoice.currency)}
                        </span>
                        <InvoiceBadge
                          status={
                            invoice.status as (typeof invoiceStatusEnum.enumValues)[number]
                          }
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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
    <Card>
      <CardContent className="px-4">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p
          className={`mt-1 font-semibold tabular-nums ${
            emphasis ? "text-2xl" : "text-xl"
          } ${alert ? "text-destructive" : ""}`}
        >
          {value}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
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
