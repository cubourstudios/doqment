import type { TaxBreakdownJson } from "./tax";

/**
 * Pure helpers for reading an invoice back out of storage.
 *
 * These were inline in a page and a form. They are extracted here because each
 * one is load-bearing in a way that fails silently: a wrong answer produces a
 * plausible invoice rather than an error, and nobody notices until a client's
 * accountant does. Inline in a server component they could not be tested at
 * all.
 */

/**
 * The tax rate an invoice was issued at, recovered from its stored components.
 *
 * Must sum, not take the first. An intra-state Indian invoice stores CGST and
 * SGST at half the rate each, so reading component[0] returns 9% for an 18%
 * invoice — and since that value is fed straight back into the edit form, an
 * invoice edited twice would drift 18% → 9% → 4.5%, quietly under-charging tax
 * the freelancer still owes.
 */
export function taxRateFromComponents(
  components: TaxBreakdownJson["components"],
): number {
  return components.reduce(
    (total, component) => total + component.rateBasisPoints,
    0,
  );
}

/**
 * Whether a stored address is really present.
 *
 * The column holds `{ lines: [...] }`, and a field that was saved and then
 * cleared leaves an empty array behind. That object is truthy and is not an
 * address, so a plain null check would stop warning the user exactly when they
 * have just deleted the thing the warning is about.
 */
export function hasAddress(addressJson: unknown): boolean {
  if (!addressJson || typeof addressJson !== "object") return false;

  const lines = (addressJson as { lines?: unknown }).lines;

  return (
    Array.isArray(lines) &&
    lines.some((line) => typeof line === "string" && line.trim() !== "")
  );
}

/**
 * Add days to an ISO date, staying in UTC.
 *
 * Parsing "2026-09-03" with the local timezone and adding days can land on the
 * previous evening, so a "Net 30" invoice issued in India would come out due
 * on day 29. Anchoring to UTC keeps the arithmetic on calendar days, which is
 * what payment terms actually mean.
 */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
