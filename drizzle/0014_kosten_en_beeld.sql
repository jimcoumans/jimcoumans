CREATE TYPE "public"."beloning_soort" AS ENUM('loondienst', 'management_fee');--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"data" text NOT NULL,
	"filename" text,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "image_size_reasonable" CHECK ("images"."bytes" > 0 AND "images"."bytes" <= 1048576),
	CONSTRAINT "image_type_allowed" CHECK ("images"."content_type" IN ('image/png', 'image/jpeg', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "avatar_image_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_image_id" uuid;--> statement-breakpoint
ALTER TABLE "salary_records" ADD COLUMN "soort" "beloning_soort" DEFAULT 'loondienst' NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_records" ADD COLUMN "employer_cost_percent" integer DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_image_id" uuid;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_employer_cost_valid" CHECK ("salary_records"."employer_cost_percent" >= 0 AND "salary_records"."employer_cost_percent" <= 200);--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "fee_has_no_employer_cost" CHECK ("salary_records"."soort" <> 'management_fee' OR ("salary_records"."employer_cost_percent" = 0 AND "salary_records"."holiday_allowance_percent" = 0));--> statement-breakpoint
-- Row Level Security op de nieuwe tabel. Logo's en pasfoto's horen niet
-- leesbaar te zijn via de publieke anon-key van Supabase.
ALTER TABLE "images" ENABLE ROW LEVEL SECURITY;
