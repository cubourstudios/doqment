# CLAUDE.md — Doqment Implementation Guide
## Drop this file in the repo root. Claude Code reads it automatically.

**Project:** Doqment — guided documents & invoicing for freelancers (see /docs for BRD, PRD, MVP, Tech Plan).
**Stack (locked):** Next.js 14+ App Router, TypeScript strict, Supabase (Postgres/Auth/Storage), Drizzle ORM, Tailwind + shadcn/ui, react-hook-form + Zod, @react-pdf/renderer (client-side), Razorpay subscriptions, deployed on Vercel.

---

## 1. Project Setup & Dependencies

### Scaffold
```bash
npx create-next-app@latest doqment --typescript --tailwind --app --eslint --src-dir
cd doqment
```

### Runtime dependencies (exact install command)
```bash
npm install @supabase/supabase-js @supabase/ssr \
  drizzle-orm postgres \
  react-hook-form @hookform/resolvers zod \
  @react-pdf/renderer \
  razorpay \
  date-fns lucide-react \
  class-variance-authority clsx tailwind-merge
```

### Dev dependencies
```bash
npm install -D drizzle-kit @types/node vitest @vitejs/plugin-react
npx shadcn@latest init
npx shadcn@latest add button input form card dialog select badge table tabs toast
```

### Known dependency gotchas (fix proactively)
1. **@react-pdf/renderer is client-only.** Every PDF component file must start with `"use client"`. Never import it in a server component or server action — it will crash the Vercel build. Wrap the PDF preview in `next/dynamic` with `ssr: false`:
   ```ts
   const PDFPreview = dynamic(() => import("@/components/pdf/preview"), { ssr: false });
   ```
2. **@react-pdf/renderer needs custom fonts registered** for ₹ and non-Latin glyphs. Bundle Noto Sans (regular + bold) in `/public/fonts` and call `Font.register()` once. The default Helvetica renders "₹" as a blank box.
3. **Node version:** pin `"engines": { "node": ">=20" }` — Supabase SSR and Next 14 both want Node 18.17+, and Vercel defaults are fine, but local mismatches cause cryptic auth cookie bugs.
4. **`postgres` (the npm driver) vs `pg`:** use `postgres` (postgres.js) with Drizzle; in serverless, create the client with `{ prepare: false }` because Supabase's connection pooler (transaction mode, port 6543) does not support prepared statements. This is the #1 cause of "it works locally, fails on Vercel."
5. **Razorpay SDK is server-only** (uses Node crypto). Only import it in route handlers/server actions. For the checkout UI, load `https://checkout.razorpay.com/v1/checkout.js` via `next/script`.
6. **The Razorpay webhook needs the raw body.** In App Router, read `await req.text()` before verifying the HMAC — do NOT parse JSON first and re-serialise, the signature is over the exact bytes sent and the check will fail for reasons that look nothing like the cause.
7. **Zod version:** stay on Zod 3.x; @hookform/resolvers pairs with it. Don't let Claude Code upgrade to a Zod 4 beta.
8. **drizzle-kit migrations** run against the **direct** connection string (port 5432), while the app at runtime uses the **pooled** string (port 6543). Keep both env vars (below).

### Environment variables (.env.local — create .env.example with these keys)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, never NEXT_PUBLIC
DATABASE_URL=                        # pooled, port 6543, for app runtime
DIRECT_DATABASE_URL=                 # direct, port 5432, for drizzle-kit migrate
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=                 # server-only, never NEXT_PUBLIC
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=         # public key for checkout.js
RAZORPAY_PLAN_ID_MONTHLY=            # INR plans, charged to customers in India
RAZORPAY_PLAN_ID_ANNUAL=
RAZORPAY_PLAN_ID_MONTHLY_USD=        # USD plans; needs International Payments
RAZORPAY_PLAN_ID_ANNUAL_USD=
CRON_SECRET=                         # guards /api/cron/reconcile
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Database Integration (Supabase + Drizzle) — step by step

