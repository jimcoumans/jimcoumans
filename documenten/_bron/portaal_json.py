# -*- coding: utf-8 -*-
# Maakt van de briefing Kerst bij Thiessen een .json om in het portaal in te lezen (Feedback verwerken -> bestand).
# Zelfde bron als de pdf, zodat portaal en document gelijk zijn. Gebruik: python3 portaal_json.py
import os, sys, re, json, html, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
spec = importlib.util.spec_from_file_location('m', os.path.join(HERE, 'docs', 'I_3_briefings.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
T = m.THI
MAAND = {'januari':1,'februari':2,'maart':3,'april':4,'mei':5,'juni':6,'juli':7,'augustus':8,'september':9,'oktober':10,'november':11,'december':12}

def tekst(h):
    h = re.sub(r'<span class="chip[^"]*">voorstel</span>\s*', 'Voorstel: ', h)
    h = re.sub(r'<li>', '\n- ', h)
    h = h.replace('</ul>', '\n\n')
    h = re.sub(r'</p>\s*', '\n\n', h)
    h = re.sub(r'<a href="([^"]+)">([^<]+)</a>', r'\2 (\1)', h)
    h = re.sub(r'<[^>]+>', '', h)
    h = html.unescape(h)
    h = re.sub(r'[ \t]+', ' ', h)
    h = re.sub(r'\n{3,}', '\n\n', h)
    return '\n'.join(l.strip() for l in h.strip().split('\n'))

def datum(t):
    t = tekst(t).strip()
    mt = re.match(r'(\d{1,2}) (\w+) (\d{4})$', t)
    if not mt: return ''
    return '%s-%02d-%02d' % (mt.group(3), MAAND[mt.group(2)], int(mt.group(1)))

def regels(lijst): return '\n'.join(tekst(x) for x in lijst)

def periode(live):
    live = live.strip()
    if not live: return '', ''
    delen = [d.strip() for d in re.split(r'–', live.replace('vanaf ', ''))]
    def d(x):
        x = x.strip()
        if not re.search(r'\d{4}$', x): x += ' 2026'
        return datum(x)
    if 'winkel' in live: return '', ''
    return d(delen[0]), (d(delen[1]) if len(delen) > 1 else '')

kpis = [dict(label=k[0], datum=datum(k[1]), aantal=int(k[2]), prijs=k[3].replace('€', '').strip()) for k in T['kpi'] if not isinstance(k, tuple)]
deliverables = []
for d in T['deliverables']:
    if isinstance(d, tuple): continue
    van, tot = periode(d.get('live', ''))
    deliverables.append(dict(naam=d['naam'], kanaal=tekst(d['kanaal']), inhoud=tekst(d['inhoud']), formaat=tekst(d.get('formaat', '')),
                             liveVanaf=van, liveTot=tot, status=d['status']))
tijdlijn = []
for r in T['tijdlijn']:
    tijdlijn.append(dict(id='', datum=datum(r[0]), omschrijving=tekst(r[1]) + ('' if datum(r[0]) or not tekst(r[0]) or tekst(r[0]).startswith('[') else ' (%s)' % tekst(r[0])), wie=r[2]))

uit = dict(
  samenvatting=m.THI_SAMENVATTING,
  doel=dict(doelInEenZin=tekst(T['Doel in één zin']), resultaatDefinitie=tekst(T['Wat telt als resultaat']), budgetVorm='berekend', vastBudget='',
            budgetToelichting=tekst(T['Advertentiebudget'])[tekst(T['Advertentiebudget']).index('Per ad:'):], kpiOpmerkingen=regels(T['kpi_opmerking'])),
  aanbod=dict(wat=tekst(T['Wat we verkopen']), boodschap=tekst(T['Kernboodschap']).replace('Voorstel: ', ''), waaromNu=tekst(T['Waarom nu']), nietBeloofd=tekst(T['Wat we niet beloven'])),
  doelgroep=dict(regio=tekst(T['Regio']).replace('Voorstel: ', ''), uitsluitingen=tekst(T['Uitsluiten']), toelichting=tekst(T['doelgroep_opmerking'])),
  planning=dict(start=datum(T['Start']), einde=datum(T['Einde']), toelichting=regels(T['planning_opmerking'] + T['deliverables_opmerking'])),
  afspraken=dict(klantDoet=tekst(T['Wat de klant zelf doet']), overig=regels(T['afspraken_opmerking'])),
  achtergrond=dict(eerder=tekst(T['Wat we weten van vorige keer']), risicos=tekst(T['Risico’s']).lstrip('- ').replace('\n- ', '\n')),
  kpis=kpis, deliverables=deliverables, tijdlijn=tijdlijn,
  wijzigingen=[
      "Kerstavond geschrapt; brunch op eerste kerstdag en diner op beide kerstdagen met tijden, menu, prijzen en arrangementen",
      "Bij het diner sturen we op all-in (€ 115); de andere samenstellingen (€ 82,50 en € 110) staan erbij",
      "Tweede kerstdag gaat pas open na de go van Thiessen (diner eerste kerstdag vol); Ad 6 en Post 4 liggen klaar",
      "Doel: nog 150 gasten, € 13.200 omzet; hypothese en budget opnieuw berekend (advies € 1.900, 14,4%), per ad uitgesplitst",
      "Planning: akkoord uiterlijk 9 oktober, live 15 oktober, adverteren in twee flights",
      "Deliverables één voor één: Ad 1 t/m 6, Post 1 t/m 4, Mailing 1 t/m 3, landingspagina en flyer"
  ],
  openVragen=[
      "Op 26 december staan al 30 gasten geboekt, terwijl tweede kerstdag pas open zou gaan na eerste kerstdag. Is die eventpagina nu al openbaar? Zo ja: offline tot de go, of laten staan?",
      "Formaat van de flyer afstemmen met Thiessen.",
      "Verzenddata van de mailings en posts zijn een voorstel: heeft Thiessen vaste dagen voor de nieuwsbrief?",
      "Stand op maandag 12 oktober opvragen: wat er dan al geboekt is op 25 december, gaat van het doel af.",
      "Vink in het portaal budget, kernboodschap en regio aan als voorstel."
  ],
  aannames=dict(eenhedenPerConversie='3', conversieratio='2,5', doorklikratio='1', kostenPer1000='8', buffer='20',
                bronEenheden='inschatting; checken in Odoo', bronConversie='marktgemiddelde; eigen norm volgt',
                bronDoorklik='marktgemiddelde Meta; eigen norm volgt', bronKosten='inschatting; checken in Ads Manager',
                opmerkingen=regels(T['hyp']['opmerkingen'])),
)
open(os.path.join(os.path.dirname(HERE), '6 Klanten', 'Thiessen', 'Kerst bij Thiessen, versie 2.0 (inlezen in portaal).json'), 'w').write(json.dumps(uit, ensure_ascii=False, indent=2))
