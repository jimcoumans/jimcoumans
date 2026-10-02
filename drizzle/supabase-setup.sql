-- ============================================================================
--  James Robinson Wallet — alle tabellen in één keer
--
--  Plak dit in de SQL-editor van Supabase en druk op Run. Daarna staan alle
--  tabellen, indexen en controleregels klaar.
--
--  Je mag dit bestand zo vaak draaien als je wilt: wat er al staat wordt
--  overgeslagen.
--
--  Dit bestand wordt gemaakt door `npm run db:bundel` uit de migraties in
--  ./drizzle. Bewerk het niet met de hand: de volgende keer wordt het
--  overschreven en is je wijziging weg terwijl de database hem nog wel heeft.
--  Een nieuwe migratie erbij? Draai het script opnieuw.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Boekhouding: welke migraties zijn er gedraaid
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- ---------------------------------------------------------------------------
-- 0000_init
-- ---------------------------------------------------------------------------

DO $jr_0000_init$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '738c7be8bd171dd1ee2c06df8387f94eb945b08891421400b29b127a3aa95cac') THEN
    RAISE NOTICE 'Overgeslagen: 0000_init stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('738c7be8bd171dd1ee2c06df8387f94eb945b08891421400b29b127a3aa95cac', 1788622970348);
    RAISE NOTICE 'Toegepast: 0000_init.';
  END IF;
END $jr_0000_init$;

-- ---------------------------------------------------------------------------
-- 0001_diensten_en_boekingen
-- ---------------------------------------------------------------------------

DO $jr_0001_diensten_en_boekingen$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '74272e4c1d0a4e1228a79f03cd08f178e0edc0a1afab34b7ee6bd1fa4949254c') THEN
    RAISE NOTICE 'Overgeslagen: 0001_diensten_en_boekingen stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('74272e4c1d0a4e1228a79f03cd08f178e0edc0a1afab34b7ee6bd1fa4949254c', 1788789672491);
    RAISE NOTICE 'Toegepast: 0001_diensten_en_boekingen.';
  END IF;
END $jr_0001_diensten_en_boekingen$;

-- ---------------------------------------------------------------------------
-- 0002_kostprijs_op_boeking
-- ---------------------------------------------------------------------------

DO $jr_0002_kostprijs_op_boeking$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'b80a545f154e3f5eb2c93a02102d400d436a711ac764389c4f9c9fd58addb11c') THEN
    RAISE NOTICE 'Overgeslagen: 0002_kostprijs_op_boeking stond er al.';
  ELSE
    ALTER TABLE "ledger_entries" ADD COLUMN "unit_cost_cents" integer;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('b80a545f154e3f5eb2c93a02102d400d436a711ac764389c4f9c9fd58addb11c', 1788789944844);
    RAISE NOTICE 'Toegepast: 0002_kostprijs_op_boeking.';
  END IF;
END $jr_0002_kostprijs_op_boeking$;

-- ---------------------------------------------------------------------------
-- 0003_abonnementen
-- ---------------------------------------------------------------------------

DO $jr_0003_abonnementen$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '6167b6a9f0315965d0c5e1b1547254db9f7812ddcf31635476bcfa4b9bbf1d63') THEN
    RAISE NOTICE 'Overgeslagen: 0003_abonnementen stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('6167b6a9f0315965d0c5e1b1547254db9f7812ddcf31635476bcfa4b9bbf1d63', 1788793164674);
    RAISE NOTICE 'Toegepast: 0003_abonnementen.';
  END IF;
END $jr_0003_abonnementen$;

-- ---------------------------------------------------------------------------
-- 0004_abonnement_niet_verwijderbaar
-- ---------------------------------------------------------------------------

DO $jr_0004_abonnement_niet_verwijderbaar$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'd3ea417bd20032654be3f6f62a76acc4ef575fd8e4a53896194340a2d8c2402c') THEN
    RAISE NOTICE 'Overgeslagen: 0004_abonnement_niet_verwijderbaar stond er al.';
  ELSE
    ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscription_id_subscriptions_id_fk";


    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('d3ea417bd20032654be3f6f62a76acc4ef575fd8e4a53896194340a2d8c2402c', 1788793796466);
    RAISE NOTICE 'Toegepast: 0004_abonnement_niet_verwijderbaar.';
  END IF;
END $jr_0004_abonnement_niet_verwijderbaar$;

-- ---------------------------------------------------------------------------
-- 0005_crm
-- ---------------------------------------------------------------------------

DO $jr_0005_crm$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'c4170edac62b10a7df4d213096081ef62b2484277495ba230e6115be5dde678f') THEN
    RAISE NOTICE 'Overgeslagen: 0005_crm stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('c4170edac62b10a7df4d213096081ef62b2484277495ba230e6115be5dde678f', 1789024135051);
    RAISE NOTICE 'Toegepast: 0005_crm.';
  END IF;
END $jr_0005_crm$;

-- ---------------------------------------------------------------------------
-- 0006_offertes
-- ---------------------------------------------------------------------------

DO $jr_0006_offertes$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '2ff75852cc2565de289f49c687a5c5e5c6169045e5fbfe1948f9c99e82216df1') THEN
    RAISE NOTICE 'Overgeslagen: 0006_offertes stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('2ff75852cc2565de289f49c687a5c5e5c6169045e5fbfe1948f9c99e82216df1', 1789111263063);
    RAISE NOTICE 'Toegepast: 0006_offertes.';
  END IF;
END $jr_0006_offertes$;

-- ---------------------------------------------------------------------------
-- 0007_rls
-- ---------------------------------------------------------------------------

DO $jr_0007_rls$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'acc8bba55ee145b3b5ae41c3a5b074d194c9d015fab8c13c769db6faa5aae559') THEN
    RAISE NOTICE 'Overgeslagen: 0007_rls stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('acc8bba55ee145b3b5ae41c3a5b074d194c9d015fab8c13c769db6faa5aae559', 1789197663063);
    RAISE NOTICE 'Toegepast: 0007_rls.';
  END IF;
END $jr_0007_rls$;

-- ---------------------------------------------------------------------------
-- 0008_crm_uitbreiding
-- ---------------------------------------------------------------------------

DO $jr_0008_crm_uitbreiding$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'fed6c34eb8d597e6be313bf41fa0d0ee7a7d3280aa582ae72ed3b079fbe3905e') THEN
    RAISE NOTICE 'Overgeslagen: 0008_crm_uitbreiding stond er al.';
  ELSE
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

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('fed6c34eb8d597e6be313bf41fa0d0ee7a7d3280aa582ae72ed3b079fbe3905e', 1789461828334);
    RAISE NOTICE 'Toegepast: 0008_crm_uitbreiding.';
  END IF;
END $jr_0008_crm_uitbreiding$;

-- ---------------------------------------------------------------------------
-- 0009_portfolio
-- ---------------------------------------------------------------------------

DO $jr_0009_portfolio$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '23a4912dd0f99e1d96c9d9b853f0d3d5cd5af53357e400405f3e729a3a101c0b') THEN
    RAISE NOTICE 'Overgeslagen: 0009_portfolio stond er al.';
  ELSE
    ALTER TABLE "users" ADD COLUMN "is_marketing_manager" boolean DEFAULT false NOT NULL;

    ALTER TABLE "users" ADD COLUMN "monthly_target_cents" integer;

    ALTER TABLE "users" ADD CONSTRAINT "user_target_positive" CHECK ("users"."monthly_target_cents" IS NULL OR "users"."monthly_target_cents" > 0);

    ALTER TABLE "users" ADD CONSTRAINT "user_target_needs_manager" CHECK ("users"."monthly_target_cents" IS NULL OR "users"."is_marketing_manager");

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('23a4912dd0f99e1d96c9d9b853f0d3d5cd5af53357e400405f3e729a3a101c0b', 1789463118797);
    RAISE NOTICE 'Toegepast: 0009_portfolio.';
  END IF;
END $jr_0009_portfolio$;

-- ---------------------------------------------------------------------------
-- 0010_medewerkerprofiel
-- ---------------------------------------------------------------------------

DO $jr_0010_medewerkerprofiel$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a443c3b5cb83e718b4aa317355a6d5422e51e74effea0c1255fa8982de6251e6') THEN
    RAISE NOTICE 'Overgeslagen: 0010_medewerkerprofiel stond er al.';
  ELSE
    ALTER TABLE "users" ADD COLUMN "job_title" text;

    ALTER TABLE "users" ADD COLUMN "department" text;

    ALTER TABLE "users" ADD COLUMN "phone" text;

    ALTER TABLE "users" ADD COLUMN "mobile" text;

    ALTER TABLE "users" ADD COLUMN "linkedin_url" text;

    ALTER TABLE "users" ADD COLUMN "birth_day" integer;

    ALTER TABLE "users" ADD COLUMN "birth_month" integer;

    ALTER TABLE "users" ADD COLUMN "birth_year" integer;

    ALTER TABLE "users" ADD COLUMN "started_on" timestamp with time zone;

    ALTER TABLE "users" ADD COLUMN "ended_on" timestamp with time zone;

    ALTER TABLE "users" ADD COLUMN "contract_hours_week_quarters" integer;

    ALTER TABLE "users" ADD COLUMN "hourly_cost_cents" integer;

    ALTER TABLE "users" ADD COLUMN "notes" text;

    CREATE INDEX "users_department_idx" ON "users" USING btree ("department");

    CREATE INDEX "users_birthday_idx" ON "users" USING btree ("birth_month","birth_day");

    ALTER TABLE "users" ADD CONSTRAINT "user_birthday_complete" CHECK (("users"."birth_day" IS NULL) = ("users"."birth_month" IS NULL));

    ALTER TABLE "users" ADD CONSTRAINT "user_birth_day_valid" CHECK ("users"."birth_day" IS NULL OR ("users"."birth_day" >= 1 AND "users"."birth_day" <= 31));

    ALTER TABLE "users" ADD CONSTRAINT "user_birth_month_valid" CHECK ("users"."birth_month" IS NULL OR ("users"."birth_month" >= 1 AND "users"."birth_month" <= 12));

    ALTER TABLE "users" ADD CONSTRAINT "user_contract_hours_valid" CHECK ("users"."contract_hours_week_quarters" IS NULL OR ("users"."contract_hours_week_quarters" > 0 AND "users"."contract_hours_week_quarters" <= 8000));

    ALTER TABLE "users" ADD CONSTRAINT "user_hourly_cost_not_negative" CHECK ("users"."hourly_cost_cents" IS NULL OR "users"."hourly_cost_cents" >= 0);

    ALTER TABLE "users" ADD CONSTRAINT "user_employment_order" CHECK ("users"."ended_on" IS NULL OR "users"."started_on" IS NULL OR "users"."ended_on" >= "users"."started_on");

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('a443c3b5cb83e718b4aa317355a6d5422e51e74effea0c1255fa8982de6251e6', 1789464029976);
    RAISE NOTICE 'Toegepast: 0010_medewerkerprofiel.';
  END IF;
END $jr_0010_medewerkerprofiel$;

-- ---------------------------------------------------------------------------
-- 0011_korting
-- ---------------------------------------------------------------------------

