# James Robinson Wallet: wat er in het platform zit

Stand van 26 november 2026. Dit overzicht is opgesteld uit de code zelf, niet uit plannen of documenten. Bij twijfel geldt wat hier staat als "in de code", niet als "in gebruik".

---

## Eerst: wat recent is toegevoegd

Alles hieronder staat in de code van de live-branch. Of het ook in het portaal te zien is, hangt af van een geslaagde deploy. De productiedeploy van PR #46 is op 25 november mislukt.

| Onderdeel | PR |
|---|---|
| AI-vindbaarheid | #45 |
| Marketing → Website | #46 |
| Moneybird-facturatie (andere sessie) | #47 tot en met #51 |
| CRM: op voornaam sorteren, live zoeken, een persoon bij meerdere bedrijven, vertrek van een contactpersoon | deze ronde |

---

## 1. In één oogopslag

- **Wat het is.** Eén portaal voor het team en de klant. De klant ziet zijn budget, resultaten en facturen. Het team runt er de hele klantreis in: van lead tot voorstel, en van campagne tot maandrapport. Daarnaast zitten HR, contracten en de financiën erin.
- **Omvang.**
  - Ongeveer 105 tabellen in de database.
  - 66 databasemigraties.
  - 76 testbestanden met zo'n 940 tests.
- **Techniek.** Next.js op Netlify, met een Postgres-database bij Supabase. Bestanden staan in Netlify Blobs.
- **Adres.** `jamesrobinsonwallet.netlify.app`, achter de Netlify-login.

## 2. Rollen en inloggen

| Rol | Ziet en doet |
|---|---|
| Klant | Alleen zijn eigen organisatie, en alleen de vier portaalpagina's. Alles is alleen-lezen. |
| Staff | De hele teamomgeving (`/beheer`), behalve de onderdelen voor beheerders. |
| Admin | Alles van staff, plus: Bedrijfsgegevens, Salarishuis, Standaardteksten, Contracten, indiensttreding, persoonsdocumenten, wachtwoorden van anderen, rollen toekennen, de koppelingen beheren, goedkeuren in Marketing → Website, en de regels van de Uitingen-check. |
| Partner | Logt niet in. Een partner krijgt alleen een persoonlijke link per aanvraag. |

**Inloggen**
- **Met een maillink.** Dit is de hoofdroute, en voor klanten de enige.
  - De link werkt 15 minuten en maar één keer.
  - Je kunt maximaal 5 links per uur aanvragen.
  - De link opent eerst een knop. Zo verbruikt een virusscanner in de mail hem niet.
- **Met een wachtwoord.** Vooral voor het team.
  - Minimaal 12 tekens.
  - Na 10 foute pogingen 15 minuten geblokkeerd.
- **Sessie.** Je blijft 30 dagen ingelogd. Blokkeren werkt meteen.

**Meekijken.** Het team kan het portaal openen precies zoals de klant het ziet. Dat duurt maximaal 8 uur en is bedoeld om alleen te kijken. Je start het met "Portaal bekijken als klant" op de klantkaart.

## 3. Het klantportaal

1. **Mijn wallet.**
   - Per wallet het beschikbare budget en de verhouding tussen opgewaardeerd en besteed.
   - Oranje onder de meldgrens, rood bij een negatief saldo.
   - De laatste 15 boekingen.
   - Bij meerdere wallets een totaal.
2. **Resultaten.** Het maandrapport, hetzelfde als het team ziet.
   - Hoofddoel, maand na livegang en leerfase.
   - Impressies, bezoekers, conversies en omzet, vergeleken met vorig jaar. Omzet is nu altijd leeg.
   - Uitsplitsing per kanaal.
   - Analyse met bevindingen en acties.
   - De marketingmanager met contactgegevens.
3. **Activiteit.**
   - Het volledige afschrift per wallet.
   - Waar het geld naartoe ging, per categorie.
   - Teruggedraaide boekingen zijn gemarkeerd.
4. **Facturen.**
   - De facturen die het budget opbouwden, met pdf-link als die er is.
   - Het openstaande bedrag.
   - Een waarschuwing als de opwaardering afwijkt van de factuur.

## 4. De teamomgeving

### Dashboard
- **Tellers:** retainerklanten, projectklanten, pijplijn, collega's en actieve partners. Er staat bij hoeveel klanten ooit hebben ingelogd.
- **Geld:**
  - walletwaarde per maand;
  - abonnementsomzet per maand;
  - budget bij klanten;
  - open offertes en het scoringspercentage.
