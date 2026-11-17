# Oplevering V1 — status per acceptatiecriterium

Datum: 17 november 2026. Uitgevoerd tegen een lokale Postgres 16 en een productiebuild
(`next build` + `next start`, `APP_ENV=demo`). "Pass" betekent: aantoonbaar uitgevoerd
met de genoemde test. Niets is "getest" genoemd zonder uitvoering.

Testruns bij oplevering:

| Check | Resultaat |
|---|---|
| `npm test` (unit + integratie, echte database, RLS als gewone gebruiker) | **30/30 pass** |
| `npm run e2e` (Playwright, Chromium, volledige keten) | **1/1 pass** (~23 s) |
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 fouten, 0 waarschuwingen) |
| `npm run build` | pass (44 routes) |

Afkortingen: **I** = `tests/flows.test.ts`, **U** = `tests/unit.test.ts`, **E** = `e2e/full-chain.spec.ts`.

## Functioneel

| Criterium | Status | Bewijs |
|---|---|---|
| Kandidaat kan aanvraag indienen; refresh verliest niets | pass | I: herhaald versturen met dezelfde sleutel geeft dezelfde aanvraag; E: indienen via UI. Formulier bewaart concept in sessionStorage; dat herstel zelf is niet geautomatiseerd getest |
| Geldige uitnodiging eenmaal claimbaar; vervallen/ingetrokken faalt | pass | I: uitnodiging-test |
| Twee gelijktijdige claims → max. één eigenaar | pass | I: twee verificaties parallel, precies één `claimed` |
| Verwijzer onthullen volgens vastgelegde toestemming | pass | I: met en zonder toestemming (UI-knop niet in E) |
| Aanmelding maakt niemand staff of actief lid | pass | I + E: kandidaat komt op `/onboarding`, `/app` en `/ops` dicht |
| Actief lid maakt verzoek; staff ziet dezelfde inhoud | pass | I + E |
| Ontbrekende info → vraag/taak, niets verzonnen | pass | I: budget blijft leeg, `info_needed`-taak |
| Exact één geldige optie; vervallen/gewijzigde versie faalt | pass | I: verkeerde hash, vervangen versie, verlopen versie |
| Herhaalde akkoordklik → geen tweede akkoord/boeking | pass | I: 5 parallelle klikken → 1 akkoord; E: dubbelklik op verzoek → 1 verzoek |
| Bevestigen zonder leveranciersbewijs kan niet | pass | I: service én directe SQL geweigerd; E: foutmelding in UI |
| Twee onderdelen, één pending → geen volledige bevestiging | pass | I + U |
| Annulering aanvragen is lopend, niet afgerond | pass | I |
| Society: laatste plek niet dubbel | pass | I: twee medewerkers parallel → één bevestiging |
| Betaling/restitutie corrigeren traceerbaar; bedragen kloppen | pass | I + U: correctie, te hoge restitutie geweigerd, append-only |
| Ongeconfigureerde integraties simuleren geen succes | pass | I |

## Autorisatie en privacy

| Criterium | Status | Bewijs |
|---|---|---|
| Lid A kan data van lid B niet lezen/aanpassen (UI, URL, database) | pass | I: directe SQL onder RLS; E: URL van ander dossier → 404 zonder inhoud |
| Lid ziet geen interne notities, staffrollen, commissies, deelnemerslijsten | pass | I: 10 interne tabellen leeg voor lid |
| Niet-ingelogde bezoeker krijgt geen klantdata | pass | I (database) + E (`/app`, `/ops` → login) |
| Client kan eigen rol/status niet promoveren | pass | I: insert staff_roles, update memberships, update e-mail, concierge→admin |
| Uitloggen en sessieverval sluiten beveiligde routes | pass | I + E |
| Secrets niet in clientbundles, git of logs | pass | grep op `.next/static` (0 treffers), `.env*` gitignored; tokens niet in logs (dev-mailbox) |
| Bijlagen met geraden URL ontoegankelijk | n.v.t. | Bijlagen niet gebouwd (geen P0) |
| Beëindigd lid ziet historie, opent geen nieuw verzoek | pass | I: service én RLS-insertpolicy |

## Kwaliteit

