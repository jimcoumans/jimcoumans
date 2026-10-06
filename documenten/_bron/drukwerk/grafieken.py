# -*- coding: utf-8 -*-
# Grafieken voor het magazine als losse SVG's: dunne lijnen, één as, labels direct bij de lijn.
# Alles is illustratief en staat er ook zo bij; het zijn geen meetgegevens.

BLAUW = '#007aff'
ORANJE = '#c96f00'
INKT = '#1c1c1e'
GRIJS = '#86868b'
LIJN = '#e5e5e9'
FONT = "font-family=\"Inter, 'Helvetica Neue', Arial, sans-serif\""


def _pad(punten, b, h, xmax, ymax, x0=0, y0=0):
    return ' '.join('%s%.1f,%.1f' % ('M' if i == 0 else 'L', x0 + x / xmax * b, y0 + h - y / ymax * h) for i, (x, y) in enumerate(punten))


def lijnen(series, b=160, h=78, xmax=12, ymax=100, xlabels=None, ylabel='', donker=False):
    """series: [(naam, kleur, [(x, y), ...], streep, labelpositie)]. Maten in mm."""
    tekst = '#fff' if donker else INKT
    sub = 'rgba(255,255,255,.65)' if donker else GRIJS
    rooster = 'rgba(255,255,255,.18)' if donker else LIJN
    L, T, R, B = 8, 4, 30, 9
    W, H = b + L + R, h + T + B
    s = ['<svg viewBox="0 0 %.1f %.1f" width="%.1fmm" height="%.1fmm" %s>' % (W, H, W, H, FONT)]
    for f in (0, .5, 1):
        y = T + h - f * h
        s.append('<line x1="%d" x2="%.1f" y1="%.1f" y2="%.1f" stroke="%s" stroke-width=".25"/>' % (L, L + b, y, y, rooster))
    s.append('<line x1="%d" x2="%.1f" y1="%.1f" y2="%.1f" stroke="%s" stroke-width=".35"/>' % (L, L + b, T + h, T + h, sub))
    if ylabel:
        s.append('<text x="%d" y="%.1f" font-size="2.6" fill="%s">%s</text>' % (L, T - 1.2, sub, ylabel))
    for (x, t) in (xlabels or []):
        s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s" text-anchor="middle">%s</text>' % (L + x / xmax * b, T + h + 5, sub, t))
    for naam, kleur, punten, streep, dy in series:
        s.append('<path d="%s" fill="none" stroke="%s" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round" %s/>' % (
            _pad(punten, b, h, xmax, ymax, L, T), kleur, 'stroke-dasharray="1.6 1.2"' if streep else ''))
        x, y = punten[-1]
        s.append('<circle cx="%.1f" cy="%.1f" r="1" fill="%s"/>' % (L + x / xmax * b, T + h - y / ymax * h, kleur))
        s.append('<text x="%.1f" y="%.1f" font-size="3" font-weight="600" fill="%s">%s</text>' % (L + x / xmax * b + 2.2, T + h - y / ymax * h + 1 + dy, tekst, naam))
    s.append('</svg>')
    return ''.join(s)


def staven(rijen, b=150, rij=11, max_=None, donker=False, eenheid=''):
    """Horizontale staven: [(label, waarde, kleur, toelichting)]."""
    tekst = '#fff' if donker else INKT
    sub = 'rgba(255,255,255,.65)' if donker else GRIJS
    max_ = max_ or max(r[1] for r in rijen)
    L = 46
    W, H = L + b + 26, rij * len(rijen)
    s = ['<svg viewBox="0 0 %.1f %.1f" width="%.1fmm" height="%.1fmm" %s>' % (W, H, W, H, FONT)]
    for i, (label, w, kleur, toel) in enumerate(rijen):
        y = i * rij
        breed = max(w / max_ * b, .8)
        s.append('<text x="0" y="%.1f" font-size="3" font-weight="600" fill="%s">%s</text>' % (y + 4.2, tekst, label))
        if toel:
            s.append('<text x="0" y="%.1f" font-size="2.4" fill="%s">%s</text>' % (y + 7.6, sub, toel))
        s.append('<rect x="%d" y="%.1f" width="%.1f" height="5" rx="1" fill="%s"/>' % (L, y + 1.2, breed, kleur))
        s.append('<text x="%.1f" y="%.1f" font-size="3" font-weight="600" fill="%s">%s</text>' % (L + breed + 2, y + 5, tekst, ('{:,.0f}'.format(w).replace(',', '.')) + eenheid))
    s.append('</svg>')
    return ''.join(s)


