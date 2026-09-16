-- Contactpersonen bij partners.
--
-- Tot nu toe had een partner een veld `contact_name`: een naam, meer niet.
-- Geen mailadres, geen verjaardag, geen tweede persoon. Dat werkt zolang je
-- vier partners hebt en elke drukker maar een contactpersoon.
--
-- Vanaf nu hangt een contactpersoon aan een klant OF aan een partner. Het is
-- dezelfde soort mens met dezelfde soort gegevens, dus dezelfde tabel. Een
-- aparte partnercontacten-tabel zou twee formulieren, twee zoekfuncties en
-- een verjaardagsoverzicht opleveren dat de helft mist.
--
-- De check zorgt dat er precies een van de twee gevuld is. Zonder die check
-- kan er een persoon ontstaan die nergens bij hoort, en die vind je nooit
-- meer terug: elk overzicht komt via een klant of via een partner binnen.

ALTER TABLE "contacts" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_partner_idx" ON "contacts" USING btree ("partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_one_primary_partner_idx" ON "contacts" USING btree ("partner_id") WHERE "contacts"."is_primary";--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contact_hoort_bij_een" CHECK (("contacts"."organization_id" IS NULL) != ("contacts"."partner_id" IS NULL));