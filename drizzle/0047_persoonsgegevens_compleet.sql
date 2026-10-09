ALTER TABLE "personal_records" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "private_email" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "private_phone" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "emergency_name" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "emergency_relation" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD COLUMN "emergency_phone" text;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_record_gender_valid" CHECK ("personal_records"."gender" IS NULL OR "personal_records"."gender" IN ('man', 'vrouw', 'x'));