/**
 * Seeds the public reference data: templates and guidance rules.
 *
 * Idempotent — safe to re-run. Templates are keyed by (doc_type, region,
 * version), so editing seed content and re-running updates in place rather
 * than duplicating. Guidance rules have no natural key, so the whole seeded
 * set is replaced.
 *
 * Touches no user data. Run with `npm run db:seed`.
 */
import { sql } from "drizzle-orm";

import { db } from "./index";
import { guidanceRules, templates } from "./schema";
import { guidanceRulesSeed } from "./seed-data/guidance-rules";
import { templatesSeed } from "./seed-data/templates";

async function seedTemplates() {
  for (const t of templatesSeed) {
    await db
      .insert(templates)
      .values({
        docType: t.docType,
        region: t.region,
        version: t.version,
        name: t.name,
        schemaJson: t.schema,
        bodyJson: t.body,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: [templates.docType, templates.region, templates.version],
        set: {
          name: t.name,
          schemaJson: t.schema,
          bodyJson: t.body,
          isActive: true,
        },
      });
  }
  console.log(`seeded ${templatesSeed.length} templates`);
}

async function seedGuidanceRules() {
  // Replace wholesale: rules are tuned as a set, and a half-updated set would
  // produce checklists that match neither the old nor the new intent.
  await db.execute(sql`TRUNCATE TABLE ${guidanceRules}`);

  await db.insert(guidanceRules).values(
    guidanceRulesSeed.map((r) => ({
      conditionsJson: r.conditions,
      docType: r.docType,
      priority: r.priority,
      rationaleText: r.rationale,
      region: r.region,
      active: true,
    })),
  );
  console.log(`seeded ${guidanceRulesSeed.length} guidance rules`);
}

async function main() {
  await seedTemplates();
  await seedGuidanceRules();
  console.log("seed complete");
  process.exit(0);
}

main().catch((error) => {
  console.error("seed failed:", error);
  process.exit(1);
});