def groeicurve(donker=False):
    """Eerst vlak, dan versnelling; de band laat zien dat het omslagpunt per klant verschilt."""
    import math
    def curve(k):
        return [(m / 4, 4 + 92 / (1 + math.exp(-(m / 4 - k) * 1.25))) for m in range(0, 49)]
    vroeg, laat, midden = curve(3.2), curve(7.2), curve(5)
    tekst = '#fff' if donker else INKT
    sub = GRIJS
    b, h, L, T = 160, 72, 8, 6
    W, H = b + L + 32, h + T + 10
    pv = ' '.join('%.1f,%.1f' % (L + x / 12 * b, T + h - y / 100 * h) for x, y in vroeg)
    pl = ' '.join('%.1f,%.1f' % (L + x / 12 * b, T + h - y / 100 * h) for x, y in reversed(laat))
    s = ['<svg viewBox="0 0 %.1f %.1f" width="%.1fmm" height="%.1fmm" %s>' % (W, H, W, H, FONT),
         '<polygon points="%s %s" fill="%s" opacity=".12"/>' % (pv, pl, BLAUW),
         '<line x1="%d" x2="%.1f" y1="%.1f" y2="%.1f" stroke="%s" stroke-width=".35"/>' % (L, L + b, T + h, T + h, sub),
         '<path d="%s" fill="none" stroke="%s" stroke-width=".9" stroke-linecap="round"/>' % (_pad(midden, b, h, 12, 100, L, T), BLAUW)]
    for m in (0, 3, 6, 9, 12):
        s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s" text-anchor="middle">maand %d</text>' % (L + m / 12 * b, T + h + 5.5, sub, m))
    s.append('<text x="%.1f" y="%.1f" font-size="3" font-weight="600" fill="%s">Resultaat</text>' % (L + b + 2.2, T + h - 96 / 100 * h + 1, tekst))
    s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s">Het omslagpunt verschilt per bedrijf</text>' % (L + 3.4 / 12 * b, T + h - 70 / 100 * h, sub))
    s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s">Leren: tijd, geld en data</text>' % (L + 2, T + h - 12 / 100 * h, sub))
    s.append('</svg>')
    return ''.join(s)


def jcurve():
    """Cumulatief: eerst investeren, dan verdienen. Nullijn = terugverdiend."""
    import math
    pts = []
    for m in range(0, 13):
        inv = 6 + 4 * m
        opbr = 0 if m < 2 else 52 / (1 + math.exp(-(m - 6.5) * .75)) * (m / 12 + .4) + 2 * (m - 2)
        pts.append((m, opbr - inv))
    lo, hi = -40, 60
    b, h, L, T = 160, 70, 14, 5
    W, H = b + L + 34, h + T + 10
    y = lambda v: T + h - (v - lo) / (hi - lo) * h
    s = ['<svg viewBox="0 0 %.1f %.1f" width="%.1fmm" height="%.1fmm" %s>' % (W, H, W, H, FONT),
         '<line x1="%d" x2="%.1f" y1="%.1f" y2="%.1f" stroke="%s" stroke-width=".4"/>' % (L, L + b, y(0), y(0), INKT),
         '<text x="%d" y="%.1f" font-size="2.6" fill="%s" text-anchor="end">€ 0</text>' % (L - 2, y(0) + 1, GRIJS)]
    d = ' '.join('%s%.1f,%.1f' % ('M' if i == 0 else 'L', L + m / 12 * b, y(v)) for i, (m, v) in enumerate(pts))
    s.append('<path d="%s" fill="none" stroke="%s" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round"/>' % (d, BLAUW))
    for m in (0, 3, 6, 9, 12):
        s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s" text-anchor="middle">maand %d</text>' % (L + m / 12 * b, T + h + 5.5, GRIJS, m))
    s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s">Investering ligt aan de voorkant</text>' % (L + 2, y(-30), GRIJS))
    s.append('<text x="%.1f" y="%.1f" font-size="2.6" fill="%s" text-anchor="end">Opbrengst komt aan de achterkant</text>' % (L + b - 2, y(46), GRIJS))
    s.append('<text x="%.1f" y="%.1f" font-size="3" font-weight="600" fill="%s">Resultaat</text>' % (L + b + 2.2, y(pts[-1][1]) + 1, INKT))
    s.append('</svg>')
    return ''.join(s)
