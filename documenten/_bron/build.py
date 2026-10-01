# -*- coding: utf-8 -*-
# Bouwt alle documenten: HTML in _bron/html, PDF in documenten/ (per map), met kop- en voetregel per pagina.
import os, sys, json, glob, importlib.util, subprocess, re
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import base

def map_voor(code):
    if code.startswith('V'): return '4 Verkoopondersteuning'
    if code.startswith('I'): return '5 Intern'
    if code.startswith('00'): return ''
    n = int(code[:2])
    return '1 Verkopen' if n <= 4 else '2 Starten' if n <= 7 else '3 Samenwerken'

def laad():
    docs = []
    for f in sorted(glob.glob(os.path.join(HERE, 'docs', '*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        docs += m.DOCS
    return docs

def overzicht(docs):
    rijen, huidig = [], None
    for d in sorted(docs, key=lambda d: (map_voor(d['code']), d['code'])):
        m = map_voor(d['code'])
        if m != huidig:
            rijen.append(('grp', m[2:])); huidig = m
        rijen.append(['<b>%s</b>' % d['code'], d['titel'] + (' ' + base.chip('concept', 'oranje') if d.get('concept') else ''), d['voor'], d['wanneer'], d['wie']])
    body = base.kader('<p>Elk document heeft een code. De eerste twee cijfers zijn de stap in de klantreis (01 tot en met 08), V is verkoopondersteuning, I is intern. Documenten met het label concept bevatten tekst die nog niet in de gids stond: lees die eerst na voordat je ze gebruikt.</p><p>De gids is leidend. Verandert er iets, dan eerst in de gids, daarna hier.</p>', 'Zo lees je dit overzicht', 'blauw') + base.tabel(['Code', 'Document', 'Voor', 'Wanneer', 'Wie'], rijen)
    return dict(code='00', titel='Overzicht documenten', fase='James Robinson · Alle documenten', voor='Intern', wanneer='Altijd', wie='Iedereen',
                lead='Alle formulieren, draaiboeken, mailteksten en klantdocumenten op een rij, in de volgorde van de klantreis. %d documenten.' % len(docs), body=body)

def main(alleen=None):
    docs = laad()
    docs.append(overzicht(docs))
    if alleen: docs = [d for d in docs if any(d['code'].startswith(a) for a in alleen)]
    jobs = []
    for d in docs:
        naam = '%s %s' % (d['code'], d['titel'])
        hp = os.path.join(HERE, 'html', d['code'] + '.html')
        open(hp, 'w').write(base.pagina(d))
        map_ = map_voor(d['code'])
        os.makedirs(os.path.join(ROOT, map_), exist_ok=True)
        jobs.append({'html': hp, 'pdf': os.path.join(ROOT, map_, naam + '.pdf'), 'voet': '%s · %s' % (d['code'], d['titel'])})
    json.dump(jobs, open(os.path.join(HERE, 'jobs-%d.json' % os.getpid()), 'w'))
    subprocess.run(['node', os.path.join(HERE, 'pdf.js'), os.path.join(HERE, 'jobs-%d.json' % os.getpid())], check=True)
    os.remove(os.path.join(HERE, 'jobs-%d.json' % os.getpid()))

if __name__ == '__main__':
    main(sys.argv[1:] or None)
