# James Robinson Wallet

Klantportaal waarin klanten hun marketingbudget zien: wat er is bijgeschreven,
waar het aan is besteed en wat er over is. Werkt als een bankafschrift, niet als
een urenteller.

---

## Wat het is

**Een klant** logt in en ziet:

- **Zijn saldo** — beschikbaar budget, groot bovenaan
- **Het afschrift** — bij- en afschrijvingen per maand, met het saldo na elke
  regel. Bijvoorbeeld "Social media post — € 300,00", niet "3 uur × € 100"
- **Waar het budget naartoe ging** — verdeeld over productgroepen
- **Zijn facturen** — de bijschrijvingen die het budget hebben opgebouwd

**Het JR-team** heeft een beheerdeel met vijf schermen:

| Scherm | Wat je er doet |
|---|---|
| Klanten | Klant openen, dienst afboeken, factuur aanmaken, boeking corrigeren, wallets en klanttoegang beheren |
| Diensten | De catalogus: wat we leveren, wat het kost, wat de kostprijs is |
| Financieel | Omzet, marge en budget — overall, per klant, per medewerker, per dienst |
| Team | Collega's toevoegen, en zien wat ieder heeft geleverd |
| Sync | Status van de ClickUp-koppeling |

## De vijf posttypes

```
klant (organizations)        het bedrijf
diensten (services)          de catalogus met tarieven
abonnementen (subscriptions) doorlopend, verhogen maandelijks het budget
facturen (invoices)          bouwen het budget op
boekingen (ledger_entries)   geleverde diensten, gaan van het budget af
```

**Abonnement → maandelijks budget.** Zolang een abonnement loopt, wordt op de
facturatiedag (standaard de 2e, zoals de Moneybird-facturen) een factuur
aangemaakt en het maandbedrag als budget bijgeschreven. De run draait elke
ochtend en kijkt zelf welke maanden nog openstaan, dus een gemiste dag wordt
ingehaald. **Dubbel factureren is onmogelijk:** op de facturen staat een unieke
index op (abonnement, periode), dus de database weigert een tweede factuur voor
dezelfde maand — ook als de run twee keer of gelijktijdig draait.

**Factuur → budget.** Een factuur van € 1.000 exclusief btw betekent € 1.000
budget in de wallet. Factuur en bijschrijving worden in ÉÉN transactie
aangemaakt, dus ze kunnen niet uit elkaar lopen. Let op: het budget komt
beschikbaar bij *factureren*, niet bij *betalen* — een klant kan dus budget
opmaken dat nog niet betaald is. De betaalstatus staat in het beheer en op het
financiële overzicht.

**Dienst → afschrijving.** Kies een dienst, vul het aantal in, en het bedrag
volgt uit het tarief. 3 × "Social media post" van € 100 wordt € 300 van het
budget af. Het bedrag wordt op de server berekend, nooit meegestuurd door de
browser.

## De drie regels waar het systeem op staat

Deze zijn niet cosmetisch: ze zitten in het datamodel en de database dwingt ze af.

**1. Het grootboek is append-only.**
Een boeking wordt nooit gewijzigd of verwijderd. Een fout corrigeer je met een
tegenboeking die naar het origineel verwijst. De klant ziet beide regels plus de
reden. Als het saldo van een klant morgen anders is dan gisteren, is altijd te
zien waarom.

**2. Elke boeking die het saldo raakt, ziet de klant.**
Er is geen manier om een boeking te verbergen. Daardoor telt het afschrift altijd
exact op tot het saldo dat erboven staat. Moet iets niet naar de klant, dan hoort
het niet in de wallet.

**3. Geld is altijd een integer aantal centen.**
Nooit floats — `0.1 + 0.2` is in binaire floats niet `0.3`. Het omzetten van
getypte bedragen naar centen gebeurt volledig met integers, zonder tussenstap via
een float. Zie `src/lib/money.ts`.

**4. Een boeking legt het tarief van dat moment vast.**
Verhoog je "Social media post" van € 100 naar € 120, dan blijven boekingen van
vorig jaar op € 100 staan en verandert geen enkel saldo. Hetzelfde geldt voor de
kostprijs, zodat de marge van vorig kwartaal niet verschuift als je een
inkoopprijs bijwerkt.

