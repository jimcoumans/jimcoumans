# -*- coding: utf-8 -*-
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CSS, JS
import part1, part2a, part2b, part2c, part2d, part3, part4

BAR = """<nav class="bar" aria-label="Hoofdstukken"><div class="bar-in"><b>De gids</b>
<a href="#overzicht">Overzicht</a><a href="#deel-1">Waar het om draait</a><a href="#wat-het-kost">Tarieven</a><a href="#spelregels">Spelregels</a><a href="#communicatie">Communicatie</a><a href="#het-merk">Merk</a>
<a href="#stap-01">01</a><a href="#stap-02">02</a><a href="#stap-03">03</a><a href="#stap-04">04</a><a href="#stap-05">05</a><a href="#stap-06">06</a><a href="#stap-07">07</a><a href="#stap-08">08</a>
<a href="#samenhang">Samenhang</a><a href="#open">Open</a><a href="#besluiten">Besluiten</a><a href="#deel-4">Designsysteem</a>
<button type="button" id="thema">Donker</button></div></nav>"""

HEAD = """<title>De James Robinson-gids</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Figtree:wght@600;700&display=swap">
<style>%s</style>
""" % CSS

body = (BAR + '<main>' + part1.P1 + part2a.DEEL2_OPEN + part3.FASE1 + part2a.STAP01 + part2a.STAP02 + part2b.P2B
        + part2c.P2C + part2d.P2D + part3.P3.replace('<footer class="voet">', part4.P4 + '<footer class="voet">') + '</main>' + JS)
html = HEAD + body
html = re.sub(r'€ (?=[\d±])', '€&nbsp;', html)
html = html.replace('<div class="pijl">→</div>', '<div class="pijl"><span class="ph">→</span><span class="pv">↓</span></div>')
html = re.sub(r'\$ (?=\d)', '$&nbsp;', html)
PROPER = ['James Robinson','Google Ads','Google','Meta','Webmix','ClickCease','Leadinfo','Calendly','MailerLite','Moneybird','ClickUp','WhatsApp','Front','LinkedIn','TikTok','Microsoft Ads','Microsoft','Bing','King Kong','Keyword Planner','Sub','Legend','Starter','Playmaker','Captain','Champion','Jim Coumans','Jim Kikken','Stan','Hulsberg','AI','CRO','SEO','B2B','GA4','CTR','DNS','CSV','A4','ARENA','CRM','Performance Review']
def sentence(t):
    letters=[c for c in t if c.isalpha()]
    if not letters or sum(c.isupper() for c in letters) < 0.8*len(letters): return t
    x=t.lower()
    for i,c in enumerate(x):
        if c.isdigit(): break
        if c.isalpha(): x=x[:i]+c.upper()+x[i+1:]; break
    for p in PROPER:
        x=re.sub(r'(?i)(?<![\w])'+re.escape(p)+r'(?![\w])', p, x)
    x=re.sub(r'(?<![\w])([a-d]) · ', lambda m: m.group(1).upper()+' · ', x)
    return x
LABELS = r'(<(span|div|td|b|i) class="(?:kick|vk|kl|sl|fk|fl|spill|chip [a-z]+|mt|sn|k|bt|bm|d)"[^>]*>)([^<]+)(</\2>)'
html = re.sub(LABELS, lambda m: m.group(1)+sentence(m.group(3))+m.group(4), html)
html = re.sub(r'(<tr class="grp"><td[^>]*>)([^<]+)(</td>)', lambda m: m.group(1)+sentence(m.group(2))+m.group(3), html)
def _klok(m):
    return re.sub(r'(<span[^>]*>)([^<]+)(</span>)', lambda n: n.group(1)+sentence(n.group(2))+n.group(3), m.group(0))
html = re.sub(r'<div class="klok">.*?</div>', _klok, html, flags=re.S)
html = re.sub(r'(<span class="chip [a-z]+">)([^<]+)(</span>)', lambda m: m.group(1)+sentence(m.group(2))+m.group(3), html)
out = sys.argv[1] if len(sys.argv) > 1 else '/home/user/jimcoumans/styleguide/paginas/gids.html'
open(out, 'w').write(html)
print(out, len(html))
