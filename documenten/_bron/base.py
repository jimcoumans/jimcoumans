# -*- coding: utf-8 -*-
# Bouwstenen voor de losse documenten van James Robinson: A4, designsysteem v3.0, om te printen en met de hand in te vullen.
import html as _html

VERSIE = 'Versie 1.0 · oktober 2026'

CSS = r"""
@font-face{font-family:'Inter';font-weight:100 900;font-style:normal;src:url('../fonts/Inter.woff2') format('woff2')}
@font-face{font-family:'Inter Tight';font-weight:100 900;font-style:normal;src:url('../fonts/InterTight.woff2') format('woff2')}
:root{
  --tx:#1d1d1f; --tx2:#6e6e73; --tx3:#86868b; --ln:#d2d2d7; --ln-soft:#e5e5e9;
  --bg-alt:#f5f5f7; --blue:#007aff; --blue-link:#0066cc; --blue-100:#e0efff; --blue-tint:#e2ebf3;
  --lime:#c4f000; --lime-text:#5a7000; --lime-100:#f2fccc;
  --green-tx:#1d7d3f; --green-100:#e6f7eb; --orange-tx:#94590a; --orange-100:#fef2e0;
  --red-tx:#c02a22; --red-100:#fdecea; --black:#1c1c1e;
  --fd:'Inter Tight','Inter','Helvetica Neue',Helvetica,Arial,sans-serif;
  --ft:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;
}
@page{size:A4;margin:16mm 16mm 18mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#fff;color:var(--tx);font-family:var(--ft);font-size:9.6pt;line-height:1.45;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--fd);margin:0;text-wrap:balance;color:var(--tx)}
p{margin:0 0 7pt}
b,strong{font-weight:600}
.kop{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--ln-soft);padding-bottom:9pt;margin-bottom:16pt}
.merk{font-family:var(--fd);font-weight:700;font-size:11pt;letter-spacing:-.01em}
.merk small{font-family:var(--ft);font-weight:400;color:var(--tx2);font-size:8pt;margin-left:6pt}
.code{font-size:8pt;font-weight:600;color:var(--blue-link);background:var(--blue-100);border-radius:980px;padding:3pt 9pt}
.eyebrow{font-size:9pt;font-weight:600;color:var(--blue-link);margin-bottom:4pt}
h1{font-size:24pt;font-weight:700;line-height:1.08;letter-spacing:-.022em;margin-bottom:8pt}
.lead{font-size:11.5pt;line-height:1.4;color:var(--tx2);max-width:150mm;margin-bottom:12pt}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--ln-soft);border-radius:8pt;margin-bottom:18pt;overflow:hidden}
.meta div{padding:7pt 10pt;border-right:1px solid var(--ln-soft)}
.meta div:last-child{border-right:none}
.meta span{display:block;font-size:7.5pt;color:var(--tx2);margin-bottom:1pt}
.meta b{font-size:8.8pt;font-weight:600}
.voor-klant .meta div:first-child b{color:var(--green-tx)}
.voor-intern .meta div:first-child b{color:var(--orange-tx)}
h2{font-size:14pt;font-weight:600;letter-spacing:-.01em;margin:18pt 0 7pt;break-after:avoid}
h3{font-size:11pt;font-weight:600;margin:13pt 0 5pt;break-after:avoid}
h2:first-child,h3:first-child{margin-top:0}
.sub{color:var(--tx2)}
ul,ol{margin:0 0 8pt;padding-left:15pt} li{margin-bottom:3pt}
/* tabellen */
table{width:100%;border-collapse:collapse;margin:4pt 0 10pt;font-size:8.8pt}
th{font-weight:500;color:var(--tx2);text-align:left;font-size:8pt;padding:5pt 6pt;border-bottom:1px solid var(--ln)}
td{padding:5pt 6pt;border-bottom:1px solid var(--ln-soft);vertical-align:top}
tr{break-inside:avoid}
td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}
tr.grp td{background:var(--bg-alt);font-weight:600;font-size:8.3pt;color:var(--tx2)}
tr.tot td{font-weight:600;border-top:1px solid var(--tx);border-bottom:none}
/* kaders */
.kader{border-radius:8pt;padding:10pt 12pt;margin:8pt 0 12pt;break-inside:avoid}
.kader .kl{display:block;font-size:8pt;font-weight:600;margin-bottom:3pt}
.kader p:last-child,.kader ul:last-child{margin-bottom:0}
.k-blauw{background:var(--blue-tint)} .k-blauw .kl{color:var(--blue-link)}
.k-lime{background:var(--lime-100)} .k-lime .kl{color:var(--lime-text)}
.k-rood{background:var(--red-100)} .k-rood .kl{color:var(--red-tx)}
.k-oranje{background:var(--orange-100)} .k-oranje .kl{color:var(--orange-tx)}
.k-groen{background:var(--green-100)} .k-groen .kl{color:var(--green-tx)}
.k-grijs{background:var(--bg-alt)} .k-grijs .kl{color:var(--tx2)}
.k-zwart{background:var(--black);color:#f5f5f7} .k-zwart .kl{color:var(--lime)} .k-zwart b{color:#fff}
.groot{font-family:var(--fd);font-size:13pt;font-weight:700;line-height:1.25;margin-bottom:5pt}
/* invullen */
.vraag{display:grid;grid-template-columns:18pt 1fr;gap:0 6pt;padding:8pt 0 9pt;border-bottom:1px solid var(--ln-soft);break-inside:avoid}
.vraag .nr{font-family:var(--fd);font-weight:700;font-size:10pt;color:var(--blue)}
.vraag .q{font-weight:600}
.vraag .q .verplicht{display:inline-block;font-size:7pt;font-weight:600;color:var(--red-tx);background:var(--red-100);border-radius:980px;padding:1pt 6pt;margin-left:5pt;vertical-align:1pt}
.vraag .hulp{color:var(--tx2);font-size:8.3pt;margin-top:1pt}
.regels{margin-top:4pt}
.regel{height:17pt;border-bottom:1px solid var(--ln)}
.opties{display:flex;flex-wrap:wrap;gap:4pt 14pt;margin-top:5pt}
.opt{display:inline-flex;align-items:center;gap:5pt;font-size:8.8pt}
.opt::before{content:'';width:8pt;height:8pt;border:1px solid var(--tx2);border-radius:2pt;flex:none}
.veld{display:grid;grid-template-columns:42mm 1fr;gap:6pt;align-items:end;padding:5pt 0}
.veld span{font-size:8.5pt;color:var(--tx2)}
.veld i{display:block;border-bottom:1px solid var(--ln);height:15pt}
.vakken{display:grid;gap:6pt;margin:4pt 0 10pt}
.vak{border:1px solid var(--ln);border-radius:6pt;padding:6pt 8pt;break-inside:avoid}
.vak span{display:block;font-size:8pt;color:var(--tx2);font-weight:500}
.check{display:grid;grid-template-columns:12pt 1fr auto;gap:4pt 6pt;padding:4pt 0;border-bottom:1px solid var(--ln-soft);break-inside:avoid;align-items:start}
.check::before{content:'';width:8pt;height:8pt;border:1px solid var(--tx2);border-radius:2pt;margin-top:2.5pt}
.check em{font-style:normal;font-size:8pt;color:var(--tx2);white-space:nowrap}
/* mail en script */
.mail{border:1px solid var(--ln);border-radius:8pt;margin:8pt 0 14pt;break-inside:avoid;overflow:hidden}
.mail .mh{background:var(--bg-alt);padding:6pt 10pt;font-size:8.3pt;color:var(--tx2);border-bottom:1px solid var(--ln-soft)}
.mail .mh b{color:var(--tx)}
.mail .mb{padding:9pt 11pt}
.vv{background:var(--lime-100);border-radius:3pt;padding:0 2pt}
.zin{border-left:3px solid var(--blue);padding:2pt 0 2pt 9pt;margin:5pt 0 8pt;font-style:normal}
.blok{border:1px solid var(--ln-soft);border-radius:8pt;padding:10pt 12pt;margin:8pt 0 10pt;break-inside:avoid-page}
.blok .bh{display:flex;justify-content:space-between;align-items:baseline;gap:8pt;margin-bottom:4pt}
.blok .bh b{font-family:var(--fd);font-size:11pt}
.blok .bh span{font-size:8pt;font-weight:600;color:var(--blue-link);background:var(--blue-100);border-radius:980px;padding:2pt 8pt;white-space:nowrap}
.chip{display:inline-block;font-size:7.5pt;font-weight:600;border-radius:980px;padding:1pt 7pt}
.c-groen{background:var(--green-100);color:var(--green-tx)} .c-oranje{background:var(--orange-100);color:var(--orange-tx)} .c-rood{background:var(--red-100);color:var(--red-tx)} .c-blauw{background:var(--blue-100);color:var(--blue-link)}
.twee{display:grid;grid-template-columns:1fr 1fr;gap:10pt}
.drie{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8pt}
.twee>*,.drie>*{min-width:0}
.nieuwe-pagina{break-before:page}
.klein{font-size:8.3pt;color:var(--tx2)}
.handtekening{display:grid;grid-template-columns:1fr 1fr;gap:20pt;margin-top:18pt}
.handtekening div{border-top:1px solid var(--tx);padding-top:4pt;font-size:8.3pt;color:var(--tx2)}
"""

