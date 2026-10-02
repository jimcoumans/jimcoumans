CREATE TABLE "campaign_specialists" (
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "campaign_specialists_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "ads_share_bp" integer;--> statement-breakpoint
ALTER TABLE "campaign_specialists" ADD CONSTRAINT "campaign_specialists_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_specialists" ADD CONSTRAINT "campaign_specialists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaign_ads_share_valid" CHECK ("campaigns"."ads_share_bp" IS NULL OR "campaigns"."ads_share_bp" BETWEEN 1 AND 10000);
--> statement-breakpoint
ALTER TABLE "campaign_specialists" ENABLE ROW LEVEL SECURITY;