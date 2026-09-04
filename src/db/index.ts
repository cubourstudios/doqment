import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  doqmentSql: ReturnType<typeof postgres> | undefined;
  doqmentDb: Database | undefined;
};

function createDb(): Database {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Use the pooled connection string (port 6543); " +
        "DIRECT_DATABASE_URL (port 5432) is only for drizzle-kit migrations.",
    );
  }

  /*
   * `prepare: false` is mandatory: Supabase's pooler runs in transaction mode
   * and does not support prepared statements. Without it everything works
   * locally (direct connection) and fails in production.
   *
   * The client is cached on `globalThis` so Next's dev-mode module reloading
   * doesn't open a new pool on every hot reload.
   */
  /*
   * TLS has to be asked for explicitly.
   *
   * postgres.js defaults to `ssl: false` and only infers otherwise from an
   * `sslmode` in the connection string. Supabase's pooler refuses a plaintext
   * connection with `(ESSLREQUIRED) SSL connection is required`, so with
   * neither the URL nor the options mentioning SSL, nothing connects at all —
   * and every signed-in page reads a profile before it renders, so every one
   * of them throws. What reaches the user is Next's blank "a server error
   * occurred" page with an opaque digest, which says nothing about the cause.
   *
   * Worth knowing why this can break with no deploy behind it: a pooler that
   * once accepted plaintext and later enforces TLS turns a working app into a
   * wholly broken one, and the app's own code never changed.
   *
   * An explicit `sslmode` in the URL still wins, so DATABASE_URL pointed at a
   * local Postgres with `?sslmode=disable` keeps working.
   */
  const sslOptions = connectionString.includes("sslmode=")
    ? {}
    : { ssl: "require" as const };

  const sql =
    globalForDb.doqmentSql ??
    postgres(connectionString, { prepare: false, max: 1, ...sslOptions });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.doqmentSql = sql;
  }

  return drizzle(sql, { schema });
}

function getDb(): Database {
  globalForDb.doqmentDb ??= createDb();
  return globalForDb.doqmentDb;
}

/**
 * This connection authenticates as the database owner, which means it BYPASSES
 * ROW LEVEL SECURITY. Every query against a user-owned table must therefore
 * carry its own `where(eq(table.userId, userId))`. A Drizzle query on user data
 * without a user filter is a security bug, not a style preference.
 *
 * For plain user-scoped reads, prefer the Supabase client instead — RLS covers
 * it there. Reach for Drizzle when you need transactions or complex writes
 * (invoice numbering, version creation).
 *
 * Connecting is deferred to first use rather than done at import: `next build`
 * imports every route module to collect page data, and a connection opened
 * there would make the build require production database credentials.
 */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