def e(t):
    return _html.escape(t, quote=False)

# ---------- bouwstenen ----------
def h2(t): return '<h2>%s</h2>' % t
def h3(t): return '<h3>%s</h3>' % t
def p(t, cls=''): return '<p%s>%s</p>' % (' class="%s"' % cls if cls else '', t)
def ul(items): return '<ul>%s</ul>' % ''.join('<li>%s</li>' % i for i in items)
def ol(items): return '<ol>%s</ol>' % ''.join('<li>%s</li>' % i for i in items)

def tabel(kop, rijen, rechts=()):
    """rijen: lijst van lijsten; ('grp', 'tekst') voor een groepsregel; ('tot', [..]) voor een totaalregel."""
    n = len(kop)
    th = ''.join('<th%s>%s</th>' % (' class="r"' if i in rechts else '', k) for i, k in enumerate(kop))
    out = []
    for r in rijen:
        if isinstance(r, tuple) and r[0] == 'grp':
            out.append('<tr class="grp"><td colspan="%d">%s</td></tr>' % (n, r[1])); continue
        cls = ''
        if isinstance(r, tuple) and r[0] == 'tot':
            cls, r = ' class="tot"', r[1]
        out.append('<tr%s>%s</tr>' % (cls, ''.join('<td%s>%s</td>' % (' class="r"' if i in rechts else '', c) for i, c in enumerate(r))))
    return '<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (th, ''.join(out))

