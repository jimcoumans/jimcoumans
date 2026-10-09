-- Aannemen in één stap.
--
-- 1. Een getekend contract is een eigen documentsoort bij de persoonsgegevens,
--    versleuteld net als de kopie ID.
-- 2. De OP-toeslag krijgt een eigen veld in de salarishistorie. Zonder dat veld
--    viel hij weg zodra een contract in het dossier kwam, en rekende het
--    portaal elke collega zonder pensioenregeling tien procent te goedkoop.
ALTER TYPE "public"."personal_document_kind" ADD VALUE IF NOT EXISTS 'contract';--> statement-breakpoint
ALTER TABLE "salary_records" ADD COLUMN "op_allowance_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_op_allowance_valid" CHECK ("salary_records"."op_allowance_cents" >= 0);--> statement-breakpoint
-- Salarisregels die uit een contract zijn ontstaan, krijgen de OP-toeslag van
-- dat contract alsnog mee.
UPDATE "salary_records" sr
SET "op_allowance_cents" = gc."op_allowance_cents"
FROM "generated_contracts" gc
WHERE gc."user_id" = sr."user_id"
  AND gc."soort" = 'definitief'
  AND gc."started_on" = sr."effective_from"
  AND gc."gross_monthly_cents" = sr."gross_monthly_cents"
  AND sr."op_allowance_cents" = 0;
