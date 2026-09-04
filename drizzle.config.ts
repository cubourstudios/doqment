import { defineConfig } from "drizzle-kit";

/**
 * Migrations run against the DIRECT connection (port 5432). The app at runtime
 * uses the pooled one (6543) — mixing them up produces confusing failures.
 *
 * `schemaFilter` keeps drizzle-kit inside `public`, so it never tries to manage
 * Supabase's `auth` schema even though our foreign keys point at `auth.users`.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
    /*
     * Requested explicitly, for the same reason src/db/index.ts does: the
     * driver does not enable TLS on its own and Supabase's pooler rejects a
     * plaintext connection, which would fail `db:migrate` — and a migration
     * that cannot run is how a schema change silently never ships.
     */
    ssl: "require",
  },
  verbose: true,
  strict: true,
});
