ALTER TYPE "public"."personal_document_kind" ADD VALUE IF NOT EXISTS 'avg_verklaring';--> statement-breakpoint
CREATE TABLE "company_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"token" text NOT NULL,
	"note" text,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_document_kind_valid" CHECK ("company_documents"."kind" IN ('personeelshandboek')),
	CONSTRAINT "company_document_size_reasonable" CHECK ("company_documents"."bytes" > 0 AND "company_documents"."bytes" <= 15728640)
);
--> statement-breakpoint
CREATE TABLE "company_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address_line" text NOT NULL,
	"postal_code" text NOT NULL,
	"city" text NOT NULL,
	"phone" text,
	"email" text,
	"office_hours" text,
	"is_main" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "location_name_not_empty" CHECK (length(trim("company_locations"."name")) > 0),
	CONSTRAINT "location_address_not_empty" CHECK (length(trim("company_locations"."address_line")) > 0 AND length(trim("company_locations"."city")) > 0)
);
--> statement-breakpoint
ALTER TABLE "employer_settings" ALTER COLUMN "registered_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ALTER COLUMN "registered_postal_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ALTER COLUMN "registered_city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ALTER COLUMN "work_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ALTER COLUMN "work_postal_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ALTER COLUMN "work_city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "trade_name" text DEFAULT 'James Robinson' NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "logo_content_type" text;--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "avg_text" text;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "employee_short_name" text;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "sign_place" text;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "sign_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "employer_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "invoer" jsonb;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "handbook_document_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD COLUMN "handbook_given_on" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_documents_kind_idx" ON "company_documents" USING btree ("kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "company_documents_token_idx" ON "company_documents" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "company_locations_one_main" ON "company_locations" USING btree ("is_main") WHERE "company_locations"."is_main";--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_location_id_company_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."company_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_handbook_document_id_company_documents_id_fk" FOREIGN KEY ("handbook_document_id") REFERENCES "public"."company_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "company_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
/* --- Bedrijfsgegevens: de naam in de kop, contact en de hoofdvestiging --- */
UPDATE "employer_settings" SET
  "tagline" = COALESCE("tagline", 'Performance Agency'),
  "email" = COALESCE("email", 'support@jamesrobinson.nl'),
  "phone" = COALESCE("phone", '045 792 0009'),
  "website" = COALESCE("website", 'www.jamesrobinson.nl'),
  "updated_at" = now();--> statement-breakpoint
/* Wie standaard tekent: voluit, zonder "dhr. J.", ook als de tekst net anders was dan in 0040. */
UPDATE "employer_settings" SET "signatories" = 'Jim Coumans en Jim Kikken', "updated_at" = now()
WHERE "signatories" ILIKE '%dhr.%';--> statement-breakpoint
/* Ons adres is Aalbekerweg 4 in Hulsberg: dat is de hoofdvestiging, en voorlopig de enige standplaats. */
INSERT INTO "company_locations" ("name", "address_line", "postal_code", "city", "phone", "email", "is_main")
SELECT 'Hulsberg', 'Aalbekerweg 4', '6336 AD', 'Hulsberg', '045 792 0009', 'support@jamesrobinson.nl', true
WHERE NOT EXISTS (SELECT 1 FROM "company_locations");--> statement-breakpoint
/* --- Contracttekst: Personeelshandboek in plaats van Bedrijfsreglement --- */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'Werkgever heeft een Personeelshandboek / Bedrijfsreglement. Dit is van toepassing op de arbeidsovereenkomst. Werknemer heeft voorafgaand aan de ondertekening van deze arbeidsovereenkomst een exemplaar van het vigerend Personeelshandboek / Bedrijfsreglement ontvangen. Werknemer verklaart van de inhoud daarvan kennis te hebben genomen en het Personeelshandboek / Bedrijfsreglement te zullen naleven.', 'Het Personeelshandboek van de werkgever is van toepassing op deze arbeidsovereenkomst. De werknemer heeft voorafgaand aan de ondertekening een exemplaar van het geldende Personeelshandboek ontvangen, verklaart van de inhoud kennis te hebben genomen en zal het naleven.');--> statement-breakpoint
UPDATE "contract_template_articles" SET "body" = REPLACE(REPLACE(REPLACE("body",
  'Personeelshandboek / Bedrijfsreglement', 'Personeelshandboek'),
  'Bedrijfsreglement / Personeelshandboek', 'Personeelshandboek'),
  'Bedrijfsreglement', 'Personeelshandboek');--> statement-breakpoint
UPDATE "contract_template_articles" SET "body" = REPLACE(REPLACE(REPLACE("body",
  'het vigerende Personeelshandboek', 'het geldende Personeelshandboek'),
  'De werknemer gaat akkoord met het personeelshandboek en eventuele wijzigingen/uitbreidingen die in de toekomst worden doorgevoerd in desbetreffende handboek.',
  'De werknemer gaat akkoord met het Personeelshandboek en met wijzigingen en aanvullingen die de werkgever daarin later doorvoert.'),
  'het personeelshandboek', 'het Personeelshandboek');--> statement-breakpoint
