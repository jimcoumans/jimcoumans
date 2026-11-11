CREATE TABLE "report_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"month" text NOT NULL,
	"finding_code" text NOT NULL,
	"finding_title" text NOT NULL,
	"action" text NOT NULL,
	"owner" text NOT NULL,
	"status" text DEFAULT 'gepland' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_actions_month_format" CHECK ("report_actions"."month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "report_actions_owner_valid" CHECK ("report_actions"."owner" IN ('wij', 'jullie', 'kost_geld')),
	CONSTRAINT "report_actions_status_valid" CHECK ("report_actions"."status" IN ('gepland', 'bezig', 'klaar')),
	CONSTRAINT "report_actions_action_not_empty" CHECK (length(trim("report_actions"."action")) > 0)
);
--> statement-breakpoint
ALTER TABLE "report_actions" ADD CONSTRAINT "report_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_actions" ADD CONSTRAINT "report_actions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_actions_uniek_idx" ON "report_actions" USING btree ("organization_id","month","finding_code","action");--> statement-breakpoint
CREATE INDEX "report_actions_org_month_idx" ON "report_actions" USING btree ("organization_id","month");--> statement-breakpoint
ALTER TABLE "report_actions" ENABLE ROW LEVEL SECURITY;