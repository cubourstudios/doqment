import { lineAmount, parseAmount, parseQuantity, toDecimalString } from "./money";
import { computeTax, type TaxBreakdown, type TaxInput } from "./tax";

/**
 * Invoice totals.
 *
 * The client computes these too, for a live preview — but what is stored and
 * printed is always recomputed here, on the server, from the raw inputs. A
 * total that arrived from a form is a number the user could have edited.
 */

export type RawLineItem = {
  description: string;
  quantity: string | number;
  unitPrice: string | number;
};

export type CalculatedLine = {
  description: string;
  /** Integer thousandths, so "1.5" hours is exact. */
  quantityThousandths: bigint;
  unitPrice: bigint;
  amount: bigint;
};

export type InvoiceTotals = {
  lines: CalculatedLine[];
  subtotal: bigint;
  discount: bigint;
  taxableAmount: bigint;
  tax: TaxBreakdown;
  total: bigint;
};

export type CalculateInput = {
  lineItems: RawLineItem[];
  currency: string;
  /** Flat discount in the invoice currency, as typed. */
  discount?: string | number | null;
  tax: Omit<TaxInput, "taxableAmount">;
};

export class InvoiceCalculationError extends Error {}

/**
 * Compute an invoice from raw form input.
 *
 * Throws rather than skipping a bad line. A line item that silently vanishes
 * because its price failed to parse is the kind of bug that gets noticed after
 * the invoice is sent.
 */
export function calculateInvoice(input: CalculateInput): InvoiceTotals {
  const { lineItems, currency, discount, tax } = input;

  if (lineItems.length === 0) {
    throw new InvoiceCalculationError("An invoice needs at least one line item.");
  }

  const lines: CalculatedLine[] = lineItems.map((item, index) => {
    const quantityThousandths = parseQuantity(item.quantity);
    const unitPrice = parseAmount(item.unitPrice, currency);

    if (quantityThousandths === null) {
      throw new InvoiceCalculationError(
        `Line ${index + 1}: "${item.quantity}" is not a valid quantity.`,
      );
    }
    if (unitPrice === null) {
      throw new InvoiceCalculationError(
        `Line ${index + 1}: "${item.unitPrice}" is not a valid amount.`,
      );
    }
    if (unitPrice < 0n) {
      throw new InvoiceCalculationError(
        `Line ${index + 1}: a negative price should be entered as a discount.`,
      );
    }

    return {
      description: item.description,
      quantityThousandths,
      unitPrice,
      // Each line is rounded before summing, so the printed line amounts add up
      // to the printed subtotal. Summing exact products and rounding once would
      // be marginally more accurate and visibly wrong on paper.
      amount: lineAmount(unitPrice, quantityThousandths),
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0n);

  const parsedDiscount =
    discount === null || discount === undefined || discount === ""
      ? 0n
      : parseAmount(discount, currency);

  if (parsedDiscount === null) {
    throw new InvoiceCalculationError(`"${discount}" is not a valid discount.`);
  }
  if (parsedDiscount < 0n) {
    throw new InvoiceCalculationError("A discount cannot be negative.");
  }
  if (parsedDiscount > subtotal) {
    throw new InvoiceCalculationError(
      "The discount is larger than the invoice subtotal.",
    );
  }

  // Tax applies after the discount: charging tax on money the client was never
  // asked for would overstate the liability.
  const taxableAmount = subtotal - parsedDiscount;
  const taxBreakdown = computeTax({ ...tax, taxableAmount });

  return {
    lines,
    subtotal,
    discount: parsedDiscount,
    taxableAmount,
    tax: taxBreakdown,
    total: taxableAmount + taxBreakdown.total,
  };
}

/** The subset that goes into `numeric` columns. */
export function totalsForStorage(totals: InvoiceTotals, currency: string) {
  return {
    subtotal: toDecimalString(totals.subtotal, currency),
    total: toDecimalString(totals.total, currency),
  };
}