def kader(inhoud, label='', kleur='blauw', groot=''):
    return '<div class="kader k-%s">%s%s%s</div>' % (kleur, '<span class="kl">%s</span>' % label if label else '', '<div class="groot">%s</div>' % groot if groot else '', inhoud)

def vraag(nr, tekst, hulp='', regels=2, opties=None, verplicht=False):
    """Een vraag om met de hand in te vullen: lijnen en/of aankruisvakjes."""
    q = tekst + ('<span class="verplicht">verplicht</span>' if verplicht else '')
    body = '<div class="q">%s</div>' % q
    if hulp: body += '<div class="hulp">%s</div>' % hulp
    if opties: body += '<div class="opties">%s</div>' % ''.join('<span class="opt">%s</span>' % o for o in opties)
    if regels: body += '<div class="regels">%s</div>' % ('<div class="regel"></div>' * regels)
    return '<div class="vraag"><div class="nr">%s</div><div>%s</div></div>' % (nr, body)

def velden(labels):
    return ''.join('<div class="veld"><span>%s</span><i></i></div>' % l for l in labels)

def vakken(labels, kolommen=2, hoogte=46):
    return '<div class="vakken" style="grid-template-columns:repeat(%d,1fr)">%s</div>' % (kolommen, ''.join('<div class="vak" style="min-height:%dpt"><span>%s</span></div>' % (hoogte, l) for l in labels))

def checklist(items):
    """items: tekst of (tekst, wie)."""
    out = []
    for i in items:
        t, w = (i if isinstance(i, tuple) else (i, ''))
        out.append('<div class="check"><span>%s</span><em>%s</em></div>' % (t, w))
    return ''.join(out)

def mail(wanneer, onderwerp, body, van='support@jamesrobinson.nl'):
    return '<div class="mail"><div class="mh"><b>%s</b> · van %s<br>Onderwerp: <b>%s</b></div><div class="mb">%s</div></div>' % (wanneer, van, onderwerp, body)

def zin(t): return '<div class="zin">%s</div>' % t

def blok(titel, tijd, inhoud):
    return '<div class="blok"><div class="bh"><b>%s</b><span>%s</span></div>%s</div>' % (titel, tijd, inhoud)

def chip(t, kleur='blauw'): return '<span class="chip c-%s">%s</span>' % (kleur, t)
def vv(t): return '<span class="vv">%s</span>' % t
def twee(a, b): return '<div class="twee"><div>%s</div><div>%s</div></div>' % (a, b)
def drie(a, b, c): return '<div class="drie"><div>%s</div><div>%s</div><div>%s</div></div>' % (a, b, c)
def handtekening(a='Naam en datum', b='Handtekening'): return '<div class="handtekening"><div>%s</div><div>%s</div></div>' % (a, b)
NIEUWE_PAGINA = '<div class="nieuwe-pagina"></div>'

def pagina(doc):
    """doc: dict met code, titel, fase, voor ('Klant' of 'Intern'), wanneer, wie, lead, body; optioneel concept=True."""
    voor = doc['voor']
    cls = 'voor-klant' if voor.lower().startswith('klant') else 'voor-intern'
    return """<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>%(code)s %(titel)s</title><style>%(css)s</style></head>
<body class="%(cls)s">
<div class="kop"><div class="merk">James Robinson<small>Marketing &amp; Branding</small></div><div class="code">%(code)s</div></div>
<div class="eyebrow">%(fase)s</div>
<h1>%(titel)s</h1>
<p class="lead">%(lead)s</p>
<div class="meta"><div><span>Voor</span><b>%(voor)s</b></div><div><span>Wanneer</span><b>%(wanneer)s</b></div><div><span>Wie</span><b>%(wie)s</b></div><div><span>Versie</span><b>%(versie)s</b></div></div>
%(body)s
</body></html>""" % dict(doc, css=CSS, cls=cls, versie=VERSIE.replace('Versie ', '') + (' · concept' if doc.get('concept') else ''))
