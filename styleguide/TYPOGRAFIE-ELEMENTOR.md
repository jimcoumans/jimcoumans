# Typografie in Elementor — invulblad

Alles wat je in het Typografie-paneel invult, per stijl, per breakpoint.
Hoort bij `jr-elementor-globals.css` v3.0.

---

## 1. Lees dit eerst — bespaar jezelf twee derde van het werk

Het Typografie-paneel heeft naast **Regelafstand** en **Letterafstand** een eenheids-dropdown (`px ⌄`). Standaard staat die op **px**. Dan moet je per stijl **drie waarden** invullen: desktop, tablet, mobiel.

Zet die dropdown op **`em`** en je vult **één waarde** in die automatisch meeschaalt met de lettergrootte op elk apparaat.

| | px (standaard) | **em (aanbevolen)** |
|---|---|---|
| Regelafstand H1 | 60 / 48 / 37 invullen | **1.08** — één keer |
| Letterafstand H1 | −1.2 / −1 / −0.6 invullen | **−0.022** — één keer |
| Invulwerk per stijl | 6 velden | **2 velden** |
| Fout als je de grootte later wijzigt | ja, moet je alles nalopen | nee, schaalt mee |

**Doe het met em.** Beide tabellen staan hieronder, dus als je liever px invult kan dat ook — maar dan moet je bij elke toekomstige wijziging drie waarden nalopen in plaats van één.

De **Afmeting** vul je altijd per breakpoint in. Daar is geen ontkomen aan.

---

## 2. Vier velden die je overal hetzelfde invult

| Veld | Waarde | Waarom |
|---|---|---|
| **Transformeren** | Standaard | Wij schrijven altijd sentence case. Nooit uppercase — ook niet bij eyebrows en labels. Dat is een van de dingen die Apple's typografie rustig houdt. |
| **Stijl** | Standaard | Geen cursief. Nergens. |
| **Decoratie** | Standaard | Geen onderstreping. De enige uitzondering is een link binnen een alinea; die regelt de stylesheet. |
| **Woordafstand** | leeg laten | Inter is er al op afgestemd. Zodra je hieraan draait, valt het op. |

Vul je die vier één keer goed in, dan hoef je ze nooit meer aan te raken.

---

## 3. Het invulblad — em-methode (aanbevolen)

Zet **Regelafstand** en **Letterafstand** beide op **`em`**. Dan vul je per stijl in:
Familie · Dikte · Afmeting (3×) · Regelafstand (1×) · Letterafstand (1×).

| Stijl | Familie | Dikte | Afmeting D / T / M | Regelafstand (em) | Letterafstand (em) |
|---|---|---|---|---|---|
| **Display** | Inter Tight | 700 | 80 / 56 / 40 | 1.05 | −0.028 · mobiel −0.022 |
| **H1** | Inter Tight | 700 | 56 / 44 / 34 | 1.08 | −0.022 · mobiel −0.018 |
| **H2** | Inter Tight | 700 | 40 / 34 / 28 | 1.12 | −0.018 · mobiel −0.014 |
| **H3** | Inter Tight | 600 | 28 / 26 / 22 | 1.12 | −0.014 |
| **H4** | Inter Tight | 600 | 24 / 22 / 20 | 1.25 | −0.010 |
| **H5** | Inter Tight | 600 | 21 / 20 / 18 | 1.25 | −0.008 |
| **H6** | Inter | 600 | 17 / 17 / 16 | 1.25 | −0.004 |
| **Lead** | Inter | 400 | 21 / 20 / 18 | 1.45 | 0 |
| **Body** | Inter | 400 | 17 / 17 / 16 | 1.55 | 0 |
| **Small** | Inter | 400 | 14 / 14 / 14 | 1.45 | 0.004 |
| **Caption** | Inter | 400 | 12 / 12 / 12 | 1.4 | 0.004 |
| **Eyebrow** | Inter | 600 | 14 / 14 / 14 | 1.3 | 0 |
| **Knop** | Inter | 500 | 17 / 17 / 16 | 1.2 | −0.008 |
| **Quote** | Inter Tight | 600 | 32 / 28 / 22 | 1.25 | −0.014 |
| **Kengetal** | Inter Tight | 700 | 64 / 52 / 40 | 1.0 | −0.022 |
| **Nav** | Inter | 400 | 14 / 14 / 14 | 1.4 | 0 |
| **Label** | Inter | 500 | 14 / 14 / 14 | 1.4 | 0 |
| **Badge** | Inter | 500 | 12 / 12 / 12 | 1.0 | 0 |
| **Tag** | Inter | 400 | 14 / 14 / 14 | 1.4 | 0 |
| **Menu mobiel** | Inter Tight | 600 | 24 / 24 / 24 | 1.25 | −0.010 |

