-- De contractgenerator: sjablonen, functieprofielen en uitgeschreven contracten.
--
-- Een contract komt uit drie dingen: een sjabloon met artikelen, een
-- functieprofiel met wat per functie verschilt, en de gegevens van deze ene
-- persoon. Het resultaat wordt voluit bewaard - een oud contract verandert
-- niet omdat iemand later een zin in het sjabloon heeft bijgewerkt.
--
-- De artikelen staan als losse rijen en niet als een lap tekst. Zo kan een
-- artikel vervallen als de voorwaarde niet geldt, zonder dat iemand de
-- nummering met de hand moet bijwerken.

CREATE TYPE "public"."artikel_voorwaarde" AS ENUM('altijd', 'bepaalde_tijd', 'onbepaalde_tijd', 'proeftijd', 'relatiebeding', 'op_toeslag', 'pensioenregeling', 'vrijetijdsbudget', 'extra_afspraken');--> statement-breakpoint
CREATE TYPE "public"."contract_soort" AS ENUM('proforma', 'definitief');--> statement-breakpoint
CREATE TABLE "contract_template_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"voorwaarde" "artikel_voorwaarde" DEFAULT 'altijd' NOT NULL,
	CONSTRAINT "contract_article_title_not_empty" CHECK (length(trim("contract_template_articles"."title")) > 0),
	CONSTRAINT "contract_article_body_not_empty" CHECK (length(trim("contract_template_articles"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "contract_type" NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"intro" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_template_name_not_empty" CHECK (length(trim("contract_templates"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "employer_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"registered_address" text NOT NULL,
	"registered_postal_code" text NOT NULL,
	"registered_city" text NOT NULL,
	"work_address" text NOT NULL,
	"work_postal_code" text NOT NULL,
	"work_city" text NOT NULL,
	"signatories" text NOT NULL,
	"kvk_number" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_name_not_empty" CHECK (length(trim("employer_settings"."legal_name")) > 0),
	CONSTRAINT "employer_signatories_not_empty" CHECK (length(trim("employer_settings"."signatories")) > 0)
);
--> statement-breakpoint
CREATE TABLE "generated_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"soort" "contract_soort" DEFAULT 'proforma' NOT NULL,
	"template_id" uuid,
	"job_profile_id" uuid,
	"candidate_id" uuid,
	"user_id" uuid,
	"employee_name" text NOT NULL,
	"employee_aanhef" "aanhef",
	"employee_address" text,
	"employee_postal_code" text,
	"employee_city" text,
	"employee_birth_date" timestamp with time zone,
	"job_title" text NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"started_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone,
	"duration_months" integer,
	"probation_months" integer DEFAULT 0 NOT NULL,
	"hours_week_quarters" integer NOT NULL,
	"salary_scale_name" text,
	"salary_step" integer,
	"gross_monthly_cents" integer NOT NULL,
	"op_allowance_cents" integer DEFAULT 0 NOT NULL,
	"holiday_allowance_bp" integer DEFAULT 800 NOT NULL,
	"holiday_hours_per_year" integer,
	"aanzeggen_voor" timestamp with time zone,
	"aangezegd_op" timestamp with time zone,
	"body" text NOT NULL,
	"summary" text,
	"signed_on" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	CONSTRAINT "contract_belongs_to_someone" CHECK ("generated_contracts"."candidate_id" IS NOT NULL OR "generated_contracts"."user_id" IS NOT NULL),
	CONSTRAINT "contract_permanent_has_no_end" CHECK ("generated_contracts"."contract_type" <> 'onbepaalde_tijd' OR "generated_contracts"."ends_on" IS NULL),
	CONSTRAINT "contract_ends_after_start" CHECK ("generated_contracts"."ends_on" IS NULL OR "generated_contracts"."ends_on" > "generated_contracts"."started_on"),
	CONSTRAINT "contract_probation_valid" CHECK ("generated_contracts"."probation_months" >= 0 AND "generated_contracts"."probation_months" <= 2),
	CONSTRAINT "contract_no_probation_when_short" CHECK ("generated_contracts"."probation_months" = 0 OR "generated_contracts"."contract_type" = 'onbepaalde_tijd' OR "generated_contracts"."duration_months" IS NULL OR "generated_contracts"."duration_months" > 6),
	CONSTRAINT "contract_hours_valid" CHECK ("generated_contracts"."hours_week_quarters" > 0 AND "generated_contracts"."hours_week_quarters" <= 8000),
	CONSTRAINT "contract_salary_positive" CHECK ("generated_contracts"."gross_monthly_cents" > 0),
	CONSTRAINT "contract_body_not_empty" CHECK (length(trim("generated_contracts"."body")) > 0)
);
--> statement-breakpoint
CREATE TABLE "job_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"default_scale_name" text,
	"default_hours_week_quarters" integer,
	"has_relation_clause" boolean DEFAULT false NOT NULL,
	"relation_clause_motivation" text,
	"relation_clause_months" integer DEFAULT 12 NOT NULL,
	"extra_clauses" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_profile_title_not_empty" CHECK (length(trim("job_profiles"."title")) > 0),
	CONSTRAINT "job_profile_relation_needs_motivation" CHECK ("job_profiles"."has_relation_clause" = false OR length(trim(COALESCE("job_profiles"."relation_clause_motivation", ''))) > 0),
	CONSTRAINT "job_profile_relation_months_valid" CHECK ("job_profiles"."relation_clause_months" >= 0 AND "job_profiles"."relation_clause_months" <= 60)
);
--> statement-breakpoint
ALTER TABLE "contract_template_articles" ADD CONSTRAINT "contract_template_articles_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_job_profile_id_job_profiles_id_fk" FOREIGN KEY ("job_profile_id") REFERENCES "public"."job_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_contracts" ADD CONSTRAINT "generated_contracts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_template_articles_order_idx" ON "contract_template_articles" USING btree ("template_id","sort_order");--> statement-breakpoint
CREATE INDEX "contract_templates_kind_idx" ON "contract_templates" USING btree ("kind","effective_from");--> statement-breakpoint
CREATE INDEX "generated_contracts_candidate_idx" ON "generated_contracts" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "generated_contracts_user_idx" ON "generated_contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generated_contracts_aanzeggen_idx" ON "generated_contracts" USING btree ("aanzeggen_voor");--> statement-breakpoint
CREATE UNIQUE INDEX "job_profiles_title_idx" ON "job_profiles" USING btree ("title");
--> statement-breakpoint
-- Row Level Security, net als op alle andere tabellen. Zie 0007_rls. Hier
-- staan salarissen, adressen en geboortedatums in.
ALTER TABLE "employer_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contract_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contract_template_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "generated_contracts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- De gegevens van de werkgever. Het bezoekadres is het nieuwe kantoor aan de
-- Aalbekerweg, dat per 1 oktober 2026 in gebruik gaat; de statutaire
-- vestiging blijft de Klimmenerweg. In het contract van Voncken stonden die
-- twee door elkaar - daarom zijn het nu twee velden.
INSERT INTO "employer_settings" (
  "legal_name", "registered_address", "registered_postal_code", "registered_city",
  "work_address", "work_postal_code", "work_city", "signatories"
)
SELECT 'James Robinson B.V.', 'Klimmenerweg 8', '6336 AV', 'Hulsberg',
       'Aalbekerweg 4', '6336 AD', 'Hulsberg',
       'dhr. J. Coumans en dhr. J. Kikken'
