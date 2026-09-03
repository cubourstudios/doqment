# Doqment — Website Build Specification
## Repository setup, tech stack, structure, and Claude Code initialization

**Document status:** canonical setup reference. Place this file at the repository root as `CLAUDE.md`. Docs 01–06 remain in `/docs` as product/business reference; Claude Code reads this file automatically on every session.

**Scope of this document:** the web application (`doqment.in`) only. Native mobile clients are out of scope. Design tokens and content copy are supplied separately (pending) — this document defines structure and sequencing so that integration is additive, not a rebuild.

---

## 1. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 14.x (App Router) | Routing, server actions, API routes, SSR |
| Language | TypeScript | 5.x, strict mode | Type safety across client/server boundary |
| Styling | Tailwind CSS | 3.x | Utility-first styling, design-token driven |
| Component primitives | shadcn/ui | latest | Unstyled, accessible base components |
| Icons | lucide-react | 0.383.x | Icon set |
| Forms | react-hook-form + Zod | latest | Form state + schema validation (client + server shared schemas) |
| Animation | framer-motion | latest | Transitions, mobile gesture polish |
| Database | PostgreSQL via Supabase | — | Relational data, transactional integrity |
| ORM | Drizzle ORM | latest | Type-safe queries, migrations |
| Auth | Supabase Auth (@supabase/ssr) | latest | Email + Google OAuth, session management |
| File storage | Supabase Storage | — | Logos, uploaded documents |
| PDF generation | @react-pdf/renderer | latest | Client-side PDF rendering, zero server cost |
| Payments (India) | Razorpay Node SDK + checkout.js | latest | INR subscriptions |
| Payments (Intl) | Stripe Node SDK + Stripe.js | latest | USD subscriptions |
| AI (proposal drafting) | Anthropic Messages API (`claude-sonnet-4-6`) | — | MoM → structured proposal draft |
| Analytics | PostHog (free tier) | — | Product event tracking |
| Error tracking | Sentry (free tier) | — | Exception monitoring |
| Hosting | Vercel | — | Deployment, edge network, cron |
| Version control / CI | GitHub + GitHub Actions | — | Lint, typecheck, test on every PR |

No exceptions to this stack without updating this document first.

---

## 2. Responsive & Mobile-First Strategy

This is a binding architectural constraint, not a visual preference. Every screen is authored for the smallest supported viewport first; larger viewports are additive layering via Tailwind breakpoint prefixes. Desktop-first patterns (building a wide layout, then overriding downward with `max-width` media queries) are not permitted anywhere in this codebase.

### 2.1 Breakpoint tokens

| Token | Min width | Target device class |
|---|---|---|
| *(base, unprefixed)* | 360px | Small phones — this is the design floor, not a fallback |
| `sm:` | 640px | Large phones, landscape phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Small laptops |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

Set explicitly in `tailwind.config.ts` under `theme.screens` even though these match Tailwind defaults — pin them so they can't drift silently on a Tailwind version bump.

### 2.2 Authoring rule

Write the unprefixed (base) Tailwind classes for the 360–639px layout first. Add `sm:`/`md:`/`lg:` classes only to change what needs to change at that breakpoint — do not repeat unchanged properties. Example:

```tsx
// Correct — mobile-first, additive
<div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-8">

// Incorrect — desktop-first, never do this
<div className="flex flex-row gap-6 p-8 max-md:flex-col max-md:gap-4 max-md:p-4">
```

### 2.3 Layout patterns by component (mobile → desktop)

| Component | Mobile (base–md) | Desktop (md+) |
|---|---|---|
| Navigation | Bottom tab bar (dashboard, projects, settings) or slide-out sheet | Persistent left sidebar |
| Document form + PDF preview | Tabbed "Edit / Preview", one visible at a time | Side-by-side split pane |
| Modals / confirmations | `Sheet` sliding from bottom, full-width | `Dialog` centered |
| Checklist (Flow C) | Vertical stacked cards, one column | Grid, 2–3 columns |
| Dashboard project list | Stacked cards | Table with sortable columns |
| Primary CTA | Fixed full-width button, bottom of viewport (thumb zone) | Inline button, natural document flow |
| Onboarding / guided forms | One field group per screen, stepped | Can combine steps into fewer screens if space allows |

