CREATE TABLE "linkedin_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_urn" text NOT NULL,
	"label" text NOT NULL,
	"access_token_enc" text NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"refresh_token_expires_at" timestamp with time zone NOT NULL,
	"scopes" text NOT NULL,
	"last_error" text,
	"last_error_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_connections" ADD COLUMN "linkedin_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "linkedin_connections" ADD CONSTRAINT "linkedin_connections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "linkedin_connections_member_idx" ON "linkedin_connections" USING btree ("member_urn");--> statement-breakpoint
ALTER TABLE "analytics_connections" ADD CONSTRAINT "analytics_connections_linkedin_connection_id_linkedin_connections_id_fk" FOREIGN KEY ("linkedin_connection_id") REFERENCES "public"."linkedin_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Net als google_connections: alleen de server (service role) mag erbij, nooit de anon-sleutel.
ALTER TABLE "linkedin_connections" ENABLE ROW LEVEL SECURITY;
