CREATE TYPE "public"."ai_meetwijze" AS ENUM('handmatig', 'automatisch');--> statement-breakpoint
CREATE TYPE "public"."ai_platform" AS ENUM('chatgpt', 'gemini', 'claude', 'google');--> statement-breakpoint
CREATE TABLE "ai_meetsets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"naam" text NOT NULL,
	"merknamen" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"concurrenten" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_meetset_naam_not_empty" CHECK (length(trim("ai_meetsets"."naam")) > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_metingen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vraag_id" uuid NOT NULL,
	"periode" date NOT NULL,
	"platform" "ai_platform" NOT NULL,
	"meetwijze" "ai_meetwijze" NOT NULL,
	"herhaling" integer NOT NULL,
	"antwoord" text NOT NULL,
	"genoemd" boolean NOT NULL,
	"plek" integer,
	"concurrenten" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bronnen" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gecorrigeerd" boolean DEFAULT false NOT NULL,
	"door_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_meting_herhaling_geldig" CHECK ("ai_metingen"."herhaling" BETWEEN 1 AND 3),
	CONSTRAINT "ai_meting_plek_geldig" CHECK ("ai_metingen"."plek" IS NULL OR "ai_metingen"."plek" >= 1),
	CONSTRAINT "ai_meting_antwoord_not_empty" CHECK (length(trim("ai_metingen"."antwoord")) > 0),
	CONSTRAINT "ai_meting_periode_eerste" CHECK (extract(day from "ai_metingen"."periode") = 1)
);
--> statement-breakpoint
CREATE TABLE "ai_vragen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"tekst" text NOT NULL,
	"volgorde" integer DEFAULT 0 NOT NULL,
	"gearchiveerd_op" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_vraag_tekst_not_empty" CHECK (length(trim("ai_vragen"."tekst")) > 0)
);
--> statement-breakpoint
ALTER TABLE "ai_meetsets" ADD CONSTRAINT "ai_meetsets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_metingen" ADD CONSTRAINT "ai_metingen_vraag_id_ai_vragen_id_fk" FOREIGN KEY ("vraag_id") REFERENCES "public"."ai_vragen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_metingen" ADD CONSTRAINT "ai_metingen_door_user_id_users_id_fk" FOREIGN KEY ("door_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_vragen" ADD CONSTRAINT "ai_vragen_set_id_ai_meetsets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."ai_meetsets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_meetsets_org_idx" ON "ai_meetsets" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_metingen_uniek_idx" ON "ai_metingen" USING btree ("vraag_id","periode","platform","meetwijze","herhaling");--> statement-breakpoint
CREATE INDEX "ai_metingen_periode_idx" ON "ai_metingen" USING btree ("periode");--> statement-breakpoint
CREATE INDEX "ai_vragen_set_idx" ON "ai_vragen" USING btree ("set_id");--> statement-breakpoint
ALTER TABLE "ai_meetsets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_vragen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_metingen" ENABLE ROW LEVEL SECURITY;