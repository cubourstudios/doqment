# Product Requirements Document (PRD)
## Doqment — Guided Documents & Invoicing for Freelancers

**Version:** 1.0 | **Date:** July 2026

---

## 1. Personas

**P1 — Rookie Riya (primary).** 24, freelance UI designer, Bangalore. 8 months freelancing via Instagram/referrals. Has been ghosted on a ₹40K payment once. Doesn't know what an SOW is. Needs: to be told what to create, in plain language, fast. Pays only after the product saves her once.

**P2 — Established Ethan.** 34, freelance developer, Austin, USA. 6 years in. Has his own contract template (of dubious origin), invoices from a spreadsheet. Pain is organization and repetition, not knowledge. Needs: fast generation with saved client details, invoice numbering, records at tax time. Will pay quickly for time saved.

**P3 — Cross-border Carla.** 29, content marketer, Berlin, serving US + UK clients. Pain: which jurisdiction applies? VAT on invoices to non-EU clients? Needs: jurisdiction-aware templates and invoice fields (VAT ID, reverse-charge note). Most demanding persona — served partially at MVP ("generic international" templates with EU invoice fields), fully post-MVP.

## 2. Core User Journey (happy path)

1. Lands on site (via SEO page or quiz) → signs up (email or Google OAuth).
2. Onboarding (once): name, country, profession, business name, logo (optional), tax ID (optional).
3. Creates a **Project**: client name, project type (design/dev/writing/consulting/other), project value band, client country, timeline.
4. **Document Checklist appears** — the magic moment. e.g., "For a ₹50K+ design project with a new client, you need: ① Proposal ② Service Agreement ③ SOW ④ Invoice (at milestones). Recommended: ⑤ NDA (client shares internal data?)". Each item shows *why* in one sentence.
5. Clicks "Generate" on a document → guided form (pre-filled from project + profile) → live preview → download PDF / copy link.
6. Documents saved under the project. Dashboard shows per-project completeness ("3 of 4 essential docs done") and invoice statuses (draft/sent/paid/overdue — manually toggled at MVP).

## 3. Feature List with MoSCoW Prioritization

### MUST (MVP)
| ID | Feature | Acceptance criteria (summary) |
|---|---|---|
| F1 | Email + Google auth | Signup < 30s; password reset works; sessions persist 30 days |
| F2 | Profile & business settings | Country, currency, tax ID (GSTIN/VAT/EIN field adapts by country), logo upload |
| F3 | Project creation | 5-field form; < 60s to complete; editable later |
| F4 | **Guidance engine (checklist)** | Rules map (project type × value band × client country × new/repeat client) → prioritized doc list with one-line "why"; deterministic rules, not AI |
| F5 | Document generation — 6 types: Proposal, Service Agreement, SOW, NDA, Invoice, Payment Reminder | Guided form → live preview → PDF download; fields pre-filled; regeneration allowed; version saved on each generation |
| F6 | India-compliant GST invoice + US-style invoice | GST invoice includes all mandated fields (GSTIN, HSN/SAC, CGST/SGST/IGST split, sequential number); US invoice standard fields |
| F7 | Auto invoice numbering | Sequential per user, per financial year (India) / calendar year (US); no gaps, no duplicates |
| F8 | Document storage & dashboard | List by project; search by client name; download anytime; soft delete |
| F9 | Invoice status tracking (manual) | Draft → Sent → Paid → Overdue toggles; overdue auto-flag by due date |
| F10 | Freemium limits + Razorpay subscription | Free limits enforced; upgrade flow; watermark on free-tier PDFs |
| F11 | Legal disclaimer surface | Shown at every contract-type generation; acceptance logged |

### SHOULD (v1.1, weeks 13–20)
- Shareable document links (client views branded page, no login)
- Email sending of invoices from platform
- Recurring invoices; multi-currency with exchange-rate note
- Remaining region invoice formats (UK/EU VAT, AU GST, CA GST/HST, UAE VAT, SG GST)
- Duplicate project / duplicate document

### COULD (v2)
- E-signature (embed a provider once revenue exists)
- Client portal; payment collection (Razorpay payment links)
- AI-assist for clause customization; template marketplace
- Reminders auto-send; analytics (avg. days-to-paid)

