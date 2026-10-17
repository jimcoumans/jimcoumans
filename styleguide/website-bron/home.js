/* ==========================================================================
   Homepage, ronde 4: geschreven vanuit de ondernemer, niet vanuit ons.

   De lijn:
   1. Hero        wat jij krijgt, in jouw woorden (per branche)
   2. Herkenning  jouw situatie, in feiten
   3. Rekensom    onze expertise, meteen voelbaar: wat een aanvraag jou mag kosten
   4. Aanpak      wat wij doen, en wat jij daarvan merkt
   5. Inzicht     wat wij elke dag zien, met bron
   6. Verschil    wat je bij ons nooit krijgt, en wat altijd
   7. Portaal     bewijs van transparantie
   8. Prijzen     alles op tafel
   9. Starten     van eerste klik tot eerste aanvraag
   10. Team       de mensen, en waarom "Momentum first"
   11. Bewijs     reviews (cases volgen)
   12. Eerlijk    voor wie wel en niet
   13. Vragen     de bezwaren die iedereen heeft
   14. Slot
   ========================================================================== */
var PAGINA={};

/* Per branche: het woord voor een aanvraag en hoe die binnenkomt */
var BRANCHE={
  '':{n:'Alle branches',mv:'aanvragen',ev:'aanvraag',feed:[['google','Offerteaanvraag','via Google · zoeken'],['instagram','Afspraak','via Instagram · story'],['linkedin','Kennismaking','via LinkedIn'],['facebook','Offerteaanvraag','via Facebook · feed']]},
  'horeca':{n:'Horeca',mv:'reserveringen',ev:'reservering',feed:[['google','Reservering · 4 personen','zaterdag 19.30 · via Google'],['instagram','Groepsaanvraag · 22 personen','kerstdiner · via Instagram'],['facebook','Reservering · 2 personen','vrijdag 18.00 · via Facebook'],['google','Arrangement · 6 personen','zondag · via Google Maps']]},
  'makelaardij':{n:'Makelaardij',mv:'waardebepalingen',ev:'waardebepaling',feed:[['facebook','Waardebepaling','Valkenburg · via Facebook'],['google','Waardebepaling','Heerlen · via Google'],['instagram','Verkoopgesprek','Sittard · via Instagram'],['google','Waardebepaling','Hulsberg · via Google']]},
  'automotive':{n:'Automotive',mv:'proefritten',ev:'proefrit',feed:[['instagram','Proefrit','elektrisch · via Instagram'],['google','Inruilvoorstel','via Google'],['facebook','Proefrit','occasion · via Facebook'],['google','Werkplaatsafspraak','via Google Maps']]},
  'retail':{n:'Retail',mv:'afspraken',ev:'afspraak',feed:[['instagram','Afspraak in de winkel','zaterdag · via Instagram'],['google','Route naar de winkel','via Google Maps'],['facebook','Aanvraag maatwerk','via Facebook'],['google','Afspraak','via Google']]},
  'zakelijke-dienstverlening':{n:'Zakelijk',mv:'kennismakingen',ev:'kennismaking',feed:[['linkedin','Kennismaking','directeur · via LinkedIn'],['google','Offerteaanvraag','via Google'],['linkedin','Terugbelverzoek','HR-manager · via LinkedIn'],['google','Kennismaking','via Google']]},
  'zorg':{n:'Zorg',mv:'intakes',ev:'intake',feed:[['google','Intake aangevraagd','via Google'],['facebook','Terugbelverzoek','via Facebook'],['google','Afspraak','via Google Maps'],['instagram','Intake aangevraagd','via Instagram']]},
  'overheid':{n:'Overheid',mv:'aanmeldingen',ev:'aanmelding',feed:[['facebook','Aanmelding','informatieavond · via Facebook'],['instagram','Aanmelding','via Instagram'],['google','Aanmelding','via Google'],['facebook','Aanmelding','wijkbijeenkomst · via Facebook']]},
  'sport-en-vrije-tijd':{n:'Sport en vrije tijd',mv:'boekingen',ev:'boeking',feed:[['instagram','Boeking · 8 personen','via Instagram'],['tiktok','Boeking · groep','via TikTok'],['google','Boeking · 2 personen','via Google'],['facebook','Lidmaatschap','via Facebook']]}
};
function feedHtml(b){return b.feed.map(function(f,i){return '<li style="animation-delay:'+(i*1.1)+'s">'+logo(f[0])+'<span><b>'+f[1]+'</b><small>'+f[2]+'</small></span><em'+(i===2?' class="goal"':'')+'>'+(i===2?'Klant':i===0?'Nu':(i*7)+' min')+'</em></li>'}).join('')}

