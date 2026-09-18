# SEO en merk — waar ze botsen en waar niet

Hoort bij `DIENSTEN-TEKSTEN.md` en `TONE-OF-VOICE.md`.

---

## Het korte antwoord

**Je hebt gelijk: de titels hoeven niet te veranderen naar zoekwoordkoppen.** Broodtekst en H2's doen het SEO-werk.

**Maar er zat één fout in mijn opzet**, en die had je een deel van je rankings gekost. Hij is in vijf minuten opgelost en kost niets aan merk.

De fout: ik zette *"Vindbaarheid"* boven *"Maanden werk. Daarna stopt het niet meer."* Als die tweede zin de H1 is, staat er op je SEO-pagina nergens het woord waar mensen op zoeken — niet in de H1, niet in de eerste zin.

Dat is niet fataal, maar er is een tweede effect dat wel vervelend is: **als je title-tag en je H1 te ver uiteenlopen, herschrijft Google je title vaker.** Dan verlies je de controle over wat er in de zoekresultaten staat. Recente cijfers wijzen erop dat afstemming tussen beide dat herschrijfpercentage flink omlaag brengt.

---

## Apple lost dit zelf al op

Kijk naar een productpagina van Apple. Wat is daar de H1?

```html
<h1>MacBook Pro</h1>
<p class="tagline">Mind-blowing. Head-turning.</p>
```

**Niet de poëzie. De productnaam.**

Apple zet het ding in de H1 en de poëzie in de regel eronder. Die tagline is geen heading — het is gewoon een alinea met een grote lettergrootte.

Dat is precies de oplossing. Geen compromis, geen halfslachtige "SEO-vriendelijke merkkop". Twee elementen, elk met één taak.

---

## De drie lagen

| Laag | Wie ziet het | Taak | Toon |
|---|---|---|---|
| **Title-tag** | alleen Google | ranken en geklikt worden | volledig zoekgericht |
| **H1** | de bezoeker | zeggen waar de pagina over gaat | de dienstnaam |
| **Lead onder de H1** | de bezoeker | het merk | volledig merk |
| **H2's** | beide | de longtail pakken | helder en zoekgericht |
| **Broodtekst** | beide | diepte en context | helder, merkregister |

De bezoeker ziet de title-tag alleen in de zoekresultaten. Op de pagina zelf ziet hij hem nooit. Dat is vrije ruimte die je volledig aan SEO mag geven.

---

## De herziene dienstenkoppen

Alleen de bovenste regel verandert. De constateringen blijven exact zoals ze zijn.

| Title-tag | Tekens | H1 | Lead (ongewijzigd) |
|---|---|---|---|
| SEO-bureau Zuid-Limburg \| James Robinson | 40 | **SEO** | Maanden werk. Daarna stopt het niet meer. |
| Google Ads-bureau Limburg \| James Robinson | 42 | **Google Ads** | Zichtbaar vanaf dag één. Weg op de dag dat je stopt. |
| Social advertising bureau \| James Robinson | 42 | **Social advertising** | Bereik vóór de vraag. |
| E-mailmarketing bureau Limburg \| James Robinson | 47 | **E-mailmarketing** | Van jou. Niet geleend. |
| Conversie-optimalisatie (CRO) \| James Robinson | 46 | **Conversie-optimalisatie** | Hetzelfde verkeer. Ander resultaat. |
| Landingspagina laten maken \| James Robinson | 43 | **Landingspagina's** | Eén pagina. Eén ding. |
| WordPress hosting en onderhoud \| James Robinson | 47 | **Hosting en onderhoud** | Merkbaar alleen als het misgaat. |
| Bedrijfsfotografie Limburg \| James Robinson | 43 | **Bedrijfsfotografie** | De eerste twee seconden. |
| Bedrijfsvideo laten maken \| James Robinson | 42 | **Videografie** | Twintig seconden. Drie alinea's minder. |
| Branding en huisstijl bureau \| James Robinson | 45 | **Branding** | Wat overblijft als de prijs gelijk is. |
| Belettering en gevelreclame \| James Robinson | 44 | **Belettering** | Eén keer aangebracht. Jaren onderweg. |
| Drukwerk laten maken \| James Robinson | 37 | **Drukwerk** | Blijft liggen. |
| Marketing automation \| James Robinson | 37 | **Marketing automation** | Werkt door na vijven. |
| Leadinfo implementatie \| James Robinson | 39 | **Leadinfo** | Bedrijven laten sporen achter. |
| Marketingbureau Zuid-Limburg \| James Robinson | 45 | **Marketingpartnership** | Een marketingafdeling. Zonder de afdeling. |

