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

CREATE TYPE "public"."deal_kind" AS ENUM('retainer', 'project');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "deal_id" uuid;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deals_org_idx" ON "deals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "deals_status_idx" ON "deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deals_next_action_idx" ON "deals" USING btree ("next_action_on");--> statement-breakpoint
CREATE INDEX "pipeline_stages_order_idx" ON "pipeline_stages" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_stages_name_idx" ON "pipeline_stages" USING btree ("name");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_deal_idx" ON "activities" USING btree ("deal_id");
--> statement-breakpoint
-- Row Level Security, net als op alle andere tabellen. Zie 0007_rls: de
-- publieke REST-API van Supabase staat anders open voor iedereen met de
-- anon-key, en een pijplijn met bedragen en klantnamen wil je daar niet in
-- hebben. Er komen met opzet geen policies bij; zonder policy mag een rol
-- die niet de eigenaar is helemaal niets.
ALTER TABLE "pipeline_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
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
