/**
 * Pure helpers behind `npm run setup`.
 *
 * Kept separate from the prompting so the fiddly parts — parsing an existing
 * file, substituting a password into a connection string, rendering the
 * result — can be unit tested without a terminal.
 */

/** Supabase ships connection strings with a bracketed placeholder. */
export const PLACEHOLDER = /\[[^\]]*\]/;

export function parseEnvFile(contents) {
  const values = new Map();

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    values.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }

  return values;
}

/** Show enough of a value to recognise it, never enough to leak it. */
export function preview(value) {
  if (value.length <= 12) return "•".repeat(value.length);
  return `${value.slice(0, 6)}…${value.slice(-4)} (${value.length} chars)`;
}

/**
 * Substitute a database password into a connection string, URL-encoding it.
 *
 * The encoding matters: passwords routinely contain `@`, `#` or `/`, and an
 * unencoded one silently truncates the host or the database name rather than
 * failing outright.
 */
export function fillPassword(connectionString, password) {
  if (!PLACEHOLDER.test(connectionString)) return connectionString;
  return connectionString.replace(PLACEHOLDER, encodeURIComponent(password));
}

export function renderEnvFile(answers, existing = new Map()) {
  const get = (key) => answers.get(key) ?? existing.get(key) ?? "";

  return `# Written by \`npm run setup\`. Safe to edit by hand.
# Never commit this file — it is gitignored.

# --- Supabase ---------------------------------------------------------------

NEXT_PUBLIC_SUPABASE_URL=${get("NEXT_PUBLIC_SUPABASE_URL")}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${get("NEXT_PUBLIC_SUPABASE_ANON_KEY")}

# Server-only. Bypasses row level security — never prefix this NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=${get("SUPABASE_SERVICE_ROLE_KEY")}

# --- Postgres ---------------------------------------------------------------
# Pooled (transaction mode), port 6543 — used by the app at runtime.
DATABASE_URL=${get("DATABASE_URL")}

# Port 5432 — used by drizzle-kit for migrations.
DIRECT_DATABASE_URL=${get("DIRECT_DATABASE_URL")}

# --- Razorpay (not needed until the billing phase) --------------------------

RAZORPAY_KEY_ID=${get("RAZORPAY_KEY_ID")}
RAZORPAY_KEY_SECRET=${get("RAZORPAY_KEY_SECRET")}
RAZORPAY_WEBHOOK_SECRET=${get("RAZORPAY_WEBHOOK_SECRET")}
NEXT_PUBLIC_RAZORPAY_KEY_ID=${get("NEXT_PUBLIC_RAZORPAY_KEY_ID")}

# Razorpay plan ids. A plan fixes its currency, so INR and USD need their own.
# The USD pair also needs International Payments enabled on the account.
RAZORPAY_PLAN_ID_MONTHLY=${get("RAZORPAY_PLAN_ID_MONTHLY")}
RAZORPAY_PLAN_ID_ANNUAL=${get("RAZORPAY_PLAN_ID_ANNUAL")}
RAZORPAY_PLAN_ID_MONTHLY_USD=${get("RAZORPAY_PLAN_ID_MONTHLY_USD")}
RAZORPAY_PLAN_ID_ANNUAL_USD=${get("RAZORPAY_PLAN_ID_ANNUAL_USD")}

# --- App --------------------------------------------------------------------

NEXT_PUBLIC_APP_URL=${get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000"}
`;
}

export const FIELDS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase project URL",
    hint: "Settings → API → Project URL. Looks like https://abcd1234.supabase.co",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    label: "Supabase anon (public) key",
    hint: "Settings → API → the key labelled 'anon' / 'public'",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase service_role key",
    hint: "Settings → API → the key labelled 'service_role' (click Reveal)",
  },
  {
    key: "DATABASE_URL",
    label: "Transaction pooler connection string (port 6543)",
    hint: "Settings → Database → Connection string → Transaction pooler",
    isConnectionString: true,
  },
  {
    key: "DIRECT_DATABASE_URL",
    label: "Session pooler connection string (port 5432)",
    hint: "Settings → Database → Connection string → Session pooler",
    isConnectionString: true,
  },
];
