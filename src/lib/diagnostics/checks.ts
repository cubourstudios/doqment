import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";

import { readSupabaseConfig } from "@/lib/supabase/env";

/**
 * What is actually wrong with this deployment.
 *
 * Written for the person who owns the app rather than the person who wrote it.
 * A misconfigured deployment fails as an opaque 500 — the hosting platform
 * shows a correlation id, the real message goes to a log the owner may not
 * know how to reach, and the fault is a single missing setting. That gap has
 * cost this project more time than any bug in it.
 *
 * Each check answers three things: whether it is set up, what breaks while it
 * is not, and the specific steps to fix it. No value of any secret is read,
 * compared or returned — only whether a name has something behind it.
 */

export type CheckStatus = "ok" | "broken" | "optional";

export type Check = {
  name: string;
  status: CheckStatus;
  /** What is true right now, in one line. */
  detail: string;
  /** What the user cannot do until this is fixed. Omitted when ok. */
  impact?: string;
  /** Ordered, literal steps. Omitted when ok. */
  fix?: string[];
};

function has(name: string): boolean {
  return Boolean(process.env[name]);
}

/**
 * Sign-in. Checked first because without it nobody reaches this page at all —
 * so if it is broken, the reader is seeing it locally, not in production.
 */
function checkAuth(): Check {
  if (readSupabaseConfig()) {
    return {
      name: "Sign in",
      status: "ok",
      detail: "Connected to Supabase.",
    };
  }

  const missing = [
    !has("NEXT_PUBLIC_SUPABASE_URL") && "NEXT_PUBLIC_SUPABASE_URL",
    !has("NEXT_PUBLIC_SUPABASE_ANON_KEY") && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  return {
    name: "Sign in",
    status: "broken",
    detail: `Missing: ${missing.join(", ")}`,
    impact: "Nobody can sign up or log in.",
    fix: [
      "Open Supabase → Settings → API.",
      "Copy the Project URL into NEXT_PUBLIC_SUPABASE_URL.",
      "Copy the key labelled 'anon' or 'publishable' into NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      "Add both in your hosting provider's environment variables, then redeploy.",
    ],
  };
}

/**
 * The database. The usual cause of a dashboard that fails while the landing
 * page and login both work, because it is the first thing a signed-in page
 * needs and neither of the other two touches it.
 */
async function checkDatabase(): Promise<Check> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return {
      name: "Your data",
      status: "broken",
      detail: "Missing: DATABASE_URL",
      impact:
        "The landing page and login work, but every signed-in page fails — " +
        "dashboard, projects, clients, invoices.",
      fix: [
        "Open Supabase → Settings → Database.",
        "Under 'Connection string', choose Transaction pooler.",
        "Copy it. The port must be 6543, not 5432.",
        "Replace [YOUR-PASSWORD] in it with your database password.",
        "Add it as DATABASE_URL in your hosting provider, then redeploy.",
      ],
    };
  }

  /*
   * Port 5432 is the direct connection. It works in testing and then fails
   * under real traffic, because serverless functions open a connection per
   * request and exhaust the server's limit within minutes. Worth naming as a
   * fault while everything still appears to work.
   */
  if (/:5432\b/.test(connectionString)) {
    return {
      name: "Your data",
      status: "broken",
      detail: "DATABASE_URL uses port 5432 — the direct connection.",
      impact:
        "Works now, then fails once several people use the app at once. " +
        "The pooled connection is required for serverless hosting.",
      fix: [
        "Open Supabase → Settings → Database.",
        "Under 'Connection string', choose Transaction pooler — port 6543.",
        "Replace DATABASE_URL with it, then redeploy.",
      ],
    };
  }

  // A separate short-lived connection: reusing the app's pooled client would
  // report healthy from a cached handle rather than testing anything.
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    connect_timeout: 8,
    onnotice: () => {},
  });

  try {
    const applied = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;

    const journal = JSON.parse(
      readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
    ) as { entries: unknown[] };

    const pending = journal.entries.length - applied[0].n;

    if (pending > 0) {
      return {
        name: "Your data",
        status: "broken",
        detail: `Connected, but ${pending} database update(s) have not been applied.`,
        impact:
          "Signed-in pages fail, because the app expects columns the " +
          "database does not have yet.",
        fix: [
          "On the computer with the project checked out, run:",
          "npm run db:migrate",
          "Then reload this page.",
        ],
      };
    }

    return {
      name: "Your data",
      status: "ok",
      detail: "Connected, and every database update has been applied.",
    };
  } catch (error) {
    /*
     * The message is included because it is the one thing that has been
     * missing all along. It comes from the driver, names a host or a database,
     * and contains no password — the connection string itself is never shown.
     */
    return {
      name: "Your data",
      status: "broken",
      detail: `DATABASE_URL is set, but connecting failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      impact: "Every signed-in page fails.",
      fix: [
        "Check the password in DATABASE_URL is your database password, not your Supabase account password.",
        "Check [YOUR-PASSWORD] was actually replaced.",
        "Confirm the project is not paused in Supabase → Settings → General.",
      ],
    };
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

/** Needed only for account deletion and file uploads, so not fatal. */
function checkServiceRole(): Check {
  return has("SUPABASE_SERVICE_ROLE_KEY")
    ? { name: "File uploads and account deletion", status: "ok", detail: "Configured." }
    : {
        name: "File uploads and account deletion",
        status: "broken",
        detail: "Missing: SUPABASE_SERVICE_ROLE_KEY",
        impact: "Logo uploads and deleting an account fail. Everything else works.",
        fix: [
          "Open Supabase → Settings → API.",
          "Reveal the key labelled 'service_role' or 'secret'.",
          "Add it as SUPABASE_SERVICE_ROLE_KEY, then redeploy.",
          "Never give this one a NEXT_PUBLIC_ prefix — it would be sent to every browser.",
        ],
      };
}

/**
 * Payments. Reported as optional because a free-plan app is fully usable
 * without it, and the upgrade screen already says so rather than failing.
 */
function checkPayments(): Check {
  const keys = has("RAZORPAY_KEY_ID") && has("RAZORPAY_KEY_SECRET");
  const plans = has("RAZORPAY_PLAN_ID_MONTHLY") && has("RAZORPAY_PLAN_ID_ANNUAL");
  const webhook = has("RAZORPAY_WEBHOOK_SECRET");

  if (keys && plans && webhook) {
    return {
      name: "Payments",
      status: "ok",
      detail: `Razorpay configured in ${
        process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "LIVE" : "test"
      } mode.`,
    };
  }

  const missing = [
    !keys && "the API keys",
    !plans && "the plan IDs",
    !webhook && "the webhook secret",
  ].filter(Boolean);

  return {
    name: "Payments",
    status: "optional",
    detail: `Not finished — missing ${missing.join(" and ")}.`,
    impact:
      "Nobody can upgrade to Pro. The app works on the free plan, and the " +
      "upgrade screen says payments are unavailable rather than failing.",
    fix: [
      "Run npm run razorpay:plans to create the plans.",
      "Run npm run razorpay:check to confirm the keys and prices agree.",
      "Add the webhook in Razorpay → Settings → Webhooks, pointing at /api/webhooks/razorpay.",
      "Without the webhook, a payment succeeds and the customer stays on the free plan.",
    ],
  };
}

export async function runDiagnostics(): Promise<Check[]> {
  return [
    checkAuth(),
    await checkDatabase(),
    checkServiceRole(),
    checkPayments(),
  ];
}
