"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  clients,
  documents,
  documentVersions,
  invoices,
  projects,
} from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { getCountryConfig } from "@/lib/regions";
import {
  calculateInvoice,
  InvoiceCalculationError,
} from "@/lib/invoice/calculate";
import { toDecimalString } from "@/lib/invoice/money";
import { stateCodeFromGstin, taxBreakdownToJson } from "@/lib/invoice/tax";
import { invoiceSchema } from "@/lib/schemas/invoice";

export type EditState = { error?: string };

/**
 * Edit a draft invoice.
 *
 * Only a draft. Once an invoice has been sent, the client holds a copy of the
 * original, and quietly rewriting our side so the two disagree is worse than
 * refusing — the accounting answer to a wrong sent invoice is a credit note or
 * a cancellation and reissue, not an edit. Enforced in the WHERE clause rather
 * than checked and then trusted, so a stale page cannot slip an edit past it.
 *
 * The invoice number never changes. That is the point of allowing this at all:
 * without it a typo costs a number, and a gap in the series is a compliance
 * question the freelancer has to answer later.
 *
 * A new `document_versions` row is written rather than the old one updated.
 * The table has carried `versionNo` since the schema was designed and nothing
 * had ever written a second one; keeping the prior version is what makes "what
 * did this say before I changed it" answerable.
 */
export async function updateInvoice(
  documentId: string,
  _prevState: EditState,
  formData: FormData,
): Promise<EditState> {
  const { userId, profile } = await requireProfile();

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

  const [existing] = await db
    .select({
      document: documents,
      invoice: invoices,
      client: clients,
    })
    .from(documents)
    .innerJoin(invoices, eq(invoices.documentId, documents.id))
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);

  if (!existing) return { error: "That invoice no longer exists." };

  if (existing.invoice.status !== "draft") {
    return {
      error:
        "This invoice has already been sent, so it can't be edited. Cancel it and issue a new one instead.",
    };
  }

  const { client } = existing;
  const country = getCountryConfig(profile.country);
  // The currency is the one the invoice was issued in. Re-deriving it from the
  // profile would silently redenominate an invoice if the user later changed
  // country, turning ₹50,000 into $50,000.
  const currency = existing.invoice.currency;

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

  await db.transaction(async (tx) => {
    const [latest] = await tx
      .select({ versionNo: documentVersions.versionNo })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNo))
      .limit(1);

    const [version] = await tx
      .insert(documentVersions)
      .values({
        documentId,
        versionNo: (latest?.versionNo ?? 0) + 1,
        templateVersion: 1,
        dataJson: {
          // The number and series are carried across untouched: this is the
          // same invoice, corrected.
          invoiceNumber: existing.invoice.invoiceNumber,
          series: existing.invoice.series,
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
      .set({ currentVersionId: version.id, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    await tx
      .update(invoices)
      .set({
        issueDate: input.issueDate,
        dueDate: input.dueDate || null,
        subtotal: toDecimalString(totals.subtotal, currency),
        taxJson: taxBreakdownToJson(totals.tax, currency),
        total: toDecimalString(totals.total, currency),
      })
      .where(
        and(
          eq(invoices.documentId, documentId),
          eq(invoices.userId, userId),
          // Re-asserted inside the transaction: the status could have changed
          // between the check above and this write.
          eq(invoices.status, "draft"),
        ),
      );
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect(`/documents/${documentId}`);
}
