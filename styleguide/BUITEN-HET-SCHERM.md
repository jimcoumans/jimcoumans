# Buiten het scherm — fotografie en ruimte

Hoort bij het designsysteem v3.0.

---

## Eerst het misverstand

> *"Donker hout, beton en donkerblauw staat haaks op de strakke witte website."*

Dat lijkt zo, maar het is niet waar. Kijk naar Apple.

| | Apple | James Robinson |
|---|---|---|
| **Website** | wit, strak, veel witruimte | wit, strak, veel witruimte |
| **Hoofdkantoor** | hout, beton, glas, warm | hout, beton, donkerblauw, warm |
| **Winkels** | houten tafels, leren banken, stenen vloer, bomen | — |

Niemand die apple.com bezoekt en daarna Apple Park binnenloopt, denkt dat er twee merken aan het werk zijn.

### Waarom dat werkt

Een scherm **zendt licht uit**. Wit op een scherm leest als ruimte en helderheid.

Een ruimte **weerkaatst licht**. Wit in een ruimte leest als ziekenhuis, kantoortuin, wachtkamer.

Om hetzelfde gevoel te bereiken — rust, ruimte, kwaliteit — heb je in een fysieke ruimte andere middelen nodig dan op een scherm. Dezelfde kleur gebruiken zou juist het tegenovergestelde effect hebben.

### De constante is niet de kleur

Wat website en kantoor delen:

1. **Terughoudendheid.** Weinig dingen, veel ruimte ertussen.
2. **Materiaaleerlijkheid.** Echt hout, echt beton. Geen betonbehang, geen houtprint.
3. **Detailobsessie.** De naad, de overgang, de plek waar twee materialen elkaar raken.
4. **Weglaten.** Geen decoratie zonder functie.
5. **Eén accent.** Nooit twee.

Dat zijn exact de vijf uitgangspunten uit het designsysteem, vertaald naar drie dimensies.

### Het kantoor staat al in de stylesheet

```css
.jr-section--dark {
  background-color: #1C1C1E;
  color: #F5F5F7;
}
```

Die donkere sectie bestaat al op de website. Het kantoor **is** die sectie, driedimensionaal gemaakt.

Zo hoort het ook: een bezoeker die op de site een donkere sectie ziet en daarna het kantoor binnenloopt, herkent iets. Dat is precies de brug die je zoekt.

---

# Deel 1 — Fotografie

Fotografie is niet alleen een merkmiddel. Het is **de plek waar het donkere kantoor op de lichte website landt.**

Een donkere, warme foto op een witte pagina met veel witruimte: dat contrast is geen probleem, dat is de compositie. Apple doet exact dit — witte pagina, donker product, dramatisch licht.

## Licht

| | |
|---|---|
| **Bron** | Eén dominante lichtbron. Daglicht van opzij heeft de voorkeur. |
| **Richting** | Zijlicht of tegenlicht. Nooit frontaal. |
| **Schaduw** | Diep mag. Een foto zonder schaduw heeft geen vorm. |
| **Kleurtemperatuur** | Warm tot neutraal, 3200–5000K. Nooit koud blauw. |
| **Flits** | Niet zichtbaar. Geen harde slagschaduw, geen dubbele schaduwen. |

Als je twijfelt: doe één lamp uit.

## Kleur en nabewerking

| Wel | Niet |
|---|---|
| Neutrale witbalans | Filters en presets die "een look" opleggen |
| Echt zwart in de schaduwen | Opgetrokken schaduwen waardoor alles grijs wordt |
| Rustige, iets gedempte verzadiging | Verzadigde kleuren, HDR, clarity |
| Huid zoals hij is | Gladgestreken huid, weggepoetste lijnen |
| Lichte korrel bij weinig licht | Ruisonderdrukking die alles plastic maakt |

**Vuistregel:** de nabewerking mag niet zichtbaar zijn. Merkt iemand dat er bewerkt is, dan is het te veel.

## Compositie

- **Ruimte in het kader.** Het onderwerp hoeft niet groot in beeld. De witruimte in het design heeft een tegenhanger nodig in het beeld.
- **Niet centreren.** Uit het midden, met lucht aan één kant.
- **Detail boven overzicht.** Handen op een toetsenbord zegt meer dan een overzichtsfoto van de werkvloer.
- **Rechte lijnen recht.** Verticalen loodrecht, horizon waterpas. Dit is het fotografische equivalent van een strak raster.

## Wat we fotograferen