Where mobile and desktop need genuinely different interaction models (Sheet vs. Dialog, tab bar vs. sidebar), use a single component with a responsive conditional (a `useMediaQuery` hook or shadcn's built-in responsive primitives), not a forked component tree. Do not create `ComponentMobile.tsx` / `ComponentDesktop.tsx` pairs.

### 2.4 Typography and touch targets

- Base body font-size: 16px minimum, unconditionally. Never smaller — inputs below 16px trigger unwanted zoom on iOS Safari.
- Type scale steps up at `md:` (e.g., a heading at `text-2xl md:text-3xl`), never down.
- Minimum tap target: 44×44px for any interactive element, at every breakpoint.
- Minimum spacing between adjacent tap targets: 8px.

### 2.5 Viewport and rendering

- Set the viewport meta via Next.js's `viewport` export in `src/app/layout.tsx` — do not hand-write a `<meta>` tag.
- Use `next/image` for all raster images with explicit `sizes` to serve correctly scaled assets per breakpoint.
- `@react-pdf/renderer` preview panes are heavy — dynamically import (`next/dynamic`, `ssr: false`) and defer loading until the "Preview" tab is actually opened on mobile, so the initial mobile page load isn't paying for desktop-only split-pane weight.

### 2.6 Testing matrix

Verify every flow screen at these widths before marking a step complete, using Chrome DevTools device toolbar at minimum, with a real-device spot check before launch:

| Width | Represents |
|---|---|
| 360px | Design floor — smallest supported phone |
| 390px | Common modern phone (iPhone-class) |
| 768px | Tablet / breakpoint boundary |
| 1024px | Small laptop / breakpoint boundary |
| 1440px | Standard desktop |

A screen is not complete until it has been checked at all five widths with no horizontal scroll, no overlapping elements, and no tap target below the 44px minimum.

---

## 3. Repository Structure

```
doqment/
├── CLAUDE.md                          # this file — project context for Claude Code
├── docs/                              # product/business reference (01–06)
├── .env.example
├── .env.local                         # gitignored
├── next.config.mjs
├── tailwind.config.ts                 # design tokens live here (populated in Phase D1)
├── drizzle.config.ts
├── middleware.ts                      # session refresh + route protection
├── package.json
├── public/
│   └── fonts/                         # Noto Sans (regular, bold) — required for ₹ glyph
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   │   ├── page.tsx               # landing page
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── auth/
│   │   │   └── callback/route.ts      # OAuth + email-confirm exchange
│   │   ├── onboarding/page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx       # checklist view
│   │   │   │       └── documents/
│   │   │   │           └── [docType]/page.tsx   # guided form + preview
│   │   │   ├── settings/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   └── billing/page.tsx
│   │   │   └── layout.tsx             # authenticated shell
│   │   ├── api/
│   │   │   └── webhooks/
│   │   │       ├── razorpay/route.ts
│   │   │       └── stripe/route.ts
│   │   ├── layout.tsx                 # root layout
│   │   └── globals.css                # design tokens as CSS variables
│   ├── components/
│   │   ├── ui/                        # shadcn primitives (button, input, card, dialog…)
│   │   ├── flows/
│   │   │   ├── auth/
│   │   │   ├── onboarding/
│   │   │   ├── checklist/
│   │   │   ├── document-form/
│   │   │   └── billing/
│   │   └── pdf/
│   │       ├── layout-kit.tsx         # shared PDF header/footer/type scale
│   │       └── templates/
│   │           ├── proposal.tsx
│   │           ├── service-agreement.tsx
│   │           ├── sow.tsx
│   │           ├── nda.tsx
│   │           ├── invoice.tsx
│   │           └── payment-reminder.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # browser client
│   │   │   └── server.ts              # server client (cookies)
│   │   ├── billing/
│   │   │   ├── types.ts               # BillingProvider interface
│   │   │   ├── razorpay.ts
│   │   │   └── stripe.ts
│   │   ├── ai/
│   │   │   └── proposal-draft.ts      # Anthropic API call + JSON parsing
│   │   ├── guidance/
│   │   │   └── evaluate-checklist.ts  # pure function, unit-tested
│   │   ├── schemas/                   # Zod schemas, one per document type
│   │   └── utils.ts
│   ├── db/
│   │   ├── schema.ts                  # Drizzle schema — all tables
│   │   └── seed.ts                    # templates + guidance_rules seed data
│   └── styles/
│       └── (design tokens, if separated from globals.css)
├── tests/
│   ├── evaluate-checklist.test.ts
│   ├── gst-math.test.ts
│   └── invoice-numbering.test.ts
└── supabase/
    └── migrations/                    # RLS policies, triggers (raw SQL)
```

---

## 4. Package Manifest

Install in this order:

```bash
npx create-next-app@latest doqment --typescript --tailwind --app --eslint --src-dir
cd doqment

npm install \
  @supabase/supabase-js @supabase/ssr \
  drizzle-orm postgres \
  react-hook-form @hookform/resolvers zod \
  @react-pdf/renderer \
  razorpay stripe \
  framer-motion \
  date-fns lucide-react \
  class-variance-authority clsx tailwind-merge

npm install -D drizzle-kit @types/node vitest @vitejs/plugin-react

npx shadcn@latest init
npx shadcn@latest add button input form card dialog select badge table tabs toast sheet skeleton
```

**Pinned constraints:**
- Node.js ≥ 20 (`"engines": { "node": ">=20" }` in `package.json`)
- Zod stays on 3.x — do not upgrade to a 4.x beta
- `postgres` (postgres.js), not `pg`

---

## 5. Environment Variables

Create `.env.example` with these keys (values filled in `.env.local`, never committed):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                        # pooled, port 6543 — app runtime
DIRECT_DATABASE_URL=                 # direct, port 5432 — drizzle-kit migrate

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

ANTHROPIC_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 6. Known Constraints (do not rediscover these at runtime)

1. `@react-pdf/renderer` is client-only. Every file importing it starts with `"use client"`; never import in a server component. Wrap preview components in `next/dynamic` with `ssr: false`.
2. Register Noto Sans (regular + bold) with `Font.register()` before rendering any PDF — the default font renders `₹` as a blank box.
3. Supabase's pooled connection (port 6543, transaction mode) does not support prepared statements — instantiate the `postgres` client with `{ prepare: false }`.
4. `drizzle-kit` migrations run against `DIRECT_DATABASE_URL`; the app runtime uses `DATABASE_URL`.
5. Razorpay SDK is server-only (Node crypto). Load `checkout.js` client-side via `next/script`.
6. Stripe webhook handlers must read `await req.text()` before signature verification — do not parse JSON first.
7. Every Drizzle query against user data must include an explicit `where(eq(table.userId, session.user.id))` — the Drizzle connection uses the service role and bypasses Row Level Security. RLS protects the Supabase JS client path only.
8. AI proposal drafting (`src/lib/ai/proposal-draft.ts`) must enforce quota checks before calling the Anthropic API, and must never pipe model output directly to PDF generation — output populates the guided form fields for human review only.
9. All layout is mobile-first per Section 2. Any component authored with unprefixed classes describing a desktop layout, or using `max-*` breakpoint overrides, is non-compliant and must be rewritten before merge.

---

## 7. Build Sequence for This Phase (Website / Frontend Design)

This phase produces the UI layer against mock data. Backend wiring (Supabase, payments, AI) is a **separate, later phase** — do not connect real data sources until the design pass is signed off.

| Step | Task | Depends on |
|---|---|---|
| D1 | Extract design tokens (colors, type scale, spacing, radii) into `tailwind.config.ts` + `globals.css` | Design system file (pending, to be provided) |
| D2 | Build primitive components in `src/components/ui` matching tokens (extend shadcn defaults) | D1 |
| D3 | Build authenticated + auth shell layouts, mobile-first (360px baseline) | D2 |
| D4 | Build each flow screen from `docs/06` §2 (Flows A–G) against mock/static data | D3 |
| D5 | Content pass — insert real copy (pending, to be provided) into all screens | D4, content doc |
| D6 | Responsive QA — verify every flow at 360px, 768px, 1024px, 1440px | D5 |
| D7 | Handoff to backend integration — connect Supabase, payments, AI per `docs/05` build order | D6 sign-off |

Do not begin D7 until D1–D6 are complete and approved. This keeps design iteration cheap (no data layer to break) and backend integration fast (UI contract already fixed).

---

## 8. Claude Code Kickoff Prompt

Use this as the first message in a new Claude Code session, in the empty project directory.

```
You are setting up the Doqment web application. Read CLAUDE.md at the repository
root in full before taking any action — it is the canonical spec for tech stack,
repository structure, and build sequence.

This is a responsive, mobile-first build. Section 2 of CLAUDE.md (Responsive
& Mobile-First Strategy) is a binding constraint on every component you
write in this session and every session after it — read it as carefully as
the stack and structure sections. Author every screen at the 360px base
width first; add sm:/md:/lg: classes only to layer in changes at larger
viewports. Do not write a desktop layout and scale it down.

Task for this session: execute Section 7, Steps D1–D3 only.

1. Scaffold the Next.js project exactly as specified in Section 4 (Package
   Manifest) of CLAUDE.md, in dependency-install order.
2. Create the repository structure defined in Section 3 as empty
   files/folders with minimal placeholder content — do not implement
   business logic yet.
3. For Step D1 (design tokens): I have not yet provided the design system
   file. Scaffold tailwind.config.ts with the breakpoint tokens from
   Section 2.1 pinned explicitly, plus a clearly marked placeholder color/
   type-scale token set (neutral grays, one accent color, a standard type
   scale, 16px minimum base font size per Section 2.4). Flag every value
   that must be replaced once I share the real design system.
4. For Step D2: build the primitive components listed in the shadcn install
   command, styled against the placeholder tokens, meeting the 44px minimum
   tap target from Section 2.4 at every breakpoint.
5. For Step D3: build the (auth) and (app) layout shells per the layout
   patterns table in Section 2.3 (bottom tab bar / sheet on mobile,
   sidebar / dialog on desktop, via a single responsive component, not
   forked mobile/desktop component trees), using the flow structure in
   docs/06 Section 2 as the screen map — no real data, no Supabase calls
   yet.
6. Before marking any screen complete, self-check it against the testing
   matrix in Section 2.6 (360 / 390 / 768 / 1024 / 1440px) — describe what
   you verified at each width.
7. After each numbered task, stop and summarize what was created before
   proceeding to the next. Do not skip ahead to D4 or backend wiring.
8. Flag any ambiguity in CLAUDE.md rather than guessing — ask before
   deviating from the specified structure.

Confirm you have read CLAUDE.md Sections 1–3 in full and docs/06, then begin
with task 1.
```

---

## 9. Handoff Checklist Before Backend Integration (D7)

- [ ] Design tokens finalized and applied (no placeholder values remain)
- [ ] All 7 flows (docs/06 §2) built at 360px, 768px, 1024px, 1440px
- [ ] Content copy inserted, no lorem ipsum remains
- [ ] Component library (`src/components/ui`) covers every UI pattern used across flows
- [ ] Lighthouse mobile score checked (informal baseline, not a hard gate at this stage)
- [ ] Every flow screen verified against the Section 2.6 testing matrix (360 / 390 / 768 / 1024 / 1440px), no horizontal scroll, no sub-44px tap targets
- [ ] This document's Section 7 (Build Sequence) fully checked off

Once checked, proceed to `docs/05` (CLAUDE.md Implementation Guide) Phases 1–8 for backend integration, in order.
