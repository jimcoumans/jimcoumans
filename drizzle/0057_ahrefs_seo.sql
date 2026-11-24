ALTER TYPE "public"."analytics_source" ADD VALUE 'ahrefs';--> statement-breakpoint
CREATE TABLE "seo_daily" (
	"organization_id" uuid NOT NULL,
	"day" date NOT NULL,
	"domain_rating" real,
	"organic_keywords" integer,
	"organic_traffic" integer,
	"referring_domains" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_daily_organization_id_day_pk" PRIMARY KEY("organization_id","day"),
	CONSTRAINT "seo_daily_not_negative" CHECK (COALESCE("seo_daily"."domain_rating", 0) >= 0 AND COALESCE("seo_daily"."organic_keywords", 0) >= 0 AND COALESCE("seo_daily"."organic_traffic", 0) >= 0 AND COALESCE("seo_daily"."referring_domains", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "seo_daily" ADD CONSTRAINT "seo_daily_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_daily_day_idx" ON "seo_daily" USING btree ("day");--> statement-breakpoint
-- Net als performance_daily: alleen de server (service role) mag erbij, nooit de anon-sleutel.
ALTER TABLE "seo_daily" ENABLE ROW LEVEL SECURITY;