- **Jarig deze week:** collega's, contacten, partners en hun kinderen.
- **Vraagt aandacht:**
  - klanten in het rood;
  - klanten waar niemand kan inloggen;
  - offertes die op een partner wachten;
  - deals zonder volgende stap;
  - kandidaten die op antwoord wachten;
  - verlopen facturen.

### Performance
- **Wat het is.** De resultaten van alle klanten samen, per periode.
- **Wat erop staat:**
  - impressies, bezoeken, conversies en advertentie-uitgaven, vergeleken met de vorige periode;
  - een uitsplitsing per bron en per klant;
  - een tabel per klant: welke koppelingen werken (Analytics, Search Console, Google Ads, Meta), met een knop naar het rapport en de acties, en een knop "Portaal";
  - een rood blok met koppelingen die een fout geven.
- **Bronnen:** GA4, Search Console, Google Ads, Meta Ads, LinkedIn Ads, Ahrefs en Google Bedrijfsprofiel. TikTok Ads kun je kiezen, maar het ophalen werkt nog niet: het platform wacht op API-toegang.
- **Bijwerken.** De cijfers worden elke nacht bijgewerkt, met tot 13 maanden geschiedenis. Met "Nu bijwerken" kan het ook direct.

### Relaties

**Bedrijven**
- Een lijst met filters op status, branche, regio, relatiegezondheid en marketingmanager.
- Per bedrijf zie je de klantreisstap, of er iemand kan inloggen, het bedrag per maand en het saldo.
- Met "+ Bedrijf toevoegen" leg je in één keer vast: bedrijf, eerste contactpersoon, eerste wallet en marketingmanager.

**De bedrijfskaart, met tien tabbladen**
1. **Overzicht.**
   - De klantreisbalk.
   - Budget per maand, volgende opwaardering en vaste contactpersoon.
   - De tijdlijn: zelf momenten loggen, aangevuld met offertes, facturen en boekingen.
   - De campagnes van deze klant.
2. **Performance.**
   - Hoofddoel en livegangdatum.
   - De meetcheck.
   - Dashboards per bron, plus Bedrijfsprofiel en SEO.
   - De koppelingen per klant: account kiezen, campagnes aanvinken, "Nu bijwerken".
3. **Klantreis.** De acht stappen met mijlpalen. Elke vink legt vast wie het deed en wanneer.
4. **Formulieren.**
   - Vragenlijst (01.1): de klant vult hem in via een link.
   - Quickscan (02.1) met scanrapport.
   - Intakevragenlijst (03.2).
5. **Klantprofiel,** in zeven delen:
   1. De basis.
   2. Het bedrijf in het kort, met concurrenten.
   3. Doelen.
   4. De klant van de klant.
   5. Het merk.
   6. Accounts en systemen. Hier staat waar een wachtwoord bewaard wordt, nooit het wachtwoord zelf.
   7. Afspraken en gevoeligheden.
6. **Merkkluis.** Een samenvatting, met een link naar de volledige kluis.
7. **Budget en facturen.**
   - Wallets: dienst afboeken, los boeken, terugdraaien met een reden.
   - Abonnementen: aanpassen, nu factureren, pauzeren, stopzetten.
   - Facturen: aanmaken, betaald markeren, crediteren. Een factuur wordt direct budget.
8. **Campagnes,** plus vaste doelgroepen.
9. **Uitingen.** Recente checks, afspraken per klant, aanspreekstijl per doelgroep en submerken.
10. **Contacten.**
    - Contactpersonen, met persoonlijke details: verjaardag, kinderen, drankvoorkeur, DISC en hobby's.
    - Partners van deze klant.
    - Wie er mag inloggen.

**Contacten (CRM)**
- Eén adresboek voor iedereen: klanten, prospects, leads, partners, netwerk en collega's.
- Filters met tellers, en zoeken op naam, mail, functie of bedrijf.
- Per persoon een kaart met mail, bellen en LinkedIn met één klik.
- Gesorteerd op voornaam. Zoeken werkt live, tijdens het typen.
- **Een persoon bij meerdere bedrijven.** Eén hoofdbedrijf, plus extra bedrijven met een rol per bedrijf (bijvoorbeeld eigenaar of bestuurslid).
- **Vertrek.** Met "Gaat weg bij" gebeurt in één keer:
  - de portaltoegang voor dat bedrijf gaat dicht;
  - vaste contactpersoon en factuurontvanger gaan eraf;
  - de relatie gaat op "Vraagt aandacht", met een actie om kennis te maken met de opvolger;
  - de geschiedenis blijft bewaard ("oud-contactpersonen", "werkte eerder bij");
  - de nieuwe werkgever kan als lead in de pijplijn.

