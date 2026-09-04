/**
 * Checks the Razorpay setup end to end, without starting the app.
 *
 * Exists because a broken payment gateway is nearly silent. A rejected key
 * surfaces as one generic message on the upgrade button; a plan priced
 * differently from the page advertising it surfaces nowhere at all, until a
 * customer reads their card statement. Both are configuration, both are
 * invisible from the code, and both take minutes to find with a direct
 * question to Razorpay and ages without one.
 *
 * Answers four questions in order, stopping at the first that fails, because
 * later answers are meaningless while an earlier one is wrong:
 *
 *   1. Are the credentials present?
 *   2. Does Razorpay accept them?
 *   3. Do the configured plan ids exist?
 *   4. Does each plan charge what the app advertises?
 *
 * Run with `npm run razorpay:check`. Reads .env.local; never prints a secret.
 */

/*
 * The expected prices, mirroring src/lib/billing/pricing.ts.
 *
 * Duplicated deliberately rather than imported: this is a plain .mjs script so
 * it runs without a TypeScript toolchain, and a checker that derives its
 * expectations from the same file it is checking would agree with a typo. The
 * unit test in pricing.test.ts holds the two in step.
 */
const EXPECTED = [
  { envKey: "RAZORPAY_PLAN_ID_MONTHLY", currency: "INR", amountMinor: 29_900, period: "monthly", display: "₹299 / month" },
  { envKey: "RAZORPAY_PLAN_ID_ANNUAL", currency: "INR", amountMinor: 299_000, period: "yearly", display: "₹2,990 / year" },
  { envKey: "RAZORPAY_PLAN_ID_MONTHLY_USD", currency: "USD", amountMinor: 600, period: "monthly", display: "$6 / month", optional: true },
  { envKey: "RAZORPAY_PLAN_ID_ANNUAL_USD", currency: "USD", amountMinor: 6_000, period: "yearly", display: "$60 / year", optional: true },
];

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

function fail(message, ...details) {
  console.error(`\n✗ ${message}\n`);
  for (const line of details) console.error(`  ${line}`);
  console.error("");
  process.exit(1);
}

// -- 1. Credentials present --------------------------------------------------

if (!keyId || !keySecret) {
  fail(
    "Razorpay credentials are not set.",
    `RAZORPAY_KEY_ID     ${keyId ? "set" : "MISSING"}`,
    `RAZORPAY_KEY_SECRET ${keySecret ? "set" : "MISSING"}`,
    "",
    "Razorpay dashboard → Account & Settings → API Keys.",
    "The secret is shown once, when the key is generated. If you no longer",
    "have it, regenerate the pair and use both new values together — a key id",
    "from one pair and a secret from another will always be rejected.",
  );
}

if (!keyId.startsWith("rzp_")) {
  fail(
    `RAZORPAY_KEY_ID does not look like a Razorpay key id: ${keyId}`,
    "It should begin with rzp_test_ or rzp_live_.",
  );
}

const mode = keyId.startsWith("rzp_live_") ? "live" : "test";
console.log(`\nRazorpay — ${mode} mode (${keyId})\n`);

/*
 * A live key on a developer machine is a footgun, not a configuration choice.
 *
 * Every payment made against it is a real charge on a real card, with real
 * settlement and refund fees, and a test run that ends in a refund still costs
 * the gateway fee. Live credentials belong in the hosting provider's
 * environment and nowhere else — not in .env.local, not in a terminal history,
 * not pasted into a chat.
 *
 * This warns rather than refuses: checking a live configuration before
 * launching is a legitimate thing to want to do. It just should never happen
 * by accident.
 */
if (mode === "live") {
  console.warn("  ⚠  These are LIVE credentials. Payments made against them");
  console.warn("     charge real cards and settle real money.");
  console.warn("");
  console.warn("     Build and test in test mode (rzp_test_…). Live keys");
  console.warn("     belong in your hosting provider's environment variables,");
  console.warn("     never in .env.local on a laptop.");
  console.warn("");
  console.warn("     If a live secret has ever been shared — a chat, a commit,");
  console.warn("     a screenshot — regenerate the pair before going further.");
  console.warn("");
}

const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

async function api(path) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    headers: { Authorization: auth },
  });

  return { status: response.status, body: await response.json().catch(() => null) };
}

// -- 2. Credentials accepted -------------------------------------------------

