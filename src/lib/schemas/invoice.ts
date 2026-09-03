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

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Describe what this line is for").max(500),
  quantity: quantityString,
  unitPrice: amountString,
});

export const invoiceSchema = z.object({
  clientId: z.string().uuid().optional().or(z.literal("")),
  issueDate: z.string().min(1, "Pick an issue date"),
  dueDate: z.string().optional().or(z.literal("")),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
  discount: amountString.optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),

  /**
   * Tax rate in basis points, chosen from a fixed set. Free text would invite
   * "18%" and "0.18" for the same thing.
   */
  taxRateBasisPoints: z.coerce.number().int().min(0).max(10000),
  placeOfSupply: z
    .string()
    .max(2)
    .optional()
    .or(z.literal("")),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;

/** The GST rates an Indian freelancer realistically charges. */
export const GST_RATES = [
  { value: 1800, label: "18% — most professional services" },
  { value: 1200, label: "12%" },
  { value: 500, label: "5%" },
  { value: 0, label: "0% — not registered, or exempt" },
] as const;
