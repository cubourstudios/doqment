import { z } from "zod";

/**
 * Invoice form input.
 *
 * Amounts stay strings all the way through: parsing to a JS number here would
 * reintroduce exactly the float error src/lib/invoice/money.ts exists to
 * avoid. They become integer minor units only inside the calculation.
 */

const amountString = z
  .string()
  .trim()
  .refine((v) => /^-?[\d,]+(\.\d+)?$/.test(v), "Enter an amount like 1200.50");

const quantityString = z
  .string()
  .trim()
  .refine((v) => /^[\d,]+(\.\d+)?$/.test(v), "Enter a quantity like 1 or 1.5");

/**
 * A calendar date as the date input submits it.
 *
 * Checked here rather than left to Postgres: the issue date also decides the
 * invoice series, and `new Date("nonsense")` yields an Invalid Date that
 * formats as the series "FYNaN-NaN" on its way to a database error the user
 * sees as a 500.
 */
const calendarDate = z
  .string()
  .trim()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
    "Enter a date like 2026-09-03",
  );

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Describe what this line is for").max(500),
  quantity: quantityString,
  unitPrice: amountString,
});

/** The GST rates an Indian freelancer realistically charges. */
export const GST_RATES = [
  { value: 1800, label: "18% — most professional services" },
  { value: 1200, label: "12%" },
  { value: 500, label: "5%" },
  { value: 0, label: "0% — not registered, or exempt" },
] as const;

const ALLOWED_TAX_RATES: readonly number[] = GST_RATES.map((rate) => rate.value);

export const invoiceSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  issueDate: calendarDate,
  dueDate: calendarDate.optional().or(z.literal("")),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
  discount: amountString.optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),

  /**
   * Tax rate in basis points, chosen from a fixed set. Free text would invite
   * "18%" and "0.18" for the same thing. An arbitrary integer is rejected
   * rather than clamped: an odd rate has no legal CGST/SGST half to split into.
   */
  taxRateBasisPoints: z.coerce
    .number()
    .int()
    .refine((v) => ALLOWED_TAX_RATES.includes(v), "Pick a tax rate from the list"),
  placeOfSupply: z
    .string()
    .max(2)
    .optional()
    .or(z.literal("")),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
