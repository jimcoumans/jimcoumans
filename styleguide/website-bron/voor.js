

/* ======================= SITE: inhoud ======================= */
var JR={};

JR.menu=[
  {k:'Werkwijze',href:'#/werkwijze'},
  {k:'Diensten',groepen:[
    {t:'Adverteren',items:[['Google Ads','#/diensten/google-ads'],['Social advertising','#/diensten/social-advertising'],['Microsoft Ads','#/diensten/microsoft-ads']]},
    {t:'Content',items:[['Fotografie','#/diensten/fotografie'],['Videografie','#/diensten/videografie'],['Animatie','#/diensten/animatie'],['Copywriting','#/diensten/copywriting']]},
    {t:'Versnellers',items:[['Conversie-optimalisatie','#/diensten/conversie-optimalisatie'],['E-mailmarketing','#/diensten/e-mailmarketing'],['SEO','#/diensten/seo'],['Hosting en techniek','#/diensten/hosting']]},
  ],uit:{t:'Alle diensten',p:'Eén systeem. Alles met één doel: meer klanten voor jou.',href:'#/diensten'}},
  {k:'Prijzen',href:'#prijzen'},
  {k:'Voor jou',groepen:[
    {t:'Branches',items:[['Horeca','#/branches/horeca'],['Makelaardij','#/branches/makelaardij'],['Automotive','#/branches/automotive'],['Retail','#/branches/retail'],['Zakelijke dienstverlening','#/branches/zakelijke-dienstverlening'],['Zorg','#/branches/zorg'],['Overheid','#/branches/overheid'],['Sport en vrije tijd','#/branches/sport-en-vrije-tijd']],klein:1},
    {t:'Regio',items:[['Maastricht','#/regio/maastricht'],['Heerlen','#/regio/heerlen'],['Sittard-Geleen','#/regio/sittard-geleen'],['Parkstad','#/regio/parkstad'],['Valkenburg','#/regio/valkenburg']],klein:1},
    {t:'Bewijs',items:[['Wedstrijdverslagen','#/cases'],['Uitslagen','#/resultaten'],['Het scorebord','#/portaal']]},
  ],uit:{t:'De voorbespreking',p:'Vijftien vragen. Dan weet je of we samen het veld op gaan.',href:'#check'}},
  {k:'Kennis',groepen:[
    {t:'De analyse',items:[['Artikelen en gidsen','#/kennis'],['Begrippen','#/begrippen'],['Tools','#/tools']]},
    {t:'Limburg',items:[['Marketing in Limburg','#/marketing-in-limburg'],['Partners','#/partners']]},
    {t:'Hulp',items:[['Helpdesk','#/helpdesk'],['Portaal-updates','#/portaal/updates']]},
  ],uit:{t:'Het clubblad',p:'Eén keer per maand de beste analyses in je inbox.',href:'#club'}},
  {k:'Over ons',groepen:[
    {t:'De club',items:[['Over James Robinson','#/over-ons'],['De selectie','#/team'],['Werken bij','#/werken-bij']]},
    {t:'Op het veld',items:[['Events','#/events'],['De playground','#/playground']]},
    {t:'Contact',items:[['Contact','#/contact'],['Inloggen','#/inloggen']],klein:1},
  ],uit:{t:'Bel ons',p:'045 792 0009. Maandag tot en met vrijdag, 8.00 tot 18.00 uur.',href:'#/contact'}},
];

