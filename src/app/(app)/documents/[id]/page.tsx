import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { db } from "@/db";
import { documents, documentVersions, invoices, projects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getUserPlan, limitsFor } from "@/lib/billing/plans";
import { formatDecimal } from "@/lib/invoice/money";
import { DOC_TYPE_LABELS, INVOICE_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InvoicePdfData } from "@/components/pdf/invoice-document";
import type { ContractPdfData } from "@/components/pdf/contract-document";
import type { PreviewDocument } from "@/components/pdf/invoice-preview";

import { DocumentActions } from "./document-actions";
import { InvoiceStatusForm } from "./invoice-status-form";
import { MarkSent } from "./mark-sent";
import { DeleteDocumentButton } from "./delete-document-button";

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

  /*
   * Which renderer to use is decided by the stored version, not by the
   * document's type. A version written before a type gained its own renderer
   * must keep printing the way it always did — the snapshot is the contract.
   */
  const stored = version.dataJson as { kind?: string };

  const preview: PreviewDocument =
    stored.kind === "contract"
      ? { kind: "contract", data: buildContractData(stored as never) }
      : { kind: "invoice", data: version.dataJson as InvoicePdfData };

  const invoiceData =
    preview.kind === "invoice" ? preview.data : null;

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
            {invoice && invoiceData
              ? ` · ${formatDecimal(invoiceData.total, invoiceData.currency)}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Editing is offered only while the invoice is a draft. Once sent,
              the client holds the original and the accounting answer is a
              credit note, not a quiet rewrite — so the affordance disappears
              rather than leading to a form that would refuse to save. */}
          {invoice?.status === "draft" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/documents/${document.id}/edit`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
          ) : null}

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
      </div>

      <div className="mt-6">
        <DocumentActions
          document={preview}
          fileName={`${document.title.replace(/\//g, "-")}.pdf`}
          watermark={limitsFor(plan).watermark}
        />
      </div>

      {/* Offered right after the download, because downloading is what someone
          does immediately before emailing. Only while it is still a draft —
          once tracked, the status dropdown below is the right control. */}
      {invoice?.status === "draft" ? (
        <div className="mt-4">
          <MarkSent documentId={document.id} dueDate={invoice.dueDate} />
        </div>
      ) : null}

      {invoice ? (
        <div className="mt-8">
          <InvoiceStatusForm
            documentId={document.id}
            status={invoice.status}
          />
        </div>
      ) : null}

      {/* Offered only where it is actually permitted: a sent or paid invoice
          is a financial record, and the action would silently do nothing. An
          affordance that does nothing is worse than none. */}
      {!invoice || invoice.status === "draft" ? (
        <div className="mt-10">
          <DeleteDocumentButton
            documentId={document.id}
            title={document.title}
            isDraftInvoice={Boolean(invoice)}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Contract versions store their rendered blocks, so printing one is a matter
 * of reading the snapshot rather than re-running the template. A template
 * revised after the fact must not change a document already sent.
 */
function buildContractData(stored: {
  title?: string;
  blocks?: { id: string; heading: string | null; text: string }[];
}): ContractPdfData {
  return {
    title: stored.title ?? "Document",
    blocks: stored.blocks ?? [],
  };
}
