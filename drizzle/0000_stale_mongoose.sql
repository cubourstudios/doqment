CREATE TYPE "public"."billing_provider" AS ENUM('razorpay', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('individual', 'sole_proprietorship', 'partnership', 'llp', 'private_limited', 'other');--> statement-breakpoint
CREATE TYPE "public"."doc_type" AS ENUM('proposal', 'service_agreement', 'sow', 'nda', 'invoice', 'payment_reminder');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'final', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."guidance_priority" AS ENUM('essential', 'recommended', 'situational');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('design', 'development', 'writing', 'consulting', 'other');--> statement-breakpoint
CREATE TYPE "public"."region" AS ENUM('IN', 'US', 'INTL');--> statement-breakpoint
CREATE TYPE "public"."value_band" AS ENUM('under_50k', '50k_2l', '2l_10l', 'above_10l');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"company" text,
	"country" text,
	"tax_id" text,
	"address_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disclaimer_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"template_version" integer NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"data_json" jsonb NOT NULL,
	"template_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_document_id_version_no_key" UNIQUE("document_id","version_no")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"template_id" uuid,
	"doc_type" "doc_type" NOT NULL,
	"title" text NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"current_version_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"props_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guidance_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conditions_json" jsonb NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"priority" "guidance_priority" NOT NULL,
	"rationale_text" text NOT NULL,
	"region" "region" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"user_id" uuid NOT NULL,
	"series" text NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"prefix" text,
	CONSTRAINT "invoice_counters_user_id_series_pk" PRIMARY KEY("user_id","series")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"series" text NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"currency" text NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"tax_json" jsonb NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "invoices_user_id_invoice_number_key" UNIQUE("user_id","invoice_number")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"country" text,
	"currency" text,
	"profession" text,
	"business_name" text,
	"business_type" "business_type",
	"tax_id" text,
	"tax_id_type" text,
	"logo_path" text,
	"address_json" jsonb,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid,
	"title" text NOT NULL,
	"project_type" "project_type" NOT NULL,
	"value_band" "value_band" NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_sub_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone,
	"raw_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_sub_id_key" UNIQUE("provider","provider_sub_id")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"region" "region" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"schema_json" jsonb NOT NULL,
	"body_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "templates_doc_type_region_version_key" UNIQUE("doc_type","region","version")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "billing_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_event_id_key" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclaimer_logs" ADD CONSTRAINT "disclaimer_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclaimer_logs" ADD CONSTRAINT "disclaimer_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_counters" ADD CONSTRAINT "invoice_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "disclaimer_logs_user_id_idx" ON "disclaimer_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_versions_document_id_idx" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_project_id_idx" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "events_user_id_idx" ON "events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guidance_rules_region_active_idx" ON "guidance_rules" USING btree ("region","active");--> statement-breakpoint
CREATE INDEX "invoices_user_id_status_idx" ON "invoices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_client_id_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templates_lookup_idx" ON "templates" USING btree ("doc_type","region","is_active");--> statement-breakpoint
CREATE INDEX "uploads_user_id_idx" ON "uploads" USING btree ("user_id");