# James Robinson — Elementor Pro setup

Implementatiegids bij `jr-elementor-globals.css`.
Alles wat je hieronder invult in de Elementor-interface, komt overeen met de tokens in de stylesheet.

---

## 0. Belangrijk vooraf: wat de "Apple Style Guide" wél en niet is

De PDF op `help.apple.com/pdf/applestyleguide` is Apple's **redactionele** stijlgids — schrijfwijze, terminologie, hoofdlettergebruik, hoe je over producten schrijft. Er staan geen kleuren, lettergroottes, knoppen of layoutregels in.

De visuele taal die je bedoelt ("rust en ruimte") komt uit twee andere bronnen:

| Bron | Waarvoor |
|---|---|
| Apple Human Interface Guidelines (`developer.apple.com/design`) | systeemkleuren, typografie-schaal, tapdoelen, motion |
| apple.com zelf | ritme, ademruimte, sectie-opbouw, knopgedrag |

Deze stylesheet is op die twee gebaseerd, vertaald naar het James Robinson-merk.

De redactionele Apple Style Guide is overigens wél bruikbaar — maar voor je **microcopy en tone of voice**, niet voor styling.

---

## 1. Installatievolgorde

1. **Elementor → Site Settings → Layout → Breakpoints**
   Zet ze op Apple's waarden (zie §4). Doe dit eerst — het beïnvloedt elke widget-instelling daarna.
2. **Site Settings → Global Colors** → vul §5 in.
3. **Site Settings → Global Fonts** → vul §6 in.
4. **Site Settings → Theme Style** → vul §7 in (typografie, knoppen, links, formulieren).
5. **Site Settings → Custom CSS** → plak de volledige inhoud van `jr-elementor-globals.css`.
6. Zet in **Elementor → Settings → Features** de optie *Improved CSS Loading* aan.

> **Waarom beide?** Global Colors/Fonts zorgen dat het team in de editor de juiste keuzes vóórgeschoteld krijgt. De CSS zorgt dat alles klopt wat je in de editor niet kunt instellen (hover-states, focusringen, letterafstand per kopniveau, radius, schaduwen, responsive gedrag).

---

## 2. De lettertypekeuze — één beslissing

Apple gebruikt SF Pro. Dat lettertype is niet licentievrij voor gebruik buiten Apple-platformen, dus we kunnen het niet als webfont laden. Drie opties, in de CSS op regel ~30 te wisselen:

| | Optie A — systeemstack *(nu actief)* | Optie B — Inter | Optie C — strikt brandbook |
|---|---|---|---|
| **Wat je ziet op Mac/iPhone** | SF Pro — exact de Apple-look | Inter | Helvetica Neue |
| **Op Windows** | Segoe UI / Helvetica Neue | Inter | Arial (afwijkend) |
| **Op Android** | Roboto | Inter | Arial (afwijkend) |
| **Laadtijd** | 0 kb — snelst mogelijk | ~40 kb | 0 kb |
| **Consistentie** | verschilt per apparaat | overal identiek | zwak op non-Apple |

**Mijn advies: A.** Je bezoekers in Zuid-Limburg zitten voor een flink deel op iPhone, en juist daar krijg je de echte Apple-rust cadeau, zonder één byte laadtijd. De verschillen op Windows zijn klein omdat alle fallbacks neutrale grotesks zijn.

**Kies B** als "overal exact hetzelfde" voor jullie zwaarder weegt dan snelheid — verdedigbaar voor een bureau dat op z'n eigen uitvoering wordt afgerekend.

**C raad ik af** voor web: Helvetica Neue is geen webfont, dus buiten Apple val je terug op Arial en verlies je precies de verfijning die je zoekt.

### Afwijking van het brandbook — bewust

Het brandbook schrijft **Light (300)** voor voor bodytekst. Op scherm, op 16–17px, wordt dat te dun: het leest slecht op Windows en zakt onder de contrastnorm. Deze stylesheet gebruikt:

- **Body: Regular (400)**
- **Light (300) alleen bij 21px en groter** — via de klasse `jr-lead--light`

Op print blijft het brandbook leidend.

---

## 3. Typografie-schaal — in te vullen per breakpoint

Elementor vraagt per stijl om een waarde per apparaat. Deze tabel is de bron.

| Stijl | Gewicht | Desktop | Tablet | Mobiel | Regelhoogte | Letterafstand |
|---|---|---|---|---|---|---|
| **Display** (hero) | 700 | 80 px | 56 px | 40 px | 1.05 | −0.028em |
| **H1** | 700 | 56 px | 44 px | 34 px | 1.08 | −0.022em |
| **H2** | 700 | 40 px | 34 px | 28 px | 1.12 | −0.018em |
| **H3** | 600 | 28 px | 26 px | 22 px | 1.12 | −0.014em |
| **H4** | 600 | 24 px | 22 px | 20 px | 1.25 | −0.010em |
| **H5** | 600 | 21 px | 20 px | 18 px | 1.25 | −0.008em |
| **H6** | 600 | 17 px | 17 px | 16 px | 1.25 | −0.004em |
| **Lead / intro** | 400 | 21 px | 20 px | 18 px | 1.45 | 0 |
| **Body** | 400 | 17 px | 17 px | 16 px | 1.55 | 0 |
| **Small** | 400 | 14 px | 14 px | 14 px | 1.45 | 0.004em |
| **Caption** | 400 | 12 px | 12 px | 12 px | 1.4 | 0.004em |
| **Eyebrow** | 600 | 14 px | 14 px | 14 px | 1.3 | 0 |
| **Knop** | 500 | 17 px | 17 px | 16 px | 1.2 | −0.008em |
| **Quote** | 600 | 32 px | 28 px | 22 px | 1.25 | −0.014em |

**Twee regels die het verschil maken:**

1. **Negatieve letterafstand op alles boven 20px.** Dit is het meest onderschatte deel van de Apple-look. Zonder dit ogen grote koppen los en amateuristisch.
2. **Body is 17px, niet 16px.** Apple's standaard. Het leest merkbaar rustiger.

**Nooit onder 16px op mobiel voor formuliervelden** — iOS zoomt dan automatisch in en de gebruiker raakt de pagina kwijt.

---

## 4. Breakpoints

**Site Settings → Layout → Breakpoints** — activeer en zet:

| Breakpoint | Waarde | Waarom |
|---|---|---|
| Mobile | **734 px** | apple.com's eigen grens |
| Tablet | **1068 px** | idem |
| Laptop | **1440 px** | idem |

Elementor's defaults zijn 767 en 1024. Als je die liever houdt: pas dan de drie getallen in §17 van de CSS aan naar 1024 en 767, anders lopen jouw widget-instellingen en de stylesheet uit de pas.

---

## 5. Global Colors

### System (de 4 vaste slots)

| Slot | Naam | Hex |
|---|---|---|
| Primary | JR Blue | `#007AFF` |
| Secondary | JR Black | `#1C1C1E` |
| Text | Text Primary | `#1D1D1F` |
| Accent | Action Blue | `#0857C3` |

### Custom — voeg deze toe

| Naam | Hex | Gebruik |
|---|---|---|
| Action Blue Hover | `#003967` | knop hover |
| Link Blue | `#0066CC` | tekstlinks |
| Deep Blue | `#005CBF` | gradients, diepte |
| Text Secondary | `#6E6E73` | intro's, subkoppen |
| Text Tertiary | `#86868B` | captions, metadata |
| Surface White | `#FFFFFF` | basisvlak |
| Surface Subtle | `#F5F5F7` | afwisselende secties |
| Surface Gray | `#F2F2F7` | brandbook-grijs |
| Surface Tint | `#E2EBF3` | lichtblauwe highlights |
| Surface Dark | `#1C1C1E` | donkere secties |
| Surface Dark Alt | `#2C2D2E` | card op donker |
| Border | `#D2D2D7` | standaard rand |
| Border Subtle | `#E5E5E9` | dividers |
| Success | `#34C759` | |
| Warning | `#F6A027` | |
| Error | `#FF3B30` | |
| Purple | `#AF52DE` | creatief accent |
| Yellow | `#FFD631` | highlights |
| Teal | `#00B48F` | secundaire knop |