Alle title-tags blijven onder de 60 tekens, dus ze worden niet afgekapt.

### Wat er verloren gaat

Twee poëtische namen sneuvelen als H1: *De lijst* en *Merk*. Die waren mooi, maar niemand zoekt erop.

**Gebruik ze als H2 binnen de pagina.** "De lijst is van jou" is een prima tussenkop halverwege de e-mailmarketingpagina. Zo houd je de vondst en verlies je geen relevantie.

---

## De pagina-architectuur — de Tech Specs-oplossing

Hier zit de echte spanning, en Apple heeft hem ook opgelost.

Een pagina met twintig woorden gaat niet ranken op "SEO-bureau Limburg", hoe mooi die twintig woorden ook zijn. Concurrenten hebben daar duizend woorden staan.

Apple's antwoord: **de marketingpagina is kaal en poëtisch, en daarnaast staat een uitputtende Tech Specs-pagina.** Twee registers, twee doelen, allebei op apple.com.

Vertaald naar een dienstenpagina:

```
┌─────────────────────────────────────────┐
│  H1: SEO                                │  ← merk
│  Maanden werk. Daarna stopt het         │    20 woorden
│  niet meer.                             │    veel witruimte
│                                         │
│  [Plan een gesprek]                     │
└─────────────────────────────────────────┘
        ↓ scrollen
┌─────────────────────────────────────────┐
│  H2: Hoe lang duurt SEO?                │  ← vindbaarheid
│  H2: Technische SEO                     │    600–1.200 woorden
│  H2: SEO voor bedrijven in Zuid-Limburg │    helder, niet poëtisch
│  H2: Cases                              │
│  H2: Veelgestelde vragen  [accordion]   │
└─────────────────────────────────────────┘
```

**Boven de vouw: merk. Daaronder: vindbaarheid.** De bezoeker die al weet wat hij zoekt, klikt meteen op de knop. De bezoeker die via Google binnenkomt op een vraag, scrollt en vindt zijn antwoord.

### De accordion is je beste vriend

Een FAQ-accordion bevat veel tekst en neemt visueel bijna geen ruimte in. Google indexeert die inhoud volledig, mits hij in de HTML staat en niet pas na een klik wordt ingeladen — en dat is precies hoe Elementor's accordion werkt.

Zo krijg je zeshonderd woorden op een pagina die er kaal uitziet. Dat is de enige plek waar je echt iets voor niets krijgt.

---

## Waar je zoekwoorden kwijt kunt zonder het merk aan te tasten

| Plek | Zichtbaar voor de bezoeker | Vrij voor SEO |
|---|---|---|
| Title-tag | alleen in Google | **volledig** |
| Meta-omschrijving | alleen in Google | **volledig** |
| URL-slug (`/seo/`) | in de adresbalk | **volledig** |
| H2's en H3's | ja | grotendeels |
| FAQ-accordion | alleen als je klikt | **volledig** |
| Alt-teksten bij beeld | nee | **volledig** |
| Ankertekst van interne links | ja, klein | grotendeels |
| Schema markup (Service, FAQPage) | nee | **volledig** |
| Breadcrumbs | ja, klein | grotendeels |
| Bijschriften onder beeld | ja, klein | grotendeels |

De H1 en de lead zijn de enige twee plekken waar het merk het volledig voor het zeggen heeft. Overal daaromheen mag je optimaliseren zonder dat iemand het merkt.

---

## H2's per dienst — waar de longtail zit

Drie tot vijf per pagina. Helder geformuleerd, in de taal waarin mensen zoeken. Dit is niet het merkregister.

**SEO** · Hoe lang duurt SEO? · Wat is technische SEO? · SEO voor bedrijven in Zuid-Limburg · Wat kost SEO per maand?

