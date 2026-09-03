/**
 * Interactive .env.local setup.
 *
 * Hand-editing a hidden dotfile is the most error-prone step in getting this
 * project running: the file is invisible in Finder, a stray `cp` silently wipes
 * it, and Supabase's connection strings ship with a bracketed password
 * placeholder that is easy to leave in. This asks the questions instead.
 *
 * Run with `npm run setup`. The logic lives in ./env-file.mjs so it can be
 * tested without a terminal.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import {
  FIELDS,
  PLACEHOLDER,
  fillPassword,
  parseEnvFile,
  preview,
  renderEnvFile,
} from "./env-file.mjs";

const ENV_PATH = join(process.cwd(), ".env.local");

// Without a terminal, readline's first question never resolves and the process
// hangs on an unsettled await. Say so instead.
if (!stdin.isTTY) {
  console.error(
    "npm run setup needs an interactive terminal.\n\n" +
      "If you are piping input or running this in CI, copy .env.example to\n" +
      ".env.local and fill it in directly, then run: npm run env:check",
  );
  process.exit(1);
}

const existing = existsSync(ENV_PATH)
  ? parseEnvFile(readFileSync(ENV_PATH, "utf8"))
  : new Map();

const rl = createInterface({ input: stdin, output: stdout });

console.log("\nDoqment — environment setup\n");
console.log("Paste each value and press Enter. Nothing is sent anywhere; this");
console.log("only writes .env.local on your machine.\n");

const answers = new Map();

/**
 * Asked once and reused, so pasting two connection strings that both carry
 * [YOUR-PASSWORD] only prompts for the password a single time.
 */
let dbPassword = null;

for (const field of FIELDS) {
  console.log(`\n${field.label}`);
  console.log(`  ${field.hint}`);

  const current = existing.get(field.key);
  const hasUsableCurrent = Boolean(current) && !PLACEHOLDER.test(current);

  if (hasUsableCurrent) {
    console.log(`  Currently: ${preview(current)}`);
  }

  let value = "";
  while (!value) {
    const answer = (
      await rl.question(hasUsableCurrent ? "  > (Enter to keep) " : "  > ")
    ).trim();

    if (!answer && hasUsableCurrent) {
      value = current;
    } else if (!answer) {
      console.log("  This one is required.");
    } else {
      value = answer;
    }
  }

  if (field.isConnectionString && PLACEHOLDER.test(value)) {
    if (!dbPassword) {
      console.log("\n  That string still has a password placeholder in it.");
      console.log("  Database password (Settings → Database → Reset database");
      console.log("  password, if you don't have it):");

      while (!dbPassword) {
        const answer = (await rl.question("  > ")).trim();
        if (answer) dbPassword = answer;
        else console.log("  Required to complete the connection string.");
      }
    }

    value = fillPassword(value, dbPassword);
    console.log("  Password filled in.");
  }

  answers.set(field.key, value);
}

rl.close();

// 0600: the service-role key and database password live in here.
writeFileSync(ENV_PATH, renderEnvFile(answers, existing), { mode: 0o600 });

console.log("\n✓ Wrote .env.local");
console.log("\nNext: npm run db:setup\n");
