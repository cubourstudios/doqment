import { z } from "zod";

import { calendarDate, optionalCalendarDate } from "./calendar-date";

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
  dueDate: optionalCalendarDate,
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
  /**
   * Indian GST state code — the first two digits of a GSTIN.
   *
   * Exactly two digits, not "at most two characters". This value overrides the
   * client's own state when computeTax decides between CGST+SGST and IGST, and
   * it is compared against the supplier's code with a plain `!==`. So "9" for
   * Uttar Pradesh never matches the "09" that stateCodeFromGstin derives, and
   * an intra-state supply is charged IGST — precisely the misfiled tax that
   * tax.ts exists to prevent, on an invoice that looks correct on its face.
   *
   * The form does not submit this field at all, which makes anything arriving
   * in it hand-crafted and all the more worth checking on the server.
   */
  placeOfSupply: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "A place of supply is a two-digit state code, like 09")
    .optional()
    .or(z.literal("")),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
