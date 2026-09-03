import { applyRate, fromDecimalString, toDecimalString } from "./money";

/**
 * Tax computation.
 *
 * India's GST is the reason this is a module rather than one multiplication.
 * The same 18% is charged as CGST+SGST or as IGST depending on where the
 * client is, and getting that split wrong produces an invoice the client's
 * accountant will reject — the tax is not claimable if it is under the wrong
 * head. It is one of the few things in this product that is objectively right
 * or wrong, so it is computed on the server and unit tested.
 */

export type TaxComponent = {
  /** "CGST", "SGST", "IGST", "VAT", "Sales Tax" */
  label: string;
  /** Basis points: 900 = 9%. Integers, because 9% is not representable. */
  rateBasisPoints: number;
  amount: bigint;
};

export type TaxBreakdown = {
  components: TaxComponent[];
  total: bigint;
  /** Shown on the invoice when tax is zero for a reason worth stating. */
  note: string | null;
};

/** Serialised form for the `tax_json` column. bigint is not JSON. */
export type TaxBreakdownJson = {
  components: { label: string; rateBasisPoints: number; amount: string }[];
  total: string;
  note: string | null;
};

export type TaxInput = {
  /** Amount tax applies to, in minor units. */
  taxableAmount: bigint;
  /** Where the invoice is issued from. */
  supplierCountry: string;
  /** Indian state code (first two digits of a GSTIN), when supplier is in IN. */
  supplierStateCode: string | null;
  /** Where the client is. */
  clientCountry: string | null;
  clientStateCode: string | null;
  /** Total rate in basis points; 1800 = 18%. */
  rateBasisPoints: number;
  /** Whether the supplier is registered for GST/VAT at all. */
  registered: boolean;
};

/**
 * India's GST state codes are the first two digits of a GSTIN. Extracting the
 * code rather than asking for the state separately means one less field to get
 * wrong, and the GSTIN is already required on the invoice.
 */
export function stateCodeFromGstin(gstin: string | null): string | null {
  if (!gstin) return null;

  const trimmed = gstin.trim().toUpperCase();
  if (!/^\d{2}[A-Z0-9]{13}$/.test(trimmed)) return null;

  return trimmed.slice(0, 2);
}

export function computeTax(input: TaxInput): TaxBreakdown {
  const {
    taxableAmount,
    supplierCountry,
    supplierStateCode,
    clientCountry,
    clientStateCode,
    rateBasisPoints,
    registered,
  } = input;

  const none = (note: string | null): TaxBreakdown => ({
    components: [],
    total: 0n,
    note,
  });

  // An unregistered freelancer must not charge GST at all. Below the
  // registration threshold this is the correct invoice, not a degraded one.
  if (!registered || rateBasisPoints === 0) {
    return none(null);
  }

  if (supplierCountry.toUpperCase() !== "IN") {
    // Everywhere else gets a single line. VAT and US sales tax have their own
    // rules, but a freelancer's invoice does not need them modelled to be
    // correct — the rate is entered rather than derived.
    return withTotal([
      { label: "Tax", rateBasisPoints, amount: applyRate(taxableAmount, rateBasisPoints) },
    ]);
  }

  // --- India ---------------------------------------------------------------

  const clientIsForeign =
    Boolean(clientCountry) && clientCountry!.toUpperCase() !== "IN";

  if (clientIsForeign) {
    // Export of services is zero-rated. Charging 18% here would be a real cost
    // to the freelancer's competitiveness and wrong besides, so it is stated
    // on the invoice rather than silently omitted.
    return none(
      "Export of services — zero rated under GST. Supply under LUT without payment of IGST.",
    );
  }

  const interState =
    Boolean(supplierStateCode) &&
    Boolean(clientStateCode) &&
    supplierStateCode !== clientStateCode;

  if (interState) {
    return withTotal([
      {
        label: "IGST",
        rateBasisPoints,
        amount: applyRate(taxableAmount, rateBasisPoints),
      },
    ]);
  }

  // Same state — or an unknown client state, where the conservative reading is
  // that the supply is local. Each half is rounded independently, which is how
  // GST portals compute it; the two halves can therefore differ by one paisa
  // from a single IGST line at the full rate.
  //
  // The halves are split in whole basis points and the odd one goes to SGST.
  // applyRate converts the rate with BigInt(), which throws on a fraction, so
  // an odd rate — India's 0.25% slab is 25bp — would otherwise be a RangeError
  // on save rather than an invoice.
  const cgst = Math.floor(rateBasisPoints / 2);
  const sgst = rateBasisPoints - cgst;

  return withTotal([
    { label: "CGST", rateBasisPoints: cgst, amount: applyRate(taxableAmount, cgst) },
    { label: "SGST", rateBasisPoints: sgst, amount: applyRate(taxableAmount, sgst) },
  ]);
}

function withTotal(components: TaxComponent[]): TaxBreakdown {
  return {
    components,
    total: components.reduce((sum, c) => sum + c.amount, 0n),
    note: null,
  };
}

/**
 * Serialise for storage, as decimal strings.
 *
 * Decimal rather than minor units so the stored breakdown matches the
 * `subtotal` and `total` numeric columns beside it, and so anything reading it
 * back — the PDF, an export, a support query — gets a printable figure without
 * needing to know the currency's minor-unit count. Dividing by 100 downstream
 * would silently produce wrong numbers for JPY and the other zero-decimal
 * currencies.
 */
export function taxBreakdownToJson(
  breakdown: TaxBreakdown,
  currency: string,
): TaxBreakdownJson {
  return {
    components: breakdown.components.map((c) => ({
      label: c.label,
      rateBasisPoints: c.rateBasisPoints,
      amount: toDecimalString(c.amount, currency),
    })),
    total: toDecimalString(breakdown.total, currency),
    note: breakdown.note,
  };
}

export function taxBreakdownFromJson(
  json: TaxBreakdownJson,
  currency: string,
): TaxBreakdown {
  return {
    components: json.components.map((c) => ({
      label: c.label,
      rateBasisPoints: c.rateBasisPoints,
      amount: fromDecimalString(c.amount, currency),
    })),
    total: fromDecimalString(json.total, currency),
    note: json.note,
  };
}
