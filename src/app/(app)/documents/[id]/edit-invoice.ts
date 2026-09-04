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
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export type EditState = { error?: string };

/**
 * The client as an invoice records them.
 *
 * The version snapshot's shape rather than the `clients` table's, because the
 * snapshot is what an edit has to be able to carry across — the invoice states
 * who it was issued to, and that answer does not change because the row behind
 * it has since been edited or unlinked.
 */
type InvoiceClient = {
  name: string;
  company: string | null;
  taxId: string | null;
  country: string | null;
  address: unknown;
};

function clientFromRow(row: typeof clients.$inferSelect): InvoiceClient {
  return {
    name: row.name,
    company: row.company,
    taxId: row.taxId,
    country: row.country,
    address: row.addressJson,
  };
}

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

  // Throttled on the same budget as creating one: an edit writes a new version
  // row every time, so an unthrottled retry loop grows the history without
  // bound. Keyed by user, who is authenticated here.
  const limited = rateLimit(
    `generate:${userId}`,
    LIMITS.generate.limit,
    LIMITS.generate.windowSeconds,
  );
  if (!limited.allowed) {
    return { error: "Too many changes just now. Try again in a few minutes." };
  }

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
      // The current snapshot, for the details an edit carries across rather
      // than re-derives — see the client resolution below.
      version: documentVersions,
      projectClient: clients,
    })
    .from(documents)
    .innerJoin(invoices, eq(invoices.documentId, documents.id))
    .leftJoin(
      documentVersions,
      eq(documents.currentVersionId, documentVersions.id),
    )
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

  /*
   * Which client this invoice is for.
   *
   * The project's client was the answer here, and it is only the last resort.
   * createInvoice honours an explicit clientId and files the invoice against
   * that client, so re-deriving it from the project on every edit silently
   * reassigned the invoice to someone else — and the client is not decoration:
   * their country and state are what decide whether the tax comes out as
   * CGST+SGST, as IGST, or as a zero-rated export. Correcting a typo in a line
   * description could therefore reprice a zero-rated export invoice at 18%
   * GST, which is real money to a real freelancer and looks entirely correct
   * on the PDF that results.
   *
   * So: an explicitly chosen client wins, then whatever the invoice already
   * says — this is the same invoice corrected, and the client carries across
   * the way the number and series do — then, failing both, the project's.
   */
  const storedClient =
    (existing.version?.dataJson as { client?: InvoiceClient | null } | null)
      ?.client ?? null;

  let client: InvoiceClient | null = null;

  if (input.clientId) {
    // Filtered by user as well as id: this connection bypasses row level
    // security, so an id alone would read another account's client.
    const [chosen] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.userId, userId)))
      .limit(1);

    if (chosen) client = clientFromRow(chosen);
  }

  client ??=
    storedClient ??
    (existing.projectClient ? clientFromRow(existing.projectClient) : null);

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
      .select({
        versionNo: documentVersions.versionNo,
        templateVersion: documentVersions.templateVersion,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.versionNo))
      .limit(1);

    const [version] = await tx
      .insert(documentVersions)
      .values({
        documentId,
        versionNo: (latest?.versionNo ?? 0) + 1,
        // Carried from the version being corrected, not reset to 1. This
        // column records which template revision rendered the document, and
        // hardcoding it made every edited invoice claim it was drawn by the
        // very first template — which is the one thing that would matter if a
        // template revision ever turned out to be wrong.
        templateVersion: latest?.templateVersion ?? 1,
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
          // Already in the snapshot's shape, resolved above.
          client,
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