PAGINA.home=function(){
  var h='', B=BRANCHE[''];

  /* 1. Hero: wat jij krijgt */
  h+='<section class="gr gr--merk held4" aria-labelledby="h-held"><i class="vlek vlek-1" aria-hidden="true"></i><i class="vlek vlek-2" aria-hidden="true"></i>'
    +'<div class="wrap held4-in"><div class="held4-tekst">'
    +'<h1 class="ph-h1 rv">Performance-marketingbureau in Zuid-Limburg</h1>'
    +'<p class="held4-kop rv rv-2" id="h-held">Meer <span data-b="mv">'+B.mv+'</span>.<span class="l">Elke maand. Niet alleen als het meezit.</span></p>'
    +'<p class="held4-lead rv rv-3">Wij adverteren voor ondernemers in Zuid-Limburg, in Google en op social media. Jij ziet elke <span data-b="ev">'+B.ev+'</span> binnenkomen en wat hij kostte. Werkt het niet, dan zeggen we het zelf.</p>'
    +'<div class="knoppen rv rv-3"><a class="knop knop--lime knop--groot" href="#rekensom">Reken het uit</a><a class="knop knop--rand knop--groot" href="#/past-het">Start de check</a></div>'
    +'<div class="branches rv rv-4" role="group" aria-label="Kies je branche"><small>Jouw branche:</small>'+Object.keys(BRANCHE).filter(Boolean).map(function(k){return '<button type="button" data-branche="'+k+'">'+BRANCHE[k].n+'</button>'}).join('')+'</div>'
    +'</div>'
    +'<div class="held4-beeld rv rv-2"><div class="h4-kaart"><div class="h4-kop">'+bm()+'<span><b>Portaal</b><small>Voorbeeld</small></span><span class="h4-live"><i></i>Live</span></div>'
    +'<div class="h4-getal"><small>Nieuwe <span data-b="mv">'+B.mv+'</span> deze maand</small><b data-tel="38">0</b><span>+6 ten opzichte van vorige maand</span></div>'
    +'<ul class="feed feed--held" data-feed>'+feedHtml(B)+'</ul></div></div>'
    +'</div></section>';
  h+=tapes(['Google','YouTube','Facebook','Instagram','LinkedIn','TikTok'],['Resultaat staat op één','Numbers don\'t lie','Likes don\'t pay the bills','Maandelijks opzegbaar','Alles op jouw naam']);

  /* 2. Herkenning */
  h+='<section class="s s--wit"><div class="wrap"><div class="sk"><span class="eyebrow rv">Herkenbaar</span>'+vl('h1 rv','Goed in je vak.','Onvoorspelbaar in je agenda.')
    +'<p class="lead rv rv-2">Je klanten zijn tevreden en komen terug. Alleen weet je nooit hoeveel nieuwe er volgende maand bijkomen. Daar is wat aan te doen, met cijfers in plaats van hoop.</p></div>'
    +'<div class="herk">'
    +'<div class="rv"><span class="herk-nr">01</span><h3>Mond-tot-mond is je beste verkoper.</h3><p>Alleen bepaal jij niet wanneer hij langskomt. Een drukke maand en een stille maand wisselen elkaar af, en je kunt er niet op plannen.</p></div>'
    +'<div class="rv rv-2"><span class="herk-nr">02</span><h3>Je weet wat marketing kost. Niet wat het oplevert.</h3><p>Een rapport over bereik en likes zegt niets over je omzet. De enige vraag die telt: hoeveel aanvragen, en wat kostte elke aanvraag.</p></div>'
    +'<div class="rv rv-3"><span class="herk-nr">03</span><h3>Posten kost tijd. Het levert weinig op.</h3><p>Een bericht bereikt gemiddeld 1 tot 3% van je eigen volgers.<sup class="vn"><a href="#noten">1</a></sup> Die kenden je al. Nieuwe klanten vind je ergens anders.</p></div>'
    +'</div></div></section>';

  /* 3. De rekensom: expertise die je meteen voelt */
  h+='<section class="s gr gr--nacht" id="rekensom"><div class="wrap"><div class="rs">'
    +'<div class="sk"><span class="eyebrow rv">De rekensom</span>'+vl('h1 rv','Reken eerst.','Adverteer daarna.')
    +'<p class="lead rv rv-2">Niet beginnen bij een budget, maar bij wat een klant jou oplevert. Daaruit volgt wat een <span data-b="ev">aanvraag</span> mag kosten, en dus of adverteren voor jou loont. Vul je eigen getallen in.</p>'
    +'<p class="mini rv rv-3" style="color:rgba(255,255,255,.55);margin-top:18px">Een rekensom, geen belofte. In de check en het intakegesprek rekenen we hem door met jouw echte cijfers.</p></div>'
    +'<div class="rs-kaart rv rv-2">'
    +'<div class="rs-r"><label for="rs-w"><span>Wat een nieuwe klant je in het eerste jaar oplevert</span> <b id="rs-ow"></b></label><input type="range" id="rs-w" min="250" max="25000" step="250" value="3000"></div>'
    +'<div class="rs-r"><label for="rs-c"><span>Hoeveel van de 10 <span data-b="mv">aanvragen</span> klant worden</span> <b id="rs-oc"></b></label><input type="range" id="rs-c" min="1" max="9" step="1" value="3"></div>'
    +'<div class="rs-r"><label for="rs-k"><span>Hoeveel nieuwe klanten je per maand wilt</span> <b id="rs-ok"></b></label><input type="range" id="rs-k" min="1" max="40" step="1" value="5"></div>'
    +'<div class="rs-uit"><div><small>Een <span data-b="ev">aanvraag</span> mag je maximaal kosten</small><b id="rs-max">€ 0</b><span>Bij 30% marge. Daaronder verdien je aan elke klant.</span></div>'
    +'<div><small>Daarvoor heb je per maand nodig</small><b id="rs-aanv">0</b><span id="rs-uitleg"></span></div></div>'
    +'<a class="knop knop--lime" style="margin-top:22px" href="#/past-het">Reken het door met je echte cijfers</a></div>'
    +'</div></div></section>';

  /* 4. Aanpak: wat wij doen, wat jij merkt */
  h+='<section class="s gr gr--licht"><div class="wrap"><div class="sk"><span class="eyebrow rv">Hoe het werkt</span>'+vl('h1 rv','Wij doen het werk.','Jij merkt het aan je agenda.')+'</div>'
    +'<div class="b3">'
    +'<article class="t3 t3--breed rv"><div class="t3-tekst"><span class="eyebrow">1 · Gevonden worden</span><h3>We staan er <span class="l">op het moment dat je klant kijkt.</span></h3>'
      +'<p>In Google als iemand zoekt wat jij verkoopt. Op Facebook, Instagram, LinkedIn, TikTok en YouTube bij wie lijkt op je beste klanten. We kiezen de kanalen op de cijfers en schuiven elke week budget naar wat oplevert.</p>'
      +'<p class="t3-merk"><b>Wat jij merkt:</b> meer mensen die jou vinden, terwijl je gewoon aan het werk bent.</p>'
      +'<div class="kn-rij">'+KANALEN.map(function(k){return '<span>'+logo(k[0])+k[1]+'</span>'}).join('')+'</div></div>'
      +'<div class="adv-stage"><div class="adv-g">'+browser(ADV.google(),'google.nl/search')+'</div><div class="adv-li">'+ADV.linkedin()+'</div><div class="adv-st">'+telefoon(ADV.story())+'</div></div></article>'
    +'<article class="t3 t3--half t3--donker rv"><div class="t3-tekst"><span class="eyebrow">2 · Opvallen</span><h3>Beeld van jouw zaak. <span class="l">Geen stockfoto.</span></h3><p>We filmen en fotograferen bij jou op locatie en maken er steeds nieuwe advertenties van. Een advertentie slijt; wie blijft verversen, blijft opvallen.</p><p class="t3-merk"><b>Wat jij merkt:</b> een dagdeel filmen per draaidag. De rest doen wij.</p></div>'
      +'<div class="t3-beeld"><div class="wand" aria-hidden="true">'+[['momentum','cr--staand','likes','','zeven','cr--liggend'],['video','cr--staand','check','','motor','cr--staand']].map(function(kol){var r='';for(var i=0;i<kol.length;i+=2)r+=creatief(kol[i]).replace('class="cr ','class="cr '+kol[i+1]+' ');return '<div class="wand-kol">'+r+r+'</div>'}).join('')+'</div></div></article>'
    +'<article class="t3 t3--half rv rv-2"><div class="t3-tekst"><span class="eyebrow">3 · Overtuigen</span><h3>Een pagina <span class="l">die verkoopt.</span></h3><p>Elke campagne krijgt een eigen pagina op jouw website, met één boodschap en één knop. Twee van de honderd bezoekers doen iets; wij zorgen dat het er meer worden.</p><p class="t3-merk"><b>Wat jij merkt:</b> meer aanvragen uit hetzelfde budget.</p></div>'
      +'<div class="t3-beeld"><div class="ld-stage">'+laptopMet(ADV.landing())+ipad(ADV.landing(true))+'<span class="ld-cursor" aria-hidden="true"></span><span class="ld-toast"><i></i><span>Aanvraag verstuurd<small>zojuist</small></span></span></div></div></article>'
    +'<article class="t3 t3--breed rv"><div class="t3-tekst"><span class="eyebrow">4 · Bijsturen</span><h3>Elke ochtend om 7.00 uur <span class="l">een controle.</span></h3><p>Wat buiten de lijntjes valt, zien wij voordat jij het merkt: een advertentie die wordt afgekeurd, een formulier dat niet werkt, kosten die oplopen. Elke maand een update, en wat werkt krijgt meer budget.</p><p class="t3-merk"><b>Wat jij merkt:</b> <span data-b="mv">aanvragen</span> die elke maand iets minder kosten.</p></div>'
      +'<div class="av-stage"><div class="av-kaart"><small>Kosten per <span data-b="ev">aanvraag</span></small><span class="getal">€ 52</span><span class="plus">−€ 8 ten opzichte van vorige maand</span>'
      +'<svg viewBox="0 0 300 120" preserveAspectRatio="none"><defs><linearGradient id="avg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3B80C6" stop-opacity=".25"/><stop offset="1" stop-color="#3B80C6" stop-opacity="0"/></linearGradient></defs><path d="M0 22 L30 30 L60 26 L90 44 L120 40 L150 58 L180 55 L210 70 L240 74 L270 86 L300 90 V120 H0Z" fill="url(#avg)"/><path class="teken-lijn" d="M0 22 L30 30 L60 26 L90 44 L120 40 L150 58 L180 55 L210 70 L240 74 L270 86 L300 90" fill="none" stroke="#1E4E95" stroke-width="2.5" stroke-linecap="round"/></svg><small style="margin-top:8px">Voorbeeldcijfers</small></div>'
      +'<ul class="feed feed--rustig"><li>'+IC.klok.replace('<svg','<svg class="fi"')+'<span><b>Dagmail 7.00 uur</b><small>Alles binnen de lijntjes</small></span><em>OK</em></li><li>'+logo('google')+'<span><b>Budget verschoven</b><small>Van display naar zoeken</small></span><em>Gedaan</em></li><li>'+logo('instagram')+'<span><b>Nieuwe variant live</b><small>Story uit de draaidag</small></span><em>Test</em></li></ul></div></article>'
    +'</div></div></section>';

  /* 5. Inzicht: wat wij elke dag zien */
  h+='<section class="s s--zwart"><div class="wrap"><div class="sk"><span class="eyebrow rv">Wat wij elke dag zien</span>'+vl('h1 rv','Vier lessen','die je geld besparen.')
    +'<p class="lead rv rv-2">Geen meningen. Feiten uit onderzoek en uit het vak, en wat we ermee doen.</p></div>'
    +'<div class="inz">'
    +'<article class="rv"><b>7×</b><h3>Wie het snelst belt, wint.</h3><p>Bedrijven die binnen een uur reageerden, hadden bijna zeven keer zo vaak een serieus gesprek als bedrijven die later belden.<sup class="vn"><a href="#noten">2</a></sup></p><span>Daarom spreken we vooraf af hoe snel je belt, en meten we het.</span></article>'
    +'<article class="rv rv-2"><b>+50%</b><h3>Van 2 naar 3% conversie.</h3><p>Doen 3 in plaats van 2 van de 100 bezoekers een aanvraag, dan heb je de helft meer <span data-b="mv">aanvragen</span>. Voor hetzelfde budget.</p><span>Daarom werken we eerst aan je pagina, en pas daarna aan je budget.</span></article>'
    +'<article class="rv rv-3"><b>10–20%</b><h3>De meeste ideeën werken niet.</h3><p>Bij Google verbetert maar 10 tot 20% van de geteste ideeën het resultaat.<sup class="vn"><a href="#noten">4</a></sup> Ook goede ideeën van slimme mensen.</p><span>Daarom testen we, ook onze eigen ideeën. De cijfers kiezen.</span></article>'
    +'<article class="rv rv-4"><b>1–3%</b><h3>Likes don\'t pay the bills.</h3><p>Een bericht bereikt gemiddeld 1 tot 3% van je eigen volgers.<sup class="vn"><a href="#noten">1</a></sup> Een advertentie bereikt wie jij kiest.</p><span>Daarom steken we je budget in mensen die je nog niet kennen.</span></article>'
    +'</div><div class="links rv"><a class="ln-k" href="#/kennis">Meer uit de analyse</a></div></div></section>';

  /* 6. Het verschil */
  h+='<section class="s s--wit"><div class="wrap"><div class="sk"><span class="eyebrow rv">Het verschil</span>'+vl('h1 rv','Geen kleine lettertjes.','Ook niet in het groot.')+'</div>'
    +'<div class="vs2">'
    +'<div class="vs2-nooit rv"><h3>Wat je bij ons nooit krijgt</h3><ul class="vink vink--nee"><li>Een jaarcontract. Je zegt maandelijks op, net als wij.</li><li>Een uurtarief of meerwerk achteraf.</li><li>Een marge op je advertentiebudget.</li><li>Accounts die op naam van het bureau staan.</li><li>Een rapport van een maand oud.</li></ul></div>'
    +'<div class="vs2-wel rv rv-2"><h3>Wat je altijd krijgt</h3><ul class="vink"><li>Een vaste prijs per maand, voor iedereen gelijk.</li><li>Advertentiebudget dat rechtstreeks naar Google en Meta gaat, op jouw naam.</li><li>Dezelfde cijfers als wij, elk uur bijgewerkt.</li><li>Een meetlat vooraf: de nulmeting en het doel.</li><li>Eerlijk nee als het niet werkt, met de cijfers erbij.</li></ul></div>'
    +'</div></div></section>';

  /* 7. Het portaal */
  h+='<section class="s gr gr--merk" style="overflow:hidden"><div class="wrap"><div class="sk"><span class="eyebrow rv">Het portaal</span>'+vl('h1 rv','Je ziet wat wij zien.','Elk uur.')
    +'<p class="lead rv rv-2">Alle cijfers van al je kanalen op één scherm. Per <span data-b="ev">aanvraag</span> zie je waar hij vandaan kwam, wat hij kostte en of hij klant werd. Stop je, dan neem je alles mee.</p></div>'
    +'<div class="sb-stage rv">'+browser(scorebord(),'portaal.jamesrobinson.nl')
    +'<div class="zw zw-1"><small>Kosten per aanvraag</small><b>€ 52</b> <span style="color:var(--groen-tekst);font-size:12px">−€ 8</span></div>'
    +'<div class="zw zw-2"><small>Jouw oordeel over deze aanvraag</small><div style="display:flex;gap:6px;margin-top:6px"><span class="label" style="background:#E6F7EB;color:#1D7D3F">Goed</span><span class="label">Twijfel</span><span class="label">Niet goed</span></div></div>'
    +'<div class="zw zw-3">'+logo('linkedin')+'<span><small>Zojuist</small><strong style="font-size:13px">Nieuwe aanvraag via LinkedIn</strong></span></div></div>'
    +'</div></section>';

  /* 8. Prijzen */
  h+='<section class="s gr gr--licht"><div class="wrap"><div class="sk"><span class="eyebrow rv">Prijzen</span>'+vl('h1 rv','Wat het kost.','Voordat je belt.')
    +'<p class="lead rv rv-2">Eén prijslijst, voor iedereen gelijk. Je advertentiebudget betaal je rechtstreeks aan het platform. Ons pakket is nooit meer dan de helft van wat je samen uitgeeft.</p></div>'
    +'<div class="pk4">'+PAKKETTEN.map(function(p,i){var sp='';for(var j=0;j<p.c;j++)sp+='<i></i>';return '<div class="rv rv-'+(i+1)+'"><div class="spelers">'+sp+'</div><h3>'+p.n+'</h3><div class="prijs">'+euro(p.p)+'</div><div class="pm">per maand, plus advertentiebudget</div><ul><li>'+p.c+' campagne'+(p.c>1?'s':'')+' tegelijk</li><li>Advertentiebudget '+p.bud.replace('Vanaf','vanaf')+'</li><li>Nieuwe content: '+p.cr.toLowerCase()+'</li><li>'+p.dd.replace(' per jaar','')+' draaidag'+(p.c>1?'en':'')+' per jaar</li></ul><a class="ln-k" href="#/prijzen">Bekijk '+p.n+'</a></div>'}).join('')+'</div>'
    +'<div class="fundament-balk rv"><span><b>Eenmalig: het fundament, € 4.500.</b> Meting, accounts, portaal en je eerste campagne, live rond dag 19.</span><span>Maandelijks opzegbaar · exclusief btw · <a class="ln-k" style="color:var(--lime)" href="#/prijzen/rekenhulp">Reken je totaal uit</a></span></div>'
    +'</div></section>';

  /* 9. Van eerste klik tot eerste aanvraag */
  h+='<section class="s s--wit"><div class="wrap"><div class="sk"><span class="eyebrow rv">Starten</span>'+vl('h1 rv','Van eerste klik','tot eerste <span data-b="ev">aanvraag</span>.')+'</div>'
    +'<ol class="start">'
    +[['De check','Vijftien vragen, online. Je krijgt meteen een eerlijke uitkomst met de rekensom.','15 minuten','Jij'],
      ['Scouting en intakegesprek','Wij bekijken je website en markt. Daarna een uur aan tafel, bij ons in Hulsberg of bij jou.','1 uur','Samen'],
      ['Je voorstel','Op jouw cijfers, met een hypothese: wat het kost en wat het kan opleveren.','Binnen 3 werkdagen','Wij'],
      ['Het fundament','Meting, accounts, een draaidag, je pagina en je eerste campagne. Jij geeft de toegangen en filmt een dagdeel mee.','± 4 weken','Samen'],
      ['Live','Je eerste campagne draait. De eerste maanden zijn leren; rond maand drie trekken we de eerste conclusies.','Rond dag 19','Wij']]
      .map(function(s,i){return '<li class="rv rv-'+(i%4+1)+'"><span class="start-nr">'+(i+1)+'</span><div><h3>'+s[0]+'</h3><p>'+s[1]+'</p></div><span class="start-tijd">'+s[2]+'<small>'+s[3]+'</small></span></li>'}).join('')
    +'</ol></div></section>';

  /* 10. Team en motto */
  var spelers=['jim-coumans','jim-kikken','robin-jacobs','speler-07','speler-10','speler-11','speler-14','speler-23'];
  var tinten=['gr--merk','gr--nacht','gr--blauw','gr--nacht','gr--merk','gr--blauw','gr--nacht','gr--merk'];
  h+='<section class="s gr gr--nacht"><div class="wrap"><div class="team4">'
    +'<div class="sk"><span class="eyebrow rv">Wie er aan je campagnes werkt</span>'+vl('h1 rv','Momentum first.','Mastery later.')
    +'<p class="lead rv rv-2">Ons motto, en ook ons advies aan jou. Een campagne die draait, leert. Een campagne in de la niet. Dus we gaan live, meten, en maken hem daarna elke maand beter.</p>'
    +'<p class="lead rv rv-3" style="font-size:18px">Tien specialisten in Hulsberg. Zeven begonnen hier als stagiair en kennen onze manier van werken van binnenuit.</p></div></div></div>'
    +rail('rail-selectie',spelers.map(function(k,i){return spelerKaart(k,tinten[i])}),'rail--portret')
    +'</section>';

  /* 11. Bewijs */
  h+='<section class="s gr gr--licht"><div class="wrap"><div class="sk"><span class="eyebrow rv">Wat klanten zeggen</span>'+vl('h1 rv','Elf reviews.','Elf keer vijf sterren.')+'</div>'
    +'<div class="duo"><div class="rev rv"><span class="rev-top">'+logo('google')+'Reviews op Google</span><div><b>5,0</b><div class="ster">'+[1,2,3,4,5].map(function(){return IC.ster}).join('')+'</div><p>Gemiddelde van elf reviews.<sup class="vn"><a href="#noten">3</a></sup></p></div><a class="ln-k" href="#/resultaten">Lees ze op Google</a></div>'
    +'<div class="case-leeg rv rv-2"><span class="eyebrow">Uitslagen</span><h3>Cases met cijfers, naam en toestemming.</h3><p>Uitdaging, aanpak, resultaat en wat we leerden. Ze staan hier zodra de klant akkoord geeft. Tot die tijd laten we liever niets zien dan iets wat we niet kunnen onderbouwen.</p><span class="vul">[3 cases in te vullen]</span></div></div>'
    +'</div></section>';

  /* 12. Eerlijk vooraf */
  h+='<section class="s s--wit"><div class="wrap"><div class="sk"><span class="eyebrow rv">Eerlijk vooraf</span>'+vl('h1 rv','Niet voor iedereen.','Met opzet.')+'<p class="lead rv rv-2">We beginnen alleen als we erin geloven. Anders zeggen we nee, liever nu dan over drie maanden.</p></div>'
    +'<div class="eer"><div class="rv"><h3>Het past als</h3><ul class="vink"><li>je klanten een aanvraag, afspraak of offerte doen.</li><li>je nieuwe klanten kunt aannemen.</li><li>je een aanvraag snel terugbelt.</li><li>je de eerste maanden de tijd geeft om te leren.</li></ul></div>'
    +'<div class="rv rv-2"><h3>Het past niet als</h3><ul class="vink vink--nee"><li>je iemand zoekt die je feed vult.</li><li>het om één losse campagne gaat.</li><li>je bedrijf vooral om een webshop draait.</li><li>je nu geen extra klanten aankunt.</li></ul></div></div></div></section>';

  /* 13. Vragen */
  h+='<section class="s gr gr--licht"><div class="wrap"><div class="faq4"><div class="sk"><span class="eyebrow rv">Vragen</span>'+vl('h1 rv','Wat iedereen','eerst wil weten.')+'<p class="lead rv rv-2">Staat je vraag er niet bij, bel dan 045 792 0009. Er zit een mens aan de lijn.</p></div>'
    +'<div class="faq rv">'+[
      ['Wat als het niet werkt?','Dan zeggen we het zelf, met de cijfers erbij. We sturen bij, of we stoppen op tijd. Je zit nergens aan vast: we zijn maandelijks opzegbaar, voor allebei.'],
      ['Hoeveel tijd kost het mij?','Een uur aan tafel bij de start, de toegangen binnen drie werkdagen, een dagdeel filmen per draaidag en per aanvraag een oordeel in het portaal. En snel terugbellen. Dat laatste bepaalt het meest.'],
      ['Wat kost het in totaal?','Ons pakket vanaf € 1.000 per maand, je advertentiebudget vanaf € 1.000 per maand en eenmalig het fundament van € 4.500. Alles exclusief btw. Met de rekenhulp zie je wat jouw ambitie vraagt.'],
      ['Hoe snel zie ik resultaat?','Je eerste campagne staat rond dag 19 live. De eerste maanden zijn leren: platforms hebben tijd en data nodig. Rond maand drie trekken we de eerste voorzichtige conclusies.'],
      ['Waarom posten jullie niet op mijn social media?','Omdat een bericht maar 1 tot 3% van je volgers bereikt. Een verzorgd profiel hoort erbij, maar nieuwe klanten komen uit advertenties. Wil je zelf blijven posten, dan helpen we met templates of een contentsessie.'],
      ['Werken jullie ook buiten Zuid-Limburg?','Onze focus ligt binnen zo\'n 30 kilometer van Hulsberg. Online is ons vak, maar de beste gesprekken voer je aan tafel.']
    ].map(function(f){return '<details><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>'}).join('')+'</div></div></div></section>';

  h+=slot();
  return h;
};

