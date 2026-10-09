CREATE TABLE "text_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "employer_settings" ADD COLUMN "regelingen" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "text_templates" ADD CONSTRAINT "text_templates_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "text_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
/* Bedrijfsbreed geregeld, zoals bevestigd: de drie verzekeringen uit het contract. */
UPDATE "employer_settings" SET "regelingen" = ARRAY['ziekteverzuimverzekering', 'bedrijfsongevallenverzekering', 'beroepsaansprakelijkheidsverzekering']
WHERE "regelingen" = '{}'::text[];--> statement-breakpoint
/* --- Contracttekst laten kloppen --- */
/* Nevenwerkzaamheden: het lid over ontslag en loonstop bij arbeidsongeschiktheid door nevenwerk
   is nietig (opzegverbod bij ziekte, art. 7:629 en 7:670 BW). Weg ermee. */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", '' || E'\n' || '' || E'\n' || 'Indien de werknemer arbeidsongeschikt wordt als gevolg van nevenwerkzaamheden die op grond van dit artikel zijn verboden, zal de werkgever gerechtigd zijn de arbeidsovereenkomst op die grond te doen eindigen althans zal de werkgever op grond van wanprestatie van de werknemer niet gehouden zijn tot doorbetaling van loon.', '');--> statement-breakpoint
/* Boetes: de afwijking van 7:650 lid 3-5 geldt voor alle boetes en wijst de artikelen aan (lid 6). */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'De in deze overeenkomst opgenomen boetes komen ten goede aan de werkgever.' || E'\n' || '' || E'\n' || 'Als de boete ziet op een niet-nakoming van het relatiebeding, dan is deze rechtstreeks aan de werkgever verschuldigd en strekt deze tot persoonlijk voordeel. Hiermee wordt uitdrukkelijk afgeweken van artikel 7:650 lid 3-5 BW.', 'De boetes in deze overeenkomst zijn rechtstreeks aan de werkgever verschuldigd en komen ten goede aan de werkgever.' || E'\n' || '' || E'\n' || 'Voor de boetes in de artikelen over geheimhouding{{#als relatiebeding}} en het relatiebeding{{/als}} wijken partijen uitdrukkelijk af van artikel 7:650 lid 3, 4 en 5 van het Burgerlijk Wetboek. Deze afwijking geldt voor zover het loon van de werknemer hoger is dan het wettelijk minimumloon (artikel 7:650 lid 6 van het Burgerlijk Wetboek).');--> statement-breakpoint
/* Werknemerspremies worden sinds 2013 niet meer op het loon ingehouden. */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'De eventuele premies voor deze verzekeringen worden door de werkgever betaald aan de Belastingdienst / UWV en ingehouden op het bruto loon van de werknemer.', 'De premies voor de werknemersverzekeringen komen voor rekening van de werkgever. De werkgever houdt op het loon de loonheffing in en draagt die af aan de Belastingdienst.');--> statement-breakpoint
/* Verzekeringen: uit wat bedrijfsbreed geregeld is, niet vast in de tekst. */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'Werkgever heeft ten behoeve van werknemer een ziekteverzuimverzekering en een bedrijfsongevallenverzekering afgesloten en, indien noodzakelijk, een beroepsaansprakelijkheidsverzekering. De premies worden door werkgever voldaan.', '{{#als verzekeringen}}De werkgever heeft {{verzekeringen_zin}} afgesloten. De premies daarvan komen voor rekening van de werkgever.{{/als}}');--> statement-breakpoint
/* Eenzijdig wijzigen: de maatstaf van de wet (art. 7:613 BW), niet "naar zijn oordeel". */
UPDATE "contract_template_articles" SET "body" = REPLACE("body", 'De in deze overeenkomst van werkgever opgenomen (arbeids-)voorwaarden kunnen binnen de grenzen van redelijkheid door werkgever eenzijdig gewijzigd worden, indien de omstandigheden daartoe naar zijn oordeel aanleiding geven.', 'De werkgever kan de arbeidsvoorwaarden in deze overeenkomst eenzijdig wijzigen als de werkgever daarbij een zodanig zwaarwichtig belang heeft dat het belang van de werknemer dat door de wijziging zou worden geschaad, daarvoor naar maatstaven van redelijkheid en billijkheid moet wijken (artikel 7:613 van het Burgerlijk Wetboek).');