**Partners**
- Wat elke partner oplevert: offertes, opdrachten, omzet, kosten en marge.
- Per partner:
  - tarieven;
  - standaardproducten met prijs;
  - een matchprofiel met branches, werkgebied en reiskosten;
  - contactpersonen.
- Een nieuw tarief geldt alleen voor nieuwe offertes.

**Partneraanvragen**
- De ronde: aanvraag uitzetten, partners rangschikken op match, uitvragen per mail, antwoorden vergelijken, ons eigen werk erbij zetten, conceptofferte maken.
- De partnerprijs gaat zonder opslag door naar de klant.
- Na afloop geef je een cijfer van 1 tot 5. Dat telt mee bij de volgende match.

**Concurrenten** (niet in het menu). Alle concurrenten uit alle klantprofielen bij elkaar. Concurrenten die bij meer klanten voorkomen, zijn gemarkeerd.

### Verkoop

**Pijplijn**
- Een bord met vijf fases en kansen: Nieuw 10%, Contact 20%, Gekwalificeerd 40%, Voorstel 65%, Onderhandeling 85%.
- Gewogen waarde. Maandbedragen en eenmalige bedragen staan apart.
- Deals zonder volgende stap komen bovenaan.
- **Gewonnen:** het bedrijf wordt klant. Het abonnement maak je nog met de hand.
- **Verloren:** een reden is verplicht. Bovenaan staat het overzicht "Waarom we verliezen".

**Offertes**
- Nummering OFF-JJJJ-NNN.
- Vier soorten regels: eigen dienst, via partner, eenmalig en korting. Per regel zie je kosten en marge; die ziet alleen het team.
- Statussen: concept, wacht op partner, verstuurd, akkoord, afgewezen, verlopen. Akkoord is definitief.
- Er is geen pdf en de offerte gaat niet per mail. "Verstuurd" zet je met de hand.

**Voorstellen en de voorstelgenerator**
- Dossiers worden in de database bewaard en zijn voor het hele team zichtbaar.
- De generator heeft tien tabbladen: bedrijf, intake, doelen, plan, content, marketing-set-up, uren en producten, offerte, afronden en toegangen.
- **Drie onderdelen, te combineren:**
  - **Marketing Partnership:** set-up, maandpakket, content en advertentiebudget.
  - **Consultancy:** uren maal het verkooptarief per persoon. Als urenbundel (vooruit betaald) of als maandinzet.
  - **Losse producten:** uit de catalogus, of eigen producten.
- **Verder in het voorstel:**
  - kortingen, nooit op advertentiebudget of licenties;
  - cadeau-extra's;
  - benchmarks;
  - een controlelijst met wat er nog ontbreekt.
- **AI.** Schrijft de bedrijfsomschrijving, vult de intake in vanuit notities, en schrijft lege teksten. Als alternatief kun je een opdracht voor ChatGPT kopiëren.
- **PDF.** Het hele voorstel, of alleen de set-up, alleen het maandpakket, of alleen de profielpagina's: één A4 per persoon, gevuld vanuit Medewerkers.
- **Opslaan in het CRM.** Bij opslaan maakt de generator het bedrijf (als prospect) en de contactpersoon aan, of koppelt ze. Hij vult alleen lege velden.

**Abonnementen**
- Omzet per maand en per jaar, en wie welk aandeel heeft. Bij één klant met 15% of meer volgt een waarschuwing.
- De dagelijkse run maakt interne facturen (ABO-JJJJ-MM) en waardeert het budget op. Gemiste dagen worden ingehaald.
- Sinds PR #47 tot en met #51 kunnen abonnementen ook als terugkerende factuur naar Moneybird. Facturen uit Moneybird verschijnen in het klantportaal.

### Uitvoering

**Campagnes**
- **Statussen:** concept, voorstel, akkoord, afgerond. Verstuurde versies worden bevroren.
- **De briefing in negen delen:** basis, doel en KPI's, aanbod, doelgroep, deliverables, planning, afspraken, achtergrond en hypothese. Uit de hypothese berekent het portaal het budget.
- **Versturen.** Gaat met afdrukken of pdf. Het systeem mailt de klant niet zelf.
- **"Klant is akkoord".** Zet het plan in ClickUp: één taak, met een subtaak per regel van de planning.
- **Feedback van de klant verwerken met AI.**
  - Tekst plakken of een bestand uploaden.
  - De briefing wordt netjes herschreven.
  - Wat er veranderde, staat in interne notities.
  - Een verwerking is terug te draaien.

