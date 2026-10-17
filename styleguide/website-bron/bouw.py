"""Bouwt het website-ontwerp tot één HTML-bestand.

    python3 styleguide/website-bron/bouw.py [testmap]

Schrijft styleguide/paginas/website-ontwerp.html. Met een testmap erbij ook
een test.html met lokale lettertypen (voor screenshots zonder internet).
"""
import os, sys
D = os.path.dirname(os.path.abspath(__file__))
r = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
html = r('kop.html') + '<style>' + r('stijl.css') + r('klant.css') + '</style>\n<script>' + r('voor.js') + r('home.js') + r('na.js') + '</script>\n'
uit = os.path.join(D, '..', 'paginas', 'website-ontwerp.html')
open(uit, 'w', encoding='utf-8').write(html)
print(os.path.normpath(uit), len(html))
if len(sys.argv) > 1:
    t = sys.argv[1]
    ff = "<style>@font-face{font-family:Figtree;src:url('file://%s/figtree.woff2') format('woff2');font-weight:300 900}@font-face{font-family:Inter;src:url('file://%s/inter.woff2') format('woff2');font-weight:100 900}</style>\n" % (t, t)
    open(os.path.join(t, 'test.html'), 'w', encoding='utf-8').write(ff + html)
