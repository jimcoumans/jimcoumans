# James Robinson — Elementor Pro setup

Implementatiegids bij `jr-elementor-globals.css` (v2.0).
Elke waarde hieronder komt één op één overeen met een token in de stylesheet.

---

## 1. Installatievolgorde

1. **Site Settings → Layout → Breakpoints** → §5
2. **Site Settings → Global Colors** → §3
3. **Site Settings → Global Fonts** → §2
4. **Site Settings → Theme Style** → §10
5. **Site Settings → Custom CSS** → plak `jr-elementor-globals.css`
6. **Elementor → Settings → Features** → *Improved CSS Loading* aan

---

## 2. Lettertype — Inter Tight + Inter

### De beslissing

Apple gebruikt twee **optische varianten van hetzelfde lettertype**:

| Apple | Vanaf | Waarom |
|---|---|---|
| SF Pro Display | 20px en groter | strakker, smallere letters, kleinere ruimte tussen tekens |
| SF Pro Text | onder 20px | ruimer, opener, beter leesbaar op klein formaat |

Wij doen exact hetzelfde met de Inter-familie:

| Rol | Font | Vanaf |
|---|---|---|
| **Display** — display, H1–H5, quote, kengetal | **Inter Tight** | 21px en groter |
| **Text** — H6, intro, body, small, caption, knoppen, nav, velden | **Inter** | onder 21px |

Eén familie, twee optische maten. Dat is geen tweede lettertype — het is hetzelfde principe als bij Apple.

Beide staan in Google Fonts, dus je kiest ze gewoon in Elementor's font-picker. Laad deze gewichten en niet meer:

- **Inter Tight**: 600, 700
- **Inter**: 400, 500, 600

### Waarom niet Sofia Pro

Sofia Pro is een **geometrische** sans — ronde, gelijkmatige vormen, in de familie van Futura en Poppins. SF Pro is een **neo-grotesk** — dichter bij Helvetica, met smallere ronde vormen en een hoge x-hoogte.

Als je de Apple-esthetiek wil evenaren, brengt Sofia Pro je verder van je doel af, niet dichterbij. Het is een mooi lettertype, maar het is een ánder gebaar: vriendelijk en rond waar Apple zakelijk en strak is.

Praktisch komt daar nog bij: Sofia Pro is betaald (Adobe Fonts / Fontspring). Via jullie Creative Cloud-abonnement is een webfont-kit mogelijk, maar dat betekent een extra script van `use.typekit.net` in je kritieke laadpad. Voor een bureau dat op z'n eigen site wordt afgerekend, is dat een prijs zonder opbrengst.

**Inter Tight ligt dichter bij SF Pro dan welk gratis alternatief dan ook**, en het is de reden dat half Silicon Valley erop draait.

### Over Roboto

Terecht punt. In v1 stond de systeemstack, waardoor Android-gebruikers Roboto kregen. Dat is nu weg: met Inter als webfont krijgt **iedereen op elk apparaat exact hetzelfde lettertype**. Kosten: ongeveer 45 kb, gzipped en met `display=swap`, dus geen zichtbare vertraging.

### Afwijking van het brandbook

Het brandbook schrijft Helvetica Neue voor. Dat is een print-lettertype dat als webfont niet vrij te gebruiken is; op web val je terug op Arial en verlies je precies de verfijning die je zoekt. **Web = Inter Tight + Inter. Print en drukwerk = Helvetica Neue, ongewijzigd.**

Het brandbook schrijft ook Light (300) voor bodytekst. Op scherm is dat op 16–17px te dun. Body staat op Regular (400), Light gebruiken we op web niet.

### Global Fonts invullen

| Slot | Naam | Familie | Gewicht |
|---|---|---|---|
| Primary | JR Display | Inter Tight | 700 |
| Secondary | JR Heading | Inter Tight | 600 |
| Text | JR Body | Inter | 400 |
| Accent | JR Action | Inter | 500 |

Voeg als custom fonts toe: **JR Lead** (Inter, 400, 21px) · **JR Caption** (Inter, 400, 12px) · **JR Eyebrow** (Inter, 600, 14px).

