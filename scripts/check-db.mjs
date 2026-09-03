/**
 * Verifies a Supabase project is wired up correctly.
 *
 * Checks the four things that are individually easy to get wrong and that fail
 * confusingly later: the connection works, the tables exist, RLS is actually
 * enabled on every user-owned table, and the reference data is seeded.
 *
 * Run with `npm run db:check`.
 */
import postgres from "postgres";

const EXPECTED_TABLES = [
  "profiles",
  "clients",
  "projects",
  "templates",
  "documents",
  "document_versions",
  "invoices",
  "invoice_counters",
  "guidance_rules",
  "uploads",
  "disclaimer_logs",
  "subscriptions",
  "webhook_events",
  "events",
];

/** Tables where missing RLS would expose one user's data to another. */
const MUST_HAVE_RLS = [
  "profiles",
  "clients",
  "projects",
  "documents",
  "document_versions",
  "invoices",
  "invoice_counters",
  "uploads",
  "disclaimer_logs",
  "subscriptions",
  "events",
  "webhook_events",
];

const connectionString =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Neither DIRECT_DATABASE_URL nor DATABASE_URL is set.");
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  onnotice: () => {},
});

let problems = 0;

function report(ok, message) {
  console.log(`${ok ? "✓" : "✗"} ${message}`);
  if (!ok) problems += 1;
}

try {
  const [{ version }] = await sql`SELECT version()`;
  report(true, `connected — ${version.split(",")[0]}`);

  const tables = (
    await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  ).map((r) => r.tablename);

  const missing = EXPECTED_TABLES.filter((t) => !tables.includes(t));
  report(
    missing.length === 0,
    missing.length === 0
      ? `all ${EXPECTED_TABLES.length} tables present`
      : `missing tables: ${missing.join(", ")} — run npm run db:migrate`,
  );

  const rlsRows = await sql`
    SELECT relname, relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  `;
  const rlsOff = MUST_HAVE_RLS.filter(
    (t) => rlsRows.find((r) => r.relname === t)?.relrowsecurity === false,
  );
  report(
    rlsOff.length === 0,
    rlsOff.length === 0
      ? "row level security enabled on every user-owned table"
      : `RLS OFF on: ${rlsOff.join(", ")} — run npm run db:manual`,
  );

  if (tables.includes("templates")) {
    const [{ count: templateCount }] =
      await sql`SELECT count(*)::int FROM templates`;
    report(
      templateCount > 0,
      templateCount > 0
        ? `${templateCount} templates seeded`
        : "no templates — run npm run db:seed",
    );
  }

  if (tables.includes("guidance_rules")) {
    const [{ count: ruleCount }] =
      await sql`SELECT count(*)::int FROM guidance_rules`;
    report(
      ruleCount > 0,
      ruleCount > 0
        ? `${ruleCount} guidance rules seeded`
        : "no guidance rules — run npm run db:seed",
    );
  }

  const [trigger] = await sql`
    SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  `;
  report(
    Boolean(trigger),
    trigger
      ? "signup trigger installed"
      : "signup trigger missing — new users will have no profile row",
  );
} catch (error) {
  console.error(`✗ ${error.message}`);
  problems += 1;
} finally {
  await sql.end();
}

process.exit(problems > 0 ? 1 : 0);
