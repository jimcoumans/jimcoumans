ALTER TYPE "public"."entry_source" ADD VALUE 'abonnement';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "moneybird_state" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "moneybird_recurring_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "moneybird_contact_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "moneybird_eerste_factuur" date;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "moneybird_sync_fout" text;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_moneybird_recurring_idx" ON "subscriptions" USING btree ("moneybird_recurring_id");