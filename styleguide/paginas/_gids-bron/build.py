# -*- coding: utf-8 -*-
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import CSS, JS
import part1, part2a, part2b, part2c, part2d, part3

BAR = """<nav class="bar" aria-label="Hoofdstukken"><div class="bar-in"><b>De gids</b>
<a href="#overzicht">Overzicht</a><a href="#deel-1">Waar het om draait</a><a href="#wat-het-kost">Tarieven</a><a href="#spelregels">Spelregels</a><a href="#communicatie">Communicatie</a><a href="#het-merk">Merk</a>
<a href="#stap-01">01</a><a href="#stap-02">02</a><a href="#stap-03">03</a><a href="#stap-04">04</a><a href="#stap-05">05</a><a href="#stap-06">06</a><a href="#stap-07">07</a><a href="#stap-08">08</a>
<a href="#samenhang">Samenhang</a><a href="#open">Open</a><a href="#besluiten">Besluiten</a>
<button type="button" id="thema">Donker</button></div></nav>"""

HEAD = """<title>De James Robinson-gids</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@600;700&display=swap">
<style>%s</style>
""" % CSS

body = (BAR + '<main>' + part1.P1 + part2a.DEEL2_OPEN + part3.FASE1 + part2a.STAP01 + part2a.STAP02 + part2b.P2B
        + part2c.P2C + part2d.P2D + part3.P3 + '</main>' + JS)
html = HEAD + body
html = re.sub(r'€ (?=[\d±])', '€&nbsp;', html)
html = html.replace('<div class="pijl">→</div>', '<div class="pijl"><span class="ph">→</span><span class="pv">↓</span></div>')
html = re.sub(r'\$ (?=\d)', '$&nbsp;', html)
out = sys.argv[1] if len(sys.argv) > 1 else '/home/user/jimcoumans/styleguide/paginas/gids.html'
open(out, 'w').write(html)
print(out, len(html))
