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
check that `public/fonts/NotoSans-Variable.ttf` was deployed.

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

## What is not deployed yet

Billing (Razorpay and Stripe) is Phase 7. The webhook routes and their secrets
do not exist yet, so no payment configuration is needed for this deployment.