1. Create a free project at supabase.com → copy URL, anon key, service role key, and both connection strings into `.env.local`.
2. Define schema in `src/db/schema.ts` with Drizzle (tables per Tech Plan §3: profiles, clients, projects, templates, documents, document_versions, invoices, invoice_counters, guidance_rules, uploads, disclaimer_logs, subscriptions).
3. `drizzle.config.ts` points at `DIRECT_DATABASE_URL`. Run:
   ```bash
   npx drizzle-kit generate && npx drizzle-kit migrate
   ```
4. **Enable RLS on every user-owned table** (Drizzle doesn't do this — run as SQL migration):
   ```sql
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "own rows" ON projects
     FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
   -- repeat for profiles, clients, documents, document_versions,
   -- invoices, invoice_counters, uploads, disclaimer_logs, subscriptions
   ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "public read" ON templates FOR SELECT USING (is_active = true);
   -- same read-only policy for guidance_rules
   ```
5. **Two data-access paths, use deliberately:**
   - Supabase JS client (anon key + user session) for simple user-scoped reads — RLS protects automatically.
   - Drizzle with `DATABASE_URL` for transactions and complex writes (invoice numbering, version creation). This connection **bypasses RLS**, so every Drizzle query MUST include an explicit `where(eq(table.userId, session.user.id))`. Treat any Drizzle query without a user filter as a bug.
6. Auto-create a `profiles` row on signup via Postgres trigger:
   ```sql
   CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
   BEGIN INSERT INTO profiles (user_id, plan) VALUES (NEW.id, 'free'); RETURN NEW; END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION handle_new_user();
   ```
7. Storage: create private buckets `logos` and `uploads`; access files only via `createSignedUrl(path, 3600)`.
8. Seed: write `src/db/seed.ts` inserting the 6 base templates (× regions IN/US/INTL) and ~25 guidance_rules rows.

---

## 3. Account Creation & Login Journey (Supabase Auth, @supabase/ssr)

### Files to create
```
src/lib/supabase/client.ts     # createBrowserClient
src/lib/supabase/server.ts     # createServerClient reading Next cookies
src/middleware.ts               # session refresh + route protection
src/app/(auth)/signup/page.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/auth/callback/route.ts  # OAuth + email-confirm code exchange
src/app/onboarding/page.tsx
```

### The journey, precisely
1. **Signup (email):** form (email, password, name; Zod: password ≥ 8 chars) → `supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${APP_URL}/auth/callback` } })` → show "check your email" state. Email confirmation stays ON (spam defense).
2. **Signup/Login (Google):** `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${APP_URL}/auth/callback` } })`. Configure in Supabase dashboard → Auth → Providers → Google (needs a free Google Cloud OAuth client; add both localhost and production callback URLs — forgetting the prod URL is the classic launch-day bug).
3. **Callback route:** exchange `code` via `supabase.auth.exchangeCodeForSession(code)` → redirect to `/onboarding` if `profiles.country IS NULL`, else `/dashboard`.
4. **Middleware:** refresh session on every request (per @supabase/ssr docs); redirect unauthenticated users from `/dashboard/*`, `/projects/*`, `/settings/*` to `/login?next=...`; redirect authenticated users away from `/login` and `/signup`.
5. **Onboarding (one screen):** country (drives currency + tax-ID label: GSTIN for IN, EIN/SSN-optional for US), profession, business name, business type, optional logo upload → update `profiles` → `/dashboard`.
6. **Password reset:** `resetPasswordForEmail` → email link → `/reset-password` → `updateUser({ password })`.
7. **Logout:** server action calling `supabase.auth.signOut()` → redirect `/`.
8. **Account deletion (settings):** server action using service-role client: `supabase.auth.admin.deleteUser(id)` + cascade deletes (FKs ON DELETE CASCADE) + storage cleanup.

Acceptance: signup→dashboard < 60s; session survives refresh & browser restart; protected routes inaccessible logged-out; OAuth works on production domain.

---

## 4. Payment Gateway Integration (Razorpay only)

### Design rule
**One provider: Razorpay.** Stripe was in the original plan and has been removed — Razorpay bills both currencies once International Payments is enabled, so a second gateway buys nothing but a second set of webhooks to keep correct. Do not reintroduce it.

What still follows from the customer's country is the **currency**, because a Razorpay plan fixes its currency at creation: profile country = IN → INR plans; everyone else → USD plans.