function spelerKaart(k,tint){
  var p=JR.team[k];
  var ini=(p.n.charAt(0)==='['?'?':p.n.split(' ').map(function(w){return w.charAt(0)}).join('').slice(0,2));
  return '<a class="sp gr '+(tint||'gr--merk')+'" href="#/team/'+k+'"><span class="ini">'+ini+'</span><span class="nr" aria-hidden="true">'+p.nr+'</span><b>'+vul(p.n)+'</b><span>'+vul(p.rol)+' · '+vul(p.spec)+'</span>'+(p.jrnxt?'<em>Begon als stagiair</em>':'')+'</a>';
}

/* Slot */
function slot(vet,licht,lead){
  return '<section class="s gr gr--vuur rv" style="padding:calc(var(--sy)*1.4) 0;min-height:80vh;display:flex;align-items:center">'+lint()
    +'<div class="wrap slot-in" style="position:relative;z-index:2;width:100%">'+vl('hx',vet||'Genoeg gelezen.',licht||'Tijd om te rekenen.')
    +'<p class="lead" style="color:rgba(255,255,255,.85);max-width:560px">'+(lead||'Vijftien vragen, een kwartier. Je krijgt meteen een eerlijke uitkomst met de rekensom erbij. Past het niet, dan zeggen we dat ook.')+'</p>'
    +'<div class="knoppen"><a class="knop knop--lime knop--groot" href="#/past-het">Start de check</a><a class="ln-k" style="color:#fff" href="tel:0457920009">Liever bellen: 045 792 0009</a></div></div></section>';
}