**Uitingen-check (AI)**
- Controleert een post, advertentie, nieuwsbrief, flyer of landingspagina tegen:
  - de algemene regels;
  - de afspraken met de klant;
  - merk, logo, toon, kleuren en fonts;
  - de doelgroep;
  - de briefing;
  - de landingspagina;
  - spelling.
- **Het oordeel** komt uit de bevindingen, niet uit de AI zelf:
  - rood: er blokkeert iets;
  - oranje: er is iets belangrijks, of iets kon niet gecheckt worden;
  - groen: alles in orde.
- **Vrijgeven.** Bij rood of oranje alleen met een schriftelijke reden, die bewaard blijft.
- Maximaal 150 checks per dag.

**Merkkluizen**
- Per klant:
  - logo's (vier vaste plekken);
  - kleuren met contrastcheck;
  - negen tekststijlen;
  - fonts met licentie;
  - knoppen;
  - tone of voice;
  - beelden met gebruiksrechten, toestemming en houdbaarheid.
- Een volledigheidsscore van 7 punten.
- De stylesheet als pdf van één pagina.

**Beeldbank.** Alle beelden van alle klanten, te filteren op klant en tag.

**AI-vindbaarheid**
- Meet elke maand of James Robinson genoemd wordt door ChatGPT, Gemini, Claude en Google AI-modus.
- **Werkwijze.** Je stelt elke vraag drie keer in een nieuw gesprek en plakt het antwoord. Het portaal herkent daarna:
  - of we genoemd worden, en op welke plek;
  - welke concurrenten genoemd worden;
  - welke bronnen de AI noemt.
- **Overzicht** per platform, met een rooster per vraag over zes maanden.

### Marketing
**Website.** De redactie van onze eigen website:
- registers en de Performance Engine;
- algemene pagina's en branchevarianten met overerving per veld;
- workflow met herbeoordeling;
- contentmatrix;
- bewijs met een toestemmingscheck;
- export naar Markdown, JSON en CSV.

Zie `documenten/marketing-website/beheerdershandleiding.md`.

### HR

**Medewerkers**
- Per persoon: functie, uren, portefeuille, omzet en laatste login.
- **Alleen admin:**
  - collega toevoegen;
  - rol wijzigen;
  - blokkeren;
  - exporteren naar Excel;
  - "Wat het team kost": in loondienst tegenover managementfee, en als deel van de omzet.

**Medewerkerprofiel**
- Gegevens en wachtwoord.
- Profiel voor voorstellen.
- Verkooptarief: het hele team ziet het, alleen admin wijzigt het.
- **Alleen admin:**
  - uurkostprijs;
  - intern profiel (de medewerker ziet het niet);
  - persoonsgegevens en documenten, versleuteld en met een log van wie ze opent;
  - overdracht aan de salarisadministratie;
  - contracten, met een signaal voor de ketenregeling;
  - salaris;
  - bedrijfsmiddelen;
  - dossiernotities;
  - checklist onboarding.

**Vacatures**
- Open plekken en kandidaten in procedure.
- Alarmen: langer dan 3 dagen geen reactie, geen volgende stap, bewaartermijn bijna om.
- Salarisrange uit het salarishuis; alleen admins zien de bedragen.
- Sollicitaties van de website komen automatisch binnen.

**Kandidaten**
- Acht statussen; afwijzen kan alleen met een reden.
- Volgende stap, notities, cv en motivatie.
- Bewaartermijn: 4 weken, of 1 jaar met toestemming. Daarna wordt alles automatisch gewist.
- **Alleen admin:** contract opstellen, gegevenslink voor de kandidaat (14 dagen geldig), welkomstmail.

**Indiensttreding** (alleen admin), in vijf stappen:
1. Persoonsgegevens.
2. Contract.
3. Printen en tekenen.
4. Getekende stukken.
5. In dienst nemen.

Bij die laatste stap gebeurt in één keer: de collega wordt aangemaakt, contract en salaris gaan naar zijn dossier, de documenten worden verplaatst, de kandidaat staat op aangenomen en een volle vacature gaat dicht.

**Contracten** (alleen admin)
- Bepaalde en onbepaalde tijd.
- De proeftijd wordt automatisch begrensd.
- Waarschuwing voor de aanzegtermijn.
- Pdf en AVG-verklaring.
- Getekend vastleggen.

