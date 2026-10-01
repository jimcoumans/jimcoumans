# -*- coding: utf-8 -*-
from base import *

FASE = 'Intern · Waar het om draait'

def body():
    o = []
    o.append(kader('<p>Onze winst is niet een zo hoog mogelijke retainer. Onze winst is dat we de doelen keer op keer halen, dat het advertentiebudget ons niet beperkt, dat de klant tevreden is over de resultaten, en dat we over tien jaar nog steeds de marketingpartner zijn. Vraagt een klant zich over drie of zes maanden af wat marketing oplevert, dan hebben we een groter probleem dan een lagere factuur. Daarom zetten we liever een deel van de retainer om in advertentiebudget dan dat we uren steken in werk dat weinig oplevert.</p>', 'Hoe we het zeggen', 'zwart', 'Ons succes is jullie succes. Niet meer en niet minder.'))

    o.append(h2('Drie dingen gelden bij alles'))
    o.append(p('Een performancebureau dat ook aan de lange termijn denkt. We sturen op aanvragen en wat ze kosten, maar nooit ten koste van het merk.'))
    o.append(drie(
        kader('<p>We worden afgerekend op aanvragen en wat een aanvraag kost. Elke euro is meetbaar, en de klant ziet dezelfde cijfers als wij.</p>', 'Performance eerst · korte termijn', 'blauw'),
        kader('<p>Elke uiting klopt met het merk van de klant: kleur, typografie, toon, beeld. Een advertentie die vandaag klikt maar het merk beschadigt, is op termijn duurder dan hij oplevert. Consistent herkend worden is ook performance.</p>', 'Altijd on-brand · lange termijn', 'lime'),
        kader('<p>We monitoren continu en beslissen op wat de cijfers laten zien, en niet op wat iemand mooi vindt, ook wij niet. Het merk bepaalt de grenzen; binnen die grenzen kiest de data.</p>', 'Data beats opinion · altijd', 'groen')))

    o.append(h2('Wie we zijn'))
    o.append(drie(
        kader('<p>Marketingbureau in Hulsberg, bedacht in 2017 en opgericht in 2018. Ongeveer tien mensen; zeven begonnen hier als stagiair. Eigenaren: Jim Coumans en Jim Kikken, via James Robinson Group BV.</p>', 'James Robinson', 'grijs'),
        kader('<p>Een performancebureau met een vast product: een fundament en een retainer met een vaste maandprijs. Geen collega of externe marketingafdeling. Radicaal transparant: de klant ziet in het dashboard wat wij zien.</p>', 'Het model', 'grijs'),
        kader('<p>Het meest toonaangevende bureau van Limburg. In voorbeeld zijn, en dus zelf de beste marketing hebben; omzet en grootte zijn de maat niet. Dat schrijven we nergens op; je moet het merken.</p>', 'De ambitie', 'grijs')))

    o.append(h2('Waarom deze opzet'))
    o.append(p('De propositie is zo gebouwd omdat de oude niet klopte. Elke keuze lost een probleem op dat we zelf hadden.'))
    o.append(tabel(['Wat niet werkte', 'Wat we nu doen'], [
        ['Klanten vertrokken na een jaar, en het volgende bureau scoorde op ons fundament', 'Het fundament is een eigen, betaald product. De klant blijft omdat we meetbaar beter worden, en niet omdat er een contract ligt.'],
        ['Acht dingen tegelijk, nergens hard op sturen', 'Eén motor (adverteren) en versnellers pas als de cijfers er zijn'],
        ['Hoge retainers werden personeel', 'Vaste pakketten met een harde grens aan wat erin zit'],
        ['Elke onboarding werd opnieuw bedacht: 58 tot 96 uur', 'Een vast fundament van 52,5 uur, 27 onderdelen, 76 taken met standaarden'],
        ['De prijs ontstond na de diagnose, en was dus niet te controleren', 'De prijslijst ligt er vóór het gesprek. De quickscan wijst alleen aan welke regels gelden.'],
        ['Het bedrijf draaide niet zonder de twee eigenaren', 'Vaste stappen, templates en checklists. Tot aan de quickscan draait de verkoop zonder mens; daarna doen vaste medewerkers het meeste werk.'],
    ]))

    o.append(NIEUWE_PAGINA)
    o.append(h2('Tone of voice'))
    o.append(p('We schrijven zoals we aan tafel praten: kort, concreet en zonder gebakken lucht. De zinsbouw van Apple, de nuchterheid van Limburg.'))
    o.append(tabel(['Principe', 'Zo wel', 'Zo niet'], [
        ['<b>Zeg het concreet of zeg het niet</b>', 'Je ziet in ClickUp waar we mee bezig zijn, ook als het tegenvalt.', 'Korte lijnen en persoonlijke aandacht.'],
        ['<b>Claim, bewijs, stop</b>', 'Maandelijks opzegbaar. Een samenwerking die op een contract moet draaien, draait niet.', 'Een alinea die de claim drie keer herhaalt.'],
        ['<b>Leg het feit neer, trek de conclusie niet</b>', 'De eerste aanvragen zijn duur. Dat zeggen we vooraf.', 'Retorische vragen, probleem opkloppen, nadelen weglaten.'],
        ['<b>Praat zoals aan tafel, niet zoals je verkoopt</b>', 'Een zin die iets vaststelt.', 'Een zin die iets van de lezer wil.'],
    ]))
    o.append(twee(
        kader(ul(['Je en jouw voor de klant, we en ons voor onszelf. U alleen in juridische teksten.', 'Uitroeptekens: nul.', 'Sportbeeld: hooguit één per pagina, en alleen als het iets uitlegt.', 'Ritme: kort, kort, lang, waar een punt moet landen.', 'Een zin hooguit 25 woorden, een alinea hooguit drie zinnen, een kop hooguit acht woorden, een knop hooguit drie.', 'Altijd sentence case. Geen hoofdletters in labels, geen cursief.']), 'Vaste afspraken', 'blauw'),
        kader('<p>Ontzorgen, oplossingen op maat, partner in, innovatief, uniek, passie voor, resultaatgericht, korte lijnen, persoonlijke aandacht, al meer dan X jaar, de beste, vrijblijvend.</p>', 'Woorden die we nooit gebruiken', 'rood')))
    o.append(twee(
        kader('<p>Het ding, twee constateringen, een feit erbij.</p>', 'Diensten beschrijven', 'grijs'),
        kader('<p>De title-tag is zoekgericht, de H1 is de dienstnaam, de regel eronder is het merk.</p>', 'SEO-teksten', 'grijs')))
    o.append(kader('<p><b>James Robinson — Marketing &amp; Branding.</b> De tweede tagline, On top of your game, alleen als tagline, nooit in lopende tekst. Intern heet onze werkwijze de ARENA-methode; naar buiten noemen we het gewoon onze werkwijze.</p>', 'Naam en tagline', 'lime'))
    return ''.join(o)

DOCS = [dict(code='I.2', titel='Wat voor bureau we zijn', fase=FASE, voor='Intern', wanneer='Bij de start, en bij twijfel', wie='Iedereen in het team',
  lead='Wie we zijn, wat bij alles geldt, waarom de propositie zo in elkaar zit, en hoe we klinken.', body=body())]