**Drie stijlen hebben een afwijkende mobiele letterafstand** (Display, H1, H2). Op klein formaat werkt strakke tracking tegen je: de letters kruipen in elkaar. Zet daar op mobiel de losse waarde in.

---

## 4. Het invulblad — px-methode

Blijft de dropdown op `px` staan, vul dan dit in. Elke kolom is een breakpoint.

### Desktop (> 1068 px)

| Stijl | Familie | Dikte | Afmeting | Regelafstand | Letterafstand |
|---|---|---|---|---|---|
| Display | Inter Tight | 700 | 80 | 84 | −2.2 |
| H1 | Inter Tight | 700 | 56 | 60 | −1.2 |
| H2 | Inter Tight | 700 | 40 | 45 | −0.7 |
| H3 | Inter Tight | 600 | 28 | 31 | −0.4 |
| H4 | Inter Tight | 600 | 24 | 30 | −0.2 |
| H5 | Inter Tight | 600 | 21 | 26 | −0.2 |
| H6 | Inter | 600 | 17 | 21 | −0.1 |
| Lead | Inter | 400 | 21 | 30 | 0 |
| Body | Inter | 400 | 17 | 26 | 0 |
| Small | Inter | 400 | 14 | 20 | 0.1 |
| Caption | Inter | 400 | 12 | 17 | 0 |
| Eyebrow | Inter | 600 | 14 | 18 | 0 |
| Knop | Inter | 500 | 17 | 20 | −0.1 |
| Quote | Inter Tight | 600 | 32 | 40 | −0.4 |
| Kengetal | Inter Tight | 700 | 64 | 64 | −1.4 |
| Nav | Inter | 400 | 14 | 20 | 0 |
| Label | Inter | 500 | 14 | 20 | 0 |
| Badge | Inter | 500 | 12 | 12 | 0 |
| Tag | Inter | 400 | 14 | 20 | 0 |
| Menu mobiel | Inter Tight | 600 | 24 | 30 | −0.2 |

### Tablet (≤ 1068 px)

| Stijl | Afmeting | Regelafstand | Letterafstand |
|---|---|---|---|
| Display | 56 | 59 | −1.6 |
| H1 | 44 | 48 | −1.0 |
| H2 | 34 | 38 | −0.6 |
| H3 | 26 | 29 | −0.4 |
| H4 | 22 | 28 | −0.2 |
| H5 | 20 | 25 | −0.2 |
| H6 | 17 | 21 | −0.1 |
| Lead | 20 | 29 | 0 |
| Body | 17 | 26 | 0 |
| Small | 14 | 20 | 0.1 |
| Caption | 12 | 17 | 0 |
| Eyebrow | 14 | 18 | 0 |
| Knop | 17 | 20 | −0.1 |
| Quote | 28 | 35 | −0.4 |
| Kengetal | 52 | 52 | −1.1 |
| Nav | 14 | 20 | 0 |
| Label | 14 | 20 | 0 |
| Badge | 12 | 12 | 0 |
| Tag | 14 | 20 | 0 |
| Menu mobiel | 24 | 30 | −0.2 |

### Mobiel (≤ 734 px)

| Stijl | Afmeting | Regelafstand | Letterafstand |
|---|---|---|---|
| Display | 40 | 42 | −0.9 |
| H1 | 34 | 37 | −0.6 |
| H2 | 28 | 31 | −0.4 |
| H3 | 22 | 25 | −0.3 |
| H4 | 20 | 25 | −0.2 |
| H5 | 18 | 22 | −0.1 |
| H6 | 16 | 20 | −0.1 |
| Lead | 18 | 26 | 0 |
| Body | 16 | 25 | 0 |
| Small | 14 | 20 | 0.1 |
| Caption | 12 | 17 | 0 |
| Eyebrow | 14 | 18 | 0 |
| Knop | 16 | 19 | −0.1 |
| Quote | 22 | 28 | −0.3 |
| Kengetal | 40 | 40 | −0.9 |
| Nav | 14 | 20 | 0 |
| Label | 14 | 20 | 0 |
| Badge | 12 | 12 | 0 |
| Tag | 14 | 20 | 0 |
| Menu mobiel | 24 | 30 | −0.2 |

**Body en Knop gaan op mobiel naar 16px en niet lager.** Onder 16px zoomt iOS automatisch in zodra iemand in een formulierveld tikt, en dan raakt de bezoeker de pagina kwijt.

---

