CREATE TABLE "contact_organizations" (
	"contact_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_organizations_pk" PRIMARY KEY("contact_id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "contact_organizations" ADD CONSTRAINT "contact_organizations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_organizations" ADD CONSTRAINT "contact_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_organizations_org_idx" ON "contact_organizations" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "contact_organizations" ENABLE ROW LEVEL SECURITY;