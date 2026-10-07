ALTER TABLE "campaign_channels" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "campaign_channels" ADD COLUMN "live_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaign_channels" ADD COLUMN "live_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaign_channels" ADD CONSTRAINT "channel_live_period" CHECK ("campaign_channels"."live_from" IS NULL OR "campaign_channels"."live_until" IS NULL OR "campaign_channels"."live_until" >= "campaign_channels"."live_from");