ALTER TABLE "users" ADD COLUMN "sell_rate_cents" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "voorstel_profiel" jsonb;--> statement-breakpoint
-- De verkooptarieven zoals Jim ze opgaf (18 november 2026). Alleen invullen waar
-- nog niets staat, en alleen bij medewerkers (geen organisatie). Gezocht op de
-- volledige naam of op de naam die bij het account staat.
UPDATE "users" SET "sell_rate_cents" = 12500
WHERE "organization_id" IS NULL AND "sell_rate_cents" IS NULL
  AND lower(coalesce(nullif(concat_ws(' ', "first_name", "infix", "last_name"), ''), "name", '')) IN ('jim coumans', 'jim kikken', 'stan doyen', 'gino smits');--> statement-breakpoint
UPDATE "users" SET "sell_rate_cents" = 10000
WHERE "organization_id" IS NULL AND "sell_rate_cents" IS NULL
  AND lower(coalesce(nullif(concat_ws(' ', "first_name", "infix", "last_name"), ''), "name", '')) IN ('alex grau', 'daan voncken', 'jordy knubben');--> statement-breakpoint
-- Afwijkende tarieven die in een voorstel gekozen kunnen worden.
UPDATE "users" SET "voorstel_profiel" = '{"tarieven":[15000]}'::jsonb
WHERE "organization_id" IS NULL AND "voorstel_profiel" IS NULL
  AND lower(coalesce(nullif(concat_ws(' ', "first_name", "infix", "last_name"), ''), "name", '')) IN ('jim coumans', 'jim kikken', 'stan doyen');--> statement-breakpoint
UPDATE "users" SET "voorstel_profiel" = '{"tarieven":[7500]}'::jsonb
WHERE "organization_id" IS NULL AND "voorstel_profiel" IS NULL
  AND lower(coalesce(nullif(concat_ws(' ', "first_name", "infix", "last_name"), ''), "name", '')) = 'jordy knubben';
