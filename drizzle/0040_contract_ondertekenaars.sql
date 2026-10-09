-- Wie tekent er namens de werkgever.
--
-- Eigenaren tekenen standaard elk contract; bij het opstellen kun je iemand
-- uitvinken. De keuze wordt per contract bewaard, zodat een oud contract de
-- namen houdt waarmee het getekend is.
ALTER TABLE "generated_contracts" ADD COLUMN "employer_signers" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- De huidige eigenaren: Jim Coumans en Jim Kikken.
UPDATE "users" SET "is_owner" = true
WHERE "organization_id" IS NULL
  AND "role" IN ('staff', 'admin')
  AND (
    lower("email") = 'jim@jamesrobinson.nl'
    OR lower(trim(coalesce("first_name", '') || ' ' || coalesce("last_name", ''))) IN ('jim coumans', 'jim kikken')
    OR lower(trim(coalesce("name", ''))) IN ('jim coumans', 'jim kikken')
  );--> statement-breakpoint
-- Volledige namen in plaats van "dhr. J. Coumans en dhr. J. Kikken".
UPDATE "employer_settings" SET "signatories" = 'Jim Coumans en Jim Kikken'
WHERE "signatories" = 'dhr. J. Coumans en dhr. J. Kikken';--> statement-breakpoint
-- De contracttekst gelijk aan de pro forma die we zelf gebruiken.
UPDATE "contract_template_articles"
SET "body" = replace("body", 'aan te wijzen bank- of postrekening.', 'aan te wijzen bankrekening.')
WHERE "body" LIKE '%aan te wijzen bank- of postrekening.%';--> statement-breakpoint
UPDATE "contract_template_articles"
SET "body" = replace("body",
  'staan vermeld in het Personeelshandboek / Bedrijfsreglement.',
  'staan vermeld in het Personeelshandboek / Bedrijfsreglement. Een praktische uitleg van de vormen van betaald verlof en de wijze waarop dat verlof kan worden aangevraagd, is ook terug te vinden op de website van het UWV en de website van de Rijksoverheid.')
WHERE "body" LIKE '%staan vermeld in het Personeelshandboek / Bedrijfsreglement.%'
  AND "body" NOT LIKE '%website van de Rijksoverheid%';--> statement-breakpoint
UPDATE "contract_template_articles"
SET "body" = replace("body",
  'Vanuit de Algemene Verordening Gegevensbescherming (AVG) draagt',
  'Vanuit de Algemene Verordening Gegevensbescherming (AVG), die per 25 mei 2018 van toepassing is, draagt')
WHERE "body" LIKE 'Vanuit de Algemene Verordening Gegevensbescherming (AVG) draagt%';--> statement-breakpoint
-- Adres en geboortedatum die bij een contract zijn ingevuld, horen bij de
-- persoonsgegevens: daar staat het voortaan, en het contract leest het daar.
INSERT INTO "personal_records" ("candidate_id", "official_first_names", "infix", "last_name")
SELECT k."id", k."official_first_names", k."infix", k."last_name"
FROM "candidates" k
WHERE EXISTS (SELECT 1 FROM "generated_contracts" gc WHERE gc."candidate_id" = k."id")
  AND NOT EXISTS (SELECT 1 FROM "personal_records" pr WHERE pr."candidate_id" = k."id")
  AND (k."hired_user_id" IS NULL OR NOT EXISTS (SELECT 1 FROM "personal_records" pu WHERE pu."user_id" = k."hired_user_id"));--> statement-breakpoint
UPDATE "personal_records" pr
SET "address_line" = COALESCE(pr."address_line", laatste."employee_address"),
    "postal_code" = COALESCE(pr."postal_code", laatste."employee_postal_code"),
    "city" = COALESCE(pr."city", laatste."employee_city"),
    "birth_date" = COALESCE(pr."birth_date", laatste."employee_birth_date"),
    "updated_at" = now()
FROM (
  SELECT DISTINCT ON ("candidate_id") "candidate_id", "employee_address", "employee_postal_code", "employee_city", "employee_birth_date"
  FROM "generated_contracts"
  WHERE "candidate_id" IS NOT NULL
  ORDER BY "candidate_id", "created_at" DESC
) laatste
WHERE pr."candidate_id" = laatste."candidate_id";