## 5. Waar vul je het in?

Elementor heeft twee plekken. Gebruik ze allebei.

### Theme Style → Typography

Hier zet je de **standaard HTML-elementen**. Alles wat je daarna als H2 in de editor kiest, krijgt deze stijl automatisch — zonder dat iemand een klasse hoeft in te vullen.

| Elementor-veld | Stijl uit de tabel |
|---|---|
| Body | Body |
| H1 | H1 |
| H2 | H2 |
| H3 | H3 |
| H4 | H4 |
| H5 | H5 |
| H6 | H6 |
| Links | Body, kleur `#0066CC` |
| Form Fields | Body |
| Buttons | Knop |

### Site Settings → Global Fonts

Hier zet je de **overige stijlen**. Die kies je per widget in de Typografie-dropdown.

| Slot | Naam | Stijl |
|---|---|---|
| Primary (system) | JR Display | H1 |
| Secondary (system) | JR Heading | H3 |
| Text (system) | JR Body | Body |
| Accent (system) | JR Action | Knop |
| Custom | JR Hero | Display |
| Custom | JR Lead | Lead |
| Custom | JR Eyebrow | Eyebrow |
| Custom | JR Small | Small |
| Custom | JR Caption | Caption |
| Custom | JR Quote | Quote |
| Custom | JR Stat | Kengetal |
| Custom | JR Nav | Nav |
| Custom | JR Label | Label |
| Custom | JR Badge | Badge |
| Custom | JR Tag | Tag |
| Custom | JR Menu Mobile | Menu mobiel |

**Twintig stijlen invullen kost ongeveer een uur.** Daarna hoeft niemand in het team ooit nog een lettergrootte te verzinnen — en dat is precies het punt.

---

## 6. Welke stijl gebruik je waar?

Dit is het antwoord op "welke moet ik nou kiezen". Per component, per element.

### Hero

| Element | Stijl | Kleur |
|---|---|---|
| Labeltje boven de kop | **Eyebrow** | `#0066CC` |
| De grote kop | **Display** (of H1 op een binnenpagina) | `#1D1D1F` |
| De zin eronder | **Lead** | `#6E6E73` |
| Knop | **Knop** | wit op `#0857C3` |

### Sectiekop

| Element | Stijl | Kleur |
|---|---|---|
| Labeltje | **Eyebrow** | `#0066CC` |
| Sectiekop | **H2** | `#1D1D1F` |
| Intro-zin | **Lead** | `#6E6E73` |

### Lopende tekst

| Element | Stijl | Kleur |
|---|---|---|
| Tussenkop | **H3** | `#1D1D1F` |
| Kleinere tussenkop | **H4** | `#1D1D1F` |
| Alinea | **Body** | `#1D1D1F` |
| Opsomming | **Body** | `#1D1D1F` |
| Bijschrift onder een afbeelding | **Caption** | `#86868B` |
| Voorwaarden, kleine lettertjes | **Caption** | `#86868B` |

### Card

| Element | Stijl | Kleur |
|---|---|---|
| Kop in een gewone card | **H5** | `#1D1D1F` |
| Kop in een grote card | **H4** | `#1D1D1F` |
| Tekst | **Small** | `#6E6E73` |
| Link onderin | **Knop** (tekstknop) | `#0066CC` |

### Icon box

| Element | Stijl | Kleur |
|---|---|---|
| Kop | **H5** | `#1D1D1F` |
| Tekst | **Small** | `#6E6E73` |

### Case- of blogkaart

| Element | Stijl | Kleur |
|---|---|---|
| Metadata (branche · datum) | **Caption** | `#86868B` |
| Titel | **H5** | `#1D1D1F` |
| Samenvatting | **Small** | `#6E6E73` |

### Testimonial

| Element | Stijl | Kleur |
|---|---|---|
| Het citaat | **Quote** (of **H4** in een smalle kolom) | `#1D1D1F` |
| Naam | **Body**, dikte 500 | `#1D1D1F` |
| Functie en bedrijf | **Small** | `#6E6E73` |

### Prijstabel

| Element | Stijl | Kleur |
|---|---|---|
| Pakketnaam | **H5** | `#1D1D1F` |
| Het bedrag | **Kengetal**, afmeting 44 / 40 / 36 | `#1D1D1F` |
| "per maand" | **Small** | `#6E6E73` |
| Opsomming | **Body** | `#1D1D1F` |
| Knop | **Knop** | wit op `#0857C3` |
| "Meest gekozen" | **Badge** | `#0857C3` |

### Kengetallen