DO $jr_0011_korting$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'ee90ba2ce4c1b0818257c68fa27a78f39c8bc1ede564819d307f8eb8a3fc102c') THEN
    RAISE NOTICE 'Overgeslagen: 0011_korting stond er al.';
  ELSE
    ALTER TABLE "subscriptions" ADD COLUMN "discount_cents" integer DEFAULT 0 NOT NULL;

    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscription_discount_not_negative" CHECK ("subscriptions"."discount_cents" >= 0);

    ALTER TABLE "subscriptions" ADD CONSTRAINT "subscription_discount_below_amount" CHECK ("subscriptions"."discount_cents" < "subscriptions"."amount_excl_vat_cents");

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('ee90ba2ce4c1b0818257c68fa27a78f39c8bc1ede564819d307f8eb8a3fc102c', 1789466120404);
    RAISE NOTICE 'Toegepast: 0011_korting.';
  END IF;
END $jr_0011_korting$;

-- ---------------------------------------------------------------------------
-- 0012_personeelsdossier
-- ---------------------------------------------------------------------------

DO $jr_0012_personeelsdossier$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '3ab6c23df756b9b5dc05fe46fab1386f5767c67830981f7bad58ead2e4a24025') THEN
    RAISE NOTICE 'Overgeslagen: 0012_personeelsdossier stond er al.';
  ELSE
    CREATE TYPE "public"."asset_kind" AS ENUM('laptop', 'telefoon', 'auto', 'sleutel', 'toegangspas', 'overig');

    CREATE TYPE "public"."contract_type" AS ENUM('bepaalde_tijd', 'onbepaalde_tijd', 'oproep', 'stage', 'zzp');

    CREATE TYPE "public"."dossier_kind" AS ENUM('gesprek', 'afspraak', 'opleiding', 'waarschuwing', 'mijlpaal', 'overig');

    CREATE TABLE "company_assets" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"user_id" uuid NOT NULL,
    	"kind" "asset_kind" NOT NULL,
    	"label" text NOT NULL,
    	"serial" text,
    	"handed_out_on" timestamp with time zone NOT NULL,
    	"returned_on" timestamp with time zone,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "asset_label_not_empty" CHECK (length(trim("company_assets"."label")) > 0),
    	CONSTRAINT "asset_returned_after_handout" CHECK ("company_assets"."returned_on" IS NULL OR "company_assets"."returned_on" >= "company_assets"."handed_out_on")
    );


    CREATE TABLE "dossier_entries" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"user_id" uuid NOT NULL,
    	"kind" "dossier_kind" NOT NULL,
    	"subject" text NOT NULL,
    	"body" text,
    	"happened_on" timestamp with time zone NOT NULL,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "dossier_subject_not_empty" CHECK (length(trim("dossier_entries"."subject")) > 0)
    );


    CREATE TABLE "employment_contracts" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"user_id" uuid NOT NULL,
    	"type" "contract_type" NOT NULL,
    	"started_on" timestamp with time zone NOT NULL,
    	"ends_on" timestamp with time zone,
    	"hours_week_quarters" integer,
    	"job_title" text,
    	"signed_on" timestamp with time zone,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "contract_ends_after_start" CHECK ("employment_contracts"."ends_on" IS NULL OR "employment_contracts"."ends_on" >= "employment_contracts"."started_on"),
    	CONSTRAINT "contract_permanent_has_no_end" CHECK ("employment_contracts"."type" <> 'onbepaalde_tijd' OR "employment_contracts"."ends_on" IS NULL),
    	CONSTRAINT "contract_hours_valid" CHECK ("employment_contracts"."hours_week_quarters" IS NULL OR ("employment_contracts"."hours_week_quarters" > 0 AND "employment_contracts"."hours_week_quarters" <= 8000))
    );


    CREATE TABLE "salary_records" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"user_id" uuid NOT NULL,
    	"gross_monthly_cents" integer NOT NULL,
    	"based_on_hours_quarters" integer,
    	"holiday_allowance_percent" integer DEFAULT 8 NOT NULL,
    	"effective_from" timestamp with time zone NOT NULL,
    	"reason" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "salary_positive" CHECK ("salary_records"."gross_monthly_cents" > 0),
    	CONSTRAINT "salary_holiday_allowance_valid" CHECK ("salary_records"."holiday_allowance_percent" >= 0 AND "salary_records"."holiday_allowance_percent" <= 100),
    	CONSTRAINT "salary_hours_valid" CHECK ("salary_records"."based_on_hours_quarters" IS NULL OR ("salary_records"."based_on_hours_quarters" > 0 AND "salary_records"."based_on_hours_quarters" <= 8000))
    );


    ALTER TABLE "users" ADD COLUMN "address_line" text;

    ALTER TABLE "users" ADD COLUMN "postal_code" text;

    ALTER TABLE "users" ADD COLUMN "city" text;

    ALTER TABLE "users" ADD COLUMN "emergency_contact_name" text;

    ALTER TABLE "users" ADD COLUMN "emergency_contact_phone" text;

    ALTER TABLE "users" ADD COLUMN "emergency_contact_relation" text;

    ALTER TABLE "company_assets" ADD CONSTRAINT "company_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "dossier_entries" ADD CONSTRAINT "dossier_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "dossier_entries" ADD CONSTRAINT "dossier_entries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "employment_contracts" ADD CONSTRAINT "employment_contracts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "company_assets_user_idx" ON "company_assets" USING btree ("user_id");

    CREATE INDEX "dossier_entries_user_idx" ON "dossier_entries" USING btree ("user_id","happened_on");

    CREATE INDEX "employment_contracts_user_idx" ON "employment_contracts" USING btree ("user_id","started_on");

    CREATE UNIQUE INDEX "salary_records_user_date_idx" ON "salary_records" USING btree ("user_id","effective_from");

    -- Row Level Security op de nieuwe tabellen.
    --
    -- Supabase zet voor elke tabel een REST-API open die bereikbaar is met de
    -- publieke anon-key. Deze vier tabellen bevatten salarissen en
    -- personeelsdossiers; die mogen daar niet doorheen te lezen zijn. De app
    -- praat als eigenaar van de tabellen en gaat er langs, dus zij merkt er niets
    -- van.
    ALTER TABLE "employment_contracts" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "salary_records" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "dossier_entries" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "company_assets" ENABLE ROW LEVEL SECURITY;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('3ab6c23df756b9b5dc05fe46fab1386f5767c67830981f7bad58ead2e4a24025', 1789476443134);
    RAISE NOTICE 'Toegepast: 0012_personeelsdossier.';
  END IF;
END $jr_0012_personeelsdossier$;

-- ---------------------------------------------------------------------------
-- 0013_naamdelen
-- ---------------------------------------------------------------------------

DO $jr_0013_naamdelen$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '0e58dcde23d90ad4de45ecbe5ebb4a68672a404a297f95fd21763d999970a08f') THEN
    RAISE NOTICE 'Overgeslagen: 0013_naamdelen stond er al.';
  ELSE
    CREATE TYPE "public"."aanhef" AS ENUM('heer', 'mevrouw', 'neutraal');

    ALTER TABLE "contacts" ADD COLUMN "first_name" text;

    ALTER TABLE "contacts" ADD COLUMN "infix" text;

    ALTER TABLE "contacts" ADD COLUMN "last_name" text;

    ALTER TABLE "contacts" ADD COLUMN "aanhef" "aanhef";

    ALTER TABLE "users" ADD COLUMN "first_name" text;

    ALTER TABLE "users" ADD COLUMN "infix" text;

    ALTER TABLE "users" ADD COLUMN "last_name" text;

    ALTER TABLE "users" ADD COLUMN "aanhef" "aanhef";

    -- ---------------------------------------------------------------------------
    -- Bestaande namen uit elkaar trekken.
    --
    -- Dit is een gok die één keer over de bestaande gegevens heen gaat: het
    -- eerste woord is de voornaam, een bekend tussenvoegsel gaat apart, de rest
    -- is de achternaam. Bij een dubbele voornaam ("Jan Peter de Wit") klopt dat
    -- niet, en dat corrigeer je daarna in het scherm. Daarna wordt er niet meer
    -- geraden: de velden worden los ingevuld.
    --
    -- De volgorde in de lijst is van lang naar kort, zodat "van der Berg" als
    -- "van der" wordt herkend en niet als "van".
    -- ---------------------------------------------------------------------------

    UPDATE "contacts" SET
      first_name = split_part(regexp_replace(btrim(name), '\s+', ' ', 'g'), ' ', 1),
      infix = (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[1],
      last_name = COALESCE(
        (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[2],
        NULLIF(substring(regexp_replace(btrim(name), '\s+', ' ', 'g') from position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) + 1), '')
      )
    WHERE position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) > 0;


    -- Eén woord is een voornaam, geen achternaam.
    UPDATE "contacts" SET first_name = btrim(name)
    WHERE position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) = 0 AND btrim(name) <> '';


    UPDATE "users" SET
      first_name = split_part(regexp_replace(btrim(name), '\s+', ' ', 'g'), ' ', 1),
      infix = (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[1],
      last_name = COALESCE(
        (regexp_match(regexp_replace(btrim(name), '\s+', ' ', 'g'), '^\S+ (van der|van den|van de|van het|van ''t|in der|in den|in de|in het|in ''t|op der|op den|op de|aan der|aan den|aan de|uit de|uit den|van|de|den|der|des|het|''t|ten|ter|te|uit|op|aan|bij|onder|over|voor) (.+)$', 'i'))[2],
        NULLIF(substring(regexp_replace(btrim(name), '\s+', ' ', 'g') from position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) + 1), '')
      )
    WHERE name IS NOT NULL AND position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) > 0;


    UPDATE "users" SET first_name = btrim(name)
    WHERE name IS NOT NULL AND position(' ' in regexp_replace(btrim(name), '\s+', ' ', 'g')) = 0 AND btrim(name) <> '';

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('0e58dcde23d90ad4de45ecbe5ebb4a68672a404a297f95fd21763d999970a08f', 1789477355806);
    RAISE NOTICE 'Toegepast: 0013_naamdelen.';
  END IF;
END $jr_0013_naamdelen$;

-- ---------------------------------------------------------------------------
-- 0014_kosten_en_beeld
-- ---------------------------------------------------------------------------

DO $jr_0014_kosten_en_beeld$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'ba4e2a8305c4a2b937031a600bf3e8ad69596199cfcf0358aba586506adde976') THEN
    RAISE NOTICE 'Overgeslagen: 0014_kosten_en_beeld stond er al.';
  ELSE
    CREATE TYPE "public"."beloning_soort" AS ENUM('loondienst', 'management_fee');

    CREATE TABLE "images" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"content_type" text NOT NULL,
    	"bytes" integer NOT NULL,
    	"data" text NOT NULL,
    	"filename" text,
    	"uploaded_by_user_id" uuid,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "image_size_reasonable" CHECK ("images"."bytes" > 0 AND "images"."bytes" <= 1048576),
    	CONSTRAINT "image_type_allowed" CHECK ("images"."content_type" IN ('image/png', 'image/jpeg', 'image/webp'))
    );


    ALTER TABLE "contacts" ADD COLUMN "avatar_image_id" uuid;

    ALTER TABLE "organizations" ADD COLUMN "logo_image_id" uuid;

    ALTER TABLE "salary_records" ADD COLUMN "soort" "beloning_soort" DEFAULT 'loondienst' NOT NULL;

    ALTER TABLE "salary_records" ADD COLUMN "employer_cost_percent" integer DEFAULT 28 NOT NULL;

    ALTER TABLE "users" ADD COLUMN "avatar_image_id" uuid;

    ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "salary_records" ADD CONSTRAINT "salary_employer_cost_valid" CHECK ("salary_records"."employer_cost_percent" >= 0 AND "salary_records"."employer_cost_percent" <= 200);

    ALTER TABLE "salary_records" ADD CONSTRAINT "fee_has_no_employer_cost" CHECK ("salary_records"."soort" <> 'management_fee' OR ("salary_records"."employer_cost_percent" = 0 AND "salary_records"."holiday_allowance_percent" = 0));

    -- Row Level Security op de nieuwe tabel. Logo's en pasfoto's horen niet
    -- leesbaar te zijn via de publieke anon-key van Supabase.
    ALTER TABLE "images" ENABLE ROW LEVEL SECURITY;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('ba4e2a8305c4a2b937031a600bf3e8ad69596199cfcf0358aba586506adde976', 1789482695532);
    RAISE NOTICE 'Toegepast: 0014_kosten_en_beeld.';
  END IF;
