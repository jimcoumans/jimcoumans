CREATE TYPE "public"."mkt_activation" AS ENUM('always', 'optional', 'off', 'undecided');--> statement-breakpoint
CREATE TYPE "public"."mkt_applicability" AS ENUM('planned', 'not_relevant', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."mkt_block_mode" AS ENUM('override', 'inherit', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."mkt_content_kind" AS ENUM('page', 'case', 'review', 'faq', 'insight');--> statement-breakpoint
CREATE TYPE "public"."mkt_engine_group" AS ENUM('direction', 'core_driver', 'fuel', 'booster', 'optimiser', 'intelligence', 'infrastructure');--> statement-breakpoint
CREATE TYPE "public"."mkt_lifecycle" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."mkt_permission" AS ENUM('unknown', 'granted', 'denied');--> statement-breakpoint
CREATE TYPE "public"."mkt_publication" AS ENUM('unpublished', 'published', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."mkt_revision_kind" AS ENUM('concept', 'review', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."mkt_subject_type" AS ENUM('service', 'package', 'objective', 'engine', 'general_page');--> statement-breakpoint
CREATE TYPE "public"."mkt_workflow" AS ENUM('draft', 'in_review', 'approved', 'archived');--> statement-breakpoint
CREATE TABLE "marketing_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'image' NOT NULL,
	"storage_reference" text NOT NULL,
	"alt_text" text,
	"rights_status" "mkt_permission" DEFAULT 'unknown' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_asset_reference_not_empty" CHECK (length(trim("marketing_assets"."storage_reference")) > 0)
);
--> statement-breakpoint
CREATE TABLE "marketing_client_industries" (
	"client_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	CONSTRAINT "marketing_client_industries_pk" PRIMARY KEY("client_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"public_description" text,
	"logo_asset_id" uuid,
	"organization_id" uuid,
	"public_permission_status" "mkt_permission" DEFAULT 'unknown' NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_client_name_not_empty" CHECK (length(trim("marketing_clients"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "marketing_content_asset_links" (
	"content_item_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" text DEFAULT 'beeld' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "marketing_content_asset_links_pk" PRIMARY KEY("content_item_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"value" text,
	"mode" "mkt_block_mode" DEFAULT 'override' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_content_client_links" (
	"content_item_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	CONSTRAINT "marketing_content_client_links_pk" PRIMARY KEY("content_item_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_content_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"field_key" text,
	"body" text NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_comment_body_not_empty" CHECK (length(trim("marketing_content_comments"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "marketing_content_industry_links" (
	"content_item_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	CONSTRAINT "marketing_content_industry_links_pk" PRIMARY KEY("content_item_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"industry_id" uuid,
	"content_kind" "mkt_content_kind" NOT NULL,
	"title" text NOT NULL,
	"slug" text,
	"owner_id" uuid,
	"workflow_status" "mkt_workflow" DEFAULT 'draft' NOT NULL,
	"publication_status" "mkt_publication" DEFAULT 'unpublished' NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"target_url" text,
	"wordpress_external_id" text,
	"published_at" timestamp with time zone,
	"approved_revision_id" uuid,
	"published_revision_id" uuid,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_content_title_not_empty" CHECK (length(trim("marketing_content_items"."title")) > 0),
	CONSTRAINT "marketing_content_page_context" CHECK ("marketing_content_items"."content_kind" <> 'page' OR "marketing_content_items"."subject_id" IS NOT NULL OR "marketing_content_items"."industry_id" IS NOT NULL),
	CONSTRAINT "marketing_content_evidence_no_context" CHECK ("marketing_content_items"."content_kind" = 'page' OR ("marketing_content_items"."subject_id" IS NULL AND "marketing_content_items"."industry_id" IS NULL)),
	CONSTRAINT "marketing_content_published_approved" CHECK ("marketing_content_items"."publication_status" <> 'published' OR "marketing_content_items"."published_revision_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "marketing_content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_item_id" uuid NOT NULL,
	"kind" "mkt_revision_kind" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"author_id" uuid,
	"change_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_content_subject_links" (
	"content_item_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"relation_type" text DEFAULT 'relevant' NOT NULL,
	CONSTRAINT "marketing_content_subject_links_pk" PRIMARY KEY("content_item_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_coverage" (
	"subject_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	"applicability" "mkt_applicability" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_coverage_pk" PRIMARY KEY("subject_id","industry_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_engine_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group" "mkt_engine_group" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_engine_component_name_not_empty" CHECK (length(trim("marketing_engine_components"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "marketing_industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_industry_name_not_empty" CHECK (length(trim("marketing_industries"."name")) > 0),
	CONSTRAINT "marketing_industry_slug_format" CHECK ("marketing_industries"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "marketing_package_components" (
	"package_subject_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"activation" "mkt_activation" DEFAULT 'undecided' NOT NULL,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_package_components_pk" PRIMARY KEY("package_subject_id","component_id")
);
--> statement-breakpoint
CREATE TABLE "marketing_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "mkt_subject_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"lifecycle_status" "mkt_lifecycle" DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_subject_name_not_empty" CHECK (length(trim("marketing_subjects"."name")) > 0),
	CONSTRAINT "marketing_subject_slug_format" CHECK ("marketing_subjects"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "marketing_client_industries" ADD CONSTRAINT "marketing_client_industries_client_id_marketing_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."marketing_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_client_industries" ADD CONSTRAINT "marketing_client_industries_industry_id_marketing_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."marketing_industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_clients" ADD CONSTRAINT "marketing_clients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_asset_links" ADD CONSTRAINT "marketing_content_asset_links_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_asset_links" ADD CONSTRAINT "marketing_content_asset_links_asset_id_marketing_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."marketing_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_blocks" ADD CONSTRAINT "marketing_content_blocks_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_blocks" ADD CONSTRAINT "marketing_content_blocks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_client_links" ADD CONSTRAINT "marketing_content_client_links_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_client_links" ADD CONSTRAINT "marketing_content_client_links_client_id_marketing_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."marketing_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_comments" ADD CONSTRAINT "marketing_content_comments_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_comments" ADD CONSTRAINT "marketing_content_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_industry_links" ADD CONSTRAINT "marketing_content_industry_links_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_industry_links" ADD CONSTRAINT "marketing_content_industry_links_industry_id_marketing_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."marketing_industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_items" ADD CONSTRAINT "marketing_content_items_subject_id_marketing_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."marketing_subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_items" ADD CONSTRAINT "marketing_content_items_industry_id_marketing_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."marketing_industries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_items" ADD CONSTRAINT "marketing_content_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_revisions" ADD CONSTRAINT "marketing_content_revisions_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_revisions" ADD CONSTRAINT "marketing_content_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_subject_links" ADD CONSTRAINT "marketing_content_subject_links_content_item_id_marketing_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."marketing_content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_content_subject_links" ADD CONSTRAINT "marketing_content_subject_links_subject_id_marketing_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."marketing_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_coverage" ADD CONSTRAINT "marketing_coverage_subject_id_marketing_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."marketing_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_coverage" ADD CONSTRAINT "marketing_coverage_industry_id_marketing_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."marketing_industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_package_components" ADD CONSTRAINT "marketing_package_components_package_subject_id_marketing_subjects_id_fk" FOREIGN KEY ("package_subject_id") REFERENCES "public"."marketing_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_package_components" ADD CONSTRAINT "marketing_package_components_component_id_marketing_engine_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."marketing_engine_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_content_blocks_field_idx" ON "marketing_content_blocks" USING btree ("content_item_id","field_key");--> statement-breakpoint
CREATE INDEX "marketing_content_comments_item_idx" ON "marketing_content_comments" USING btree ("content_item_id");--> statement-breakpoint
CREATE INDEX "marketing_content_items_updated_idx" ON "marketing_content_items" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_content_general_page_idx" ON "marketing_content_items" USING btree ("subject_id") WHERE "marketing_content_items"."content_kind" = 'page' AND "marketing_content_items"."industry_id" IS NULL AND "marketing_content_items"."subject_id" IS NOT NULL AND "marketing_content_items"."workflow_status" <> 'archived';--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_content_variant_page_idx" ON "marketing_content_items" USING btree ("subject_id","industry_id") WHERE "marketing_content_items"."content_kind" = 'page' AND "marketing_content_items"."industry_id" IS NOT NULL AND "marketing_content_items"."subject_id" IS NOT NULL AND "marketing_content_items"."workflow_status" <> 'archived';--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_content_hub_page_idx" ON "marketing_content_items" USING btree ("industry_id") WHERE "marketing_content_items"."content_kind" = 'page' AND "marketing_content_items"."subject_id" IS NULL AND "marketing_content_items"."industry_id" IS NOT NULL AND "marketing_content_items"."workflow_status" <> 'archived';--> statement-breakpoint
CREATE INDEX "marketing_content_revisions_item_idx" ON "marketing_content_revisions" USING btree ("content_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_industries_slug_idx" ON "marketing_industries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "marketing_subjects_type_slug_idx" ON "marketing_subjects" USING btree ("type","slug");--> statement-breakpoint
ALTER TABLE "marketing_subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_industries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_engine_components" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_package_components" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_client_industries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_subject_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_industry_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_client_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_asset_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_content_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "marketing_coverage" ENABLE ROW LEVEL SECURITY;