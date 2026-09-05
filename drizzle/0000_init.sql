CREATE TYPE "public"."entry_kind" AS ENUM('topup', 'spend', 'correction');--> statement-breakpoint
CREATE TYPE "public"."entry_source" AS ENUM('clickup', 'manual', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'overdue', 'credited');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'staff', 'admin');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" text NOT NULL,
	"description" text,
	"amount_excl_vat_cents" integer NOT NULL,
	"vat_cents" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"issued_on" timestamp with time zone NOT NULL,
	"due_on" timestamp with time zone,
	"paid_on" timestamp with time zone,
	"moneybird_id" text,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text NOT NULL,
	"detail" text,
	"category" text,
	"booked_on" timestamp with time zone NOT NULL,
	"source" "entry_source" DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"invoice_id" uuid,
	"reverses_entry_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amount_not_zero" CHECK ("ledger_entries"."amount_cents" <> 0),
	CONSTRAINT "sign_matches_kind" CHECK (("ledger_entries"."kind" = 'topup' AND "ledger_entries"."amount_cents" > 0)
       OR ("ledger_entries"."kind" = 'spend' AND "ledger_entries"."amount_cents" < 0)
       OR ("ledger_entries"."kind" = 'correction')),
	CONSTRAINT "only_corrections_reverse" CHECK (("ledger_entries"."reverses_entry_id" IS NULL) OR ("ledger_entries"."kind" = 'correction'))
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"requested_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"clickup_company_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'clickup' NOT NULL,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"organizations_seen" integer DEFAULT 0 NOT NULL,
	"wallets_seen" integer DEFAULT 0 NOT NULL,
	"entries_created" integer DEFAULT 0 NOT NULL,
	"entries_skipped" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"organization_id" uuid,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "client_needs_org" CHECK (("users"."role" <> 'client') OR ("users"."organization_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"clickup_subscription_id" text,
	"status" "wallet_status" DEFAULT 'active' NOT NULL,
	"low_balance_threshold_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_org_number_idx" ON "invoices" USING btree ("organization_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_moneybird_idx" ON "invoices" USING btree ("moneybird_id");--> statement-breakpoint
CREATE INDEX "ledger_wallet_booked_idx" ON "ledger_entries" USING btree ("wallet_id","booked_on");--> statement-breakpoint
CREATE INDEX "ledger_kind_idx" ON "ledger_entries" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_source_ref_idx" ON "ledger_entries" USING btree ("source","source_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "login_tokens_hash_idx" ON "login_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "login_tokens_email_idx" ON "login_tokens" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clickup_idx" ON "organizations" USING btree ("clickup_company_id");--> statement-breakpoint
CREATE INDEX "sync_runs_started_idx" ON "sync_runs" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "wallets_org_idx" ON "wallets" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_clickup_idx" ON "wallets" USING btree ("clickup_subscription_id");