CREATE TYPE "public"."check_categorie" AS ENUM('merk', 'afspraak', 'toon', 'doelgroep', 'taal', 'feiten', 'huisstijl', 'overig');--> statement-breakpoint
CREATE TYPE "public"."check_oordeel" AS ENUM('groen', 'oranje', 'rood');--> statement-breakpoint
CREATE TYPE "public"."check_status" AS ENUM('wacht', 'bezig', 'klaar', 'fout');--> statement-breakpoint
CREATE TABLE "check_regels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"tekst" text NOT NULL,
	"categorie" "check_categorie" DEFAULT 'overig' NOT NULL,
	"actief" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid,
	CONSTRAINT "check_regel_titel_not_empty" CHECK (length(trim("check_regels"."titel")) > 0),
	CONSTRAINT "check_regel_tekst_not_empty" CHECK (length(trim("check_regels"."tekst")) > 0)
);
--> statement-breakpoint
CREATE TABLE "klant_afspraken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tekst" text NOT NULL,
	"categorie" "check_categorie" DEFAULT 'afspraak' NOT NULL,
	"merk_id" uuid,
	"doelgroep_id" uuid,
	"kanaal" text,
	"soort" text,
	"actief" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "klant_afspraak_tekst_not_empty" CHECK (length(trim("klant_afspraken"."tekst")) > 0)
);
--> statement-breakpoint
CREATE TABLE "klant_merken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"naam" text NOT NULL,
	"omschrijving" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "klant_merk_naam_not_empty" CHECK (length(trim("klant_merken"."naam")) > 0)
);
--> statement-breakpoint
CREATE TABLE "uiting_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"soort" text NOT NULL,
	"kanaal" text,
	"merk_id" uuid,
	"kanaal_merk_id" uuid,
	"doelgroep_id" uuid,
	"campaign_id" uuid,
	"doel" text,
	"tekst" text,
	"uiting_url" text,
	"lp_url" text,
	"toelichting" text,
	"bestanden" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"versie" integer DEFAULT 1 NOT NULL,
	"vorige_check_id" uuid,
	"status" "check_status" DEFAULT 'wacht' NOT NULL,
	"oordeel" "check_oordeel",
	"uitkomst" jsonb,
	"fout" text,
	"invoer_tokens" integer,
	"uitvoer_tokens" integer,
	"gestart_op" timestamp with time zone,
	"klaar_op" timestamp with time zone,
	"vrijgegeven_op" timestamp with time zone,
	"vrijgegeven_door_user_id" uuid,
	"vrijgave_reden" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "uiting_check_titel_not_empty" CHECK (length(trim("uiting_checks"."titel")) > 0),
	CONSTRAINT "uiting_check_heeft_uiting" CHECK (length(trim(coalesce("uiting_checks"."tekst", ''))) > 0 OR "uiting_checks"."uiting_url" IS NOT NULL OR jsonb_array_length("uiting_checks"."bestanden") > 0),
	CONSTRAINT "uiting_check_vrijgave_na_check" CHECK ("uiting_checks"."vrijgegeven_op" IS NULL OR "uiting_checks"."status" = 'klaar')
);
--> statement-breakpoint
ALTER TABLE "brand_files" ADD COLUMN "merk_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_audiences" ADD COLUMN "address" "voice_address";--> statement-breakpoint
ALTER TABLE "organization_audiences" ADD COLUMN "style_notes" text;--> statement-breakpoint
ALTER TABLE "check_regels" ADD CONSTRAINT "check_regels_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klant_afspraken" ADD CONSTRAINT "klant_afspraken_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klant_afspraken" ADD CONSTRAINT "klant_afspraken_merk_id_klant_merken_id_fk" FOREIGN KEY ("merk_id") REFERENCES "public"."klant_merken"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klant_afspraken" ADD CONSTRAINT "klant_afspraken_doelgroep_id_organization_audiences_id_fk" FOREIGN KEY ("doelgroep_id") REFERENCES "public"."organization_audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klant_afspraken" ADD CONSTRAINT "klant_afspraken_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klant_merken" ADD CONSTRAINT "klant_merken_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_merk_id_klant_merken_id_fk" FOREIGN KEY ("merk_id") REFERENCES "public"."klant_merken"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_kanaal_merk_id_klant_merken_id_fk" FOREIGN KEY ("kanaal_merk_id") REFERENCES "public"."klant_merken"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_doelgroep_id_organization_audiences_id_fk" FOREIGN KEY ("doelgroep_id") REFERENCES "public"."organization_audiences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_vorige_check_id_uiting_checks_id_fk" FOREIGN KEY ("vorige_check_id") REFERENCES "public"."uiting_checks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_vrijgegeven_door_user_id_users_id_fk" FOREIGN KEY ("vrijgegeven_door_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uiting_checks" ADD CONSTRAINT "uiting_checks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "klant_afspraken_org_idx" ON "klant_afspraken" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "klant_merken_org_naam_idx" ON "klant_merken" USING btree ("organization_id",lower("naam"));--> statement-breakpoint
CREATE INDEX "uiting_checks_org_idx" ON "uiting_checks" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "uiting_checks_created_idx" ON "uiting_checks" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "brand_files" ADD CONSTRAINT "brand_files_merk_id_klant_merken_id_fk" FOREIGN KEY ("merk_id") REFERENCES "public"."klant_merken"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_regels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "klant_merken" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "klant_afspraken" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uiting_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "check_regels" ("titel", "tekst", "categorie") VALUES
  ('Foutloos Nederlands', 'Geen spelfouten, typefouten of grammaticafouten. Let op samenstellingen, d/t, hoofdletters en leestekens. Merk- en productnamen precies zoals de klant ze schrijft.', 'taal'),
  ('Het juiste merk', 'Het logo van het merk waar de inhoud over gaat staat erop, in de juiste variant voor de achtergrond, goed leesbaar en niet vervormd.', 'merk'),
  ('Klopt met de landingspagina', 'Aanbod, prijzen, data, tijden en voorwaarden in de uiting zijn dezelfde als op de pagina waar hij naartoe linkt. Wat de uiting belooft, vindt de bezoeker daar terug.', 'feiten'),
  ('Eén duidelijke actie', 'De uiting vraagt om één ding (reserveren, tickets kopen, aanvragen), en dat past bij het doel.', 'overig'),
  ('Geen loze beloftes', 'Geen beloftes, garanties of superlatieven die we niet kunnen onderbouwen.', 'feiten'),
  ('Aanspreekvorm consequent', 'Je of u, zoals afgesproken voor dit merk en deze doelgroep, en in de hele uiting hetzelfde.', 'toon');
