-- Idempotent geschreven. Branch- en previewbuilds draaiden db:migrate tegen
-- de productiedatabase, waardoor deze tabel daar al kon staan (onder een
-- eerder migratienummer). Dezelfde reden voor het vangnet onderaan: een
-- migratie met een oudere tijdstempel dan de laatst uitgevoerde wordt door
-- drizzle overgeslagen, dus de Moneybird-wijzigingen uit 0063 en 0064 worden
-- hier nogmaals, veilig, aangebracht.
CREATE TABLE IF NOT EXISTS "contact_organizations" (
	"contact_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text,
	"ended_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_organizations_pk" PRIMARY KEY("contact_id","organization_id")
);
--> statement-breakpoint
ALTER TABLE "contact_organizations" ADD COLUMN IF NOT EXISTS "ended_on" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_organizations_contact_id_contacts_id_fk') THEN
    ALTER TABLE "contact_organizations" ADD CONSTRAINT "contact_organizations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contact_organizations_organization_id_organizations_id_fk') THEN
    ALTER TABLE "contact_organizations" ADD CONSTRAINT "contact_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_organizations_org_idx" ON "contact_organizations" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "contact_organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TYPE "public"."entry_source" ADD VALUE IF NOT EXISTS 'abonnement';
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "moneybird_state" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "moneybird_recurring_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "moneybird_contact_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "moneybird_eerste_factuur" date;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "moneybird_sync_fout" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_moneybird_recurring_idx" ON "subscriptions" USING btree ("moneybird_recurring_id");
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "moneybird_retainer_factuur_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL;
