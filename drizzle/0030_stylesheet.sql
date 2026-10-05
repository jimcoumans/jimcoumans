CREATE TYPE "public"."text_style_role" AS ENUM('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'label', 'micro');--> statement-breakpoint
ALTER TYPE "public"."logo_variant" ADD VALUE 'secundair' BEFORE 'beeldmerk';--> statement-breakpoint
CREATE TABLE "brand_stylesheets" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"logos_not_applicable" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"button_font_family" text,
	"button_weight" integer,
	"button_size_px" integer,
	"button_uppercase" boolean DEFAULT false NOT NULL,
	"button_radius_px" integer,
	"button_normal_bg" text,
	"button_normal_text" text,
	"button_normal_border" text,
	"button_hover_bg" text,
	"button_hover_text" text,
	"button_hover_border" text,
	"button_active_bg" text,
	"button_active_text" text,
	"button_active_border" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid,
	CONSTRAINT "brand_button_weight_valid" CHECK ("brand_stylesheets"."button_weight" IS NULL OR "brand_stylesheets"."button_weight" BETWEEN 100 AND 900),
	CONSTRAINT "brand_button_size_valid" CHECK ("brand_stylesheets"."button_size_px" IS NULL OR "brand_stylesheets"."button_size_px" BETWEEN 6 AND 200),
	CONSTRAINT "brand_button_radius_valid" CHECK ("brand_stylesheets"."button_radius_px" IS NULL OR "brand_stylesheets"."button_radius_px" BETWEEN 0 AND 999),
	CONSTRAINT "brand_button_normal_bg_valid" CHECK ("brand_stylesheets"."button_normal_bg" IS NULL OR "brand_stylesheets"."button_normal_bg" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_normal_text_valid" CHECK ("brand_stylesheets"."button_normal_text" IS NULL OR "brand_stylesheets"."button_normal_text" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_normal_border_valid" CHECK ("brand_stylesheets"."button_normal_border" IS NULL OR "brand_stylesheets"."button_normal_border" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_hover_bg_valid" CHECK ("brand_stylesheets"."button_hover_bg" IS NULL OR "brand_stylesheets"."button_hover_bg" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_hover_text_valid" CHECK ("brand_stylesheets"."button_hover_text" IS NULL OR "brand_stylesheets"."button_hover_text" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_hover_border_valid" CHECK ("brand_stylesheets"."button_hover_border" IS NULL OR "brand_stylesheets"."button_hover_border" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_active_bg_valid" CHECK ("brand_stylesheets"."button_active_bg" IS NULL OR "brand_stylesheets"."button_active_bg" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_active_text_valid" CHECK ("brand_stylesheets"."button_active_text" IS NULL OR "brand_stylesheets"."button_active_text" ~ '^#[0-9A-F]{6}$'),
	CONSTRAINT "brand_button_active_border_valid" CHECK ("brand_stylesheets"."button_active_border" IS NULL OR "brand_stylesheets"."button_active_border" ~ '^#[0-9A-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "brand_text_styles" (
	"organization_id" uuid NOT NULL,
	"role" text_style_role NOT NULL,
	"font_family" text NOT NULL,
	"weight" integer DEFAULT 400 NOT NULL,
	"italic" boolean DEFAULT false NOT NULL,
	"size_px" integer NOT NULL,
	"line_height_pct" integer DEFAULT 120 NOT NULL,
	"tracking_tenths" integer DEFAULT 0 NOT NULL,
	"uppercase" boolean DEFAULT false NOT NULL,
	"color_hex" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_text_styles_organization_id_role_pk" PRIMARY KEY("organization_id","role"),
	CONSTRAINT "brand_text_style_weight_valid" CHECK ("brand_text_styles"."weight" BETWEEN 100 AND 900),
	CONSTRAINT "brand_text_style_size_valid" CHECK ("brand_text_styles"."size_px" BETWEEN 6 AND 400),
	CONSTRAINT "brand_text_style_line_height_valid" CHECK ("brand_text_styles"."line_height_pct" BETWEEN 50 AND 300),
	CONSTRAINT "brand_text_style_tracking_valid" CHECK ("brand_text_styles"."tracking_tenths" BETWEEN -500 AND 500),
	CONSTRAINT "brand_text_style_family_not_empty" CHECK (length(trim("brand_text_styles"."font_family")) > 0),
	CONSTRAINT "brand_text_style_color_valid" CHECK ("brand_text_styles"."color_hex" IS NULL OR "brand_text_styles"."color_hex" ~ '^#[0-9A-F]{6}$')
);
--> statement-breakpoint
ALTER TABLE "brand_stylesheets" ADD CONSTRAINT "brand_stylesheets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stylesheets" ADD CONSTRAINT "brand_stylesheets_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_text_styles" ADD CONSTRAINT "brand_text_styles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_stylesheets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "brand_text_styles" ENABLE ROW LEVEL SECURITY;
