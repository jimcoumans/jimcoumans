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

**Geen Docker?** Maak dan een gratis database bij [Neon](https://neon.tech) en
zet die connection string in `.env.local` als `DATABASE_URL`. Daarna
`npm run setup`.

**Opnieuw beginnen** met verse voorbeelddata: `npm run db:reset`

---

## B. Live op internet (± 10 minuten)

Dan kun je het op je telefoon, iPad en laptop gebruiken, en kunnen klanten en
collega's echt inloggen.

### 1. Database bij Neon

1. Ga naar [neon.tech](https://neon.tech) en maak een gratis account
2. Maak een project, bijvoorbeeld `jr-wallet`
3. Kopieer de **connection string** (begint met `postgresql://`)

### 2. E-mail bij Resend

Nodig omdat inloglinks per mail gaan.

1. Ga naar [resend.com](https://resend.com) en maak een account
2. Voeg `jamesrobinson.nl` toe als domein en zet de DNS-records klaar — zonder
   verifieerd domein belanden inlogmails in de spam
3. Maak een **API key** aan

### 3. Deploy op Vercel

1. Ga naar [vercel.com](https://vercel.com), log in met GitHub
2. **Add New → Project** en kies de repo `jimcoumans/jimcoumans`
3. Zet bij **Branch** de branch `claude/code-cloud-sync-c0tb9v`
4. Vul onder **Environment Variables** deze regels in:

| Naam | Waarde |
|---|---|
| `DATABASE_URL` | de connection string van Neon |
| `AUTH_SECRET` | genereer met `openssl rand -base64 32` |
| `APP_URL` | `https://jouw-project.vercel.app` (vul na de eerste deploy je echte URL in) |
| `RESEND_API_KEY` | de API key van Resend |
| `MAIL_FROM` | `James Robinson Wallet <wallet@jamesrobinson.nl>` |
| `CRON_SECRET` | genereer met `openssl rand -hex 32` |
| `ADMIN_EMAILS` | `jim@jamesrobinson.nl` |

5. **Deploy**

### 4. Tabellen aanmaken

Eenmalig, vanaf je eigen Mac met de Neon-string:

```bash
DATABASE_URL="<neon-string>" npm run db:migrate
```

### 5. Jezelf toegang geven

Er is bewust geen zelfregistratie. Voeg jezelf toe als beheerder:

```bash
DATABASE_URL="<neon-string>" psql -c \
  "INSERT INTO users (email, role) VALUES ('jim@jamesrobinson.nl', 'admin');"
```

Ga daarna naar `https://jouw-project.vercel.app/login`, vul je e-mailadres in
en je krijgt een inloglink in je mail.

**Wil je eerst met voorbeelddata spelen?** Dan `DATABASE_URL="<neon-string>"
npm run db:seed`. Let op: dat maakt demoklanten aan die je later met de hand
moet opruimen.

### 6. De maandelijkse run

`vercel.json` staat al klaar: Vercel Cron roept elke ochtend om 6:00
`/api/cron/billing` aan. Die kijkt zelf welke maanden nog openstaan, dus je
hoeft niets in te stellen.

Zelf een keer starten om te kijken wat er zou gebeuren:

```bash
curl "https://jouw-project.vercel.app/api/cron/billing?dryRun=1&secret=<CRON_SECRET>"
```

Of vanaf je Mac tegen de database:

```bash
npm run billing              # proefronde, verandert niets
npm run billing -- --apply   # echt factureren
```

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