| Criterium | Status | Toelichting |
|---|---|---|
| Typecheck, lint, tests, build | pass | zie boven |
| E2E aanvraag tot bevestiging + kernfoutpaden | pass | E: anoniem dicht, kandidaat dicht, MFA, activeren zonder betaling faalt, vreemd dossier 404, bevestigen zonder bewijs faalt, uitloggen |
| RLS-tests met gewone gebruikerssessies | pass | I gebruikt `jc_app` + `jc.user_id`, nooit de eigenaar |
| Geld en tijdzones incl. zomertijd | pass | U: btw-splitsing, 29 mrt / 25 okt 2026, Dubai |
| Smalle mobiel en desktop gecontroleerd | pass | Screenshots iPhone 13 + 1440 px; geen horizontale scroll op 11 pagina's. Eén fout gevonden en hersteld (kaarten buiten beeld) |
| Formulieren toetsenbordbedienbaar | deels | Native formulierelementen, zichtbare focus, skip-link, labels. Geen geautomatiseerde toetsenbord-only run of screenreader-test uitgevoerd |
| Empty/loading/error states, dubbele-submitpreventie | pass | Lege staten, `error.tsx`, `not-found.tsx`, knoppen uitgeschakeld tijdens verzenden + idempotency keys |
| Demo en productie gescheiden | pass | `APP_ENV`; seed weigert buiten demo/development; demobanner; `is_demo`-vlag |
| README laat een ander het project opzetten | not-run | Geschreven, maar niet door een tweede ontwikkelaar uitgeprobeerd |

## Geïmplementeerd / niet geconfigureerd / later

**Geïmplementeerd (P0):** publieke site NL + Engelse visitorpagina, aanmelden met e-mailverificatie,
uitnodigingen (hash, verval, intrekken, eenmalige claim, onthullen met toestemming), beoordeling en
lidmaatschapsaanbod met versies, handmatige factuur- en betalingsregistratie, activatie, ledenportaal
(verzoeken, berichten, voorstellen, akkoord, boekingen, annuleringsverzoek, feedback, Society,
voorkeuren, toestemmingen, lidmaatschap, uitnodigen), cockpit (werkbakken, filters, eigenaar en
volgende actie, dossier, interne notities, taken, tijdregistratie, beschikbaarheidschecks,
leveranciers met afspraken en verificatie, voorstellen, boekingsonderdelen, Society-beheer,
facturatie, rapportage, instellingen, team), staff-MFA, audittrail, demo-omgeving.

**Niet geconfigureerd (code aanwezig, account/gegevens ontbreken):**
- E-mailprovider (`RESEND_API_KEY`, `MAIL_FROM`) — zonder: in productie geen mail, lokaal dev-mailbox.
- WhatsApp-nummer — knop blijft verborgen tot ingesteld én aangezet.
- Service-uren, bedrijfsgegevens — verschijnen pas na invullen én activeren in Instellingen.
- Domein / `APP_URL`, productiedatabase, back-ups.

**Later (bewust niet gebouwd):** WhatsApp Cloud API, online betalen, AI-concepten, kalenderexport
(P1); reserveringskoppelingen, partnerportalen, huishoudaccounts, referral-uitbetalingen,
native apps, Arabisch/RTL, multi-currency, bijlagen.

## Bekende beperkingen

- Eerste reactietijd wordt nog in kalendertijd gemeten, niet binnen service-uren.
- Uitnodigingen kunnen in V1 niet per persoon worden geverifieerd: de link is overdraagbaar (zoals de briefing beschrijft).
- Rate limits en lichte onderhoudstaken (verlopen voorstellen, beëindigde lidmaatschappen) draaien bij gebruik, niet via een achtergrondproces.
- Facturatie is een registratie, geen boekhouding: echte factuurnummering en administratie lopen via jullie boekhoudpakket.
- Juridische teksten, prijs en btw-behandeling zijn concepten tot ze zijn beoordeeld.

## Nodig van de ondernemer vóór livegang

Domein (na merkcheck), juridische entiteit en contactgegevens, geaccordeerde prijs/scope/voorwaarden
(incl. fiscale beoordeling), operator en werkelijke service-uren, gecontroleerde leveranciers,
productiedatabase met back-ups, e-mailprovider, zakelijk WhatsApp-nummer (optioneel),
factuurroute, beoordeelde privacy- en reisrol, beeldmateriaal met gebruiksrechten.
