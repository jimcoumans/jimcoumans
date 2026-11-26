ALTER TABLE "organizations" ADD COLUMN "wallet_facturen_vanaf" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "wallet_clickup_list_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_wallet_clickup_list_idx" ON "organizations" USING btree ("wallet_clickup_list_id");