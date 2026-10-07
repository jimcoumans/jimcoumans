CREATE TYPE "public"."formulier_soort" AS ENUM('vragenlijst', 'quickscan', 'intake');--> statement-breakpoint
CREATE TYPE "public"."formulier_status" AS ENUM('open', 'ingevuld', 'vrijgegeven');--> statement-breakpoint
CREATE TABLE "client_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"deal_id" uuid,
	"soort" "formulier_soort" NOT NULL,
	"status" "formulier_status" DEFAULT 'open' NOT NULL,
	"antwoorden" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uitkomst" text,
	"link_versie" integer DEFAULT 0 NOT NULL,
	"link_verloopt_op" timestamp with time zone,
	"ingevuld_op" timestamp with time zone,
	"ingevuld_door_klant" boolean DEFAULT false NOT NULL,
	"vrijgegeven_op" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	CONSTRAINT "client_forms_uitkomst_geldig" CHECK ("client_forms"."uitkomst" IS NULL OR "client_forms"."uitkomst" IN ('groen', 'oranje', 'later', 'rood'))
);
--> statement-breakpoint
ALTER TABLE "client_forms" ADD CONSTRAINT "client_forms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_forms" ADD CONSTRAINT "client_forms_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_forms" ADD CONSTRAINT "client_forms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_forms" ADD CONSTRAINT "client_forms_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_forms_org_idx" ON "client_forms" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "client_forms_deal_idx" ON "client_forms" USING btree ("deal_id");--> statement-breakpoint
ALTER TABLE "client_forms" ENABLE ROW LEVEL SECURITY;