### Waarom drie blauwtinten

`#007AFF` is jullie merkblauw, maar het haalt op wit een contrastverhouding van **4.0:1** — nét onder de WCAG-norm van 4.5:1 voor lopende tekst. Daarom:

| Blauw | Waarvoor | Contrast op wit |
|---|---|---|
| `#007AFF` | accenten, iconen, koppen ≥24px, gekleurde vlakken | 4.0:1 — voldoende voor grote tekst |
| `#0066CC` | **tekstlinks in alinea's** | 5.6:1 ✓ |
| `#0857C3` | **knopvlakken** (met witte tekst) | 6.7:1 ✓ |

Die laatste twee stonden al in jullie brandbook onder "Button Colors" — nu weet je waarom ze er zijn.

---

## 6. Global Fonts

| Slot | Naam | Familie | Gewicht | Gebruik |
|---|---|---|---|---|
| Primary | JR Display | systeemstack *(zie §2)* | 700 | H1, H2, hero |
| Secondary | JR Heading | systeemstack | 600 | H3–H6 |
| Text | JR Body | systeemstack | 400 | lopende tekst |
| Accent | JR Action | systeemstack | 500 | knoppen, labels, nav |

**Familienaam om in te vullen** (Elementor → Custom Fonts is hiervoor niet nodig, kies "System"):
`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

Voeg als custom fonts toe: **JR Lead** (400, 21px) en **JR Caption** (400, 12px).

---

## 7. Theme Style

**Site Settings → Theme Style → Buttons:**

| Veld | Normal | Hover |
|---|---|---|
| Text color | `#FFFFFF` | `#FFFFFF` |
| Background | `#0857C3` | `#003967` |
| Border | geen | geen |
| Border radius | `980px` (alle hoeken) | idem |
| Padding | `13 / 26 / 13 / 26` px | idem |
| Typography | 17px · 500 · −0.008em | idem |
| Transition duration | `0.15` s | |

**Theme Style → Links:**

| | Normal | Hover |
|---|---|---|
| Kleur | `#0066CC` | `#0066CC` |
| Decoratie | geen | underline |

**Theme Style → Form Fields:**

| Veld | Waarde |
|---|---|
| Typography | 17px · 400 |
| Text color | `#1D1D1F` |
| Background | `#FFFFFF` |
| Border | 1px `#D2D2D7` |
| Border radius | `12px` |
| Padding | `13 / 16` px |
| Focus border | `#007AFF` |

**Theme Style → Images:** border radius `18px`.

---

## 8. Ruimte — waar de rust vandaan komt

Dit is het onderdeel dat het meest bepaalt of de site "Apple aanvoelt", en waar de meeste sites de fout in gaan. Ruimte is geen restwaarde; het is de belangrijkste designbeslissing op de pagina.

### Sectie-padding (boven én onder)

| | Desktop | Tablet | Mobiel |
|---|---|---|---|
| Ruime sectie (`jr-section--lg`) | 160 px | 112 px | 80 px |
| **Standaard** (`jr-section`) | **120 px** | **88 px** | **64 px** |
| Compacte sectie (`jr-section--sm`) | 80 px | 56 px | 40 px |

### Ruimtemaat (8pt-raster)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 120 · 160`

Gebruik uitsluitend deze waarden. Geen 15, geen 37, geen 50.

### Containerbreedtes

