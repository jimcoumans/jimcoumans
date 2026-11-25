# Marketing → Website: beheerdershandleiding

Versie november 2026. Gaat over de MVP van de module in het portaal onder Marketing → Website.

## Wat het is

Het portaal is de bron voor de teksten van onze eigen website. WordPress is de plek waar we ze met de hand publiceren. De module schrijft niets naar WordPress en gebruikt geen AI.

De module heeft vier tabbladen:

- **Overzicht:** voortgang, wat goedkeuring tegenhoudt, taken per eigenaar, voortgang per branche en wat recent is gewijzigd of verouderd (langer dan 180 dagen niet aangeraakt).
- **Architectuur:** de centrale registers. Dat zijn de onderwerpen (diensten, pakketten, doelstellingen, Engine en losse algemene pagina's), de branches, de referentieklanten, de Performance Engine en de pakketconfiguratie.
- **Content:** alle pagina's, cases, reviews, FAQ's en insights, met filters, zoeken en een knop voor nieuwe content.
- **Contentmatrix:** onderwerpen als rijen en branches als kolommen, met per cel de status.

## Rechten

| Rol | Mag |
|---|---|
| Klant | Niets. Komt de module niet in. |
| Staff (redactie) | Alles lezen, content maken en bewerken, aanbieden voor review, plannen in de matrix, opmerkingen, beeld en koppelingen. |
| Admin (beheer) | Daarnaast goedkeuren, terugsturen, archiveren, publicatie vastleggen en de registers beheren. |

Elke actie controleert de rechten op de server. Een verborgen knop is geen beveiliging.

## Werkwijze in vijf stappen

1. **Registers vullen** (admin, Architectuur):
   - onderwerpen;
   - branches;
   - referentieklanten, met publicatietoestemming;
   - de Engine. "Voorlopig kader laden" zet de begrippen uit de specificatie erin. Die zijn daarna vrij te bewerken.
2. **Algemene pagina's eerst.** Elk actief onderwerp krijgt één algemene pagina. In de matrix staat "+ Algemene pagina" in de grijze kolom. Zolang niet alle algemene pagina's zijn goedgekeurd, staat er een waarschuwing op het overzicht.
3. **Varianten plannen.** Klik in de matrix op een lege cel en kies wat je met die combinatie wilt:
   - plannen;
   - uitstellen;
   - niet relevant;
   - concept beginnen.

   Een lege cel is geen record. Alleen geplande combinaties en combinaties met content tellen mee in de voortgang.
4. **Schrijven.** Bij een variant kies je per veld:
   - **overnemen van algemeen:** de tekst komt live uit de bron;
   - **eigen tekst;**
   - **verbergen,** waar dat mag.

   De bron staat er steeds naast. Velden die uniek moeten zijn, zoals headline, introductie, SEO-titel en metabeschrijving, moeten bij een indexeerbare variant eigen tekst hebben. Anders keurt het systeem niet goed.
5. **Review en publicatie.** De volgorde is:
   1. aanbieden;
   2. goedkeuren of terugsturen (admin; terugsturen kan alleen met toelichting);
   3. met de hand in WordPress zetten;
   4. "Publicatie vastleggen", met de URL en eventueel het WordPress-ID.

   Workflow (concept, in review, goedgekeurd, gearchiveerd) en publicatie (niet gepubliceerd, gepubliceerd, teruggetrokken) zijn twee aparte statussen.

## Regels die het systeem bewaakt

- Een goedgekeurde tekst bewerken maakt er weer een concept van. De goedgekeurde revisie blijft bewaard.
- Een variant goedkeuren kan pas als zijn algemene bron is goedgekeurd.
- Wijzigt een veld in de algemene pagina, dan krijgt elke goedgekeurde of gepubliceerde variant die dat veld overneemt de vlag "herbeoordeling nodig". De gepubliceerde tekst verandert niet vanzelf.
- Per onderwerp is er één algemene pagina, per onderwerp en branche één variant en per branche één hub. Gearchiveerde pagina's tellen niet mee.
- Publicatie vastleggen kan alleen met een goedgekeurde revisie.
- Een onderwerp of branche die nog gebruikt wordt, kun je niet verwijderen. Archiveer hem dan.

## Bewijs

Cases, reviews, FAQ's en insights koppel je aan onderwerpen, branches en klanten. Ze verschijnen bij een pagina als ze aan het onderwerp én de branche hangen.

- **Branche via de klant.** Heeft een case geen branche, maar wel een klant in die branche, dan telt hij ook mee. Er staat dan "branche via de klant" bij.
- **Toestemming.** Bewijs van een klant zonder publicatietoestemming staat wel in het portaal, maar gaat niet mee in een export. De export meldt hoeveel er is weggelaten.

## Exports

| Wat | Waar | Inhoud |
|---|---|---|
| Eén pagina als Markdown of JSON | links onder Gegevens in de editor, of `/api/marketing/content/<id>?format=md` of `json` | effectieve tekst per veld met herkomst, Engine-data bij een pakket of de Engine, beeld, bewijs met toestemming |
| Matrix als CSV | link "CSV" in de matrix, of `/api/marketing/matrix?type=service`, `package` of `objective` | status per onderwerp per branche |

Alleen staff en admin kunnen exporteren.

## Bestanden

- **Data en logica:**
  - `src/db/schema.ts`: tabellen `marketing_*`;
  - `drizzle/0062_marketing_website.sql`;
  - `src/lib/db-errors.ts`: meldingen per constraint.
- **Veldschema per paginasoort:** `src/lib/marketing/velden.ts`.
- **Registers en rechten:** `src/lib/marketing/registers.ts`.
- **Content, workflow, overerving, matrix, voortgang en export:** `src/lib/marketing/content.ts`.
- **Acties:** `src/app/beheer/marketing-actions.ts`.
- **Schermen:**
  - `src/app/beheer/marketing/website/` (overzicht, architectuur, content, `content/[id]`, matrix, `matrix/cel`);
  - `src/components/marketing/WebsiteKop.tsx`.
- **Exportroutes:** `src/app/api/marketing/`.
- **Tests:** `src/lib/__tests__/marketing-website.test.ts`.

## Migratie

Migratie `0062_marketing_website` maakt 16 nieuwe tabellen aan, met RLS aan. Netlify draait hem bij de deploy (`npm run db:migrate`). Er worden geen bestaande tabellen gewijzigd.

## Getest

- **Unittests (6, alle groen).** Ze dekken:
  - rechten per rol;
  - uniciteit;
  - overerving en herbeoordeling;
  - workflow;
  - bewijs (EN-filter, afgeleide branche, ontdubbeling);
  - exports;
  - planning, voortgang en CSV.
- **End-to-end in de browser.** Uitgevoerd met records die als demo gemarkeerd waren: Google Ads, Advocatuur, Visibility, Growth, Accelerate en twee demokantoren. De test liep door:
  1. kader laden en een activatie zetten;
  2. een algemene pagina maken, aanbieden en goedkeuren;
  3. een variant via de matrix maken. De validatie hield hem eerst tegen op de unieke velden, daarna werd hij goedgekeurd;
  4. een gewijzigde bron, waarna de variant op herbeoordeling ging;
  5. twee cases, waarvan alleen die met toestemming in de export kwam;
  6. de Markdown-, JSON- en CSV-export;
  7. de filters.

  Er waren geen fouten in de browser. De demorecords zijn daarna verwijderd.

## Bewust niet in de MVP

- Publiceren naar WordPress.
- AI-teksten.
- Toegang voor klanten.
- Bestanden uploaden. Bij beeld leg je vast waar het staat, bijvoorbeeld in Kive.
- Opmerkingen per veld. Opmerkingen gelden nu voor de hele pagina.
- Prijzen.
- Een verschilweergave tussen revisies.

## Open keuzes voor James Robinson

De module maakt geen inhoudelijke keuzes. Deze liggen bij jullie:

1. **Engine-begrippen.** Het voorlopige kader (Direction, Core drivers, Fuel, Booster, Integrated optimisers, Intelligence, Infrastructure) komt uit de specificatie. Het wijkt af van de Engine-tekening in de James Robinson-gids, met drie domeinen die elk betaald en organisch zijn. Kies er één en laat de andere volgen.
2. **Pakketten.** Visibility, Growth en Accelerate staan niet in de huidige propositie (Starter tot en met Champion, plus de modulaire generator).
3. **Doelbranches.** Advocatuur, notariaat en accountancy zijn nieuw ten opzichte van de huidige branchelijst.
4. **Engelse of Nederlandse namen.** De tone of voice is Nederlands.
5. **Gereguleerde beroepen.** Voor advocatuur en notariaat gelden regels voor reclame. Een claimcheck voor goedkeuring zit nog niet in de workflow.
