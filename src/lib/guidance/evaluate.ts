import { valueBandEnum } from "@/db/schema";

import {
  ANY,
  type ChecklistInput,
  type ChecklistItem,
  type GuidancePriority,
  type GuidanceRule,
  type RuleConditions,
  type ValueBand,
} from "./types";

/**
 * The guidance engine (Tech Plan §5) — the product's actual differentiator.
 *
 * Deterministic and pure: same rules plus same project always give the same
 * checklist. That matters more than it might seem. This tells someone what
 * legal protection their project needs; an answer that changes between page
 * loads, or that nobody can explain afterwards, is worse than no answer. It is
 * also why this is rules over a model.
 *
 * Rules live in the database, so the product's advice is edited with an UPDATE
 * rather than a deploy.
 */

/** Band ordering, taken from the enum so it cannot drift from the schema. */
const BAND_ORDER: readonly ValueBand[] = valueBandEnum.enumValues;

const PRIORITY_RANK: Record<GuidancePriority, number> = {
  essential: 0,
  recommended: 1,
  situational: 2,
};

function bandIndex(band: ValueBand): number {
  return BAND_ORDER.indexOf(band);
}

/**
 * Does a project meet a rule's conditions?
 *
 * An absent condition constrains nothing, exactly like an explicit "*". That
 * makes a broad rule easy to write — `{}` matches every project — and keeps
 * authoring rules a matter of naming what you care about.
 */
export function matchesConditions(
  conditions: RuleConditions,
  input: ChecklistInput,
): boolean {
  const { project_type, value_band_min, client_relationship, client_country } =
    conditions;

  if (Array.isArray(project_type) && !project_type.includes(input.projectType)) {
    return false;
  }

  // An inclusive floor: a rule from "50k_2l" also fires for everything above.
  if (value_band_min && bandIndex(input.valueBand) < bandIndex(value_band_min)) {
    return false;
  }

  if (
    client_relationship &&
    client_relationship !== ANY &&
    client_relationship !== input.clientRelationship
  ) {
    return false;
  }

  if (
    client_country &&
    client_country !== ANY &&
    client_country.toUpperCase() !== (input.clientCountry ?? "").toUpperCase()
  ) {
    return false;
  }

  return true;
}

/**
 * Build the checklist for a project.
 *
 * Rules may overlap freely, and are expected to: a broad "recommended" rule and
 * a narrow "essential" one for the same document type coexist without either
 * needing to know about the other. Where they collide, the strongest priority
 * wins — under-stating what a freelancer needs is the more costly error.
 *
 * Ordering is essential → recommended → situational, then by how the caller
 * ordered `docTypeOrder`, so the answer to "what do I do first" is the top of
 * the list.
 */
export function evaluateChecklist(
  rules: GuidanceRule[],
  input: ChecklistInput,
  docTypeOrder: readonly string[] = [],
): ChecklistItem[] {
  const strongest = new Map<string, ChecklistItem>();

  for (const rule of rules) {
    if (!matchesConditions(rule.conditions, input)) continue;

    const existing = strongest.get(rule.docType);

    if (
      !existing ||
      PRIORITY_RANK[rule.priority] < PRIORITY_RANK[existing.priority]
    ) {
      strongest.set(rule.docType, {
        docType: rule.docType,
        priority: rule.priority,
        // The rationale travels with the priority that won. Showing "essential"
        // beside the reasoning for a merely recommended rule would undercut the
        // one thing this feature is for: explaining why.
        rationale: rule.rationale,
      });
    }
  }

  return [...strongest.values()].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;

    return docTypeOrder.indexOf(a.docType) - docTypeOrder.indexOf(b.docType);
  });
}

/**
 * How complete a project's paperwork is, counting only essentials.
 *
 * Recommended and situational documents are deliberately excluded: a meter that
 * can never reach 100% stops meaning anything, and someone who has their
 * essential documents in order genuinely is covered.
 */
export function completeness(
  checklist: ChecklistItem[],
  generatedDocTypes: Iterable<string>,
): { done: number; total: number; percent: number } {
  const generated = new Set(generatedDocTypes);
  const essentials = checklist.filter((item) => item.priority === "essential");
  const done = essentials.filter((item) => generated.has(item.docType)).length;

  return {
    done,
    total: essentials.length,
    // No essentials means nothing outstanding, which is complete, not zero.
    percent:
      essentials.length === 0
        ? 100
        : Math.round((done / essentials.length) * 100),
  };
}
