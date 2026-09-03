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
  const sql =
    globalForDb.doqmentSql ??
    postgres(connectionString, { prepare: false, max: 1 });

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