WHERE NOT EXISTS (SELECT 1 FROM "employer_settings");
--> statement-breakpoint
-- Een eerste functieprofiel, met de motivering die in het bestaande contract
-- stond. Let op: die motivering is geschreven voor een marketing manager met
-- een eigen portefeuille. Voor een andere functie hoort er een andere tekst
-- te staan, anders valt het relatiebeding om.
INSERT INTO "job_profiles" (
  "title", "default_scale_name", "has_relation_clause", "relation_clause_motivation",
  "relation_clause_months"
)
SELECT 'Marketing Manager', 'Medior', true,
       'De werknemer vervult de functie van Marketing Manager en krijgt uit dien hoofde een eigen portefeuille opdrachtgevers onder diens verantwoordelijkheid. De werknemer is voor die opdrachtgevers het primaire aanspreekpunt en beschikt daardoor over bedrijfsgevoelige kennis die niet publiek toegankelijk is: de marketingstrategie, budgetten en resultaten per opdrachtgever, de gehanteerde tarieven en retainerafspraken, en de persoonlijke relaties met beslissers bij die opdrachtgevers. Het bedrijfsmodel van werkgever berust op langjarige partnerships in plaats van losse opdrachten; het duurzame klantenbestand is daarmee het belangrijkste bedrijfsdebiet van werkgever. Wanneer werknemer die kennis en relaties na afloop van deze overeenkomst zou aanwenden ten behoeve van zichzelf of een derde, wordt de werkgever rechtstreeks in dat bedrijfsdebiet geraakt. Werkgever heeft dit belang afgewogen tegen het belang van werknemer bij vrije arbeidskeuze en de beperking daarom begrensd tot bestaande relaties van werkgever en tot een periode van twaalf maanden.',
       12