---

## 3. Kleur

### De blauw-regel

Drie blauwen, één beslisregel — zo hoef je nooit te twijfelen:

| Blauw als… | Token | Hex | Contrast op wit |
|---|---|---|---|
| **vorm** — icoon, vlak, streep, groot cijfer, vinkje | `--jr-blue` | `#007AFF` | 4.0:1 |
| **tekst** — eyebrow, link, tekstknop, label | `--jr-blue-link` | `#0066CC` | 5.6:1 ✓ |
| **knopvlak** — met witte tekst erop | `--jr-blue-action` | `#0857C3` | 6.7:1 ✓ |

Merkblauw `#007AFF` haalt op wit net niet de norm van 4.5:1, daarom staat het alleen op vormen en op koppen van 24px en groter.

**Eyebrow en link delen dezelfde kleur.** Dat was in v1 niet zo — een eyebrow in `#007AFF` naast een link in `#0066CC` in dezelfde card zag er rommelig uit. Beide staan nu op `#0066CC`.

### Link-toestanden

| Toestand | Kleur | Verder |
|---|---|---|
| Normaal | `#0066CC` | geen onderstreping (los), wel onderstreept in een alinea |
| Hover | `#004C99` | onderstreping, 1px, 3px offset |
| Active | `#003D7A` | — |
| Focus | `#0066CC` | 4px ring `rgba(0,122,255,.40)` |
| Op donker | `#2997FF` | hover `#66B5FF` |

### JR Lime — de nieuwe accentkleur

| Token | Hex | Gebruik | Contrast |
|---|---|---|---|
| `--jr-lime` | `#C4F000` | **vlak** met donkere tekst erop | 12.8:1 met `#1D1D1F` ✓ |
| `--jr-lime-hover` | `#B2DA00` | hover op een lime vlak | |
| `--jr-lime-active` | `#9FC200` | active | |
| `--jr-lime-text` | `#5A7000` | lime **als tekst** op wit | 5.6:1 ✓ |
| `--jr-lime-tint` | `#F2FCCC` | zacht lime vlak, badge-achtergrond | |
| `--jr-lime-dm` | `#D9FF33` | lime tekst op donkere achtergrond | |

**De enige regel die telt: `#C4F000` is een vlak, nooit een tekstkleur op wit.** Fel lime op wit is onleesbaar. Wil je lime als tekst, gebruik dan `--jr-lime-text`.

Lime en blauw zijn bijna complementair. Dat maakt ze sterk naast elkaar, maar ook luidruchtig als je ze allebei groot inzet. Vuistregel: **blauw draagt de pagina, lime zet één ding in het zonnetje.**

### Teal is eruit

Terechte vraag. `#00B48F` kwam uit jullie eigen brandbook, onder "Button Colors → Secondary Green". Maar je hebt gelijk dat hij niet past: hij zit tussen `#34C759` (jullie succesgroen) en blauw in, en doet daardoor geen van beide werk goed. Hij is vervangen door JR Lime.

### Statuskleuren — elk vier tinten

Elke statuskleur heeft nu een vlak, een hover, een tekstkleur die op wit leesbaar is, en een zachte tint voor badges. Geen losse waarden meer in de stylesheet.

| Status | Vlak | Hover | Tekst op wit | Zachte tint |
|---|---|---|---|---|
| Groen | `#34C759` | `#25AD42` | `#1D7D3F` | `#E6F7EB` |
| Oranje | `#F6A027` | `#E08A10` | `#94590A` | `#FEF2E0` |
| Geel | `#FFD631` | `#F0C400` | `#806400` | `#FFF8DC` |
| Rood | `#FF3B30` | `#EF302B` | `#C02A22` | `#FDECEA` |
| Paars | `#AF52DE` | `#9840CC` | `#7E2FB0` | `#F5EAFB` |
| Lime | `#C4F000` | `#B2DA00` | `#5A7000` | `#F2FCCC` |
| Neutraal | — | — | `#6E6E73` | `#F5F5F7` |

### Vlakken, tekst en lijnen

