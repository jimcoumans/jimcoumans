# -*- coding: utf-8 -*-
from base import *

FASE = 'Intern · Waar het om draait'

REGELS = [
 ('Cijfers zijn leidend',
  'Geen resultaatbelofte. We beloven dat we het zelf zeggen als het niet werkt, en waarom. De cijfers staan voor allebei zichtbaar in het dashboard.',
  'De meetlat moet er liggen vóór er iets te meten valt: nulmeting, doelregel, de vijf afspraken van de klant. Zonder meting geen start.'),
 ('Maandelijks opzegbaar, voor allebei',
  'Opzeggen kan tot en met de laatste dag van de maand; de maand erna komt er geen factuur meer. Het fundament krijgt de klant na de start niet terug: dat werk is gedaan.',
  'De klant blijft alleen omdat het werkt. Dus moet het maandritme zichtbaar waarde laten zien.'),
 ('Alles verdient zich terug',
  'Fundament, retainer, licenties, advertenties en gekozen extra’s samen verdienen zich terug binnen de terugverdientijd, standaard twaalf maanden. Lukt dat op papier niet, dan beginnen we niet.',
  'Bepaalt het advertentiebudget en daarmee het pakket. Nooit goedkoper maken; wel een hoger doel, een langere termijn, of nee.'),
 ('De 50%-regel',
  'Onze retainer is nooit meer dan de helft van wat de klant per maand aan marketing uitgeeft: retainer plus advertentiebudget.',
  'Met de minimumbudgetten per pakket klopt het altijd. Wie onder het minimum wil, betaalt ons om te sturen op een bedrag dat te klein is om mee te sturen. Dan niet.'),
 ('Nooit marge erbovenop',
  'De klant betaalt de specialist, en niet ons bovenop de specialist. Een vergoeding van een leverancier voor doorverwijzen mag (Leadinfo, ClickCease, MailerLite, de afsprakenplanner), en die zeggen we erbij.',
  'Zeg nooit “we verdienen er niets aan”; zeg “we zetten er nooit iets bovenop”. Het eerste is niet waar en komt een keer uit.'),
 ('Niets gratis erbij',
  'Nooit iets “even doen omdat het klein is”. Wat buiten fundament of retainer valt, bieden we los aan met een prijs vooraf.',
  'Kleine gunsten worden de norm en eten de marge op, en dan betaalt een andere klant ervoor.'),
 ('Altijd on-brand',
  'Elke uiting die naar buiten gaat, klopt met het merk van de klant: kleur, typografie, toon en beeld. Ook een snelle variant, ook een test. Geen bruikbaar merk? Dan leggen we in het fundament kleur en typografie vast, en houden we ons daaraan.',
  'Performance en merk zijn geen tegenstelling. Wat vandaag klikt maar het merk beschadigt, kost op termijn meer dan het oplevert. Elke uiting gaat daarom door de merkcheck voordat hij live gaat.'),
 ('Data beats opinion',
  'We monitoren continu en beslissen op cijfers, niet op smaak. Een discussie over wat mooier is, beslechten we met een test. Het merk bepaalt de grenzen; binnen die grenzen kiest de data.',
  'Vraagt om betrouwbare meting vanaf dag één en om vaste drempels, anders is ook een cijfer een mening. De monitoring hoort bij het maandritme (stap 08).'),
 ('Alles op naam van de klant',
  'Advertentieaccounts, e-mail, licenties: op naam van de klant, met diens betaalgegevens, wij als beheerder. Nooit op onze naam, ook niet even.',
  'Stopt de klant, dan gaat alles mee. Dat is precies het bureau dat wij willen zijn, en het maakt vertrekken makkelijk. Dat moeten we willen.'),
]

def regel(n, titel, betekent, vast):
    inhoud = twee('<span class="kl" style="display:block;font-size:8pt;font-weight:600;color:var(--tx2);margin-bottom:2pt">Wat het betekent</span><p>%s</p>' % betekent,
                  '<span class="kl" style="display:block;font-size:8pt;font-weight:600;color:var(--orange-tx);margin-bottom:2pt">Wat eraan vastzit</span><p>%s</p>' % vast)
    return '<div class="blok" style="padding:8pt 11pt 6pt;margin:0 0 6pt"><div class="bh"><b>%d · %s</b><span>Regel %d</span></div>%s</div>' % (n, titel, n, inhoud)

def body():
    o = []
    for i, r in enumerate(REGELS, 1):
        o.append(regel(i, *r))
    return ''.join(o)

DOCS = [dict(code='I.1', titel='De negen spelregels', fase=FASE, voor='Intern', wanneer='Altijd', wie='Iedereen in het team',
  lead='Negen regels die altijd gelden. Staat ergens in een draaiboek, voorstel of mail iets wat ermee in strijd is, dan geldt de regel.', body=body())]