```
src/lib/billing/pricing.ts      # prices, plan-id env keys, rail availability
src/lib/billing/types.ts        # BillingRail + railForCountry
src/lib/billing/razorpay.ts     # server-only: create / cancel / verify
src/lib/billing/entitlement.ts  # the only place a plan changes
src/app/api/webhooks/razorpay/route.ts
src/app/api/cron/reconcile/route.ts
src/app/(app)/settings/billing/page.tsx
```

### Subscriptions
1. Dashboard (test mode): four plans — INR ₹199/month and ₹1,999/year, USD $6/month and $60/year. The annual price is ten months, i.e. two months free. KYC is needed only to go live; International Payments is a separate activation needed only for the USD pair.
2. Server action `createRazorpaySubscription({ userId, rail, interval })`: `razorpay.subscriptions.create({ plan_id, total_count, customer_notify: 1, notes: { user_id } })` → return `subscription_id`. `notes` is the only field that survives the round trip to the webhook.
3. Client: open checkout.js with `{ key: NEXT_PUBLIC_RAZORPAY_KEY_ID, subscription_id, handler }`.
4. **Do not trust the client handler for entitlement.** Truth comes from the webhook: handle `subscription.activated`, `subscription.charged`, `subscription.resumed` (extend `current_period_end`), and `subscription.halted`/`cancelled`/`completed`/`expired` (downgrade after 3-day grace). Verify `x-razorpay-signature` (HMAC-SHA256 of the raw body with `RAZORPAY_WEBHOOK_SECRET`) using `timingSafeEqual`, never `===`.
5. Upsert into `subscriptions`; set `profiles.plan = 'pro'`, `plan_expires_at = period_end + 3 days`.
6. Cancellation: `subscriptions.cancel(id, true)` — at cycle end, never immediately. Razorpay has no hosted customer portal, so this lives in-app.

### Hardening
- **Idempotency:** store processed webhook event ids in `webhook_events`; skip duplicates. Razorpay sends no stable event id, so derive one from `subscription id : event name : current_end` — it changes on every real transition and repeats on every retry.
- **Reconciliation cron** (Vercel cron, daily): downgrade every `pro` profile past `plan_expires_at`. This catches missed webhooks. Guard it with `CRON_SECRET` or it is a public downgrade trigger.
- **Unconfigured rail:** if a rail's plan ids are missing, `isRailConfigured()` is false and the UI says Pro is not available in that region yet. Never render an Upgrade button that will throw.
- **Entitlement check:** single helper `getUserPlan(userId)` used by every limit gate (project count, generations/month, watermark, storage). Never scatter plan logic.
- Webhook routes must be excluded from auth middleware.

---

## 5. Build Order for Claude Code (work in this sequence, one phase per session)

1. Scaffold + deps + env + Supabase project + schema + migrations + RLS + seed.
2. Auth journey end-to-end (section 3) including onboarding.
3. Clients + Projects CRUD.
4. Guidance engine: rules fetch → pure `evaluateChecklist()` function (unit-test with Vitest) → checklist UI with completeness meter.
5. Document generation framework: template schema → config-driven form → live preview → react-pdf render → save document + version → download. Build Invoice first (numbering transaction + GST math server-side), then the 5 other types.
6. Dashboard + invoice status tracking + own-file uploads.
7. Free-tier limits + billing (section 4).
8. Hardening: disclaimers + logging, rate limiting, Sentry, PostHog events (PRD §7), data export, account deletion, ToS/privacy pages.

### Standing instructions for Claude Code
- TypeScript strict; no `any`. All user input validated with Zod on the server, even if validated client-side.
- Never recompute invoice totals on the client for storage — server recalculates tax math.
- Every Drizzle query on user data includes a user_id filter (RLS is bypassed on this connection).
- Soft-delete documents (`deleted_at`); never delete or reuse invoice numbers.
- Write Vitest tests for: `evaluateChecklist()`, GST math (CGST/SGST vs IGST by state), invoice numbering series/rollover.
- Commit per phase; keep components under ~200 lines; colocate Zod schemas with their forms in `src/lib/schemas/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