/* ---------- Personalisatie per branche en de rekensom ---------- */
function kiesBranche(k){
  var b=BRANCHE[k]||BRANCHE[''];
  $$('[data-b]').forEach(function(el){el.textContent=b[el.getAttribute('data-b')]});
  $$('[data-branche]').forEach(function(x){x.classList.toggle('op',x.getAttribute('data-branche')===k)});
  var f=$('[data-feed]'); if(f){f.innerHTML=feedHtml(b)}
  if($('#rs-w'))rekenNu();
  try{localStorage.setItem('jr-branche',k)}catch(e){}
}
function rekenNu(){
  var w=+$('#rs-w').value,c=+$('#rs-c').value,k=+$('#rs-k').value,mv=($('[data-b="mv"]')||{}).textContent||'aanvragen';
  $('#rs-ow').textContent=euro(w);$('#rs-oc').textContent=c+' van de 10';$('#rs-ok').textContent=k;
  $('#rs-max').textContent=euro(w*.3*c/10);
  $('#rs-aanv').textContent=Math.ceil(k/(c/10));
  $('#rs-uitleg').textContent=mv+', als er '+c+' van de 10 klant worden.';
}
function rekensom(){
  if(!$('#rs-w'))return;
  ['#rs-w','#rs-c','#rs-k'].forEach(function(id){$(id).addEventListener('input',rekenNu)});
  rekenNu();
}
document.addEventListener('click',function(e){var b=e.target.closest('[data-branche]');if(!b)return;var k=b.getAttribute('data-branche');kiesBranche(b.classList.contains('op')?'':k)});
