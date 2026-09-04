# Deploying to Vercel

Assumes the Supabase project is already set up — see [setup.md](setup.md).

## 1. Import the repository

At [vercel.com/new](https://vercel.com/new), import `cubourstudios/doqment`.

Vercel detects Next.js and needs no build configuration. Leave the build
command, output directory and install command on their defaults.

Set the **Node.js version to 20 or 22** under Settings → General. The project
declares `"engines": { "node": ">=20" }`; an older runtime produces confusing
auth-cookie failures rather than an honest error.

## 2. Environment variables

Add these under Settings → Environment Variables, for **Production, Preview and
Development**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wsojerxmouhvivfwiads.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` |
| `DATABASE_URL` | Transaction pooler string, port **6543** |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://doqment.vercel.app` |

`DIRECT_DATABASE_URL` is **not** needed in Vercel — it exists only for
`drizzle-kit`, which runs migrations from a developer's machine, not from the
deployed app.

`DATABASE_URL` must be the **pooled** string on port 6543. Serverless functions
open and close connections constantly and would exhaust a direct connection
pool within minutes of real traffic. This is the single most common way a
Next.js + Supabase deployment falls over under load while working perfectly in
development.

> The `service_role` key bypasses row level security entirely. It belongs only
> in Vercel's environment variables, never in the repository and never in a
> variable prefixed `NEXT_PUBLIC_`.

## 3. Point Supabase at the deployed app

Supabase → Authentication → URL Configuration:

- **Site URL**: your production URL.
- **Redirect URLs**: add all three —
  - `https://<your-domain>/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `https://*-<your-vercel-scope>.vercel.app/auth/callback`

The wildcard covers preview deployments, which get a fresh hostname per push.
Without it, email confirmation and Google sign-in fail on every preview.

If Google sign-in is enabled, the same production callback URL must also be
registered in the Google Cloud OAuth client. **Forgetting the production
callback is the classic launch-day failure** — everything works in development
right up until it doesn't.

## 4. Deploy and verify

Push to `main`, or hit Deploy.

The build does not need database credentials: `src/db/index.ts` defers
connecting until first query precisely so `next build` cannot require them.
A build failure is therefore a real code problem, not a missing secret.

Once deployed, walk the path that touches every subsystem:

1. Sign up with a real email → confirm → land on onboarding
2. Complete onboarding with a country
3. Create a project → the checklist appears
4. Create an invoice → the PDF downloads and the rupee sign renders

If the currency symbol shows as a blank box, the bundled font failed to load —
check that `public/fonts/NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` were
deployed. Both are needed: they are static instances, one per weight, because
registering a single variable font for two weights makes react-pdf build a
broken glyph subset and silently drop characters from bold text.

## Preview deployments

Preview auth works without extra configuration: `getAppUrl()` in
`src/app/(auth)/actions.ts` detects `VERCEL_ENV === "preview"` and uses
`VERCEL_URL`, so a preview signs you into that preview rather than bouncing you
to production. The wildcard redirect URL in step 3 is what makes Supabase
accept it.

## Region

Vercel functions default to a US region. If the Supabase project is in another
region — `ap-south-1` for an India-focused launch — every database round trip
crosses an ocean, and an invoice page makes several.

Set the function region to match the database under Settings → Functions. This
is worth doing before launch rather than after: it is the difference between a
page that feels instant and one that feels sluggish, and it costs nothing.

## Billing (Razorpay)

Razorpay is the only payment provider. Everything below can be done in **test
mode**; Razorpay KYC is required only to accept real money, so the whole flow
can be built and exercised before the account is live.

### 1. Create the plans

```bash
npm run razorpay:plans
```

Creates them from `src/lib/billing/pricing.ts`, so the amount charged cannot
disagree with the amount advertised. It reuses a plan that already matches
rather than duplicating, and refuses to run against live credentials without
`--live`. It prints the env lines to paste.

To do it by hand instead — Razorpay dashboard → Subscriptions → Plans. A plan
fixes its currency and amount when it is created, so each currency needs its
own pair, and repricing means creating new plans rather than editing:

| Plan | Currency | Amount | Period |
|---|---|---|---|
| Pro monthly | INR | ₹299 | Monthly |
| Pro yearly | INR | ₹2,990 | Yearly |
| Pro monthly (intl) | USD | $6 | Monthly |
| Pro yearly (intl) | USD | $60 | Yearly |

The yearly plans are ten months' price — two months free. That discount is the
main lever on lifetime value, so keep the ratio if the prices move.

The USD pair needs **International Payments** enabled on the account, which is
a separate activation with its own review. Until it is on, leave
`RAZORPAY_PLAN_ID_*_USD` blank: the billing page then tells non-Indian users
that Pro has not reached their region yet, rather than opening a checkout that
fails.

### 2. Add the variables

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Shown once when the key is generated |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` — used by checkout.js |
| `RAZORPAY_WEBHOOK_SECRET` | Chosen by you when creating the webhook, below |
| `RAZORPAY_PLAN_ID_MONTHLY` | INR monthly plan id (`plan_…`) |
| `RAZORPAY_PLAN_ID_ANNUAL` | INR yearly plan id |
| `RAZORPAY_PLAN_ID_MONTHLY_USD` | USD monthly plan id, once international is on |
| `RAZORPAY_PLAN_ID_ANNUAL_USD` | USD yearly plan id |
| `CRON_SECRET` | Any long random string — see below |

`RAZORPAY_KEY_SECRET` is server-only. Prefixing it `NEXT_PUBLIC_` would ship it
to every browser that loads the app.

### 3. Register the webhook

Razorpay dashboard → Settings → Webhooks → Add New Webhook.

- **URL:** `https://<your-domain>/api/webhooks/razorpay`
- **Secret:** whatever you put in `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `subscription.activated`, `subscription.charged`,
  `subscription.resumed`, `subscription.halted`, `subscription.cancelled`,
  `subscription.completed`, `subscription.expired`

The webhook is the only thing that grants or removes a paid plan. The
browser-side success handler is deliberately not trusted: it can be replayed,
edited in a console, or never fire at all if someone closes the tab the moment
their payment succeeds.

### 4. Schedule the reconciliation cron

`vercel.json` runs `/api/cron/reconcile` daily. It downgrades anyone still
marked `pro` whose paid period plus grace has elapsed, which is what catches a
cancellation webhook that never arrived. `CRON_SECRET` must be set — without
it the endpoint is a public downgrade trigger.

### 5. Check the configuration

```bash
npm run razorpay:check
```

Asks Razorpay directly whether the credentials are accepted, whether each
configured plan exists, and whether it charges what the app advertises. That
last one has no other symptom: a plan priced differently from the page selling
it looks correct everywhere except the customer's card statement.

A plan's amount and currency are fixed when it is created. To change a price,
create a new plan and repoint the variable — editing is not possible.

### 6. Verify a real payment

In test mode, subscribe with a Razorpay test card, then check that
`profiles.plan` flips to `pro` **after the webhook lands**, not when the
checkout closes. If it flips on close, entitlement has leaked into the client
and that is a bug worth stopping for.
