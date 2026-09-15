-- ============================================================================
--  James Robinson Wallet — database bijwerken
--
--  De wijzigingen vanaf 0014_kosten_en_beeld. Plak dit in de SQL-editor van Supabase en
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

