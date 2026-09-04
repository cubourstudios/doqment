/**
 * How to connect to Postgres.
 *
 * Separated from the client itself because three callers need to agree on it —
 * the app, the diagnostics page and scripts/check-db.mjs — and a health check
 * that connects differently from the app is worse than none: it reports healthy
 * against a connection the app cannot make. That is exactly what happened. The
 * checks passed locally while every signed-in page in production failed with
 * `SSL connection is required for user: postgres`.
 */

/**
 * Whether to demand TLS.
 *
 * Supabase's pooler refuses unencrypted connections, and postgres.js does not
 * negotiate TLS unless asked — so the default of "off" fails against the one
 * database this app is built for. Requiring it here rather than relying on
 * every deployment to append `?sslmode=require` by hand: a setting that must be
 * remembered in four places is a setting that will be missed in one.
 *
 * `require` encrypts without verifying the pooler's certificate chain.
 * `verify-full` would be stronger, but Supabase fronts the pooler with
 * certificates that do not reliably verify from every runtime, and a database
 * that refuses to connect is not more secure than one that connects over TLS —
 * it is an outage. The traffic is encrypted; only the identity check is
 * relaxed, on a connection that stays inside the provider's network.
 *
 * Returns undefined — meaning "leave postgres.js to its own defaults" — when
 * the URL already states an sslmode, so an explicit choice is never overridden,
 * and for a local database, which has no TLS to require.
 */
export function sslModeFor(connectionString: string): "require" | undefined {
  if (/[?&]sslmode=/i.test(connectionString)) return undefined;

  if (/@(?:localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(connectionString)) {
    return undefined;
  }

  return "require";
}

/** The options every postgres.js client in this project is created with. */
export function postgresOptions(connectionString: string) {
  const ssl = sslModeFor(connectionString);

  return {
    /*
     * Mandatory. Supabase's pooler runs in transaction mode and does not
     * support prepared statements; without this, queries fail there while
     * working against a direct connection.
     */
    prepare: false,
    ...(ssl ? { ssl } : {}),
  };
}