WHERE NOT EXISTS (SELECT 1 FROM "job_profiles");
--> statement-breakpoint
-- Het sjabloon voor een arbeidsovereenkomst voor bepaalde tijd, overgenomen
-- uit de overeenkomst die James Robinson nu gebruikt.
--
-- Drie dingen zijn bewust anders dan in het origineel:
--
--  1. De verwijzingen naar artikelnummers ("het bepaalde in 15.1 en 15.2")
--     zijn vervangen door omschrijvingen. Artikelen kunnen vervallen als een
--     voorwaarde niet geldt, en dan klopt een nummer niet meer.
--  2. De motivering onder het relatiebeding is een plaatshouder geworden en
--     staat bij het functieprofiel. In het origineel stond er een tekst die
--     voor een marketing manager was geschreven.
--  3. In het origineel stond "haar verantwoordelijkheid" en "Zij is" in een
--     contract voor een man. Dat is vervangen door "de werknemer" en "diens".
INSERT INTO "contract_templates" ("name", "kind", "effective_from", "intro")
SELECT 'Arbeidsovereenkomst bepaalde tijd', 'bepaalde_tijd', '2026-01-01T00:00:00Z'::timestamptz,
       'Beste {{voornaam}},

Wat fijn dat je bij James Robinson komt werken. Hieronder staat het contract; dit zijn de belangrijkste punten op een rij.

- Je begint op {{ingangsdatum}} als {{functie}}.
- {{duur_zin}}
- Je werkt {{uren_per_week}} uur per week.
- Je bruto maandsalaris is {{salaris}} ({{schaal_trede}}), plus {{vakantietoeslag_percent}}% vakantietoeslag.
{{op_toeslag_zin}}- Je hebt recht op {{vakantie_uren}} uur vakantie per jaar.
{{proeftijd_zin}}{{relatiebeding_zin}}
Loop het rustig door en stel vooral vragen als iets niet duidelijk is. Liever nu dan later.

