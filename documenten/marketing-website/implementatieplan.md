# Marketing → Website: implementatieplan (MVP)

Versie november 2026. Uitwerking van de opdracht "James Robinson Portal — Marketing / Website / Content".

## Wat we hergebruiken

- **Stack:** Next.js (App Router) met server actions, Drizzle met Postgres (Supabase), Netlify. Geen nieuwe applicatie of infrastructuur.
- **Inloggen en rechten:** de bestaande rollen. Medewerker (`staff`) = redactie: aanmaken, bewerken, aanbieden voor review. Beheerder (`admin`) = review en beheer: goedkeuren, terugsturen, archiveren, publicatie bevestigen, registers beheren. Klantaccounts (`client`) komen er niet in: elke pagina, actie en export controleert dat aan de serverkant.
- **Componenten:** `AppShell`, `PaginaKop`, `ActionForm`, `Field`, `TextArea`, `Select` en de bestaande Tailwind-tokens (Inter, Figtree, JR-kleuren). Geen nieuw designsysteem.
- **Beeld:** de bestaande afbeeldingen-tabel kan later als opslag dienen; in de MVP verwijst een asset naar een bestaande plek (bijvoorbeeld Kive) met alttekst en rechtenstatus.
- **Migraties:** zoals altijd via `drizzle-kit generate`, met RLS aan op elke nieuwe tabel en een leesbare foutmelding per constraint (de bestaande tests dwingen dat af).

## Datamodel

Tabellen zoals in de opdracht, met het voorvoegsel `marketing_`:
- **Registers:** `subjects` (dienst, pakket, doelstelling, engine, algemene pagina), `industries`, `engine_components`, `package_components`, `clients` en `client_industries`.
- **Content:** `content_items`, `content_blocks` (één rij per veld, met modus overnemen, eigen tekst of verborgen) en de koppeltabellen naar onderwerpen, branches, klanten en assets.
- **Geschiedenis en planning:** `content_revisions` (momentopnames), `content_comments` en `coverage` (planning per onderwerp × branche).

Afwijkingen en aanvullingen:
- **`content_comments`** is toegevoegd voor opmerkingen in de editor. De bestaande tijdlijn hangt aan klantbedrijven en past hier niet.
- **`marketing_clients.organization_id`** is optioneel, zodat een referentieklant aan het bestaande CRM gekoppeld kan worden zonder dat het CRM de bron wordt.
- **Uniciteit via partiële unieke indexen**, met NULL expliciet behandeld: één actieve algemene pagina per onderwerp, één per onderwerp × branche, één branchehub per branche. Gearchiveerde pagina's tellen niet mee.
- **Lege matrixcellen zijn geen records.** Een cel wordt pas een record als iemand hem plant, uitsluit of bewust een concept aanmaakt.
- **Prijzen staan nergens in de module.** Pakketconfiguratie is de activatie per Engine-onderdeel (altijd, optioneel, uit of nog te bepalen), centraal bewerkbaar en nooit als override in een pagina.

## Werking

- **Velddefinities** staan centraal in code (`src/lib/marketing/velden.ts`), per paginasoort: algemene pagina, branchevariant, branchehub, case, review, FAQ en insight. Per veld ligt vast of het verplicht is, of overnemen mag, en of het bij een indexeerbare variant uniek moet zijn.
- **Overerving:** bij "overnemen" komt de tekst uit de huidige algemene bron. Wijzigt een veld in de bron, dan krijgen goedgekeurde of gepubliceerde varianten die dat veld overnemen de markering "herbeoordeling nodig". Gepubliceerde tekst verandert nooit vanzelf.
- **Workflow:** concept → in review → goedgekeurd, plus gearchiveerd. Publicatie staat daar los van: niet gepubliceerd, gepubliceerd of teruggetrokken, en wordt met de hand bevestigd met doel-URL, extern ID en datum. Een goedgekeurde tekst bewerken maakt er weer een concept van; de goedgekeurde revisie blijft bewaard.
- **Goedkeuren van een variant** kan pas als de algemene bron is goedgekeurd, alle verplichte velden gevuld zijn en de unieke velden echt eigen tekst hebben.
- **Bewijs** (cases, reviews, FAQ's, insights) verschijnt in een context als het aan het onderwerp én aan de branche hangt. De branche mag ook komen van de gekoppelde klant; directe en afgeleide koppelingen worden apart getoond en ontdubbeld. Klantbewijs gaat alleen mee in een export als de klant toestemming heeft gegeven.

## Schermen

Onder **Marketing → Website** (een nieuwe groep in het menu):
- **Overzicht:** voortgang uit echte data, per algemene pagina, variant en branchehub, met ontbrekende velden, verouderde content, taken per eigenaar en recente wijzigingen.
- **Architectuur:** de registers, de Engine-onderdelen en de activatie per pakket.
- **Content:** de lijst met filters, en de editor.
- **Contentmatrix:** onderwerp × branche, voor diensten, pakketten en doelstellingen.

## Export

- Per pagina: JSON en Markdown, met de effectieve tekst, de bron per veld, metadata en het toegestane bewijs.
- De contentmatrix als CSV.
- Er gaat niets automatisch naar WordPress.

## Niet in de MVP

- Publicatie naar WordPress.
- AI-redactie. De editor is er wel op voorbereid: elk veld heeft een vaste sleutel, een bron en een effectieve waarde.
- Andere marketingmodules: campagnes, distributie, AI Visibility en reporting.

## Inhoudelijke keuzes

Welke diensten, branches, pakketactivaties en welke websitecopy er komen, is aan James Robinson. Voor het testen zijn er demorecords (Google Ads, Advocatuur, Visibility, Growth, Accelerate); die zijn herkenbaar gemarkeerd en niet in productie geplaatst.