**Mensen aan het werk.** Iemand die luistert. Iemand die iets aanwijst op een scherm. Twee mensen die naar hetzelfde kijken. Nooit naar de camera, nooit poserend.

**Handen en details.** Een schets, een kleurstaal, een drukproef, een schermrand.

**De ruimte zelf.** Het kantoor is een merkmiddel. Fotografeer het als een interieurfoto: leeg, rustig, één lichtbron.

**Klantwerk in situ.** De belettering op de bus, het drukwerk op de toonbank, de gevel in het echt. Niet de PDF-mockup.

**Portretten.** Donkere achtergrond, zijlicht, geen glimlach naar de camera. Iemand die net iets gezegd heeft, niet iemand die poseert.

## Wat we nooit fotograferen

| Verboden | Waarom |
|---|---|
| Stockfoto's | Als je niemand herkent, is het geen bewijs |
| High five, duim omhoog, vuistje | 2009 belde |
| Mensen die naar een laptop wijzen | Het meest gefotografeerde niets ter wereld |
| Vergaderzaal met post-its op een raam | Het cliché van elk bureau in Nederland |
| Lachende mensen om een tafel met koffie | Idem |
| Een handdruk | Idem |
| Iemand met een headset | Idem |
| Team dat in een rij naar de camera lacht | Schoolfoto |
| Abstracte "digitale" beelden met netwerklijnen | Zegt niets, kost niets, betekent niets |

## Technisch

| | |
|---|---|
| **Diafragma** | f/2.0–f/4 voor portret, f/5.6–f/8 voor ruimte |
| **Ratio's** | Hero 21:9 · case 3:2 · portret 4:5 · social 1:1 · video 16:9 |
| **Aanlevering** | RAW plus geëxporteerde JPEG, sRGB, langste zijde 3000px |
| **Web** | WebP, hero onder 250 kb, kaartbeeld onder 120 kb |
| **Beheer** | Alles in Kive, getagd op branche, type en jaar |

## De beeldbank — wat je minimaal nodig hebt

Per jaar, zodat er altijd actueel materiaal is:

- **10 portretten** — elk teamlid, donkere achtergrond, zijlicht
- **15 werkbeelden** — overleg, schermen, handen, schetsen
- **8 ruimtebeelden** — kantoor leeg, verschillende hoeken en tijdstippen
- **3 per case** — het werk in de echte omgeving
- **5 detailbeelden** — materiaal, drukwerk, kleurstalen

Zonder een vaste voorraad grijpt iedereen na drie maanden weer naar stock.

---

# Deel 2 — De ruimte

## De zonering lost je hele probleem op

Een volledig donker kantoor werkt niet — niet esthetisch, en zeker niet praktisch. Je hebt licht nodig om te werken, en designers hebben goed licht nodig om kleur te beoordelen.

De oplossing is geen compromis maar een indeling in drie zones, met **hetzelfde materiaalpalet en oplopende donkerte**:

| Zone | Sfeer | Wat het doet |
|---|---|---|
| **Ontvangst en lounge** | donker, warm, luxe | De eerste indruk. Hier mag het theater zijn. |
| **Werkvloer** | lichter, functioneel, zelfde materialen | Hier wordt gewerkt. Licht is hier gereedschap. |
| **Presentatieruimte** | het donkerst | Hier laat je werk zien. Donker maakt een scherm beter. |

Bezoekers zien vooral zone 1 en 3. De werkvloer mag lichter zijn zonder dat het merk breekt, zolang hout, beton en blauw doorlopen.

## Het materiaalpalet

Afgeleid van de designtokens. De kleurcodes zijn dezelfde als op de website.

| Element | Materiaal | Token | Hex |
|---|---|---|---|
| **Plafond** | mat, akoestisch | JR Black | `#1C1C1E` |
| **Wand — basis** | microcement, betonlook, warm grijs | Gray 65 | `#6E6E73` |
| **Wand — akoestisch** | lamellen in gerookt eiken of noten op zwarte vilt | Gray 90 | `#2C2D2E` |
| **Wand — accent** | donkerblauw, matte verf of textiel | Action Hover | `#003967` |
| **Vloer** | donkere eiken plank of gepolijst beton | Gray 90 | `#2C2D2E` |
| **Meubels** | zwart geanodiseerd aluminium, donker hout | JR Black | `#1C1C1E` |
| **Textiel** | wol of bouclé in donkerblauw, leer in cognac | Deep Blue | `#005CBF` |
| **Accent** | één lime element in de hele ruimte | JR Lime | `#C4F000` |

### Drie regels over de materialen