## Techniek

Bewust saai gekozen, zodat dit over een jaar nog te onderhouden is.

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Framework | Next.js 16 (App Router) | Eén codebase voor front- en backend |
| Taal | TypeScript, strict | Fouten vóór productie, niet erna |
| Database | Postgres + Drizzle ORM | Migraties zijn leesbare SQL-bestanden |
| Inloggen | E-maillink, geen wachtwoord | Geen wachtwoord-reset, dus minder support |
| E-mail | Resend via `fetch` | Geen sdk die meegroeit met dingen die we niet gebruiken |
| Styling | Tailwind met JR-huisstijl als tokens | Kleuren op één plek, nergens hardcoded |
| Tests | `node:test` | Zit in Node, geen testframework om te onderhouden |

## Aan de slag

Stap voor stap, inclusief live zetten: **[SETUP.md](SETUP.md)**.

Kort samengevat, lokaal:

```bash
npm install
docker compose up -d      # Postgres
npm run setup             # instellingen, tabellen, voorbeelddata, inloglinks
npm run dev
```

`npm run setup` print twee inloglinks: één als beheerder, één als klant.

Zonder `RESEND_API_KEY` wordt er geen mail verstuurd. Een inloglink maak je dan zo:

```bash
npm run login:link -- demo-klant@voorbeeld.nl
```