/* ---------- Diensten ---------- */
JR.diensten={
'google-ads':{groep:'Adverteren',naam:'Google Ads',merk:'Zichtbaar vanaf dag één. <b>Weg op de dag dat je stopt.</b>',sub:'Iemand die "kozijnen vervangen prijs" typt is verder dan iemand die "kozijnen" typt. Het verschil zit in die twee woorden.',vis:'google',spec:'Google Ads',
 title:'Google Ads-bureau Limburg | James Robinson',
 wat:[['Zoekadvertenties','Bovenaan bij de zoekopdracht. Je betaalt per klik.','zoekadvertenties'],['Performance Max','Eén campagne over alle kanalen van Google. Stuurt op aanvragen.','performance-max'],['Display','Beeld op websites en apps. Vooral voor retargeting.','display'],['YouTube','Video voor en tijdens het kijken.','youtube'],['Demand Gen','Beeld en video in Discover, Gmail en YouTube.','demand-gen'],['Lokaal adverteren','Zichtbaar in Maps en voor zoekopdrachten in de buurt.','lokaal-adverteren']],
 aanpak:[['Zoekwoorden','Op de woorden van wie al wil kopen. Niet op wie zich oriënteert.','Week 1'],['Structuur','Per aanbod een campagne. Per campagne één landingspagina.','Week 2'],['Advertenties','Drie varianten per groep. De cijfers kiezen.','Week 3'],['Live en bijsturen','Elke ochtend om 7.00 uur een controle. Elke maand een update.','Vanaf dag 19']],
 eerlijk:['Stopt het budget, dan stopt het verkeer. Direct.','De eerste maanden zijn leren. Rond maand drie trekken we de eerste voorzichtige conclusies.','Werkt alleen als er al vraag is. Niemand zoekt op iets wat hij nog niet kent.'],
 faq:[['Wat kost adverteren in Google?','Twee bedragen. Het advertentiebudget gaat rechtstreeks naar Google, op jouw naam. Ons pakket begint bij € 1.000 per maand, met een advertentiebudget vanaf € 1.000. Plus eenmalig het fundament van € 4.500. Alle bedragen exclusief btw.'],['Hoe snel staat mijn campagne live?','Rond dag 19 na het tekenen. Daarvoor zetten we de meting, de accounts, de zoekwoorden en een landingspagina neer.'],['Staat het account op mijn naam?','Ja. Het account, de data en de betaalgegevens zijn van jou. Wij zijn beheerder, nooit eigenaar.'],['SEO of Google Ads?','Allebei, in deze volgorde. Google Ads levert vanaf dag één data op over welke woorden een aanvraag opleveren. Daarna werken we met SEO op precies die woorden.'],['Kan ik maandelijks opzeggen?','Ja. Voor allebei. Het fundament krijg je na de start niet terug.']],
 rel:['social-advertising','conversie-optimalisatie','seo'],
 seo:`<h2>Wat is Google Ads?</h2><p>Google Ads is het advertentieplatform van Google. Je advertentie verschijnt bij een zoekopdracht, in Maps, op YouTube en op websites die met Google samenwerken. Je betaalt per klik, niet per vertoning. Wie niet klikt, kost niets.</p><p>Het verschil met bijna elke andere vorm van marketing: de vraag is er al. Iemand typt wat hij zoekt, en op dat moment sta je er. Daarom is Google Ads bij ons de motor van het systeem. Het enige wat je vandaag aanzet en morgen meet.</p>
<h2>Wat kost adverteren in Google?</h2><p>Wat een klik kost, hangt af van drie dingen: de branche, de concurrentie op het woord en de kwaliteit van je advertentie en landingspagina. Google beloont een goede pagina met een lagere prijs per klik. Een slechte pagina maakt elke klik duurder.</p><p>Bij ons betaal je twee dingen. Het advertentiebudget betaal je rechtstreeks aan Google, op jouw naam, zonder marge van ons erbovenop. Daarnaast betaal je een vast bedrag per maand voor ons pakket. Voor één campagne is dat € 1.000 per maand, met een advertentiebudget tussen € 1.000 en € 2.500. Ons pakket is nooit meer dan de helft van wat je samen uitgeeft. Met de <a href="#rekenhulp">rekenhulp</a> zie je wat jouw ambitie vraagt.</p>
<h2>Zoekwoorden: op de vraag, niet op het onderwerp</h2><p>De meeste budgetten lekken weg op woorden die te breed zijn. "Kozijnen" trekt iedereen die ooit over kozijnen heeft nagedacht. "Kozijnen vervangen prijs" trekt iemand die een offerte wil. We beginnen smal, op de woorden met de meeste koopintentie, en verbreden pas als de cijfers dat rechtvaardigen.</p><p>Uitsluitingswoorden zijn net zo belangrijk. Wie zoekt op "kozijnen zelf plaatsen" of "vacature kozijnenmonteur", wil geen offerte. Die klikken sluiten we vanaf dag één uit.</p>
<h2>SEO of Google Ads?</h2><p>De vraag stelt een verkeerde keuze. Google Ads levert direct, en stopt direct. SEO kost maanden, en blijft daarna staan. De beste volgorde: eerst adverteren, zodat je binnen weken weet welke woorden een aanvraag opleveren. Daarna met SEO investeren in precies die woorden. Zo bouw je geen posities op woorden die niets opleveren.</p>
<h2>Van klik tot aanvraag</h2><p>Een klik is geen klant. Tussen de advertentie en de aanvraag zit je landingspagina. Daarom krijgt elke campagne bij ons één eigen pagina, met één boodschap en één actie. Twee van de honderd bezoekers doen iets. De andere achtennegentig waren er ook.</p><p>Na de aanvraag ben jij aan zet. Bedrijven die binnen een uur reageren, hebben bijna zeven keer zo vaak een serieus gesprek als bedrijven die later reageren <span class="pg-bron">(Oldroyd e.a., Harvard Business Review, 2011)</span>. Daarom spreken we vooraf af hoe snel je opvolgt, en geef je in het portaal per aanvraag een oordeel. Zo leert de campagne wat een goede klant is.</p>
<h2>Wat je elke maand ziet</h2><p>In het portaal zie je dezelfde cijfers als wij, elk uur bijgewerkt: vertoningen, klikken, aanvragen, kosten per aanvraag en wat er klant werd. Geen rapport dat een maand oud is. Wat tegenvalt, zie je net zo snel als wat meevalt.</p>`},
'social-advertising':{groep:'Adverteren',naam:'Social advertising',merk:'Bereik <b>vóór de vraag.</b>',sub:'Niemand zoekt op een keuken tot hij er een wil. Wat daarvoor gebeurt, gebeurt hier.',vis:'social',spec:'Social advertising',
 wat:[['Facebook en Instagram','Het grootste bereik in de regio. Stuurt op aanvragen.','facebook-en-instagram'],['LinkedIn','Op functie, branche en bedrijfsgrootte. Minimaal € 1.000 per campagne.','linkedin'],['TikTok','Bereik bij wie nog niet zoekt. Vraagt om eigen video.','tiktok']],
 aanpak:[['Doelgroep','Mensen die lijken op wie al bij je koopt.','Week 1'],['Draaidag','Een dagdeel filmen op locatie. Montage in 9:16, 4:5 en 1:1.','Week 2'],['Varianten','Meerdere beelden en boodschappen tegelijk. De cijfers kiezen.','Week 3'],['Contentrondes','Advertenties slijten. Volgens je opstelling maken we nieuwe.','Elk seizoen']],
 eerlijk:['Mensen scrollen. Een advertentie heeft twee seconden.','Advertenties slijten. Zonder nieuwe content stijgen de kosten.','Organisch posten is iets anders. Een bericht bereikt 1 tot 3% van je volgers.'],
 faq:[['Wat is het verschil met posten?','Een organisch bericht bereikt gemiddeld 1 tot 3% van je eigen volgers (Socialinsider 2026). Een advertentie bereikt wie jij kiest, ook mensen die je nog niet volgen.'],['Welk platform past bij mij?','Standaard starten we met Meta: Facebook en Instagram. LinkedIn bij zakelijke klanten, TikTok als je doelgroep daar zit en er video is. Wij kiezen op de cijfers.'],['Moet ik zelf op beeld?','Iemand moet het werk doen op beeld. Dat hoeft niet de eigenaar te zijn.'],['Wat kost het?','Minimaal € 500 per kanaal per campagne per maand aan advertentiebudget. Op LinkedIn € 1.000. Daarnaast ons pakket vanaf € 1.000 per maand.']],
 rel:['google-ads','videografie','fotografie']},
'microsoft-ads':{groep:'Adverteren',naam:'Microsoft Ads',merk:'Kleiner bereik. <b>Vaak goedkopere klikken.</b>',sub:'Bing, Edge en zoeken in Windows. Dezelfde zoekopdrachten, een ander publiek.',vis:'bing',spec:'Google Ads',
 wat:[['Zoekadvertenties in Bing','Overgenomen uit Google Ads en apart bijgestuurd.',''],['Audience Network','Beeld op sites en apps van Microsoft.','']],
 aanpak:[['Overnemen','De bewezen campagnes uit Google Ads als basis.','Na de aftrap'],['Bijsturen','Eigen biedingen en uitsluitingen.','Maandelijks']],
 eerlijk:['Het volume is een fractie van Google.','Pas zinvol als Google Ads al draait en werkt.'],
 faq:[['Moet ik met Microsoft Ads beginnen?','Nee. We beginnen met Google en Meta. Microsoft Ads komt erbij als de cijfers daar ruimte voor laten zien.'],['Telt het als aparte campagne?','Nee. Hetzelfde aanbod in Google en Microsoft telt als één campagne.']],
 rel:['google-ads','seo']},
'fotografie':{groep:'Content',naam:'Fotografie',merk:'De eerste <b>twee seconden.</b>',sub:'Mensen kijken voordat ze lezen. Dat is geen voorkeur, dat is volgorde.',vis:'foto',spec:'Fotografie',content:1,
 wat:[['Brandshoot','Je bedrijf, je mensen en je werk, in één stijl.','brandshoot'],['Portret','Voor de site, LinkedIn en de pers.','portret'],['Event','Wat er gebeurde, voor wie er niet was.','event'],['Product','Vrijstaand en in gebruik.','product'],['Interieur','Ruimtes zoals ze voelen.','interieur']],
 aanpak:[['Contentplan','Welke beelden de campagnes nodig hebben.','Vooraf'],['Draaidag','Op locatie, met iemand die het werk doet.','Volgens opstelling'],['Selectie en bewerking','In de huisstijl van je merk.','Binnen een week'],['In de merkkluis','Alles terug te vinden in het portaal.','Direct']],
 eerlijk:['Een mooie foto zonder plan levert niets op.','Het werk moet op beeld. Iemand moet het doen.'],
 faq:[['Alleen een fotograaf nodig?','Dan bellen we je eerst om te kijken of een abonnement past. Past het niet, dan verwijzen we je door naar een partner.'],['Van wie zijn de foto\'s?','Van jou. Alles komt in je merkkluis in het portaal.'],['Hoeveel draaidagen krijg ik?','Volgens je opstelling: van één per jaar bij Starter tot vier per jaar bij Champion. Extra dagen kunnen als apart voorstel.']],
 rel:['videografie','social-advertising','copywriting']},
'videografie':{groep:'Content',naam:'Videografie',merk:'Twintig seconden. <b>Drie alinea\'s minder.</b>',sub:'Sommige vakken zijn lastig uit te leggen en eenvoudig te laten zien.',vis:'video',spec:'Videografie',content:1,
 wat:[['Video-ads','Kort, voor social en YouTube. In drie formaten.','video-ads'],['Reels','Verticaal, voor het eerste moment van aandacht.','reels'],['Bedrijfsvideo','Maken we niet. We verwijzen je door naar een partner.','bedrijfsvideo']],
 aanpak:[['Script','Haak, boodschap, actie. In de eerste twee seconden.','Vooraf'],['Opnames','Een dagdeel op locatie.','Draaidag'],['Montage','9:16, 4:5 en 1:1, met ondertitels.','Binnen een week'],['Testen','Meerdere openingen tegelijk live.','Na livegang']],
 eerlijk:['De meeste mensen kijken zonder geluid.','Een video slijt sneller dan een foto.'],
 faq:[['Maken jullie bedrijfsvideo\'s?','Nee. Daar verwijzen we door naar een partner. Wij maken video voor advertenties.'],['Hoe lang is een video-ad?','Meestal tussen de zes en twintig seconden.']],
 rel:['fotografie','animatie','social-advertising']},
'animatie':{groep:'Content',naam:'Animatie',merk:'Beweegt <b>zonder camera.</b>',sub:'Een proces, een getal of een product dat nog niet bestaat. Wat niet te filmen is, is te tekenen.',vis:'anim',spec:'Animatie',content:1,
 wat:[['Motion graphics','Tekst en vormen in beweging, in je huisstijl.',''],['Uitleganimatie','Hoe iets werkt, in twintig seconden.',''],['Logo-animatie','Voor het begin of eind van elke video.','']],
 aanpak:[['Storyboard','Elk beeld vooraf op papier.','Week 1'],['Animatie','In de drie formaten.','Week 2'],['Varianten','Openingen testen.','Na livegang']],
 eerlijk:['Duurder per seconde dan filmen.','Te veel beweging leidt af van de boodschap.'],
 faq:[['Wanneer animatie en wanneer video?','Video als het werk te zien is. Animatie als het werk onzichtbaar is, zoals een dienst, een proces of software.']],
 rel:['videografie','copywriting']},
'copywriting':{groep:'Content',naam:'Copywriting',merk:'Elk woord <b>gewogen.</b>',sub:'Een advertentie heeft dertig tekens voor een kop. Een landingspagina een paar seconden. Wat overblijft na het schrappen, staat er.',vis:'copy',spec:'Copywriting',content:1,
 wat:[['Advertentieteksten','Koppen en beschrijvingen, in varianten.',''],['Landingspagina\'s','Eén boodschap, één actie.',''],['E-mails','Van bevestiging tot automation.',''],['Webteksten','Met de H2\'s in zoektaal.','']],
 aanpak:[['Boodschap','Eén zin die klopt met het merk.','Fundament'],['Varianten','Meerdere koppen tegelijk live.','Per campagne'],['Bijschaven','De cijfers kiezen de woorden.','Maandelijks']],
 eerlijk:['De beste tekst wint niet. De tekst die het meest oplevert wint.','Merktaal bepaalt de grenzen. Binnen die grenzen kiest de data.'],
 faq:[['Schrijven jullie ook blogs?','Voor SEO, op woorden die al bewezen hebben dat ze converteren. Niet om de site te vullen.']],
 rel:['conversie-optimalisatie','seo','e-mailmarketing']},
'conversie-optimalisatie':{groep:'Versnellers',naam:'Conversie-optimalisatie',merk:'Hetzelfde verkeer. <b>Ander resultaat.</b>',sub:'Twee van de honderd doen iets. De andere achtennegentig waren er ook.',vis:'ab',spec:'Conversie-optimalisatie',
 wat:[['Landingspagina\'s','Eén per campagne. Gebouwd op je eigen website.',''],['A/B-testen','Twee versies tegelijk. De cijfers kiezen.',''],['Formulieren','Minder velden, minder afhakers.',''],['Snelheid','Via Webmix: elke seconde telt.','']],
 aanpak:[['Meten','Waar haken bezoekers af.','Fundament'],['Hypothese','Eén verandering, met een reden.','Maandelijks'],['Testen','Lang genoeg voor een conclusie.','Per test'],['Doorvoeren','Wat wint, blijft.','Na de test']],
 eerlijk:['Bij Google verbetert maar 10 tot 20% van de geteste ideeën het resultaat (Kohavi & Thomke, HBR 2017).','Testen vraagt verkeer. Met weinig bezoekers duurt een conclusie lang.','We bouwen geen nieuwe websites.'],
 faq:[['Bouwen jullie een nieuwe website?','Nee. We bouwen landingspagina\'s op je bestaande website. Voor een nieuwe website verwijzen we je naar Webmix.'],['Wat is een goede conversieratio?','Dat verschilt per branche en per aanbod. We meten het vanaf de nulmeting en sturen op verbetering, niet op een gemiddelde.']],
 rel:['google-ads','copywriting','hosting']},
'e-mailmarketing':{groep:'Versnellers',naam:'E-mailmarketing',merk:'Van jou. <b>Niet geleend.</b>',sub:'Volgers staan bij Meta. Posities staan bij Google. Een adressenlijst staat bij jou.',vis:'mail',spec:'E-mailmarketing',
 wat:[['Nieuwsbrieven','Elke maand, met iets wat de moeite waard is.',''],['Campagnemailings','Bij een actie of seizoen.',''],['Automation','Werkt door na vijven. Van bevestiging tot opvolging.','']],
 aanpak:[['MailerLite','Op jouw naam. Vanaf € 9,90 per maand.','Fundament'],['De lijst','Wie aanvroeg, kocht of zich aanmeldde.','Doorlopend'],['Flows','Bevestiging, herinnering, opvolging.','Na de aftrap'],['Mailings','Volgens planning.','Maandelijks']],
 eerlijk:['Een lijst groeit langzaam.','Zonder toestemming geen mail. Dat houdt de lijst klein en goed.'],
 faq:[['Welk systeem gebruiken jullie?','MailerLite, op jouw naam. Je betaalt rechtstreeks aan MailerLite, € 9,90 tot € 73 per maand afhankelijk van de lijst. Krijgen wij een doorverwijsvergoeding, dan melden we dat.'],['Wat gebeurt er met de lijst als ik stop?','Die blijft van jou. Net als alles.']],
 rel:['conversie-optimalisatie','copywriting']},
'seo':{groep:'Versnellers',naam:'SEO',merk:'Maanden werk. <b>Daarna stopt het niet meer.</b>',sub:'Zoekmachines belonen wat er al lang staat. Dat is de reden dat het traag begint, en de reden dat het blijft.',vis:'seo',spec:'SEO',
 wat:[['On-page','Titels, koppen en tekst op de woorden die converteren.',''],['Off-page','Verwijzingen van sites die ertoe doen.',''],['Google Bedrijfsprofiel','Zichtbaar in Maps en de lokale resultaten.','']],
 aanpak:[['Woorden uit Ads','Alleen woorden die al bewezen hebben dat ze een aanvraag opleveren.','Na de eerste maanden'],['Pagina\'s','Per woord één pagina die het antwoord geeft.','Doorlopend'],['Techniek','Snelheid, redirects, structuur.','Via Webmix'],['Meten','Search Console in het portaal.','Elk uur']],
 eerlijk:['Levert de eerste maanden weinig op.','Posities zijn nooit gegarandeerd.','Werkt pas goed als de site technisch op orde is.'],
 faq:[['Hoe lang duurt het?','Maanden. De eerste beweging zie je vaak na een paar maanden, de echte resultaten later. Daarom beginnen we met adverteren.'],['Garanderen jullie een eerste plek?','Nee. Niemand kan dat eerlijk beloven.']],
 rel:['google-ads','copywriting','hosting']},
'hosting':{groep:'Versnellers',naam:'Hosting en techniek',merk:'Merkbaar <b>alleen als het misgaat.</b>',sub:'Elke nacht een back-up. Elke minuut een controle. Verder niets te melden.',vis:'host',spec:'Hosting',
 wat:[['Hosting via Webmix','€ 85 per maand, rechtstreeks gefactureerd.',''],['Snelheid','Eenmalig € 750.',''],['Redirects','Eenmalig € 500.',''],['E-mailauthenticatie','Eenmalig € 250.','']],
 aanpak:[['Audit','Wat de site trager of kwetsbaarder maakt.','Fundament'],['Herstel','Via Webmix, met een prijs vooraf.','Voor de aftrap'],['Monitoring','Elke minuut een controle.','Doorlopend']],
 eerlijk:['Wij hosten niet zelf. Webmix doet het, wij regelen het.','Herstel kost geld. Een trage site kost meer.'],
 faq:[['Waarom via een partner?','Webmix is daar beter in dan wij. We nemen geen marge op hun werk.']],
 rel:['conversie-optimalisatie','seo']},
};
JR.subdiensten={
 'zoekadvertenties':['google-ads','Zoekadvertenties','Bovenaan, op het moment dat iemand zoekt.'],
 'performance-max':['google-ads','Performance Max','Eén campagne over Zoeken, YouTube, Display, Gmail en Maps.'],
 'display':['google-ads','Display','Beeld op miljoenen websites. Vooral om terug te halen wie er al was.'],
 'youtube':['google-ads','YouTube','Video voor en tijdens het kijken.'],
 'demand-gen':['google-ads','Demand Gen','Beeld en video in Discover, Gmail en YouTube.'],
 'lokaal-adverteren':['google-ads','Lokaal adverteren','Zichtbaar in Maps, voor wie in de buurt zoekt.'],
 'facebook-en-instagram':['social-advertising','Facebook en Instagram','Het grootste bereik in Zuid-Limburg.'],
 'linkedin':['social-advertising','LinkedIn','Op functie, branche en bedrijfsgrootte.'],
 'tiktok':['social-advertising','TikTok','Bereik bij wie nog niet zoekt.'],
 'brandshoot':['fotografie','Brandshoot','Je bedrijf, je mensen en je werk, in één stijl.'],
 'portret':['fotografie','Portret','Voor de site, LinkedIn en de pers.'],
 'event':['fotografie','Eventfotografie','Wat er gebeurde, voor wie er niet was.'],
 'product':['fotografie','Productfotografie','Vrijstaand en in gebruik.'],
 'interieur':['fotografie','Interieurfotografie','Ruimtes zoals ze voelen.'],
 'video-ads':['videografie','Video-ads','Zes tot twintig seconden. In drie formaten.'],
 'reels':['videografie','Reels','Verticaal. De eerste seconde beslist.'],
 'bedrijfsvideo':['videografie','Bedrijfsvideo','Maken we niet. Een partner wel.'],
};

