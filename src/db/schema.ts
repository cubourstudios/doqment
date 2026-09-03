/**
 * Doqment database schema — Tech Plan §3.
 *
 * Two things to know before editing:
 *
 * 1. `auth.users` is owned by Supabase Auth, not by us. It is declared below
 *    only so foreign keys can point at it. `drizzle.config.ts` sets
 *    `schemaFilter: ["public"]` so drizzle-kit never tries to create or drop it.
 *
 * 2. RLS is not expressible in Drizzle. Every user-owned table here gets its
 *    policies from a hand-written SQL migration. Adding a table means adding
 *    its policy there too — see `drizzle/manual/0001_rls.sql`.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// -- Supabase-owned (declared for FK targets only) ---------------------------

const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

// -- Enums -------------------------------------------------------------------

export const planEnum = pgEnum("plan", ["free", "pro"]);

export const businessTypeEnum = pgEnum("business_type", [
  "individual",
  "sole_proprietorship",
  "partnership",
  "llp",
  "private_limited",
  "other",
]);

export const projectTypeEnum = pgEnum("project_type", [
  "design",
  "development",
  "writing",
  "consulting",
  "other",
]);

/**
 * Ordered project value bands. Anchored to INR (the PRD's worked example is
 * "₹50K–2L") with rough USD equivalents so one band set serves every region:
 *   under_50k  < ₹50K      / < $600
 *   50k_2l     ₹50K–2L     / $600–2.4K
 *   2l_10l     ₹2L–10L     / $2.4K–12K
 *   above_10l  > ₹10L      / > $12K
 * Order matters: guidance rules compare against a minimum band.
 */
export const valueBandEnum = pgEnum("value_band", [
  "under_50k",
  "50k_2l",
  "2l_10l",
  "above_10l",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "completed",
  "archived",
]);

export const docTypeEnum = pgEnum("doc_type", [
  "proposal",
  "service_agreement",
  "sow",
  "nda",
  "invoice",
  "payment_reminder",
]);

/** Template/rule region. "INTL" is the documented fallback for unsupported countries. */
export const regionEnum = pgEnum("region", ["IN", "US", "INTL"]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "final",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export const guidancePriorityEnum = pgEnum("guidance_priority", [
  "essential",
  "recommended",
  "situational",
]);

/*
 * Razorpay is the only provider the app writes. "stripe" is a leftover from a
 * dual-rail design that was dropped, kept because Postgres has no way to drop
 * a value from an enum type — removing it would mean recreating the type and
 * rewriting every column that references it, to delete a string nothing reads.
 */
export const billingProviderEnum = pgEnum("billing_provider", [
  "razorpay",
  "stripe",
]);

// -- User-owned tables -------------------------------------------------------

/**
 * One row per auth user, created by the `handle_new_user` trigger on signup
 * (see `drizzle/manual/0002_new_user_trigger.sql`). `country IS NULL` is the
 * signal that onboarding has not been completed.
 */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name"),
  country: text("country"), // ISO 3166-1 alpha-2
  currency: text("currency"), // ISO 4217
  profession: text("profession"),
  businessName: text("business_name"),
  businessType: businessTypeEnum("business_type"),
  taxId: text("tax_id"),
  taxIdType: text("tax_id_type"), // GSTIN | VAT | EIN | ...
  logoPath: text("logo_path"), // storage key in the private `logos` bucket
  addressJson: jsonb("address_json"),
  /**
   * How this user gets paid — bank account, UPI id, whatever they use.
   *
   * Free text rather than structured columns because the shape differs by
   * country and by how the freelancer prefers to be paid: an Indian invoice
   * carries account number, IFSC and often a UPI id; a US one carries ACH
   * details; a European one an IBAN. Modelling all of that would constrain
   * users without helping them, and it only ever gets printed verbatim.
   *
   * Stored on the profile so it is typed once. Retyping bank details on every
   * invoice is both tedious and the kind of thing people eventually forget —
   * and an invoice with no payment instructions is one the client cannot act
   * on.
   */
  paymentDetails: text("payment_details"),
  plan: planEnum("plan").default("free").notNull(),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Clients are reusable across projects — that reuse is the point (persona P2). */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    country: text("country"),
    taxId: text("tax_id"),
    addressJson: jsonb("address_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("clients_user_id_idx").on(t.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    projectType: projectTypeEnum("project_type").notNull(),
    valueBand: valueBandEnum("value_band").notNull(),
    status: projectStatusEnum("status").default("active").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("projects_user_id_idx").on(t.userId),
    index("projects_client_id_idx").on(t.clientId),
  ],
);

// -- Public reference data (read-only to users) ------------------------------

