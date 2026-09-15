-- ============================================================================
--  James Robinson Wallet — alle tabellen in één keer
--
--  Plak dit in de SQL-editor van Supabase en druk op Run. Daarna staan alle
--  tabellen, indexen en controleregels klaar.
--
--  Dit bestand wordt gemaakt door `npm run db:bundel` uit de migraties in
--  ./drizzle. Bewerk het niet met de hand: de volgende keer wordt het
--  overschreven en is je wijziging weg terwijl de database hem nog wel heeft.
--  Een nieuwe migratie erbij? Draai het script opnieuw.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0000_init
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."entry_kind" AS ENUM('topup', 'spend', 'correction');

CREATE TYPE "public"."entry_source" AS ENUM('clickup', 'manual', 'invoice');

CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'overdue', 'credited');

CREATE TYPE "public"."sync_status" AS ENUM('running', 'success', 'failed');

CREATE TYPE "public"."user_role" AS ENUM('client', 'staff', 'admin');

CREATE TYPE "public"."wallet_status" AS ENUM('active', 'paused', 'closed');

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


CREATE TABLE "login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"requested_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"clickup_company_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);


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


ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "wallets" ADD CONSTRAINT "wallets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");

CREATE UNIQUE INDEX "invoices_org_number_idx" ON "invoices" USING btree ("organization_id","number");

CREATE UNIQUE INDEX "invoices_moneybird_idx" ON "invoices" USING btree ("moneybird_id");

CREATE INDEX "ledger_wallet_booked_idx" ON "ledger_entries" USING btree ("wallet_id","booked_on");

CREATE INDEX "ledger_kind_idx" ON "ledger_entries" USING btree ("kind");

CREATE UNIQUE INDEX "ledger_source_ref_idx" ON "ledger_entries" USING btree ("source","source_ref");

CREATE UNIQUE INDEX "login_tokens_hash_idx" ON "login_tokens" USING btree ("token_hash");

CREATE INDEX "login_tokens_email_idx" ON "login_tokens" USING btree ("email");

CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");

CREATE UNIQUE INDEX "organizations_clickup_idx" ON "organizations" USING btree ("clickup_company_id");

CREATE INDEX "sync_runs_started_idx" ON "sync_runs" USING btree ("started_at");

CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");

CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");

CREATE INDEX "wallets_org_idx" ON "wallets" USING btree ("organization_id");

CREATE UNIQUE INDEX "wallets_clickup_idx" ON "wallets" USING btree ("clickup_subscription_id");

-- ---------------------------------------------------------------------------
-- 0001_diensten_en_boekingen
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."service_unit" AS ENUM('piece', 'hour', 'month', 'project');

CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"department" text,
	"unit" "service_unit" DEFAULT 'piece' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"cost_price_cents" integer,
	"estimated_minutes" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_price_positive" CHECK ("services"."unit_price_cents" > 0),
	CONSTRAINT "service_cost_not_negative" CHECK ("services"."cost_price_cents" IS NULL OR "services"."cost_price_cents" >= 0)
);


ALTER TABLE "ledger_entries" ADD COLUMN "service_id" uuid;

ALTER TABLE "ledger_entries" ADD COLUMN "quantity_hundredths" integer;

ALTER TABLE "ledger_entries" ADD COLUMN "unit_price_cents" integer;

ALTER TABLE "ledger_entries" ADD COLUMN "delivered_by_user_id" uuid;

CREATE INDEX "services_name_idx" ON "services" USING btree ("name");

CREATE UNIQUE INDEX "services_code_idx" ON "services" USING btree ("code");

CREATE INDEX "services_active_idx" ON "services" USING btree ("active");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_delivered_by_user_id_users_id_fk" FOREIGN KEY ("delivered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "ledger_service_idx" ON "ledger_entries" USING btree ("service_id");

CREATE INDEX "ledger_delivered_by_idx" ON "ledger_entries" USING btree ("delivered_by_user_id");

CREATE INDEX "ledger_booked_on_idx" ON "ledger_entries" USING btree ("booked_on");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "quantity_positive" CHECK ("ledger_entries"."quantity_hundredths" IS NULL OR "ledger_entries"."quantity_hundredths" > 0);

