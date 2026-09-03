/**
 * The guidance engine's seed rules — the product's actual differentiator.
 *
 * These are data, not code: editing a rationale or adding a rule is an UPDATE,
 * never a deploy. What is seeded here is the starting set; the live table is
 * expected to drift ahead of it as we learn which documents users actually
 * generate.
 *
 * Authoring notes:
 *  - Rationales are one sentence, in the second person, and say what goes wrong
 *    without the document. "You need an SOW" teaches nobody anything.
 *  - Rules may overlap freely. The engine keeps the highest priority per
 *    document type, so a broad "recommended" rule and a narrow "essential" one
 *    coexist without special-casing.
 *  - The IN set is tuned so the PRD §6 acceptance case (design project,
 *    ₹50K–2L, Indian client, new relationship) yields exactly: proposal,
 *    service agreement, SOW and invoice as essential, NDA as recommended, and
 *    payment reminder as situational.
 */
import type { GuidancePriority, Region, RuleConditions } from "@/lib/guidance/types";
import type { docTypeEnum } from "@/db/schema";

type SeedRule = {
  conditions: RuleConditions;
  docType: (typeof docTypeEnum.enumValues)[number];
  priority: GuidancePriority;
  rationale: string;
};

/** Project types for which a written statement of work genuinely earns its keep. */
const DELIVERABLE_BASED = [
  "design",
  "development",
  "writing",
  "consulting",
] as const;

/**
 * The nine rules every region shares. Only the wording of the invoice rule
 * differs by region, so it is passed in.
 */
function baseRules(invoiceRationale: string): SeedRule[] {
  return [
    {
      conditions: {},
      docType: "invoice",
      priority: "essential",
      rationale: invoiceRationale,
    },
    {
      conditions: { client_relationship: "new" },
      docType: "proposal",
      priority: "essential",
      rationale:
        "A written proposal is what turns a friendly conversation into an agreed scope and price you can point back to.",
    },
    {
      conditions: { client_relationship: "repeat" },
      docType: "proposal",
      priority: "recommended",
      rationale:
        "Even with a client you know, a short proposal for this brief stops last time's assumptions quietly carrying over.",
    },
    {
      conditions: { client_relationship: "new", value_band_min: "50k_2l" },
      docType: "service_agreement",
      priority: "essential",
      rationale:
        "New client and significant value: a signed agreement is your only enforceable protection if payment is disputed.",
    },
    {
      conditions: { client_relationship: "repeat", value_band_min: "50k_2l" },
      docType: "service_agreement",
      priority: "recommended",
      rationale:
        "A standing agreement with this client saves you renegotiating payment terms and liability on every brief.",
    },
    {
      conditions: {
        project_type: [...DELIVERABLE_BASED],
        value_band_min: "50k_2l",
      },
      docType: "sow",
      priority: "essential",
      rationale:
        "Deliverables, revision rounds and dates in writing are what end the \"I thought that was included\" argument.",
    },
    {
      conditions: { client_relationship: "new" },
      docType: "nda",
      priority: "recommended",
      rationale:
        "If this client will share customer data, credentials or unreleased plans, get this signed before they send anything.",
    },
    {
      conditions: { client_relationship: "new", value_band_min: "above_10l" },
      docType: "nda",
      priority: "essential",
      rationale:
        "At this contract size you will be handling material the client cannot afford to see leak — make the obligation explicit and mutual.",
    },
    {
      conditions: {},
      docType: "payment_reminder",
      priority: "situational",
      rationale:
        "Keep one ready: a firm, polite reminder recovers most late payments without souring the relationship.",
    },
  ];
}

const INVOICE_RATIONALE: Record<Region, string> = {
  IN: "A GST-compliant tax invoice with a sequential number is both how you get paid and what the tax authorities expect you to have kept.",
  US: "An invoice with clear terms and a due date is how you get paid — and your record of the income at tax time.",
  INTL:
    "An invoice with clear terms, currency and a due date is how you get paid across borders without a follow-up conversation.",
};

export const guidanceRulesSeed: (SeedRule & { region: Region })[] = (
  Object.keys(INVOICE_RATIONALE) as Region[]
).flatMap((region) =>
  baseRules(INVOICE_RATIONALE[region]).map((rule) => ({ ...rule, region })),
);
