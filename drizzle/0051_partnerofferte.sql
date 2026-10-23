ALTER TABLE "partner_uitvragen" ADD COLUMN "handmatig" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD COLUMN "offerte_naam" text;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD COLUMN "offerte_type" text;--> statement-breakpoint
ALTER TABLE "partner_uitvragen" ADD COLUMN "offerte_sleutel" text;