ALTER TABLE "ledger_entries" ADD CONSTRAINT "service_needs_quantity_and_price" CHECK (("ledger_entries"."service_id" IS NULL)
       OR ("ledger_entries"."quantity_hundredths" IS NOT NULL AND "ledger_entries"."unit_price_cents" IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 0002_kostprijs_op_boeking
-- ---------------------------------------------------------------------------

ALTER TABLE "ledger_entries" ADD COLUMN "unit_cost_cents" integer;

-- ---------------------------------------------------------------------------
-- 0003_abonnementen
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'ended');

CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount_excl_vat_cents" integer NOT NULL,
	"vat_rate_percent" integer DEFAULT 21 NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"billing_day" integer DEFAULT 2 NOT NULL,
	"started_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone,
	"service_id" uuid,
	"clickup_task_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_amount_positive" CHECK ("subscriptions"."amount_excl_vat_cents" > 0),
	CONSTRAINT "subscription_billing_day_valid" CHECK ("subscriptions"."billing_day" >= 1 AND "subscriptions"."billing_day" <= 28),
	CONSTRAINT "subscription_vat_valid" CHECK ("subscriptions"."vat_rate_percent" >= 0 AND "subscriptions"."vat_rate_percent" <= 100),
	CONSTRAINT "subscription_ends_after_start" CHECK ("subscriptions"."ends_on" IS NULL OR "subscriptions"."ends_on" >= "subscriptions"."started_on")
);


ALTER TABLE "invoices" ADD COLUMN "subscription_id" uuid;

ALTER TABLE "invoices" ADD COLUMN "period" text;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");

CREATE INDEX "subscriptions_wallet_idx" ON "subscriptions" USING btree ("wallet_id");

CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");

CREATE UNIQUE INDEX "subscriptions_clickup_idx" ON "subscriptions" USING btree ("clickup_task_id");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "invoices_subscription_period_idx" ON "invoices" USING btree ("subscription_id","period");

CREATE INDEX "invoices_subscription_idx" ON "invoices" USING btree ("subscription_id");

ALTER TABLE "invoices" ADD CONSTRAINT "subscription_needs_period" CHECK (("invoices"."subscription_id" IS NULL) = ("invoices"."period" IS NULL));

ALTER TABLE "invoices" ADD CONSTRAINT "period_format" CHECK ("invoices"."period" IS NULL OR "invoices"."period" ~ '^[0-9]{4}-[0-9]{2}$');

-- ---------------------------------------------------------------------------
-- 0004_abonnement_niet_verwijderbaar
-- ---------------------------------------------------------------------------

ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscription_id_subscriptions_id_fk";


ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;

-- ---------------------------------------------------------------------------
-- 0005_crm
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."account_owner" AS ENUM('client', 'agency', 'shared');

CREATE TYPE "public"."organization_status" AS ENUM('prospect', 'client', 'former');

CREATE TYPE "public"."partner_type" AS ENUM('photographer', 'videographer', 'printer', 'developer', 'copywriter', 'translator', 'designer', 'other');

CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"system" text,
	"url" text,
	"login_hint" text,
	"owner" "account_owner" DEFAULT 'client' NOT NULL,
	"vault_reference" text,
	"has_mfa" boolean DEFAULT false NOT NULL,
	"mfa_notes" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"job_title" text,
	"email" text,
	"phone" text,
	"mobile" text,
	"linkedin_url" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"receives_invoices" boolean DEFAULT false NOT NULL,
	"user_id" uuid,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "organization_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"role" text NOT NULL,
	"custom_hourly_rate_cents" integer,
	"since" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_partner_rate_positive" CHECK ("organization_partners"."custom_hourly_rate_cents" IS NULL OR "organization_partners"."custom_hourly_rate_cents" > 0)
);


CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "partner_type" DEFAULT 'other' NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"website" text,
	"kvk_number" text,
	"vat_number" text,
	"hourly_rate_cents" integer,
	"day_rate_cents" integer,
	"payment_term_days" integer,
	"agreement_notes" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_hourly_positive" CHECK ("partners"."hourly_rate_cents" IS NULL OR "partners"."hourly_rate_cents" > 0),
	CONSTRAINT "partner_day_positive" CHECK ("partners"."day_rate_cents" IS NULL OR "partners"."day_rate_cents" > 0),
	CONSTRAINT "partner_term_positive" CHECK ("partners"."payment_term_days" IS NULL OR "partners"."payment_term_days" > 0)
);


