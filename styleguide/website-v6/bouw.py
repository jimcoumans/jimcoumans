"""Bouwt ronde 6 tot één HTML-bestand: styleguide/paginas/website-v6.html.

    python3 styleguide/website-v6/bouw.py [testmap]

Logo's en beeldmerk komen uit ../website-bron/voor.js, zodat er één bron is.
"""
import os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
r = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
voor = open(os.path.join(D, '..', 'website-bron', 'voor.js'), encoding='utf-8').read()
logo = re.search(r'var LOGO=\{.*?\n\};', voor, re.S).group(0)
bm = re.search(r'function bm\(cls\)\{.*?\}\n', voor).group(0)
bm_svg = re.search(r"return '(<svg.*?</svg>)'", bm).group(1).replace("'+(cls||'')+'", '')
html = (r('kop.html') + '<style>' + r('stijl.css') + r('home7.css') + '</style>\n' + r('romp.html').replace('%BM%', bm_svg)
        + '<script>' + logo + '\n' + bm + r('app.js') + r('home7.js') + '</script>\n')
uit = os.path.join(D, '..', 'paginas', 'website-v6.html')
open(uit, 'w', encoding='utf-8').write(html)
print(os.path.normpath(uit), len(html))
if len(sys.argv) > 1:
    open(os.path.join(sys.argv[1], 'v6.html'), 'w', encoding='utf-8').write('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + html)
