CREATE TYPE "public"."analytics_source" AS ENUM('ga4', 'search_console', 'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads');--> statement-breakpoint
CREATE TABLE "analytics_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source" "analytics_source" NOT NULL,
	"external_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"history_from" date,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_connection_external_id_not_empty" CHECK (length(trim("analytics_connections"."external_id")) > 0)
);
--> statement-breakpoint
CREATE TABLE "performance_daily" (
	"organization_id" uuid NOT NULL,
	"day" date NOT NULL,
	"bron" text NOT NULL,
	"provider" "analytics_source" NOT NULL,
	"impressions" bigint,
	"clicks" bigint,
	"sessions" integer,
	"conversions" integer,
	"cost_cents" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "performance_daily_organization_id_day_bron_provider_pk" PRIMARY KEY("organization_id","day","bron","provider"),
	CONSTRAINT "performance_daily_not_negative" CHECK (COALESCE("performance_daily"."impressions", 0) >= 0 AND COALESCE("performance_daily"."clicks", 0) >= 0 AND COALESCE("performance_daily"."sessions", 0) >= 0 AND COALESCE("performance_daily"."conversions", 0) >= 0 AND COALESCE("performance_daily"."cost_cents", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "analytics_connections" ADD CONSTRAINT "analytics_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_daily" ADD CONSTRAINT "performance_daily_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_connections_org_source_idx" ON "analytics_connections" USING btree ("organization_id","source");--> statement-breakpoint
CREATE INDEX "performance_daily_day_idx" ON "performance_daily" USING btree ("day");--> statement-breakpoint
ALTER TABLE "analytics_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "performance_daily" ENABLE ROW LEVEL SECURITY;
