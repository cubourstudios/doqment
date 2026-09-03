import type {
  DocType,
  GuidancePriority,
  ProjectType,
  ValueBand,
} from "@/lib/guidance/types";
import type { projectStatusEnum, invoiceStatusEnum } from "@/db/schema";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  design: "Design",
  development: "Development",
  writing: "Writing",
  consulting: "Consulting",
  other: "Something else",
};

export const PROJECT_STATUS_LABELS: Record<
  (typeof projectStatusEnum.enumValues)[number],
  string
> = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export const INVOICE_STATUS_LABELS: Record<
  (typeof invoiceStatusEnum.enumValues)[number],
  string
> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  proposal: "Proposal",
  service_agreement: "Service Agreement",
  sow: "Statement of Work",
  nda: "NDA",
  invoice: "Invoice",
  payment_reminder: "Payment Reminder",
};

export const PRIORITY_LABELS: Record<GuidancePriority, string> = {
  essential: "Essential",
  recommended: "Recommended",
  situational: "If it applies",
};

/**
 * Value bands are stored as one ordered set but shown in the user's own money.
 * Asking an American freelancer to place their project in a "₹50K–2L" bracket
 * is a needless piece of mental arithmetic, and one they will get wrong.
 *
 * The boundaries are approximate on purpose — the band only has to be right
 * enough to pick the correct documents.
 */
const VALUE_BAND_RANGES: Record<ValueBand, { inr: string; other: string }> = {
  under_50k: { inr: "Under ₹50,000", other: "Under 600" },
  "50k_2l": { inr: "₹50,000 – ₹2 lakh", other: "600 – 2,500" },
  "2l_10l": { inr: "₹2 lakh – ₹10 lakh", other: "2,500 – 12,000" },
  above_10l: { inr: "Over ₹10 lakh", other: "Over 12,000" },
};

export function valueBandLabel(band: ValueBand, currency: string): string {
  const range = VALUE_BAND_RANGES[band];
  if (currency === "INR") return range.inr;

  const symbol = currencySymbol(currency);
  return range.other
    .replace(/^Under /, `Under ${symbol}`)
    .replace(/^Over /, `Over ${symbol}`)
    .replace(/^(\d[\d,]*) – (\d[\d,]*)$/, `${symbol}$1 – ${symbol}$2`);
}

function currencySymbol(currency: string): string {
  try {
    // Format a known amount and strip the digits back out — this is the only
    // way to get a symbol without shipping a currency table.
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
        .format(0)
        .replace(/[\d\s.,]/g, "") || currency
    );
  } catch {
    return currency;
  }
}
