import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runDiagnostics } from "./checks";

/**
 * These checks are the last line of explanation when a deployment is broken,
 * so a wrong answer here is worse than no page at all — it would send someone
 * to fix a setting that was never the problem.
 */
describe("diagnostics", () => {
  const KEYS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_PLAN_ID_MONTHLY",
    "RAZORPAY_PLAN_ID_ANNUAL",
    "RAZORPAY_WEBHOOK_SECRET",
  ];

  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function find(checks: Awaited<ReturnType<typeof runDiagnostics>>, name: string) {
    const check = checks.find((c) => c.name === name);
    if (!check) throw new Error(`no check named ${name}`);
    return check;
  }

  it("reports sign-in as broken when Supabase is unset, naming both variables", async () => {
    const auth = find(await runDiagnostics(), "Sign in");

    expect(auth.status).toBe("broken");
    expect(auth.detail).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(auth.detail).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  // Half-configured is the realistic mistake: one variable added, one missed.
  it("names only the missing half", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";

    const auth = find(await runDiagnostics(), "Sign in");

    expect(auth.status).toBe("broken");
    expect(auth.detail).not.toContain("NEXT_PUBLIC_SUPABASE_URL,");
    expect(auth.detail).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  /*
   * The failure this page was built for: landing page and login work, every
   * signed-in page is a blank error, and nothing says why.
   */
  it("explains a missing database in terms of what the user sees", async () => {
    const database = find(await runDiagnostics(), "Your data");

    expect(database.status).toBe("broken");
    expect(database.detail).toContain("DATABASE_URL");
    expect(database.impact).toMatch(/landing page and login work/i);
    expect(database.fix?.join(" ")).toContain("6543");
  });

  /*
   * Port 5432 works in testing and collapses under real traffic. Reported as
   * broken while everything still appears fine, because by the time it shows
   * itself the symptom looks like something else entirely.
   */
  it("rejects the direct connection port without trying to connect", async () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:pw@db.example.supabase.co:5432/postgres";

    const database = find(await runDiagnostics(), "Your data");

    expect(database.status).toBe("broken");
    expect(database.detail).toContain("5432");
    expect(database.fix?.join(" ")).toContain("6543");
  });

  it("does not mistake 6543 for the direct port", async () => {
    process.env.DATABASE_URL =
      "postgresql://postgres:pw@db.example.supabase.co:6543/postgres";

    const database = find(await runDiagnostics(), "Your data");

    // Cannot reach a real host here, so it reports a connection failure —
    // what matters is that it got past the port check rather than stopping.
    expect(database.detail).not.toContain("port 5432");
  });

  it("treats payments as optional, not broken", async () => {
    const payments = find(await runDiagnostics(), "Payments");

    expect(payments.status).toBe("optional");
    expect(payments.impact).toMatch(/free plan/i);
  });

  it("warns that a payment without the webhook leaves the customer unupgraded", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_PLAN_ID_MONTHLY = "plan_a";
    process.env.RAZORPAY_PLAN_ID_ANNUAL = "plan_b";

    const payments = find(await runDiagnostics(), "Payments");

    expect(payments.status).toBe("optional");
    expect(payments.detail).toContain("webhook");
    expect(payments.fix?.join(" ")).toMatch(/stays on the free plan/i);
  });

  it("names live mode when the key is a live one", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_live_x";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_PLAN_ID_MONTHLY = "plan_a";
    process.env.RAZORPAY_PLAN_ID_ANNUAL = "plan_b";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";

    const payments = find(await runDiagnostics(), "Payments");

    expect(payments.status).toBe("ok");
    expect(payments.detail).toContain("LIVE");
  });

  // A secret's value must never be read, compared or echoed — only its absence.
  it("never echoes a secret it was given", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "super-secret-value";
    process.env.DATABASE_URL =
      "postgresql://postgres:hunter2@db.example.supabase.co:5432/postgres";

    const serialised = JSON.stringify(await runDiagnostics());

    expect(serialised).not.toContain("super-secret-value");
    expect(serialised).not.toContain("hunter2");
  });
});