/* ---------- Branches ---------- */
JR.branches={
 'horeca':{n:'Horeca',r:'Een tafel die leeg blijft, komt niet terug.',w:['Google Bedrijfsprofiel en Maps','Reserveringen via Google Ads','Social ads met beeld van gerecht en zaak','E-mail rond feestdagen en arrangementen'],doel:'reserveringen, arrangementen en events'},
 'makelaardij':{n:'Makelaardij',r:'Elke verkoper kiest één makelaar.',w:['Google Ads op waardebepaling','Social ads in de eigen wijk','Landingspagina per dienst','Opvolging binnen het uur'],doel:'waardebepalingen en verkoopopdrachten'},
 'automotive':{n:'Automotive',r:'Een proefrit begint online.',w:['Google Ads op merk en model','Social ads met voorraad','Werkplaats en onderhoud lokaal','Leads direct naar verkoop'],doel:'proefritten, offertes en werkplaatsafspraken'},
 'retail':{n:'Retail',r:'De winkel is open. Online is hij dat ook.',w:['Lokale campagnes naar de winkel','Social ads rond seizoenen','E-mail naar vaste klanten','Google Bedrijfsprofiel'],doel:'winkelbezoek en afspraken. Geen webshops.'},
 'zakelijke-dienstverlening':{n:'Zakelijke dienstverlening',r:'Een lange beslissing begint met één aanvraag.',w:['Google Ads op specifieke diensten','LinkedIn op functie en branche','Leadinfo voor bezoekende bedrijven','Automation voor lange trajecten'],doel:'kennismakingen en offerteaanvragen'},
 'zorg':{n:'Zorg',r:'Vertrouwen voor de eerste afspraak.',w:['Google Ads op behandeling en klacht','Duidelijke landingspagina\'s','Bedrijfsprofiel en reviews','Zorgvuldig met gegevens'],doel:'intakes en afspraken'},
 'overheid':{n:'Overheid',r:'Bereik iedereen die het aangaat.',w:['Social ads per gemeente en doelgroep','Campagnes rond deadlines','Landingspagina met één actie','Meetbaar per kanaal'],doel:'aanmeldingen, deelname en bereik'},
 'sport-en-vrije-tijd':{n:'Sport en vrije tijd',r:'Een vrije middag wordt online gepland.',w:['Social ads met beeld van de beleving','Google Ads op activiteit en regio','E-mail naar wie eerder kwam','Events en arrangementen'],doel:'boekingen, leden en tickets'},
};
JR.regio={
 'maastricht':{n:'Maastricht',p:'Stad, studenten, toerisme en een sterke horeca.'},
 'heerlen':{n:'Heerlen',p:'Het hart van Parkstad, met zorg, onderwijs en zakelijke dienstverlening.'},
 'sittard-geleen':{n:'Sittard-Geleen',p:'Chemelot, industrie en een groeiende zakelijke markt.'},
 'parkstad':{n:'Parkstad',p:'Heerlen, Kerkrade, Landgraaf, Brunssum en omstreken.'},
 'valkenburg':{n:'Valkenburg',p:'Toerisme, horeca en vrije tijd. Drukte in het seizoen.'},
};

/* ---------- Team ---------- */
JR.team={
 'jim-coumans':{nr:'01',n:'Jim Coumans',rol:'Oprichter',g:'staf',spec:'Merk, marketing en groei',sinds:'2018',jrnxt:0},
 'jim-kikken':{nr:'02',n:'Jim Kikken',rol:'Mede-eigenaar',g:'staf',spec:'Data-gedreven performance marketing',sinds:'2022 eigenaar',jrnxt:0},
 'robin-jacobs':{nr:'03',n:'Robin Jacobs',rol:'Medeoprichter',g:'staf',spec:'[Rol]',sinds:'2018',jrnxt:0},
 'speler-07':{nr:'07',n:'[Naam]',rol:'[Positie]',g:'selectie',spec:'Google Ads',sinds:'[jaar]',jrnxt:1},
 'speler-10':{nr:'10',n:'[Naam]',rol:'[Positie]',g:'selectie',spec:'Social advertising',sinds:'[jaar]',jrnxt:1},
 'speler-11':{nr:'11',n:'[Naam]',rol:'[Positie]',g:'selectie',spec:'Content',sinds:'[jaar]',jrnxt:1},
 'speler-14':{nr:'14',n:'[Naam]',rol:'[Positie]',g:'selectie',spec:'SEO',sinds:'[jaar]',jrnxt:0},
 'speler-17':{nr:'17',n:'[Naam]',rol:'[Positie]',g:'selectie',spec:'E-mailmarketing',sinds:'[jaar]',jrnxt:1},
 'speler-23':{nr:'23',n:'[Naam]',rol:'Stagiair',g:'jeugd',spec:'[Opleiding]',sinds:'[jaar]',jrnxt:1},
 'speler-24':{nr:'24',n:'[Naam]',rol:'Afstudeerder',g:'jeugd',spec:'[Opleiding]',sinds:'[jaar]',jrnxt:1},
};