| Element | Stijl | Kleur |
|---|---|---|
| Het cijfer | **Kengetal** | `#007AFF` of `#5A7000` |
| Bijschrift | **Small** | `#6E6E73` |

### Navigatie

| Element | Stijl | Kleur |
|---|---|---|
| Menu-item | **Nav** | `#1D1D1F` |
| Actief menu-item | **Nav**, dikte 500 | `#1D1D1F` |
| Kolomkop in een mega menu | **Caption**, dikte 600 | `#86868B` |
| Link in een mega menu | **H5** | `#1D1D1F` |
| Item in het mobiele menu | **Menu mobiel** | `#1D1D1F` |
| Kruimelpad | **Small** | `#6E6E73` |
| Paginanummer | **Small**, dikte 500 | `#6E6E73` |
| Anchor-nav | **Small** | `#6E6E73` |

### Footer

| Element | Stijl | Kleur |
|---|---|---|
| Kolomkop | **Small**, dikte 600 | `#1D1D1F` |
| Link | **Small** | `#6E6E73` |
| Adres, KvK, copyright | **Caption** | `#86868B` |

### Formulier

| Element | Stijl | Kleur |
|---|---|---|
| Label boven een veld | **Label** | `#1D1D1F` |
| Ingevulde tekst | **Body** | `#1D1D1F` |
| Placeholder | **Body** | `#86868B` |
| Hulptekst onder een veld | **Caption** | `#86868B` |
| Foutmelding | **Caption** | `#C02A22` |
| Label bij een checkbox | **Body** | `#1D1D1F` |
| Hulptekst bij een checkbox | **Small** | `#6E6E73` |
| Stap-label | **Caption** | `#86868B` |
| Verstuurknop | **Knop** | wit op `#0857C3` |

### Filters

| Element | Stijl | Kleur |
|---|---|---|
| Filter-chip | **Small**, dikte 500 | `#1D1D1F` / wit als actief |
| Aantal in een chip | **Caption** | `#86868B` |
| Actief filter | **Small** | `#0857C3` |
| "Alles wissen" | **Small** | `#6E6E73` |
| Resultaatteller | **Small** | `#6E6E73` |
| Sorteer-dropdown | **Small**, dikte 500 | `#1D1D1F` |
| Kop boven een filterpaneel | **Small**, dikte 600 | `#1D1D1F` |

### Tabel

| Element | Stijl | Kleur |
|---|---|---|
| Kolomkop | **Small**, dikte 600 | `#6E6E73` |
| Cel | **Body** | `#1D1D1F` |

### Accordion en tabs

| Element | Stijl | Kleur |
|---|---|---|
| Vraag / tabtitel | **H5** | `#1D1D1F` |
| Antwoord / tabinhoud | **Body** | `#6E6E73` |

### Tijdlijn

| Element | Stijl | Kleur |
|---|---|---|
| Datum | **Caption**, dikte 600 | `#0066CC` |
| Kop | **H5** | `#1D1D1F` |
| Tekst | **Small** | `#6E6E73` |

### Meldingen en feedback

| Element | Stijl | Kleur |
|---|---|---|
| Kop in een melding | **Small**, dikte 600 | volgt de statuskleur |
| Tekst in een melding | **Small** | volgt de statuskleur |
| Tooltip | **Caption** | `#F5F5F7` op `#1C1C1E` |
| Toast | **Small** | `#F5F5F7` op `#1C1C1E` |
| Kop van een lege staat | **H3** | `#1D1D1F` |
| Tekst van een lege staat | **Body** | `#6E6E73` |

### Klein grut

| Element | Stijl |
|---|---|
| Badge | **Badge** |
| Tag | **Tag** |
| Sticker "Meest gekozen" | **Badge** |
| Teller op een icoon | **Badge**, afmeting 11 |
| Cookiebalk | **Small** |
| CTA-banner kop | **H2** of **H3** |
| CTA-banner tekst | **Body** |

---

## 7. Drie regels om te onthouden

**Koppen boven 20px zijn Inter Tight. Alles daaronder is Inter.**
Dat is de grens waarop we Apple's SF Pro Display / SF Pro Text nabootsen. H6 valt precies onder die grens en gebruikt dus Inter, ook al is het een kop.

**Hoe groter de tekst, hoe strakker de letterafstand.**
Van −0.028em op Display tot 0 op Body. Dit is het detail dat het verschil maakt tussen "netjes" en "klopt".

**Transformeren staat altijd op Standaard.**
Ook bij eyebrows, labels en knoppen. Uppercase is de snelste manier om de rust te verpesten die je zoekt.

---

*James Robinson — Marketing & Branding | www.jamesrobinson.nl*
