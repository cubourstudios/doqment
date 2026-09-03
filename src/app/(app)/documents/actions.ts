"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { invoiceStatusEnum } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";

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

  await db
    .update(invoices)
    .set({
      status,
      // Recording when it was paid, rather than only that it was, is what
      // makes "how long do my clients take to pay" answerable later.
      paidAt: status === "paid" ? new Date() : null,
    })
    .where(
      and(eq(invoices.documentId, documentId), eq(invoices.userId, user.id)),
    );

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
