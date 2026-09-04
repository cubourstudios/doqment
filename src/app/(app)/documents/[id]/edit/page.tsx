import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { ChevronLeftIcon } from "lucide-react";

import { db } from "@/db";
import { clients, documents, documentVersions, invoices, projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import { stateCodeFromGstin } from "@/lib/invoice/tax";
import { taxRateFromComponents } from "@/lib/invoice/round-trip";
import type { InvoicePdfData } from "@/components/pdf/invoice-document";

import { InvoiceForm } from "@/app/(app)/projects/[id]/documents/new/invoice-form";
import { updateInvoice } from "../edit-invoice";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({
  params,
}: PageProps<"/documents/[id]/edit">) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();

  const [row] = await db
    .select({
      document: documents,
      version: documentVersions,
      invoice: invoices,
      client: clients,
    })
    .from(documents)
    .innerJoin(invoices, eq(invoices.documentId, documents.id))
    .leftJoin(
      documentVersions,
      eq(documents.currentVersionId, documentVersions.id),
    )
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(documents.id, id),
        eq(documents.userId, userId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!row?.version) notFound();

  // A sent invoice is not editable, and arriving here by typing the URL should
  // land somewhere sensible rather than on a form that will refuse to save.
  if (row.invoice.status !== "draft") redirect(`/documents/${id}`);

  const data = row.version.dataJson as InvoicePdfData;
  const country = getCountryConfig(profile.country);

  // The client the invoice was actually issued to, which is what the stored
  // snapshot records. Seeding this from the project's client instead made the
  // form's live preview agree with the wrong answer — and the client's country
  // and state are what decide CGST+SGST against IGST against a zero-rated
  // export. See the client resolution in ../edit-invoice.ts.
  const invoiceClient = data.client ?? row.client;

  return (
    <div className="mx-auto w-full max-w-lg">
      <Link
        href={`/documents/${id}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        {row.document.title}
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Edit invoice</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        Still a draft, so this keeps its number — {row.invoice.invoiceNumber}.
      </p>

      <InvoiceForm
        action={updateInvoice.bind(null, id)}
        context={{
          currency: data.currency,
          supplierCountry: country.code,
          supplierStateCode: stateCodeFromGstin(profile.taxId),
          clientCountry: invoiceClient?.country ?? null,
          clientStateCode: stateCodeFromGstin(invoiceClient?.taxId ?? null),
          registered: Boolean(profile.taxId),
          nextInvoiceNumber: row.invoice.invoiceNumber,
          defaultDescription: "",
          // An edit keeps whatever the invoice already said; seeding the
          // profile default here would overwrite notes the user wrote.
          defaultNotes: "",
        }}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        initial={{
          issueDate: data.issueDate,
          dueDate: data.dueDate ?? "",
          discount: data.discount === "0.00" ? "" : data.discount,
          notes: data.notes ?? "",
          taxRateBasisPoints: taxRateFromComponents(data.tax.components),
          lineItems: data.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }}
      />
    </div>
  );
}