### Bedrijf
- **Bedrijfsgegevens** (alleen admin):
  - het bedrijf, verzekeringen en pensioen (die gaan mee in elk contract);
  - het logo;
  - de vestigingen;
  - het personeelshandboek en het loonheffingsformulier, met versies;
  - het contactpersoon bij de salarisadministratie.
- **Diensten.**
  - De catalogus met prijs, eenheid, kostprijs en marge.
  - Hoe vaak elke dienst geboekt is en wat hij opleverde.
  - Een nieuwe prijs geldt alleen voor nieuwe boekingen.
- **Portfolio.**
  - Per marketingmanager de maandwaarde van zijn klanten tegenover zijn doel.
  - Klanten verschuiven kan iedereen.
  - Doelen zetten kan alleen admin.
- **Financieel.**
  - Omzet, marge en terugkerende omzet.
  - Een grafiek over 12 maanden.
  - Ranglijsten per klant, medewerker en dienst.
  - Zichtbaar voor het hele team, marges inbegrepen.
- **Salarishuis** (alleen admin):
  - versies met schalen en treden;
  - minimumloontoets;
  - rekenhulp.
- **Standaardteksten** (alleen admin):
  - contractteksten met artikelen en voorwaarden;
  - de AVG-verklaring;
  - vijf mailsjablonen.

### Koppelingen en sync
- **Koppelingen.**
  - Google eenmalig koppelen, de status per platform bekijken.
  - Koppelen en ontkoppelen kan alleen admin.
  - TikTok wacht op goedkeuring.
- **ClickUp-sync.** Boekt declarabele ClickUp-taken op wallets. Dat gebeurt nu alleen via de opdrachtregel: er is geen knop.

### Pagina's buiten het menu
- **Beginsaldo:** saldi in één keer goed zetten.
- **Concurrenten.**
- **Contactpersonen:** oude link, stuurt door naar Contacten.

## 5. Openbare links (zonder inloggen)

| Link | Voor |
|---|---|
| Vragenlijst | De prospect vult vragenlijst 01.1 in. Geldig 30 dagen. |
| Uitvraag | De partner geeft prijs en beschikbaarheid op, en ziet niet wat anderen of de klant betalen. |
| Gegevens | De nieuwe collega levert persoonsgegevens, IBAN, ID en loonheffing aan. Geldig 14 dagen. |
| Document en personeelshandboek | Vaste link per versie, voor in contracten. |
| Sollicitatie | Geen pagina maar een beveiligde ingang voor het formulier op jamesrobinson.nl. |

## 6. Koppelingen met andere systemen

| Systeem | Waarvoor | Werkt |
|---|---|---|
| Resend | Mails versturen | Ja |
| Google Analytics 4 en Search Console | Bezoekers, conversies, impressies | Ja |
| Google Ads | Uitgaven en resultaat, via ons MCC-account | Ja |
| Google Bedrijfsprofiel | Weergaven en acties | Ja, als Google het quotum toekent |
| Meta Ads | Advertentiecijfers | Ja |
| LinkedIn Ads | Campagnecijfers | Ja; de koppeling is één jaar geldig |
| Ahrefs | Domeinscore, zoekwoorden, organisch verkeer | Ja |
| Claude (Anthropic) | Uitingen-check, briefingverwerking, teksten voor voorstellen | Ja |
| ClickUp | Campagneplannen en het boeken van taken | Ja; boeken alleen met de hand gestart |
| WordPress | Binnenkomende sollicitaties | Ja |
| TikTok Ads | Advertentiecijfers | Nee, wacht op API-toegang |
| Moneybird | Abonnementen als terugkerende facturen, Moneybird-facturen in het klantportaal | Ja, sinds PR #47 tot en met #51. Aan te zetten met een instelling; niet door mij nagelopen. |
| MailerLite | E-mailmarketing | Nee, alleen genoemd in teksten |
| OpenAI en Gemini | Automatische AI-meting | Nee, de meting is nu handmatig |

## 7. Wat er automatisch draait