END $jr_0014_kosten_en_beeld$;

-- ---------------------------------------------------------------------------
-- 0015_persoonsprofiel
-- ---------------------------------------------------------------------------

DO $jr_0015_persoonsprofiel$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'c46e788120a54db531345fcfd2596227d1131ab8e9af3e840ca3daf1e4dc7832') THEN
    RAISE NOTICE 'Overgeslagen: 0015_persoonsprofiel stond er al.';
  ELSE
    CREATE TYPE "public"."disc_type" AS ENUM('D', 'I', 'S', 'C');

    CREATE TYPE "public"."drink_preference" AS ENUM('koffie_zwart', 'koffie_suiker', 'koffie_melk', 'koffie_melk_suiker', 'cappuccino', 'latte_macchiato', 'thee', 'spa_rood', 'spa_blauw', 'anders');

    CREATE TYPE "public"."contact_channel" AS ENUM('mail', 'telefoon', 'whatsapp', 'app');

    CREATE TABLE "contact_children" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"contact_id" uuid NOT NULL,
    	"name" text NOT NULL,
    	"birth_day" integer,
    	"birth_month" integer,
    	"birth_year" integer,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "child_name_not_empty" CHECK (length(trim("contact_children"."name")) > 0),
    	CONSTRAINT "child_birthday_complete" CHECK (("contact_children"."birth_day" IS NULL) = ("contact_children"."birth_month" IS NULL)),
    	CONSTRAINT "child_birth_day_valid" CHECK ("contact_children"."birth_day" IS NULL OR ("contact_children"."birth_day" >= 1 AND "contact_children"."birth_day" <= 31)),
    	CONSTRAINT "child_birth_month_valid" CHECK ("contact_children"."birth_month" IS NULL OR ("contact_children"."birth_month" >= 1 AND "contact_children"."birth_month" <= 12))
    );


    ALTER TABLE "contacts" ADD COLUMN "preferred_channel" "contact_channel";

    ALTER TABLE "contacts" ADD COLUMN "disc_type" "disc_type";

    ALTER TABLE "contacts" ADD COLUMN "drink_preference" "drink_preference";

    ALTER TABLE "contacts" ADD COLUMN "partner_name" text;

    ALTER TABLE "contacts" ADD COLUMN "background" text;

    ALTER TABLE "contacts" ADD COLUMN "hobbies" text;

    ALTER TABLE "contact_children" ADD CONSTRAINT "contact_children_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "contact_children_contact_idx" ON "contact_children" USING btree ("contact_id");

    -- Gegevens van kinderen van klanten horen zeker niet leesbaar te zijn via de
    -- publieke anon-key van Supabase.
    ALTER TABLE "contact_children" ENABLE ROW LEVEL SECURITY;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('c46e788120a54db531345fcfd2596227d1131ab8e9af3e840ca3daf1e4dc7832', 1789483390887);
    RAISE NOTICE 'Toegepast: 0015_persoonsprofiel.';
  END IF;
END $jr_0015_persoonsprofiel$;

-- ---------------------------------------------------------------------------
-- 0016_bedrijfsprofiel
-- ---------------------------------------------------------------------------

DO $jr_0016_bedrijfsprofiel$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'f6e19f1ea5b682dd4a6524b3986bad3ea4947cdc5cef709b61b629d54b1b3a69') THEN
    RAISE NOTICE 'Overgeslagen: 0016_bedrijfsprofiel stond er al.';
  ELSE
    CREATE TYPE "public"."legal_form" AS ENUM('eenmanszaak', 'vof', 'maatschap', 'cv', 'bv', 'nv', 'stichting', 'vereniging', 'overheid', 'anders');

    CREATE TYPE "public"."relation_health" AS ENUM('uitstekend', 'goed', 'aandacht', 'zorgelijk');

    CREATE TABLE "competitors" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"organization_id" uuid NOT NULL,
    	"name" text NOT NULL,
    	"website" text,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "competitor_name_not_empty" CHECK (length(trim("competitors"."name")) > 0)
    );


    CREATE TABLE "organization_goals" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"organization_id" uuid NOT NULL,
    	"title" text NOT NULL,
    	"notes" text,
    	"target_on" timestamp with time zone,
    	"achieved_on" timestamp with time zone,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "goal_title_not_empty" CHECK (length(trim("organization_goals"."title")) > 0)
    );


    CREATE TABLE "organization_locations" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"organization_id" uuid NOT NULL,
    	"name" text NOT NULL,
    	"address_line" text,
    	"postal_code" text,
    	"city" text,
    	"phone" text,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "location_name_not_empty" CHECK (length(trim("organization_locations"."name")) > 0)
    );


    ALTER TABLE "organizations" ADD COLUMN "region" text;

    ALTER TABLE "organizations" ADD COLUMN "legal_form" "legal_form";

    ALTER TABLE "organizations" ADD COLUMN "founded_on" timestamp with time zone;

    ALTER TABLE "organizations" ADD COLUMN "relation_health" "relation_health";

    ALTER TABLE "organizations" ADD COLUMN "core_activity" text;

    ALTER TABLE "organizations" ADD COLUMN "employee_count" integer;

    ALTER TABLE "organizations" ADD COLUMN "annual_revenue_cents" bigint;

    ALTER TABLE "organizations" ADD COLUMN "linkedin_url" text;

    ALTER TABLE "organizations" ADD COLUMN "facebook_url" text;

    ALTER TABLE "organizations" ADD COLUMN "instagram_url" text;

    ALTER TABLE "organizations" ADD COLUMN "youtube_url" text;

    ALTER TABLE "organizations" ADD COLUMN "tiktok_url" text;

    ALTER TABLE "organizations" ADD COLUMN "previous_agencies" text;

    ALTER TABLE "organizations" ADD COLUMN "alert_on" text;

    ALTER TABLE "competitors" ADD CONSTRAINT "competitors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "competitors" ADD CONSTRAINT "competitors_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "organization_goals" ADD CONSTRAINT "organization_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "organization_goals" ADD CONSTRAINT "organization_goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "competitors_org_idx" ON "competitors" USING btree ("organization_id");

    CREATE INDEX "competitors_name_idx" ON "competitors" USING btree ("name");

    CREATE INDEX "organization_goals_org_idx" ON "organization_goals" USING btree ("organization_id");

    CREATE INDEX "organization_locations_org_idx" ON "organization_locations" USING btree ("organization_id");

    CREATE INDEX "organizations_region_idx" ON "organizations" USING btree ("region");

    CREATE INDEX "organizations_health_idx" ON "organizations" USING btree ("relation_health");

    ALTER TABLE "organizations" ADD CONSTRAINT "organization_employee_count_valid" CHECK ("organizations"."employee_count" IS NULL OR "organizations"."employee_count" >= 0);

    ALTER TABLE "organizations" ADD CONSTRAINT "organization_revenue_not_negative" CHECK ("organizations"."annual_revenue_cents" IS NULL OR "organizations"."annual_revenue_cents" >= 0);

    -- Row Level Security op de nieuwe tabellen: ook vestigingen, concurrenten en
    -- doelen horen niet leesbaar te zijn via de publieke anon-key van Supabase.
    ALTER TABLE "organization_locations" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "competitors" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "organization_goals" ENABLE ROW LEVEL SECURITY;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('f6e19f1ea5b682dd4a6524b3986bad3ea4947cdc5cef709b61b629d54b1b3a69', 1789485847413);
    RAISE NOTICE 'Toegepast: 0016_bedrijfsprofiel.';
  END IF;
END $jr_0016_bedrijfsprofiel$;

-- ---------------------------------------------------------------------------
-- 0017_moneybird_velden
-- ---------------------------------------------------------------------------

DO $jr_0017_moneybird_velden$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '72ea90495515204d18a04ab6c33f13681ed97a0c9dfcc5cb4a9ba0a73a1444aa') THEN
    RAISE NOTICE 'Overgeslagen: 0017_moneybird_velden stond er al.';
  ELSE
    CREATE TYPE "public"."klant_type" AS ENUM('bedrijf', 'particulier');

    CREATE TYPE "public"."verzendmethode" AS ENUM('email', 'peppol', 'zelf');

    ALTER TABLE "organizations" ADD COLUMN "customer_number" text;

    ALTER TABLE "organizations" ADD COLUMN "klant_type" "klant_type";

    ALTER TABLE "organizations" ADD COLUMN "moneybird_contact_id" text;

    ALTER TABLE "organizations" ADD COLUMN "verzendmethode" "verzendmethode";

    ALTER TABLE "organizations" ADD COLUMN "project_number" text;

    ALTER TABLE "organizations" ADD COLUMN "invoice_attn" text;

    CREATE UNIQUE INDEX "organizations_customer_number_idx" ON "organizations" USING btree ("customer_number");

    CREATE UNIQUE INDEX "organizations_moneybird_idx" ON "organizations" USING btree ("moneybird_contact_id");

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('72ea90495515204d18a04ab6c33f13681ed97a0c9dfcc5cb4a9ba0a73a1444aa', 1789486238916);
    RAISE NOTICE 'Toegepast: 0017_moneybird_velden.';
  END IF;
END $jr_0017_moneybird_velden$;

-- ---------------------------------------------------------------------------
-- 0018_wachtwoord_inloggen
-- ---------------------------------------------------------------------------

DO $jr_0018_wachtwoord_inloggen$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'd542be11e85bfce9d961a70d07fae2d85981058f315adfa6697f0925cdf5db36') THEN
    RAISE NOTICE 'Overgeslagen: 0018_wachtwoord_inloggen stond er al.';
  ELSE
    -- pgcrypto levert crypt() en gen_salt(): bcrypt in de database.
    --
    -- Waarom in de database en niet in de app: het scheelt een extra pakket, en
    -- het betekent dat een wachtwoord met één regel SQL te zetten is. Dat is
    -- precies wat je nodig hebt als niemand kan inloggen omdat de mail het niet
    -- doet — en dat is de reden dat dit er komt.
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE "login_attempts" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"email" text NOT NULL,
    	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"ip" text
    );


    ALTER TABLE "users" ADD COLUMN "password_hash" text;

    CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","attempted_at");

    -- Mislukte inlogpogingen zijn niet leesbaar via de publieke anon-key.
    ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;


    -- Controleren dat crypt() ook echt bereikbaar is.
    --
    -- Op sommige installaties (Supabase onder andere) staat pgcrypto in een apart
    -- schema. Staat dat niet in het zoekpad, dan bestaat de extensie wel maar
    -- werkt crypt() niet — en dan zou niemand meer kunnen inloggen terwijl de
    -- migratie geslaagd lijkt. Liever hier hard stuklopen: de bouw stopt dan en
    -- de vorige versie blijft draaien.
    DO $pgcrypto_check$
    BEGIN
      PERFORM crypt('proef', gen_salt('bf', 4));
    EXCEPTION
      WHEN undefined_function THEN
        RAISE EXCEPTION 'pgcrypto is geinstalleerd maar crypt() is niet bereikbaar. Zet het schema van de extensie in het zoekpad, bijvoorbeeld: ALTER DATABASE postgres SET search_path TO public, extensions;';
    END
    $pgcrypto_check$;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('d542be11e85bfce9d961a70d07fae2d85981058f315adfa6697f0925cdf5db36', 1789506364012);
    RAISE NOTICE 'Toegepast: 0018_wachtwoord_inloggen.';
  END IF;