/* ---------- Kennis ---------- */
JR.artikelen={
 'tot-aan-de-voordeur':{t:'Tot aan de voordeur: waarom snel inkoppen meer oplevert dan extra budget',s:'Gids',min:6,n:'7×',b:1,
  body:`<p>Ruud was een nieuwe speler in een nichemarkt. Zijn Google Ads-campagne werkte boven verwachting: de aanvragen kwamen binnen, de kosten per aanvraag lagen onder de doelstelling. Na een paar maanden zegde hij op. "Het levert geen klanten op."</p><p>Toen we de cijfers naast elkaar legden, bleek iets anders. De aanvragen kwamen binnen. Ruud belde ze gemiddeld na zeven dagen terug.</p><blockquote>Bedrijven die binnen een uur reageren, hebben bijna zeven keer zo vaak een serieus gesprek als bedrijven die een uur later reageren.</blockquote><p class="pg-bron">Oldroyd e.a., Harvard Business Review, 2011.</p><h2>Waar ons werk ophoudt</h2><p>Ons werk houdt op bij de voordeur. We leveren een kwalitatieve aanvraag af, van iemand die klaar is om te kopen. Wat daarna gebeurt, gebeurt bij jou. Daarom zit in elke samenwerking een afspraak over de opvolging: binnen de afgesproken tijd, elke keer.</p><h2>Wat het kost om te wachten</h2><p>Een aanvraag is geen voorraad. Wie een offerte aanvraagt, vraagt er vaak meer aan. De eerste die belt, voert het eerste gesprek. Extra budget levert meer aanvragen op. Sneller bellen levert meer gesprekken op uit dezelfde aanvragen.</p><h2>Wat wij doen</h2><ul><li>Elke aanvraag komt direct binnen, met een melding.</li><li>In het portaal geef je per aanvraag een oordeel.</li><li>Zo zien we samen waar het lekt: voor de voordeur, of erachter.</li></ul><p>Ruud heet in werkelijkheid anders. Het bedrijf noemen we niet.</p>`},
 'applaus-is-geen-doelpunt':{t:'Applaus is geen doelpunt: posten of adverteren',s:'Analyse',min:4,n:'1–3%',
  body:`<p>Een organisch bericht op Facebook of Instagram bereikt gemiddeld 1 tot 3 procent van je eigen volgers <span class="pg-bron">(Socialinsider, 2026)</span>. Bij duizend volgers zijn dat tien tot dertig mensen. Die kenden je al.</p><h2>Waarom we niet posten voor klanten</h2><p>Social presence is goed voor je merk. Een verzorgd profiel hoort erbij. Maar organisch posten is geen voorspelbare manier om nieuwe klanten te vinden. Gokken doe je in het casino, niet bij James Robinson.</p><h2>Wat wel voorspelbaar is</h2><p>Een advertentie bereikt wie jij kiest: in de regio, op leeftijd, op gedrag, en mensen die lijken op wie al bij je koopt. Je ziet per euro wat het opleverde.</p><h2>Likes don't pay the bills</h2><p>Likes en volgers zijn mooi meegenomen. Wij spelen voor aanvragen, klanten en omzet.</p>`},
 'tijd-plus-geld-is-data':{t:'Tijd plus geld is data: wat er in de eerste maanden gebeurt',s:'Gids',min:5,n:'3 mnd',
  body:`<p>Advertentieplatformen leren door te meten. In de eerste weken probeert een campagne doelgroepen, boodschappen en beelden uit. Pas als er genoeg data is, weet het systeem waar de aanvragen zitten.</p><h2>De eerste maand</h2><p>De campagne staat live rond dag 19. We laten ballonnetjes op: verschillende doelgroepen, koppen en beelden. Elke ochtend om 7.00 uur controleren we wat buiten de drempels valt.</p><h2>Maand twee</h2><p>Wat werkt, krijgt meer budget. Wat niet werkt, stopt. Jouw oordeel per aanvraag in het portaal stuurt mee.</p><h2>Maand drie</h2><p>Rond maand drie trekken we de eerste voorzichtige conclusies. Na honderd dagen volgt de 100-dagenreview.</p>`},
 'een-procentpunt':{t:'Eén procentpunt conversie is meer waard dan veel extra budget',s:'Analyse',min:5,n:'+1%'},
 'likes-dont-pay-the-bills':{t:'Waarom we geen social feeds beheren',s:'Analyse',min:3,n:'0'},
 'de-50-procent-regel':{t:'De 50%-regel: waarom ons pakket nooit meer is dan de helft',s:'Gids',min:4,n:'50%'},
 'kohavi':{t:'Data beats opinion: waarom 80% van de ideeën niet werkt',s:'Analyse',min:6,n:'10–20%'},
};
JR.begrippen={
 'ctr':['CTR','Doorklikratio. Het deel van de mensen dat een advertentie zag en erop klikte.'],
 'conversieratio':['Conversieratio','Het deel van de bezoekers dat een aanvraag doet.'],
 'scoringsratio':['Scoringsratio','Het deel van de aanvragen dat klant wordt.'],
 'cpc':['CPC','Kosten per klik.'],
 'cpa':['Kosten per aanvraag','Advertentiebudget gedeeld door het aantal aanvragen.'],
 'cpm':['CPM','Kosten per duizend vertoningen.'],
 'roas':['ROAS','Omzet per euro advertentiebudget.'],
 'landingspagina':['Landingspagina','Eén pagina per campagne, met één boodschap en één actie.'],
 'retargeting':['Retargeting','Advertenties voor mensen die je site al bezochten.'],
 'performance-max':['Performance Max','Een campagnetype van Google dat over alle kanalen tegelijk adverteert.'],
 'zoekwoord':['Zoekwoord','Het woord of de zin waarop een advertentie verschijnt.'],
 'uitsluitingswoord':['Uitsluitingswoord','Een zoekwoord waarop je advertentie juist níet verschijnt.'],
 'impressie':['Impressie','Eén keer dat een advertentie in beeld kwam.'],
 'a-b-test':['A/B-test','Twee versies tegelijk laten zien en meten welke beter werkt.'],
 'automation':['Automation','E-mails die vanzelf verstuurd worden na een actie.'],
 'nulmeting':['Nulmeting','De cijfers voordat we beginnen. Het vertrekpunt.'],
 'google-bedrijfsprofiel':['Google Bedrijfsprofiel','Je vermelding in Google Maps en de lokale zoekresultaten.'],
 'search-console':['Search Console','Gratis tool van Google die laat zien waarop je site gevonden wordt.'],
 'core-web-vitals':['Core Web Vitals','Drie metingen van Google voor snelheid en stabiliteit van een pagina.'],
 'kwaliteitsscore':['Kwaliteitsscore','Het oordeel van Google over je advertentie en landingspagina. Bepaalt mee wat een klik kost.'],
};
JR.tools={
 'portaal':['Portaal','Je cijfers, elk uur bijgewerkt.','€ 25 p/m','Altijd'],
 'mailerlite':['MailerLite','E-mail en automation.','€ 9,90 – 73 p/m','Altijd'],
 'cookiescript':['Cookiescript','Cookiemelding volgens de regels.','€ 150 p/j','Altijd'],
 'webmix':['Webmix','Hosting en techniek.','€ 85 p/m','Altijd'],
 'leadinfo':['Leadinfo','Ziet welke bedrijven je site bezoeken.','€ 69 – 179 p/m','Optioneel, alleen B2B'],
 'clickcease':['ClickCease','Filtert ongeldige klikken.','vanaf $ 99 p/m','Optioneel'],
 'calendly':['Calendly','Afspraken inplannen zonder heen en weer.','€ 15 p/m','Optioneel'],
 'chatgpt':['ChatGPT','AI-assistent.','[prijs]','Wat wij gebruiken'],
 'claude':['Claude','AI-assistent.','[prijs]','Wat wij gebruiken'],
 'gemini':['Gemini','AI-assistent van Google.','[prijs]','Wat wij gebruiken'],
 'kive':['Kive','Beeldbeheer en inspiratie.','[prijs]','Wat wij gebruiken'],
};

/* ---------- Events, vacatures, helpdesk ---------- */
JR.events=[
 {s:'padel-met-klanten',d:'[dd]',m:'[mnd]',soort:'eigen',t:'Padel met klanten en team',p:'Ondernemers die ons willen leren kennen, zijn welkom.',plek:'[Locatie]'},
 {s:'james-robinson-vs-fagro',d:'[dd]',m:'[mnd]',soort:'team',t:'James Robinson vs Fagro',p:'Padel. Een duel op de playground.',plek:'[Locatie]'},
 {s:'spreker',d:'[dd]',m:'[mnd]',soort:'extern',t:'[Event waar we spreken]',p:'[Omschrijving]',plek:'[Locatie]'},
 {s:'teamdag',d:'[dd]',m:'[mnd]',soort:'team',t:'[Teamevent]',p:'[Omschrijving]',plek:'[Locatie]'},
];
JR.vacatures={
 'stage-jrnxt':['Stage via JRNXT','Stage','Een stage lang meespelen in de selectie. Zeven van de tien begonnen zo.'],
 'afstuderen':['Afstuderen','Afstuderen','Een onderzoek dat we echt gebruiken.'],
 'open-sollicitatie':['Open sollicitatie','Vast','Geen vacature die past. Wel een speler die past.'],
};
JR.helpdesk={
 'imap-instellen':['E-mail','IMAP instellen op je telefoon','Je mail op je telefoon, synchroon met je computer.'],
 'toegang-google-ads':['Toegangen','Ons toegang geven tot Google Ads','In vier stappen, zonder je wachtwoord te delen.'],
 'toegang-meta':['Toegangen','Ons toegang geven tot Meta Business Suite','Als partner, niet als persoon.'],
 'portaal-oordeel':['Portaal','Een aanvraag beoordelen in het portaal','Waarom je oordeel de campagne slimmer maakt.'],
 'merkkluis':['Portaal','Bestanden vinden in de merkkluis','Logo\'s, foto\'s en video\'s op één plek.'],
 'dns-records':['Techniek','SPF, DKIM en DMARC uitgelegd','Waarom je mail in de spam belandt.'],
};

