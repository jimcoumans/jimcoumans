# -*- coding: utf-8 -*-
# Bouwt documenten/documentenmap.html: alle documenten op één webpagina, om op scherm te lezen (ook op de telefoon).
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import base, build

GROEP = {'1 Verkopen': 'Verkopen', '2 Starten': 'Starten', '3 Samenwerken': 'Samenwerken', '4 Verkoopondersteuning': 'Verkoopondersteuning', '5 Intern': 'Intern', '6 Klanten': 'Klanten'}

docs = build.laad()
docs.sort(key=lambda d: (build.map_voor(d['code']), d['code']))
css = re.sub(r'@font-face\{[^}]*\}', '', base.CSS)
css = re.sub(r'@page\{[^}]*\}', '', css)
scherm = """
body{background:#ebebf0;font-size:10pt;padding:0 16px}
.top{max-width:210mm;margin:24px auto 0;padding:22px 24px;background:#1c1c1e;color:#f5f5f7;border-radius:12px}
.top h1{color:#fff;font-size:26pt;margin:4px 0 6px}.top .eyebrow{color:#c4f000}.top p{color:#a1a1a6;margin:0}
.idx{max-width:210mm;margin:16px auto;background:#fff;border-radius:12px;padding:18px 24px}
.idx h2{margin:14px 0 6px;font-size:12pt}.idx h2:first-child{margin-top:0}
.idx a{display:grid;grid-template-columns:62px 1fr auto;gap:8px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--ln-soft);color:var(--tx);text-decoration:none}
.idx a:hover b{color:var(--blue-link)} .idx a span{font-size:8.5pt;color:var(--tx2)} .idx a em{font-style:normal;font-weight:600;color:var(--blue-link);font-size:9pt}
.doc{max-width:210mm;margin:16px auto;background:#fff;border-radius:12px;padding:14mm 14mm 12mm;scroll-margin-top:12px}
.terug{float:right;font-size:8.5pt;color:var(--blue-link);text-decoration:none;margin-left:12px}
.tw{overflow-x:auto;margin:4pt 0 10pt}.tw table{margin:0}
.nieuwe-pagina{height:0;border-top:1px dashed var(--ln);margin:16pt 0}
.voet{max-width:210mm;margin:0 auto 32px;font-size:8.5pt;color:var(--tx2);text-align:center}
@media (max-width:700px){
 body{padding:0 10px}.doc{padding:18px 16px}.idx,.top{padding:16px}
 .meta{grid-template-columns:1fr 1fr}.meta div:nth-child(2){border-right:none}.meta div:nth-child(-n+2){border-bottom:1px solid var(--ln-soft)}
 .twee,.drie,.handtekening{grid-template-columns:1fr}.vakken{grid-template-columns:1fr!important}
 h1{font-size:20pt}.veld{grid-template-columns:1fr}
 .idx a{grid-template-columns:54px 1fr}.idx a span{grid-column:2}
 .doc [style*="grid-template-columns"]{grid-template-columns:1fr!important}
 .doc .vraag>div,.doc .twee>*,.doc .drie>*,.doc .kader{min-width:0}
 .doc .opt{white-space:normal}
 .doc [style*="nowrap"]{white-space:normal!important}
 .doc [style*="display:flex"]{flex-wrap:wrap}
 .doc{overflow-wrap:anywhere}
 .doc [style*="width:"][style*="mm"]{max-width:100%}
 .doc .tw table{min-width:520px}
 .doc .tw table.vt{min-width:0}
 .doc table.vt th,.doc table.vt td{display:block;width:auto!important;border-bottom:none}
 .doc table.vt tr{display:block;border-bottom:1px solid var(--ln-soft);padding:4px 0}
 .doc .code{white-space:nowrap}
}
"""
idx, secties, huidig = [], [], None
for d in docs:
    m = build.map_voor(d['code']) or 'Overzicht'
    if m != huidig:
        idx.append('<h2>%s</h2>' % GROEP.get(m, m)); huidig = m
    anker = d['code'].replace('.', '-')
    idx.append('<a href="#d%s"><em>%s</em><b>%s%s</b><span>%s · %s</span></a>' % (anker, d['code'], d['titel'], ' ' + base.chip('concept', 'oranje') if d.get('concept') else '', d['voor'], d['wanneer']))
    h = base.pagina(d)
    body = re.search(r'<body class="([^"]+)">(.*)</body>', h, re.S)
    inhoud = re.sub(r'<table(\s[^>]*)?>', lambda m: '<div class="tw">' + m.group(0), body.group(2)).replace('</table>', '</table></div>')
    inhoud = inhoud.replace('<div class="kop">', '<a class="terug" href="#overzicht">Naar het overzicht</a><div class="kop">', 1)
    secties.append('<section class="doc %s" id="d%s">%s</section>' % (body.group(1), anker, inhoud))

html = """<title>Documentenmap</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700&display=swap">
<style>:root{color-scheme:light}%s%s</style>
<header class="top" id="overzicht"><div class="eyebrow">James Robinson</div><h1>Documentenmap</h1><p>Alle formulieren, draaiboeken, mailteksten, klantdocumenten en briefings, in de volgorde van de klantreis. Klik op een document om het te lezen. Om te printen staan dezelfde documenten als PDF in de repository.</p></header>
<nav class="idx">%s</nav>
%s
<p class="voet">James Robinson · Marketing &amp; Branding · %s</p>
""" % (css, scherm, ''.join(idx), ''.join(secties), base.VERSIE)
out = os.path.join(os.path.dirname(HERE), 'documentenmap.html')
open(out, 'w').write(html)
print(out, len(html), len(docs))