| Klasse | Max-breedte | Waarvoor |
|---|---|---|
| `jr-container--narrow` | 540 px | gecentreerde intro's, formulieren |
| `jr-container--text` | 692 px | **lopende tekst — nooit breder** |
| `jr-container` | 1024 px | standaard |
| `jr-container--wide` | 1280 px | grids, cases |
| `jr-container--full` | 1440 px | full-bleed met marge |

Zijmarge (gutter): desktop 32px · tablet 24px · mobiel 20px.

De 692px voor tekst is geen willekeurige keuze: daarboven wordt een regel te lang om comfortabel te lezen en verlies je bij elke regelovergang het spoor.

---

## 9. Hoekradius

| Token | Waarde | Waarvoor |
|---|---|---|
| `xs` | 8 px | kleine badges, inputs binnen cards |
| `sm` | 12 px | formuliervelden |
| `md` | **18 px** | **standaard card en afbeelding** |
| `lg` | 24 px | grote cards |
| `xl` | 32 px | feature-blokken |
| `2xl` | 44 px | full-bleed tegels |
| `pill` | 980 px | **knoppen** |
| `round` | 50% | avatars, icoonvlakken |

Op mobiel schalen `lg`, `xl` en `2xl` automatisch terug (20/24/28px) — anders ogen vlakken op een klein scherm onevenredig rond.

---

## 10. Schaduwen

Apple's regel: **liever een vlak dan een schaduw.** Onderscheid maak je met kleur en radius; schaduw is alleen voor iets dat echt boven de pagina zweeft.

| Token | Waarde | Waarvoor |
|---|---|---|
| `xs` | `0 1px 2px rgba(0,0,0,.04)` | segmented control |
| `sm` | `0 1px 3px rgba(0,0,0,.05), 0 2px 8px rgba(0,0,0,.04)` | subtiele card |
| `md` | `0 2px 6px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.06)` | dropdown, card |
| `lg` | `0 4px 12px rgba(0,0,0,.06), 0 16px 40px rgba(0,0,0,.08)` | zwevende card, beeld |
| `xl` | `0 8px 24px rgba(0,0,0,.08), 0 32px 72px rgba(0,0,0,.10)` | modal |
| `card-hover` | `0 6px 16px rgba(0,0,0,.07), 0 24px 56px rgba(0,0,0,.11)` | klikbare card |
| `focus` | `0 0 0 4px rgba(0,122,255,.40)` | **focusring — nooit uitzetten** |

Twee lagen per schaduw: een korte harde voor de rand, een lange zachte voor de diepte. Eén laag ziet er altijd goedkoop uit.

---

## 11. Knoppen — de regels

| Variant | Klasse | Achtergrond | Tekst | Rand | Hover |
|---|---|---|---|---|---|
| Primair | `jr-btn jr-btn--primary` | `#0857C3` | wit | — | `#003967` |
| Secundair | `jr-btn jr-btn--secondary` | transparant | `#0857C3` | 1px `#0857C3` | vult met `#0857C3`, tekst wit |
| Tertiair | `jr-btn jr-btn--tertiary` | `#F5F5F7` | `#1D1D1F` | — | `#E5E5E9` |
| Tekstknop | `jr-btn jr-btn--text` | — | `#0066CC` | — | underline + chevron schuift |
| Groen | `jr-btn jr-btn--green` | `#00B48F` | wit | — | `#008F72` |
| Op donker | `jr-btn jr-btn--light` | wit | `#1D1D1F` | — | `#E5E5E9` |
| Op donker, outline | `jr-btn jr-btn--light-outline` | transparant | wit | 1px wit 45% | vult met wit |

**Maten:** `--sm` 40px hoog · `--md` 48px (standaard) · `--lg` 56px · `--xl` 64px.

**Vier regels:**

