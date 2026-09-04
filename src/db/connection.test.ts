import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { postgresOptions, sslModeFor } from "./connection";

/**
 * The bug these guard against: Supabase's pooler refuses unencrypted
 * connections, postgres.js does not negotiate TLS unless asked, and the result
 * was a production database that rejected every query with "SSL connection is
 * required" while the checks all passed.
 */
describe("sslModeFor", () => {
  const supabase =
    "postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres";

  it("requires TLS for a hosted database", () => {
    expect(sslModeFor(supabase)).toBe("require");
  });

  it("requires TLS on the direct connection too", () => {
    expect(
      sslModeFor("postgresql://postgres:pw@db.abc.supabase.co:5432/postgres"),
    ).toBe("require");
  });

  // An explicit choice in the URL is the operator's, and outranks our default.
  it.each(["require", "verify-full", "disable", "prefer"])(
    "defers to an explicit sslmode=%s",
    (mode) => {
      expect(sslModeFor(`${supabase}?sslmode=${mode}`)).toBeUndefined();
    },
  );

  it("defers to sslmode given as a later parameter", () => {
    expect(sslModeFor(`${supabase}?pgbouncer=true&sslmode=disable`)).toBeUndefined();
  });

  // A local Postgres has no TLS, so requiring it would break development.
  it.each([
    "postgresql://postgres:pw@localhost:5432/doqment",
    "postgresql://postgres:pw@127.0.0.1:5432/doqment",
    "postgresql://postgres:pw@[::1]:5432/doqment",
  ])("leaves a local database alone: %s", (url) => {
    expect(sslModeFor(url)).toBeUndefined();
  });

  /*
   * A hostname merely containing "localhost" is not local. Getting this wrong
   * would silently drop TLS against a real database — a worse failure than the
   * one being fixed, because it would connect and appear to work.
   */
  it("does not mistake a remote host containing 'localhost' for a local one", () => {
    expect(
      sslModeFor("postgresql://postgres:pw@localhost.example.com:6543/postgres"),
    ).toBe("require");
  });
});

describe("postgresOptions", () => {
  it("always disables prepared statements", () => {
    // Supabase's transaction-mode pooler does not support them.
    expect(postgresOptions("postgresql://u:p@host:6543/db").prepare).toBe(false);
    expect(postgresOptions("postgresql://u:p@localhost:5432/db").prepare).toBe(
      false,
    );
  });

  it("omits ssl entirely rather than passing undefined", () => {
    // postgres.js treats an explicit `ssl: undefined` differently from absence.
    expect("ssl" in postgresOptions("postgresql://u:p@localhost:5432/db")).toBe(
      false,
    );
  });

  it("requires ssl for a hosted database", () => {
    expect(postgresOptions("postgresql://u:p@host.supabase.com:6543/db")).toEqual(
      { prepare: false, ssl: "require" },
    );
  });

  /*
   * check-db.mjs is plain JavaScript and cannot import this module, so it
   * carries a copy. A copy that drifts would connect differently from the app
   * — which is the precise failure this whole module exists to prevent.
   */
  it.each(["scripts/check-db.mjs", "scripts/apply-manual-sql.mjs"])(
    "keeps %s connecting the same way",
    (path) => {
      const script = readFileSync(path, "utf8");

      expect(script).toContain('ssl: "require"');
      expect(script).toMatch(/sslmode=/);
      expect(script).toMatch(/localhost/);
    },
  );

  /*
   * drizzle.config.ts is TypeScript, so it imports this module rather than
   * copying it. Pinned anyway: a migration that cannot connect is how a schema
   * change silently never ships, and the app then expects columns the database
   * does not have — which is the failure that took the dashboard down.
   */
  it("keeps migrations connecting the same way", () => {
    const config = readFileSync("drizzle.config.ts", "utf8");

    expect(config).toContain("sslModeFor");
    expect(config).toMatch(/ssl:\s*sslModeFor/);
  });
});
