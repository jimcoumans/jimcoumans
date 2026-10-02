-- Werving: vacatures en kandidaten.
--
-- Het mechanisme is hetzelfde als bij de salespijplijn - niet het bord met
-- fases maar de volgende actie - met een verschil dat zwaarder weegt. Een
-- deal die blijft liggen kost geld; een kandidaat die blijft liggen zit drie
-- weken op antwoord te wachten en vertelt dat door.
--
-- Twee dingen die de database afdwingt in plaats van dat ze afhangen van
-- discipline:
--
--   1. Een afgesloten kandidaat heeft een einddatum EN een bewaartermijn.
--      Zonder die regel loopt de termijn nooit af voor wie vergeten is af te
--      sluiten, en dan bewaar je sollicitatiegegevens tot in de eeuwigheid.
--
--   2. Een volgende actie heeft altijd een datum, en andersom. Een voornemen
--      zonder datum is geen afspraak.
--
-- Er staat met opzet geen geboortedatum, leeftijd, foto of nationaliteit bij
-- een kandidaat.

CREATE TYPE "public"."candidate_source" AS ENUM('website', 'linkedin', 'indeed', 'school', 'doorverwijzing', 'zelf_benaderd', 'open_sollicitatie', 'anders');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('nieuw', 'in_gesprek', 'tweede_gesprek', 'aanbod', 'aangenomen', 'afgewezen', 'afgehaakt');--> statement-breakpoint
CREATE TYPE "public"."vacancy_kind" AS ENUM('dienstverband', 'stage', 'freelance');--> statement-breakpoint
CREATE TYPE "public"."vacancy_status" AS ENUM('concept', 'open', 'gepauzeerd', 'vervuld', 'ingetrokken');--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vacancy_id" uuid,
	"name" text NOT NULL,
	"first_name" text,
	"infix" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"linkedin_url" text,
	"source" "candidate_source" DEFAULT 'website' NOT NULL,
	"referred_by_user_id" uuid,
	"school" text,
	"study" text,
	"status" "candidate_status" DEFAULT 'nieuw' NOT NULL,
	"applied_on" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_on" timestamp with time zone,
	"next_action" text,
	"next_action_on" timestamp with time zone,
	"notes" text,
	"closed_on" timestamp with time zone,
	"closed_reason" text,
	"hired_user_id" uuid,
	"retention_until" timestamp with time zone,
	"retention_consent_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_name_not_empty" CHECK (length(trim("candidates"."name")) > 0),
	CONSTRAINT "candidate_next_action_complete" CHECK ((length(trim(COALESCE("candidates"."next_action", ''))) > 0) = ("candidates"."next_action_on" IS NOT NULL)),
	CONSTRAINT "candidate_closed_matches_status" CHECK (("candidates"."status" IN ('aangenomen', 'afgewezen', 'afgehaakt')) = ("candidates"."closed_on" IS NOT NULL)),
	CONSTRAINT "candidate_retention_matches_closed" CHECK (("candidates"."closed_on" IS NULL) = ("candidates"."retention_until" IS NULL)),
	CONSTRAINT "candidate_retention_after_closed" CHECK ("candidates"."retention_until" IS NULL OR "candidates"."retention_until" >= "candidates"."closed_on"),
	CONSTRAINT "candidate_hired_only_when_hired" CHECK ("candidates"."hired_user_id" IS NULL OR "candidates"."status" = 'aangenomen'),
	CONSTRAINT "candidate_responded_after_applied" CHECK ("candidates"."responded_on" IS NULL OR "candidates"."responded_on" >= "candidates"."applied_on")
);
--> statement-breakpoint
CREATE TABLE "vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" "vacancy_kind" DEFAULT 'dienstverband' NOT NULL,
	"status" "vacancy_status" DEFAULT 'concept' NOT NULL,
	"positions" integer DEFAULT 1 NOT NULL,
	"owner_user_id" uuid,
	"salary_scale_name" text,
	"salary_step_min" integer,
	"salary_step_max" integer,
	"hours_week_quarters" integer,
	"reason" text,
	"description" text,
	"opened_on" timestamp with time zone,
	"closed_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vacancy_title_not_empty" CHECK (length(trim("vacancies"."title")) > 0),
	CONSTRAINT "vacancy_positions_valid" CHECK ("vacancies"."positions" > 0 AND "vacancies"."positions" <= 100),
	CONSTRAINT "vacancy_hours_valid" CHECK ("vacancies"."hours_week_quarters" IS NULL OR ("vacancies"."hours_week_quarters" > 0 AND "vacancies"."hours_week_quarters" <= 8000)),
	CONSTRAINT "vacancy_steps_ordered" CHECK ("vacancies"."salary_step_min" IS NULL OR "vacancies"."salary_step_max" IS NULL OR "vacancies"."salary_step_max" >= "vacancies"."salary_step_min"),
	CONSTRAINT "vacancy_steps_positive" CHECK (("vacancies"."salary_step_min" IS NULL OR "vacancies"."salary_step_min" > 0) AND ("vacancies"."salary_step_max" IS NULL OR "vacancies"."salary_step_max" > 0)),
	CONSTRAINT "vacancy_closed_after_opened" CHECK ("vacancies"."closed_on" IS NULL OR "vacancies"."opened_on" IS NULL OR "vacancies"."closed_on" >= "vacancies"."opened_on")
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "public"."vacancies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_hired_user_id_users_id_fk" FOREIGN KEY ("hired_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_vacancy_idx" ON "candidates" USING btree ("vacancy_id","status");--> statement-breakpoint
CREATE INDEX "candidates_status_idx" ON "candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "candidates_retention_idx" ON "candidates" USING btree ("retention_until");--> statement-breakpoint
CREATE INDEX "vacancies_status_idx" ON "vacancies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vacancies_owner_idx" ON "vacancies" USING btree ("owner_user_id");
--> statement-breakpoint
-- Row Level Security, net als op alle andere tabellen. Zie 0007_rls: zonder
-- dit staat de publieke REST-API van Supabase open voor iedereen met de
-- anon-key, en sollicitatiegegevens horen daar al helemaal niet in. Geen
-- policies: zonder policy mag een rol die niet de eigenaar is helemaal niets.
ALTER TABLE "vacancies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "candidates" ENABLE ROW LEVEL SECURITY;
