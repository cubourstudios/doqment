import type { Region } from "@/lib/guidance/types";

/**
 * Country configuration. One country's answer decides four things downstream:
 * which currency we default to, what we call their tax ID, which template
 * region they get, and whether invoice numbering runs on a financial year or a
 * calendar year.
 *
 * Adding a country here plus its `templates` rows is the whole of "supporting"
 * it — that separation is deliberate (Tech Plan §8).
 */
export type CountryConfig = {
  code: string;
  name: string;
  currency: string;
  /** What this country calls the tax registration number, if it has one. */
  taxIdLabel: string | null;
  taxIdType: string | null;
  region: Region;
  /**
   * Month the financial year starts, 1-indexed. India runs April–March, so its
   * invoice series is "FY2026-27"; a January start yields a plain "2026".
   */
  fiscalYearStartMonth: number;
};

const CONFIGS: CountryConfig[] = [
  {
    code: "IN",
    name: "India",
    currency: "INR",
    taxIdLabel: "GSTIN",
    taxIdType: "GSTIN",
    region: "IN",
    fiscalYearStartMonth: 4,
  },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    taxIdLabel: "EIN (optional)",
    taxIdType: "EIN",
    region: "US",
    fiscalYearStartMonth: 1,
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    taxIdLabel: "VAT number",
    taxIdType: "VAT",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    taxIdLabel: "VAT ID (USt-IdNr.)",
    taxIdType: "VAT",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "FR",
    name: "France",
    currency: "EUR",
    taxIdLabel: "VAT ID",
    taxIdType: "VAT",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "NL",
    name: "Netherlands",
    currency: "EUR",
    taxIdLabel: "VAT ID",
    taxIdType: "VAT",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "ES",
    name: "Spain",
    currency: "EUR",
    taxIdLabel: "VAT ID (NIF)",
    taxIdType: "VAT",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    taxIdLabel: "TRN",
    taxIdType: "TRN",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    taxIdLabel: "GST registration number",
    taxIdType: "GST",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
  {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    taxIdLabel: "ABN",
    taxIdType: "ABN",
    region: "INTL",
    fiscalYearStartMonth: 7,
  },
  {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    taxIdLabel: "GST/HST number",
    taxIdType: "GST",
    region: "INTL",
    fiscalYearStartMonth: 1,
  },
];

/**
 * Fallback for a country we have not configured. Never silently pretend it is
 * one we do support: the international template says so on its face, and the
 * tax fields become free text (PRD §5).
 */
export const FALLBACK_COUNTRY: CountryConfig = {
  code: "XX",
  name: "Elsewhere",
  currency: "USD",
  taxIdLabel: "Tax ID",
  taxIdType: null,
  region: "INTL",
  fiscalYearStartMonth: 1,
};

export const COUNTRIES = CONFIGS;

export function getCountryConfig(code: string | null | undefined) {
  if (!code) return FALLBACK_COUNTRY;
  return (
    CONFIGS.find((c) => c.code === code.toUpperCase()) ?? {
      ...FALLBACK_COUNTRY,
      code: code.toUpperCase(),
    }
  );
}

/**
 * The invoice series a date falls in for a given country.
 *
 * India's April–March year produces "FY2026-27"; a calendar year produces
 * "2026". The series is half of the numbering key, so this must stay
 * deterministic — the same date and country always yield the same string.
 */
export function getInvoiceSeries(country: string | null, date: Date): string {
  const { fiscalYearStartMonth } = getCountryConfig(country);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  if (fiscalYearStartMonth === 1) {
    return String(year);
  }

  const startYear = month >= fiscalYearStartMonth ? year : year - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `FY${startYear}-${endShort}`;
}

/** Locale-aware money formatting. Cheap to do now, expensive to retrofit. */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
