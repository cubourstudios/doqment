/**
 * Money arithmetic in integer minor units (paise, cents).
 *
 * Every amount in an invoice calculation is a bigint count of the currency's
 * smallest unit. Floating point is never used: 0.1 + 0.2 !== 0.3 is a curiosity
 * in most code and a wrong tax invoice here, and the errors compound across
 * line items in a way that is very hard to spot after the fact.
 *
 * Values cross the database boundary as decimal strings, because the columns
 * are `numeric` — reading them as JS numbers would undo the point.
 */

/**
 * Currencies with no minor unit. Sending 100 JPY as 10000 would overcharge a
 * client a hundredfold, so this cannot be assumed to be 2 everywhere.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "ISK",
  "UGX",
  "XAF",
  "XOF",
]);

export function minorUnitDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Parse a user-entered amount into minor units.
 *
 * Accepts what people actually type — "1,200.50", " 99 ", "1200" — and rejects
 * anything else rather than guessing. Returns null on invalid input so callers
 * decide what to do; silently coercing to 0 would put a zero on an invoice.
 */
export function parseAmount(
  input: string | number,
  currency = "INR",
): bigint | null {
  const raw = String(input).trim().replace(/,/g, "");
  if (!raw) return null;

  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;

  const digits = minorUnitDigits(currency);
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace("-", "").split(".");

  // Round rather than truncate: a user typing 10.005 into a currency field
  // means 10.01, not 10.00.
  const scaled = `${whole}${fraction.padEnd(digits + 1, "0").slice(0, digits + 1)}`;
  const withGuard = BigInt(scaled);
  const rounded = roundHalfUp(withGuard, 10n);

  return negative ? -rounded : rounded;
}

/**
 * Divide, rounding half away from zero.
 *
 * Half-up is what tax authorities specify and what every invoice a client has
 * ever seen uses. JavaScript's Math.round is half-up only for positives, and
 * bigint division truncates, so this is written out explicitly.
 */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("division by zero");

  const negative = numerator < 0n !== denominator < 0n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absDenominator = denominator < 0n ? -denominator : denominator;

  const quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;

  const rounded = remainder * 2n >= absDenominator ? quotient + 1n : quotient;

  return negative ? -rounded : rounded;
}

/** Format minor units as a plain decimal string, for `numeric` columns. */
export function toDecimalString(minor: bigint, currency = "INR"): string {
  const digits = minorUnitDigits(currency);
  if (digits === 0) return minor.toString();

  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const divisor = 10n ** BigInt(digits);

  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(digits, "0");

  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Read a `numeric` column back into minor units. */
export function fromDecimalString(value: string, currency = "INR"): bigint {
  const parsed = parseAmount(value, currency);
  if (parsed === null) throw new Error(`not a decimal amount: ${value}`);
  return parsed;
}

/**
 * Quantities carry three decimal places — enough for "1.5 hours" or "0.25
 * days" without inviting float error. Held as integer thousandths.
 */
export function parseQuantity(input: string | number): bigint | null {
  const raw = String(input).trim().replace(/,/g, "");
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) return null;

  const [whole, fraction = ""] = raw.split(".");
  const scaled = `${whole}${fraction.padEnd(4, "0").slice(0, 4)}`;

  return roundHalfUp(BigInt(scaled), 10n);
}

/** Line amount = unit price × quantity, rounded to whole minor units. */
export function lineAmount(unitPrice: bigint, quantityThousandths: bigint) {
  return roundHalfUp(unitPrice * quantityThousandths, 1000n);
}

/** Apply a percentage given in basis points (1800 = 18%). */
export function applyRate(amount: bigint, rateBasisPoints: number): bigint {
  return roundHalfUp(amount * BigInt(rateBasisPoints), 10000n);
}

/**
 * Format a decimal string straight from a `numeric` column.
 *
 * Exists because the obvious thing — printing `${currency} ${total}` — gives
 * "INR 118000.00", which is what a database row looks like rather than what
 * money looks like. Invoice amounts are the most repeated element in the
 * product; getting them wrong reads as an unfinished tool, and an Indian user
 * expects lakh grouping (2,36,000) rather than thousands.
 */
export function formatDecimal(value: string, currency: string): string {
  try {
    return formatMinor(fromDecimalString(value, currency), currency);
  } catch {
    // A malformed stored value should not blank out a whole page.
    return `${currency} ${value}`;
  }
}

/** Display formatting. Never used for storage or arithmetic. */
export function formatMinor(minor: bigint, currency: string): string {
  const digits = minorUnitDigits(currency);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(toDecimalString(minor, currency)));
  } catch {
    return `${currency} ${toDecimalString(minor, currency)}`;
  }
}
