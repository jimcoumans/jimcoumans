CREATE TYPE "public"."brand_color_role" AS ENUM('primair', 'secundair', 'accent', 'achtergrond', 'tekst');--> statement-breakpoint
CREATE TYPE "public"."brand_file_kind" AS ENUM('logo', 'beeld', 'element', 'lettertype');--> statement-breakpoint
CREATE TYPE "public"."brand_font_role" AS ENUM('koppen', 'tekst', 'accent');--> statement-breakpoint
CREATE TYPE "public"."font_licence" AS ENUM('open', 'web', 'desktop', 'onbekend');--> statement-breakpoint
CREATE TYPE "public"."image_source" AS ENUM('eigen', 'klant', 'stock', 'ai');--> statement-breakpoint
CREATE TYPE "public"."logo_background" AS ENUM('licht', 'donker', 'beide');--> statement-breakpoint
CREATE TYPE "public"."logo_colorway" AS ENUM('kleur', 'zwart', 'wit');--> statement-breakpoint
CREATE TYPE "public"."logo_variant" AS ENUM('primair', 'beeldmerk', 'woordmerk', 'anders');--> statement-breakpoint
CREATE TYPE "public"."people_consent" AS ENUM('geen', 'toestemming', 'onbekend');--> statement-breakpoint
CREATE TYPE "public"."voice_address" AS ENUM('je', 'u', 'wisselend');--> statement-breakpoint
CREATE TABLE "brand_colors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hex" text NOT NULL,
	"role" "brand_color_role" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text,
	CONSTRAINT "brand_color_hex_valid" CHECK ("brand_colors"."hex" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_color_name_not_empty" CHECK (length(trim("brand_colors"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "brand_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "brand_file_kind" NOT NULL,
	"title" text NOT NULL,
	"storage_key" text NOT NULL,
	"has_thumbnail" boolean DEFAULT false NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"filename" text,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"notes" text,
	"logo_variant" "logo_variant",
	"logo_background" "logo_background",
	"logo_colorway" "logo_colorway",
	"focus_x" integer DEFAULT 50 NOT NULL,
	"focus_y" integer DEFAULT 50 NOT NULL,
	"source" "image_source",
	"usage" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"usable_until" timestamp with time zone,
	"people_consent" "people_consent",
	"ai_altered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "brand_file_title_not_empty" CHECK (length(trim("brand_files"."title")) > 0),
	CONSTRAINT "brand_file_focus_valid" CHECK ("brand_files"."focus_x" BETWEEN 0 AND 100 AND "brand_files"."focus_y" BETWEEN 0 AND 100),
	CONSTRAINT "brand_file_bytes_positive" CHECK ("brand_files"."bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "brand_fonts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" "brand_font_role" NOT NULL,
	"weights" text,
	"licence" "font_licence" DEFAULT 'onbekend' NOT NULL,
	"fallback" text,
	"file_id" uuid,
	"notes" text,
	CONSTRAINT "brand_font_name_not_empty" CHECK (length(trim("brand_fonts"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "brand_voices" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"address" "voice_address",
	"character" text,
	"words_yes" text,
	"words_no" text,
	"good_examples" text,
	"bad_examples" text,
	"ctas" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "brand_colors" ADD CONSTRAINT "brand_colors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_files" ADD CONSTRAINT "brand_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_files" ADD CONSTRAINT "brand_files_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_fonts" ADD CONSTRAINT "brand_fonts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_fonts" ADD CONSTRAINT "brand_fonts_file_id_brand_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."brand_files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voices" ADD CONSTRAINT "brand_voices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_voices" ADD CONSTRAINT "brand_voices_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_colors_org_idx" ON "brand_colors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "brand_files_org_idx" ON "brand_files" USING btree ("organization_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_files_storage_idx" ON "brand_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "brand_fonts_org_idx" ON "brand_fonts" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "brand_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brand_colors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brand_fonts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brand_voices" ENABLE ROW LEVEL SECURITY;