/* ==========================================================================
   Kern: hulpfuncties, iconen, beeldregie en apparaten
   ========================================================================== */
var $=function(s,el){return (el||document).querySelector(s)};
var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
/* [in te vullen] subtiel markeren, zonder dat het ontwerp eronder lijdt */
function vul(s){return String(s==null?'':s).replace(/\[([^\]]+)\]/g,'<span class="vul">[$1]</span>')}
function euro(n){return '€ '+Math.round(n).toLocaleString('nl-NL')}

/* ---------- Iconen (lijn, 1,6 px, afgerond) ---------- */
var IC={
  zoek:'<svg viewBox="0 0 44 44"><circle cx="19" cy="19" r="11"/><path d="M27.5 27.5L36 36"/></svg>',
  social:'<svg viewBox="0 0 44 44"><path d="M8 12.5A4.5 4.5 0 0 1 12.5 8h19A4.5 4.5 0 0 1 36 12.5v13A4.5 4.5 0 0 1 31.5 30H19l-7 6v-6h0.5A4.5 4.5 0 0 1 8 25.5z"/><path d="M22 24.5s-5.5-3.2-5.5-6.6a2.9 2.9 0 0 1 5.5-1.4 2.9 2.9 0 0 1 5.5 1.4c0 3.4-5.5 6.6-5.5 6.6z"/></svg>',
  camera:'<svg viewBox="0 0 44 44"><path d="M7 15.5A3.5 3.5 0 0 1 10.5 12h4l2.5-4h10l2.5 4h4a3.5 3.5 0 0 1 3.5 3.5v15a3.5 3.5 0 0 1-3.5 3.5h-23A3.5 3.5 0 0 1 7 30.5z"/><circle cx="22" cy="23" r="6.5"/></svg>',
  pagina:'<svg viewBox="0 0 44 44"><rect x="6" y="8" width="32" height="28" rx="4"/><path d="M6 15h32M10.5 11.5h.01M14 11.5h.01M13 22h18M13 27h11"/><rect x="25" y="25" width="7" height="4.5" rx="2.25"/></svg>',
  mail:'<svg viewBox="0 0 44 44"><rect x="6" y="10" width="32" height="24" rx="4"/><path d="M7.5 12.5L22 23l14.5-10.5"/></svg>',
  groei:'<svg viewBox="0 0 44 44"><path d="M7 34h30"/><path d="M9 28l8-8 6 5 11-12"/><path d="M27 13h7v7"/></svg>',
  bord:'<svg viewBox="0 0 44 44"><rect x="6" y="9" width="32" height="22" rx="4"/><path d="M16 36h12M22 31v5"/><path d="M12 25l5-6 4 3 5-7 6 5"/></svg>',
  alles:'<svg viewBox="0 0 44 44"><rect x="8" y="8" width="11" height="11" rx="3"/><rect x="25" y="8" width="11" height="11" rx="3"/><rect x="8" y="25" width="11" height="11" rx="3"/><rect x="25" y="25" width="11" height="11" rx="3"/></svg>',
  klok:'<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="14"/><path d="M22 14v8l5.5 3.5"/></svg>',
  duim:'<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="14"/><path d="M15.5 22.5l4.5 4.5 9-10"/></svg>',
  sleutel:'<svg viewBox="0 0 44 44"><circle cx="15" cy="22" r="7"/><path d="M22 22h15M32 22v5M37 22v4"/></svg>',
  foto:'<svg viewBox="0 0 16 16"><path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h1.5l1-1.5h3l1 1.5H12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 13H4a1.5 1.5 0 0 1-1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8.5" r="2.3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  video:'<svg viewBox="0 0 16 16"><rect x="1.5" y="4" width="9.5" height="8" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M11 7l3.5-2v6L11 9z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  ster:'<svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"/></svg>',
  bel:'<svg viewBox="0 0 16 16" fill="#fff"><path d="M8 1.8a3.6 3.6 0 0 0-3.6 3.6v2.4L3 10.2v.8h10v-.8l-1.4-2.4V5.4A3.6 3.6 0 0 0 8 1.8zM6.4 12a1.6 1.6 0 0 0 3.2 0z"/></svg>'
};
function ic(n){return IC[n]||''}

/* ---------- Beeldregie --------------------------------------------------------
   Elk beeldvlak op de site staat hier, met wat erin moet. De pagina
   "Beeldregie" maakt hier het draaiboek voor de shoots van. */
var DAGEN={
  A:'Draaidag A · Avond op de padelbaan',
  B:'Draaidag B · Kantoor in Hulsberg',
  C:'Draaidag C · Bij klanten op locatie',
  D:'Portretdag · Studio',
  E:'Grafisch · Geen camera nodig'
};
var SHOTS={
  'held':{v:1,dag:'A',t:'De lichten gaan aan',wat:'Schemering op een padelbaan. De lichtmasten springen een voor een aan. Het team en een paar klanten lopen het veld op, rackets in de hand. Niemand kijkt in de camera.',waar:'Padelbaan in de regio, liefst met glazen wanden en een donkere lucht erachter.',licht:'Blauw uur, daarna alleen de lichtmasten. Koel wit, diepe schaduwen.',fmt:'Video, 21:9 en 9:16. Loop van 8 tot 12 seconden, zonder geluid.'},
  'voorzet':{dag:'C',t:'De telefoon gaat',wat:'Een ondernemer in zijn eigen zaak pakt zijn telefoon op. Op het scherm een melding: nieuwe aanvraag. Scherp op hand en scherm, de zaak zacht erachter.',waar:'Bij een klant, in de zaak of werkplaats.',licht:'Warm daglicht door een raam, zijlicht.',fmt:'Foto, 21:9 en 4:5.'},
  'draaidag':{dag:'C',t:'Een draaidag op locatie',wat:'Onze videograaf filmt een vakman aan het werk. Een collega maakt tegelijk de verticale versie met de telefoon.',waar:'Bij een klant, op de werkvloer.',licht:'Bestaand licht plus één zachte lamp.',fmt:'Foto, 4:5. Plus 6 seconden video voor in de tegel.'},
  'club-padel':{dag:'A',t:'James Robinson vs Fagro',wat:'Beide teams aan het net, vlak na de laatste bal. Echte emotie, geen pose. Shirts van beide bedrijven zichtbaar.',waar:'Padelbaan, tijdens het duel.',licht:'Lichtmasten, avond.',fmt:'Foto, 3:2 en 4:5.'},
  'club-thuis':{dag:'A',t:'Padel met klanten en team',wat:'Klanten en team door elkaar aan de rand van de baan, met een drankje. Iemand lacht om een gemiste bal.',waar:'Padelbaan, na afloop.',licht:'Lichtmasten en warm licht van de kantine.',fmt:'Foto, 3:2.'},
  'club-jeugd':{dag:'B',t:'JRNXT',wat:'Een stagiair en een senior samen achter één scherm. De senior wijst, de stagiair bedient de muis.',waar:'Kantoor, aan het bureau.',licht:'Daglicht van opzij, scherm licht het gezicht op.',fmt:'Foto, 3:2.'},
  'team':{dag:'B',t:'De selectie aan tafel',wat:'Het hele team rond de grote tafel, laptops open, midden in een gesprek. Geen groepsfoto, een moment.',waar:'Kantoor in Hulsberg, de grote tafel.',licht:'Late middag, warm licht, lampen aan.',fmt:'Foto, 21:9.'},
  'kantoor':{dag:'B',t:'Plek voor stilte',wat:'Eén persoon alleen aan een bureau, koptelefoon op, volledig gefocust. Veel ruimte om hem heen.',waar:'Kantoor, de stille werkplek.',licht:'Ochtendlicht, koel.',fmt:'Foto, 4:5.'},
  'intake':{dag:'B',t:'Een uur aan tafel',wat:'Het intakegesprek. Twee mensen aan tafel, het magazine en een notitieblok tussen hen in. Over de schouder gefotografeerd.',waar:'Kantoor, de gesprekstafel.',licht:'Daglicht, zacht.',fmt:'Foto, 3:2.'},
  'pand':{dag:'B',t:'De voordeur in Hulsberg',wat:'De voordeur van het kantoor, open, met licht van binnen.',waar:'Buiten, voor het pand.',licht:'Blauw uur, binnen de lampen aan.',fmt:'Foto, 21:9.'},
  'portret':{dag:'D',t:'Spelersportretten',wat:'Elke collega apart, borst en hoofd, recht in de camera. Rustige blik, geen gekke pose. Dezelfde opstelling voor iedereen.',waar:'Studio of een donkere ruimte op kantoor.',licht:'Eén zacht hoofdlicht van boven, een blauw randlicht van achteren.',fmt:'Foto, 4:5. Per persoon ook een lachende variant.'},
  'werken':{dag:'B',t:'Een gewone dinsdag',wat:'Twee collega\'s overleggen staand bij een scherm met een campagne. Op de achtergrond loopt iemand met koffie.',waar:'Kantoor.',licht:'Daglicht.',fmt:'Foto, 21:9.'},
  'fotografie':{dag:'C',t:'De fotograaf aan het werk',wat:'Onze fotograaf bij een klant, camera aan het oog, het onderwerp in het licht. We zien het werk achter het werk.',waar:'Bij een klant.',licht:'Studioflits op locatie.',fmt:'Foto, 21:9.'},
  'videografie':{dag:'C',t:'Op de set',wat:'Camera op gimbal volgt een vakman. Monitor in beeld met het shot.',waar:'Bij een klant.',licht:'Bestaand licht plus één lamp.',fmt:'Video, 21:9, loop van 8 seconden.',v:1},
  'animatie':{dag:'E',t:'Vorm in beweging',wat:'Geen camera. Een bewegende merkvorm in JR-blauw, uit het beeldmerk: lijnen, bogen en een stippelcirkel.',waar:'Motion design.',licht:'n.v.t.',fmt:'Video, 21:9, loop.',v:1},
  'copywriting':{dag:'E',t:'Elk woord gewogen',wat:'Typografisch beeld: een kop die korter wordt, woord voor woord geschrapt.',waar:'Motion design.',licht:'n.v.t.',fmt:'Video, 21:9, loop.',v:1},
  'b-horeca':{dag:'C',t:'Horeca',wat:'Een volle zaak op vrijdagavond, gezien vanaf de bar.',waar:'Bij een klant in de horeca, met toestemming.',licht:'Warm, avond.',fmt:'Foto, 21:9.'},
  'b-makelaardij':{dag:'C',t:'Makelaardij',wat:'Een makelaar geeft de sleutel aan nieuwe eigenaren, voor de deur.',waar:'Bij een klant.',licht:'Daglicht.',fmt:'Foto, 21:9.'},
  'b-automotive':{dag:'C',t:'Automotive',wat:'Een auto rijdt de showroom uit, de verkoper kijkt mee.',waar:'Bij een klant.',licht:'Showroomlicht.',fmt:'Foto, 21:9.'},
  'b-retail':{dag:'C',t:'Retail',wat:'De winkeldeur gaat open, eerste klant van de dag.',waar:'Bij een klant.',licht:'Ochtend.',fmt:'Foto, 21:9.'},
  'b-zakelijke-dienstverlening':{dag:'C',t:'Zakelijke dienstverlening',wat:'Een kennismaking aan tafel, twee koffie, één laptop.',waar:'Bij een klant.',licht:'Daglicht.',fmt:'Foto, 21:9.'},
  'b-zorg':{dag:'C',t:'Zorg',wat:'De balie van een praktijk, iemand wordt welkom geheten. Geen herkenbare patiënt.',waar:'Bij een klant.',licht:'Zacht daglicht.',fmt:'Foto, 21:9.'},
  'b-overheid':{dag:'C',t:'Overheid',wat:'Een plein of loket in de regio, mensen in beweging.',waar:'Buiten.',licht:'Daglicht.',fmt:'Foto, 21:9.'},
  'b-sport-en-vrije-tijd':{dag:'C',t:'Sport en vrije tijd',wat:'Een groep start een activiteit, het moment vlak voor het fluitsignaal.',waar:'Bij een klant.',licht:'Middag.',fmt:'Foto, 21:9.'}
};
function beeld(id,toon,cls,opt){
  var s=SHOTS[id]||{t:id,fmt:''}, o=opt||{}, v=s.v&&!o.foto;
  var titel=(v?'Video':'Foto')+' · '+s.t;
  var tip=s.wat?esc(s.wat+' '+(s.licht?'Licht: '+s.licht+' ':'')+(s.fmt||'')):'';
  return '<div class="beeld'+(v?' beeld--video':'')+(cls?' '+cls:'')+'" data-t="'+toon+'" data-shot="'+id+'">'
    +(o.sil?'<i class="sil" aria-hidden="true"></i>':'')
    +(o.geenCap?'':'<span class="beeld-cap'+(o.capLinks?' beeld-cap--links':'')+'" title="'+tip+'">'+(v?IC.video:IC.foto)+'<span>'+esc(titel)+'</span></span>')
    +(v&&!o.geenPauze?'<button class="beeld-pauze" type="button" aria-label="Pauzeer de video"></button>':'')
    +'</div>';
}

