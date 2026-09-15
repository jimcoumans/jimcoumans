CREATE TYPE "public"."legal_form" AS ENUM('eenmanszaak', 'vof', 'maatschap', 'cv', 'bv', 'nv', 'stichting', 'vereniging', 'overheid', 'anders');--> statement-breakpoint
CREATE TYPE "public"."relation_health" AS ENUM('uitstekend', 'goed', 'aandacht', 'zorgelijk');--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "competitor_name_not_empty" CHECK (length(trim("competitors"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "organization_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"target_on" timestamp with time zone,
	"achieved_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "goal_title_not_empty" CHECK (length(trim("organization_goals"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "organization_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address_line" text,
	"postal_code" text,
	"city" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_name_not_empty" CHECK (length(trim("organization_locations"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_form" "legal_form";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "founded_on" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "relation_health" "relation_health";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "core_activity" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "employee_count" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "annual_revenue_cents" bigint;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "facebook_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "youtube_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "tiktok_url" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "previous_agencies" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "alert_on" text;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_goals" ADD CONSTRAINT "organization_goals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_goals" ADD CONSTRAINT "organization_goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitors_org_idx" ON "competitors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "competitors_name_idx" ON "competitors" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organization_goals_org_idx" ON "organization_goals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_locations_org_idx" ON "organization_locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organizations_region_idx" ON "organizations" USING btree ("region");--> statement-breakpoint
CREATE INDEX "organizations_health_idx" ON "organizations" USING btree ("relation_health");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organization_employee_count_valid" CHECK ("organizations"."employee_count" IS NULL OR "organizations"."employee_count" >= 0);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organization_revenue_not_negative" CHECK ("organizations"."annual_revenue_cents" IS NULL OR "organizations"."annual_revenue_cents" >= 0);--> statement-breakpoint
-- Row Level Security op de nieuwe tabellen: ook vestigingen, concurrenten en
-- doelen horen niet leesbaar te zijn via de publieke anon-key van Supabase.
ALTER TABLE "organization_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "competitors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_goals" ENABLE ROW LEVEL SECURITY;