1. **Geen lift, geen schaduw bij hover.** Alleen kleur verandert. Een knop die omhoog springt is een webshop-reflex, geen Apple-reflex.
2. **Maximaal één gevulde knop per scherm.** Alles daarnaast is outline of tekstlink. Dit is waar "rust" concreet wordt: een pagina met vier blauwe knoppen heeft geen hiërarchie.
3. **Active = `scale(0.98)`.** Meer niet.
4. **Minimaal 48px hoog, 44px op touch.** Geen uitzonderingen.

---

## 12. Werken in de Elementor-editor

De CSS levert klassen die je invult bij **Advanced → CSS Classes** op een container of widget.

| Wat je wil | CSS Class |
|---|---|
| Standaard sectie met ademruimte | `jr-section` |
| Ruime sectie | `jr-section jr-section--lg` |
| Grijze sectie | `jr-section jr-section--subtle` |
| Donkere sectie (alle tekst keert automatisch om) | `jr-section jr-section--dark` |
| Contentbreedte 1024px | `jr-container` |
| Tekstkolom 692px | `jr-container--text` |
| Card | `jr-card` |
| Card met rand | `jr-card jr-card--outline` |
| Klikbare card met lift | `jr-card jr-card--interactive` |
| Highlight met blauw balkje | `jr-card jr-card--accent` |
| Glasvlak over beeld | `jr-card jr-card--glass` |
| Labeltje boven een kop | `jr-eyebrow` |
| Intro-zin | `jr-lead` |
| Hero-kop | `jr-display` |
| "Meer weten ›" link | `jr-link-arrow` |
| Vinklijst | `jr-list-check` |
| Stappenlijst | `jr-list-steps` |
| Kengetal | `jr-stat` (met `jr-stat-value` en `jr-stat-label`) |
| Beeld zoomt bij hover | `jr-img-zoom` |
| Fade-in bij scrollen | `jr-reveal` |
| Grid met staffel-reveal | `jr-reveal-stagger` |
| Verbergen op mobiel | `jr-hide-mobile` |

### Scroll reveal activeren

`jr-reveal` werkt met Elementor's Motion Effects, of met deze snippet (Custom Code → footer):

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

---

## 13. Motion

| Token | Waarde | Waarvoor |
|---|---|---|
| Easing standaard | `cubic-bezier(0.25, 0.1, 0.25, 1)` | kleur, opacity |
| Easing uit | `cubic-bezier(0.16, 1, 0.3, 1)` | binnenkomende elementen |
| Snel | 150 ms | hover-kleur, knoppen |
| Basis | 250 ms | cards, panelen |
| Traag | 400 ms | beeld-zoom |
| Reveal | 800 ms (600 op mobiel) | scroll-in |

Scroll reveal: **16px omhoog + fade**. Geen schaal, geen bounce, geen zijwaartse beweging.

`prefers-reduced-motion` is afgevangen in §18 van de CSS — laat dat staan, het is geen optie maar een vereiste.

---

## 14. Checklist voor oplevering

- [ ] Breakpoints op 734 / 1068 / 1440
- [ ] Global Colors en Fonts ingevuld
- [ ] Theme Style ingevuld (knoppen, links, formulieren, beeld)
- [ ] `jr-elementor-globals.css` in Custom CSS
- [ ] Reveal-snippet in de footer
- [ ] Geen enkele pagina met meer dan één gevulde knop per scherm
- [ ] Geen lopende tekst breder dan 692px
- [ ] Alle formuliervelden ≥16px op mobiel
- [ ] Focusring zichtbaar bij tabben over de hele site
- [ ] Contrast gecheckt: geen `#007AFF` op wit voor tekst onder 24px
- [ ] Getest op iPhone SE (375px) — de smalste maat die er nog toe doet
- [ ] `prefers-reduced-motion` getest (macOS: Systeeminstellingen → Toegankelijkheid → Beeldscherm)

---

*James Robinson — Marketing & Branding | www.jamesrobinson.nl*
