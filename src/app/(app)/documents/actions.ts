"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { documents, invoices } from "@/db/schema";
import { invoiceStatusEnum } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { ALLOWED_FROM } from "@/lib/invoice/status";

const statusSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(invoiceStatusEnum.enumValues),
});

/**
 * Change an invoice's status.
 *
 * Cancelling rather than deleting is the only way to void an invoice: the
 * number stays allocated, because a missing number in a series invites the
 * question of what was on the invoice that disappeared.
 */
export async function updateInvoiceStatus(formData: FormData) {
  const user = await requireUser();

  const parsed = statusSchema.safeParse({
    documentId: formData.get("documentId"),
    status: formData.get("status"),
  });

  if (!parsed.success) return;

  const { documentId, status } = parsed.data;

  /*
   * The legal predecessors, asserted in the WHERE clause rather than checked
   * and then trusted — the same shape markInvoiceSent below already uses, and
   * for the same reason: a stale page must not be able to slip a transition
   * past a check that ran a moment earlier.
   *
   * Nothing may return to draft. Editing and deleting an invoice both gate on
   * `status === "draft"`, so paid -> draft -> edit and paid -> draft -> delete
   * walked through two rules this product treats as compliance requirements.
   * ALLOWED_FROM.draft is empty, so this UPDATE matches no row for it.
   */
  const allowedFrom = ALLOWED_FROM[status];

  if (allowedFrom.length === 0) return;

  const [updated] = await db
    .update(invoices)
    .set({
      status,
      /*
       * Set when the invoice becomes paid, and never cleared.
       *
       * This used to be `status === "paid" ? new Date() : null`, so moving a
       * paid invoice to cancelled destroyed the date silently — and paid_at is
       * what getMonthlyTotals buckets the "received" bar on, which is the one
       * thing the dashboard chart exists to show. Recording when payment
       * arrived, rather than only that it did, is also what makes "how long do
       * my clients take to pay" answerable later, so it is not ours to discard
       * on an unrelated status change.
       */
      ...(status === "paid" ? { paidAt: new Date() } : {}),
    })
    .where(
      and(
        eq(invoices.documentId, documentId),
        eq(invoices.userId, user.id),
        inArray(invoices.status, [...allowedFrom]),
      ),
    )
    .returning({ status: invoices.status });

  // The transition was refused, or the invoice is gone. Either way nothing
  // changed, so there is nothing to revalidate and nothing to report.
  if (!updated) return;

  if (status === "paid") {
    await track(user.id, "invoice_marked_paid");
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

/**
 * Mark an invoice as sent.
 *
 * A separate action from the status dropdown because it is a different moment:
 * this is the one transition that decides whether an invoice is tracked at all.
 * A draft counts towards neither the outstanding total nor the overdue check,
 * so an invoice emailed but left in draft is money the product has quietly
 * stopped watching.
 *
 * Only draft moves. Re-running this on an invoice already paid would silently
 * undo the payment record, which is why the status is part of the WHERE clause
 * rather than something checked beforehand and then overwritten.
 */
export async function markInvoiceSent(formData: FormData) {
  const user = await requireUser();
  const documentId = formData.get("documentId");

  if (typeof documentId !== "string") return;

  const [updated] = await db
    .update(invoices)
    .set({ status: "sent" })
    .where(
      and(
        eq(invoices.documentId, documentId),
        eq(invoices.userId, user.id),
        eq(invoices.status, "draft"),
      ),
    )
    .returning({ documentId: invoices.documentId });

  if (!updated) return;

  await track(user.id, "invoice_marked_sent");

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

/**
 * Delete a document.
 *
 * Soft, always. The schema has carried `deleted_at` from the start and six
 * read paths already filter on it, but nothing ever set it — so a mistyped
 * document was permanent clutter with no way to clear it.
 *
 * The row survives deliberately. An invoice number must never be reissued, and
 * the counter only knows what it has handed out — reusing a number after a
 * hard delete would produce two different invoices sharing one number, which
 * is the failure the whole numbering design exists to prevent.
 *
 * A sent or paid invoice is not deletable. Removing the record of money a
 * client actually owes or has paid is not tidying, and every tax regime
 * expects the trail to survive. Cancelling is the right move there, which is
 * what the status control is for.
 */
export async function deleteDocument(formData: FormData) {
  const user = await requireUser();
  const documentId = formData.get("documentId");

  if (typeof documentId !== "string") return;

  const [invoice] = await db
    .select({ status: invoices.status })
    .from(invoices)
    .where(
      and(eq(invoices.documentId, documentId), eq(invoices.userId, user.id)),
    )
    .limit(1);

  // Only a draft invoice can go. A document that is not an invoice at all has
  // no financial record to protect, so it is always removable.
  if (invoice && invoice.status !== "draft") return;

  const [removed] = await db
    .update(documents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.userId, user.id),
        isNull(documents.deletedAt),
      ),
    )
    .returning({ projectId: documents.projectId });

  if (!removed) return;

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  if (removed.projectId) revalidatePath(`/projects/${removed.projectId}`);

  redirect(removed.projectId ? `/projects/${removed.projectId}` : "/documents");
}