END $jr_0018_wachtwoord_inloggen$;

-- ---------------------------------------------------------------------------
-- 0019_partnercontacten
-- ---------------------------------------------------------------------------

DO $jr_0019_partnercontacten$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '1ad9cfabaf511cfdecceb02427839fc43bcace2f09a3978c36ca9444799bffef') THEN
    RAISE NOTICE 'Overgeslagen: 0019_partnercontacten stond er al.';
  ELSE
    -- Contactpersonen bij partners.
    --
    -- Tot nu toe had een partner een veld `contact_name`: een naam, meer niet.
    -- Geen mailadres, geen verjaardag, geen tweede persoon. Dat werkt zolang je
    -- vier partners hebt en elke drukker maar een contactpersoon.
    --
    -- Vanaf nu hangt een contactpersoon aan een klant OF aan een partner. Het is
    -- dezelfde soort mens met dezelfde soort gegevens, dus dezelfde tabel. Een
    -- aparte partnercontacten-tabel zou twee formulieren, twee zoekfuncties en
    -- een verjaardagsoverzicht opleveren dat de helft mist.
    --
    -- De check zorgt dat er precies een van de twee gevuld is. Zonder die check
    -- kan er een persoon ontstaan die nergens bij hoort, en die vind je nooit
    -- meer terug: elk overzicht komt via een klant of via een partner binnen.

    ALTER TABLE "contacts" ALTER COLUMN "organization_id" DROP NOT NULL;

    ALTER TABLE "contacts" ADD COLUMN "partner_id" uuid;

    ALTER TABLE "contacts" ADD CONSTRAINT "contacts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "contacts_partner_idx" ON "contacts" USING btree ("partner_id");

    CREATE UNIQUE INDEX "contacts_one_primary_partner_idx" ON "contacts" USING btree ("partner_id") WHERE "contacts"."is_primary";

    ALTER TABLE "contacts" ADD CONSTRAINT "contact_hoort_bij_een" CHECK (("contacts"."organization_id" IS NULL) != ("contacts"."partner_id" IS NULL));

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('1ad9cfabaf511cfdecceb02427839fc43bcace2f09a3978c36ca9444799bffef', 1789543744927);
    RAISE NOTICE 'Toegepast: 0019_partnercontacten.';
  END IF;
END $jr_0019_partnercontacten$;

-- ---------------------------------------------------------------------------
-- 0020_salespijplijn
-- ---------------------------------------------------------------------------

DO $jr_0020_salespijplijn$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '23d46d7f2845bee09d420031993cd07dd47aff06d6fd209a9c70ef09257340ac') THEN
    RAISE NOTICE 'Overgeslagen: 0020_salespijplijn stond er al.';
  ELSE
    -- De salespijplijn: fases en deals.
    --
    -- Een deal hangt altijd aan een bedrijf. Er komt geen aparte leads-tabel
    -- naast de bedrijven die we al hebben, want een bedrijf heeft al een status
    -- (lead, prospect, klant, oud-klant). Twee lijsten met half-klanten naast
    -- elkaar betekent twee plekken waar dezelfde naam staat, en dan weet binnen
    -- een maand niemand meer welke van de twee klopt.
    --
    -- De fases staan in een tabel en niet in een enum, zodat je ze kunt
    -- hernoemen zonder migratie. Onderaan worden vijf fases neergezet als
    -- startpunt; wijzigen mag, en wat er al staat blijft staan.

    CREATE TYPE "public"."deal_kind" AS ENUM('retainer', 'project');

    CREATE TYPE "public"."deal_status" AS ENUM('open', 'won', 'lost');

    CREATE TABLE "deals" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"organization_id" uuid NOT NULL,
    	"contact_id" uuid,
    	"stage_id" uuid NOT NULL,
    	"title" text NOT NULL,
    	"kind" "deal_kind" DEFAULT 'retainer' NOT NULL,
    	"value_cents" integer,
    	"expected_close_on" timestamp with time zone,
    	"owner_user_id" uuid,
    	"source" "lead_source",
    	"next_action" text,
    	"next_action_on" timestamp with time zone,
    	"status" "deal_status" DEFAULT 'open' NOT NULL,
    	"lost_reason" text,
    	"closed_at" timestamp with time zone,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "deal_title_not_empty" CHECK (length(trim("deals"."title")) > 0),
    	CONSTRAINT "deal_value_not_negative" CHECK ("deals"."value_cents" IS NULL OR "deals"."value_cents" >= 0),
    	CONSTRAINT "deal_closed_matches_status" CHECK (("deals"."status" = 'open') = ("deals"."closed_at" IS NULL)),
    	CONSTRAINT "deal_lost_has_reason" CHECK ("deals"."status" <> 'lost' OR length(trim(COALESCE("deals"."lost_reason", ''))) > 0),
    	CONSTRAINT "deal_reason_only_when_lost" CHECK ("deals"."status" = 'lost' OR "deals"."lost_reason" IS NULL),
    	CONSTRAINT "deal_next_action_complete" CHECK ((length(trim(COALESCE("deals"."next_action", ''))) > 0) = ("deals"."next_action_on" IS NOT NULL))
    );


    CREATE TABLE "pipeline_stages" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"name" text NOT NULL,
    	"sort_order" integer DEFAULT 0 NOT NULL,
    	"probability_percent" integer DEFAULT 50 NOT NULL,
    	"description" text,
    	"active" boolean DEFAULT true NOT NULL,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "stage_name_not_empty" CHECK (length(trim("pipeline_stages"."name")) > 0),
    	CONSTRAINT "stage_probability_valid" CHECK ("pipeline_stages"."probability_percent" >= 0 AND "pipeline_stages"."probability_percent" <= 100)
    );


    ALTER TABLE "activities" ADD COLUMN "deal_id" uuid;

    ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;

    ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "deals_org_idx" ON "deals" USING btree ("organization_id");

    CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage_id");

    CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("owner_user_id");

    CREATE INDEX "deals_status_idx" ON "deals" USING btree ("status");

    CREATE INDEX "deals_next_action_idx" ON "deals" USING btree ("next_action_on");

    CREATE INDEX "pipeline_stages_order_idx" ON "pipeline_stages" USING btree ("sort_order");

    CREATE UNIQUE INDEX "pipeline_stages_name_idx" ON "pipeline_stages" USING btree ("name");

    ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "activities_deal_idx" ON "activities" USING btree ("deal_id");


    -- Row Level Security, net als op alle andere tabellen. Zie 0007_rls: de
    -- publieke REST-API van Supabase staat anders open voor iedereen met de
    -- anon-key, en een pijplijn met bedragen en klantnamen wil je daar niet in
    -- hebben. Er komen met opzet geen policies bij; zonder policy mag een rol
    -- die niet de eigenaar is helemaal niets.
    ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;


    -- Vijf fases om mee te beginnen. Alleen als de tabel nog leeg is: draait dit
    -- bestand een tweede keer, of heeft iemand de namen al aangepast, dan blijft
    -- staan wat er staat.
    INSERT INTO "pipeline_stages" ("name", "sort_order", "probability_percent", "description")
    SELECT * FROM (VALUES
      ('Nieuw', 1, 10, 'Er is contact geweest, meer weten we nog niet.'),
      ('Contact opgenomen', 2, 20, 'Gebeld of gemaild, gesprek staat nog niet.'),
      ('Gekwalificeerd', 3, 40, 'We weten wat ze zoeken en het past bij ons.'),
      ('Voorstel verstuurd', 4, 65, 'De offerte ligt bij de klant.'),
      ('Onderhandeling', 5, 85, 'Over de inhoud of de prijs wordt nog gesproken.')
    ) AS nieuw(name, sort_order, probability_percent, description)
    WHERE NOT EXISTS (SELECT 1 FROM "pipeline_stages");

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('23d46d7f2845bee09d420031993cd07dd47aff06d6fd209a9c70ef09257340ac', 1789545656715);
    RAISE NOTICE 'Toegepast: 0020_salespijplijn.';
  END IF;
END $jr_0020_salespijplijn$;

-- ---------------------------------------------------------------------------
-- 0021_salarishuis
-- ---------------------------------------------------------------------------