/* ---------- Apparaten ---------- */
function tel(inhoud,cls){return '<div class="tel '+(cls||'')+'"><div class="tel-sch">'+inhoud+'</div></div>'}
var status='<div class="tel-status"><b>9:41</b><i></i></div>';
var SCHERM={
  google:function(){return status+'<div class="g-zoek">kozijnen vervangen prijs</div><div class="g-tabs"><b>Alles</b><span>Afbeeldingen</span><span>Maps</span><span>Nieuws</span></div>'
    +'<div class="g-adv"><small><em>Gesponsord</em></small><small>Voorbeeld B.V. · voorbeeld.nl</small><h5>Kozijnen vervangen in Zuid-Limburg | Vaste prijs per kozijn</h5><p>Kunststof en aluminium. Prijs binnen 24 uur, montage door eigen vakmensen.</p><div class="sl"><span>Prijzen</span><span>Offerte</span><span>Werkwijze</span></div></div>'
    +'<div class="g-adv" style="opacity:.45;border:0"><small>kozijnwiki.nl</small><h5 style="color:#1A0DAB">Wat kost een nieuw kozijn?</h5><p>Een overzicht van prijzen per materiaal en maat.</p></div>'},
  insta:function(){return status+'<div class="ig-kop"><i></i><div><b>voorbeeld.bv</b>Gesponsord</div></div><div class="ig-beeld">'+beeld('draaidag','warm','',{geenCap:1,geenPauze:1,foto:1})+'</div><div class="ig-cta">Vraag je prijs aan<span>›</span></div><div class="ig-tekst"><b>voorbeeld.bv</b> Nieuwe kozijnen. Vaste prijs per kozijn, gemonteerd door eigen vakmensen.</div>'},
  landing:function(){return '<div class="lp"><div class="lp-kop">'+beeld('draaidag','warm','',{geenCap:1,geenPauze:1,foto:1})+'</div><div class="lp-in"><h5>Nieuwe kozijnen. Vaste prijs.</h5><p>Binnen 24 uur je prijs. Montage door eigen vakmensen.</p><div class="lp-veld">Naam</div><div class="lp-veld">Telefoonnummer</div><div class="lp-veld">Aantal kozijnen</div><div class="lp-knop">Vraag je prijs aan</div></div></div>'},
  mail:function(){return status+'<div class="ml"><div class="ml-van"><i>VB</i><div><b style="font-size:11px">Voorbeeld B.V.</b><br><span style="color:#86868B;font-size:10px">aan jou · nu</span></div></div><h5>We hebben je aanvraag.</h5><p>Hoi Sanne,</p><p>Dank je wel. Morgen voor 12.00 uur bellen we je met een prijs voor je kozijnen.</p><p>Liever eerder? Bel 045 000 0000.</p><p style="color:#86868B">Team Voorbeeld</p></div>'},
  slot:function(){return status+'<div class="vergrendel"><small>dinsdag 14 oktober</small><b>9:41</b></div><div class="notif" style="margin-top:22px"><i>'+IC.bel+'</i><div><b>Nieuwe aanvraag</b><span>Offerte via Google · 3 kozijnen</span></div><small>nu</small></div><div class="notif"><i>'+IC.bel+'</i><div><b>Nieuwe aanvraag</b><span>Afspraak via Instagram</span></div><small>8 min</small></div>'},
  portaal:function(){return status+'<div style="padding:6px 16px"><small style="color:#86868B">Oktober · voorbeeldcijfers</small><div style="font:700 22px/1.1 var(--display);letter-spacing:-.03em;margin-top:2px">Overzicht</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">'+[['Aanvragen','38','+6'],['Klanten','9','+2'],['Per aanvraag','€ 52','−€ 8'],['Budget','€ 1.976','van € 2.000']].map(function(k){return '<div style="background:#F5F5F7;border-radius:12px;padding:9px 10px"><small style="color:#6E6E73;font-size:9px">'+k[0]+'</small><b style="display:block;font:700 18px/1.1 var(--display);margin-top:2px">'+k[1]+'</b><span style="font-size:9px;color:#1D7D3F">'+k[2]+'</span></div>'}).join('')+'</div>'
    +'<div style="margin-top:14px;font-size:10px;color:#6E6E73">Vandaag</div>'+[['Offerteaanvraag','Google · 09.12',0],['Afspraak','Instagram · 08.47',0],['Klant geworden','Google · gisteren',1]].map(function(a){return '<div class="pt-aanv" style="font-size:10.5px"><i'+(a[2]?' class="goal"':'')+'></i><b>'+a[0]+'</b><span>'+a[1]+'</span></div>'}).join('')+'</div>'}
};

