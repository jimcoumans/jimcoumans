# Brief: de losse documenten van James Robinson

James Robinson is een performance-marketingbureau in Hulsberg. Alles wat we doen staat in één leidende gids: `styleguide/paginas/gids.html`, gebouwd uit de Python-bronnen in `styleguide/paginas/_gids-bron/` (part1.py t/m part3.py; part2a = stap 01 en 02, part2b = stap 03 en 04, part2c = stap 05 t/m 07, part2d = stap 08, part1 = propositie, tarieven, spelregels, communicatie, merk; part3 = samenhang, open punten, besluiten). **De gids is leidend.** Oudere losse pagina's in `styleguide/paginas/*.html` zijn bron, niet leidend: gebruik ze alleen als de gids iets niet uitwerkt, en dan nooit in strijd met de gids.

De eigenaar wil nu alles "alsof we dertig jaar terug leven": elke vragenlijst, elk formulier, elk draaiboek, elke mailtekst en alle verkoopondersteuning als **los A4-document (PDF)**, om te printen en met de hand in te vullen of uit te delen.

## Hoe je een document maakt

- Eén Python-module per stap of onderwerp in `documenten/_bron/docs/`, met een lijst `DOCS = [dict(...), ...]`. Voorbeeld: `docs/03b_vragenlijst_intake.py` (lees die eerst; zo moet het eruitzien).
- Gebruik alleen de helpers uit `documenten/_bron/base.py` (`from base import *`): `h2, h3, p, ul, ol, tabel, kader, vraag, velden, vakken, checklist, mail, zin, blok, chip, vv, twee, drie, handtekening, NIEUWE_PAGINA`. **Wijzig base.py niet.** Heb je echt iets anders nodig, maak dan een kleine helper in je eigen module met bestaande CSS-klassen.
- Elk document: `dict(code='06.2', titel='Onboardingformulier', fase='Fase 2 · Starten · Stap 06 · De onboarding', voor='Klant' of 'Intern', wanneer='…', wie='…', lead='één of twee zinnen', body=html)`. Zet `concept=True` als je inhoud moest schrijven die nog niet in de gids staat.
- Bouwen en controleren: `cd documenten/_bron && python3 build.py <codeprefix>` (bijv. `python3 build.py 06`). De PDF komt in `documenten/<map>/`. Kijk naar het resultaat: `pdftoppm -r 60 -png "<pdf>" /tmp/claude-0/-home-user-jimcoumans/ca93bccb-e2f4-58a9-9f6c-2e94316f1be2/scratchpad/<naam>` en lees de PNG's. Let op lege halve pagina's, afgebroken blokken en te kleine invulruimte.
- Raak de gids, base.py, build.py en andermans modules niet aan. Commit niets; de hoofdsessie commit.

## Schrijfregels (strikt)

- Nederlands. Menselijk, direct, nuchter, zelfverzekerd. Geen jargon, geen hol marketingpraat. Korte zinnen.
- Klantdocumenten: je/jij. Interne documenten: "de klant", en vermijd "hij/zij" waar het kan (schrijf "de klant", "je klant").
- Sentence case in koppen; geen hoofdletterlabels. Geen gedachtestreepjes als tussenzin, geen "niet X, maar Y"-trucjes, geen dubbele punt-onthulling als stijlmiddel.
- Bedragen exclusief btw, met "€ 1.000"-notatie. Cijfers, namen en regels exact zoals in de gids. Verzin geen prijzen of feiten; ontbreekt iets, gebruik `vv('[…]')` als invulplek.
- Namen die vastliggen: intakegesprek, quickscan, scanrapport, voorstel, voorstelgesprek, offerte, kick-off(mail), onboardingformulier, toegangendocument, toegangensessie, fundament, draaidag, livegang, contentronde, Performance Review, 100-dagenreview, jaargesprek, maandupdate, diagnoseformulier, dagmail, marketingdashboard, support@jamesrobinson.nl, kantoor 045 792 0009. Pakketten: Sub (€ 500, alleen op verzoek), Starter (€ 1.000), Playmaker (€ 1.500), Captain (€ 2.000), Champion (€ 2.500). Fundament € 4.500 (voorlopig). Retainer start altijd in maand 2. Draaidag in week 3 of 4 van het fundament, op dagdelen die de klant opgeeft. ClickCease is een optie, nooit standaard. Performance Review duurt een uur.
- Formulieren om met de hand in te vullen: genoeg lijnen (`regels`) en vakjes; vraag niets wat we al weten.
- Elk document staat op zichzelf: geen "zie de gids" als vervanging voor inhoud. Een verwijzing naar een ander document mag met de code (bijv. "het draaiboek (03.1)").
