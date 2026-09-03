import type {
  docTypeEnum,
  guidancePriorityEnum,
  projectTypeEnum,
  regionEnum,
  valueBandEnum,
} from "@/db/schema";

export type DocType = (typeof docTypeEnum.enumValues)[number];
export type ProjectType = (typeof projectTypeEnum.enumValues)[number];
export type ValueBand = (typeof valueBandEnum.enumValues)[number];
export type Region = (typeof regionEnum.enumValues)[number];
export type GuidancePriority = (typeof guidancePriorityEnum.enumValues)[number];

/** Whether this is the first project with the client, derived from their history. */
export type ClientRelationship = "new" | "repeat";

/** Wildcard: the condition places no constraint on that dimension. */
export const ANY = "*" as const;
export type Any = typeof ANY;

/**
 * A rule's stored conditions (Tech Plan §5). Every field is optional; an absent
 * field constrains nothing, exactly like an explicit "*".
 *
 * `value_band_min` is an inclusive floor compared in enum order, so a rule that
 * fires from "50k_2l" also fires for "2l_10l" and "above_10l".
 */
export type RuleConditions = {
  project_type?: ProjectType[] | Any;
  value_band_min?: ValueBand;
  client_relationship?: ClientRelationship | Any;
  client_country?: string | Any;
};

/** A rule as it lives in the `guidance_rules` table. */
export type GuidanceRule = {
  id: string;
  conditions: RuleConditions;
  docType: DocType;
  priority: GuidancePriority;
  rationale: string;
  region: Region;
};

/** What we know about a project when building its checklist. */
export type ChecklistInput = {
  projectType: ProjectType;
  valueBand: ValueBand;
  clientCountry: string | null;
  clientRelationship: ClientRelationship;
};

/** One row of the checklist: a document to create, and why. */
export type ChecklistItem = {
  docType: DocType;
  priority: GuidancePriority;
  rationale: string;
};