| Rol | Token | Hex |
|---|---|---|
| Basisvlak | `--jr-surface` | `#FFFFFF` |
| Afwisselende sectie | `--jr-surface-subtle` | `#F5F5F7` |
| Brandbook-grijs | `--jr-surface-gray` | `#F2F2F7` |
| Verzonken vlak | `--jr-surface-sunk` | `#EBEBF0` |
| Lichtblauw vlak | `--jr-surface-tint` | `#E2EBF3` |
| Donkere sectie | `--jr-surface-dark` | `#1C1C1E` |
| Card op donker | `--jr-surface-dark-alt` | `#2C2D2E` |
| Tekst primair | `--jr-text` | `#1D1D1F` |
| Tekst secundair | `--jr-text-secondary` | `#6E6E73` |
| Tekst tertiair | `--jr-text-tertiary` | `#86868B` |
| Tekst uitgeschakeld | `--jr-text-disabled` | `#ADADB2` |
| Tekst op donker | `--jr-text-inverse` | `#F5F5F7` |
| Lijn subtiel | `--jr-line-subtle` | `#E5E5E9` |
| Lijn standaard | `--jr-line` | `#D2D2D7` |
| Lijn bij hover | `--jr-line-strong` | `#C8C8CD` |
| Lijn met nadruk | `--jr-line-contrast` | `#86868B` |

### Global Colors invullen

**System (4 slots):** Primary `#007AFF` · Secondary `#1C1C1E` · Text `#1D1D1F` · Accent `#0857C3`

**Custom:** alle tokens uit de tabellen hierboven, met dezelfde naam.

---

## 4. Verticaal ritme — de afstanden tussen tekstelementen

Dit was het grootste gat in v1. De eyebrow stond op 12px van de kop; Apple zet hem op 8. Elk token beschrijft: **wat staat erboven → wat staat eronder.**

| Van → naar | Token | Desktop | Tablet | Mobiel |
|---|---|---|---|---|
| **Eyebrow → kop** | `--jr-gap-eyebrow-title` | **8** | 8 | 6 |
| Display → intro | `--jr-gap-display-lead` | 24 | 20 | 16 |
| H1/H2 → intro | `--jr-gap-title-lead` | 16 | 14 | 12 |
| H1/H2 → lopende tekst | `--jr-gap-title-body` | 20 | 18 | 16 |
| H3/H4 → lopende tekst | `--jr-gap-subtitle-body` | 12 | 12 | 10 |
| H5/H6 → lopende tekst | `--jr-gap-minor-body` | 8 | 8 | 8 |
| Intro → lopende tekst | `--jr-gap-lead-body` | 24 | 20 | 20 |
| Alinea → alinea | `--jr-gap-paragraph` | 20 | 20 | 16 |
| Tekst → knop | `--jr-gap-body-cta` | 32 | 28 | 24 |
| Tekst → lijst | `--jr-gap-body-list` | 16 | 16 | 16 |
| Lijstitem → lijstitem | `--jr-gap-list-item` | 12 | 12 | 12 |
| Label → invoerveld | `--jr-gap-label-field` | 8 | 8 | 8 |
| Veld → hulptekst | `--jr-gap-field-help` | 7 | 7 | 7 |
| Veld → volgend veld | `--jr-gap-field-field` | 16 | 16 | 16 |
| Kengetal → bijschrift | `--jr-gap-stat-label` | 8 | 8 | 8 |
| Citaat → naam | `--jr-gap-quote-author` | 16 | 16 | 16 |
| **Sectiekop-blok → content** | `--jr-gap-head-content` | **64** | 48 | 32 |

### Waarom eyebrow → kop maar 8px is

Een eyebrow is geen zelfstandig element. Het is het eerste woord van de kop, in een andere kleur. Op 16px of meer gaat hij er los boven zweven en oogt het als twee losse dingen. Op 8px hoort hij bij de kop — precies zoals op apple.com.

Dezelfde logica zit in het verschil tussen `title-lead` (16px) en `title-body` (20px): een intro hoort visueel bij de kop en staat dus krapper; lopende tekst is een nieuw blok en krijgt meer lucht.

---

## 5. Breakpoints

