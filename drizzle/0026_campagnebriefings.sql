CREATE TYPE "public"."budget_mode" AS ENUM('berekend', 'vast');--> statement-breakpoint
CREATE TYPE "public"."campaign_kind" AS ENUM('retainer', 'project');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('concept', 'voorstel', 'akkoord', 'afgerond');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('bestaat', 'maken');--> statement-breakpoint
CREATE TABLE "campaign_audiences" (
	"campaign_id" uuid NOT NULL,
	"audience_id" uuid NOT NULL,
	CONSTRAINT "campaign_audiences_campaign_id_audience_id_pk" PRIMARY KEY("campaign_id","audience_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"kind" text NOT NULL,
	"quantity" text,
	"note" text,
	"status" "channel_status" DEFAULT 'maken' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_contacts" (
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	CONSTRAINT "campaign_contacts_campaign_id_contact_id_pk" PRIMARY KEY("campaign_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "campaign_kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"date_on" timestamp with time zone,
	"target_quantity" integer NOT NULL,
	"price_cents" integer,
	CONSTRAINT "kpi_quantity_positive" CHECK ("campaign_kpis"."target_quantity" > 0),
	CONSTRAINT "kpi_price_valid" CHECK ("campaign_kpis"."price_cents" IS NULL OR "campaign_kpis"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "campaign_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"due_on" timestamp with time zone,
	"description" text NOT NULL,
	"assignee_user_id" uuid,
	"assignee_label" text,
	"clickup_task_id" text,
	CONSTRAINT "timeline_description_not_empty" CHECK (length(trim("campaign_timeline"."description")) > 0)
);
--> statement-breakpoint
CREATE TABLE "campaign_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "campaign_status" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "campaign_status" DEFAULT 'concept' NOT NULL,
	"kind" "campaign_kind",
	"marketing_manager_id" uuid,
	"summary" text,
	"goal_sentence" text,
	"result_definition" text,
	"budget_mode" "budget_mode" DEFAULT 'berekend' NOT NULL,
	"fixed_budget_cents" integer,
	"budget_note" text,
	"kpi_notes" text,
	"offer_what" text,
	"offer_message" text,
	"offer_why_now" text,
	"offer_not_promised" text,
	"region" text,
	"exclusions" text,
	"audience_notes" text,
	"start_on" timestamp with time zone,
	"end_on" timestamp with time zone,
	"planning_notes" text,
	"client_does" text,
	"agreement_notes" text,
	"background_previous" text,
	"background_risks" text,
	"units_per_conversion_hundredths" integer DEFAULT 100 NOT NULL,
	"conversion_rate_bp" integer,
	"click_through_rate_bp" integer,
	"cpm_cents" integer,
	"buffer_bp" integer DEFAULT 2000 NOT NULL,
	"source_units" text,
	"source_conversion" text,
	"source_click_through" text,
	"source_cpm" text,
	"assumption_notes" text,
	"proposal_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"clickup_task_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "campaign_title_not_empty" CHECK (length(trim("campaigns"."title")) > 0),
	CONSTRAINT "campaign_units_positive" CHECK ("campaigns"."units_per_conversion_hundredths" > 0),
	CONSTRAINT "campaign_rates_valid" CHECK (("campaigns"."conversion_rate_bp" IS NULL OR "campaigns"."conversion_rate_bp" BETWEEN 1 AND 10000)
          AND ("campaigns"."click_through_rate_bp" IS NULL OR "campaigns"."click_through_rate_bp" BETWEEN 1 AND 10000)
          AND "campaigns"."buffer_bp" BETWEEN 0 AND 10000),
	CONSTRAINT "campaign_fixed_budget" CHECK ("campaigns"."fixed_budget_cents" IS NULL OR "campaigns"."fixed_budget_cents" > 0),
	CONSTRAINT "campaign_period" CHECK ("campaigns"."start_on" IS NULL OR "campaigns"."end_on" IS NULL OR "campaigns"."end_on" >= "campaigns"."start_on")
);
--> statement-breakpoint
CREATE TABLE "organization_audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audience_name_not_empty" CHECK (length(trim("organization_audiences"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_audience_id_organization_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."organization_audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_channels" ADD CONSTRAINT "campaign_channels_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ADD CONSTRAINT "campaign_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_kpis" ADD CONSTRAINT "campaign_kpis_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_timeline" ADD CONSTRAINT "campaign_timeline_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_timeline" ADD CONSTRAINT "campaign_timeline_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_versions" ADD CONSTRAINT "campaign_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_marketing_manager_id_users_id_fk" FOREIGN KEY ("marketing_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_audiences" ADD CONSTRAINT "organization_audiences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_channels_campaign_idx" ON "campaign_channels" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_kpis_campaign_idx" ON "campaign_kpis" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_timeline_campaign_idx" ON "campaign_timeline" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_versions_idx" ON "campaign_versions" USING btree ("campaign_id","version","status");--> statement-breakpoint
CREATE INDEX "campaigns_org_idx" ON "campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_audiences_org_idx" ON "organization_audiences" USING btree ("organization_id");--> statement-breakpoint
-- Row Level Security, net als op alle andere tabellen. Zie 0007_rls.
ALTER TABLE "organization_audiences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_audiences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_kpis" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_timeline" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "campaign_versions" ENABLE ROW LEVEL SECURITY;
