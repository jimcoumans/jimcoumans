ALTER TYPE "public"."analytics_source" ADD VALUE 'google_business';--> statement-breakpoint
CREATE TABLE "business_profile_daily" (
	"organization_id" uuid NOT NULL,
	"day" date NOT NULL,
	"impressions_maps" integer,
	"impressions_search" integer,
	"website_clicks" integer,
	"call_clicks" integer,
	"direction_requests" integer,
	"messaging_clicks" integer,
	"bookings" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_profile_daily_organization_id_day_pk" PRIMARY KEY("organization_id","day"),
	CONSTRAINT "business_profile_daily_not_negative" CHECK (COALESCE("business_profile_daily"."impressions_maps", 0) >= 0 AND COALESCE("business_profile_daily"."impressions_search", 0) >= 0 AND COALESCE("business_profile_daily"."website_clicks", 0) >= 0 AND COALESCE("business_profile_daily"."call_clicks", 0) >= 0 AND COALESCE("business_profile_daily"."direction_requests", 0) >= 0 AND COALESCE("business_profile_daily"."messaging_clicks", 0) >= 0 AND COALESCE("business_profile_daily"."bookings", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "business_profile_daily" ADD CONSTRAINT "business_profile_daily_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_profile_daily_day_idx" ON "business_profile_daily" USING btree ("day");--> statement-breakpoint
-- Net als performance_daily: alleen de server (service role) mag erbij, nooit de anon-sleutel.
ALTER TABLE "business_profile_daily" ENABLE ROW LEVEL SECURITY;