**Site Settings → Layout → Breakpoints:**

| Breakpoint | Waarde |
|---|---|
| Mobile | **734 px** |
| Tablet | **1068 px** |
| Laptop | **1440 px** |

Dit zijn apple.com's eigen grenzen. Houd je Elementor's defaults (767/1024), pas dan de getallen in §17 van de CSS aan.

---

## 6. Ruimte tussen containers

Dit vul je in bij **Container → Layout → Gap**.

| Situatie | Token | Desktop | Tablet | Mobiel |
|---|---|---|---|---|
| Tegels die bijna aan elkaar plakken | `--jr-gap-container-xs` | 8 | 8 | 8 |
| Compacte kaarten, tags, badges | `--jr-gap-container-sm` | 16 | 16 | 16 |
| **Standaard — kolommen, grid-items** | `--jr-gap-container` | **24** | 24 | 16 |
| Ruime kaarten, twee-koloms content | `--jr-gap-container-lg` | 32 | 32 | 20 |
| Tekst naast beeld | `--jr-gap-container-xl` | 48 | 32 | 24 |
| Contentblok → contentblok in één sectie | `--jr-gap-block` | 64 | 48 | 40 |
| Idem, met echte adempauze | `--jr-gap-block-lg` | 96 | 72 | 56 |

**Twijfel je? Pak 24.** Dat is de standaard.

### Sectie-padding (boven én onder)

| | Token | Desktop | Tablet | Mobiel |
|---|---|---|---|---|
| Ruim | `--jr-section-y-lg` | 160 | 112 | 80 |
| **Standaard** | `--jr-section-y` | **120** | **88** | **64** |
| Compact | `--jr-section-y-sm` | 80 | 56 | 40 |

### Zijmarge (gutter)

Desktop **32** · tablet **24** · mobiel **20** · onder 375px **16**.

---

## 7. Component-padding

Alle binnenruimtes, per component, verticaal / horizontaal.

### Knoppen

| Maat | Padding | Min-hoogte | Fontgrootte |
|---|---|---|---|
| Small | 9 / 20 | 40 | 15 |
| **Medium** (standaard) | **13 / 26** | **48** | **17** |
| Large | 16 / 34 | 56 | 19 |
| XL | 20 / 42 | 64 | 21 |

Op mobiel: Large wordt 15/28, XL wordt 17/32. Icoon → tekst binnen een knop: **8px**.

### Cards

| Maat | Padding | Radius |
|---|---|---|
| Small | 24 | 12 |
| **Medium** (standaard) | **32** | **18** |
| Large | 48 | 24 |
| XL | 80 | 44 |

Op tablet: Large 40, XL 48. Op mobiel: Small 20, Medium 24, Large 28, XL 32.

### Formulieren

| Element | Padding | Hoogte |
|---|---|---|
| Invoerveld | 13 / 16 | min 48 |
| Textarea | 14 / 16 | min 140 |
| Meldingsbalk | 16 / 20 | — |

### Kleine elementen

| Element | Padding |
|---|---|
| Badge | 6 / 12 |
| Tag | 7 / 16 |
| Navigatielink | 10 / 14 |
| Segmented-knop | 8 / 18 |
| Segmented-track | 4 rondom |
| Tabelcel | 14 / 14 |
| Accordion-titel | 20 / 0 |
| Tab | 16 / 20 |
| Dropdown-paneel | 12 rondom |

### Structuur

| Element | Padding |
|---|---|
| Footer | 80 / 0 / 48 — tablet 64/0/40, mobiel 48/0/32 |

---

## 8. Lijndiktes

Zes diktes, elk met één taak.

| Token | Dikte | Waarvoor |
|---|---|---|
| `--jr-stroke-hairline` | **1 px** | randen, dividers, invoervelden, tabelregels, kaartranden |
| `--jr-stroke-icon` | **1.5 px** | icoonlijnen tot 24px — dit is Apple's SF Symbols-dikte |
| `--jr-stroke-medium` | **2 px** | actieve tab-onderstreping, iconen vanaf 32px, nadrukrand |
| `--jr-stroke-accent` | **3 px** | accentbalk links van een card |
| `--jr-stroke-rule` | **4 px** | korte decoratieve streep onder een kop (64px breed) |
| `--jr-stroke-focus` | **4 px** | focusring — nooit dunner |

