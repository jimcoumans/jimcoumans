# Aan de slag

Twee manieren om de Wallet te gebruiken. Route A is het snelst om even door te
klikken, route B geeft je een echte URL die op al je devices werkt.

---

## A. Lokaal op je Mac (± 5 minuten)

**Nodig:** [Node 22 of hoger](https://nodejs.org) en
[Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/jimcoumans/jimcoumans.git jr-wallet
cd jr-wallet
git checkout claude/code-cloud-sync-c0tb9v

npm install
docker compose up -d      # start Postgres
npm run setup             # instellingen, tabellen, voorbeelddata
npm run dev
```

`npm run setup` print aan het eind twee inloglinks: één als beheerder en één
als klant. Open die in je browser en je bent binnen — geen wachtwoord.

Werkt een link niet meer (ze zijn 15 minuten geldig en werken één keer), maak
dan een nieuwe:

```bash
npm run login:link -- jim@jamesrobinson.nl
npm run login:link -- demo-klant@voorbeeld.nl
```

**Geen Docker?** Maak dan een gratis database bij [Supabase](https://supabase.com) of [Neon](https://neon.tech) en
zet die connection string in `.env.local` als `DATABASE_URL`. Daarna
`npm run setup`.

**Opnieuw beginnen** met verse voorbeelddata: `npm run db:reset`

---

## B. Live op internet (± 15 minuten)

Dan kun je het op je telefoon, iPad en laptop gebruiken, en kunnen klanten en
collega's echt inloggen.

Je hebt drie dingen nodig: een database, een plek om te hosten, en iets dat
mail verstuurt (de inloglinks gaan per mail). Hieronder staat de route via
**Supabase en Netlify**. Neon en Vercel werken net zo goed — de app praat
gewoon Postgres en is een gewone Next.js-app. Wat de een kan, kan de ander.

### 1. Database bij Supabase

1. Ga naar [supabase.com](https://supabase.com) → **New project**
2. Naam `jr-wallet`, regio **Central EU (Frankfurt)** — hier komen
   klantgegevens in te staan, die houd je in Europa
3. Bewaar het databasewachtwoord dat je invult; je ziet het daarna niet meer
4. Ga naar **Project Settings → Database → Connection string** en kies
   **Transaction pooler** (poort 6543). Die string is `DATABASE_URL`
5. Kopieer ook de **Direct connection** (poort 5432) apart; die heb je zo
   nodig om de tabellen aan te maken

> De app herkent zelf dat je via de pooler werkt en zet prepared statements
> uit. Zonder dat werkt alles tot de tweede keer dat dezelfde query langskomt
> en krijg je een fout die niemand aan de verbinding koppelt. Zie
> `src/db/connection-options.ts`.

We gebruiken van Supabase alleen de database, niet hun inlogsysteem of
opslag. De app heeft zijn eigen inlog met magic links.

### 2. E-mail bij Resend

1. Ga naar [resend.com](https://resend.com) en maak een account
2. Voeg `jamesrobinson.nl` toe als domein en zet de DNS-records klaar —
   zonder geverifieerd domein belanden inlogmails in de spam
3. Maak een **API key** aan

Geen `RESEND_API_KEY` ingevuld? Dan zet de app de inloglink in de serverlog
in plaats van in een mail. Handig om mee te testen, niet om mee te werken.

### 3. Tabellen aanmaken

Geen terminal nodig. In Supabase: **SQL Editor → New query**, plak de inhoud
van [`drizzle/supabase-setup.sql`](drizzle/supabase-setup.sql) en druk op
**Run**. Dat maakt alle tabellen, indexen en controleregels in één keer aan.

Onderaan dat bestand staan ook de regels die bijhouden welke migraties al
gedraaid zijn, zodat een latere wijziging aan de database gewoon werkt en niet
alles opnieuw probeert aan te maken.

Het zet meteen **Row Level Security** aan op alle tabellen. Supabase opent
standaard een REST-API die bereikbaar is met de `anon`-key, en die key is in
hun model publiek. Zonder RLS kan iedereen die hem heeft het klantenbestand
uitlezen. De wallet gebruikt die API niet en praat als eigenaar van de
tabellen, dus hij gaat er langs heen; je sluit een deur die je toch niet
gebruikt. Waarschuwt Supabase alsnog over RLS, kies dan gerust
**Run and enable RLS** — het resultaat is hetzelfde.

> Komt er later een nieuwe tabel bij? Dan draait `npm run db:bundel` dit
> bestand opnieuw uit de migraties. Bewerk het niet met de hand.

**Let op bij een database die al draait.** Nieuwe code gaat vanzelf live als
je pusht, maar de database verandert niet mee. Draait er al data in, gebruik
dan niet dit bestand maar het bijwerkbestand:

```bash
npm run db:bundel -- --vanaf=<laatste-migratie-die-je-draaide>
```

Dat schrijft `drizzle/supabase-update.sql` met alleen wat er nog bij moet.
Plak dat in de SQL-editor. De boekhouding onderin wordt alleen aangevuld waar
hij nog niet staat, dus daar krijg je geen dubbele regels van.

Heb je liever wel de terminal, dan kan het ook zo, met de **directe**
verbinding (poort 5432):

```bash
DATABASE_URL="<supabase-direct-string>" npm run db:migrate
```

### 3b. Twee geheimen maken

`AUTH_SECRET` ondertekent de inlogsessies en `CRON_SECRET` beveiligt de
maandelijkse run. Allebei moeten het lange, willekeurige reeksen zijn. Maak ze
in dezelfde SQL-editor, dan hoef je ze nergens anders langs te sturen:

```sql
create extension if not exists pgcrypto;

select
  encode(gen_random_bytes(32), 'base64') as auth_secret,
  encode(gen_random_bytes(32), 'hex')    as cron_secret;
```

Kopieer de twee waarden; die heb je zo nodig bij Netlify. Deel ze verder met
niemand — wie `AUTH_SECRET` heeft, kan zich voordoen als elke gebruiker.

### 4. Deploy op Netlify

1. Ga naar [netlify.com](https://netlify.com) → **Add new site → Import an
   existing project** → GitHub → `jimcoumans/jimcoumans`
2. Zet bij **Branch to deploy** de branch `claude/code-cloud-sync-c0tb9v`
3. Build command en publish directory staan al in `netlify.toml`; laat ze
   zoals Netlify ze voorstelt
4. Vul onder **Environment variables** deze regels in:

| Naam | Waarde |
|---|---|
| `DATABASE_URL` | de **pooler**-string van Supabase (poort 6543) |
| `AUTH_SECRET` | genereer met `openssl rand -base64 32` |
| `APP_URL` | `https://jouw-site.netlify.app` (vul na de eerste deploy je echte URL in) |
| `RESEND_API_KEY` | de API key van Resend |
| `MAIL_FROM` | `James Robinson Wallet <wallet@jamesrobinson.nl>` |
| `CRON_SECRET` | genereer met `openssl rand -hex 32` |
| `ADMIN_EMAILS` | `jim@jamesrobinson.nl` |

5. **Deploy site**

### 5. Jezelf toegang geven

Er is bewust geen zelfregistratie: niemand kan zichzelf toevoegen. Voeg jezelf
toe als beheerder via de SQL-editor van Supabase:

```sql
insert into users (email, name, role)
values ('jim@jamesrobinson.nl', 'Jim Coumans', 'admin');
```

Collega's voeg je daarna gewoon in de app toe onder **Team**; dit is alleen
nodig voor de allereerste.

Ga daarna naar `https://jouw-site.netlify.app/login`, vul je e-mailadres in en
je krijgt een inloglink in je mail.

**Wil je eerst met voorbeelddata spelen?** Dan
`DATABASE_URL="<supabase-direct-string>" npm run db:seed`. Let op: dat maakt
demoklanten aan die je later met de hand moet opruimen. Ga je echte
klantgegevens invoeren, sla de seed dan over.

### 6. De maandelijkse run

Staat al klaar in `netlify.toml` en `netlify/functions/billing.mts`: elke
ochtend om 6:00 roept Netlify `/api/cron/billing` aan met het geheim. Die
kijkt zelf welke maanden nog openstaan, dus een gemiste dag wordt de dag erna
ingehaald in plaats van dat een maand wordt overgeslagen.

Controleer na de eerste nacht bij **Netlify → Logs → Functions** of de run
gedraaid heeft. Een run die stilletjes niet draait, merk je anders pas als er
een maand niet gefactureerd is.

Zelf een keer starten om te kijken wat er zou gebeuren:

```bash
curl "https://jouw-site.netlify.app/api/cron/billing?dryRun=1&secret=<CRON_SECRET>"
```

Of vanaf je Mac tegen de database:

```bash
npm run billing              # proefronde, verandert niets
npm run billing -- --apply   # echt factureren
```

### Liever Neon en Vercel?

Kan ook, en `vercel.json` staat er al voor klaar. Dan is het: database bij
[neon.tech](https://neon.tech) (kies ook daar een EU-regio), de connection
string als `DATABASE_URL`, en importeren op [vercel.com](https://vercel.com)
met dezelfde variabelen als hierboven. De cron in `vercel.json` doet dan wat
de Netlify-functie hier doet. De rest van deze handleiding blijft gelijk.

---

## Wat je kunt uitproberen

**Als beheerder:**

1. **Diensten** → voeg een product toe, bijvoorbeeld "Social media post" à € 100
2. **Klanten** → open Hotel Voncken → **Dienst afboeken**: kies de dienst, vul
   3 in als aantal. Je ziet meteen dat er € 300 van het budget af gaat
3. Zelfde pagina → **Abonnementen**: maak er een aan met een maandbedrag, en
   klik daarna op **Nu factureren**. Er komt een factuur en het budget staat
   erop
4. Klik nog een keer op **Nu factureren** — er gebeurt niets. Dezelfde maand
   kan niet twee keer
5. **Financieel** → omzet, marge en budget per klant, per medewerker en per
   dienst
6. Draai een boeking terug bij een klant en kijk wat er in de overzichten
   gebeurt

**Als klant** (log in met `demo-klant@voorbeeld.nl`): je ziet direct je saldo
en alle mutaties, met bij elke regel het saldo dat je daarna over had.

---

## Handige commando's

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Start de app op http://localhost:3000 |
| `npm run setup` | Alles in één keer klaarzetten |
| `npm run db:reset` | Database leeg en opnieuw vullen (alleen lokaal) |
| `npm run login:link -- <email>` | Inloglink printen |
| `npm run billing` | Abonnementsrun als proefronde |
| `npm run billing -- --apply` | Abonnementsrun echt uitvoeren |
| `npm test` | Alle tests |

---

James Robinson — Marketing & Branding | www.jamesrobinson.nl