ALTER TABLE "organizations" ADD COLUMN "status" "organization_status" DEFAULT 'client' NOT NULL;

ALTER TABLE "organizations" ADD COLUMN "industry" text;

ALTER TABLE "organizations" ADD COLUMN "kvk_number" text;

ALTER TABLE "organizations" ADD COLUMN "vat_number" text;

ALTER TABLE "organizations" ADD COLUMN "website" text;

ALTER TABLE "organizations" ADD COLUMN "phone" text;

ALTER TABLE "organizations" ADD COLUMN "email" text;

ALTER TABLE "organizations" ADD COLUMN "address_line" text;

ALTER TABLE "organizations" ADD COLUMN "postal_code" text;

ALTER TABLE "organizations" ADD COLUMN "city" text;

ALTER TABLE "organizations" ADD COLUMN "country" text DEFAULT 'Nederland' NOT NULL;

ALTER TABLE "organizations" ADD COLUMN "client_since" timestamp with time zone;

ALTER TABLE "organizations" ADD COLUMN "notes" text;

ALTER TABLE "organizations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "organization_partners" ADD CONSTRAINT "organization_partners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "organization_partners" ADD CONSTRAINT "organization_partners_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "accounts_org_idx" ON "accounts" USING btree ("organization_id");

CREATE INDEX "accounts_system_idx" ON "accounts" USING btree ("system");

CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("organization_id");

CREATE INDEX "contacts_name_idx" ON "contacts" USING btree ("name");

CREATE UNIQUE INDEX "contacts_user_idx" ON "contacts" USING btree ("user_id");

CREATE UNIQUE INDEX "contacts_one_primary_idx" ON "contacts" USING btree ("organization_id") WHERE "contacts"."is_primary";

CREATE INDEX "org_partners_org_idx" ON "organization_partners" USING btree ("organization_id");

CREATE INDEX "org_partners_partner_idx" ON "organization_partners" USING btree ("partner_id");

CREATE UNIQUE INDEX "org_partners_pair_idx" ON "organization_partners" USING btree ("organization_id","partner_id");

CREATE INDEX "partners_name_idx" ON "partners" USING btree ("name");

CREATE INDEX "partners_type_idx" ON "partners" USING btree ("type");

CREATE INDEX "partners_active_idx" ON "partners" USING btree ("active");

CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");

CREATE INDEX "organizations_industry_idx" ON "organizations" USING btree ("industry");

-- ---------------------------------------------------------------------------
-- 0006_offertes
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."quote_line_kind" AS ENUM('service', 'partner', 'custom', 'discount');

CREATE TYPE "public"."quote_status" AS ENUM('draft', 'awaiting_partner', 'sent', 'accepted', 'declined', 'expired');

CREATE TABLE "quote_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"kind" "quote_line_kind" DEFAULT 'custom' NOT NULL,
	"service_id" uuid,
	"partner_id" uuid,
	"description" text NOT NULL,
	"detail" text,
	"quantity_hundredths" integer DEFAULT 100 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"unit_cost_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_line_quantity_positive" CHECK ("quote_lines"."quantity_hundredths" > 0),
	CONSTRAINT "quote_line_price_sign" CHECK (("quote_lines"."kind" = 'discount' AND "quote_lines"."unit_price_cents" < 0)
       OR ("quote_lines"."kind" <> 'discount' AND "quote_lines"."unit_price_cents" > 0)),
	CONSTRAINT "quote_line_cost_not_negative" CHECK ("quote_lines"."unit_cost_cents" IS NULL OR "quote_lines"."unit_cost_cents" >= 0),
	CONSTRAINT "partner_line_needs_partner" CHECK (("quote_lines"."kind" <> 'partner') OR ("quote_lines"."partner_id" IS NOT NULL))
);


CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"contact_id" uuid,
	"intro_text" text,
	"terms_text" text,
	"vat_rate_percent" integer DEFAULT 21 NOT NULL,
	"issued_on" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decline_reason" text,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_vat_valid" CHECK ("quotes"."vat_rate_percent" >= 0 AND "quotes"."vat_rate_percent" <= 100)
);


ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "quote_lines_quote_idx" ON "quote_lines" USING btree ("quote_id","sort_order");

CREATE INDEX "quote_lines_partner_idx" ON "quote_lines" USING btree ("partner_id");

