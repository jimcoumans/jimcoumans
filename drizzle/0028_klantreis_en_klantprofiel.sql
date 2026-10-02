CREATE TABLE "client_journey_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "organization_profiles" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"sells" text,
	"why_chosen" text,
	"pricing_and_competition" text,
	"year_rhythm" text,
	"capacity" text,
	"best_customer" text,
	"region" text,
	"not_wanted" text,
	"brand_style" text,
	"brand_tone" text,
	"brand_imagery" text,
	"website_system" text,
	"email_setup" text,
	"booking_system" text,
	"client_commitments" text,
	"sensitivities" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "client_journey_items" ADD CONSTRAINT "client_journey_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_journey_items" ADD CONSTRAINT "client_journey_items_done_by_user_id_users_id_fk" FOREIGN KEY ("done_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_journey_items_org_item_idx" ON "client_journey_items" USING btree ("organization_id","item_key");
--> statement-breakpoint
ALTER TABLE "client_journey_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organization_profiles" ENABLE ROW LEVEL SECURITY;