**Google Ads** · Wat kost adverteren in Google? · Het verschil tussen SEO en Google Ads · Google Ads voor lokale bedrijven · Hoe meten we of het werkt?

**Social advertising** · Adverteren op Instagram en Facebook · Wanneer werkt social beter dan Google? · Wat kost een social campagne?

**E-mailmarketing** · Een nieuwsbrief opzetten · De lijst is van jou · Hoe vaak moet je mailen? · E-mailautomatisering

**Conversie-optimalisatie** · Wat is conversie-optimalisatie? · Hoe meet je conversie? · A/B-testen in de praktijk

**Hosting** · WordPress hosting en onderhoud · Wat gebeurt er bij een storing? · Back-ups en beveiliging

**Bedrijfsfotografie** · Bedrijfsfotografie in Limburg · Wat kost een fotoshoot? · Productfotografie

**Videografie** · Een bedrijfsvideo laten maken · Wat kost een bedrijfsfilm? · Video voor social

**Landingspagina's** · Een landingspagina laten maken · Wat is een landingspagina? · Landingspagina of homepage · Landingspagina voor Google Ads

**Branding** · Wat is branding? · Een nieuwe huisstijl laten maken · Logo-ontwerp · Rebranding

**Belettering** · Autobelettering en wagenparkbestickering · Gevelreclame en lichtbakken · Wat kost belettering?

**Drukwerk** · Drukwerk laten maken · Visitekaartjes, folders en brochures · Levertijden en oplages

**Marketing automation** · Wat is marketing automation? · Automatiseren in ClickUp · Voorbeelden uit de praktijk

**Leadinfo** · Zien welke bedrijven je site bezoeken · Hoe werkt Leadinfo? · Wat mag wel en niet met AVG

**Marketingpartnership** · Wat kost een marketingpartnership? · Waarom geen losse projecten? · Hoe werkt de samenwerking?

---

## Wat je niet moet doen

| Niet doen | Waarom |
|---|---|
| De lead volstoppen met zoekwoorden | Dat is de enige plek waar het merk het voor het zeggen heeft |
| H1 en title-tag identiek maken | Verspilde ruimte — de title mag lokaler en specifieker |
| Meerdere H1's op één pagina | Verwart de structuur, ook voor schermlezers |
| Een zoekwoord in de H1 forceren | "SEO die écht werkt voor jouw bedrijf in Limburg" — dit is precies het register dat je afwees |
| De diepte-content weglaten omdat hij niet mooi is | Dan rank je niet en ziet niemand het mooie deel |
| Uitleg-content boven de vouw zetten | De eerste indruk is merk. Altijd. |

---

## De check per pagina

- [ ] Title-tag onder 60 tekens, met het zoekwoord vooraan
- [ ] Meta-omschrijving 140–155 tekens
- [ ] Eén H1, gelijk aan of dicht bij het zoekwoord uit de title
- [ ] De lead eronder is volledig merkregister
- [ ] Drie tot vijf H2's in zoektaal
- [ ] Minimaal 600 woorden onder de vouw
- [ ] FAQ-accordion met minstens vier vragen
- [ ] URL-slug kort en zonder stopwoorden: `/seo/`, niet `/onze-diensten/seo-optimalisatie/`
- [ ] Service- en FAQPage-schema ingevuld
- [ ] Interne links met beschrijvende ankertekst, niet "lees meer"
- [ ] Alt-teksten bij elk beeld
- [ ] De pagina laadt onder 2,5 seconden (Core Web Vitals)

---

## Nog één observatie

Een groeiend deel van het zoekverkeer loopt inmiddels via AI-samenvattingen. Die pakken bij voorkeur korte, feitelijke, declaratieve zinnen op — precies het register waar we voor gekozen hebben.

"Maanden werk. Daarna stopt het niet meer." is makkelijker te citeren dan "Onze data-driven SEO-aanpak zorgt voor duurzame groei in relevante zoekresultaten."

Dat is geen reden om voor deze stijl te kiezen — die keuze stond al. Maar het is een prettige bijvangst, en het maakt de keuze goedkoper dan hij eruitziet.

---

*James Robinson — Marketing & Branding | www.jamesrobinson.nl*