CREATE INDEX "quote_lines_service_idx" ON "quote_lines" USING btree ("service_id");

CREATE INDEX "quotes_org_idx" ON "quotes" USING btree ("organization_id");

CREATE INDEX "quotes_status_idx" ON "quotes" USING btree ("status");

CREATE UNIQUE INDEX "quotes_number_idx" ON "quotes" USING btree ("number");

-- ---------------------------------------------------------------------------
-- 0007_rls
-- ---------------------------------------------------------------------------

-- Row Level Security aanzetten op alle tabellen.
--
-- Waarom: Supabase zet standaard een REST-API voor je tabellen open die
-- bereikbaar is met de `anon`-key. Die key is in hun model publiek; hij is
-- bedoeld om in browsercode te staan. Zonder RLS kan iedereen die hem heeft
-- het hele klantenbestand uitlezen: namen, telefoonnummers, omzetcijfers.
--
-- De wallet gebruikt die API niet. Hij praat rechtstreeks Postgres als de
-- eigenaar van de tabellen, en een eigenaar gaat langs RLS heen. Deze regels
-- veranderen dus niets aan wat de app kan, en sluiten wel een deur die
-- anderszins openstaat.
--
-- Er komen met opzet GEEN policies bij. Zonder policy mag een rol die niet
-- de eigenaar is helemaal niets, en dat is precies de bedoeling: wie via de
-- REST-API binnenkomt hoort niets te kunnen. Zou hier later een policy bij
-- moeten, dan is dat een bewuste keuze en geen bijvangst.
--
-- Op een gewone Postgres (Docker, Neon, een eigen server) is dit onschadelijk:
-- daar is er geen anon-rol en gaat de app om dezelfde reden langs RLS heen.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- 0008_crm_uitbreiding
-- ---------------------------------------------------------------------------

CREATE TYPE "public"."activity_kind" AS ENUM('note', 'call', 'meeting', 'email', 'task');

CREATE TYPE "public"."lead_source" AS ENUM('referral', 'network', 'inbound', 'outbound', 'partner', 'event', 'other');

ALTER TYPE "public"."organization_status" ADD VALUE 'lead' BEFORE 'prospect';

CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_id" uuid,
	"user_id" uuid,
	"kind" "activity_kind" DEFAULT 'note' NOT NULL,
	"subject" text NOT NULL,
	"body" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_subject_not_empty" CHECK (length(trim("activities"."subject")) > 0)
);


CREATE TABLE "organization_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "organization_tags" (
	"organization_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_tags_organization_id_tag_id_pk" PRIMARY KEY("organization_id","tag_id")
);


CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE "accounts" ADD COLUMN "vault_url" text;

ALTER TABLE "contacts" ADD COLUMN "department" text;

ALTER TABLE "contacts" ADD COLUMN "birth_day" integer;

ALTER TABLE "contacts" ADD COLUMN "birth_month" integer;

ALTER TABLE "contacts" ADD COLUMN "birth_year" integer;

ALTER TABLE "organizations" ADD COLUMN "invoice_email" text;

ALTER TABLE "organizations" ADD COLUMN "invoice_address_line" text;

ALTER TABLE "organizations" ADD COLUMN "invoice_postal_code" text;

ALTER TABLE "organizations" ADD COLUMN "invoice_city" text;

ALTER TABLE "organizations" ADD COLUMN "invoice_reference" text;

ALTER TABLE "organizations" ADD COLUMN "payment_term_days" integer;

ALTER TABLE "organizations" ADD COLUMN "lead_source" "lead_source";

ALTER TABLE "organizations" ADD COLUMN "next_action_on" timestamp with time zone;

ALTER TABLE "organizations" ADD COLUMN "next_action_note" text;

ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "organization_owners" ADD CONSTRAINT "organization_owners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "organization_owners" ADD CONSTRAINT "organization_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "organization_tags" ADD CONSTRAINT "organization_tags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "organization_tags" ADD CONSTRAINT "organization_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "activities_org_idx" ON "activities" USING btree ("organization_id","occurred_at");

CREATE INDEX "activities_contact_idx" ON "activities" USING btree ("contact_id");

CREATE UNIQUE INDEX "organization_owners_pair_idx" ON "organization_owners" USING btree ("organization_id","user_id");

CREATE INDEX "organization_owners_user_idx" ON "organization_owners" USING btree ("user_id");

