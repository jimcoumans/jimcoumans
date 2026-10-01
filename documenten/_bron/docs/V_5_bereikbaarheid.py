# -*- coding: utf-8 -*-
from base import *

FASE = 'Verkoopondersteuning · Samenwerken'

def body():
    o = []
    o.append(kader('<p>Vragen, materiaal aanleveren, akkoorden: alles gaat naar één adres. We werken met Front: je mail komt automatisch binnen bij je marketingmanager, en iedereen die aan je campagne werkt, leest mee.</p>', 'Voor alles', 'zwart', 'support@jamesrobinson.nl'))
    o.append(twee(
        kader('<p>Op werkdagen, van degene die erover gaat, met naam. Voor ieder pakket hetzelfde.</p>', 'De belofte', 'groen', 'Antwoord binnen één werkdag'),
        kader('<p>Alleen als het dringend is: je campagne of website ligt eruit, of er gaat geld verloren. Al het andere gaat per mail. Kantoor is bereikbaar ' + vv('[dagen en tijden]') + '.</p>', 'Dringend', 'rood', 'Bel kantoor: 045 792 0009')))

    o.append(h2('Geen WhatsApp-groepen meer, en dat is goed nieuws'))
    o.append(tabel(['Met een appgroep', 'Met support@'], [
        ['Een geopend appje zakt weg en wordt vergeten.', 'Een mail blijft openstaan tot hij is afgehandeld.'],
        ['Iedereen leest alles mee, ook wat niet voor jou is.', 'Elke mail heeft één eigenaar: je marketingmanager.'],
        ['Soms kwam er direct antwoord, soms na dagen.', 'Antwoord binnen één werkdag, en we meten of we dat halen.'],
        ['Een gesprek verdween als een medewerker vertrok.', 'Je hele historie blijft bewaard, voor het hele team.'],
    ]))

    o.append(kader(ul(['<b>Meldingen</b> van elke nieuwe aanvraag, per mail of WhatsApp. Dat is een melding uit je dashboard, geen gesprek.', '<b>De maandupdate</b> in je marketingdashboard.', '<b>Na elke Performance Review</b> een mail met wat we bespraken en besloten.', '<b>Vraag je iets buiten je pakket,</b> dan krijg je een voorstel met een prijs vooraf. Jij beslist.']), 'Wat gewoon blijft', 'blauw'))
    return ''.join(o)

DOCS = [dict(code='V.5', titel='Zo bereik je ons', fase=FASE, voor='Klant', wanneer='Bij de kick-off', wie='Marketingmanager',
  lead='Eén adres voor alles, en binnen één werkdag antwoord. Is het dringend, dan bel je kantoor.', body=body())]
