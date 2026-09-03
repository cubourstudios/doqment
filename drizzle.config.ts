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
  },
  verbose: true,
  strict: true,
});
