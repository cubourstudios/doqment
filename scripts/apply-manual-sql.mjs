/**
 * Applies the hand-written SQL in drizzle/manual/ — RLS policies, the signup
 * trigger, storage buckets.
 *
 * drizzle-kit only manages tables and columns, so without this step the schema
 * exists but has no row-level security: every user could read every other
 * user's documents. That makes this part of setup, not an optional extra, which
 * is why `db:setup` runs it rather than leaving three files to paste into the
 * Supabase SQL editor by hand.
 *
 * Every file is written to be re-runnable, so this is safe to run repeatedly.
 * Uses DIRECT_DATABASE_URL (port 5432): the pooler cannot run DDL reliably.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import postgres from "postgres";

const MANUAL_DIR = join(process.cwd(), "drizzle", "manual");

const connectionString = process.env.DIRECT_DATABASE_URL;

if (!connectionString) {
  console.error(
    "DIRECT_DATABASE_URL is not set.\n" +
      "Use the DIRECT connection string (port 5432), not the pooled one — " +
      "the transaction pooler cannot run DDL reliably.",
  );
  process.exit(1);
}

/*
 * Mirrors src/db/connection.ts, which this plain .mjs script cannot import.
 *
 * Worth stating plainly why TLS matters here specifically: this script applies
 * drizzle/manual/0001_rls.sql, which is what enables row level security and
 * creates the "own rows" policies. Supabase's pooler refuses plaintext, so
 * without this the script cannot connect — and a run that never connects
 * leaves RLS off, which means one user's rows are readable by another through
 * the Supabase client. A connection failure here is a data leak, not an
 * inconvenience.
 *
 * An explicit sslmode in the URL is left alone, as is a local database, which
 * has no TLS to require.
 */
const needsSsl =
  !/[?&]sslmode=/i.test(connectionString) &&
  !/@(?:localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(connectionString);

const sql = postgres(connectionString, {
  max: 1,
  ...(needsSsl ? { ssl: "require" } : {}),
  onnotice: () => {},
});

const files = readdirSync(MANUAL_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let failed = false;

for (const file of files) {
  const contents = readFileSync(join(MANUAL_DIR, file), "utf8");

  try {
    await sql.unsafe(contents);
    console.log(`✓ ${file}`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${file}`);
    console.error(`  ${error.message}`);

    // The storage objects are owned by Supabase's storage schema; on a project
    // where that extension is not yet provisioned this one file can fail while
    // the security-critical ones succeed. Say so rather than failing silently.
    if (file.includes("storage")) {
      console.error(
        "  Storage buckets may need creating in the Supabase dashboard instead.",
      );
    }
  }
}

await sql.end();

if (failed) {
  console.error("\nSome SQL did not apply. The schema is not fully secured.");
  process.exit(1);
}

console.log(`\napplied ${files.length} manual SQL file(s)`);
