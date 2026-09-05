import { defineConfig } from "drizzle-kit";

import { sslModeFor } from "./src/db/connection";

/**
 * Migrations run against the DIRECT connection (port 5432). The app at runtime
 * uses the pooled one (6543) — mixing them up produces confusing failures.
 *
 * `schemaFilter` keeps drizzle-kit inside `public`, so it never tries to manage
 * Supabase's `auth` schema even though our foreign keys point at `auth.users`.
 *
 * TLS is requested here for the same reason as everywhere else — Supabase
 * refuses plaintext — and it matters more here than most: a migration that
 * cannot connect is how a schema change silently never ships, leaving the code
 * expecting columns the database does not have.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? "",
    ssl: sslModeFor(process.env.DIRECT_DATABASE_URL ?? ""),
  },
  verbose: true,
  strict: true,
});
