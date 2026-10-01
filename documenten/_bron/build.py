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

def main(alleen=None):
    docs = laad()
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
