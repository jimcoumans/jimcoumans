ALTER TABLE "generated_contracts" DROP CONSTRAINT "generated_contracts_candidate_id_candidates_id_fk";
--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;