DO $jr_0021_salarishuis$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'f854d921caf18e266b26af81109de62f2259ce3968f8fbf42bda18ccb7b90849') THEN
    RAISE NOTICE 'Overgeslagen: 0021_salarishuis stond er al.';
  ELSE
    -- Het salarishuis: schalen, tredes en de bedragen die daaruit volgen.
    --
    -- Twee tabellen in plaats van een tabel met alle 65 bedragen erin. Reden:
    -- het huis is een formule en geen lijst. Zet je de uitkomsten neer, dan
    -- moet je bij elke indexering vijfenzestig regels bijwerken en is er geen
    -- manier om te zien of ze onderling nog kloppen.
    --
    -- Elke indexering is een NIEUW huis met een eigen ingangsdatum. Het oude
    -- blijft staan, want anders verandert met terugwerkende kracht wat er vorig
    -- jaar is afgesproken.
    --
    -- De opslag per schaal is ten opzichte van de VORIGE schaal. Senior staat op
    -- 125%, en dat is 125% van Medior, niet van de grondslag. Zie het commentaar
    -- bij salary_scales in het schema; dit is de val van dit hele onderdeel.

    CREATE TABLE "salary_houses" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"effective_from" timestamp with time zone NOT NULL,
    	"base_cents" integer NOT NULL,
    	"step_increase_bp" integer NOT NULL,
    	"pension_allowance_bp" integer DEFAULT 1000 NOT NULL,
    	"holiday_allowance_bp" integer DEFAULT 800 NOT NULL,
    	"fulltime_hours_week_quarters" integer DEFAULT 4000 NOT NULL,
    	"holiday_hours_fulltime" integer DEFAULT 200 NOT NULL,
    	"minimum_hourly_cents" integer,
    	"note" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "salary_house_base_positive" CHECK ("salary_houses"."base_cents" > 0),
    	CONSTRAINT "salary_house_step_valid" CHECK ("salary_houses"."step_increase_bp" >= 0 AND "salary_houses"."step_increase_bp" <= 10000),
    	CONSTRAINT "salary_house_pension_valid" CHECK ("salary_houses"."pension_allowance_bp" >= 0 AND "salary_houses"."pension_allowance_bp" <= 10000),
    	CONSTRAINT "salary_house_holiday_valid" CHECK ("salary_houses"."holiday_allowance_bp" >= 0 AND "salary_houses"."holiday_allowance_bp" <= 10000),
    	CONSTRAINT "salary_house_fulltime_valid" CHECK ("salary_houses"."fulltime_hours_week_quarters" > 0 AND "salary_houses"."fulltime_hours_week_quarters" <= 8000),
    	CONSTRAINT "salary_house_holiday_hours_valid" CHECK ("salary_houses"."holiday_hours_fulltime" >= 0 AND "salary_houses"."holiday_hours_fulltime" <= 2000),
    	CONSTRAINT "salary_house_minimum_valid" CHECK ("salary_houses"."minimum_hourly_cents" IS NULL OR "salary_houses"."minimum_hourly_cents" > 0)
    );


    CREATE TABLE "salary_scales" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"house_id" uuid NOT NULL,
    	"name" text NOT NULL,
    	"sort_order" integer NOT NULL,
    	"multiplier_bp" integer NOT NULL,
    	"steps" integer NOT NULL,
    	CONSTRAINT "salary_scale_name_not_empty" CHECK (length(trim("salary_scales"."name")) > 0),
    	CONSTRAINT "salary_scale_order_positive" CHECK ("salary_scales"."sort_order" > 0),
    	CONSTRAINT "salary_scale_multiplier_valid" CHECK ("salary_scales"."multiplier_bp" > 0 AND "salary_scales"."multiplier_bp" <= 100000),
    	CONSTRAINT "salary_scale_steps_valid" CHECK ("salary_scales"."steps" > 0 AND "salary_scales"."steps" <= 100)
    );


    ALTER TABLE "salary_houses" ADD CONSTRAINT "salary_houses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "salary_scales" ADD CONSTRAINT "salary_scales_house_id_salary_houses_id_fk" FOREIGN KEY ("house_id") REFERENCES "public"."salary_houses"("id") ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX "salary_houses_date_idx" ON "salary_houses" USING btree ("effective_from");

    CREATE UNIQUE INDEX "salary_scales_order_idx" ON "salary_scales" USING btree ("house_id","sort_order");

    CREATE UNIQUE INDEX "salary_scales_name_idx" ON "salary_scales" USING btree ("house_id","name");


    -- Row Level Security, net als op alle andere tabellen. Zie 0007_rls: de
    -- publieke REST-API van Supabase staat anders open voor iedereen met de
    -- anon-key, en salarisschalen horen daar niet in. Geen policies: zonder
    -- policy mag een rol die niet de eigenaar is helemaal niets.
    ALTER TABLE "salary_houses" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "salary_scales" ENABLE ROW LEVEL SECURITY;


    -- Het huis van 2026 zoals het nu in de sheet staat. Alleen als er nog geen
    -- huis is: draait dit bestand een tweede keer, of is er al iets aangepast,
    -- dan blijft staan wat er staat.
    --
    -- De grondslag is 2.578,00 fulltime bij 40 uur. Daarmee komt de hele tabel
    -- van 65 tredes op de euro uit; zie de test bij src/lib/salarishuis.ts.
    --
    -- Het minimumuurloon staat er bewust bij en bewust als los getal: het gaat
    -- elk halfjaar omhoog, sneller dan de grondslag. Junior trede 1 komt uit op
    -- ongeveer 14,87 per uur en zit daar dus vlak boven.
    INSERT INTO "salary_houses" (
      "effective_from", "base_cents", "step_increase_bp", "pension_allowance_bp",
      "holiday_allowance_bp", "fulltime_hours_week_quarters", "holiday_hours_fulltime",
      "minimum_hourly_cents", "note"
    )
    SELECT '2026-01-01T00:00:00Z'::timestamptz, 257800, 150, 1000, 800, 4000, 200, 1471,
           'Salarishuis 2026. Minimumuurloon controleren bij elke halfjaarlijkse wijziging.'
    WHERE NOT EXISTS (SELECT 1 FROM "salary_houses");


    INSERT INTO "salary_scales" ("house_id", "name", "sort_order", "multiplier_bp", "steps")
    SELECT h.id, s.name, s.sort_order, s.multiplier_bp, s.steps
    FROM "salary_houses" h
    CROSS JOIN (VALUES
      ('Junior', 1, 10000, 15),
      ('Medior', 2, 11500, 20),
      ('Senior', 3, 12500, 30)
    ) AS s(name, sort_order, multiplier_bp, steps)
    WHERE h."effective_from" = '2026-01-01T00:00:00Z'::timestamptz
      AND NOT EXISTS (SELECT 1 FROM "salary_scales" x WHERE x."house_id" = h.id);

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('f854d921caf18e266b26af81109de62f2259ce3968f8fbf42bda18ccb7b90849', 1789742093952);
    RAISE NOTICE 'Toegepast: 0021_salarishuis.';
  END IF;
END $jr_0021_salarishuis$;

-- ---------------------------------------------------------------------------
-- 0022_werving
-- ---------------------------------------------------------------------------

DO $jr_0022_werving$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '92bd123367c560bad90fbeafde4bbcd33cd830524886741bb75159cff74cf6d0') THEN
    RAISE NOTICE 'Overgeslagen: 0022_werving stond er al.';
  ELSE
    -- Werving: vacatures en kandidaten.
    --
    -- Het mechanisme is hetzelfde als bij de salespijplijn - niet het bord met
    -- fases maar de volgende actie - met een verschil dat zwaarder weegt. Een
    -- deal die blijft liggen kost geld; een kandidaat die blijft liggen zit drie
    -- weken op antwoord te wachten en vertelt dat door.
    --
    -- Twee dingen die de database afdwingt in plaats van dat ze afhangen van
    -- discipline:
    --
    --   1. Een afgesloten kandidaat heeft een einddatum EN een bewaartermijn.
    --      Zonder die regel loopt de termijn nooit af voor wie vergeten is af te
    --      sluiten, en dan bewaar je sollicitatiegegevens tot in de eeuwigheid.
    --
    --   2. Een volgende actie heeft altijd een datum, en andersom. Een voornemen
    --      zonder datum is geen afspraak.
    --
    -- Er staat met opzet geen geboortedatum, leeftijd, foto of nationaliteit bij
    -- een kandidaat.

    CREATE TYPE "public"."candidate_source" AS ENUM('website', 'linkedin', 'indeed', 'school', 'doorverwijzing', 'zelf_benaderd', 'open_sollicitatie', 'anders');

    CREATE TYPE "public"."candidate_status" AS ENUM('nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod', 'aangenomen', 'afgewezen', 'afgehaakt');

    CREATE TYPE "public"."vacancy_kind" AS ENUM('dienstverband', 'stage', 'freelance');

    CREATE TYPE "public"."vacancy_status" AS ENUM('concept', 'open', 'gepauzeerd', 'vervuld', 'ingetrokken');

    CREATE TABLE "candidates" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"vacancy_id" uuid,
    	"name" text NOT NULL,
    	"first_name" text,
    	"infix" text,
    	"last_name" text,
    	"email" text,
    	"phone" text,
    	"linkedin_url" text,
    	"source" "candidate_source" DEFAULT 'website' NOT NULL,
    	"referred_by_user_id" uuid,
    	"school" text,
    	"study" text,
    	"status" "candidate_status" DEFAULT 'nieuw' NOT NULL,
    	"applied_on" timestamp with time zone DEFAULT now() NOT NULL,
    	"responded_on" timestamp with time zone,
    	"next_action" text,
    	"next_action_on" timestamp with time zone,
    	"notes" text,
    	"closed_on" timestamp with time zone,
    	"closed_reason" text,
    	"hired_user_id" uuid,
    	"retention_until" timestamp with time zone,
    	"retention_consent_on" timestamp with time zone,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "candidate_name_not_empty" CHECK (length(trim("candidates"."name")) > 0),
    	CONSTRAINT "candidate_next_action_complete" CHECK ((length(trim(COALESCE("candidates"."next_action", ''))) > 0) = ("candidates"."next_action_on" IS NOT NULL)),
    	CONSTRAINT "candidate_closed_matches_status" CHECK (("candidates"."status" IN ('aangenomen', 'afgewezen', 'afgehaakt')) = ("candidates"."closed_on" IS NOT NULL)),
    	CONSTRAINT "candidate_retention_matches_closed" CHECK (("candidates"."closed_on" IS NULL) = ("candidates"."retention_until" IS NULL)),
    	CONSTRAINT "candidate_retention_after_closed" CHECK ("candidates"."retention_until" IS NULL OR "candidates"."retention_until" >= "candidates"."closed_on"),
    	CONSTRAINT "candidate_hired_only_when_hired" CHECK ("candidates"."hired_user_id" IS NULL OR "candidates"."status" = 'aangenomen'),
    	CONSTRAINT "candidate_responded_after_applied" CHECK ("candidates"."responded_on" IS NULL OR "candidates"."responded_on" >= "candidates"."applied_on")
    );


    CREATE TABLE "vacancies" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"title" text NOT NULL,
    	"kind" "vacancy_kind" DEFAULT 'dienstverband' NOT NULL,
    	"status" "vacancy_status" DEFAULT 'concept' NOT NULL,
    	"positions" integer DEFAULT 1 NOT NULL,
    	"owner_user_id" uuid,
    	"salary_scale_name" text,
    	"salary_step_min" integer,
    	"salary_step_max" integer,
    	"hours_week_quarters" integer,
    	"reason" text,
    	"description" text,
    	"opened_on" timestamp with time zone,
    	"closed_on" timestamp with time zone,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "vacancy_title_not_empty" CHECK (length(trim("vacancies"."title")) > 0),
    	CONSTRAINT "vacancy_positions_valid" CHECK ("vacancies"."positions" > 0 AND "vacancies"."positions" <= 100),
    	CONSTRAINT "vacancy_hours_valid" CHECK ("vacancies"."hours_week_quarters" IS NULL OR ("vacancies"."hours_week_quarters" > 0 AND "vacancies"."hours_week_quarters" <= 8000)),
    	CONSTRAINT "vacancy_steps_ordered" CHECK ("vacancies"."salary_step_min" IS NULL OR "vacancies"."salary_step_max" IS NULL OR "vacancies"."salary_step_max" >= "vacancies"."salary_step_min"),
    	CONSTRAINT "vacancy_steps_positive" CHECK (("vacancies"."salary_step_min" IS NULL OR "vacancies"."salary_step_min" > 0) AND ("vacancies"."salary_step_max" IS NULL OR "vacancies"."salary_step_max" > 0)),
    	CONSTRAINT "vacancy_closed_after_opened" CHECK ("vacancies"."closed_on" IS NULL OR "vacancies"."opened_on" IS NULL OR "vacancies"."closed_on" >= "vacancies"."opened_on")
    );


    ALTER TABLE "candidates" ADD CONSTRAINT "candidates_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "candidates" ADD CONSTRAINT "candidates_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "candidates" ADD CONSTRAINT "candidates_hired_user_id_users_id_fk" FOREIGN KEY ("hired_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "candidates_vacancy_idx" ON "candidates" USING btree ("vacancy_id","status");

    CREATE INDEX "candidates_status_idx" ON "candidates" USING btree ("status");

    CREATE INDEX "candidates_retention_idx" ON "candidates" USING btree ("retention_until");

    CREATE INDEX "vacancies_status_idx" ON "vacancies" USING btree ("status");

    CREATE INDEX "vacancies_owner_idx" ON "vacancies" USING btree ("owner_user_id");


    -- Row Level Security, net als op alle andere tabellen. Zie 0007_rls: zonder
    -- dit staat de publieke REST-API van Supabase open voor iedereen met de
    -- anon-key, en sollicitatiegegevens horen daar al helemaal niet in. Geen
    -- policies: zonder policy mag een rol die niet de eigenaar is helemaal niets.
    ALTER TABLE "vacancies" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "candidates" ENABLE ROW LEVEL SECURITY;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('92bd123367c560bad90fbeafde4bbcd33cd830524886741bb75159cff74cf6d0', 1789920106582);
    RAISE NOTICE 'Toegepast: 0022_werving.';
  END IF;
END $jr_0022_werving$;

-- ---------------------------------------------------------------------------
-- 0023_sollicitaties
-- ---------------------------------------------------------------------------

DO $jr_0023_sollicitaties$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '87e5a375ac4ea5e4a9a5215788128438c25e4e7548de59d07571074aa7681800') THEN
    RAISE NOTICE 'Overgeslagen: 0023_sollicitaties stond er al.';
  ELSE
    -- Sollicitaties die via de website binnenkomen, met het cv erbij.
    --
    -- De bestanden staan in een eigen tabel met ON DELETE CASCADE op de
    -- kandidaat. Dat is hier geen detail maar de kern: loopt de bewaartermijn af
    -- en wordt de kandidaat gewist, dan gaat het cv vanzelf mee. Stond het
    -- bestand ergens anders, dan was er een tweede opruiming nodig die iemand
    -- vergeet - en dan bewaar je een cv van iemand die je allang uit je systeem
    -- had moeten hebben.

    CREATE TYPE "public"."candidate_document_kind" AS ENUM('cv', 'motivatie', 'overig');

    CREATE TABLE "candidate_documents" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"candidate_id" uuid NOT NULL,
    	"kind" "candidate_document_kind" DEFAULT 'cv' NOT NULL,
    	"content_type" text NOT NULL,
    	"bytes" integer NOT NULL,
    	"data" text NOT NULL,
    	"filename" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "candidate_document_size_reasonable" CHECK ("candidate_documents"."bytes" > 0 AND "candidate_documents"."bytes" <= 5242880),
    	CONSTRAINT "candidate_document_type_allowed" CHECK ("candidate_documents"."content_type" IN (
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ))
    );


    ALTER TABLE "candidates" ADD COLUMN "cv_source_url" text;

    ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "candidate_documents_candidate_idx" ON "candidate_documents" USING btree ("candidate_id");


    -- Row Level Security, net als op alle andere tabellen. Zie 0007_rls. Zeker
    -- hier: dit zijn cv's van mensen die bij ons solliciteerden.
    ALTER TABLE "candidate_documents" ENABLE ROW LEVEL SECURITY;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('87e5a375ac4ea5e4a9a5215788128438c25e4e7548de59d07571074aa7681800', 1789926158525);
    RAISE NOTICE 'Toegepast: 0023_sollicitaties.';
  END IF;