CREATE UNIQUE INDEX "organization_owners_primary_idx" ON "organization_owners" USING btree ("organization_id") WHERE "organization_owners"."is_primary";

CREATE INDEX "organization_tags_tag_idx" ON "organization_tags" USING btree ("tag_id");

CREATE UNIQUE INDEX "tags_name_idx" ON "tags" USING btree (lower("name"));

CREATE INDEX "contacts_birthday_idx" ON "contacts" USING btree ("birth_month","birth_day");

CREATE INDEX "organizations_next_action_idx" ON "organizations" USING btree ("next_action_on");

ALTER TABLE "contacts" ADD CONSTRAINT "contact_birthday_complete" CHECK (("contacts"."birth_day" IS NULL) = ("contacts"."birth_month" IS NULL));

ALTER TABLE "contacts" ADD CONSTRAINT "contact_birth_day_valid" CHECK ("contacts"."birth_day" IS NULL OR ("contacts"."birth_day" >= 1 AND "contacts"."birth_day" <= 31));

ALTER TABLE "contacts" ADD CONSTRAINT "contact_birth_month_valid" CHECK ("contacts"."birth_month" IS NULL OR ("contacts"."birth_month" >= 1 AND "contacts"."birth_month" <= 12));

ALTER TABLE "contacts" ADD CONSTRAINT "contact_birth_year_valid" CHECK ("contacts"."birth_year" IS NULL OR ("contacts"."birth_year" >= 1900 AND "contacts"."birth_year" <= 2100));

ALTER TABLE "organizations" ADD CONSTRAINT "organization_payment_term_positive" CHECK ("organizations"."payment_term_days" IS NULL OR "organizations"."payment_term_days" > 0);

-- Row Level Security op de nieuwe tabellen, om dezelfde reden als in 0007:
-- zonder dit staan ze open voor de anon-key van Supabase.
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "organization_owners" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "organization_tags" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 0009_portfolio
-- ---------------------------------------------------------------------------

ALTER TABLE "users" ADD COLUMN "is_marketing_manager" boolean DEFAULT false NOT NULL;

ALTER TABLE "users" ADD COLUMN "monthly_target_cents" integer;

ALTER TABLE "users" ADD CONSTRAINT "user_target_positive" CHECK ("users"."monthly_target_cents" IS NULL OR "users"."monthly_target_cents" > 0);

ALTER TABLE "users" ADD CONSTRAINT "user_target_needs_manager" CHECK ("users"."monthly_target_cents" IS NULL OR "users"."is_marketing_manager");

-- ---------------------------------------------------------------------------
-- Welke migraties hiermee gedraaid zijn
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES
  ('738c7be8bd171dd1ee2c06df8387f94eb945b08891421400b29b127a3aa95cac', 1788622970348),  -- 0000_init
  ('74272e4c1d0a4e1228a79f03cd08f178e0edc0a1afab34b7ee6bd1fa4949254c', 1788789672491),  -- 0001_diensten_en_boekingen
  ('b80a545f154e3f5eb2c93a02102d400d436a711ac764389c4f9c9fd58addb11c', 1788789944844),  -- 0002_kostprijs_op_boeking
  ('6167b6a9f0315965d0c5e1b1547254db9f7812ddcf31635476bcfa4b9bbf1d63', 1788793164674),  -- 0003_abonnementen
  ('d3ea417bd20032654be3f6f62a76acc4ef575fd8e4a53896194340a2d8c2402c', 1788793796466),  -- 0004_abonnement_niet_verwijderbaar
  ('c4170edac62b10a7df4d213096081ef62b2484277495ba230e6115be5dde678f', 1789024135051),  -- 0005_crm
  ('2ff75852cc2565de289f49c687a5c5e5c6169045e5fbfe1948f9c99e82216df1', 1789111263063),  -- 0006_offertes
  ('acc8bba55ee145b3b5ae41c3a5b074d194c9d015fab8c13c769db6faa5aae559', 1789197663063),  -- 0007_rls
  ('fed6c34eb8d597e6be313bf41fa0d0ee7a7d3280aa582ae72ed3b079fbe3905e', 1789461828334),  -- 0008_crm_uitbreiding
  ('23a4912dd0f99e1d96c9d9b853f0d3d5cd5af53357e400405f3e729a3a101c0b', 1789463118797);  -- 0009_portfolio
