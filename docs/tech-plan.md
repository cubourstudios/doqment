# End-to-End Technical Plan
## Doqment — Architecture, Stack, Data Model, Backend Solutioning

**Design principles:** ₹0/month infra until revenue; boring, proven technology; one language everywhere; every architectural choice must scale to 10K users without rework and to 1M users without full rewrite.

---

## 1. Recommended Tech Stack (opinionated)

| Layer | Choice | Why (vs. alternatives) |
|---|---|---|
| Frontend + backend framework | **Next.js 14+ (App Router, TypeScript)** | One codebase, one deploy; API routes/server actions replace a separate backend; largest hiring/help pool. (Vs. separate React+Express: 2x deploy surface for zero benefit at this scale.) |
| Hosting | **Vercel free tier** | Zero-config deploys, generous free limits, global CDN. Exit path: Dockerize to Railway/Fly/AWS if pricing bites at scale. |
| Database + Auth + Storage | **Supabase free tier (Postgres + Auth + Storage + RLS)** | Postgres (real relational DB — invoices demand transactional integrity), built-in auth with Google OAuth, S3-compatible file storage, row-level security = document privacy enforced at the DB layer, daily backups included. (Vs. Firebase: Firestore's NoSQL model fights invoice numbering/relational queries; vs. self-hosted Postgres: ops burden, no budget.) |
| ORM | **Drizzle** | Type-safe, lightweight, SQL-transparent (matters for the numbering transaction). Prisma acceptable alternative. |
| PDF generation | **@react-pdf/renderer, client-side** | Zero server cost, instant preview, deterministic layout. Fallback: print CSS. Post-revenue upgrade path: server-side Puppeteer/Chromium on a queue for pixel-perfect complex layouts. |
| UI | **Tailwind + shadcn/ui** | Fast, professional defaults, free. |
| Forms/validation | **react-hook-form + Zod** | Zod schemas shared between client form validation and server API validation — single source of truth per document type. |
| Payments | **Razorpay subscriptions**, INR and USD | One provider. Razorpay is the workable rail for an India-registered merchant, and it bills both currencies once International Payments is enabled — so the second gateway earns nothing but a second set of webhooks to keep correct. The currency still follows the customer's country, because a plan fixes its currency at creation. |
| Email (v1.1) | Resend free tier (3K/mo) | Transactional email later; not needed at MVP. |
| Analytics / Errors | PostHog free + Sentry free | Both have generous free tiers. |
| CI/CD | GitHub Actions (free) → Vercel preview deploys | PR previews for free QA. |

## 2. System Architecture (text diagram)

```
                        ┌──────────────────────────────┐
                        │  Browser (Next.js React app)  │
                        │  • Guided forms (Zod)         │
                        │  • Live preview               │
                        │  • PDF render (@react-pdf)  ──┼──► PDF downloaded locally
                        └──────┬───────────────┬───────┘
                               │ HTTPS         │ Supabase JS (RLS-scoped)
                               ▼               ▼
              ┌────────────────────────┐   ┌─────────────────────────────┐
              │ Next.js server (Vercel)│   │ Supabase                    │
              │ • Server actions/API   │   │ • Postgres (RLS on all      │
              │ • Invoice numbering    │──►│   user tables)              │
              │   (SQL transaction)    │   │ • Auth (email + Google)     │
              │ • Billing webhooks     │   │ • Storage (logos, uploads,  │
              │ • Rate limiting        │   │   archived PDFs) signed URLs│
              │ • Rules engine (F4)    │   │ • pg_cron: overdue flagging,│
              └───────┬────────────────┘   │   billing reconciliation    │
                      │                    └─────────────────────────────┘
                      ▼
             ┌───────────────┐
             │ Razorpay      │   (webhook → /api/webhooks/razorpay,
             │ subscriptions │    signature-verified; INR and USD plans)
             └───────────────┘
```

**Key flow — document generation:** client fills guided form → Zod validates → server action writes a `documents` row + `document_versions` row (JSON payload of all field values + template version) → client renders PDF locally from that payload → optional "archive PDF" uploads the file to Storage. The **source of truth is structured JSON**, not the PDF — this enables re-rendering, editing, future formats, and analytics.

**Key flow — invoice numbering (correctness-critical):**
```sql
-- inside one transaction, per generation:
UPDATE invoice_counters
SET last_number = last_number + 1
WHERE user_id = $1 AND series = $2   -- series = 'FY2026-27' or '2026'
RETURNING last_number;
```
Row-level lock guarantees no duplicates/gaps even under concurrent requests. Series derives from user country (India: Apr–Mar FY; others: calendar year).

## 3. Data Model (core entities)

```
users            (id PK, email, name, created_at)
profiles         (user_id PK/FK, country, currency, profession, business_name,
                  business_type, tax_id, tax_id_type, logo_path, address_json,
                  plan ENUM(free,pro), plan_expires_at)
clients          (id PK, user_id FK, name, email, company, country, tax_id,
                  address_json, created_at)                     -- reusable across projects
projects         (id PK, user_id FK, client_id FK, title, project_type,
                  value_band, status, start_date, end_date, created_at)
templates        (id PK, doc_type, region, version, name, schema_json,   -- field defs
                  body_json, is_active)                        -- content blocks + merge tags
documents        (id PK, user_id FK, project_id FK, template_id FK, doc_type,
                  title, status ENUM(draft,final,cancelled), current_version_id,
                  deleted_at NULL)                              -- soft delete
document_versions(id PK, document_id FK, version_no, data_json,          -- all field values
                  template_version, created_at)                 -- immutable
invoices         (document_id PK/FK, invoice_number, series, issue_date, due_date,
                  currency, subtotal, tax_json, total,
                  status ENUM(draft,sent,paid,overdue,cancelled), paid_at)
invoice_counters (user_id, series, last_number, PK(user_id,series))
guidance_rules   (id PK, conditions_json, doc_type, priority ENUM(essential,
                  recommended,situational), rationale_text, region, active)
uploads          (id PK, user_id FK, project_id FK NULL, file_path, file_name,
                  mime, size, created_at)
disclaimer_logs  (id PK, user_id FK, document_id FK, template_version, accepted_at)
subscriptions    (id PK, user_id FK, provider ENUM(razorpay,stripe -- 'stripe' unused; PG cannot drop an enum value),
                  provider_sub_id, status, current_period_end, raw_json)
events           (id PK, user_id, name, props_json, created_at)  -- backup analytics
```

**RLS policy pattern (applied to every user-owned table):** `USING (user_id = auth.uid())`. Templates and guidance_rules are read-only public. This makes data isolation a database guarantee, not an application hope.

## 4. API Design Approach

- **Server Actions** for authenticated app mutations (create project, generate document) — simplest, type-safe, CSRF-protected by framework.
- **Route handlers (REST)** only where an HTTP endpoint is required: `/api/webhooks/razorpay` (signature verification, idempotency keys stored to dedupe retries), `/api/export` (GDPR data export), public quiz endpoint.
- Versioning deferred (no external API consumers at MVP); when v2 exposes an API, mount at `/api/v1`.
- Validation: shared Zod schemas per document type; server never trusts client-computed totals — tax math recomputed server-side for invoices.

## 5. Guidance Engine Design (the moat)

Rules stored as data, not code:
```json
{ "conditions": { "project_type": ["design","development"],
                  "value_band_min": "50k",
                  "client_relationship": "new",
                  "client_country": "*" },
  "doc_type": "service_agreement",
  "priority": "essential",
  "rationale": "New client + significant value: a signed agreement is your only enforceable protection if payment is disputed." }
```
Evaluation: fetch active rules for user region → filter by condition match → group by doc_type keeping highest priority → sort essential > recommended > situational. Pure function, unit-tested exhaustively. Editing rules = updating rows, no deployment. Over time this rules dataset (plus which docs users actually generate) becomes proprietary insight competitors can't copy from the UI.

## 6. Security & Compliance

- TLS everywhere (platform default); Supabase Auth handles password hashing and OAuth.
- RLS on all tables (defense at data layer); storage buckets private with signed URLs (60-min expiry).
- Webhooks: signature verification + idempotency table.
- Rate limiting: Upstash Redis free tier or in-Postgres counter — 20 generations/hr free tier, 5 signups/IP/hr.
- Secrets in Vercel env vars; no secrets in client bundle (PDF rendering needs none).
- PII minimization: we never store client-side-rendered PDFs unless user archives them.
- GDPR/DPDP: data export endpoint (JSON zip), account deletion (hard delete cascade within 30 days via pg_cron), privacy policy disclosing subprocessors (Vercel, Supabase, PostHog, Sentry, payment providers).
- Backups: Supabase daily automated; weekly manual `pg_dump` to founder's storage as belt-and-braces.
- Audit trail: `document_versions` + `disclaimer_logs` are append-only.

## 7. Infra Cost Projection

| Stage | Users | Monthly cost |
|---|---|---|
| MVP → validation | 0–2K | **₹0** (all free tiers) + domain ₹75/mo amortized |
| Growth | 2K–10K | ~₹2,100/mo ($25 Supabase Pro — needed for backups retention & storage) ; Vercel likely still free |
| Scale | 10K–50K | ~₹6–10K/mo (Supabase Pro + Vercel Pro $20 + Resend paid) — funded by ~₹30K+ MRR at 1% conversion |

## 8. Scaling Path (what changes, what doesn't)

- **Doesn't change:** Postgres schema, RLS model, JSON-as-source-of-truth documents, rules engine, billing abstraction.
- **10K+ users:** move PDF archival rendering server-side (Puppeteer worker on Railway + queue via pg-boss) for pixel-perfect output and email attachments; add read replicas only if analytics queries interfere.
- **100K+ users:** extract webhook/billing service; CDN-cache public template pages (already static); consider dedicated Postgres.
- **Regional expansion:** purely data work — new `templates` rows + `guidance_rules` rows + invoice field configs per region. Zero architecture change (this was the point of the design).

## 9. Development Practices (solo/duo team)

TypeScript strict; GitHub Actions: lint + typecheck + unit tests (rules engine, tax math, numbering) on every PR; Vercel preview deploys as QA environment; feature flags via simple env/DB flags; Sentry alerts to email; a `SEED.sql` with demo data for local dev; weekly dependency updates via Dependabot.

---

## Top 5 Open Questions to Answer Before Writing Code

1. **Legal disclaimer sufficiency:** will a strong ToS + per-generation disclaimer satisfy you for launching contract templates without lawyer review, or do you want to launch invoice-only first and add contracts after a lawyer friend reviews? (Risk appetite decision.)
2. **Company registration & payments:** Razorpay requires business KYC — will you operate as sole proprietor initially? (Affects timeline for charging money; you can launch product before billing is live.)
3. **Template authorship:** who writes the 6 base templates × 2 regions? Founder-drafted from public references is the ₹0 path — do you have a lawyer/CA contact who'd review India ones cheaply?
4. **Brand/domain name:** "Doqment" is a placeholder — decide the real name before Week 1 (domain purchase is the only spend).
5. **Second developer:** is there one? The 12-week plan assumes 1.5 devs; solo stretches it to ~16 weeks — decide now so the roadmap is honest.