| Wanneer (Nederlandse wintertijd) | Wat |
|---|---|
| Elke nacht, 04:17 | Performancecijfers van alle bronnen bijwerken |
| Elke dag, 06:00 | Sollicitatiegegevens met een verlopen bewaartermijn wissen |
| Elke dag, 07:00 | Abonnementsrun: interne factuur en opwaardering |
| Elk kwartier | Abonnementen en facturen met Moneybird afstemmen (sinds PR #47) |
| Op aanvraag | AI-briefingverwerking en de Uitingen-check, als achtergrondtaak |
| Bij elke deploy | Eerst de databasemigraties. Mislukken die, dan gaat er niets live. |

## 8. Mails die het systeem zelf verstuurt

1. De inloglink.
2. "Nieuwe collega" aan de salarisadministratie.
3. De partneraanvraag met de persoonlijke link.

De mails voor het contract, het afschrift, de gegevensaanvraag en het welkom verstuurt het systeem niet zelf. Ze openen ingevuld in je eigen mailprogramma.

## 9. Beveiliging en privacy

- **De database is dicht voor de buitenwereld.** Row Level Security staat op alle tabellen. Zo is de openbare toegang van Supabase afgesloten.
- **Versleuteling.**
  - IBAN, ID-kopieën en loonheffingsformulieren zijn versleuteld opgeslagen.
  - Google- en LinkedIn-tokens ook.
  - Wachtwoorden en inlogtokens alleen als hash.
- **Persoonsdocumenten.** Alleen admins kunnen ze openen, en elke keer dat iemand dat doet wordt vastgelegd.
- **Boekingen.** Een boeking wordt nooit gewijzigd, alleen tegengeboekt.
- **Geschiedenis.** Er is geen algemeen auditlog. Wel bewaard:
  - de tijdlijn per klant;
  - inlogpogingen;
  - wie welk persoonsdocument opende;
  - de versies van campagnes en webteksten;
  - de sync-historie.

## 10. Kwaliteit

- **Tests.** 76 testbestanden met zo'n 940 tests. Ze dekken geld, inloggen en beveiliging, CRM en verkoop, HR, campagnes, resultaten en de koppelingen.
- **Bekende fouten.** Er falen 4 tests uit het koppelingenwerk van andere sessies:
  - ontbrekende foutmeldingen bij twee nieuwe tabellen;
  - kolomnamen die als "geheim" worden aangemerkt.

## 11. Wat er niet in zit

- **Geen dagmail.** Die bestaat alleen als document (08.8).
- **Geen mail bij een laag saldo.** De meldgrens kleurt alleen de balk.
- **Geen uitnodigingsmail.** Een nieuwe klantgebruiker wordt aangemaakt, maar krijgt geen bericht.
- **Geen pdf of verzending van offertes.**
- **Geen koppeling met MailerLite.** Moneybird is sinds PR #47 tot en met #51 wel gekoppeld.
- **Geen automatische AI-meting.**
- **Geen AI-vindbaarheid per klant.** Het datamodel kan het wel, maar er is geen knop.
- **Omzet in het klantrapport is altijd leeg.**

## 12. Losse eindjes in de code

- **Pijplijn:** heropenen en verwijderen bestaan in de code, maar er is geen knop voor. De fases zijn niet aan te passen.
- **Diensten:** in het wijzigformulier ontbreken eenheid, code en verwachte tijd.
- **Standaardteksten:** de contractsoorten oproep, stage en zzp bestaan, maar zijn nog niet bruikbaar.
- **Quickscan:** de punten 17 tot en met 24 wachten op AI. Op één plek staat ook "veertien" in plaats van "zestien" punten.
- **Merkkluis:** grafische elementen zijn een plek voor later.
- **Voorstelgenerator:**
  - twee tabbladen hebben allebei nummer 7;
  - twee teksten beloven functies die er nog niet zijn ("straks vult AI dit aan").
- **Meekijken:** niet gecontroleerd of acties in het klantportaal tijdens het meekijken echt geblokkeerd zijn.

## 13. Documenten in de repository

| Map | Inhoud |
|---|---|
| `documenten/1 Verkopen` | 01.1 tot en met 04.4: vragenlijst, belscript, quickscan, intake, calculatie, voorstel |
| `documenten/2 Starten` | 05.1 tot en met 07.3: offerteregels, kick-off, onboarding, fundament, draaidag, merkcheck |
| `documenten/3 Samenwerken` | 08.1 tot en met 08.9: livegang, maandupdate, reviews, jaargesprek, dagmail, opzeggen |
| `documenten/4 Verkoopondersteuning` | Tarieven, pakketten, werkwijze, het magazine |
| `documenten/5 Intern` | Spelregels, klantprofiel, campagnebriefing |
| `documenten/propositie` | De propositie |
| `documenten/ai-vindbaarheid` | Onze nulmeting |
| `documenten/marketing-website` | Handleiding en implementatieplan |
