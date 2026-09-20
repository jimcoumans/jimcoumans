-- Sollicitaties die via de website binnenkomen, met het cv erbij.
--
-- De bestanden staan in een eigen tabel met ON DELETE CASCADE op de
-- kandidaat. Dat is hier geen detail maar de kern: loopt de bewaartermijn af
-- en wordt de kandidaat gewist, dan gaat het cv vanzelf mee. Stond het
-- bestand ergens anders, dan was er een tweede opruiming nodig die iemand
-- vergeet - en dan bewaar je een cv van iemand die je allang uit je systeem
-- had moeten hebben.

CREATE TYPE "public"."candidate_document_kind" AS ENUM('cv', 'motivatie', 'overig');--> statement-breakpoint
CREATE TABLE "candidate_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"kind" "candidate_document_kind" DEFAULT 'cv' NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"data" text NOT NULL,
	"filename" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_document_size_reasonable" CHECK ("candidate_documents"."bytes" > 0 AND "candidate_documents"."bytes" <= 5242880),
	CONSTRAINT "candidate_document_type_allowed" CHECK ("candidate_documents"."content_type" IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ))
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "cv_source_url" text;--> statement-breakpoint
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_documents_candidate_idx" ON "candidate_documents" USING btree ("candidate_id");
--> statement-breakpoint
-- Row Level Security, net als op alle andere tabellen. Zie 0007_rls. Zeker
-- hier: dit zijn cv's van mensen die bij ons solliciteerden.
ALTER TABLE "candidate_documents" ENABLE ROW LEVEL SECURITY;
