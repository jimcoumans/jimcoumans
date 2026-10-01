# -*- coding: utf-8 -*-
from base import *

FASE = 'Verkoopondersteuning · Onze werkwijze'

GRAFIEK = """<svg viewBox="0 0 760 340" style="display:block;width:100%;height:auto;max-height:68mm" role="img" aria-label="Je feed vullen kost veel tijd en levert het minste op. Adverteren, SEO en e-mail leveren meer op per euro.">
<rect x="390" y="196" width="350" height="114" rx="10" fill="#fdecea"/>
<text x="728" y="218" text-anchor="end" font-size="13" font-weight="600" fill="#c02a22">Veel moeite, weinig resultaat</text>
<line x1="40" y1="310" x2="740" y2="310" stroke="#d2d2d7"/>
<line x1="40" y1="16" x2="40" y2="310" stroke="#d2d2d7"/>
<text x="740" y="332" text-anchor="end" font-size="13" fill="#6e6e73">Investering in tijd en geld →</text>
<text x="40" y="332" font-size="13" fill="#6e6e73">laag</text>
<text transform="translate(24 310) rotate(-90)" font-size="13" fill="#6e6e73">Opbrengst: bezoek, aanvragen, klanten →</text>
<circle cx="520" cy="66" r="11" fill="#007aff"/><text x="540" y="62" font-size="15" font-weight="600" fill="#1d1d1f">Adverteren</text><text x="540" y="80" font-size="13" fill="#6e6e73">de motor</text>
<circle cx="350" cy="121" r="9" fill="#007aff"/><text x="368" y="117" font-size="15" font-weight="600" fill="#1d1d1f">SEO</text><text x="368" y="135" font-size="13" fill="#6e6e73">groeit mee</text>
<circle cx="160" cy="146" r="9" fill="#007aff"/><text x="178" y="142" font-size="15" font-weight="600" fill="#1d1d1f">E-mail</text><text x="178" y="160" font-size="13" fill="#6e6e73">klein, rendabel</text>
<circle cx="620" cy="276" r="11" fill="#ff3b30"/><text x="600" y="272" text-anchor="end" font-size="15" font-weight="600" fill="#1d1d1f">Je feed vullen</text><text x="600" y="290" text-anchor="end" font-size="13" fill="#6e6e73">twee posts per week</text>
</svg>"""

def winst(t, s): return '<div style="border-top:1px solid var(--ln-soft);padding-top:7pt"><div class="groot" style="font-size:11.5pt;margin-bottom:2pt">%s</div><span class="klein">%s</span></div>' % (t, s)

def body():
    o = []
    o.append(kader('<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8pt;margin-bottom:2pt"><b style="font-family:var(--fd);font-size:11.5pt">Investering tegenover opbrengst</b><span class="klein">Zo zien we het in de cijfers van onze klanten</span></div>' + GRAFIEK, '', 'grijs'))
    o.append(drie(
        kader('<div class="groot" style="font-size:11.5pt">Twee posts per week om de feed te vullen</div>', 'Stopt', 'rood'),
        kader('<div class="groot" style="font-size:11.5pt">Adverteren bij mensen die je nog niet kennen, met SEO en e-mail</div>', 'Komt ervoor in de plaats', 'blauw'),
        kader('<div class="groot" style="font-size:11.5pt">Het beeld uit je campagnes delen we ook op je eigen kanalen</div>', 'Blijft', 'lime')))
    o.append(drie(
        winst('Meer nieuwe klanten', 'Elke euro gaat naar bereik, niet naar onderhoud.'),
        winst('Je ziet wat het oplevert', 'Per kanaal, tot op de aanvraag.'),
        winst('Geen poststress meer', 'Niemand hoeft nog te bedenken wat er online moet.')))
    o.append(kader('<p>We adverteren op Instagram en Facebook, bij mensen die je nog niet volgen. Dat zit in elk pakket. Wil je zelf blijven posten, dan maken we social-mediatemplates of een contentsessie als eigen project.</p><p><b>Mail support@jamesrobinson.nl.</b> Dringend? Bel kantoor: 045 792 0009.</p>', 'Social media blijft', 'blauw'))
    return ''.join(o)

DOCS = [dict(code='V.4', titel='We stoppen met posten', fase=FASE, voor='Klant', wanneer='Intakegesprek en voorstel', wie='Accountmanager',
  lead='Niet met social media. Je feed vullen kost het meeste en levert het minste op. Die tijd en dat geld zetten we in waar je nieuwe klanten zitten.', body=body())]
