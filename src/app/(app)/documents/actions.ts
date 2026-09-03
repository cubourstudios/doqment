"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { invoiceStatusEnum } from "@/db/schema";
import { requireUser } from "@/lib/auth";

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

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}
