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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "salary_houses" ADD CONSTRAINT "salary_houses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_scales" ADD CONSTRAINT "salary_scales_house_id_salary_houses_id_fk" FOREIGN KEY ("house_id") REFERENCES "public"."salary_houses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "salary_houses_date_idx" ON "salary_houses" USING btree ("effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_scales_order_idx" ON "salary_scales" USING btree ("house_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_scales_name_idx" ON "salary_scales" USING btree ("house_id","name");
--> statement-breakpoint
-- Row Level Security, net als op alle andere tabellen. Zie 0007_rls: de
-- publieke REST-API van Supabase staat anders open voor iedereen met de
-- anon-key, en salarisschalen horen daar niet in. Geen policies: zonder
-- policy mag een rol die niet de eigenaar is helemaal niets.
ALTER TABLE "salary_houses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "salary_scales" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
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
--> statement-breakpoint
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
