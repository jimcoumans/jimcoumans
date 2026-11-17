# James & Co. — V1

Persoonlijke concierge met een eigen operationeel systeem, plus The James Society
als ledenprogramma. De klant koopt het resultaat en de verantwoordelijkheid; de
software maakt de uitvoering overzichtelijk, herhaalbaar en controleerbaar.

Deze app staat bewust los van de James Robinson Wallet in de rest van deze
repository: eigen `package.json`, eigen database, eigen deploy.

## Wat er staat

| Deel | Routes | Kern |
|---|---|---|
| Publieke site (NL) | `/`, `/service`, `/how-it-works`, `/membership`, `/society`, `/contact`, `/privacy`, `/terms` | Copy uit de briefing. Prijs "op aanvraag", geen verzonnen reviews/logo's/schaarste |
| Visitor (EN) | `/visiting-the-netherlands` | Zelfde aanvraagbackend, `segment = international_visitor` |
| Aanmelden | `/apply`, `/invite/[token]` | Geverifieerde e-mail, beoordeling, uitnodiging met verwijzer onthullen |
| Inloggen | `/login`, `/login/verify` | Eenmalige e-maillink, sessies in de database, generieke respons |
| Onboarding | `/onboarding` | Status, aanbod met prijs en voorwaarden, acceptatie van exact die versie |
| Ledenportaal | `/app/*` | Verzoeken, berichten, voorstellen, akkoord, boekingen, Society, profiel, lidmaatschap, uitnodigen |
| Cockpit | `/ops/*` | Werkvoorraad met werkbakken, dossiers, leveranciers, taken, tijd, Society, facturatie, rapportage, instellingen |

Statusmachines, rollen en privacyregels: [`docs/ARCHITECTUUR.md`](docs/ARCHITECTUUR.md).
Meetdefinities: [`docs/METEN.md`](docs/METEN.md). Status per acceptatiecriterium:
[`docs/OPLEVERING.md`](docs/OPLEVERING.md).

## Stack en afwijkingen van de briefing

- **Next.js 16.3.4, React 19, TypeScript, Tailwind 3** — dezelfde versies als de
  Wallet in deze repo, zodat één team één set versies onderhoudt.
- **Postgres + eigen auth in plaats van Supabase.** De briefing stelt Supabase voor
  "of behoud de bestaande stack waar praktisch". De bestaande stack is gewone
  Postgres met eigen magic-link-login. Daar blijven we bij, met:
  - Row Level Security op alle tabellen, afgedwongen door een niet-eigenaar-rol
    (`jc_app`) die per transactie `jc.user_id` krijgt. Tests draaien als gewone
    gebruikers, niet met een alles-mogende sleutel.
  - Werkt op elke Postgres ≥ 15: lokaal, Neon, of een Supabase-project als database.
- **Geen ORM.** `postgres` (postgres.js) met getypte, geparametriseerde SQL. Minder
  lagen tussen code en de RLS-regels die je moet kunnen lezen.
- **Staff-MFA met TOTP** zit erin (verplicht in productie).

## Lokaal opzetten

Vereist: Node 22, Postgres 15+ (bijvoorbeeld via Docker).

```bash
cd james-co
npm install
cp .env.example .env.local            # vul SESSION_SECRET (openssl rand -base64 32)
# Postgres op poort 5444, bijvoorbeeld:
docker run -d --name jamesco-db -p 5444:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
createdb -h localhost -p 5444 -U postgres jamesco
npm run db:migrate                    # schema + RLS + inlogrol uit DATABASE_URL
npm run staff:add -- jij@example.com "Jouw Naam" admin
npm run dev                           # http://localhost:3100
```

Zonder e-mailprovider gaan inloglinks lokaal naar `.dev-mailbox/mail.jsonl`
(gitignored), nooit naar de serverlog. Staff stelt bij de eerste login
tweestapsverificatie in met een authenticator-app.

### Demo-omgeving

Een aparte database met `APP_ENV=demo`. Alle gegevens zijn herkenbaar fictief
(`(fictief)` in namen, `example.com`, `is_demo = true`), en er staat een banner
op elke pagina. De seed weigert te draaien bij een andere `APP_ENV`.

```bash
APP_ENV=demo npm run db:seed:demo
```

Accounts: `admin@example.com`, `concierge@example.com` (staff), `anna@example.com`,
`bas@example.com` (leden). Er is geen publieke demo-login en geen gedeeld wachtwoord.

## Testen

```bash
cp .env.test.example .env.test   # database-naam moet op _test eindigen
createdb -h localhost -p 5444 -U postgres jamesco_test
npm test                         # unit + integratie (RLS, races, statusmachines)
npm run typecheck && npm run lint && npm run build
APP_ENV=demo npm run db:seed:demo && npm run e2e   # browser: volledige keten
```

## Deploy (nog niet uitgevoerd)

1. Eigen productiedatabase; `DATABASE_ADMIN_URL` alleen in de buildstap voor migraties.
2. `DATABASE_URL` met de inlogrol die `db:migrate` aanmaakt (geen eigenaar/superuser).
3. `APP_ENV=production`, `APP_URL` = het geregistreerde domein, `SESSION_SECRET`, e-mailprovider.
4. Bouwcommando: `npm run db:migrate && npm run build`; start: `npm start`.
5. Eerste admin via `npm run staff:add`. Back-ups en herstelprocedure van de database inrichten.

Er is niets gepubliceerd, verstuurd of afgerekend. Zie `docs/OPLEVERING.md` voor
wat vóór livegang nog van de ondernemer nodig is.
