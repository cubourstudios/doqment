"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDownIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DOC_TYPE_LABELS, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { formatDecimal } from "@/lib/invoice/money";
import type { RecentDocument } from "@/lib/dashboard";

/**
 * Recent documents of every type.
 *
 * One markup tree, two presentations: below `md` each row is a stacked card;
 * from `md` the same rows line up under a header and can be sorted. Rendering
 * a card list and a table separately would be two things to keep in agreement,
 * and they would drift.
 *
 * Sorting is client-side and deliberately shallow — this is the five most
 * recent documents, not the archive. /documents is where the full list lives.
 */
type SortKey = "createdAt" | "title" | "docType";

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: "title", label: "Document", className: "md:col-span-5" },
  { key: "docType", label: "Type", className: "md:col-span-3" },
  { key: "createdAt", label: "Created", className: "md:col-span-2" },
];

export function RecentDocuments({ rows }: { rows: RecentDocument[] }) {
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [descending, setDescending] = useState(true);

  const sorted = [...rows].sort((a, b) => {
    const direction = descending ? -1 : 1;

    if (sort === "createdAt") {
      return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
    }

    return String(a[sort]).localeCompare(String(b[sort])) * direction;
  });

  function toggle(key: SortKey) {
    if (key === sort) {
      setDescending((d) => !d);
      return;
    }
    setSort(key);
    setDescending(true);
  }

  return (
    <div className="mt-3">
      {/* The header is the sort control, and only exists where the rows line
          up into columns. On a phone there is nothing to head. */}
      <div className="text-muted-foreground hidden md:grid md:grid-cols-12 md:gap-3 md:px-4 md:pb-1 md:text-xs">
        {COLUMNS.map((column) => (
          <button
            key={column.key}
            type="button"
            onClick={() => toggle(column.key)}
            aria-label={`Sort by ${column.label}`}
            className={`hover:text-foreground flex items-center gap-1 text-left font-medium ${column.className}`}
          >
            {column.label}
            <ArrowUpDownIcon
              className={`size-3 ${sort === column.key ? "opacity-100" : "opacity-30"}`}
            />
          </button>
        ))}
        <span className="text-right md:col-span-2">Amount</span>
      </div>

      <ul className="grid gap-2">
        {sorted.map((row) => (
          <li key={row.id} className="min-w-0">
            <Link
              href={`/documents/${row.id}`}
              className="hover:bg-accent grid min-h-16 grid-cols-1 items-center gap-1 rounded-lg border px-4 py-3 transition-colors md:grid-cols-12 md:gap-3 md:py-2"
            >
              <span className="min-w-0 md:col-span-5">
                <span className="block truncate font-medium">{row.title}</span>
                {row.clientName ? (
                  <span className="text-muted-foreground block truncate text-sm">
                    {row.clientName}
                  </span>
                ) : null}
              </span>

              <span className="flex items-center gap-2 md:col-span-3">
                <Badge variant="secondary" className="font-normal">
                  {DOC_TYPE_LABELS[row.docType as keyof typeof DOC_TYPE_LABELS] ??
                    row.docType}
                </Badge>
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
                    {INVOICE_STATUS_LABELS[
                      row.invoiceStatus as keyof typeof INVOICE_STATUS_LABELS
                    ] ?? row.invoiceStatus}
                  </Badge>
                ) : null}
              </span>

              <span className="text-muted-foreground text-sm md:col-span-2">
                {row.createdAt.toLocaleDateString("en", {
                  day: "numeric",
                  month: "short",
                })}
              </span>

              <span className="font-medium tabular-nums md:col-span-2 md:text-right">
                {row.total && row.currency
                  ? formatDecimal(row.total, row.currency)
                  : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
