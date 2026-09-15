-- ============================================================================
--  James Robinson Wallet — database bijwerken
--
--  Alleen de wijzigingen vanaf 0007_rls. Plak dit in de SQL-editor van
--  Supabase en druk op Run. Draai het ÉÉN keer: tabellen aanmaken die er al
--  zijn geeft een foutmelding.
--
--  De regels onderaan die bijhouden welke migraties gedraaid zijn, worden
--  alleen toegevoegd als ze er nog niet staan. Die kun je dus wel vaker
--  uitvoeren zonder dubbele regels te krijgen.
-- ============================================================================

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
-- 0010_medewerkerprofiel
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Welke migraties hiermee gedraaid zijn
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "drizzle";

CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- 0007_rls
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT 'acc8bba55ee145b3b5ae41c3a5b074d194c9d015fab8c13c769db6faa5aae559', 1789197663063
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'acc8bba55ee145b3b5ae41c3a5b074d194c9d015fab8c13c769db6faa5aae559'
);

-- 0008_crm_uitbreiding
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT 'fed6c34eb8d597e6be313bf41fa0d0ee7a7d3280aa582ae72ed3b079fbe3905e', 1789461828334
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'fed6c34eb8d597e6be313bf41fa0d0ee7a7d3280aa582ae72ed3b079fbe3905e'
);

-- 0009_portfolio
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT '23a4912dd0f99e1d96c9d9b853f0d3d5cd5af53357e400405f3e729a3a101c0b', 1789463118797
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = '23a4912dd0f99e1d96c9d9b853f0d3d5cd5af53357e400405f3e729a3a101c0b'
);

-- 0010_medewerkerprofiel
INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
SELECT 'a443c3b5cb83e718b4aa317355a6d5422e51e74effea0c1255fa8982de6251e6', 1789464029976
WHERE NOT EXISTS (
  SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = 'a443c3b5cb83e718b4aa317355a6d5422e51e74effea0c1255fa8982de6251e6'
);
