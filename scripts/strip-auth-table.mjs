/**
 * Post-processes freshly generated Drizzle migrations.
 *
 * `src/db/schema.ts` declares `auth.users` so our foreign keys can point at it
 * (we want ON DELETE CASCADE for account deletion). But that table belongs to
 * Supabase Auth and already exists — drizzle-kit doesn't know that and emits a
 * `CREATE TABLE "auth"."users"` we must never run.
 *
 * `schemaFilter` doesn't help here: it scopes introspection, not codegen. So
 * this script strips the create statements while leaving the FKs intact, and
 * runs as part of `npm run db:generate` so nobody has to remember to do it.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

const STATEMENT_SEPARATOR = "--> statement-breakpoint";

/** Statements that would try to create Supabase-owned objects. */
function isSupabaseOwned(statement) {
  const normalized = statement.replace(/\s+/g, " ").trim();
  return (
    /^CREATE SCHEMA (IF NOT EXISTS )?"?auth"?/i.test(normalized) ||
    /^CREATE TABLE "?auth"?\."?users"?/i.test(normalized)
  );
}

let strippedTotal = 0;

for (const file of readdirSync(MIGRATIONS_DIR)) {
  if (!file.endsWith(".sql")) continue;

  const path = join(MIGRATIONS_DIR, file);
  const original = readFileSync(path, "utf8");
  const statements = original.split(STATEMENT_SEPARATOR);
  const kept = statements.filter((s) => !isSupabaseOwned(s));

  if (kept.length === statements.length) continue;

  strippedTotal += statements.length - kept.length;
  writeFileSync(path, kept.join(STATEMENT_SEPARATOR).replace(/^\s+/, ""));
  console.log(
    `stripped ${statements.length - kept.length} Supabase-owned statement(s) from ${file}`,
  );
}

if (strippedTotal === 0) {
  console.log("no Supabase-owned statements to strip");
}