let plans;

try {
  plans = await api("/plans?count=100");
} catch (error) {
  fail(
    "Could not reach api.razorpay.com.",
    String(error?.message ?? error),
    "Check your network, or whether a proxy is blocking outbound HTTPS.",
  );
}

if (plans.status === 401) {
  fail(
    "Razorpay rejected the credentials (401).",
    "The key id and secret do not form a valid pair. This is not something",
    "the app can work around — checkout stays down until it is fixed.",
    "",
    "Most likely: the secret belongs to a key that has since been",
    "regenerated, or the id and secret were copied from different pairs.",
    "",
    "Fix: Razorpay dashboard → Account & Settings → API Keys →",
    `Regenerate ${mode === "live" ? "Live" : "Test"} Key. Copy BOTH values`,
    "shown, and set them together.",
  );
}

if (plans.status !== 200) {
  const detail = plans.body?.error?.description ?? plans.body?.error ?? null;

  fail(
    `Razorpay answered ${plans.status} when listing plans.`,
    detail
      ? typeof detail === "string"
        ? detail
        : JSON.stringify(detail, null, 2)
      : // No error body means the response probably did not come from Razorpay
        // at all — a corporate proxy or VPN answering on its behalf will do
        // this, and reads as an API fault when it is a network one.
        "The response carried no error detail, which usually means it came " +
          "from a proxy rather than from Razorpay. Check whether outbound " +
          "HTTPS to api.razorpay.com is allowed on this network.",
  );
}

console.log(`✓ Credentials accepted — ${plans.body.count} plan(s) on this account\n`);

// -- 3 and 4. Plans exist and charge the advertised price --------------------

const byId = new Map((plans.body.items ?? []).map((plan) => [plan.id, plan]));
let problems = 0;
let configured = 0;

for (const expected of EXPECTED) {
  const id = process.env[expected.envKey];

  if (!id) {
    // The USD pair is genuinely optional: it needs International Payments
    // activated, and until then the app tells non-Indian users so rather than
    // offering a checkout that cannot complete.
    console.log(
      `${expected.optional ? "·" : "✗"} ${expected.envKey} is not set` +
        (expected.optional ? " (optional — international is off)" : ""),
    );
    if (!expected.optional) problems++;
    continue;
  }

  configured++;
  const plan = byId.get(id);

  if (!plan) {
    console.log(`✗ ${expected.envKey} = ${id} — no such plan on this account`);
    problems++;
    continue;
  }

  const item = plan.item ?? {};
  const mismatches = [];

  if (item.currency !== expected.currency) {
    mismatches.push(`currency is ${item.currency}, expected ${expected.currency}`);
  }

  if (item.amount !== expected.amountMinor) {
    // The failure this whole script exists for: the page says one number and
    // the customer is charged another.
    mismatches.push(
      `charges ${format(item.amount, item.currency)}, ` +
        `but the app advertises ${format(expected.amountMinor, expected.currency)}`,
    );
  }

  if (plan.period !== expected.period) {
    mismatches.push(`bills ${plan.period}, expected ${expected.period}`);
  }

  if (mismatches.length === 0) {
    console.log(`✓ ${expected.envKey} — ${expected.display}`);
  } else {
    console.log(`✗ ${expected.envKey} = ${id}`);
    for (const mismatch of mismatches) console.log(`    ${mismatch}`);
    problems++;
  }
}

function format(minor, currency) {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${(minor / 100).toLocaleString("en-IN")}`;
}

console.log("");

if (problems > 0) {
  console.error(`✗ ${problems} problem(s). Checkout will not work correctly.\n`);
  console.error("  Create or correct plans in the Razorpay dashboard →");
  console.error("  Subscriptions → Plans, then set the ids in .env.local.");
  console.error("  A plan's amount and currency are fixed at creation: to change");
  console.error("  a price, create a new plan and point the variable at it.\n");
  process.exit(1);
}

if (configured === 0) {
  console.error("✗ No plan ids are set, so nothing could be checked.\n");
  process.exit(1);
}

console.log("✓ Razorpay is configured correctly.\n");
console.log("  Still needed for entitlement to work: a webhook at");
console.log("  <your-domain>/api/webhooks/razorpay with RAZORPAY_WEBHOOK_SECRET.");
console.log("  The webhook is the only thing that grants a paid plan.\n");
