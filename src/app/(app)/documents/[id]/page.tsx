import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { documents, documentVersions, invoices, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getUserPlan, limitsFor } from "@/lib/billing/plans";
import { DOC_TYPE_LABELS, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import type { InvoicePdfData } from "@/components/pdf/invoice-document";

import { DocumentActions } from "./document-actions";
import { InvoiceStatusForm } from "./invoice-status-form";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({
  params,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const user = await requireUser();

  const [row] = await db
    .select({
      document: documents,
      version: documentVersions,
      invoice: invoices,
      projectTitle: projects.title,
    })
    .from(documents)
    .leftJoin(
      documentVersions,
      eq(documents.currentVersionId, documentVersions.id),
    )
    .leftJoin(invoices, eq(invoices.documentId, documents.id))
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .where(
      and(
        eq(documents.id, id),
        eq(documents.userId, user.id),
        // Soft-deleted documents are gone as far as the UI is concerned; the
        // row survives only so its invoice number is never reissued.
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!row?.version) notFound();

  const { document, version, invoice } = row;

  const plan = await getUserPlan(user.id);
  const data = version.dataJson as InvoicePdfData;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {document.projectId ? (
        <Link
          href={`/projects/${document.projectId}`}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          {row.projectTitle ?? "Project"}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {document.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {DOC_TYPE_LABELS[document.docType]}
            {invoice ? ` · ${data.currency} ${data.total}` : ""}
          </p>
        </div>

        {invoice ? (
          <Badge
            variant={
              invoice.status === "paid"
                ? "success"
                : invoice.status === "overdue"
                  ? "destructive"
                  : "secondary"
            }
          >
            {INVOICE_STATUS_LABELS[invoice.status]}
          </Badge>
        ) : null}
      </div>

      <div className="mt-6">
        <DocumentActions
          data={data}
          fileName={`${document.title.replace(/\//g, "-")}.pdf`}
          watermark={limitsFor(plan).watermark}
        />
      </div>

      {invoice ? (
        <div className="mt-8">
          <InvoiceStatusForm
            documentId={document.id}
            status={invoice.status}
          />
        </div>
      ) : null}
    </div>
  );
}
