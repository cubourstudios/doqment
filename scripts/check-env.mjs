/**
 * Reports which .env.local keys are filled in, without printing their values.
 *
 * Exists because "the file is there and looks right" is not the same as "the
 * values are set" — a key can be present but empty, or hold a placeholder that
 * was never replaced, and the resulting failure surfaces much later as a
 * confusing driver error rather than as a missing variable.
 *
 * Run with `npm run env:check`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_PATH = join(process.cwd(), ".env.local");

/** Needed before anything works at all. */
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
];

if (!existsSync(ENV_PATH)) {
  console.error("✗ .env.local does not exist.\n");
  console.error("  Create it with:  cp .env.example .env.local");
  console.error("  Then fill it in — see docs/setup.md\n");
  process.exit(1);
}

const values = new Map();

for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;

  values.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
}

let missing = 0;

for (const key of REQUIRED) {
  const value = values.get(key) ?? "";

  // A value still carrying Supabase's bracketed placeholder is worse than an
  // empty one: it looks filled in and fails at connection time.
  const placeholder = /\[.*\]|<.*>/.test(value);

  if (!value) {
    console.log(`✗ ${key} — empty`);
    missing += 1;
  } else if (placeholder) {
    console.log(`✗ ${key} — still contains a placeholder like [YOUR-PASSWORD]`);
    missing += 1;
  } else {
    console.log(`✓ ${key} — set (${value.length} chars)`);
  }
}

if (missing > 0) {
  console.log(
    `\n${missing} value(s) still needed. Edit .env.local, save, and run this again.`,
  );
  process.exit(1);
}

console.log("\nAll required values are set. Next: npm run db:setup");
