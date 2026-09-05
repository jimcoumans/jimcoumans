# James Robinson Wallet

Klantportaal waarin klanten hun marketingbudget zien: wat er is bijgeschreven,
waar het aan is besteed en wat er over is. Werkt als een bankafschrift, niet als
een urenteller.

---

## Wat het is

Een klant logt in en ziet:

- **Zijn saldo** — beschikbaar budget, groot bovenaan
- **Het afschrift** — bij- en afschrijvingen per maand, met het saldo na elke
  regel. Bijvoorbeeld "Website wijzigingen — € 122,50", niet "2,45 uur × € 50"
- **Waar het budget naartoe ging** — verdeeld over productgroepen
- **Zijn facturen** — de bijschrijvingen die het budget hebben opgebouwd

Het JR-team heeft een beheerscherm om te boeken, te corrigeren, wallets aan te
maken en klanten toegang te geven.

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

## Lokaal opzetten

```bash
npm install
cp .env.example .env.local        # vul DATABASE_URL en AUTH_SECRET in
npm run db:migrate                # tabellen aanmaken
npm run db:seed                   # voorbeelddata
npm run dev
```

`AUTH_SECRET` genereer je met `openssl rand -base64 32`.

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
| `npm run sync:clickup -- ...` | ClickUp-sync, zie hieronder |

## Datamodel

```
organizations   klanten
users           klantcontactpersonen (client) en het JR-team (staff/admin)
login_tokens    eenmalige inloglinks, opgeslagen als hash
wallets         een klant kan meerdere wallets hebben
ledger_entries  de boekingen — append-only
invoices        facturen die het budget opbouwen
sync_runs       geschiedenis van de ClickUp-sync
```

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
- Het portaal staat op `noindex` en mag niet in een frame

## Wat nog niet af is

- **Koppeling tussen ClickUp-lijsten en klanten.** De sync werkt nu per klant
  met `--org=` en `--lists=`. Automatisch bepalen bij welke klant een lijst hoort
  vraagt om het doorlopen van de folder-structuur in ClickUp.
- **Moneybird.** Facturen worden nu met de hand of via de sync ingevoerd. Het
  veld `invoices.moneybird_id` staat er al klaar voor.
- **Campagneresultaten** naast het budget (Google Ads, Meta, Analytics).
- **Signaal bij een laag saldo.** De drempel staat in het datamodel en de klant
  ziet een melding, maar er gaat nog geen mail uit.
- **Btw.** De wallet rekent met bedragen exclusief btw. Facturen bewaren de btw
  apart.

---

James Robinson — Marketing & Branding | www.jamesrobinson.nl