### WON'T (this year)
- Mobile native apps; accounting/ledger; tax filing; team accounts; API.

## 4. Non-Functional Requirements

- **Performance:** checklist render < 1s; PDF generation < 5s p95.
- **Availability:** best-effort on free infra; graceful degradation (if PDF service fails, offer print-to-PDF fallback via browser).
- **Security:** all traffic TLS; passwords hashed (bcrypt via auth provider); documents accessible only to owner (row-level security); signed, expiring URLs for file downloads.
- **Privacy/Compliance:** GDPR + India DPDP basics — export-my-data, delete-my-account (hard delete within 30 days), privacy policy, minimal PII collection. No EU data-residency promises at MVP (disclose US/India hosting in policy).
- **Accessibility:** keyboard-navigable forms, WCAG AA contrast.
- **i18n readiness:** all strings externalized; currency/date formatting locale-aware from day 1 (cheap now, expensive later). UI English-only at launch.

## 5. Edge Cases & Failure Scenarios (design decisions)

| Scenario | Decision |
|---|---|
| User deletes a sent invoice | Soft-delete only; number is never reused (audit integrity). Show "cancelled" state instead of delete for sent invoices. |
| Invoice numbering across FY boundary (India) | Series resets Apr 1 with prefix e.g. `2026-27/001`; user can override prefix, not sequence. |
| Client in a country we don't support | Fall back to "International" template + free-text tax fields; label clearly. |
| Multi-currency (Carla bills USD from Germany) | MVP: invoice currency selectable per invoice; totals in invoice currency only; no conversion. |
| Reverse-charge VAT (EU → non-EU) | v1.1; MVP shows a warning banner linking to a help article. |
| User edits profile after generating docs | Existing generated PDFs immutable (versioned); new generations use new data. |
| Concurrent edits on two devices | Last-write-wins with updated_at check; documents are short-lived forms, low collision risk. |
| PDF render fails | Retry once → fallback to browser print stylesheet → error logged. |
| Legal validity dispute | Disclaimer acceptance logged with timestamp + template version; ToS arbitration clause. |
| Payment webhook fails (subscription) | Grace period 3 days; reconcile via provider API daily cron. |
| Data loss | Daily automated DB backups (provider built-in); files on durable object storage. |
| Abuse (spam PDF generation) | Rate limit: 20 generations/hour free tier; captcha on signup. |
| Offline access | Not supported at MVP; PDFs are downloadable, which covers the realistic need. |
| Freelancer registered as company (not individual) | Business-type field (individual/sole prop/LLP/Ltd) alters signature blocks and invoice header. |
| Minor client / incapacity edge | Out of scope; ToS requires users be 18+ and contract with businesses/adults. |

## 6. Acceptance Criteria — Guidance Engine (F4, the core differentiator)

- GIVEN a new project (type=design, value=₹50K–2L, client country=India, new client), WHEN the project is created, THEN the checklist shows exactly: Proposal (Essential), Service Agreement (Essential), SOW (Essential), Tax Invoice (Essential), NDA (Recommended), Payment Reminder (Situational) — each with a one-line rationale.
- Rules are data-driven (JSON rules table), editable without deploy.
- Every checklist item deep-links to its generator with project data pre-filled.
- Completeness meter updates in real time as documents are generated.

## 7. Analytics Events (instrument from day 1)

`signup`, `onboarding_complete`, `project_created`, `checklist_viewed`, `doc_generation_started`, `doc_generated` (with type), `pdf_downloaded`, `invoice_status_changed`, `upgrade_viewed`, `subscription_started`, `churned`. Use PostHog free tier.

## 8. Open Product Questions

1. Should the free "which documents do I need?" quiz be public pre-signup (lead gen) or gated? (Recommend: public.)
2. Watermark aggressiveness on free tier — footer line vs. diagonal? (Recommend: tasteful footer; diagonal kills the viral loop of clients seeing clean docs.)
3. Do we let users upload their own existing contracts for storage at MVP? (Recommend: yes — trivial to build, huge retention hook.)
