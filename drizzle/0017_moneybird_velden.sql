CREATE TYPE "public"."klant_type" AS ENUM('bedrijf', 'particulier');--> statement-breakpoint
CREATE TYPE "public"."verzendmethode" AS ENUM('email', 'peppol', 'zelf');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "customer_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "klant_type" "klant_type";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "moneybird_contact_id" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "verzendmethode" "verzendmethode";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "project_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "invoice_attn" text;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_customer_number_idx" ON "organizations" USING btree ("customer_number");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_moneybird_idx" ON "organizations" USING btree ("moneybird_contact_id");