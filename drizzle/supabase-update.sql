-- ============================================================================
--  James Robinson Wallet — database bijwerken
--
--  De wijzigingen vanaf 0016_bedrijfsprofiel. Plak dit in de SQL-editor van Supabase en
--  druk op Run.
--
--  Je mag dit bestand zo vaak draaien als je wilt. Elke migratie kijkt eerst
--  of hij al gedraaid is en slaat zichzelf dan over. Je hoeft dus niet te
--  weten waar je database precies staat.
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

