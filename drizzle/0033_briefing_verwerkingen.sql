CREATE TYPE "public"."verwerking_status" AS ENUM('wacht', 'bezig', 'klaar', 'fout', 'teruggedraaid');--> statement-breakpoint
CREATE TABLE "campaign_verwerkingen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"status" "verwerking_status" DEFAULT 'wacht' NOT NULL,
	"invoer" text,
	"bestand_naam" text,
	"bestand_type" text,
	"bestand_sleutel" text,
	"wijzigingen" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"open_vragen" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"voor" jsonb,
	"fout" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"gestart_op" timestamp with time zone,
	"klaar_op" timestamp with time zone,
	"created_by_user_id" uuid,
	CONSTRAINT "verwerking_heeft_invoer" CHECK (length(trim(coalesce("campaign_verwerkingen"."invoer", ''))) > 0 OR "campaign_verwerkingen"."bestand_sleutel" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "campaign_verwerkingen" ADD CONSTRAINT "campaign_verwerkingen_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_verwerkingen" ADD CONSTRAINT "campaign_verwerkingen_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_verwerkingen_campaign_idx" ON "campaign_verwerkingen" USING btree ("campaign_id","created_at");--> statement-breakpoint
ALTER TABLE "campaign_verwerkingen" ENABLE ROW LEVEL SECURITY;