function portaalUI(){
  var punten='M0 128 L55 120 L110 124 L165 102 L220 106 L275 84 L330 88 L385 64 L440 58 L495 44 L550 40';
  return '<div class="pt"><div class="pt-zij"><b>Portaal</b>'+['Overzicht','Aanvragen','Campagnes','Budget','Merkkluis','Rapporten'].map(function(x,i){return '<span'+(i===0?' class="op"':'')+'>'+x+'</span>'}).join('')+'</div>'
    +'<div class="pt-hoofd"><div class="pt-titel"><h6>Oktober</h6><small>Voorbeeldcijfers · elk uur bijgewerkt</small></div>'
    +'<div class="pt-kpis">'+[['Aanvragen','38','+6 t.o.v. september'],['Nieuwe klanten','9','+2'],['Kosten per aanvraag','€ 52','−€ 8'],['Advertentiebudget','€ 1.976','van € 2.000']].map(function(k){return '<div class="pt-kpi"><small>'+k[0]+'</small><b>'+k[1]+'</b><span>'+k[2]+'</span></div>'}).join('')+'</div>'
    +'<div class="pt-ond"><div class="pt-blok"><small>Aanvragen per week</small><svg viewBox="0 0 550 150" preserveAspectRatio="none"><defs><linearGradient id="ptg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#007AFF" stop-opacity=".22"/><stop offset="1" stop-color="#007AFF" stop-opacity="0"/></linearGradient></defs><path d="'+punten+' V150 H0Z" fill="url(#ptg)"/><path class="pt-lijn" d="'+punten+'" fill="none" stroke="#007AFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'
    +'<div class="pt-blok"><small>Laatste aanvragen</small><div style="margin-top:.4em">'+[['Offerteaanvraag','Google · 09.12',0],['Afspraak','Instagram · 08.47',0],['Klant geworden','Google · gisteren',1],['Offerteaanvraag','LinkedIn · gisteren',0]].map(function(a){return '<div class="pt-aanv"><i'+(a[2]?' class="goal"':'')+'></i><b>'+a[0]+'</b><span>'+a[1]+'</span></div>'}).join('')+'</div></div></div>'
    +'<div class="pt-blok" style="margin-top:1em"><small>Aanvragen per kanaal</small>'+[['Google Ads',24,100],['Meta',11,46],['LinkedIn',3,13]].map(function(k){return '<div style="display:grid;grid-template-columns:7em 1fr 2em;align-items:center;gap:.8em;margin-top:.7em"><span>'+k[0]+'</span><i style="display:block;height:.55em;border-radius:.3em;background:#007AFF;width:'+k[2]+'%"></i><b style="text-align:right">'+k[1]+'</b></div>'}).join('')+'</div></div></div>';
}
function laptop(){return '<div class="laptop"><div class="laptop-sch"><div class="laptop-in">'+portaalUI()+'</div></div><div class="laptop-voet"></div></div>'}

/* ---------- Bouwstenen ---------- */
function rail(id,kaarten,cls){return '<div class="rail '+(cls||'')+'" id="'+id+'">'+kaarten.join('')+'</div><div class="wrap"><div class="rail-pijlen" data-rail="'+id+'"><button type="button" aria-label="Vorige"></button><button type="button" aria-label="Volgende"></button></div></div>'}
function stat(klein,groot,onder,noot){return '<div class="stat"><small>'+klein+'</small><b>'+groot+(noot?'<sup class="vn"><a href="#noten">'+noot+'</a></sup>':'')+'</b><span>'+onder+'</span></div>'}
function sterren(){return '<div class="tribune" aria-label="Vijf sterren">'+[1,2,3,4,5].map(function(){return IC.ster}).join('')+'</div>'}

/* Pakketten: één bron voor de homepage, prijzen en de rekenhulp */
var PAKKETTEN=[
  {n:'Starter',p:1000,c:1,bud:'€ 1.000 – 2.500',cr:'Elk kwartaal',dd:'1 per jaar',pr:'Elk kwartaal'},
  {n:'Playmaker',p:1500,c:2,bud:'€ 2.500 – 5.000',cr:'Elke 2 maanden',dd:'2 per jaar',pr:'Elke 2 maanden'},
  {n:'Captain',p:2000,c:3,bud:'€ 5.000 – 7.500',cr:'Elke maand',dd:'3 per jaar',pr:'Elke maand'},
  {n:'Champion',p:2500,c:4,bud:'Vanaf € 7.500',cr:'2 per maand',dd:'4 per jaar',pr:'Elke maand'}
];
function vergelijking(link){
  return '<div class="vgl">'+PAKKETTEN.map(function(p){
    var sp='';for(var i=0;i<p.c;i++)sp+='<i></i>';
    return '<div'+(p.top?' class="uitgelicht"':'')+'><div class="spelers" aria-label="'+p.c+' campagne'+(p.c>1?'s':'')+' tegelijk">'+sp+'</div><h3>'+p.n+'</h3><div class="prijs">'+euro(p.p)+'</div><div class="pm">per maand</div>'
      +'<ul><li><small>Tegelijk live</small><b>'+p.c+' campagne'+(p.c>1?'s':'')+'</b></li><li><small>Advertentiebudget</small><b>'+p.bud+'</b><span>per maand, rechtstreeks aan het platform</span></li><li><small>Nieuwe content</small><b>'+p.cr+'</b></li><li><small>Draaidagen</small><b>'+p.dd+'</b></li><li><small>Performance Review</small><b>'+p.pr+'</b></li></ul>'
      +(link?'<a class="ln-k" href="#/past-het">Start met '+p.n+'</a>':'')+'</div>'}).join('')+'</div>';
}

/* ==========================================================================
   Merkelementen: beeldmerk, woordmerk, tape, lint en het 3D-object
   ========================================================================== */
/* Beeldmerk, nagetekend uit de Momentum-visual. Vervang door de officiële SVG. */
function bm(cls){return '<svg class="bm '+(cls||'')+'" viewBox="0 0 64 72" aria-hidden="true"><path d="M10.6 32V9.2H54.8C54.8 19 52 26.5 46.5 31.5"/><path d="M8 31.5H53.6V41C53.6 56 44 66.6 33 66.6C22 66.6 12.6 57 10.4 47.4L33 41.6"/><path d="M33 31.5V66.6"/></svg>'}
function woordmerk(){return '<span class="woordmerk">James<br>Robinson</span>'}

/* Tape: twee banden die schuin over de naad tussen twee secties lopen */
var TAPE=['Momentum first','Mastery later','Numbers don\'t lie','Likes don\'t pay the bills','Data beats opinion','Resultaat staat op één'];
function tapeRij(woorden){var r=woorden.map(function(w){return '<span>'+w+'</span>'+bm()}).join('');return '<div class="tape-rij">'+r+r+r+'</div><div class="tape-rij" aria-hidden="true">'+r+r+r+'</div>'}
function tapes(a,b){return '<div class="tapes" aria-hidden="true"><div class="tape tape--nacht">'+tapeRij(b||TAPE.slice(2).concat(TAPE.slice(0,2)))+'</div><div class="tape tape--lime">'+tapeRij(a||TAPE)+'</div></div>'}

/* Lint: een dikke lus, als een groeicurve die even omkeert en dan doorschiet */
function lint(){
  var d='M-80 690 C 320 700, 720 650, 920 500 S 1060 170, 1190 200 S 1320 440, 1170 480 S 990 340, 1170 250 S 1400 150, 1560 70';
  return '<div class="lint" aria-hidden="true"><svg viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="lintg" x1="0" x2="1" y1="1" y2="0"><stop offset="0" stop-color="#9DC000"/><stop offset=".45" stop-color="#C4F000"/><stop offset="1" stop-color="#E6FF6A"/></linearGradient></defs>'
    +'<path class="onder teken" d="'+d+'" stroke-width="120" transform="translate(10 16)"/><path class="boven teken" d="'+d+'" stroke-width="112"/></svg></div>';
}

/* 3D-object: een duim omhoog, uitgezet in lagen zoals de Strava-like */
function duim3d(){
  var d='M66 104 L96 40 C100 30 112 28 118 36 C122 42 122 50 120 56 L112 86 H160 C172 86 180 96 176 108 L162 160 C159 170 152 176 142 176 H66 Z M24 100 H52 V178 H24 Z';
  var lagen='';for(var i=12;i>0;i--)lagen+='<path d="'+d+'" transform="translate('+(i*1.4)+' '+(i*1.6)+')"/>';
  return '<svg class="object3d" viewBox="0 0 220 220" aria-hidden="true" style="transform:rotate(-14deg)"><g class="schaduw">'+lagen+'</g><g class="voor"><path d="'+d+'"/></g></svg>';
}

/* Kop met gewichtscontrast: "Vet deel." "Licht deel." */
function vl(cls,vet,licht,tag){tag=tag||'h2';return '<'+tag+' class="'+cls+'">'+vet+(licht?' <span class="l">'+licht+'</span>':'')+'</'+tag+'>'}

/* ==========================================================================
   Logo's van de kanalen. Facebook, Instagram, TikTok en YouTube uit Simple
   Icons (CC0), in de officiële kleuren. Google en LinkedIn nagebouwd.
   ========================================================================== */
var LOGO={
  google:'<svg viewBox="0 0 24 24" aria-label="Google"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24" aria-label="Facebook"><circle cx="12" cy="12" r="11.6" fill="#fff"/><path fill="#0866FF" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>',
  instagram:'<svg viewBox="0 0 24 24" aria-label="Instagram"><defs><radialGradient id="igg" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#FDF497"/><stop offset=".05" stop-color="#FDF497"/><stop offset=".45" stop-color="#FD5949"/><stop offset=".6" stop-color="#D6249F"/><stop offset=".9" stop-color="#285AEB"/></radialGradient></defs><path fill="url(#igg)" d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24" aria-label="TikTok"><path fill="#25F4EE" transform="translate(-.7 -.6)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path fill="#FE2C55" transform="translate(.7 .6)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path fill="#111" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  youtube:'<svg viewBox="0 0 24 24" aria-label="YouTube"><rect x=".5" y="3.6" width="23" height="16.8" rx="4.4" fill="#FF0000"/><path d="M9.6 8.4v7.2l6.2-3.6z" fill="#fff"/></svg>',
  linkedin:'<svg viewBox="0 0 24 24" aria-label="LinkedIn"><rect width="24" height="24" rx="4" fill="#0A66C2"/><circle cx="6.6" cy="6.7" r="1.75" fill="#fff"/><rect x="5.1" y="9.4" width="3" height="9.6" fill="#fff"/><path fill="#fff" d="M10.2 9.4h2.9v1.3c.4-.8 1.5-1.6 3.1-1.6 3.2 0 3.8 2.1 3.8 4.8V19h-3v-4.6c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19h-3z"/></svg>'
};
var KANALEN=[['google','Google'],['youtube','YouTube'],['facebook','Facebook'],['instagram','Instagram'],['linkedin','LinkedIn'],['tiktok','TikTok']];
function logo(n,cls){return '<span class="logo '+(cls||'')+'">'+LOGO[n]+'</span>'}