/* --- Salaris: het bedrag bij aanvang, met schaal en trede op de peildatum --- */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'Het salaris bedraagt ten tijde van het aangaan van de overeenkomst bruto {{salaris}} per maand ({{schaal_trede}}) bij een arbeidsduur van {{uren_per_week}} uur per week, exclusief {{vakantietoeslag_percent}}% vakantietoeslag.', 'Het salaris bedraagt bij aanvang van de arbeidsovereenkomst bruto {{salaris}} per maand bij een arbeidsduur van {{uren_per_week}} uur per week, exclusief {{vakantietoeslag_percent}}% vakantietoeslag.{{#als schaal}} Dit bedrag is gebaseerd op {{schaal_trede}} van het salarishuis van de werkgever, zoals dat gold op {{salaris_peildatum}}.{{/als}}');--> statement-breakpoint
/* --- Arbeidstijd: bereikbaar op werkdagen, als maatwerk per contract --- */
UPDATE "contract_template_articles" SET "body" = "body" || E'\n\n' || '{{#als bereikbaar}}Partijen spreken af dat de werknemer de overeengekomen {{uren_per_week}} uur per week in overleg met de werkgever verdeelt over de werkdagen maandag tot en met vrijdag. Daarnaast is de werknemer op die werkdagen tijdens kantoortijden{{kantoortijden}} redelijkerwijs bereikbaar voor korte afstemming met de werkgever, collega’s en opdrachtgevers. Tijd die de werknemer daarbij aan werkzaamheden besteedt, telt mee als arbeidstijd. Bereikbaarheid verplicht de werknemer niet tot het werken van meer uren dan overeengekomen.{{/als}}'
WHERE "title" = 'Arbeidstijd' AND "body" NOT LIKE '%#als bereikbaar%';--> statement-breakpoint
/* --- Nevenwerkzaamheden: met toestemming (standaard) of vrij behalve voor klanten --- */
UPDATE "contract_template_articles" SET "title" = 'Nevenwerkzaamheden' WHERE "title" = 'Verbod van nevenwerkzaamheden';--> statement-breakpoint
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'Het is de werknemer verboden gedurende de loop van de arbeidsovereenkomst nevenwerkzaamheden te verrichten voor een andere werkgever of opdrachtgever, direct of indirect, en zaken te doen of diensten te verlenen voor eigen rekening (al dan niet tegen vergoeding), behoudens voorafgaande schriftelijke toestemming van de werkgever. De werkgever zal deze toestemming niet onthouden, tenzij daarvoor een objectieve rechtvaardigingsgrond bestaat.', '{{#als nevenwerk_toestemming}}Het is de werknemer verboden gedurende de loop van de arbeidsovereenkomst nevenwerkzaamheden te verrichten voor een andere werkgever of opdrachtgever, direct of indirect, en zaken te doen of diensten te verlenen voor eigen rekening (al dan niet tegen vergoeding), behoudens voorafgaande schriftelijke toestemming van de werkgever. De werkgever zal deze toestemming niet onthouden, tenzij daarvoor een objectieve rechtvaardigingsgrond bestaat.{{/als}}{{#als nevenwerk_vrij}}Het staat de werknemer vrij om naast deze arbeidsovereenkomst nevenwerkzaamheden te verrichten, in loondienst of als zelfstandige. Dat geldt niet voor werkzaamheden voor of ten behoeve van klanten van de werkgever, en evenmin voor ondernemingen die met een klant van de werkgever in een groep zijn verbonden, zoals moeder-, dochter- en zustermaatschappijen. Onder klanten worden verstaan: opdrachtgevers voor wie de werkgever op dat moment werkzaamheden verricht of in de twaalf maanden daarvoor heeft verricht. Deze uitzondering is noodzakelijk om belangenverstrengeling te voorkomen en de klantrelaties en vertrouwelijke informatie van de werkgever te beschermen.' || E'\n' || '' || E'\n' || 'De werknemer meldt nevenwerkzaamheden vooraf schriftelijk aan de werkgever, met de naam van de opdrachtgever of werkgever, zodat de werkgever kan nagaan of het een klant betreft. Nevenwerkzaamheden mogen de goede vervulling van de functie en de naleving van de Arbeidstijdenwet niet in de weg staan.{{/als}}')
WHERE "body" NOT LIKE '%#als nevenwerk_toestemming%';--> statement-breakpoint
/* --- Begeleidende tekst: de link naar het personeelshandboek --- */
UPDATE "contract_templates" SET "intro" = REPLACE("intro", 'Loop het rustig door en stel vooral vragen als iets niet duidelijk is.', '{{handboek_zin}}Loop het rustig door en stel vooral vragen als iets niet duidelijk is.')
WHERE "intro" NOT LIKE '%handboek_zin%';
