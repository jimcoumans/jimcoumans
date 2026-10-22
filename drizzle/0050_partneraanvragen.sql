ALTER TYPE "public"."partner_type" ADD VALUE 'animator' BEFORE 'other';--> statement-breakpoint
CREATE TABLE "partner_aanvraag_werk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aanvraag_id" uuid NOT NULL,
	"naam" text NOT NULL,
	"omschrijving" text,
	"uren_honderdsten" integer NOT NULL,
	"uurtarief_cents" integer NOT NULL,
	"aan" boolean DEFAULT false NOT NULL,
	"volgorde" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "partner_aanvraag_werk_naam_not_empty" CHECK (length(trim("partner_aanvraag_werk"."naam")) > 0),
	CONSTRAINT "partner_aanvraag_werk_uren_positive" CHECK ("partner_aanvraag_werk"."uren_honderdsten" > 0),
	CONSTRAINT "partner_aanvraag_werk_tarief_positive" CHECK ("partner_aanvraag_werk"."uurtarief_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "partner_aanvragen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"titel" text NOT NULL,
	"specialisme" text NOT NULL,
	"vraag" text NOT NULL,
	"branche" text,
	"voorkeursdatum" date,
	"datum_toelichting" text,
	"locatie" text,
	"dagdelen" integer,
	"stuks" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"quote_id" uuid,
	"notities" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_aanvraag_titel_not_empty" CHECK (length(trim("partner_aanvragen"."titel")) > 0),
	CONSTRAINT "partner_aanvraag_vraag_not_empty" CHECK (length(trim("partner_aanvragen"."vraag")) > 0),
	CONSTRAINT "partner_aanvraag_status_geldig" CHECK ("partner_aanvragen"."status" IN ('open', 'voorstel', 'geannuleerd')),
	CONSTRAINT "partner_aanvraag_omvang_positive" CHECK (("partner_aanvragen"."dagdelen" IS NULL OR "partner_aanvragen"."dagdelen" > 0) AND ("partner_aanvragen"."stuks" IS NULL OR "partner_aanvragen"."stuks" > 0))
);
--> statement-breakpoint
CREATE TABLE "partner_pakketten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"specialisme" text NOT NULL,
	"naam" text NOT NULL,
	"omschrijving" text,
	"prijs_cents" integer NOT NULL,
	"eenheid" text DEFAULT 'opdracht' NOT NULL,
	"geldig_tot" date,
	"actief" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_pakket_naam_not_empty" CHECK (length(trim("partner_pakketten"."naam")) > 0),
	CONSTRAINT "partner_pakket_prijs_positive" CHECK ("partner_pakketten"."prijs_cents" > 0),
	CONSTRAINT "partner_pakket_eenheid_geldig" CHECK ("partner_pakketten"."eenheid" IN ('opdracht', 'dagdeel', 'dag', 'uur', 'stuk'))
);
--> statement-breakpoint
CREATE TABLE "partner_uitvragen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aanvraag_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"pakket_id" uuid,
	"indicatie_cents" integer,
	"status" text DEFAULT 'verstuurd' NOT NULL,
	"link_versie" integer DEFAULT 1 NOT NULL,
	"verstuurd_op" timestamp with time zone DEFAULT now() NOT NULL,
	"mail_fout" text,
	"beschikbaar" boolean,
	"andere_datum" text,
	"antwoord_pakket_id" uuid,
	"antwoord_prijs_cents" integer,
	"antwoord_opmerking" text,
	"beantwoord_op" timestamp with time zone,
	"prijs_cents" integer,
	"bevestigd_op" timestamp with time zone,
	"bevestigd_door_user_id" uuid,
	"beoordeling" integer,
	"beoordeling_notitie" text,
	"created_by_user_id" uuid,
	CONSTRAINT "partner_uitvraag_status_geldig" CHECK ("partner_uitvragen"."status" IN ('verstuurd', 'beantwoord', 'bevestigd', 'afgewezen')),
	CONSTRAINT "partner_uitvraag_prijzen_positive" CHECK (("partner_uitvragen"."antwoord_prijs_cents" IS NULL OR "partner_uitvragen"."antwoord_prijs_cents" > 0) AND ("partner_uitvragen"."prijs_cents" IS NULL OR "partner_uitvragen"."prijs_cents" > 0)),
	CONSTRAINT "partner_uitvraag_beoordeling_geldig" CHECK ("partner_uitvragen"."beoordeling" IS NULL OR "partner_uitvragen"."beoordeling" BETWEEN 1 AND 5),
	CONSTRAINT "partner_uitvraag_bevestigd_met_prijs" CHECK ("partner_uitvragen"."status" <> 'bevestigd' OR "partner_uitvragen"."prijs_cents" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "partner_werk_sjablonen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"naam" text NOT NULL,
	"omschrijving" text,
	"uren_honderdsten" integer NOT NULL,
	"uurtarief_cents" integer NOT NULL,
	"standaard_aan" boolean DEFAULT false NOT NULL,
	"volgorde" integer DEFAULT 0 NOT NULL,
	"actief" boolean DEFAULT true NOT NULL,
	CONSTRAINT "partner_werk_sjabloon_naam_not_empty" CHECK (length(trim("partner_werk_sjablonen"."naam")) > 0),
	CONSTRAINT "partner_werk_sjabloon_uren_positive" CHECK ("partner_werk_sjablonen"."uren_honderdsten" > 0),
	CONSTRAINT "partner_werk_sjabloon_tarief_positive" CHECK ("partner_werk_sjablonen"."uurtarief_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "specialismen" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "branches" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "werkgebied" text;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "sterktes" text;--> statement-breakpoint
ALTER TABLE "partner_aanvraag_werk" ADD CONSTRAINT "partner_aanvraag_werk_aanvraag_id_partner_aanvragen_id_fk" FOREIGN KEY ("aanvraag_id") REFERENCES "public"."partner_aanvragen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_aanvragen" ADD CONSTRAINT "partner_aanvragen_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_aanvragen" ADD CONSTRAINT "partner_aanvragen_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_aanvragen" ADD CONSTRAINT "partner_aanvragen_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_pakketten" ADD CONSTRAINT "partner_pakketten_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD CONSTRAINT "partner_uitvragen_aanvraag_id_partner_aanvragen_id_fk" FOREIGN KEY ("aanvraag_id") REFERENCES "public"."partner_aanvragen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD CONSTRAINT "partner_uitvragen_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD CONSTRAINT "partner_uitvragen_pakket_id_partner_pakketten_id_fk" FOREIGN KEY ("pakket_id") REFERENCES "public"."partner_pakketten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD CONSTRAINT "partner_uitvragen_antwoord_pakket_id_partner_pakketten_id_fk" FOREIGN KEY ("antwoord_pakket_id") REFERENCES "public"."partner_pakketten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD CONSTRAINT "partner_uitvragen_bevestigd_door_user_id_users_id_fk" FOREIGN KEY ("bevestigd_door_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD CONSTRAINT "partner_uitvragen_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_aanvraag_werk_idx" ON "partner_aanvraag_werk" USING btree ("aanvraag_id");--> statement-breakpoint
CREATE INDEX "partner_aanvragen_org_idx" ON "partner_aanvragen" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "partner_aanvragen_created_idx" ON "partner_aanvragen" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "partner_pakketten_partner_idx" ON "partner_pakketten" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_uitvragen_paar_idx" ON "partner_uitvragen" USING btree ("aanvraag_id","partner_id");--> statement-breakpoint
CREATE INDEX "partner_uitvragen_partner_idx" ON "partner_uitvragen" USING btree ("partner_id");--> statement-breakpoint
ALTER TABLE "partner_pakketten" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner_werk_sjablonen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner_aanvragen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner_aanvraag_werk" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "partner_werk_sjablonen" ("naam", "omschrijving", "uren_honderdsten", "uurtarief_cents", "standaard_aan", "volgorde") VALUES
  ('Basisfee: acquisitie en coördinatie', 'De aanvraag uitzetten, partners vergelijken en de opdracht regelen.', 100, 10000, true, 10),
  ('Briefing van de partner', 'De opdracht uitwerken tot een briefing en die met de partner doorlopen.', 100, 10000, false, 20),
  ('Uitwerking', 'Wat wij na de opname of het ontwerp zelf doen: selectie, montage, opmaak, inzet in campagnes.', 200, 10000, false, 30);
