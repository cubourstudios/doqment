import { invoiceStatusEnum } from "@/db/schema";

export type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];

/**
 * Which status an invoice may move to, and from where.
 *
 * The dropdown used to offer every status from every status, and the action
 * wrote whatever arrived. That made one transition catastrophic: **paid →
 * draft**. Two invariants this product treats as compliance rules gate on
 * `status === "draft"` and on nothing else —
 *
 *   edit-invoice.ts   a sent invoice cannot be edited, because the client
 *                     holds the original and quietly rewriting our side so
 *                     the two disagree is worse than refusing
 *   documents/actions delete refuses anything past draft, because every tax
 *                     regime expects the trail to survive
 *
 * — so paid → draft → edit, or paid → draft → delete, walked straight through
 * both of them. Nothing returns to draft now, which is the whole point of the
 * table below.
 *
 * Everything else stays reversible on purpose. Marking an invoice paid is the
 * most repeated action in the product and is one tap on a phone, so a mistap
 * must be undoable: paid → sent puts it back. A cancelled invoice can be
 * un-voided the same way. Neither weakens the rule above, because both land on
 * a status that is still not editable and still not deletable.
 *
 * Keyed by destination — it is read as "to reach X, you must currently be in
 * one of these" — because that is the shape the WHERE clause needs.
 */
export const ALLOWED_FROM: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  // Deliberately empty. This is the invariant the rest of the file exists for.
  draft: [],
  sent: ["draft", "overdue", "paid", "cancelled"],
  overdue: ["sent"],
  paid: ["draft", "sent", "overdue"],
  cancelled: ["draft", "sent", "overdue", "paid"],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return ALLOWED_FROM[to].includes(from);
}

/**
 * What to offer in the status control, current status first.
 *
 * The control must include where the invoice already is — it is a `Select`
 * showing the present value — and then only somewhere it can actually go. An
 * option that the server will refuse is a worse answer than no option.
 */
export function statusOptions(from: InvoiceStatus): InvoiceStatus[] {
  return [
    from,
    ...invoiceStatusEnum.enumValues.filter(
      (to) => to !== from && canTransition(from, to),
    ),
  ];
}
