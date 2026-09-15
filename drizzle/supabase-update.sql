-- ============================================================================
--  James Robinson Wallet — database bijwerken
--
--  De wijzigingen vanaf 0007_rls. Plak dit in de SQL-editor van Supabase en
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

