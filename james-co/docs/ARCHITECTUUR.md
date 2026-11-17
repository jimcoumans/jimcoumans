# Architectuur James & Co. V1

## Lagen

```
src/app/            routes (server components) + server actions (dunne laag)
src/components/     UI; bevat geen boekings- of autorisatielogica
src/lib/domain/     servicelaag: alle businessregels, validatie (zod), transacties, audit
src/lib/auth/       magic links, sessies, TOTP, guards
src/lib/integrations/ adapters; ongeconfigureerd = { status: 'not_configured' }
db/migrations/      SQL: schema, triggers, RLS-policies, rollen
tests/              unit + integratie tegen echte Postgres
e2e/                Playwright: volledige keten in de browser
```

Eén applicatie, geen microservices, geen eigen workflowframework.

## Database en autorisatie

- De app verbindt met een gewone inlogrol (lid van `jc_app`, geen BYPASSRLS).
- Elke query loopt in een transactie die eerst `SET LOCAL ROLE jc_app` en
  `jc.user_id` zet (`withActor`). `jc.staff_session = 'on'` alleen bij een actieve
  staffrol mét (indien vereist) MFA-geverifieerde sessie. Een staffrol zonder MFA
  heeft dus in de database geen staffrechten.
- `withSystem` (`SET LOCAL ROLE jc_system`, BYPASSRLS) is beperkt tot: inloggen,
  aanmelden, uitnodiging inspecteren/claimen, publieke instellingen en teasers,
  rate limiting, en toestandswissels door leden die eerst onder RLS op eigendom
  zijn gecontroleerd (akkoord, annuleringsverzoek, aanbod accepteren, Society).
- `jc_app` erft géén tabelrechten van `jc_system` (`INHERIT FALSE`). Leden kunnen
  daardoor alleen de expliciet vrijgegeven profielkolommen wijzigen.
- RLS is de tweede verdedigingslaag. De eerste is de servicelaag: elke functie
  controleert rol en eigendom zelf.

### Wat de database zelf weigert

| Regel | Mechanisme |
|---|---|
| Ongeldige statusovergang van een verzoek | trigger `jc_requests_guard` |
| Actief verzoek zonder eigenaar | trigger |
| Uitgegeven voorstel of optie wijzigen | triggers `jc_proposals_guard`, `jc_proposal_options_guard` |
| Meer dan 3 opties, twee open voorstellen | check + partial unique index |
| Tweede akkoord op hetzelfde voorstel | unique `approvals.proposal_id` |
| Bevestiging zonder bron, controletijd en referentie/notitie | check op `bookings` |
| Annulering zonder bewijs | check op `bookings` |
| Society-overboeking, capaciteit onder bevestigd aantal | triggers met rijlock op het event |
| Dubbele claim van een uitnodiging | conditionele update + unique `claimed_application_id` |
| Netto + btw ≠ bruto, negatieve bedragen | checks |
| Betalingen, akkoorden, toestemmingen, audit wijzigen of wissen | append-only triggers |
| Twee lopende lidmaatschappen per persoon | partial unique index |

## Statusmachines

**Verzoek:** `new → needs_info ⇄ researching → awaiting_approval → arranging → confirmed → completed → closed`.
Ook `awaiting_approval → researching` (nieuwe versie/intrekken), `arranging → researching`
(optie onbeschikbaar, met uitleg), `confirmed → arranging` (extra onderdeel of wijziging).
`rejected` en `cancelled` zijn aparte afsluitroutes vanuit elke open status.
`confirmed` ontstaat alleen doordat alle vereiste boekingsonderdelen bevestigd zijn.

**Lidmaatschap:** `pending → offered → accepted_pending_payment → active → ending → ended`,
plus `declined` en `suspended`. Activeren: admin, na geaccepteerd aanbod én volledig
ontvangen lidmaatschapsfactuur (of expliciet "zonder kosten"). Een beëindigd of
geschorst lid ziet eigen historie, facturen en bevestigingen; nieuwe verzoeken
worden in de servicelaag én door de RLS-insertpolicy geblokkeerd.

**Boekingsonderdeel:** `pending → requested → confirmed`, `failed`, `cancellation_requested → cancelled`.
Annuleren door een lid zet alleen het verzoek; bevestiging door de leverancier
(met bewijs) maakt het onderdeel geannuleerd.

**Society-deelname:** `interested`, `waitlisted`, `offered` (+ `accepted_at`), `confirmed`, `declined`, `cancelled`.

## Bevoegdheden

| Actie | Wie | Afgedwongen in |
|---|---|---|
| Intake indienen | publiek | rate limit, validatie, privacy-akkoord |
| Lid activeren | admin | service + RLS (admin-policies op facturen) |
| Verzoek maken | actief lid / staff namens lid | service + RLS-insertpolicy |
| Voorstel uitgeven | staff | service + triggers |
| Voorstel accepteren | betreffend lid | eigendom onder RLS, daarna systeemtransactie met lock |
| Boeking bevestigen | staff | service + check constraint |
| Betaling registreren/corrigeren | admin | service + RLS + append-only |
| Lid schorsen/beëindigen | admin | service |
| Rol wijzigen | admin, nooit zichzelf | service + RLS (`user_id <> jc_uid()`) |

## Privacy en veiligheid

- Inlog- en uitnodigingstokens: 256 bits, alleen SHA-256-hash opgeslagen, eenmalig
  (login) of eenmalig te claimen (uitnodiging), standaard 15 min resp. 30 dagen.
- De inloglink logt niet zelf in: een knop doet dat (mailscanners openen links).
- Sessies staan in de database en zijn direct intrekbaar (uitloggen, rol inactief).
  Staffsessies 12 uur, ledensessies 30 dagen. Cookie: httpOnly, SameSite=Lax, Secure in productie.
- Rate limits (in de database, gehashte sleutels) op login, aanmelden, onthullen en MFA.
- `/invite/*` en `/login/*`: `Referrer-Policy: no-referrer`, `noindex`, `no-store`; geen trackers.
- Server actions: origin-controle door Next.js; alle invoer via zod.
- Logs: geen tokens, geen berichtinhoud; audit-snapshots redigeren gevoelige velden.
- Interne notities zijn een aparte tabel zonder ledenpolicy, nooit in de ledenpayload.
- Gevoelige voorkeuren (dieet/allergie) alleen na expliciete toestemming; intrekken wist ze.
- Bijlagen zijn niet gebouwd (geen P0). Bevestigingen worden als gecontroleerde tekst vastgelegd.
