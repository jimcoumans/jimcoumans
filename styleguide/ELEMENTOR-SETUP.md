# James Robinson — Elementor Pro setup

Implementatiegids bij `jr-elementor-globals.css` (v3.0).
327 tokens, 3.043 regels. Elke waarde hieronder komt één op één overeen met een token in de stylesheet.

---

## Inhoud

1. [Installatievolgorde](#1-installatievolgorde)
2. [Pagina-anatomie — de belangrijkste sectie](#2-pagina-anatomie)
3. [Lettertype](#3-lettertype)
4. [Typografie-schaal](#4-typografie-schaal)
5. [Verticaal ritme](#5-verticaal-ritme)
6. [Kleur — alle trappen](#6-kleur)
7. [Ruimte](#7-ruimte)
8. [Component-padding](#8-component-padding)
9. [Lijndiktes](#9-lijndiktes)
10. [Hoekradius](#10-hoekradius)
11. [Schaduwen — met Elementor-invulwaarden](#11-schaduwen)
12. [Knoppen](#12-knoppen)
13. [Formulieren, checkboxes en filters](#13-formulieren-checkboxes-en-filters)
14. [Componentenoverzicht](#14-componentenoverzicht)
15. [Elementor-widgets](#15-elementor-widgets)
16. [Beeld en iconen](#16-beeld-en-iconen)
17. [Microcopy](#17-microcopy)
18. [Breakpoints](#18-breakpoints)
19. [Z-index](#19-z-index)
20. [Checklist](#20-checklist)

---

## 1. Installatievolgorde

| Stap | Waar | Wat |
|---|---|---|
| 1 | Site Settings → Layout → Breakpoints | §18 |
| 2 | Site Settings → Layout → Content Width | `1024` px |
| 3 | Site Settings → Global Colors | §6 |
| 4 | Site Settings → Global Fonts | §3 |
| 5 | Site Settings → Theme Style | §4, §12, §13 |
| 6 | Site Settings → Custom CSS | plak `jr-elementor-globals.css` |
| 7 | Elementor → Settings → Features | *Improved CSS Loading* aan, *Flexbox Container* aan, *Grid Container* aan |
| 8 | Custom Code → footer | de twee snippets uit §14 |

---

## 2. Pagina-anatomie

**Dit is het antwoord op "loopt de content van zijkant tot zijkant?" — nee, nooit.**

```
viewport (100% van het scherm — kan 2560px zijn)
│
└─ SECTIE ─────────────────────────────────── 100% breed
   │  Draagt de achtergrondkleur. Loopt WEL van rand tot rand,
   │  zodat een grijze of donkere band over de hele breedte doorloopt.
   │
   └─ CONTAINER ──────────── max-width + auto-marges + gutter
      │  Hier stopt de content. Groeit het scherm verder, dan groeit
      │  alleen de witruimte links en rechts.
      │
      └─ content
```

### Wat dat concreet betekent

| Schermbreedte | Sectie-achtergrond | Content | Wit per kant |
|---|---|---|---|
| 375 px (iPhone SE) | 375 px | 335 px | 20 px |
| 768 px (iPad) | 768 px | 720 px | 24 px |
| 1440 px (MacBook) | 1440 px | 1024 px | 208 px |
| 1920 px (monitor) | 1920 px | 1024 px | 448 px |
| 2560 px (5K) | 2560 px | 1024 px | 768 px |

Op een 5K-scherm is de content dus 1024px breed met 768px wit aan weerszijden. Dat voelt misschien "leeg", maar het is precies wat apple.com doet — en het is de reden dat hun pagina's op elk scherm rustig blijven. Tekst die meegroeit met het scherm wordt onleesbaar.

### Containerbreedtes

| Naam | Max | Waarvoor | Vol bij viewport |
|---|---|---|---|
| Narrow | **540 px** | gecentreerde intro's, formulieren, login | 604 px |
| Text | **692 px** | lopende tekst — nooit breder | 756 px |
| **Standaard** | **1024 px** | de meeste secties | 1088 px |
| Wide | **1280 px** | grids, cases, portfolio, logo-rijen | 1344 px |
| Full | **1440 px** | full-bleed beeld met marge | 1504 px |

### Gutter — de ruimte tot de schermrand

| Breakpoint | Gutter |
|---|---|
| Desktop (> 1068) | **32 px** |
| Tablet (≤ 1068) | **24 px** |
| Mobiel (≤ 734) | **20 px** |
| Klein (≤ 374) | **16 px** |

Dit is de belangrijkste waarde van de hele pagina-layout: hij zorgt dat tekst op een telefoon nooit tegen het glas aan plakt.

### In Elementor invullen

**Per container (Layout-tab):**

| Veld | Waarde |
|---|---|
| Container Width | **Boxed** |
| Content Width | **1024** px (of 1280 / 1440 naar keuze) |
| Padding (links/rechts) | **32 / 24 / 20** per breakpoint |
| Padding (boven/onder) | **120 / 88 / 64** — zie §7 |
| Gap | **24** px — zie §7 |

**Voor een sectie met achtergrondkleur die van rand tot rand loopt:**
Zet de buitenste container op **Full Width** met de achtergrondkleur, en nest daar een **Boxed** container in met de content. Dat is de enige juiste opbouw.

**Voor full-bleed beeld** (beeld tot de schermrand): buitenste container Full Width, padding links/rechts op 0, klasse `jr-container--bleed`.

### Minimale hoogtes

| Element | Waarde |
|---|---|
| Hero met kop + intro + knop | **560 px** |
| Hero met beeld | **720 px** |
| Korte pagina (voorkomt zwevende footer) | **60vh** |

Gebruik nooit `100vh` voor een hero: op mobiel telt de adresbalk mee en springt de hoogte bij het scrollen.

---

## 3. Lettertype

Apple gebruikt twee **optische varianten van hetzelfde lettertype**. Wij doen exact hetzelfde:

| Apple | Wij | Vanaf | Waarom |
|---|---|---|---|
| SF Pro Display | **Inter Tight** | 21 px en groter | strakker, smallere letters |
| SF Pro Text | **Inter** | onder 21 px | ruimer, beter leesbaar klein |

Beide staan in Google Fonts. Laad **Inter Tight in 600 en 700** en **Inter in 400, 500 en 600**. Verder niets — elk extra gewicht kost laadtijd.

### Global Fonts

| Slot | Naam | Familie | Gewicht |
|---|---|---|---|
| Primary | JR Display | Inter Tight | 700 |
| Secondary | JR Heading | Inter Tight | 600 |
| Text | JR Body | Inter | 400 |
| Accent | JR Action | Inter | 500 |

Custom fonts toevoegen: **JR Lead** (Inter 400, 21px) · **JR Caption** (Inter 400, 12px) · **JR Eyebrow** (Inter 600, 14px).

### Afwijking van het brandbook

Het brandbook schrijft Helvetica Neue voor. Dat is een print-lettertype dat als webfont niet vrij te gebruiken is. **Web = Inter Tight + Inter. Print en drukwerk = Helvetica Neue, ongewijzigd.**

Het brandbook schrijft Light (300) voor bodytekst. Op scherm is dat op 16–17px te dun. Body staat op Regular (400).

---

## 4. Typografie-schaal

| Stijl | Font | Gewicht | Desktop | Tablet | Mobiel | Regelhoogte | Letterafstand |
|---|---|---|---|---|---|---|---|
| Display | Tight | 700 | 80 | 56 | 40 | 1.05 | −0.028em |
| H1 | Tight | 700 | 56 | 44 | 34 | 1.08 | −0.022em |
| H2 | Tight | 700 | 40 | 34 | 28 | 1.12 | −0.018em |
| H3 | Tight | 600 | 28 | 26 | 22 | 1.12 | −0.014em |
| H4 | Tight | 600 | 24 | 22 | 20 | 1.25 | −0.010em |
| H5 | Tight | 600 | 21 | 20 | 18 | 1.25 | −0.008em |
| H6 | Inter | 600 | 17 | 17 | 16 | 1.25 | −0.004em |
| Lead | Inter | 400 | 21 | 20 | 18 | 1.45 | 0 |
| Body | Inter | 400 | 17 | 17 | 16 | 1.55 | 0 |
| Small | Inter | 400 | 14 | 14 | 14 | 1.45 | 0.004em |
| Caption | Inter | 400 | 12 | 12 | 12 | 1.4 | 0.004em |
| Eyebrow | Inter | 600 | 14 | 14 | 14 | 1.3 | 0 |
| Knop | Inter | 500 | 17 | 17 | 16 | 1.2 | −0.008em |
| Quote | Tight | 600 | 32 | 28 | 22 | 1.25 | −0.014em |
| Kengetal | Tight | 700 | 64 | 52 | 40 | 1.0 | −0.022em |

**Negatieve letterafstand boven 20px is het meest onderschatte detail van de Apple-look.** Zonder dit ogen grote koppen los.

**Nooit onder 16px op mobiel voor formuliervelden** — iOS zoomt dan in.

---

## 5. Verticaal ritme

Elk token beschrijft: **wat staat erboven → wat staat eronder.**

| Van → naar | Desktop | Tablet | Mobiel |
|---|---|---|---|
| **Eyebrow → kop** | **8** | 8 | 6 |
| Display → intro | 24 | 20 | 16 |
| H1/H2 → intro | 16 | 14 | 12 |
| H1/H2 → lopende tekst | 20 | 18 | 16 |
| H3/H4 → lopende tekst | 12 | 12 | 10 |
| H5/H6 → lopende tekst | 8 | 8 | 8 |
| Intro → lopende tekst | 24 | 20 | 20 |
| Alinea → alinea | 20 | 20 | 16 |
| Tekst → knop | 32 | 28 | 24 |
| Tekst → lijst | 16 | 16 | 16 |
| Lijstitem → lijstitem | 12 | 12 | 12 |
| Label → invoerveld | 8 | 8 | 8 |
| Veld → hulptekst | 7 | 7 | 7 |
| Veld → volgend veld | 16 | 16 | 16 |
| Vinkje → label | 12 | 12 | 12 |
| Keuze → volgende keuze | 14 | 14 | 14 |
| Kengetal → bijschrift | 8 | 8 | 8 |
| Citaat → naam | 16 | 16 | 16 |
| **Sectiekop → content** | **64** | 48 | 32 |

**Een eyebrow is geen zelfstandig element.** Het is het eerste woord van de kop, in een andere kleur. Op 16px of meer zweeft hij los boven de kop.

Let op het verschil tussen **kop → intro** (16) en **kop → lopende tekst** (20): een intro hoort bij de kop en staat krapper; lopende tekst is een nieuw blok.

---

## 6. Kleur

Elke kleur heeft acht stappen, zodat je nooit zelf een tint hoeft te mengen.

| Stap | Waarvoor |
|---|---|
| **50** | zachtste vlak — achtergrond van een hele sectie |
| **100** | zacht vlak — badge, highlight-blok, alert |
| **200** | rand op een gekleurd vlak |
| **base** | HET vlak — knop, icoon, balk |
| **hover / active** | interactie |
| **text** | kleur die als tekst op wit leesbaar is (WCAG AA) |
| **dark** | kleur die als tekst op donker werkt |

### Blauw

| Stap | Hex | Gebruik |
|---|---|---|
| 50 | `#F0F7FF` | zachtste blauwe sectie |
| 100 | `#E0EFFF` | badge, alert-info |
| 150 | `#E2EBF3` | brandbook "Accent Light Blue" |
| 200 | `#CCE4FF` | rand op blauw vlak |
| 300 | `#B3D7FF` | sterkere rand |
| **base — vorm** | **`#007AFF`** | icoon, vlak, streep, groot cijfer · 4.0:1 |
| **link — tekst** | **`#0066CC`** | eyebrow, link, tekstknop · 5.6:1 ✓ |
| link hover | `#004C99` | |
| link active | `#003D7A` | |
| **action — knop** | **`#0857C3`** | knopvlak met witte tekst · 6.7:1 ✓ |
| action hover | `#003967` | |
| action active | `#002E52` | |
| deep | `#005CBF` | gradients, diepte |
| dark | `#2997FF` | blauwe tekst op donker |
| dark hover | `#66B5FF` | |

**De regel:** blauw als **vorm** → `#007AFF` · als **tekst** → `#0066CC` · als **knopvlak** → `#0857C3`.

### Lime

| Stap | Hex | Gebruik |
|---|---|---|
| 50 | `#FAFEEB` | zachtste lime sectie |
| 100 | `#F2FCCC` | badge, highlight |
| 200 | `#E7F999` | rand |
| 300 | `#DCF666` | sterkere rand |
| **base** | **`#C4F000`** | vlak met `#1D1D1F` erop · 12.8:1 ✓ |
| hover | `#B2DA00` | |
| active | `#9FC200` | |
| **text** | **`#5A7000`** | lime als tekst op wit · 5.6:1 ✓ |
| dark | `#D9FF33` | lime tekst op donker |

**Eén regel: `#C4F000` is een vlak, nooit een tekstkleur op wit** (1.3:1 — onleesbaar).

### Status

| | 50 | 100 | 200 | base | hover | active | text | dark |
|---|---|---|---|---|---|---|---|---|
| **Groen** | `#EFFAF2` | `#E6F7EB` | `#C2EECD` | `#34C759` | `#25AD42` | `#1D9436` | `#1D7D3F` | `#41C96A` |
| **Oranje** | `#FEF7EE` | `#FEF2E0` | `#FCE3BE` | `#F6A027` | `#E08A10` | `#C4770B` | `#94590A` | `#F0A040` |
| **Geel** | `#FFFBEA` | `#FFF8DC` | `#FFF1B7` | `#FFD631` | `#F0C400` | `#D6AF00` | `#806400` | `#E0C040` |
| **Rood** | `#FFEFEE` | `#FDECEA` | `#FFC4C1` | `#FF3B30` | `#EF302B` | `#D62620` | `#C02A22` | `#FF6B61` |
| **Paars** | `#F9F1FC` | `#F5EAFB` | `#E7CBF5` | `#AF52DE` | `#9840CC` | `#8232B0` | `#7E2FB0` | `#C77CE8` |
| **Neutraal** | `#FAFAFB` | `#F5F5F7` | `#E5E5E9` | — | — | — | `#6E6E73` | `#A1A1A6` |

### Grijstrap — 16 stappen

| Token | Hex | Rol |
|---|---|---|
| gray-00 | `#FFFFFF` | wit |
| gray-05 | `#FAFAFB` | nauwelijks zichtbaar |
| gray-10 | `#F5F5F7` | **Apple's sectiegrijs** |
| gray-15 | `#F2F2F7` | brandbook-grijs |
| gray-20 | `#EBEBF0` | verzonken vlak, segmented track |
| gray-25 | `#E5E5E9` | **subtiele lijn, divider** |
| gray-30 | `#D2D2D7` | **standaard lijn, invoerveld** |
| gray-35 | `#D2D1D7` | brandbook |
| gray-40 | `#C8C8CD` | lijn bij hover |
| gray-50 | `#ADADB2` | uitgeschakelde tekst |
| gray-60 | `#86868B` | **tekst tertiair** |
| gray-65 | `#6E6E73` | **tekst secundair** |
| gray-70 | `#636466` | brandbook |
| gray-80 | `#49484A` | brandbook |
| gray-85 | `#3A3A3C` | |
| gray-90 | `#2C2D2E` | card op donkere sectie |
| gray-95 | `#1D1D1F` | **tekst primair** |
| gray-100 | `#1C1C1E` | **merkzwart, donkere sectie** |

**Gebruik altijd een stap uit deze trap. Nooit een zelfgemengd grijs.**

### Global Colors invullen

**System (4 slots):** Primary `#007AFF` · Secondary `#1C1C1E` · Text `#1D1D1F` · Accent `#0857C3`

**Custom:** neem alle hexcodes uit de tabellen hierboven over, met dezelfde naam. Dat zijn er ongeveer 60 — dat lijkt veel, maar het betekent dat niemand in het team ooit nog een kleur hoeft te verzinnen.

---

## 7. Ruimte

### Sectie-padding (boven én onder)

| | Desktop | Tablet | Mobiel |
|---|---|---|---|
| Ruim | 160 | 112 | 80 |
| **Standaard** | **120** | **88** | **64** |
| Compact | 80 | 56 | 40 |

### Ruimte tussen containers — Container → Layout → Gap

| Situatie | Desktop | Tablet | Mobiel |
|---|---|---|---|
| Tegels die bijna aan elkaar plakken | 8 | 8 | 8 |
| Compacte kaarten, tags, badges | 16 | 16 | 16 |
| **Standaard — kolommen, grid-items** | **24** | **24** | **16** |
| Ruime kaarten, twee-koloms content | 32 | 32 | 20 |
| Tekst naast beeld | 48 | 32 | 24 |
| Contentblok → contentblok in één sectie | 64 | 48 | 40 |
| Idem, met echte adempauze | 96 | 72 | 56 |

**Twijfel je? Pak 24.**

### Het 8pt-raster

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 120 · 160`

Geen 15, geen 37, geen 50.

---

## 8. Component-padding

### Knoppen

| Maat | Padding | Min-hoogte | Font | Mobiel |
|---|---|---|---|---|
| Small | 9 / 20 | 40 | 15 | gelijk |
| **Medium** | **13 / 26** | **48** | **17** | 16px font |
| Large | 16 / 34 | 56 | 19 | 15 / 28 |
| XL | 20 / 42 | 64 | 21 | 17 / 32 |

Icoon → tekst in een knop: **8 px**.

### Cards

| Maat | Padding | Radius | Tablet | Mobiel |
|---|---|---|---|---|
| Small | 24 | 12 | 24 | 20 |
| **Medium** | **32** | **18** | 32 | 24 |
| Large | 48 | 24 | 40 | 28 |
| XL | 80 | 44 | 48 | 32 |

### Formulieren en keuzevelden

| Element | Padding | Hoogte |
|---|---|---|
| Invoerveld | 13 / 16 | min 48 |
| Textarea | 14 / 16 | min 140 |
| Zoekveld | 0 / 44 (icoonruimte) | 48 |
| Checkbox / radio | — | 20 × 20 |
| Switch | — | 50 × 30 |
| Keuze-als-kaart | 16 / 20 | — |
| Meldingsbalk | 16 / 20 | — |

### Filters

| Element | Padding |
|---|---|
| Filter-chip | 9 / 16, min-hoogte 40 |
| Filterbalk | 16 / 0 |
| Actief filter (met kruisje) | 7 / 8 / 7 / 14 |
| Ruimte tussen filters | 10 |

### Kleine elementen

| Element | Padding |
|---|---|
| Badge | 6 / 12 |
| Tag | 7 / 16 |
| Navigatielink | 10 / 14 |
| Segmented-knop | 8 / 18 (track 4 rondom) |
| Tabelcel | 14 / 14 |
| Accordion-titel | 20 / 0 |
| Tab | 16 / 20 |
| Dropdown-paneel | 12 rondom |
| Tooltip | 8 / 12 |
| Toast | 12 / 20 |

### Content-componenten

| Element | Padding | Maat |
|---|---|---|
| Icon box | 32 | icoontegel 56 × 56 |
| Testimonial | 40 | avatar 48 × 48 |
| Prijstabel | 40 / 32 | |
| CTA-banner | 64 / 48 | |
| Modal body | 48 | header/footer 32 / 48 |
| Off-canvas menu | 24 | breedte min(88vw, 400px) |
| Paginering-knop | 0 / 12 | 44 × 44 |
| Footer | 80 / 0 / 48 | tablet 64/0/40, mobiel 48/0/32 |

---

## 9. Lijndiktes

| Dikte | Waarvoor |
|---|---|
| **1 px** | randen, dividers, invoervelden, tabelregels, kaartranden |
| **1.5 px** | icoonlijnen tot 24px — Apple's SF Symbols-dikte |
| **2 px** | actieve tab, iconen vanaf 32px, hamburger, rand van uitgelichte kaart |
| **3 px** | accentbalk links van een card, tijdlijn-punt |
| **4 px** | korte decoratieve streep onder een kop (64px breed), stappenbalk |
| **4 px ring** | focusring — nooit dunner, nooit uitzetten |

Linkonderstreping: **1 px**, offset **3 px**.

**Eén dikte per soort element.** Een 2px rand om een card naast een 1px rand om een invoerveld leest als een fout, niet als hiërarchie.

---

## 10. Hoekradius

| Token | Waarde | Waarvoor | Mobiel |
|---|---|---|---|
| xs | 8 | kleine badges, focusring | 8 |
| sm | 12 | invoervelden, kleine cards | 12 |
| **md** | **18** | **standaard card en afbeelding** | 18 |
| lg | 24 | grote cards, testimonial | 20 |
| xl | 32 | feature-blokken | 24 |
| 2xl | 44 | full-bleed tegels, CTA-banner | 28 |
| pill | 980 | **knoppen, badges, tags, chips** | 980 |
| round | 50% | avatars, icoonvlakken, vinkjes | 50% |

Checkbox is de uitzondering: **6 px**, niet 8 — anders oogt hij te rond naast de radio.

---

## 11. Schaduwen

### Belangrijk: Elementor's schaduwveld doet maar één laag

Elke schaduw in dit systeem heeft **twee lagen**: een korte harde voor de rand, een lange zachte voor de diepte. Elementor's Box Shadow-interface ondersteunt er maar één.

**Gebruik daarom bij voorkeur de CSS-klasse** (`jr-shadow-md` bij Advanced → CSS Classes). Dan krijg je beide lagen. Vul je het toch in Elementor's veld in, gebruik dan de enkele-laag-waarden uit de rechterkolom — die komen het dichtst in de buurt.

### De schaal

| Token | CSS (twee lagen) | Waarvoor |
|---|---|---|
| `jr-shadow-xs` | `0 1px 2px rgba(0,0,0,.04)` | segmented control |
| `jr-shadow-sm` | `0 1px 3px rgba(0,0,0,.05)`, `0 2px 8px rgba(0,0,0,.04)` | subtiele card, sticky nav |
| `jr-shadow-md` | `0 2px 6px rgba(0,0,0,.05)`, `0 8px 20px rgba(0,0,0,.06)` | dropdown, card |
| `jr-shadow-lg` | `0 4px 12px rgba(0,0,0,.06)`, `0 16px 40px rgba(0,0,0,.08)` | zwevende card, beeld |
| `jr-shadow-xl` | `0 8px 24px rgba(0,0,0,.08)`, `0 32px 72px rgba(0,0,0,.10)` | modal, off-canvas |
| `jr-shadow-card-hover` | `0 6px 16px rgba(0,0,0,.07)`, `0 24px 56px rgba(0,0,0,.11)` | klikbare card bij hover |
| `jr-shadow-blue` | `0 8px 28px rgba(0,122,255,.22)` | uitgelicht blauw vlak |
| `jr-shadow-lime` | `0 8px 28px rgba(196,240,0,.30)` | uitgelicht lime vlak |

### Elementor-invulwaarden (Box Shadow → één laag)

| Token | Color | Horizontal | Vertical | Blur | Spread | Position |
|---|---|---|---|---|---|---|
| xs | `rgba(0,0,0,0.04)` | 0 | 1 | 2 | 0 | Outline |
| sm | `rgba(0,0,0,0.06)` | 0 | 2 | 8 | 0 | Outline |
| md | `rgba(0,0,0,0.08)` | 0 | 8 | 20 | 0 | Outline |
| lg | `rgba(0,0,0,0.10)` | 0 | 16 | 40 | 0 | Outline |
| xl | `rgba(0,0,0,0.12)` | 0 | 32 | 72 | 0 | Outline |
| card-hover | `rgba(0,0,0,0.13)` | 0 | 24 | 56 | 0 | Outline |
| blue | `rgba(0,122,255,0.22)` | 0 | 8 | 28 | 0 | Outline |
| lime | `rgba(196,240,0,0.30)` | 0 | 8 | 28 | 0 | Outline |

### Focusring

| | Color | H | V | Blur | Spread | Position |
|---|---|---|---|---|---|---|
| Focus | `rgba(0,122,255,0.40)` | 0 | 0 | 0 | **4** | Outline |
| Focus op donker | `rgba(255,255,255,0.55)` | 0 | 0 | 0 | 4 | Outline |
| Focus bij fout | `rgba(255,59,48,0.20)` | 0 | 0 | 0 | 4 | Outline |

**Waarom altijd nul horizontaal.** Apple's schaduwen vallen recht naar beneden, nooit schuin. Een schaduw met een X-waarde suggereert een lichtbron van opzij en oogt onmiddellijk goedkoop.

**Waarom twee lagen.** Eén laag is óf te hard (scherpe rand, geen diepte) óf te wazig (zwevend, geen contour). De korte laag tekent de rand, de lange geeft de diepte.

**Regel:** liever een vlak dan een schaduw. Onderscheid maak je met kleur en radius; schaduw is alleen voor iets dat echt boven de pagina zweeft.

---

## 12. Knoppen

| Variant | Klasse | Achtergrond | Tekst | Hover |
|---|---|---|---|---|
| Primair | `jr-btn jr-btn--primary` | `#0857C3` | wit | `#003967` |
| Secundair | `jr-btn jr-btn--secondary` | transparant, 1px `#0857C3` | `#0857C3` | vult met `#0857C3` |
| Tertiair | `jr-btn jr-btn--tertiary` | `#F5F5F7` | `#1D1D1F` | `#EBEBF0` |
| Lime | `jr-btn jr-btn--lime` | `#C4F000` | `#1D1D1F` | `#B2DA00` |
| Tekstknop | `jr-btn jr-btn--text` | — | `#0066CC` | `#004C99` + chevron schuift |
| Op donker | `jr-btn jr-btn--light` | wit | `#1D1D1F` | `#E5E5E9` |
| Op donker, outline | `jr-btn jr-btn--light-outline` | transparant, wit 28% | wit | vult met wit |

**Vier regels:**

1. **Geen lift, geen schaduw bij hover.** Alleen kleur.
2. **Eén gevulde knop per scherm.** Lime telt mee: lime **of** blauw gevuld.
3. **Active is `scale(0.98)`.**
4. **Minimaal 48px hoog, 44px op touch.**

### Theme Style → Buttons

| Veld | Normal | Hover |
|---|---|---|
| Text color | `#FFFFFF` | `#FFFFFF` |
| Background | `#0857C3` | `#003967` |
| Border radius | `980px` | idem |
| Padding | `13 / 26 / 13 / 26` | idem |
| Typography | Inter · 17 · 500 · −0.008em | idem |
| Transition duration | `0.15` s | |

---

## 13. Formulieren, checkboxes en filters

### Theme Style → Form Fields

| Veld | Waarde |
|---|---|
| Typography | Inter 17 / 400 |
| Text color | `#1D1D1F` |
| Background | `#FFFFFF` |
| Border | 1px `#D2D2D7` |
| Border radius | `12px` |
| Padding | `13 / 16` |
| Focus border | `#007AFF` |
| Focus shadow | `rgba(0,122,255,0.40)` spread 4 |

### Checkboxes en radio's

Elementor's formulierwidget gebruikt native checkboxes. Die zien er op Windows, macOS en Android verschillend uit. De stylesheet vervangt ze door één vorm.

**Opbouw in Elementor** (HTML-widget of Custom HTML in een formulierveld):

```html
<label class="jr-choice">
  <input type="checkbox" name="branche[]" value="horeca">
  <span class="jr-choice-box"></span>
  <span class="jr-choice-label">
    Horeca
    <small>12 cases</small>
  </span>
</label>
```

Voor een radio: voeg `jr-choice--radio` toe aan de label en gebruik `type="radio"`.
Voor een keuze-als-kaart: voeg `jr-choice--card` toe.

| Toestand | Vorm |
|---|---|
| Uit | wit vlak, 1px `#C8C8CD`, radius 6 |
| Hover | rand wordt `#007AFF` |
| Aan | vlak `#007AFF`, wit vinkje |
| Half aan | vlak `#007AFF`, wit streepje |
| Focus | 4px ring |
| Uit (disabled) | vlak `#F5F5F7`, tekst `#ADADB2` |

**Radio:** zelfde maten, ronde vorm, gevulde binnenstip in plaats van een vinkje.

**Switch:** 50 × 30, track `#D2D2D7` uit / `#34C759` aan, knop 26 × 26 met schaduw. Gebruik een switch alleen voor aan/uit — nooit voor een keuze uit meerdere opties.

### Filters

| Element | Klasse | Gedrag |
|---|---|---|
| Filterbalk | `jr-filterbar` | plakt onder de navigatie, scrollt horizontaal op mobiel |
| Filter-chip | `jr-filter-chip` | grijs uit, blauw gevuld aan |
| Aantal per filter | `jr-count` binnen de chip | grijs, uitlijnende cijfers |
| Actief filter | `jr-filter-active` | lichtblauw met kruisje |
| Alles wissen | `jr-filter-reset` | onderstreepte tekstlink |
| Resultaatteller | `jr-result-count` | rechts uitgelijnd, op mobiel bovenaan |
| Zoekveld | `jr-search` | pill, grijs, met zoekicoon en wisknop |
| Sorteren | `jr-sort` | pill-select |
| Prijsbereik | `jr-range` | 4px track, 24px knop |
| Filterpaneel (zijbalk) | `jr-filter-panel` | secties gescheiden door 1px lijn |

**Praktisch in Elementor:** voor filters op een Loop Grid gebruik je een filter-plugin (Elementor's eigen Taxonomy Filter, JetSmartFilters of Search & Filter Pro). Zet daar deze klassen op via de instelling "CSS Classes" van de filterwidget, of overschrijf hun klassen in Custom CSS.

---

## 14. Componentenoverzicht

Alle klassen die je in Elementor invult bij **Advanced → CSS Classes**.

### Structuur

| Wat | Klasse |
|---|---|
| Sectie met standaard ademruimte | `jr-section` |
| Ruime / compacte sectie | `jr-section--lg` / `--sm` |
| Grijze / lichtblauwe / lime / donkere sectie | `jr-section--subtle` / `--tint` / `--lime` / `--dark` |
| Container 1024 / 1280 / 1440 / 692 / 540 | `jr-container` / `--wide` / `--full` / `--text` / `--narrow` |
| Full-bleed (geen zijmarge) | `jr-container--bleed` |
| Sectiekop-blok | `jr-section-head` |
| Blokken 64px uit elkaar | `jr-blocks` |
| Grid 2 / 3 / 4 kolommen | `jr-grid jr-grid--2` / `--3` / `--4` |
| Grid dat zelf kolommen kiest | `jr-grid jr-grid--auto` |
| Gap standaard / klein / groot | `jr-gap` / `jr-gap-sm` / `jr-gap-lg` |

### Tekst

| Wat | Klasse |
|---|---|
| Hero-kop | `jr-display` |
| Labeltje boven een kop | `jr-eyebrow` / `jr-eyebrow--lime` |
| Intro-zin | `jr-lead` |
| Kleine tekst / caption | `jr-small` / `jr-caption` |
| Citaat | `jr-quote` + `jr-quote-author` |
| Kengetal | `jr-stat` + `jr-stat-value` + `jr-stat-label` |
| Korte streep onder een kop | `jr-divider--rule` / `--rule-lime` |
| Uitlijnende cijfers | `jr-nums` / `jr-price` |

### Vlakken

| Wat | Klasse |
|---|---|
| Card | `jr-card` |
| Card klein / groot / extra groot | `jr-card--sm` / `--lg` / `--xl` |
| Card met rand / verhoogd / klikbaar | `jr-card--outline` / `--elevated` / `--interactive` |
| Card met accentbalk | `jr-card--accent` / `--accent-lime` |
| Glasvlak over beeld | `jr-card--glass` |
| Schaduw | `jr-shadow-sm` t/m `jr-shadow-xl` |
| Radius | `jr-radius-sm` t/m `jr-radius-2xl`, `jr-radius-pill` |

### Knoppen en links

| Wat | Klasse |
|---|---|
| Knop primair / secundair / tertiair / lime | `jr-btn jr-btn--primary` / `--secondary` / `--tertiary` / `--lime` |
| Tekstknop met chevron | `jr-btn jr-btn--text` |
| Knop op donkere achtergrond | `jr-btn--light` / `--light-outline` |
| Knopmaat | `jr-btn--sm` / `--lg` / `--xl` |
| Knopgroep (32px onder de tekst) | `jr-btn-group` |
| "Meer weten ›" link | `jr-link-arrow` |
| Stille link (footer, nav) | `jr-link-quiet` |

### Formulieren

| Wat | Klasse |
|---|---|
| Checkbox / radio | `jr-choice` / `jr-choice jr-choice--radio` |
| Keuze als kaart | `jr-choice jr-choice--card` |
| Switch | `jr-switch` |
| Zoekveld | `jr-search` |
| Hulptekst / foutmelding | `jr-form-help` / `jr-form-error` |

### Filters

| Wat | Klasse |
|---|---|
| Filterbalk | `jr-filterbar` |
| Filter-chip | `jr-filter-chip` (+ `is-active`) |
| Actief filter met kruisje | `jr-filter-active` |
| Alles wissen | `jr-filter-reset` |
| Resultaatteller | `jr-result-count` |
| Sorteren | `jr-sort` |
| Prijsbereik | `jr-range` |
| Filterpaneel in de zijbalk | `jr-filter-panel` |

### Navigatie

| Wat | Klasse |
|---|---|
| Navbalk (glas, sticky) | `jr-nav` / `jr-nav--dark` |
| Hamburger | `jr-burger` |
| Off-canvas menu | `jr-offcanvas` + `jr-backdrop` |
| Mega menu | `jr-megamenu` |
| Anchor-navigatie (tweede balk) | `jr-anchornav` |
| Breadcrumbs | `jr-breadcrumbs` |
| Paginering | `jr-pagination` + `jr-page-btn` |
| Sticky CTA-balk (alleen mobiel) | `jr-sticky-cta` |
| Terug naar boven | `jr-to-top` |
| Footer | `jr-footer` / `jr-footer--dark` + `jr-footer-legal` |

### Content

| Wat | Klasse |
|---|---|
| Icon box | `jr-iconbox` + `jr-icon-tile` |
| Testimonial | `jr-testimonial` + `jr-avatar` |
| Sterrenscore | `jr-stars` |
| Prijstabel | `jr-pricing` / `jr-pricing--featured` |
| Case- of blogkaart | `jr-post` |
| Logo-rij | `jr-logos` |
| CTA-banner | `jr-cta-banner` / `--blue` / `--lime` |
| Tijdlijn | `jr-timeline` |
| Vergelijkingstabel | `jr-compare` |
| Video met afspeelknop | `jr-video` + `jr-video-play` |
| Social-iconen | `jr-social` |
| Vinklijst | `jr-list-check` / `jr-list-check--lime` |
| Stappenlijst | `jr-list-steps` |
| Badges / tags | `jr-badge--blue` etc. / `jr-tag` |
| Rij badges of tags | `jr-chips` |

### Feedback

| Wat | Klasse |
|---|---|
| Melding | `jr-alert jr-alert--info` / `--success` / `--warning` / `--error` / `--neutral` |
| Toast | `jr-toast` |
| Tooltip | `jr-tooltip` met `data-tip="..."` |
| Voortgangsbalk | `jr-progress` + `jr-progress-bar` |
| Stappenindicator | `jr-steps-bar` |
| Skeleton tijdens laden | `jr-skeleton--text` / `--title` / `--media` / `--avatar` |
| Lege staat | `jr-empty` |
| Teller op een icoon | `jr-dot-badge` met `data-count="3"` |
| Modal | `jr-modal` + `jr-modal-header` / `-body` / `-footer` |
| Cookiebalk | `jr-cookiebar` |

### Beeld

| Wat | Klasse |
|---|---|
| Ratio hero / case / portret / vierkant / video | `jr-ratio-hero` / `-case` / `-team` / `-square` / `-video` |
| Afbeelding met radius | `jr-img` / `--sm` / `--lg` / `--xl` / `--round` |
| Beeld zoomt bij hover | `jr-img-zoom` |
| Donkere overlay voor witte tekst | `jr-overlay` |

### Zichtbaarheid en animatie

| Wat | Klasse |
|---|---|
| Fade-in bij scrollen | `jr-reveal` |
| Grid met staffel-reveal | `jr-reveal-stagger` |
| Verbergen op mobiel / tablet | `jr-hide-mobile` / `jr-hide-tablet` |
| Alleen op mobiel / desktop | `jr-only-mobile` / `jr-only-desktop` |
| Alleen voor schermlezers | `jr-sr-only` |

### Twee snippets voor Custom Code → footer

**Scroll reveal:**

```html
<script>
document.addEventListener('DOMContentLoaded', function () {
  var els = document.querySelectorAll('.jr-reveal, .jr-reveal-stagger');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el) { io.observe(el); });
});
</script>
```

**Off-canvas menu, terug-naar-boven en anchor-nav:**

```html
<script>
document.addEventListener('DOMContentLoaded', function () {
  // Off-canvas
  var burger = document.querySelector('.jr-burger');
  var panel  = document.querySelector('.jr-offcanvas');
  var back   = document.querySelector('.jr-backdrop');
  function setMenu(open) {
    if (!burger || !panel) return;
    burger.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    if (back) back.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger) burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  if (back) back.addEventListener('click', function () { setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Terug naar boven
  var top = document.querySelector('.jr-to-top');
  if (top) {
    window.addEventListener('scroll', function () {
      top.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Anchor-nav markeert de zichtbare sectie
  var links = document.querySelectorAll('.jr-anchornav a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) map[t.id] = a;
    });
    var nav = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.remove('is-active'); });
          if (map[e.target.id]) map[e.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) { nav.observe(document.getElementById(id)); });
  }
});
</script>
```

---

## 15. Elementor-widgets

De stylesheet overschrijft deze widgets zodat ze binnen het systeem blijven. Zonder deze regels vallen ze terug op Elementor's eigen stijl.

| Widget | Wat er verandert |
|---|---|
| **Slider / Carousel** | pijlen worden 44px glasknoppen, bolletjes worden 8px grijs en het actieve bolletje rekt uit naar 24px blauw |
| **Popup** | radius 24, schaduw xl, sluitknop wordt een grijze ronde knop |
| **Lightbox** | beeld krijgt radius 18 |
| **Loop Grid / Posts** | gap 24, kaart zonder rand, tilt 4px op bij hover |
| **Icon Box / Image Box** | titel in Inter Tight met de juiste letterafstand, beeld radius 18 |
| **Counter** | Inter Tight bold, uitlijnende cijfers, blauw |
| **Progress Bar** | 6px hoog, pill, blauw |
| **Tabs / Accordion** | eigen typografie, 2px actieve onderstreping, geen kaders |
| **Breadcrumbs** | 14px, grijs, chevron-scheiding |
| **Search Form** | pill, grijs vlak |
| **Sticky Header** | krijgt schaduw-sm zodra Elementor `elementor-sticky--effects` toevoegt |

### Elementor-instellingen die je aan moet zetten

| Instelling | Waar | Waarom |
|---|---|---|
| Flexbox Container | Elementor → Settings → Features | de hele stylesheet gaat hiervan uit |
| Grid Container | idem | voor kaartgrids |
| Improved CSS Loading | idem | laadt alleen de CSS die de pagina nodig heeft |
| Optimized Markup | idem | minder wrappers, schonere HTML |
| Custom Breakpoints | Site Settings → Layout | §18 |
| Global Widgets | rechtermuisknop op een widget | voor de CTA-banner en de footer: één keer bouwen, overal bijwerken |

### Werk met Elementor Templates

Bouw deze één keer als template en hergebruik ze:
Header · Footer · CTA-banner · Case-kaart (Loop Item) · Prijstabel · Testimonial · Contactformulier · Cookiebalk.

Dat is niet alleen sneller — het is de enige manier waarop het systeem overeind blijft als er vier mensen aan de site werken.

---

## 16. Beeld en iconen

### Beeldverhoudingen

| Soort | Ratio | Klasse | Exportformaat |
|---|---|---|---|
| Hero | 21 : 9 | `jr-ratio-hero` | 2880 × 1234 |
| Case / blog | 3 : 2 | `jr-ratio-case` | 1200 × 800 |
| Portret (team) | 4 : 5 | `jr-ratio-team` | 800 × 1000 |
| Vierkant (social) | 1 : 1 | `jr-ratio-square` | 1080 × 1080 |
| Video | 16 : 9 | `jr-ratio-video` | 1920 × 1080 |

**Kies één ratio per soort en houd je eraan.** Een pagina met cases in drie verschillende verhoudingen oogt rommelig, hoe mooi de foto's ook zijn.

### Beeldrichtlijnen

- **Formaat**: WebP, met JPEG-fallback. Elementor's Image Optimizer of ShortPixel regelt dit.
- **Gewicht**: hero onder 250 kb, kaartbeeld onder 120 kb.
- **Lazy loading**: aan voor alles behalve het hero-beeld — dat moet direct laden.
- **Altijd `width` en `height`** meegeven, zodat de pagina niet springt tijdens het laden.
- **Alt-tekst**: beschrijf wat er te zien is, niet "afbeelding van". Decoratief beeld krijgt een lege alt.
- **Logo's van klanten**: grijstinten op 55% dekking, kleur bij hover. Klasse `jr-logos`.

### Iconen

- **Lijndikte 1.5px** tot 24px, **2px** vanaf 32px. Dit is Apple's SF Symbols-standaard.
- **Maten**: 18 (klein) · 24 (standaard) · 32 (groot) · 48 (extra groot).
- **Stijl**: outline, niet gevuld. Ronde uiteinden (`stroke-linecap="round"`).
- **Eén set voor de hele site.** Gebruik geen mix van Font Awesome en eigen SVG's.
- **Aanbevolen sets**: Lucide, Feather of Phosphor (Regular) — alle drie outline met ronde uiteinden en dicht bij SF Symbols.
- Klasse `jr-icon`, `jr-icon--sm/lg/xl`.

### Logo

- Minimale hoogte op scherm: **70 px** (brandbook). Uitzondering: in de navbalk **36 px**, klasse `jr-logo--sm`.
- Vrije ruimte rondom: **1× de hoogte van het beeldmerk**.
- Nooit kantelen, nooit schaduw, nooit meerkleurig.

### Favicon en deelbeeld

| Bestand | Formaat |
|---|---|
| Favicon | 512 × 512 PNG + SVG |
| Apple touch icon | 180 × 180 PNG |
| Open Graph (deelbeeld) | 1200 × 630, met logo en pagina-titel |

---

## 17. Microcopy

Dit is waar Apple's *echte* styleguide over gaat — die redactionele PDF. De belangrijkste regels, vertaald naar het Nederlands:

### Knopteksten

| Niet | Wel | Waarom |
|---|---|---|
| "Klik hier" | "Plan een gesprek" | zeg wat er gebeurt, niet wat je doet |
| "Verzenden" | "Verstuur aanvraag" | benoem het resultaat |
| "Lees meer" | "Bekijk de case" | specifiek beter dan algemeen |
| "Meer informatie" | "Zo werken we" | actief, niet ambtelijk |
| "OK" | "Begrepen" / "Sluiten" | zeg wat de knop doet |

**Sentence case, altijd.** "Plan een gesprek", niet "Plan Een Gesprek" en niet "PLAN EEN GESPREK".

**Maximaal drie woorden** in een knop. Past het niet, dan is de knop niet het probleem.

### Foutmeldingen

Drie eisen: zeg **wat** er mis is, **waarom**, en **hoe je het oplost**.

| Niet | Wel |
|---|---|
| "Ongeldige invoer" | "Vul een geldig e-mailadres in, bijvoorbeeld naam@bedrijf.nl" |
| "Er is iets misgegaan" | "Je bericht is niet verstuurd. Probeer het opnieuw of bel ons op 045 – 123 4567." |
| "Verplicht veld" | "Vul je naam in" |

Geen excuses, geen uitroeptekens, geen "Oeps!".

### Bevestigingen

Een knop die "Publiceer" heet, geeft een melding die "Gepubliceerd" heet. Gebruik hetzelfde woord.

### Lege staten

Vertel wat er zou moeten staan en wat de bezoeker nu kan doen. "Geen cases in deze branche — bekijk alle cases" is beter dan "Geen resultaten".

### Nederlandse details

- Aanhalingstekens: **'enkel'** of **"dubbel"**, nooit de rechte `"`.
- Bedragen: **€ 1.250** met een spatie na het euroteken en een punt als duizendtal.
- Datums: **17 september 2026**, of **17-09-2026** in tabellen.
- Telefoonnummers: **045 – 123 4567** met een half-kastje-streepje.
- Geen Engelse marketingtermen waar een Nederlands woord bestaat.

---

## 18. Breakpoints

**Site Settings → Layout → Breakpoints:**

| Breakpoint | Waarde | Waarom |
|---|---|---|
| Mobile | **734 px** | apple.com's eigen grens |
| Tablet | **1068 px** | idem |
| Laptop | **1440 px** | idem |

Elementor's defaults zijn 767 en 1024. Houd je die, pas dan de getallen in §26 van de CSS aan — anders lopen je widget-instellingen en de stylesheet uit de pas.

### Wat er verandert op mobiel

- Grids van 2, 3 en 4 kolommen worden één kolom.
- Knoppen vullen de breedte en stapelen, hoofdactie bovenaan.
- De filterbalk scrollt horizontaal in plaats van af te breken.
- De sticky CTA-balk verschijnt (alleen daar zichtbaar).
- Het mega menu verdwijnt; off-canvas neemt het over.
- Formuliervelden blijven ≥ 16px.
- Letterafstand wordt iets losser.
- Card-padding en grote radius schalen terug.

---

## 19. Z-index

Eén schaal, zodat niets ooit onverwacht onder iets anders valt.

| Laag | Waarde | Waarvoor |
|---|---|---|
| base | 1 | normale inhoud |
| raised | 10 | card die opkomt bij hover |
| sticky | 100 | sticky kolom, filterbalk, anchor-nav, CTA-balk, terug-naar-boven |
| dropdown | 500 | select, mega menu, tooltip |
| nav | 1000 | hoofdnavigatie |
| offcanvas | 1050 | mobiel menu |
| overlay | 1100 | verduistering achter een modal |
| modal | 1200 | modal, toast, cookiebalk |

**Gebruik nooit een eigen z-index.** Elementor zet er zelf al genoeg neer; als iedereen ad hoc `9999` invult, is het binnen een maand onhoudbaar.

---

## 20. Checklist

### Opzetten

- [ ] Breakpoints op 734 / 1068 / 1440
- [ ] Content Width op 1024
- [ ] Flexbox Container, Grid Container, Improved CSS Loading, Optimized Markup aan
- [ ] Inter Tight (600, 700) en Inter (400, 500, 600) geladen, verder niets
- [ ] Global Colors, Global Fonts en Theme Style ingevuld
- [ ] `jr-elementor-globals.css` in Custom CSS
- [ ] Beide snippets in Custom Code → footer
- [ ] Templates gemaakt: header, footer, CTA-banner, case-kaart, prijstabel, formulier

### Per pagina

- [ ] Buitenste container Full Width met de achtergrondkleur, binnenste Boxed met de content
- [ ] Geen lopende tekst breder dan 692px
- [ ] Eyebrow staat op 8px van de kop
- [ ] Niet meer dan één gevulde knop per scherm — lime telt mee
- [ ] Sectie-padding uit de schaal (120 / 88 / 64)
- [ ] Container-gap uit de schaal (standaard 24)
- [ ] Alle ruimtewaarden uit het 8pt-raster

### Kleur en contrast

- [ ] `#007AFF` nergens als tekst onder 24px
- [ ] `#C4F000` nergens als tekstkleur op wit
- [ ] Elke kleur komt uit een gedefinieerde trap, geen zelfgemengde tinten
- [ ] Eyebrow en tekstlink hebben dezelfde kleur

### Techniek

- [ ] Eén lijndikte per soort element
- [ ] Schaduwen via de CSS-klasse, niet via Elementor's enkele-laags veld
- [ ] Geen eigen z-index-waarden
- [ ] Alle beelden met width en height, lazy loading behalve de hero
- [ ] Eén icoonset, lijndikte 1.5px

### Toegankelijkheid

- [ ] Focusring zichtbaar bij tabben over de hele site
- [ ] Formuliervelden ≥ 16px op mobiel
- [ ] Alle knoppen en links minimaal 44px op touch
- [ ] Checkboxes en radio's bedienbaar met toetsenbord
- [ ] Alt-teksten ingevuld
- [ ] `prefers-reduced-motion` getest (macOS: Systeeminstellingen → Toegankelijkheid → Beeldscherm)
- [ ] Getest op iPhone SE (375px)

### Taal

- [ ] Knopteksten in sentence case, maximaal drie woorden
- [ ] Foutmeldingen zeggen wat, waarom en hoe op te lossen
- [ ] Typografische aanhalingstekens, € met spatie, Nederlandse datums

---

*James Robinson — Marketing & Branding | www.jamesrobinson.nl*