END $jr_0023_sollicitaties$;

-- ---------------------------------------------------------------------------
-- 0024_contracten
-- ---------------------------------------------------------------------------

DO $jr_0024_contracten$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '83a2ef67fab3e131e8613fdbd4800982bd0ddffcb572b4a3ecef75ba5d7dde50') THEN
    RAISE NOTICE 'Overgeslagen: 0024_contracten stond er al.';
  ELSE
    -- De contractgenerator: sjablonen, functieprofielen en uitgeschreven contracten.
    --
    -- Een contract komt uit drie dingen: een sjabloon met artikelen, een
    -- functieprofiel met wat per functie verschilt, en de gegevens van deze ene
    -- persoon. Het resultaat wordt voluit bewaard - een oud contract verandert
    -- niet omdat iemand later een zin in het sjabloon heeft bijgewerkt.
    --
    -- De artikelen staan als losse rijen en niet als een lap tekst. Zo kan een
    -- artikel vervallen als de voorwaarde niet geldt, zonder dat iemand de
    -- nummering met de hand moet bijwerken.

    CREATE TYPE "public"."artikel_voorwaarde" AS ENUM('altijd', 'bepaalde_tijd', 'onbepaalde_tijd', 'proeftijd', 'relatiebeding', 'op_toeslag', 'pensioenregeling', 'vrijetijdsbudget', 'extra_afspraken');

    CREATE TYPE "public"."contract_soort" AS ENUM('proforma', 'definitief');

    CREATE TABLE "contract_template_articles" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"template_id" uuid NOT NULL,
    	"sort_order" integer NOT NULL,
    	"title" text NOT NULL,
    	"body" text NOT NULL,
    	"voorwaarde" "artikel_voorwaarde" DEFAULT 'altijd' NOT NULL,
    	CONSTRAINT "contract_article_title_not_empty" CHECK (length(trim("contract_template_articles"."title")) > 0),
    	CONSTRAINT "contract_article_body_not_empty" CHECK (length(trim("contract_template_articles"."body")) > 0)
    );


    CREATE TABLE "contract_templates" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"name" text NOT NULL,
    	"kind" "contract_type" NOT NULL,
    	"effective_from" timestamp with time zone NOT NULL,
    	"active" boolean DEFAULT true NOT NULL,
    	"intro" text,
    	"notes" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "contract_template_name_not_empty" CHECK (length(trim("contract_templates"."name")) > 0)
    );


    CREATE TABLE "employer_settings" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"legal_name" text NOT NULL,
    	"registered_address" text NOT NULL,
    	"registered_postal_code" text NOT NULL,
    	"registered_city" text NOT NULL,
    	"work_address" text NOT NULL,
    	"work_postal_code" text NOT NULL,
    	"work_city" text NOT NULL,
    	"signatories" text NOT NULL,
    	"kvk_number" text,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "employer_name_not_empty" CHECK (length(trim("employer_settings"."legal_name")) > 0),
    	CONSTRAINT "employer_signatories_not_empty" CHECK (length(trim("employer_settings"."signatories")) > 0)
    );


    CREATE TABLE "generated_contracts" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"soort" "contract_soort" DEFAULT 'proforma' NOT NULL,
    	"template_id" uuid,
    	"job_profile_id" uuid,
    	"candidate_id" uuid,
    	"user_id" uuid,
    	"employee_name" text NOT NULL,
    	"employee_aanhef" "aanhef",
    	"employee_address" text,
    	"employee_postal_code" text,
    	"employee_city" text,
    	"employee_birth_date" timestamp with time zone,
    	"job_title" text NOT NULL,
    	"contract_type" "contract_type" NOT NULL,
    	"started_on" timestamp with time zone NOT NULL,
    	"ends_on" timestamp with time zone,
    	"duration_months" integer,
    	"probation_months" integer DEFAULT 0 NOT NULL,
    	"hours_week_quarters" integer NOT NULL,
    	"salary_scale_name" text,
    	"salary_step" integer,
    	"gross_monthly_cents" integer NOT NULL,
    	"op_allowance_cents" integer DEFAULT 0 NOT NULL,
    	"holiday_allowance_bp" integer DEFAULT 800 NOT NULL,
    	"holiday_hours_per_year" integer,
    	"aanzeggen_voor" timestamp with time zone,
    	"aangezegd_op" timestamp with time zone,
    	"body" text NOT NULL,
    	"summary" text,
    	"signed_on" timestamp with time zone,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"created_by_user_id" uuid,
    	CONSTRAINT "contract_belongs_to_someone" CHECK ("generated_contracts"."candidate_id" IS NOT NULL OR "generated_contracts"."user_id" IS NOT NULL),
    	CONSTRAINT "contract_permanent_has_no_end" CHECK ("generated_contracts"."contract_type" <> 'onbepaalde_tijd' OR "generated_contracts"."ends_on" IS NULL),
    	CONSTRAINT "contract_ends_after_start" CHECK ("generated_contracts"."ends_on" IS NULL OR "generated_contracts"."ends_on" > "generated_contracts"."started_on"),
    	CONSTRAINT "contract_probation_valid" CHECK ("generated_contracts"."probation_months" >= 0 AND "generated_contracts"."probation_months" <= 2),
    	CONSTRAINT "contract_no_probation_when_short" CHECK ("generated_contracts"."probation_months" = 0 OR "generated_contracts"."contract_type" = 'onbepaalde_tijd' OR "generated_contracts"."duration_months" IS NULL OR "generated_contracts"."duration_months" > 6),
    	CONSTRAINT "contract_hours_valid" CHECK ("generated_contracts"."hours_week_quarters" > 0 AND "generated_contracts"."hours_week_quarters" <= 8000),
    	CONSTRAINT "contract_salary_positive" CHECK ("generated_contracts"."gross_monthly_cents" > 0),
    	CONSTRAINT "contract_body_not_empty" CHECK (length(trim("generated_contracts"."body")) > 0)
    );


    CREATE TABLE "job_profiles" (
    	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    	"title" text NOT NULL,
    	"active" boolean DEFAULT true NOT NULL,
    	"default_scale_name" text,
    	"default_hours_week_quarters" integer,
    	"has_relation_clause" boolean DEFAULT false NOT NULL,
    	"relation_clause_motivation" text,
    	"relation_clause_months" integer DEFAULT 12 NOT NULL,
    	"extra_clauses" text,
    	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    	CONSTRAINT "job_profile_title_not_empty" CHECK (length(trim("job_profiles"."title")) > 0),
    	CONSTRAINT "job_profile_relation_needs_motivation" CHECK ("job_profiles"."has_relation_clause" = false OR length(trim(COALESCE("job_profiles"."relation_clause_motivation", ''))) > 0),
    	CONSTRAINT "job_profile_relation_months_valid" CHECK ("job_profiles"."relation_clause_months" >= 0 AND "job_profiles"."relation_clause_months" <= 60)
    );


    ALTER TABLE "contract_template_articles" ADD CONSTRAINT "contract_template_articles_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_job_profile_id_job_profiles_id_fk" FOREIGN KEY ("job_profile_id") REFERENCES "public"."job_profiles"("id") ON DELETE set null ON UPDATE no action;

    ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

    ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

    CREATE UNIQUE INDEX "contract_template_articles_order_idx" ON "contract_template_articles" USING btree ("template_id","sort_order");

    CREATE INDEX "contract_templates_kind_idx" ON "contract_templates" USING btree ("kind","effective_from");

    CREATE INDEX "generated_contracts_candidate_idx" ON "generated_contracts" USING btree ("candidate_id");

    CREATE INDEX "generated_contracts_user_idx" ON "generated_contracts" USING btree ("user_id");

    CREATE INDEX "generated_contracts_aanzeggen_idx" ON "generated_contracts" USING btree ("aanzeggen_voor");

    CREATE UNIQUE INDEX "job_profiles_title_idx" ON "job_profiles" USING btree ("title");


    -- Row Level Security, net als op alle andere tabellen. Zie 0007_rls. Hier
    -- staan salarissen, adressen en geboortedatums in.
    ALTER TABLE "employer_settings" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "job_profiles" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "contract_templates" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "contract_template_articles" ENABLE ROW LEVEL SECURITY;

    ALTER TABLE "generated_contracts" ENABLE ROW LEVEL SECURITY;


    -- De gegevens van de werkgever. Het bezoekadres is het nieuwe kantoor aan de
    -- Aalbekerweg, dat per 1 oktober 2026 in gebruik gaat; de statutaire
    -- vestiging blijft de Klimmenerweg. In het contract van Voncken stonden die
    -- twee door elkaar - daarom zijn het nu twee velden.
    INSERT INTO "employer_settings" (
      "legal_name", "registered_address", "registered_postal_code", "registered_city",
      "work_address", "work_postal_code", "work_city", "signatories"
    )
    SELECT 'James Robinson B.V.', 'Klimmenerweg 8', '6336 AV', 'Hulsberg',
           'Aalbekerweg 4', '6336 AD', 'Hulsberg',
           'dhr. J. Coumans en dhr. J. Kikken'
    WHERE NOT EXISTS (SELECT 1 FROM "employer_settings");


    -- Een eerste functieprofiel, met de motivering die in het bestaande contract
    -- stond. Let op: die motivering is geschreven voor een marketing manager met
    -- een eigen portefeuille. Voor een andere functie hoort er een andere tekst
    -- te staan, anders valt het relatiebeding om.
    INSERT INTO "job_profiles" (
      "title", "default_scale_name", "has_relation_clause", "relation_clause_motivation",
      "relation_clause_months"
    )
    SELECT 'Marketing Manager', 'Medior', true,
           'De werknemer vervult de functie van Marketing Manager en krijgt uit dien hoofde een eigen portefeuille opdrachtgevers onder diens verantwoordelijkheid. De werknemer is voor die opdrachtgevers het primaire aanspreekpunt en beschikt daardoor over bedrijfsgevoelige kennis die niet publiek toegankelijk is: de marketingstrategie, budgetten en resultaten per opdrachtgever, de gehanteerde tarieven en retainerafspraken, en de persoonlijke relaties met beslissers bij die opdrachtgevers. Het bedrijfsmodel van werkgever berust op langjarige partnerships in plaats van losse opdrachten; het duurzame klantenbestand is daarmee het belangrijkste bedrijfsdebiet van werkgever. Wanneer werknemer die kennis en relaties na afloop van deze overeenkomst zou aanwenden ten behoeve van zichzelf of een derde, wordt de werkgever rechtstreeks in dat bedrijfsdebiet geraakt. Werkgever heeft dit belang afgewogen tegen het belang van werknemer bij vrije arbeidskeuze en de beperking daarom begrensd tot bestaande relaties van werkgever en tot een periode van twaalf maanden.',
           12
    WHERE NOT EXISTS (SELECT 1 FROM "job_profiles");


    -- Het sjabloon voor een arbeidsovereenkomst voor bepaalde tijd, overgenomen
    -- uit de overeenkomst die James Robinson nu gebruikt.
    --
    -- Drie dingen zijn bewust anders dan in het origineel:
    --
    --  1. De verwijzingen naar artikelnummers ("het bepaalde in 15.1 en 15.2")
    --     zijn vervangen door omschrijvingen. Artikelen kunnen vervallen als een
    --     voorwaarde niet geldt, en dan klopt een nummer niet meer.
    --  2. De motivering onder het relatiebeding is een plaatshouder geworden en
    --     staat bij het functieprofiel. In het origineel stond er een tekst die
    --     voor een marketing manager was geschreven.
    --  3. In het origineel stond "haar verantwoordelijkheid" en "Zij is" in een
    --     contract voor een man. Dat is vervangen door "de werknemer" en "diens".
    INSERT INTO "contract_templates" ("name", "kind", "effective_from", "intro")
    SELECT 'Arbeidsovereenkomst bepaalde tijd', 'bepaalde_tijd', '2026-01-01T00:00:00Z'::timestamptz,
           'Beste {{voornaam}},

    Wat fijn dat je bij James Robinson komt werken. Hieronder staat het contract; dit zijn de belangrijkste punten op een rij.

    - Je begint op {{ingangsdatum}} als {{functie}}.
    - {{duur_zin}}
    - Je werkt {{uren_per_week}} uur per week.
    - Je bruto maandsalaris is {{salaris}} ({{schaal_trede}}), plus {{vakantietoeslag_percent}}% vakantietoeslag.
    {{op_toeslag_zin}}- Je hebt recht op {{vakantie_uren}} uur vakantie per jaar.
    {{proeftijd_zin}}{{relatiebeding_zin}}
    Loop het rustig door en stel vooral vragen als iets niet duidelijk is. Liever nu dan later.

    Met vriendelijke groet,
    {{werkgever_ondertekenaars}}'
    WHERE NOT EXISTS (SELECT 1 FROM "contract_templates" WHERE "kind" = 'bepaalde_tijd');


    INSERT INTO "contract_template_articles" ("template_id", "sort_order", "title", "body", "voorwaarde")
    SELECT t.id, a.sort_order, a.title, a.body, a.voorwaarde::"artikel_voorwaarde"
    FROM "contract_templates" t
    CROSS JOIN (VALUES
      (1, 'Aard overeenkomst', 'Deze overeenkomst is een arbeidsovereenkomst in de zin van artikel 7:610 van het Burgerlijk Wetboek.

    Deze arbeidsovereenkomst is geen oproepovereenkomst in de zin van artikel 7:628a lid 9 en 10 van het Burgerlijk Wetboek.

    Op deze arbeidsovereenkomst is geen cao van toepassing. Werkgever heeft een Personeelshandboek / Bedrijfsreglement. Dit is van toepassing op de arbeidsovereenkomst. Werknemer heeft voorafgaand aan de ondertekening van deze arbeidsovereenkomst een exemplaar van het vigerend Personeelshandboek / Bedrijfsreglement ontvangen. Werknemer verklaart van de inhoud daarvan kennis te hebben genomen en het Personeelshandboek / Bedrijfsreglement te zullen naleven.', 'altijd'),
      (2, 'Ingangsdatum', 'De werknemer treedt op {{ingangsdatum}} in dienst van de werkgever.', 'altijd'),
      (3, 'Functie', 'De werknemer vervult de functie van {{functie}}.

    De werkgever kan van de werknemer verlangen ook andere werkzaamheden te verrichten dan die welke tot een normale uitoefening van de functie behoren, indien en voor zover deze andere werkzaamheden redelijkerwijs van de werknemer gevergd kunnen worden.', 'altijd'),
      (4, 'Standplaats', 'De overeengekomen werkzaamheden zullen gewoonlijk in c.q. vanuit de vestiging van de werkgever aan {{werkplek_adres}}, {{werkplek_postcode}} {{werkplek_plaats}} worden verricht.

    De werkgever behoudt zich het recht voor de werknemer over te plaatsen naar een andere vestiging, mocht zich deze situatie ooit voordoen.', 'altijd'),
      (5, 'Duur', 'De arbeidsovereenkomst wordt aangegaan voor bepaalde tijd, voor de duur van {{looptijd}}, ingaande op {{ingangsdatum}}. De arbeidsovereenkomst eindigt derhalve van rechtswege op {{einddatum}}, zonder dat opzegging is vereist en zonder dat daartoe toestemming van het UWV nodig is.

    Partijen zijn bevoegd de arbeidsovereenkomst tussentijds op te zeggen, met inachtneming van de wettelijke opzegtermijn. Voor de procedure voor beëindiging, daarin begrepen de vereisten en de (vaststelling van de) geldende opzegtermijnen welke werkgever en/of werknemer in acht dienen te nemen, wordt verwezen naar Titel 10 van Boek 7 van het Burgerlijk Wetboek en naar het Bedrijfsreglement / Personeelshandboek.

    De werkgever zal de werknemer uiterlijk één maand voor het einde van rechtswege schriftelijk informeren over het al dan niet voortzetten van de arbeidsovereenkomst en, bij voortzetting, over de voorwaarden waaronder (aanzegging conform artikel 7:668 van het Burgerlijk Wetboek).', 'bepaalde_tijd'),
      (6, 'Proeftijd', 'Voor deze arbeidsovereenkomst geldt een proeftijd van {{proeftijd}}, ingaande op de eerste dag van het dienstverband. Gedurende de proeftijd zijn zowel werkgever als werknemer bevoegd de arbeidsovereenkomst met onmiddellijke ingang te beëindigen.', 'proeftijd'),
      (7, 'Arbeidstijd', 'De arbeidsovereenkomst wordt aangegaan voor {{uren_per_week}} uur per week.

    De dagen en tijden waarop de arbeid dient te worden verricht worden bepaald door de werkgever, welke daarbij, zoveel als de eisen van een goede bedrijfsvoering toelaten, rekening houdt met de wensen van de werknemer.

    De werknemer werkt in beginsel de overeengekomen vaste arbeidsduur per week. De werknemer is tevens bereid om extra uren te werken indien de werkgever hierom verzoekt. Eventueel meer gewerkte uren worden of in geld of in verlof (tijd voor tijd) vergoed tegen 100%, een en ander in overleg tussen werkgever en werknemer, en voor zover de tijd-voor-tijd-regeling wettelijk is toegestaan.', 'altijd'),
      (8, 'Salaris', 'Het salaris bedraagt ten tijde van het aangaan van de overeenkomst bruto {{salaris}} per maand ({{schaal_trede}}) bij een arbeidsduur van {{uren_per_week}} uur per week, exclusief {{vakantietoeslag_percent}}% vakantietoeslag.

    Het netto salaris zal maandelijks tegen het einde van de maand uitbetaald worden op een door de werknemer aan te wijzen bank- of postrekening.

    De werknemer stemt ermee in dat de loonstrook door de werkgever op elektronische wijze kan worden verstrekt.', 'altijd'),
      (9, 'Arbeidsongeschiktheid', 'In geval van arbeidsongeschiktheid dient de werknemer dit vóór aanvang van de arbeidstijd bij de werkgever te melden.

    De werknemer is verplicht zich te onderwerpen aan de controlevoorschriften ter zake van ziekteverzuim, welke door of namens de werkgever zijn of zullen worden vastgesteld.

    Bij arbeidsongeschiktheid geldt de wettelijke loondoorbetalingsverplichting. Gedurende de 1e 52 weken bedraagt dit 100% van het bruto loon waarbij het loon niet lager mag zijn dan het voorgeschreven minimumloon. Gedurende de 2e 52 weken bedraagt de loondoorbetalingsverplichting 70% zonder de ondergrens van het minimumloon. Ziektegevallen welke elkaar opvolgen binnen 4 weken worden als één ziektegeval beschouwd.

    Bij niet-nakoming van de controlevoorschriften is de werkgever bevoegd tot opschorting van de betaling van het loon op grond van het bepaalde in artikel 7:629 lid 6 van het Burgerlijk Wetboek.', 'altijd'),
      (10, 'Vakantie', 'Aan de werknemer wordt een recht op vakantie met behoud van salaris toegekend naar evenredigheid van het aantal gewerkte uren. Uitgangspunt daarbij is een recht op vakantie bij een fulltime dienstbetrekking van {{vakantiedagen_fulltime}} dagen ({{vakantie_uren_fulltime}} uur) per kalenderjaar. Bij een arbeidsduur van {{uren_per_week}} uur per week komt dit neer op {{vakantie_uren}} uur vakantie per kalenderjaar.

    Werknemer heeft, onverminderd de verlofaanspraken uit hoofde van deze arbeidsovereenkomst, recht op de vormen van verlof zoals genoemd in de Wet arbeid en zorg, indien en voor zover door werknemer voldaan wordt aan de voorwaarden die deze wet (en/of een toekomstige vervangende regeling van deze wet) daaraan stelt. De rechten van werknemer op overig betaald en onbetaald verlof staan vermeld in het Personeelshandboek / Bedrijfsreglement.', 'altijd'),
      (11, 'Vakantietoeslag', 'Aan de werknemer zal {{vakantietoeslag_percent}}% van het bruto salaris als vakantietoeslag worden uitgekeerd.

    De betaling van de vakantietoeslag lopende over de periode van 1 juni tot en met 31 mei zal plaatsvinden in de maand mei.', 'altijd'),
      (12, 'Beëindiging', 'Bij beëindiging van de arbeidsovereenkomst zal verrekening van te veel dan wel te weinig opgenomen vakantiedagen en te veel dan wel te weinig uitbetaalde vakantietoeslag geschieden door inhouding op dan wel uitbetaling bij het laatste maandsalaris.', 'altijd'),
      (13, 'Pensioen', 'Er is geen pensioenregeling overeengekomen. De werknemer ontvangt ter compensatie een bruto OP-toeslag van {{op_toeslag_percent}}% over het vaste bruto maandloon, t.w.v. bruto {{op_toeslag_bedrag}} per maand. Over de OP-toeslag wordt geen vakantiegeld uitbetaald. Indien in de toekomst een pensioenregeling wordt overeengekomen, dan komt deze OP-toeslag te vervallen.', 'op_toeslag'),
      (14, 'Geheimhouding', 'De werknemer erkent dat aan de werknemer door de werkgever geheimhouding is opgelegd van alle bijzonderheden van het bedrijf van de werkgever en de cliënten van de werkgever betreffende, of daarmee verband houdende.

    Het is aan de werknemer verboden om hetzij tijdens de duur van de arbeidsovereenkomst, hetzij erna op enigerlei wijze, direct of indirect in welke vorm ook, mededelingen te doen van of aangaande het bedrijf van de werkgever alsmede van of aangaande de cliënten van de werkgever.

    Bij overtreding van de in dit artikel vervatte verboden verbeurt de werknemer aan de werkgever een dadelijk en ineens zonder sommatie of ingebrekestelling opeisbare boete van € 1.750,00 voor elke overtreding, zonder dat de werkgever gehouden zal zijn schade te bewijzen en onverminderd het recht van de werkgever om in plaats van deze boete een schadevergoeding te eisen.', 'altijd'),
      (15, 'Verbod van nevenwerkzaamheden', 'Het is de werknemer verboden gedurende de loop van de arbeidsovereenkomst nevenwerkzaamheden te verrichten voor een andere werkgever of opdrachtgever, direct of indirect, en zaken te doen of diensten te verlenen voor eigen rekening (al dan niet tegen vergoeding), behoudens voorafgaande schriftelijke toestemming van de werkgever. De werkgever zal deze toestemming niet onthouden, tenzij daarvoor een objectieve rechtvaardigingsgrond bestaat.

    Indien de werknemer arbeidsongeschikt wordt als gevolg van nevenwerkzaamheden die op grond van dit artikel zijn verboden, zal de werkgever gerechtigd zijn de arbeidsovereenkomst op die grond te doen eindigen althans zal de werkgever op grond van wanprestatie van de werknemer niet gehouden zijn tot doorbetaling van loon.', 'altijd'),
      (16, 'Relatiebeding', 'Het is werknemer niet toegestaan om gedurende een periode van {{relatiebeding_maanden}} maanden na het einde van de arbeidsovereenkomst op enige wijze zakelijke betrekkingen aan te gaan of te onderhouden met (voormalige) relaties van werkgever, behoudens de voorafgaande schriftelijke toestemming van de werkgever, ongeacht op wiens initiatief deze betrekkingen en/of contacten tot stand zijn gekomen. Van een dergelijke relatie is sprake als werkgever in het jaar voorafgaande aan de beëindiging van deze overeenkomst zakelijke contacten met deze relatie heeft onderhouden, dan wel getracht heeft deze tot stand te doen komen. Tijdens het dienstverband is het ook niet toegestaan om voor eigen rekening of in een dienstverband elders contacten te onderhouden met, dan wel diensten te leveren aan, klanten van de werkgever.

    Werkgever acht dit beding noodzakelijk vanwege de volgende zwaarwegende bedrijfsbelangen. {{relatiebeding_motivering}}

    Bij overtreding van het in dit artikel bepaalde verbeurt de werknemer aan de werkgever een dadelijk en ineens zonder sommatie of ingebrekestelling opeisbare boete van € 2.500,00 per overtreding en € 250,00 voor elke dag dat de overtreding voortduurt, zonder dat de werkgever gehouden zal zijn schade te bewijzen, onverminderd het recht van de werkgever om in plaats van deze boete een schadevergoeding te eisen.', 'relatiebeding'),
      (17, 'Bestemming boetes', 'De in deze overeenkomst opgenomen boetes komen ten goede aan de werkgever.

    Als de boete ziet op een niet-nakoming van het relatiebeding, dan is deze rechtstreeks aan de werkgever verschuldigd en strekt deze tot persoonlijk voordeel. Hiermee wordt uitdrukkelijk afgeweken van artikel 7:650 lid 3-5 BW.', 'altijd'),
      (18, 'Intellectueel eigendomsbeding', 'Alle (intellectuele eigendoms)-rechten vallen op basis van de Auteurswet exclusief en in onverdeelde eigendom van werkgever. Werknemer is gehouden om mee te werken aan het overdragen van de auteursrechten aan de werkgever, van alle werken die zijn ontstaan, bedacht, vervaardigd of anderszins tot stand zijn gekomen bij de uitvoering van de werkzaamheden door werknemer onder deze overeenkomst. Dit gaat om behaalde resultaten die alleen of in samenwerking met anderen tot stand zijn gekomen in het kader van de arbeidsovereenkomst. Dergelijke resultaten omvatten ook werken die niet behoorden tot de bedongen werkzaamheden van de werknemer.', 'altijd'),
      (19, 'Sociale zekerheid en verzekeringen', 'De werknemer is verzekerd tegen arbeidsongeschiktheid (WGA), werkloosheid (WW), ziekte (Zw) en ontvangt een uitkering gedurende zwangerschaps-/bevallingsverlof (WAZO) en betaald ouderschapsverlof.

    De eventuele premies voor deze verzekeringen worden door de werkgever betaald aan de Belastingdienst / UWV en ingehouden op het bruto loon van de werknemer.

    Werkgever heeft ten behoeve van werknemer een ziekteverzuimverzekering en een bedrijfsongevallenverzekering afgesloten en, indien noodzakelijk, een beroepsaansprakelijkheidsverzekering. De premies worden door werkgever voldaan.', 'altijd'),
      (20, 'Algemene Verordening Gegevensbescherming', 'Vanuit de Algemene Verordening Gegevensbescherming (AVG) draagt de werkgever de informatieverplichting jegens werknemer over de verwerking van de persoonsgegevens van werknemer.

    Werkgever heeft, in hetgeen gesteld wordt in het vorige lid van dit artikel, een verklaring opgesteld waarmee werkgever voldoet aan haar verplichting jegens werknemer op het gebied van de AVG (hierna: AVG-verklaring).

    Werkgever legt de AVG-verklaring (als bijlage bij deze Overeenkomst) voor aan werknemer.

    Werknemer dient deze AVG-verklaring in te vullen en te ondertekenen, en levert deze in voor de datum van indiensttreding bij werkgever.', 'altijd'),
      (21, 'Overige afspraken', 'Aan de werknemer wordt een budget toegekend van € 100,00 per jaar voor vrijetijdsbesteding bij klanten van James Robinson. Dit bedrag kan achteraf bij werkgever worden gedeclareerd.', 'vrijetijdsbudget'),
      (22, 'Aanvullende afspraken bij deze functie', '{{extra_afspraken}}', 'extra_afspraken'),
      (23, 'Afwijkingen en aanpassingen', 'Deze arbeidsovereenkomst wordt geacht een volledige weergave te bevatten van de afspraken ter zake tussen partijen, zoals die bestaan op het moment van de ondertekening van de overeenkomst.

    Aanvullingen op, en afwijkingen van deze arbeidsovereenkomst zullen alleen geldig zijn indien en voor zover zij schriftelijk tussen partijen zijn overeengekomen, of schriftelijk door de werkgever zijn bevestigd.

    De werknemer gaat akkoord met het personeelshandboek en eventuele wijzigingen/uitbreidingen die in de toekomst worden doorgevoerd in desbetreffende handboek.', 'altijd'),
      (24, 'Eenzijdig wijzigingsbeding', 'De in deze overeenkomst van werkgever opgenomen (arbeids-)voorwaarden kunnen binnen de grenzen van redelijkheid door werkgever eenzijdig gewijzigd worden, indien de omstandigheden daartoe naar zijn oordeel aanleiding geven.

    Werknemer verplicht zich medewerking te verlenen aan voorstellen van werkgever die verband houden met gewijzigde werk- en/of bedrijfsomstandigheden, tenzij aanvaarding van die voorstellen in redelijkheid niet van werknemer kan worden gevraagd.

    In geval dat enige bepaling van deze overeenkomst door de bevoegde rechter nietig of anderszins onverbindend wordt verklaard, blijven de overige bepalingen van deze overeenkomst onverkort van kracht. Partijen zullen zich inspannen de nietig verklaarde bepaling te vervangen door een geldende bepaling, welke zoveel mogelijk bij de nietig verklaarde bepaling zal aansluiten.', 'altijd'),
      (25, 'Toepasselijk recht / bevoegde rechter', 'Op deze arbeidsovereenkomst is het Nederlandse recht bij uitsluiting van ieder ander rechtsstelsel van toepassing.

    De Nederlandse rechter is bij uitsluiting van ieder ander bevoegd tot beslechting van geschillen voortvloeiend uit deze overeenkomst.', 'altijd'),
      (26, 'Verstrekking kopie arbeidsovereenkomst', 'Door ondertekening van deze overeenkomst verklaart de werknemer een kopie van deze overeenkomst en het vigerende Personeelshandboek / Bedrijfsreglement te hebben ontvangen.', 'altijd')
    ) AS a(sort_order, title, body, voorwaarde)
    WHERE t."kind" = 'bepaalde_tijd'
      AND NOT EXISTS (SELECT 1 FROM "contract_template_articles" x WHERE x."template_id" = t.id);

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('83a2ef67fab3e131e8613fdbd4800982bd0ddffcb572b4a3ecef75ba5d7dde50', 1789943874994);
    RAISE NOTICE 'Toegepast: 0024_contracten.';
  END IF;
END $jr_0024_contracten$;

-- ---------------------------------------------------------------------------
-- 0025_contract-opmerkingen
-- ---------------------------------------------------------------------------

DO $jr_0025_contract_opmerkingen$
BEGIN
  IF EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a13c877860523657ddfd9968c521d54e82622f5993b928a905a9cfd7da6382fc') THEN
    RAISE NOTICE 'Overgeslagen: 0025_contract-opmerkingen stond er al.';
  ELSE
    -- Waarschuwingen bij een contract bewaren.
    --
    -- De generator rekent uit dat de proeftijd is teruggebracht, dat er
    -- uiterlijk op een bepaalde datum moet worden aangezegd, of dat er geen
    -- relatiebeding in komt. Die waarschuwingen stonden alleen tijdens het
    -- opstellen in beeld en waren daarna weg - terwijl je ze juist een maand
    -- later nodig hebt.

    ALTER TABLE "generated_contracts" ADD COLUMN "remarks" text;

    INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('a13c877860523657ddfd9968c521d54e82622f5993b928a905a9cfd7da6382fc', 1789944496355);
    RAISE NOTICE 'Toegepast: 0025_contract-opmerkingen.';
  END IF;
END $jr_0025_contract_opmerkingen$;