Onderstreping van links: **1 px**, offset **3 px**.

**Regel:** één dikte per soort element. Een 2px rand om een card naast een 1px rand om een invoerveld leest als een fout, niet als hiërarchie.

---

## 9. Hoekradius

| Token | Waarde | Waarvoor |
|---|---|---|
| `xs` | 8 | kleine badges, focusring-radius |
| `sm` | 12 | invoervelden, kleine cards |
| `md` | **18** | **standaard card en afbeelding** |
| `lg` | 24 | grote cards |
| `xl` | 32 | feature-blokken |
| `2xl` | 44 | full-bleed tegels |
| `pill` | 980 | **knoppen, badges, tags** |
| `round` | 50% | avatars, icoonvlakken, vinkjes |

Op mobiel: `lg` → 20, `xl` → 24, `2xl` → 28.

---

## 10. Theme Style

**Buttons:**

| Veld | Normal | Hover |
|---|---|---|
| Text color | `#FFFFFF` | `#FFFFFF` |
| Background | `#0857C3` | `#003967` |
| Border radius | `980px` | idem |
| Padding | `13 / 26 / 13 / 26` | idem |
| Typography | Inter · 17px · 500 · −0.008em | idem |
| Transition | `0.15` s | |

**Links:** normal `#0066CC` geen decoratie · hover `#004C99` underline.

**Form Fields:** Inter 17px/400 · tekst `#1D1D1F` · achtergrond `#FFFFFF` · rand 1px `#D2D2D7` · radius `12px` · padding `13 / 16` · focus `#007AFF`.

**Images:** border radius `18px`.

---

## 11. Schaduwen

| Token | Waarde | Waarvoor |
|---|---|---|
| `xs` | `0 1px 2px rgba(0,0,0,.04)` | segmented control |
| `sm` | `0 1px 3px rgba(0,0,0,.05), 0 2px 8px rgba(0,0,0,.04)` | subtiele card |
| `md` | `0 2px 6px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.06)` | dropdown, card |
| `lg` | `0 4px 12px rgba(0,0,0,.06), 0 16px 40px rgba(0,0,0,.08)` | zwevende card, beeld |
| `xl` | `0 8px 24px rgba(0,0,0,.08), 0 32px 72px rgba(0,0,0,.10)` | modal |
| `card-hover` | `0 6px 16px rgba(0,0,0,.07), 0 24px 56px rgba(0,0,0,.11)` | klikbare card |
| `blue` | `0 8px 28px rgba(0,122,255,.22)` | uitgelicht blauw vlak |
| `lime` | `0 8px 28px rgba(196,240,0,.30)` | uitgelicht lime vlak |
| `focus` | `0 0 0 4px rgba(0,122,255,.40)` | focusring |

Twee lagen per schaduw: kort en hard voor de rand, lang en zacht voor de diepte.

---

## 12. Knoppen — varianten en regels

| Variant | Klasse | Achtergrond | Tekst | Hover |
|---|---|---|---|---|
| Primair | `jr-btn jr-btn--primary` | `#0857C3` | wit | `#003967` |
| Secundair | `jr-btn jr-btn--secondary` | transparant, 1px `#0857C3` | `#0857C3` | vult met `#0857C3` |
| Tertiair | `jr-btn jr-btn--tertiary` | `#F5F5F7` | `#1D1D1F` | `#EBEBF0` |
| **Lime** | `jr-btn jr-btn--lime` | `#C4F000` | `#1D1D1F` | `#B2DA00` |
| Tekstknop | `jr-btn jr-btn--text` | — | `#0066CC` | `#004C99` + chevron schuift |
| Op donker | `jr-btn jr-btn--light` | wit | `#1D1D1F` | `#E5E5E9` |
| Op donker, outline | `jr-btn jr-btn--light-outline` | transparant, wit 28% | wit | vult met wit |

**Vier regels:**

