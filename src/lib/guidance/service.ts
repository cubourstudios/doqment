import { and, eq, isNull, lt, ne } from "drizzle-orm";

import { db } from "@/db";
import { documents, guidanceRules, projects } from "@/db/schema";
import { getCountryConfig } from "@/lib/regions";

import { completeness, evaluateChecklist } from "./evaluate";
import type {
  ChecklistInput,
  ChecklistItem,
  ClientRelationship,
  GuidanceRule,
  Region,
  RuleConditions,
} from "./types";

/**
 * Display order for documents of equal priority: roughly the order a project
 * actually moves through them. Someone reading the checklist top to bottom
 * should be reading it in the order they will do the work.
 */
export const DOC_TYPE_ORDER = [
  "proposal",
  "service_agreement",
  "sow",
  "nda",
  "invoice",
  "payment_reminder",
] as const;

async function fetchRules(region: Region): Promise<GuidanceRule[]> {
  const rows = await db
    .select()
    .from(guidanceRules)
    .where(and(eq(guidanceRules.region, region), eq(guidanceRules.active, true)));

  return rows.map((row) => ({
    id: row.id,
    conditions: row.conditionsJson as RuleConditions,
    docType: row.docType,
    priority: row.priority,
    rationale: row.rationaleText,
    region: row.region,
  }));
}

/**
 * Is this a client the freelancer has worked with before?
 *
 * Derived rather than stored, and derived from projects created *before* this
 * one: a client's second project should see them as a repeat client even though
 * both projects exist by the time anyone looks. Storing the answer at creation
 * time would freeze it and make the checklist wrong later.
 */
async function clientRelationship(
  userId: string,
  projectId: string,
  clientId: string | null,
  createdAt: Date,
): Promise<ClientRelationship> {
  if (!clientId) return "new";

  const [earlier] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.clientId, clientId),
        ne(projects.id, projectId),
        lt(projects.createdAt, createdAt),
      ),
    )
    .limit(1);

  return earlier ? "repeat" : "new";
}

export type ProjectChecklist = {
  items: ChecklistItem[];
  generated: Set<string>;
  completeness: ReturnType<typeof completeness>;
  input: ChecklistInput;
};

/**
 * The checklist for one project, plus which of its documents already exist.
 *
 * Region comes from the *user's* country, not the client's: the templates and
 * tax rules that apply are those of the person issuing the document. The
 * client's country is a rule input, not a template selector.
 */
export async function getProjectChecklist(
  userId: string,
  userCountry: string | null,
  project: {
    id: string;
    clientId: string | null;
    projectType: ChecklistInput["projectType"];
    valueBand: ChecklistInput["valueBand"];
    createdAt: Date;
  },
  clientCountry: string | null,
): Promise<ProjectChecklist> {
  const region = getCountryConfig(userCountry).region;

  const [rules, relationship, existingDocs] = await Promise.all([
    fetchRules(region),
    clientRelationship(userId, project.id, project.clientId, project.createdAt),
    db
      .select({ docType: documents.docType })
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          eq(documents.projectId, project.id),
          isNull(documents.deletedAt),
        ),
      ),
  ]);

  const input: ChecklistInput = {
    projectType: project.projectType,
    valueBand: project.valueBand,
    clientCountry,
    clientRelationship: relationship,
  };

  const items = evaluateChecklist(rules, input, DOC_TYPE_ORDER);
  const generated = new Set(existingDocs.map((d) => d.docType));

  return {
    items,
    generated,
    completeness: completeness(items, generated),
    input,
  };
}