/**
 * Field definitions (`schemaJson`) plus content blocks with merge tags
 * (`bodyJson`). Region expansion is a data change, not a code change.
 */
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docType: docTypeEnum("doc_type").notNull(),
    region: regionEnum("region").notNull(),
    version: integer("version").default(1).notNull(),
    name: text("name").notNull(),
    schemaJson: jsonb("schema_json").notNull(),
    bodyJson: jsonb("body_json").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("templates_doc_type_region_version_key").on(
      t.docType,
      t.region,
      t.version,
    ),
    index("templates_lookup_idx").on(t.docType, t.region, t.isActive),
  ],
);

/**
 * The guidance engine's rules, stored as data so they can be edited without a
 * deploy (Tech Plan §5). `conditionsJson` shape:
 *   { project_type: string[] | "*", value_band_min: string,
 *     client_relationship: "new" | "repeat" | "*", client_country: string | "*" }
 */
export const guidanceRules = pgTable(
  "guidance_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conditionsJson: jsonb("conditions_json").notNull(),
    docType: docTypeEnum("doc_type").notNull(),
    priority: guidancePriorityEnum("priority").notNull(),
    rationaleText: text("rationale_text").notNull(),
    region: regionEnum("region").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("guidance_rules_region_active_idx").on(t.region, t.active)],
);

// -- Documents ---------------------------------------------------------------

/**
 * Soft-deleted only (`deletedAt`): an invoice number must never be reused, so
 * the row that owns it can never truly go away.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    templateId: uuid("template_id").references(() => templates.id, {
      onDelete: "restrict",
    }),
    docType: docTypeEnum("doc_type").notNull(),
    title: text("title").notNull(),
    status: documentStatusEnum("status").default("draft").notNull(),
    currentVersionId: uuid("current_version_id"), // FK added in SQL (circular)
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("documents_user_id_idx").on(t.userId),
    index("documents_project_id_idx").on(t.projectId),
  ],
);

/**
 * Append-only. The JSON payload here — not the PDF — is the source of truth,
 * which is what makes re-rendering, editing and future formats possible.
 */
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    dataJson: jsonb("data_json").notNull(),
    templateVersion: integer("template_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("document_versions_document_id_version_no_key").on(
      t.documentId,
      t.versionNo,
    ),
    index("document_versions_document_id_idx").on(t.documentId),
  ],
);

/**
 * Money is `numeric`, never a float. Totals are recomputed server-side; the
 * client's arithmetic is never trusted for storage.
 */
export const invoices = pgTable(
  "invoices",
  {
    documentId: uuid("document_id")
      .primaryKey()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    series: text("series").notNull(), // 'FY2026-27' (IN) or '2026' (calendar)
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    currency: text("currency").notNull(),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    taxJson: jsonb("tax_json").notNull(), // CGST/SGST/IGST or VAT/sales-tax breakdown
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    unique("invoices_user_id_invoice_number_key").on(t.userId, t.invoiceNumber),
    index("invoices_user_id_status_idx").on(t.userId, t.status),
  ],
);

/**
 * Incremented inside the generation transaction. The row lock taken by
 * `UPDATE ... RETURNING` is what guarantees no duplicates and no gaps under
 * concurrent requests (Tech Plan §2).
 */
export const invoiceCounters = pgTable(
  "invoice_counters",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    series: text("series").notNull(),
    lastNumber: integer("last_number").default(0).notNull(),
    prefix: text("prefix"), // user may override the prefix, never the sequence
  },
  (t) => [primaryKey({ columns: [t.userId, t.series] })],
);

// -- Supporting tables -------------------------------------------------------

/** User-uploaded files (their own existing contracts) — a retention hook, PRD §8.3. */
export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    filePath: text("file_path").notNull(), // key in the private `uploads` bucket
    fileName: text("file_name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("uploads_user_id_idx").on(t.userId)],
);

/** Append-only evidence that the disclaimer was shown and accepted (PRD F11). */
export const disclaimerLogs = pgTable(
  "disclaimer_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    templateVersion: integer("template_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("disclaimer_logs_user_id_idx").on(t.userId)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    provider: billingProviderEnum("provider").notNull(),
    providerSubId: text("provider_sub_id").notNull(),
    status: text("status").notNull(), // provider's own vocabulary, kept raw
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("subscriptions_provider_sub_id_key").on(t.provider, t.providerSubId),
    index("subscriptions_user_id_idx").on(t.userId),
  ],
);

/**
 * Webhook idempotency. Both providers retry, so an event ID we have already
 * seen must be a no-op rather than a second entitlement change.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: billingProviderEnum("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("webhook_events_provider_event_id_key").on(
      t.provider,
      t.providerEventId,
    ),
  ],
);

/** Local backup for the PostHog event stream (PRD §7). */
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => authUsers.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    propsJson: jsonb("props_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("events_user_id_idx").on(t.userId)],
);