/* ==========================================================================
   Mock-ups in de huisstijl van James Robinson: eigen advertenties, eigen
   landingspagina, eigen magazine. Op telefoon, iPad, laptop, scherm en papier.
   ========================================================================== */

/* ---------- Creatieven ---------- */
function creatief(soort){
  var c={
    momentum:['gr gr--merk','<b>Momentum first.</b><i>Mastery later.</i>'],
    likes:['gr gr--vuur','<b>Likes don\'t</b><i>pay the bills.</i>'],
    motor:['gr gr--blauw','<b>Een motor.</b><i>Geen gok.</i>'],
    check:['gr gr--nacht','<b>15 vragen.</b><i>Eén eerlijk antwoord.</i><em>Start de check</em>'],
    zeven:['gr gr--nacht','<u>7×</u><i>vaker een echt gesprek als je binnen een uur belt.</i>'],
    video:['gr gr--merk','<b>Dag 19.</b><i>Aftrap.</i><span class="cr-play"></span><span class="cr-balk"><s></s></span>']
  }[soort]||['gr gr--merk',''];
  return '<div class="cr '+c[0]+'"><span class="cr-top"><span class="woordmerk">James<br>Robinson</span>'+bm()+'</span><span class="cr-tekst">'+c[1]+'</span></div>';
}

/* ---------- Apparaten ---------- */
function browser(inhoud,url,cls){return '<div class="br '+(cls||'')+'"><div class="br-balk"><i></i><i></i><i></i><span>'+(url||'jamesrobinson.nl')+'</span></div><div class="br-in">'+inhoud+'</div></div>'}
function laptopMet(inhoud,cls){return '<div class="lt '+(cls||'')+'"><div class="lt-sch"><div class="lt-in">'+inhoud+'</div></div><div class="lt-voet"></div></div>'}
function ipad(inhoud,cls){return '<div class="ip '+(cls||'')+'"><div class="ip-in">'+inhoud+'</div></div>'}
function monitor(inhoud,cls){return '<div class="mo '+(cls||'')+'"><div class="mo-sch"><div class="mo-in">'+inhoud+'</div></div><div class="mo-kin"></div><div class="mo-voet"></div></div>'}
function papier(inhoud,cls){return '<div class="pa '+(cls||'')+'">'+inhoud+'</div>'}
function telefoon(inhoud,cls){return '<div class="tf '+(cls||'')+'"><div class="tf-in">'+inhoud+'</div></div>'}

/* ---------- Advertenties per kanaal ---------- */
var AVATAR='<i class="av">'+'<svg viewBox="0 0 64 72"><g fill="none" stroke="#fff" stroke-width="6"><path d="M10.6 32V9.2H54.8C54.8 19 52 26.5 46.5 31.5"/><path d="M8 31.5H53.6V41C53.6 56 44 66.6 33 66.6C22 66.6 12.6 57 10.4 47.4L33 41.6"/><path d="M33 31.5V66.6"/></g></svg></i>';
var ADV={
  google:function(){return '<div class="g"><div class="g-kop">'+LOGO.google+'<span class="g-zoek">marketingbureau zuid-limburg</span></div>'
    +'<div class="g-adv"><small><b>Gesponsord</b></small><div class="g-site">'+AVATAR+'<span>James Robinson<br><s>www.jamesrobinson.nl</s></span></div><h5>Performance-marketingbureau in Zuid-Limburg | James Robinson</h5><p>Meer aanvragen via Google en social. Elke maand meetbaar, maandelijks opzegbaar. Start de check.</p><div class="g-sl"><span>Prijzen</span><span>De check</span><span>Werkwijze</span><span>Cases</span></div></div>'
    +'<div class="g-org"><s></s><s></s><s style="width:60%"></s></div></div>'},
  linkedin:function(){return '<div class="so so--li"><div class="so-kop">'+AVATAR+'<div><b>James Robinson</b><small>Gepromoot</small></div>'+logo('linkedin','so-merk')+'</div><p class="so-tekst">Marketing zonder cijfers is hoop. Wij laten je elke maand zien wat het oplevert.</p>'+creatief('momentum')+'<div class="so-cta"><span>jamesrobinson.nl<br><b>Vijftien vragen. Eén eerlijk antwoord.</b></span><em>Meer info</em></div></div>'},
  facebook:function(){return '<div class="so so--fb"><div class="so-kop">'+AVATAR+'<div><b>James Robinson</b><small>Gesponsord</small></div>'+logo('facebook','so-merk')+'</div><p class="so-tekst">Likes zijn leuk. Klanten zijn beter.</p>'+creatief('likes')+'<div class="so-cta"><span>JAMESROBINSON.NL<br><b>Start de check</b></span><em>Meer info</em></div></div>'},
  story:function(){return '<div class="st">'+creatief('likes')+'<div class="st-kop">'+AVATAR+'<b>jamesrobinson.nl</b><small>Gesponsord</small></div><div class="st-cta">Start de check</div></div>'},
  tiktok:function(){return '<div class="tt">'+creatief('video')+'<div class="tt-zij"><i></i><i></i><i></i><i></i></div><div class="tt-tekst"><b>@jamesrobinson.nl</b> Dag 0 tekenen, dag 19 live. #performance<small>Gesponsord</small></div><div class="tt-cta">Start de check</div></div>'},
  youtube:function(){return '<div class="yt">'+creatief('motor')+'<span class="yt-adv">Advertentie · 0:06</span><span class="yt-skip">Overslaan ›</span><div class="yt-balk"><s></s></div></div>'},
  landing:function(smal){return '<div class="lp2'+(smal?' lp2--smal':'')+'"><div class="lp2-nav"><span class="woordmerk">James<br>Robinson</span><em>Start de check</em></div><div class="lp2-held gr gr--merk"><b>Vijftien vragen.</b><i>Eén eerlijk antwoord.</i><p>Je weet meteen of we samen het veld op gaan. Met de rekensom erbij.</p></div><div class="lp2-form"><span>Aan wie verkoop je</span><div><s class="op">Aan bedrijven</s><s>Aan particulieren</s><s>Allebei</s></div><em class="lp2-knop">Volgende</em></div></div>'},
  magazine:function(){return '<div class="mg gr gr--merk"><span class="cr-top"><span class="woordmerk">James<br>Robinson</span>'+bm()+'</span><b>The Performance Issue</b><i>Editie 01</i><small>Hoe wij werken. Wat het kost. Wat het oplevert.</small></div>'}
};

/* ---------- Het scorebord in de huisstijl ---------- */
function scorebord(){
  var lijn='M0 118 L50 112 L100 116 L150 96 L200 100 L250 80 L300 84 L350 62 L400 56 L450 44 L500 38';
  return '<div class="sb"><aside class="sb-zij"><span class="sb-merk">'+bm()+'<b>Portaal</b></span>'+['Overzicht','Aanvragen','Campagnes','Budget','Merkkluis'].map(function(x,i){return '<span'+(i===0?' class="op"':'')+'>'+x+'</span>'}).join('')+'</aside>'
    +'<div class="sb-hoofd"><div class="sb-titel"><h6>Oktober</h6><small>Voorbeeldcijfers</small></div>'
    +'<div class="sb-kpis">'+[['Aanvragen','38','+6'],['Nieuwe klanten','9','+2'],['Per aanvraag','€ 52','−€ 8'],['Budget','€ 1.976','van € 2.000']].map(function(k){return '<div><small>'+k[0]+'</small><b>'+k[1]+'</b><span>'+k[2]+'</span></div>'}).join('')+'</div>'
    +'<div class="sb-ond"><div class="sb-blok"><small>Aanvragen per week</small><svg viewBox="0 0 500 130" preserveAspectRatio="none"><defs><linearGradient id="sbg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3B80C6" stop-opacity=".3"/><stop offset="1" stop-color="#3B80C6" stop-opacity="0"/></linearGradient></defs><path d="'+lijn+' V130 H0Z" fill="url(#sbg)"/><path class="teken-lijn" d="'+lijn+'" fill="none" stroke="#1E4E95" stroke-width="3" stroke-linecap="round"/></svg></div>'
    +'<div class="sb-blok"><small>Per kanaal</small>'+[['google',24,100],['facebook',8,34],['linkedin',4,17],['tiktok',2,9]].map(function(k){return '<div class="sb-kn">'+logo(k[0])+'<i><s style="width:'+k[2]+'%"></s></i><b>'+k[1]+'</b></div>'}).join('')+'</div></div></div></div>';
}

/* De oude telefoonschermen tonen voortaan ook James Robinson zelf */
SCHERM.google=function(){return status+'<div style="background:#fff">'+ADV.google()+'</div>'};
SCHERM.insta=function(){return '<div style="position:relative;height:100%">'+ADV.story()+'</div>'};
SCHERM.landing=function(){return ADV.landing(true)};
SCHERM.mail=function(){return status+'<div class="ml"><div class="ml-van">'+AVATAR+'<div><b style="font-size:11px">James Robinson</b><br><span style="color:#86868B;font-size:10px">aan jou · nu</span></div></div><h5>We hebben je check ontvangen.</h5><p>Hoi Sanne,</p><p>Dank je wel. Je uitkomst staat hieronder, met de rekensom erbij. Morgen bellen we je om een intakegesprek te plannen.</p><p style="color:#86868B">Team James Robinson</p></div>'};
SCHERM.slot=function(){return status+'<div class="vergrendel"><small>dinsdag 14 oktober</small><b>9:41</b></div><div class="notif" style="margin-top:22px"><i>'+IC.bel+'</i><div><b>Nieuwe aanvraag</b><span>Check ingevuld via Google</span></div><small>nu</small></div><div class="notif"><i>'+IC.bel+'</i><div><b>Nieuwe aanvraag</b><span>Kennismaking via LinkedIn</span></div><small>8 min</small></div>'};

