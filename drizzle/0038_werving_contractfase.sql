CREATE TYPE "public"."candidate_note_kind" AS ENUM('notitie', 'gesprek', 'status');--> statement-breakpoint
CREATE TYPE "public"."personal_document_kind" AS ENUM('id_kopie', 'loonheffing', 'overig');--> statement-breakpoint
ALTER TYPE "public"."candidate_status" ADD VALUE 'contract' BEFORE 'aangenomen';--> statement-breakpoint
CREATE TABLE "candidate_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"kind" "candidate_note_kind" DEFAULT 'notitie' NOT NULL,
	"body" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_note_not_empty" CHECK (length(trim("candidate_notes"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "personal_document_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"kind" "personal_document_kind" NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"data_enc" text NOT NULL,
	"filename" text,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_document_size_reasonable" CHECK ("personal_documents"."bytes" > 0 AND "personal_documents"."bytes" <= 5242880),
	CONSTRAINT "personal_document_type_allowed" CHECK ("personal_documents"."content_type" IN ('application/pdf', 'image/jpeg', 'image/png'))
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid,
	"user_id" uuid,
	"official_first_names" text,
	"infix" text,
	"last_name" text,
	"birth_date" timestamp with time zone,
	"birth_place" text,
	"address_line" text,
	"postal_code" text,
	"city" text,
	"iban_enc" text,
	"iban_last4" text,
	"account_holder" text,
	"link_versie" integer DEFAULT 0 NOT NULL,
	"link_verloopt_op" timestamp with time zone,
	"aangeleverd_op" timestamp with time zone,
	"doorgegeven_op" timestamp with time zone,
	"doorgegeven_door_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_record_belongs_to_someone" CHECK ("personal_records"."candidate_id" IS NOT NULL OR "personal_records"."user_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "official_first_names" text;--> statement-breakpoint
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_notes" ADD CONSTRAINT "candidate_notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_document_views" ADD CONSTRAINT "personal_document_views_document_id_personal_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."personal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_document_views" ADD CONSTRAINT "personal_document_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_documents" ADD CONSTRAINT "personal_documents_record_id_personal_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."personal_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_documents" ADD CONSTRAINT "personal_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_doorgegeven_door_user_id_users_id_fk" FOREIGN KEY ("doorgegeven_door_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_notes_candidate_idx" ON "candidate_notes" USING btree ("candidate_id","created_at");--> statement-breakpoint
CREATE INDEX "personal_document_views_document_idx" ON "personal_document_views" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "personal_documents_record_idx" ON "personal_documents" USING btree ("record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_records_candidate_uniq" ON "personal_records" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_records_user_uniq" ON "personal_records" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "candidate_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "personal_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "personal_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "personal_document_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- De bestaande notitie van een kandidaat wordt de eerste regel op zijn tijdlijn.
INSERT INTO "candidate_notes" ("candidate_id", "kind", "body", "created_at")
SELECT "id", 'notitie', "notes", "created_at" FROM "candidates" WHERE length(trim(COALESCE("notes", ''))) > 0;