Met vriendelijke groet,
{{werkgever_ondertekenaars}}'
WHERE NOT EXISTS (SELECT 1 FROM "contract_templates" WHERE "kind" = 'bepaalde_tijd');
--> statement-breakpoint
INSERT INTO "contract_template_articles" ("template_id", "sort_order", "title", "body", "voorwaarde")
SELECT t.id, a.sort_order, a.title, a.body, a.voorwaarde::"artikel_voorwaarde"
FROM "contract_templates" t
CROSS JOIN (VALUES
  (1, 'Aard overeenkomst', 'Deze overeenkomst is een arbeidsovereenkomst in de zin van artikel 7:610 van het Burgerlijk Wetboek.

Deze arbeidsovereenkomst is geen oproepovereenkomst in de zin van artikel 7:628a lid 9 en 10 van het Burgerlijk Wetboek.

Op deze arbeidsovereenkomst is geen cao van toepassing. Werkgever heeft een Personeelshandboek / Bedrijfsreglement. Dit is van toepassing op de arbeidsovereenkomst. Werknemer heeft voorafgaand aan de ondertekening van deze arbeidsovereenkomst een exemplaar van het vigerend Personeelshandboek / Bedrijfsreglement ontvangen. Werknemer verklaart van de inhoud daarvan kennis te hebben genomen en het Personeelshandboek / Bedrijfsreglement te zullen naleven.', 'altijd'),
  (2, 'Ingangsdatum', 'De werknemer treedt op {{ingangsdatum}} in dienst van de werkgever.', 'altijd'),
  (3, 'Functie', 'De werknemer vervult de functie van {{functie}}.

De werkgever kan van de werknemer verlangen ook andere werkzaamheden te verrichten dan die welke tot een normale uitoefening van de functie behoren, indien en voor zover deze andere werkzaamheden redelijkerwijs van de werknemer gevergd kunnen worden.', 'altijd'),
  (4, 'Standplaats', 'De overeengekomen werkzaamheden zullen gewoonlijk in c.q. vanuit de vestiging van de werkgever aan {{werkplek_adres}}, {{werkplek_postcode}} {{werkplek_plaats}} worden verricht.

De werkgever behoudt zich het recht voor de werknemer over te plaatsen naar een andere vestiging, mocht zich deze situatie ooit voordoen.', 'altijd'),
  (5, 'Duur', 'De arbeidsovereenkomst wordt aangegaan voor bepaalde tijd, voor de duur van {{looptijd}}, ingaande op {{ingangsdatum}}. De arbeidsovereenkomst eindigt derhalve van rechtswege op {{einddatum}}, zonder dat opzegging is vereist en zonder dat daartoe toestemming van het UWV nodig is.

Partijen zijn bevoegd de arbeidsovereenkomst tussentijds op te zeggen, met inachtneming van de wettelijke opzegtermijn. Voor de procedure voor beëindiging, daarin begrepen de vereisten en de (vaststelling van de) geldende opzegtermijnen welke werkgever en/of werknemer in acht dienen te nemen, wordt verwezen naar Titel 10 van Boek 7 van het Burgerlijk Wetboek en naar het Bedrijfsreglement / Personeelshandboek.

De werkgever zal de werknemer uiterlijk één maand voor het einde van rechtswege schriftelijk informeren over het al dan niet voortzetten van de arbeidsovereenkomst en, bij voortzetting, over de voorwaarden waaronder (aanzegging conform artikel 7:668 van het Burgerlijk Wetboek).', 'bepaalde_tijd'),
  (6, 'Proeftijd', 'Voor deze arbeidsovereenkomst geldt een proeftijd van {{proeftijd}}, ingaande op de eerste dag van het dienstverband. Gedurende de proeftijd zijn zowel werkgever als werknemer bevoegd de arbeidsovereenkomst met onmiddellijke ingang te beëindigen.', 'proeftijd'),
  (7, 'Arbeidstijd', 'De arbeidsovereenkomst wordt aangegaan voor {{uren_per_week}} uur per week.

De dagen en tijden waarop de arbeid dient te worden verricht worden bepaald door de werkgever, welke daarbij, zoveel als de eisen van een goede bedrijfsvoering toelaten, rekening houdt met de wensen van de werknemer.

De werknemer werkt in beginsel de overeengekomen vaste arbeidsduur per week. De werknemer is tevens bereid om extra uren te werken indien de werkgever hierom verzoekt. Eventueel meer gewerkte uren worden of in geld of in verlof (tijd voor tijd) vergoed tegen 100%, een en ander in overleg tussen werkgever en werknemer, en voor zover de tijd-voor-tijd-regeling wettelijk is toegestaan.', 'altijd'),
  (8, 'Salaris', 'Het salaris bedraagt ten tijde van het aangaan van de overeenkomst bruto {{salaris}} per maand ({{schaal_trede}}) bij een arbeidsduur van {{uren_per_week}} uur per week, exclusief {{vakantietoeslag_percent}}% vakantietoeslag.

Het netto salaris zal maandelijks tegen het einde van de maand uitbetaald worden op een door de werknemer aan te wijzen bank- of postrekening.

De werknemer stemt ermee in dat de loonstrook door de werkgever op elektronische wijze kan worden verstrekt.', 'altijd'),
  (9, 'Arbeidsongeschiktheid', 'In geval van arbeidsongeschiktheid dient de werknemer dit vóór aanvang van de arbeidstijd bij de werkgever te melden.

De werknemer is verplicht zich te onderwerpen aan de controlevoorschriften ter zake van ziekteverzuim, welke door of namens de werkgever zijn of zullen worden vastgesteld.

Bij arbeidsongeschiktheid geldt de wettelijke loondoorbetalingsverplichting. Gedurende de 1e 52 weken bedraagt dit 100% van het bruto loon waarbij het loon niet lager mag zijn dan het voorgeschreven minimumloon. Gedurende de 2e 52 weken bedraagt de loondoorbetalingsverplichting 70% zonder de ondergrens van het minimumloon. Ziektegevallen welke elkaar opvolgen binnen 4 weken worden als één ziektegeval beschouwd.

Bij niet-nakoming van de controlevoorschriften is de werkgever bevoegd tot opschorting van de betaling van het loon op grond van het bepaalde in artikel 7:629 lid 6 van het Burgerlijk Wetboek.', 'altijd'),
  (10, 'Vakantie', 'Aan de werknemer wordt een recht op vakantie met behoud van salaris toegekend naar evenredigheid van het aantal gewerkte uren. Uitgangspunt daarbij is een recht op vakantie bij een fulltime dienstbetrekking van {{vakantiedagen_fulltime}} dagen ({{vakantie_uren_fulltime}} uur) per kalenderjaar. Bij een arbeidsduur van {{uren_per_week}} uur per week komt dit neer op {{vakantie_uren}} uur vakantie per kalenderjaar.

Werknemer heeft, onverminderd de verlofaanspraken uit hoofde van deze arbeidsovereenkomst, recht op de vormen van verlof zoals genoemd in de Wet arbeid en zorg, indien en voor zover door werknemer voldaan wordt aan de voorwaarden die deze wet (en/of een toekomstige vervangende regeling van deze wet) daaraan stelt. De rechten van werknemer op overig betaald en onbetaald verlof staan vermeld in het Personeelshandboek / Bedrijfsreglement.', 'altijd'),
  (11, 'Vakantietoeslag', 'Aan de werknemer zal {{vakantietoeslag_percent}}% van het bruto salaris als vakantietoeslag worden uitgekeerd.

De betaling van de vakantietoeslag lopende over de periode van 1 juni tot en met 31 mei zal plaatsvinden in de maand mei.', 'altijd'),
  (12, 'Beëindiging', 'Bij beëindiging van de arbeidsovereenkomst zal verrekening van te veel dan wel te weinig opgenomen vakantiedagen en te veel dan wel te weinig uitbetaalde vakantietoeslag geschieden door inhouding op dan wel uitbetaling bij het laatste maandsalaris.', 'altijd'),
  (13, 'Pensioen', 'Er is geen pensioenregeling overeengekomen. De werknemer ontvangt ter compensatie een bruto OP-toeslag van {{op_toeslag_percent}}% over het vaste bruto maandloon, t.w.v. bruto {{op_toeslag_bedrag}} per maand. Over de OP-toeslag wordt geen vakantiegeld uitbetaald. Indien in de toekomst een pensioenregeling wordt overeengekomen, dan komt deze OP-toeslag te vervallen.', 'op_toeslag'),
  (14, 'Geheimhouding', 'De werknemer erkent dat aan de werknemer door de werkgever geheimhouding is opgelegd van alle bijzonderheden van het bedrijf van de werkgever en de cliënten van de werkgever betreffende, of daarmee verband houdende.

Het is aan de werknemer verboden om hetzij tijdens de duur van de arbeidsovereenkomst, hetzij erna op enigerlei wijze, direct of indirect in welke vorm ook, mededelingen te doen van of aangaande het bedrijf van de werkgever alsmede van of aangaande de cliënten van de werkgever.

Bij overtreding van de in dit artikel vervatte verboden verbeurt de werknemer aan de werkgever een dadelijk en ineens zonder sommatie of ingebrekestelling opeisbare boete van € 1.750,00 voor elke overtreding, zonder dat de werkgever gehouden zal zijn schade te bewijzen en onverminderd het recht van de werkgever om in plaats van deze boete een schadevergoeding te eisen.', 'altijd'),
  (15, 'Verbod van nevenwerkzaamheden', 'Het is de werknemer verboden gedurende de loop van de arbeidsovereenkomst nevenwerkzaamheden te verrichten voor een andere werkgever of opdrachtgever, direct of indirect, en zaken te doen of diensten te verlenen voor eigen rekening (al dan niet tegen vergoeding), behoudens voorafgaande schriftelijke toestemming van de werkgever. De werkgever zal deze toestemming niet onthouden, tenzij daarvoor een objectieve rechtvaardigingsgrond bestaat.

Indien de werknemer arbeidsongeschikt wordt als gevolg van nevenwerkzaamheden die op grond van dit artikel zijn verboden, zal de werkgever gerechtigd zijn de arbeidsovereenkomst op die grond te doen eindigen althans zal de werkgever op grond van wanprestatie van de werknemer niet gehouden zijn tot doorbetaling van loon.', 'altijd'),
  (16, 'Relatiebeding', 'Het is werknemer niet toegestaan om gedurende een periode van {{relatiebeding_maanden}} maanden na het einde van de arbeidsovereenkomst op enige wijze zakelijke betrekkingen aan te gaan of te onderhouden met (voormalige) relaties van werkgever, behoudens de voorafgaande schriftelijke toestemming van de werkgever, ongeacht op wiens initiatief deze betrekkingen en/of contacten tot stand zijn gekomen. Van een dergelijke relatie is sprake als werkgever in het jaar voorafgaande aan de beëindiging van deze overeenkomst zakelijke contacten met deze relatie heeft onderhouden, dan wel getracht heeft deze tot stand te doen komen. Tijdens het dienstverband is het ook niet toegestaan om voor eigen rekening of in een dienstverband elders contacten te onderhouden met, dan wel diensten te leveren aan, klanten van de werkgever.

Werkgever acht dit beding noodzakelijk vanwege de volgende zwaarwegende bedrijfsbelangen. {{relatiebeding_motivering}}

Bij overtreding van het in dit artikel bepaalde verbeurt de werknemer aan de werkgever een dadelijk en ineens zonder sommatie of ingebrekestelling opeisbare boete van € 2.500,00 per overtreding en € 250,00 voor elke dag dat de overtreding voortduurt, zonder dat de werkgever gehouden zal zijn schade te bewijzen, onverminderd het recht van de werkgever om in plaats van deze boete een schadevergoeding te eisen.', 'relatiebeding'),
  (17, 'Bestemming boetes', 'De in deze overeenkomst opgenomen boetes komen ten goede aan de werkgever.

Als de boete ziet op een niet-nakoming van het relatiebeding, dan is deze rechtstreeks aan de werkgever verschuldigd en strekt deze tot persoonlijk voordeel. Hiermee wordt uitdrukkelijk afgeweken van artikel 7:650 lid 3-5 BW.', 'altijd'),
  (18, 'Intellectueel eigendomsbeding', 'Alle (intellectuele eigendoms)-rechten vallen op basis van de Auteurswet exclusief en in onverdeelde eigendom van werkgever. Werknemer is gehouden om mee te werken aan het overdragen van de auteursrechten aan de werkgever, van alle werken die zijn ontstaan, bedacht, vervaardigd of anderszins tot stand zijn gekomen bij de uitvoering van de werkzaamheden door werknemer onder deze overeenkomst. Dit gaat om behaalde resultaten die alleen of in samenwerking met anderen tot stand zijn gekomen in het kader van de arbeidsovereenkomst. Dergelijke resultaten omvatten ook werken die niet behoorden tot de bedongen werkzaamheden van de werknemer.', 'altijd'),
  (19, 'Sociale zekerheid en verzekeringen', 'De werknemer is verzekerd tegen arbeidsongeschiktheid (WGA), werkloosheid (WW), ziekte (Zw) en ontvangt een uitkering gedurende zwangerschaps-/bevallingsverlof (WAZO) en betaald ouderschapsverlof.

De eventuele premies voor deze verzekeringen worden door de werkgever betaald aan de Belastingdienst / UWV en ingehouden op het bruto loon van de werknemer.

Werkgever heeft ten behoeve van werknemer een ziekteverzuimverzekering en een bedrijfsongevallenverzekering afgesloten en, indien noodzakelijk, een beroepsaansprakelijkheidsverzekering. De premies worden door werkgever voldaan.', 'altijd'),
  (20, 'Algemene Verordening Gegevensbescherming', 'Vanuit de Algemene Verordening Gegevensbescherming (AVG) draagt de werkgever de informatieverplichting jegens werknemer over de verwerking van de persoonsgegevens van werknemer.

Werkgever heeft, in hetgeen gesteld wordt in het vorige lid van dit artikel, een verklaring opgesteld waarmee werkgever voldoet aan haar verplichting jegens werknemer op het gebied van de AVG (hierna: AVG-verklaring).

Werkgever legt de AVG-verklaring (als bijlage bij deze Overeenkomst) voor aan werknemer.

Werknemer dient deze AVG-verklaring in te vullen en te ondertekenen, en levert deze in voor de datum van indiensttreding bij werkgever.', 'altijd'),
  (21, 'Overige afspraken', 'Aan de werknemer wordt een budget toegekend van € 100,00 per jaar voor vrijetijdsbesteding bij klanten van James Robinson. Dit bedrag kan achteraf bij werkgever worden gedeclareerd.', 'vrijetijdsbudget'),
  (22, 'Aanvullende afspraken bij deze functie', '{{extra_afspraken}}', 'extra_afspraken'),
  (23, 'Afwijkingen en aanpassingen', 'Deze arbeidsovereenkomst wordt geacht een volledige weergave te bevatten van de afspraken ter zake tussen partijen, zoals die bestaan op het moment van de ondertekening van de overeenkomst.

Aanvullingen op, en afwijkingen van deze arbeidsovereenkomst zullen alleen geldig zijn indien en voor zover zij schriftelijk tussen partijen zijn overeengekomen, of schriftelijk door de werkgever zijn bevestigd.

De werknemer gaat akkoord met het personeelshandboek en eventuele wijzigingen/uitbreidingen die in de toekomst worden doorgevoerd in desbetreffende handboek.', 'altijd'),
  (24, 'Eenzijdig wijzigingsbeding', 'De in deze overeenkomst van werkgever opgenomen (arbeids-)voorwaarden kunnen binnen de grenzen van redelijkheid door werkgever eenzijdig gewijzigd worden, indien de omstandigheden daartoe naar zijn oordeel aanleiding geven.

Werknemer verplicht zich medewerking te verlenen aan voorstellen van werkgever die verband houden met gewijzigde werk- en/of bedrijfsomstandigheden, tenzij aanvaarding van die voorstellen in redelijkheid niet van werknemer kan worden gevraagd.

In geval dat enige bepaling van deze overeenkomst door de bevoegde rechter nietig of anderszins onverbindend wordt verklaard, blijven de overige bepalingen van deze overeenkomst onverkort van kracht. Partijen zullen zich inspannen de nietig verklaarde bepaling te vervangen door een geldende bepaling, welke zoveel mogelijk bij de nietig verklaarde bepaling zal aansluiten.', 'altijd'),
  (25, 'Toepasselijk recht / bevoegde rechter', 'Op deze arbeidsovereenkomst is het Nederlandse recht bij uitsluiting van ieder ander rechtsstelsel van toepassing.

De Nederlandse rechter is bij uitsluiting van ieder ander bevoegd tot beslechting van geschillen voortvloeiend uit deze overeenkomst.', 'altijd'),
  (26, 'Verstrekking kopie arbeidsovereenkomst', 'Door ondertekening van deze overeenkomst verklaart de werknemer een kopie van deze overeenkomst en het vigerende Personeelshandboek / Bedrijfsreglement te hebben ontvangen.', 'altijd')
) AS a(sort_order, title, body, voorwaarde)
WHERE t."kind" = 'bepaalde_tijd'
  AND NOT EXISTS (SELECT 1 FROM "contract_template_articles" x WHERE x."template_id" = t.id);
