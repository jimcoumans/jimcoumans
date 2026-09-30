# -*- coding: utf-8 -*-
# Deel 4: het volledige designsysteem v3.0, ingebed uit styleguide/styleguide-preview.html.
# De stijlen van het designsysteem gelden alleen binnen .ds, zodat ze de rest van de gids niet raken.
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'styleguide-preview.html')


def _split_selectors(sel):
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out if x.strip()]


def _scope_selector(sel):
    for pre in (':root:not([data-theme="light"])', ':root:not([data-theme="dark"])', ':root[data-theme="dark"]', ':root[data-theme="light"]'):
        if sel.startswith(pre):
            rest = sel[len(pre):].strip()
            return (pre + ' .ds' + (' ' + rest if rest else ''))
    if sel == ':root' or sel in ('html', 'body', 'html body'):
        return '.ds'
    if sel.startswith(':root '):
        return '.ds ' + sel[6:]
    if sel.startswith('html ') or sel.startswith('body '):
        return '.ds ' + sel.split(' ', 1)[1]
    return '.ds ' + sel


def scope_css(css):
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0:
            out.append(css[i:]); break
        head = css[i:j].strip()
        # zoek het bijbehorende sluitende haakje
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        if head.startswith('@media') or head.startswith('@supports'):
            out.append('%s{%s}' % (head, scope_css(body)))
        elif head.startswith('@'):
            out.append('%s{%s}' % (head, body))
        else:
            # commentaar voor de selector bewaren we niet
            head = re.sub(r'/\*.*?\*/', '', head, flags=re.S).strip()
            sels = ', '.join(_scope_selector(s) for s in _split_selectors(head))
            out.append('%s{%s}' % (sels, body))
        i = k
    return '\n'.join(out)


def build():
    s = open(SRC).read()
    css = re.findall(r'<style[^>]*>(.*?)</style>', s, flags=re.S)[0]
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    scoped = scope_css(css)
    start = s.index('<header class="wrap hero">')
    end = s.index('<footer class="wrap foot">')
    inner = s[start:end]
    toast = '<div class="toast" id="toast">Gekopieerd</div>'
    script = re.findall(r'<script[^>]*>(.*?)</script>', s, flags=re.S)[0]
    # de themaknop van de gids is leidend; die van het designsysteem vervalt
    script = re.sub(r"var root = document\.documentElement, btn = document\.getElementById\('themeBtn'\);.*?addEventListener\('change', sync\);", '', script, flags=re.S)
    toc_items = re.findall(r'<a href="#([a-z]+)">([^<]+)</a>', s[s.index('<nav class="nav">'):s.index('</nav>')])
    toc = ''.join('<a href="#%s">%s</a>' % (a, t) for a, t in toc_items)
    opener = """
<section class="deel" id="deel-4"><div class="wrap">
<span class="kick">Deel 4</span>
<h2>Het designsysteem</h2>
<p>Het volledige designsysteem v3.0, zoals het in de repository staat en leidend is voor alles wat de klant van ons ziet: pagina-opbouw, kleurtrappen, typografie, ruimte, knoppen, componenten, beeld, tone of voice, diensten, SEO en merk, buiten het scherm, en microcopy. Met de exacte waarden om in Elementor mee te bouwen. Klik op een kleur om de code te kopiëren.</p>
<div class="dstoc">%s</div>
</div></section>
""" % toc
    css_extra = """
.dstoc{display:flex;flex-wrap:wrap;gap:6px;margin-top:22px}
.dstoc a{font-size:14px;color:var(--inv);text-decoration:none;border:1px solid #3a3a3c;border-radius:980px;padding:5px 12px}
.dstoc a:hover{border-color:var(--lime);color:var(--lime)}
.ds{background:var(--bg);color:var(--tx);font-family:var(--f-text);font-size:17px;line-height:1.55}
"""
    html = opener + '<div class="ds">' + inner + toast + '</div><script>' + script + '</script>'
    return '<style>' + css_extra + scoped + '</style>' + html


P4 = build()
