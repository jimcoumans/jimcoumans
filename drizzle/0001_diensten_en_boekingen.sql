CREATE TYPE "public"."service_unit" AS ENUM('piece', 'hour', 'month', 'project');--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"department" text,
	"unit" "service_unit" DEFAULT 'piece' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"cost_price_cents" integer,
	"estimated_minutes" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_price_positive" CHECK ("services"."unit_price_cents" > 0),
	CONSTRAINT "service_cost_not_negative" CHECK ("services"."cost_price_cents" IS NULL OR "services"."cost_price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "service_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "quantity_hundredths" integer;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "unit_price_cents" integer;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "delivered_by_user_id" uuid;--> statement-breakpoint
CREATE INDEX "services_name_idx" ON "services" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "services_code_idx" ON "services" USING btree ("code");--> statement-breakpoint
CREATE INDEX "services_active_idx" ON "services" USING btree ("active");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_delivered_by_user_id_users_id_fk" FOREIGN KEY ("delivered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_service_idx" ON "ledger_entries" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "ledger_delivered_by_idx" ON "ledger_entries" USING btree ("delivered_by_user_id");--> statement-breakpoint
CREATE INDEX "ledger_booked_on_idx" ON "ledger_entries" USING btree ("booked_on");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "quantity_positive" CHECK ("ledger_entries"."quantity_hundredths" IS NULL OR "ledger_entries"."quantity_hundredths" > 0);--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "service_needs_quantity_and_price" CHECK (("ledger_entries"."service_id" IS NULL)
       OR ("ledger_entries"."quantity_hundredths" IS NOT NULL AND "ledger_entries"."unit_price_cents" IS NOT NULL));