**Echt of niet.** Betonbehang, houtprint-laminaat en nep-planten breken het hele verhaal. Een bureau dat over authenticiteit adviseert, kan zich geen namaak veroorloven. Liever minder oppervlak echt dan alles nep.

**De lattenwand heeft een functie.** Akoestische lamellen zijn nu overal, en daarmee een trend die over twee jaar gedateerd is. Ze werken alleen als ze er staan omdat de akoestiek het vraagt — in de presentatieruimte, achter de lounge — niet als decoratie in de gang.

**Eén lime ding.** Niet een lime stoel én een lime neon én lime accenten in de koffiehoek. Eén. Dezelfde regel als op de website: één gevulde knop per scherm.

## Licht is het echte materiaal

In een donker interieur bepaalt verlichting het verschil tussen *luxe hotel* en *donkere kelder*. Dit is het onderdeel waar het meeste budget naartoe moet.

| | |
|---|---|
| **Kleurtemperatuur** | 2700K in lounge en ontvangst, 3000–3500K op de werkvloer |
| **Kleurweergave** | **CRI 95+ op de designwerkplekken.** Niet onderhandelbaar. |
| **Werkplekniveau** | 500 lux op het werkblad, individueel dimbaar |
| **Sfeer** | indirect: uplights, lichtlijnen achter lamellen, wandwassers |
| **Zichtbaarheid** | geen enkele lichtbron mag in het zicht schitteren |
| **Dimmen** | alles dimbaar, in scènes: ochtend, werk, presentatie, avond |

**Waarom CRI 95+ geen luxe is:** jullie beoordelen drukproeven, kleurstalen en beeldmateriaal. Onder goedkope LED met lage kleurweergave zie je kleuren verkeerd, en dan keur je werk goed dat bij de klant anders uitpakt. Voor een bureau is dit gereedschap, geen sfeer.

## Wat de ruimte moet uitstralen — en wat niet

| Wel | Niet |
|---|---|
| Opgeruimd, weinig zichtbare spullen | Een muur vol prijzen en certificaten |
| Eén goed stuk beeld per wand | Motivatieteksten op de muur |
| Kabels weggewerkt | Zichtbare bekabeling en stekkerdozen |
| Planten: weinig, groot, echt | Veel kleine potjes |
| Boeken die echt gelezen worden | Boeken op kleur gesorteerd |
| Stilte als uitgangspunt | Radio aan op de achtergrond |
| Eigen werk aan de wand, groot en zonder uitleg | Een collage van logo's van klanten |

Dat laatste is belangrijk. **Een logowall is een verkoopargument aan de muur.** Dat is precies wat we op de website ook niet doen. Laat één stuk werk zien, groot, zonder tekst erbij.

## De detaillijst

De dingen die niemand benoemt maar iedereen voelt:

- **Deurkrukken en schakelaars** — zwart of geborsteld, geen chroom
- **Stopcontacten** — zwart, in lijn met de wand, niet wit
- **Plinten** — gelijk met de wand of afwezig, nooit wit
- **De koffie** — dit is het meest gebruikte merkmoment in het pand
- **Geur** — subtiel en constant, of helemaal geen
- **Muziek** — één playlist, laag volume, of stilte
- **De toiletruimte** — hier haken bezoekers mentaal af of juist niet
- **De entree bij donker** — hoe ziet het pand er 's avonds van buiten uit

## Hoe kantoor en website elkaar raken

| Website | Kantoor |
|---|---|
| `#1C1C1E` donkere sectie | plafond, meubels, presentatieruimte |
| `#003967` action hover | accentwand |
| `#C4F000` lime, één per scherm | één lime object in het pand |
| Radius 18px op cards | afgeronde hoeken op tafels en balies |
| 120px sectie-padding | ruimte tussen meubels, niet volzetten |
| Twee lagen schaduw | indirect licht, geen harde slagschaduw |
| Eén gevulde knop per scherm | één blikvanger per ruimte |
| Inter Tight op signing | bewegwijzering in hetzelfde lettertype |

Die laatste is concreet en goedkoop: **de bewegwijzering in het pand in Inter Tight**, in dezelfde gewichten als de website. Dat is het soort detail waar niemand naar vraagt en iedereen op reageert.

---

## De samenvatting in één zin

**De website is wit omdat een scherm licht uitzendt. Het kantoor is donker omdat een ruimte licht weerkaatst. Beide zijn terughoudend, eerlijk in materiaal en obsessief in detail — en dat is wat het merk maakt, niet de kleur.**

---

*James Robinson — Marketing & Branding | www.jamesrobinson.nl*
