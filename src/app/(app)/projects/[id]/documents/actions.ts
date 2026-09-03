"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  clients,
  documents,
  documentVersions,
  invoices,
  projects,
  templates,
} from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import {
  calculateInvoice,
  InvoiceCalculationError,
} from "@/lib/invoice/calculate";
import { toDecimalString } from "@/lib/invoice/money";
import { reserveInvoiceNumber } from "@/lib/invoice/numbering";
import { stateCodeFromGstin, taxBreakdownToJson } from "@/lib/invoice/tax";
import { invoiceSchema } from "@/lib/schemas/invoice";

export type DocumentState = { error?: string };

/**
 * Create an invoice.
 *
 * Everything that must be consistent happens in one transaction: reserving the
 * number, creating the document, its first version, and the invoice row. A
 * number reserved outside the transaction and then orphaned by a failed insert
 * is a gap in the series, which is a compliance problem rather than an
 * inconvenience.
 */
export async function createInvoice(
  projectId: string,
  _prevState: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const { userId, profile } = await requireProfile();

  // Line items arrive as parallel arrays from the repeating form rows.
  const descriptions = formData.getAll("lineDescription").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const unitPrices = formData.getAll("lineUnitPrice").map(String);

  const parsed = invoiceSchema.safeParse({
    clientId: formData.get("clientId") ?? "",
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") ?? "",
    discount: formData.get("discount") ?? "",
    notes: formData.get("notes") ?? "",
    taxRateBasisPoints: formData.get("taxRateBasisPoints") ?? 0,
    placeOfSupply: formData.get("placeOfSupply") ?? "",
    lineItems: descriptions.map((description, i) => ({
      description,
      quantity: quantities[i] ?? "",
      unitPrice: unitPrices[i] ?? "",
    })),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const input = parsed.data;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!project) return { error: "That project no longer exists." };

  const clientId = input.clientId || project.clientId;
  let client = null;

  if (clientId) {
    [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .limit(1);
  }

  const country = getCountryConfig(profile.country);
  const currency = profile.currency ?? country.currency;

  // Place of supply is the client's state where known. The form can override
  // it, because the client's billing state and the state where the service is
  // consumed are not always the same.
  const clientStateCode =
    input.placeOfSupply || stateCodeFromGstin(client?.taxId ?? null);

  let totals;
  try {
    totals = calculateInvoice({
      lineItems: input.lineItems,
      currency,
      discount: input.discount,
      tax: {
        supplierCountry: country.code,
        supplierStateCode: stateCodeFromGstin(profile.taxId),
        clientCountry: client?.country ?? null,
        clientStateCode: clientStateCode || null,
        rateBasisPoints: input.taxRateBasisPoints,
        registered: Boolean(profile.taxId) && input.taxRateBasisPoints > 0,
      },
    });
  } catch (error) {
    if (error instanceof InvoiceCalculationError) return { error: error.message };
    throw error;
  }

  const [template] = await db
    .select({ id: templates.id, version: templates.version })
    .from(templates)
    .where(
      and(
        eq(templates.docType, "invoice"),
        eq(templates.region, country.region),
        eq(templates.isActive, true),
      ),
    )
    .limit(1);

  const issueDate = new Date(input.issueDate);

  const documentId = await db.transaction(async (tx) => {
    const { invoiceNumber, series } = await reserveInvoiceNumber(
      // The transaction handle, not the pooled client — the counter's row lock
      // must be held for the rest of this transaction.
      tx as unknown as Parameters<typeof reserveInvoiceNumber>[0],
      userId,
      profile.country,
      issueDate,
    );

    const [document] = await tx
      .insert(documents)
      .values({
        userId,
        projectId,
        templateId: template?.id ?? null,
        docType: "invoice",
        title: invoiceNumber,
        status: "draft",
      })
      .returning({ id: documents.id });

    // The structured data is the source of truth; the PDF is a rendering of
    // it. Storing the inputs alongside the computed figures is what makes a
    // later re-render or edit possible.
    const [version] = await tx
      .insert(documentVersions)
      .values({
        documentId: document.id,
        versionNo: 1,
        templateVersion: template?.version ?? 1,
        dataJson: {
          invoiceNumber,
          series,
          issueDate: input.issueDate,
          dueDate: input.dueDate || null,
          currency,
          notes: input.notes || null,
          lineItems: totals.lines.map((line) => ({
            description: line.description,
            quantity: (Number(line.quantityThousandths) / 1000).toString(),
            unitPrice: toDecimalString(line.unitPrice, currency),
            amount: toDecimalString(line.amount, currency),
          })),
          discount: toDecimalString(totals.discount, currency),
          subtotal: toDecimalString(totals.subtotal, currency),
          tax: taxBreakdownToJson(totals.tax, currency),
          total: toDecimalString(totals.total, currency),
          supplier: {
            name: profile.businessName ?? profile.name,
            taxId: profile.taxId,
            address: profile.addressJson,
          },
          client: client
            ? {
                name: client.name,
                company: client.company,
                taxId: client.taxId,
                country: client.country,
                address: client.addressJson,
              }
            : null,
        },
      })
      .returning({ id: documentVersions.id });

    await tx
      .update(documents)
      .set({ currentVersionId: version.id })
      .where(eq(documents.id, document.id));

    await tx.insert(invoices).values({
      documentId: document.id,
      userId,
      invoiceNumber,
      series,
      issueDate: input.issueDate,
      dueDate: input.dueDate || null,
      currency,
      subtotal: toDecimalString(totals.subtotal, currency),
      taxJson: taxBreakdownToJson(totals.tax, currency),
      total: toDecimalString(totals.total, currency),
      status: "draft",
    });

    return document.id;
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/documents");
  redirect(`/documents/${documentId}`);
}
