import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { FileTextIcon } from "lucide-react";

import { db } from "@/db";
import { clients, documents, invoices, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { markOverdueInvoices } from "@/lib/dashboard";
import { formatDecimal } from "@/lib/invoice/money";
import { DOC_TYPE_LABELS, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { invoiceStatusEnum } from "@/db/schema";

export const metadata: Metadata = { title: "Documents" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
] as const;

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  const user = await requireUser();
  const { filter } = await searchParams;
  const active = typeof filter === "string" ? filter : "all";

  await markOverdueInvoices(user.id);

  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      docType: documents.docType,
      createdAt: documents.createdAt,
      invoiceStatus: invoices.status,
      total: invoices.total,
      currency: invoices.currency,
      clientName: clients.name,
    })
    .from(documents)
    .leftJoin(invoices, eq(invoices.documentId, documents.id))
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(documents.userId, user.id), isNull(documents.deletedAt)))
    .orderBy(desc(documents.createdAt));

  // Filtering in memory rather than in SQL: a freelancer's document count is in
  // the hundreds, and this keeps one query serving every tab. Revisit if that
  // assumption stops holding.
  const filtered = rows.filter((row) => {
    if (active === "all") return true;
    if (!row.invoiceStatus) return false;
    if (active === "paid") return row.invoiceStatus === "paid";
    if (active === "overdue") return row.invoiceStatus === "overdue";
    return !["paid", "cancelled"].includes(row.invoiceStatus);
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            asChild
            size="sm"
            variant={active === option.value ? "default" : "outline"}
            // min-h-11/min-w-11: these measured 41x32, under the 44px floor on
            // both axes, and they are the primary way this page is navigated.
            className="min-h-11 min-w-11 shrink-0"
          >
            <Link
              href={
                option.value === "all"
                  ? "/documents"
                  : `/documents?filter=${option.value}`
              }
            >
              {option.label}
            </Link>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 grid place-items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
          <FileTextIcon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            {active === "all"
              ? "Documents you create appear here, filed under their project."
              : "Nothing matches this filter."}
          </p>
          {active === "all" ? (
            <Button asChild>
              <Link href="/projects">Go to projects</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 grid gap-2">
          {filtered.map((row) => (
            // min-w-0: a grid item's automatic minimum is its content width, so
            // without this the row is sized by the untruncated title, `truncate`
            // never engages, and a long document name scrolled the whole page
            // sideways on a phone.
            <li key={row.id} className="min-w-0">
              <Link
                href={`/documents/${row.id}`}
                className="hover:bg-accent flex min-h-16 items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {row.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-sm">
                    {[DOC_TYPE_LABELS[row.docType], row.clientName]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3">
                  {row.total && row.currency ? (
                    <span className="font-medium tabular-nums">
                      {formatDecimal(row.total, row.currency)}
                    </span>
                  ) : null}
                  {row.invoiceStatus ? (
                    <Badge
                      variant={
                        row.invoiceStatus === "paid"
                          ? "success"
                          : row.invoiceStatus === "overdue"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {
                        INVOICE_STATUS_LABELS[
                          row.invoiceStatus as (typeof invoiceStatusEnum.enumValues)[number]
                        ]
                      }
                    </Badge>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
