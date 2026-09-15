CREATE TYPE "public"."disc_type" AS ENUM('D', 'I', 'S', 'C');--> statement-breakpoint
CREATE TYPE "public"."drink_preference" AS ENUM('koffie_zwart', 'koffie_suiker', 'koffie_melk', 'koffie_melk_suiker', 'cappuccino', 'latte_macchiato', 'thee', 'spa_rood', 'spa_blauw', 'anders');--> statement-breakpoint
CREATE TYPE "public"."contact_channel" AS ENUM('mail', 'telefoon', 'whatsapp', 'app');--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preferred_channel" "contact_channel";--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "disc_type" "disc_type";--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "drink_preference" "drink_preference";--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "partner_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "background" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "hobbies" text;--> statement-breakpoint
ALTER TABLE "contact_children" ADD CONSTRAINT "contact_children_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_children_contact_idx" ON "contact_children" USING btree ("contact_id");--> statement-breakpoint
-- Gegevens van kinderen van klanten horen zeker niet leesbaar te zijn via de
-- publieke anon-key van Supabase.
ALTER TABLE "contact_children" ENABLE ROW LEVEL SECURITY;
