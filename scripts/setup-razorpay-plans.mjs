/**
 * Creates the Razorpay plans this app sells, priced from the app's own source
 * of truth.
 *
 * A plan's amount and currency are fixed when it is created — Razorpay offers
 * no way to edit either — so repricing means creating new plans and repointing
 * the environment variables. Done by hand in the dashboard that is four forms,
 * each with an amount typed in paise, and a typo there is not a crash: it is a
 * plan that quietly charges the wrong number for as long as nobody checks.
 * That has already happened once on this account.
 *
 * Idempotent. A plan matching an expected amount, currency and period is
 * reused rather than duplicated, so running this twice does not leave you
 * choosing between two identical plans.
 *
 * Run with `npm run razorpay:plans`. Prints the env lines to paste; creates
 * nothing else and charges nobody.
 */

// Mirrors src/lib/billing/pricing.ts. Held in step by a test — see
// pricing.test.ts, "keeps the razorpay checker's expectations in step".
const PLANS = [
  { envKey: "RAZORPAY_PLAN_ID_MONTHLY", currency: "INR", amountMinor: 29_900, period: "monthly", name: "Doqment Pro — monthly" },
  { envKey: "RAZORPAY_PLAN_ID_ANNUAL", currency: "INR", amountMinor: 299_000, period: "yearly", name: "Doqment Pro — yearly" },
];

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error("\n✗ RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set.\n");
  console.error("  Razorpay dashboard → Account & Settings → API Keys.");
  console.error("  Use a TEST key: this creates plans on whichever account the");
  console.error("  key belongs to.\n");
  process.exit(1);
}

/*
 * Live mode needs saying out loud.
 *
 * Plans created here are the ones real customers are charged against, and a
 * wrong amount is a wrong charge rather than a failed test. Creating them
 * deliberately is fine; doing it because a variable was left set from an
 * earlier session is not.
 */
if (keyId.startsWith("rzp_live_") && !process.argv.includes("--live")) {
  console.error("\n✗ These are LIVE credentials.\n");
  console.error("  Plans created now are what real customers pay against.");
  console.error("  Build and prove the flow in test mode first.\n");
  console.error("  If you genuinely mean to create live plans, re-run with --live\n");
  process.exit(1);
}

const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

async function api(path, init) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  return { status: response.status, body: await response.json().catch(() => null) };
}

function format(minor, currency) {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${(minor / 100).toLocaleString("en-IN")}`;
}

console.log(`\nRazorpay — ${keyId.startsWith("rzp_live_") ? "LIVE" : "test"} mode (${keyId})\n`);

const existing = await api("/plans?count=100");

if (existing.status === 401) {
  console.error("✗ Razorpay rejected these credentials (401).\n");
  console.error("  The key id and secret do not form a valid pair. The secret");
  console.error("  is shown once, at generation — if you no longer have it,");
  console.error("  regenerate the pair and use both new values together.\n");
  process.exit(1);
}

if (existing.status !== 200) {
  console.error(`✗ Razorpay answered ${existing.status} listing plans.`);
  console.error(`  ${JSON.stringify(existing.body?.error ?? {}, null, 2)}\n`);
  process.exit(1);
}

const lines = [];

for (const plan of PLANS) {
  const match = (existing.body.items ?? []).find(
    (candidate) =>
      candidate.period === plan.period &&
      candidate.item?.currency === plan.currency &&
      candidate.item?.amount === plan.amountMinor,
  );

  if (match) {
    console.log(`· ${plan.name} — already exists at ${format(plan.amountMinor, plan.currency)}`);
    lines.push(`${plan.envKey}=${match.id}`);
    continue;
  }

  const created = await api("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: plan.period,
      // Razorpay bills every `interval` periods; 1 means every month or every
      // year, which is the only cadence this product sells.
      interval: 1,
      item: {
        name: plan.name,
        amount: plan.amountMinor,
        currency: plan.currency,
      },
    }),
  });

  if (created.status !== 200 && created.status !== 201) {
    console.error(`\n✗ Could not create ${plan.name} (${created.status})`);
    console.error(`  ${created.body?.error?.description ?? JSON.stringify(created.body)}\n`);
    process.exit(1);
  }

  console.log(`✓ ${plan.name} — created at ${format(plan.amountMinor, plan.currency)}`);
  lines.push(`${plan.envKey}=${created.body.id}`);
}

console.log("\nPut these in .env.local (and your hosting provider's environment):\n");
for (const line of lines) console.log(`  ${line}`);
console.log("\nThen confirm with:  npm run razorpay:check\n");
