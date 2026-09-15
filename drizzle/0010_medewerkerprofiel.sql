ALTER TABLE "users" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mobile" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_day" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_month" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "started_on" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ended_on" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contract_hours_week_quarters" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hourly_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notes" text;--> statement-breakpoint
CREATE INDEX "users_department_idx" ON "users" USING btree ("department");--> statement-breakpoint
CREATE INDEX "users_birthday_idx" ON "users" USING btree ("birth_month","birth_day");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_birthday_complete" CHECK (("users"."birth_day" IS NULL) = ("users"."birth_month" IS NULL));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_birth_day_valid" CHECK ("users"."birth_day" IS NULL OR ("users"."birth_day" >= 1 AND "users"."birth_day" <= 31));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_birth_month_valid" CHECK ("users"."birth_month" IS NULL OR ("users"."birth_month" >= 1 AND "users"."birth_month" <= 12));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_contract_hours_valid" CHECK ("users"."contract_hours_week_quarters" IS NULL OR ("users"."contract_hours_week_quarters" > 0 AND "users"."contract_hours_week_quarters" <= 8000));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_hourly_cost_not_negative" CHECK ("users"."hourly_cost_cents" IS NULL OR "users"."hourly_cost_cents" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "user_employment_order" CHECK ("users"."ended_on" IS NULL OR "users"."started_on" IS NULL OR "users"."ended_on" >= "users"."started_on");