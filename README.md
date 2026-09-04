# Doqment

Guided documents and invoicing for freelancers.

Doqment answers a question most freelancers get wrong until it costs them: for
*this* project, with *this* client, which documents do you actually need? It
produces a prioritised checklist with a one-line reason for each item, then
generates the documents — proposals, service agreements, SOWs, NDAs, and
tax-compliant invoices.

## Documentation

| Document | What's in it |
|---|---|
| [docs/setup.md](docs/setup.md) | **Start here.** Supabase project, environment, database setup |
| [docs/prd.md](docs/prd.md) | Personas, feature list, acceptance criteria, edge cases |
| [docs/tech-plan.md](docs/tech-plan.md) | Architecture, data model, scaling path |
| [CLAUDE.md](CLAUDE.md) | Implementation guide and build order |

## Stack

Next.js (App Router) · TypeScript · Supabase (Postgres, Auth, Storage, RLS) ·
Drizzle · Tailwind + shadcn/ui · react-hook-form + Zod ·
@react-pdf/renderer · Razorpay

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in — see docs/setup.md
npm run db:setup
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:setup` | Migrate, apply RLS and triggers, seed, verify |
| `npm run db:check` | Verify the database is correctly configured |

## Two things worth knowing before you change code

**The Drizzle connection bypasses RLS.** It authenticates as the database
owner. Every Drizzle query against user data must carry its own
`where(eq(table.userId, userId))` — one without a user filter is a security
bug, not a style problem. For plain user-scoped reads, prefer the Supabase
client, where RLS applies automatically.

**Structured JSON is the source of truth, not the PDF.** A document is its
`document_versions.data_json` row; the PDF is a rendering of it. That is what
makes re-rendering, editing and future output formats possible.

## Legal status of the templates

The document templates are drafted from public references and are **not legal
advice**. They need a lawyer's review before the contract types go in front of
paying users. Invoice templates are the safest to ship first: their content is
dictated by tax rules rather than by drafting judgement.
