# Setting up Doqment

Everything below is a one-time setup per environment. Budget 20 minutes.

## 1. Create the Supabase project

At [supabase.com](https://supabase.com), create a free project. Then from the
dashboard collect five values:

| Value | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key |
| `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction pooler**, port **6543** |
| `DIRECT_DATABASE_URL` | Project Settings → Database → Connection string → **Direct connection**, port **5432** |

The two connection strings are not interchangeable and both are needed:

- The app runs on the **pooled** one. Serverless functions open and close
  connections constantly and would exhaust a direct connection pool.
- Migrations run on the **direct** one. The transaction pooler cannot run DDL
  reliably, and it does not support prepared statements — which is also why
  `src/db/index.ts` passes `prepare: false`.

Getting these the wrong way round is the classic "works locally, fails on
Vercel" bug.

> The `service_role` key bypasses Row Level Security entirely. Treat it like a
> database password: server-side only, never prefixed `NEXT_PUBLIC_`, never
> pasted into a chat or a ticket.

## 2. Fill in the environment

```bash
cp .env.example .env.local
# then edit .env.local with the five values above
```

`.env.local` is gitignored. Only `.env.example`, which holds empty keys, is
tracked.

## 3. Set up the database

```bash
npm install
npm run db:setup
```

That single command runs four steps, and you can run them individually if one
fails:

| Step | Command | What it does |
|---|---|---|
| 1 | `npm run db:migrate` | Creates the tables from `drizzle/` |
| 2 | `npm run db:manual` | Applies `drizzle/manual/` — **RLS policies, the signup trigger, storage buckets** |
| 3 | `npm run db:seed` | Inserts the 18 templates and 27 guidance rules |
| 4 | `npm run db:check` | Verifies all of the above actually took effect |

**Step 2 is not optional.** drizzle-kit only manages tables and columns, so
after step 1 alone the schema exists with no row-level security — every user
could read every other user's documents. `db:check` fails loudly if RLS is off
anywhere it matters.

All of the manual SQL is written to be re-runnable, so `db:setup` is safe to
run again after a schema change.

### If the storage step fails

`0003_storage.sql` writes to Supabase's `storage` schema, which needs the
storage extension provisioned. If it reports an error, create two **private**
buckets named `logos` and `uploads` in the dashboard instead, then re-run
`npm run db:manual`.

## 4. Enable Google sign-in (optional)

Supabase dashboard → Authentication → Providers → Google. You'll need a free
Google Cloud OAuth client, and you must register **both** redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://<your-production-domain>/auth/callback`

Forgetting the production one is the classic launch-day failure — it works
perfectly in development right up until it doesn't.

## 5. Run it

```bash
npm run dev
```

Sign up, confirm the email, and you should land on onboarding.

## Verifying at any time

```bash
npm run db:check
```

Reports on the connection, the tables, whether RLS is on where it must be,
whether the seed data is present, and whether the signup trigger exists.

## A note on restricted networks

Some sandboxed environments (including the Claude Code web environment this
project was built in) block outbound connections to `supabase.com` and
`*.supabase.co`. In those environments `db:setup` cannot run at all — the
commands fail at the connection, not at anything in this repo.

Two options: run the database setup from a machine with unrestricted network
access, or widen the environment's network policy to allow Supabase. The
application code itself needs no changes either way.