### Commando's

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` | Productiebuild |
| `npm run typecheck` | TypeScript zonder build |
| `npm test` | Alle tests |
| `npm run db:generate` | Migratie maken na een schemawijziging |
| `npm run db:migrate` | Migraties uitvoeren |
| `npm run db:seed` | Voorbeelddata (niet in productie) |
| `npm run login:link -- <email>` | Inloglink printen |
| `npm run billing` | Abonnementsrun als proefronde |
| `npm run billing -- --apply` | Abonnementsrun echt uitvoeren |
| `npm run setup` | Alles in één keer klaarzetten (lokaal) |
| `npm run db:reset` | Database leeg en opnieuw vullen (alleen lokaal) |
| `npm run sync:clickup -- ...` | ClickUp-sync, zie hieronder |

## Datamodel

```
organizations   klanten
users           klantcontactpersonen (client) en het JR-team (staff/admin)
login_tokens    eenmalige inloglinks, opgeslagen als hash
wallets         een klant kan meerdere wallets hebben
services        de dienstencatalogus met tarieven en kostprijzen
subscriptions   doorlopende abonnementen met een maandbedrag
ledger_entries  de boekingen — append-only
invoices        facturen die het budget opbouwen
sync_runs       geschiedenis van de ClickUp-sync
```

Een boeking van een dienst bewaart naast het bedrag ook: welke dienst, hoeveel
(in honderdsten, zodat 1,5 uur kan), het tarief van dat moment, de kostprijs van
dat moment, en wie de dienst heeft geleverd. Die laatste is de basis voor het
overzicht per medewerker en is iets anders dan wie de boeking invoerde.

Het **saldo is nooit een kolom**, altijd een som over `ledger_entries`. Een
saldo-kolom raakt op een dag uit sync met de boekingen, en dan weet je niet meer
welke van de twee liegt.

`ledger_entries.amount_cents` heeft een teken: positief is bijschrijven, negatief
is afschrijven. Het saldo is `SUM(amount_cents)`.

### Wat de database afdwingt

| Constraint | Betekenis |
|---|---|
| `sign_matches_kind` | Een bijschrijving is positief, een afschrijving negatief |
| `amount_not_zero` | Geen boekingen van € 0,00 |
| `only_corrections_reverse` | Alleen een correctie mag naar een eerdere boeking verwijzen |
| `ledger_source_ref_idx` | Dezelfde ClickUp-taak kan niet twee keer worden afgeboekt |
| `quantity_positive` | Een aantal is altijd groter dan nul |
| `service_needs_quantity_and_price` | Staat er een dienst op een boeking, dan horen aantal en tarief erbij — anders is het bedrag niet na te rekenen |
| `service_price_positive` | Een dienst heeft een tarief boven nul |
| `invoices_subscription_period_idx` | Een abonnement kan per maand maar één factuur hebben |
| `subscription_needs_period` | Een abonnementsfactuur heeft altijd een periode, een losse factuur nooit |
| `subscription_billing_day_valid` | Facturatiedag tussen 1 en 28, zodat de dag in elke maand bestaat |
| `subscription_ends_after_start` | Een einddatum ligt niet voor de startdatum |
| FK abonnement op factuur (`RESTRICT`) | Een abonnement met facturen kan niet verwijderd worden — zet het op 'ended' |
| `client_needs_org` | Een klantgebruiker hoort altijd bij een organisatie |
| FK met `ON DELETE RESTRICT` | Een wallet met boekingen kan niet worden verwijderd |

Correcties tellen mee bij de soort boeking die ze terugdraaien. Een correctie op
een besteding is een positief bedrag, maar geldt niet als bijgeschreven budget —
anders zouden "bijgeschreven" en "besteed" te hoog uitvallen terwijl het saldo
klopt.

## ClickUp-sync

Haalt factureerbare taken uit ClickUp en boekt ze af.

**Wat wordt afgeboekt:** taken waarvan `Facturatie` op *Factureerbaar*, *Naar
Moneybird* of *Gefactureerd* staat. Het bedrag komt uit `Verkoopfactuur`, en als
die leeg is uit `Advies`. De boekdatum is de dag dat het werk klaar was, niet
vandaag.

**Wat niet:** taken op *Open* (het bedrag staat nog niet vast) en op *Niet
factureerbaar* (het werk valt binnen het abonnement).

**De sync voegt alleen toe.** Hij wijzigt en verwijdert nooit een bestaande
boeking. Verandert een taak in ClickUp nadat hij is afgeboekt, dan corrigeer je
dat met de hand in het beheerscherm. Anders verandert een klantsaldo vanzelf en
kan niemand meer uitleggen waarom.

Eerst een proefronde — die verandert niets:

```bash
npm run sync:clickup -- --org=klant-slug --lists=901512499356
```

Klopt het rapport? Dan pas echt:

```bash
npm run sync:clickup -- --org=klant-slug --lists=901512499356 --apply
```

De mapping-regels staan in `src/lib/clickup/mapping.ts` en zijn los getest in
`src/lib/__tests__/mapping.test.ts`. Wil je de regel veranderen (bijvoorbeeld
`Offerte` in plaats van `Verkoopfactuur`), dan pas je daar één functie aan.

## De maandelijkse abonnementsrun

Draait via Vercel Cron elke ochtend om 6:00 op `/api/cron/billing`
(zie `vercel.json`). Het endpoint weigert elke aanvraag zonder het juiste
`CRON_SECRET`; zonder dat geheim in de omgeving gaat de deur op slot, niet open.

Drie eigenschappen die er niet uit mogen:

1. **Dubbel factureren is onmogelijk** — de unieke index op
   (abonnement, periode) weigert een tweede factuur, ook bij twee runs tegelijk.
2. **De run haalt in** — hij kijkt welke maanden nog openstaan, dus een dag
   uitval betekent geen gemiste maand. Bij meer dan 12 maanden achterstand
   stopt hij en meldt dat, in plaats van stil een jaar te factureren.
3. **Factuur en budget gaan samen** — beide in één transactie.

Let op het factuurnummer: **Moneybird maakt de echte factuur.** Dit systeem
maakt een intern nummer (`ABO-JJJJ-MM`) zodat het budget herleidbaar is. Het
echte nummer kan later in `moneybird_id`; die koppeling is nog niet gebouwd.

Zelf draaien:

```bash
npm run billing              # proefronde, verandert niets
npm run billing -- --apply   # echt factureren
npm run billing -- --datum=2026-03-02 --apply   # op een andere peildatum
```

## Naar productie

**Database:** Neon of Supabase (Postgres). Zet de connection string in
`DATABASE_URL` en draai `npm run db:migrate`.

**Hosting:** Vercel. Importeer de repo en zet deze omgevingsvariabelen:

```
DATABASE_URL, AUTH_SECRET, APP_URL, RESEND_API_KEY, MAIL_FROM,
CLICKUP_API_TOKEN, ADMIN_EMAILS
```

**E-mail:** Resend, met `jamesrobinson.nl` als verifieerd domein zodat inlogmails
niet in de spam belanden.

**Eerste beheerder:** zet je e-mailadres in `ADMIN_EMAILS` en draai `db:seed`, of
voeg de rij met de hand toe:

```sql
INSERT INTO users (email, role) VALUES ('jim@jamesrobinson.nl', 'admin');
```

**Onderhoud:** ruim verlopen inloglinks periodiek op met `pruneLoginTokens()` uit
`src/lib/auth.ts`.

## Beveiliging

- Inloglinks zijn 15 minuten geldig, werken één keer, en staan alleen als
  SHA-256 hash in de database
- Maximaal 5 aanvragen per e-mailadres per uur
- Geen zelfregistratie: het JR-team voegt klanten toe
- Een onbekend e-mailadres krijgt exact dezelfde bevestiging als een bekend
  adres, zodat je via het inlogformulier niet kunt uitvissen wie klant is
- De ingelogde gebruiker wordt bij elke aanvraag uit de database gelezen, dus
  het intrekken van toegang werkt direct
- Klanten kunnen alleen bij hun eigen organisatie; een gegokt wallet-id in de
  URL valt terug op hun eigen wallet
- Rollen: `client` ziet alleen zijn eigen organisatie, `staff` en `admin` zien
  alle klanten, en alleen een `admin` kan nieuwe beheerders toevoegen
- Je kunt je eigen beheertoegang niet intrekken, zodat er altijd iemand binnen kan
- Kostprijzen en marges zijn nooit zichtbaar voor klanten
- Het portaal staat op `noindex` en mag niet in een frame

## Kleuren in overzichten

De kleurenreeks voor categorieën staat in `src/lib/chart-colors.ts` en is
gevalideerd op leesbaarheid, niet op gevoel gekozen: lichtheid, kleurverzadiging,
onderscheid bij kleurenblindheid en contrast. **De volgorde is onderdeel van die
validatie** — kleuren omwisselen of toevoegen betekent opnieuw valideren.

Rood, oranje en groen zitten er bewust niet in: die hebben in deze app
statusbetekenis (negatief saldo, budget raakt op, bijschrijving) en mogen daarom
geen categorie aanduiden.

## Wat nog niet af is

- **Koppeling tussen ClickUp-lijsten en klanten.** De sync werkt nu per klant
  met `--org=` en `--lists=`. Automatisch bepalen bij welke klant een lijst hoort
  vraagt om het doorlopen van de folder-structuur in ClickUp.
- **Moneybird.** Dit systeem maakt eigen factuurnummers; het echte nummer uit
  Moneybird koppelen kan via `invoices.moneybird_id`, maar die koppeling is er
  nog niet. Nu is het handwerk of een aparte controle.
- **De interface.** De schermen zetten nu veel tegelijk in beeld. Richting
  Mollie/Stripe/Revolut betekent: meer witruimte, één actie per scherm,
  formulieren in een zijpaneel in plaats van altijd zichtbaar. Dat is een
  herindeling, geen kleurenkwestie.
- **Campagneresultaten** naast het budget (Google Ads, Meta, Analytics).
- **Signaal bij een laag saldo.** De drempel staat in het datamodel en de klant
  ziet een melding, maar er gaat nog geen mail uit.
- **Btw.** De wallet rekent met bedragen exclusief btw. Facturen bewaren de btw
  apart.
- **Diensten per klant.** Er is één catalogus voor alle klanten. Klantspecifieke
  tarieven kunnen nu per boeking als afwijkend tarief.
- **Meerdere diensten in één boeking.** Elke boeking is nu één dienst. Een
  factuurregel met meerdere posten wordt meerdere boekingen.

---

James Robinson — Marketing & Branding | www.jamesrobinson.nl