1. Geen lift, geen schaduw bij hover — alleen kleur.
2. Maximaal één gevulde knop per scherm. Lime telt daarin mee: lime **of** blauw gevuld, niet allebei.
3. Active is `scale(0.98)`.
4. Minimaal 48px hoog, 44px op touch.

---

## 13. Klassen voor de Elementor-editor

Invullen bij **Advanced → CSS Classes**.

| Wat je wil | Klasse |
|---|---|
| Sectie met standaard ademruimte | `jr-section` |
| Ruime / compacte sectie | `jr-section jr-section--lg` / `--sm` |
| Grijze / lichtblauwe / lime / donkere sectie | `jr-section--subtle` / `--tint` / `--lime` / `--dark` |
| Contentbreedte 1024 / 1280 / 692 / 540 | `jr-container` / `--wide` / `--text` / `--narrow` |
| Sectiekop-blok (eyebrow + kop + intro) | `jr-section-head` |
| Card | `jr-card` |
| Card klein / groot / extra groot | `jr-card--sm` / `--lg` / `--xl` |
| Card met rand / verhoogd / klikbaar | `jr-card--outline` / `--elevated` / `--interactive` |
| Highlight met blauw of lime balkje | `jr-card--accent` / `--accent-lime` |
| Glasvlak over beeld | `jr-card--glass` |
| Labeltje boven een kop | `jr-eyebrow` |
| Hero-kop / intro-zin | `jr-display` / `jr-lead` |
| "Meer weten ›" link | `jr-link-arrow` |
| Knopgroep (32px onder de tekst) | `jr-btn-group` |
| Vinklijst / met lime vinkjes | `jr-list-check` / `jr-list-check--lime` |
| Stappenlijst | `jr-list-steps` |
| Kengetal | `jr-stat` + `jr-stat-value` + `jr-stat-label` |
| Rij badges of tags | `jr-chips` |
| Korte streep onder een kop | `jr-divider--rule` / `--rule-lime` |
| Container-gap standaard / klein / groot | `jr-gap` / `jr-gap-sm` / `jr-gap-lg` |
| Blokken 64px uit elkaar | `jr-blocks` |
| Beeld zoomt bij hover | `jr-img-zoom` |
| Fade-in bij scrollen | `jr-reveal` / `jr-reveal-stagger` |
| Verbergen op mobiel / tablet | `jr-hide-mobile` / `jr-hide-tablet` |

### Scroll reveal activeren

Custom Code → footer:

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

## 14. Motion

| Token | Waarde | Waarvoor |
|---|---|---|
| Easing standaard | `cubic-bezier(.25,.1,.25,1)` | kleur, opacity |
| Easing uit | `cubic-bezier(.16,1,.3,1)` | binnenkomende elementen |
| Snel | 150 ms | hover |
| Basis | 250 ms | cards, panelen |
| Traag | 400 ms | beeld-zoom |
| Reveal | 800 ms (600 mobiel) | scroll-in |

Scroll reveal: 16px omhoog + fade. `prefers-reduced-motion` staat in §18 van de CSS — laat dat staan.

---

## 15. Checklist voor oplevering

- [ ] Breakpoints op 734 / 1068 / 1440
- [ ] Inter Tight (600, 700) en Inter (400, 500, 600) geladen, verder niets
- [ ] Global Colors, Global Fonts en Theme Style ingevuld
- [ ] `jr-elementor-globals.css` in Custom CSS
- [ ] Reveal-snippet in de footer
- [ ] Eyebrow staat op 8px van de kop, niet meer
- [ ] Geen pagina met meer dan één gevulde knop per scherm — lime telt mee
- [ ] `#C4F000` staat nergens als tekstkleur op wit
- [ ] Geen lopende tekst breder dan 692px
- [ ] Formuliervelden ≥16px op mobiel
- [ ] Focusring zichtbaar bij tabben over de hele site
- [ ] `#007AFF` nergens als tekst onder 24px
- [ ] Één lijndikte per soort element
- [ ] Getest op iPhone SE (375px)
- [ ] `prefers-reduced-motion` getest

---

*James Robinson — Marketing & Branding | www.jamesrobinson.nl*
