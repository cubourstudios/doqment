import { z } from "zod";

/**
 * A calendar date, as an `<input type="date">` submits it.
 *
 * Shared rather than declared per form, because every one of these values ends
 * up in a Postgres `date` column and the failure is identical wherever the
 * check is missing: the driver raises `invalid input syntax for type date`,
 * the throw escapes the server action, and the user gets an error boundary
 * instead of a message pointing at the field. A `required` attribute on the
 * input is a convenience for people using a browser, not a guarantee about
 * what arrives.
 *
 * The parse check is not redundant beside the pattern. "2026-02-31" matches
 * the shape and is not a date, and for an invoice the issue date also decides
 * the numbering series — `new Date("nonsense")` formats as the series
 * "FYNaN-NaN" on its way to a database error.
 */
export const calendarDate = z
  .string()
  .trim()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
    "Enter a date like 2026-09-03",
  );

/** The same date, where empty means "not set". */
export const optionalCalendarDate = calendarDate
  .optional()
  .or(z.literal(""));
