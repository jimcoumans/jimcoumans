/* James Robinson, website ronde 6: high performance.
   Toegepaste principes staan als commentaar bij de sectie waar ze werken. */
var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return [].slice.call((c||document).querySelectorAll(s))};
function euro(n){return '€ '+Math.round(n).toLocaleString('nl-NL')}
function logo(n,cls){return '<span class="logo '+(cls||'')+'">'+LOGO[n]+'</span>'}
function vul(t){return '<span class="vul">'+t+'</span>'}
function noot(n){return '<sup><a href="javascript:void(0)" data-naar="noten" class="bron">'+n+'</a></sup>'}

var BRANCHE={
  '':{n:'Alle branches',mv:'klanten',mvA:'aanvragen',ev:'aanvraag',feed:[['google','Offerteaanvraag','via Google · zoeken'],['instagram','Afspraak','via Instagram · story'],['linkedin','Kennismaking','via LinkedIn'],['facebook','Offerteaanvraag','via Facebook · feed']]},
  horeca:{n:'Horeca',mv:'reserveringen',mvA:'reserveringen',ev:'reservering',feed:[['google','Reservering · 4 personen','zaterdag 19.30 · via Google'],['instagram','Groepsaanvraag · 22 personen','kerstdiner · via Instagram'],['facebook','Reservering · 2 personen','vrijdag 18.00 · via Facebook'],['google','Arrangement · 6 personen','zondag · via Google Maps']]},
  makelaardij:{n:'Makelaardij',mv:'waardebepalingen',mvA:'waardebepalingen',ev:'waardebepaling',feed:[['facebook','Waardebepaling','Valkenburg · via Facebook'],['google','Waardebepaling','Heerlen · via Google'],['instagram','Verkoopgesprek','Sittard · via Instagram'],['google','Waardebepaling','Hulsberg · via Google']]},
  automotive:{n:'Automotive',mv:'proefritten',mvA:'proefritten',ev:'proefrit',feed:[['instagram','Proefrit','elektrisch · via Instagram'],['google','Inruilvoorstel','via Google'],['facebook','Proefrit','occasion · via Facebook'],['google','Werkplaatsafspraak','via Google Maps']]},
  retail:{n:'Retail',mv:'afspraken',mvA:'afspraken',ev:'afspraak',feed:[['instagram','Afspraak in de winkel','zaterdag · via Instagram'],['google','Route naar de winkel','via Google Maps'],['facebook','Aanvraag maatwerk','via Facebook'],['google','Afspraak','via Google']]},
  zakelijk:{n:'Zakelijk',mv:'kennismakingen',mvA:'kennismakingen',ev:'kennismaking',feed:[['linkedin','Kennismaking','directeur · via LinkedIn'],['google','Offerteaanvraag','via Google'],['linkedin','Terugbelverzoek','HR-manager · via LinkedIn'],['google','Kennismaking','via Google']]},
  zorg:{n:'Zorg',mv:'intakes',mvA:'intakes',ev:'intake',feed:[['google','Intake aangevraagd','via Google'],['facebook','Terugbelverzoek','via Facebook'],['google','Afspraak','via Google Maps'],['instagram','Intake aangevraagd','via Instagram']]},
  sport:{n:'Sport en vrije tijd',mv:'boekingen',mvA:'boekingen',ev:'boeking',feed:[['instagram','Boeking · 8 personen','via Instagram'],['tiktok','Boeking · groep','via TikTok'],['google','Boeking · 2 personen','via Google'],['facebook','Lidmaatschap','via Facebook']]}
};
var B=BRANCHE[''];
try{var kb=localStorage.getItem('jr6-branche');if(kb&&BRANCHE[kb])B=BRANCHE[kb]}catch(e){}

/* ---------- Bouwstenen ---------- */
function foto(label,titel,shot,cls,licht){
  return '<figure class="foto '+(cls||'')+'"'+(licht?' style="--licht:'+licht+'"':'')+' role="img" aria-label="'+titel+'"><i class="foto-veeg" aria-hidden="true"></i><span class="foto-label"><i></i>'+label+'</span><figcaption class="foto-shot"><b>'+titel+'</b>'+shot+'</figcaption></figure>';
}
function mac(inhoud){return '<div class="mac"><div class="mac-scherm"><div class="mac-in">'+inhoud+'</div></div><div class="mac-voet"></div></div>'}
function tel(inhoud){return '<div class="tel"><div class="tel-in">'+inhoud+'</div></div>'}
var IC={
  zoek:'<svg viewBox="0 0 36 36"><circle cx="15.5" cy="15.5" r="9"/><path d="M22.5 22.5l7 7"/></svg>',
  camera:'<svg viewBox="0 0 36 36"><rect x="4" y="9" width="28" height="20" rx="4"/><circle cx="18" cy="19" r="6"/><path d="M12 9l2-4h8l2 4"/></svg>',
  pagina:'<svg viewBox="0 0 36 36"><rect x="5" y="5" width="26" height="26" rx="4"/><path d="M5 12h26M10 18h11M10 23h7"/><rect x="21" y="21" width="6" height="4" rx="1"/></svg>',
  bel:'<svg viewBox="0 0 36 36"><path d="M11 5l5 6-3 3c1.6 3.4 4.6 6.4 8 8l3-3 6 5-2.5 4C19 28 8 17 7 7.5z"/></svg>',
  ster:'<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>'
};
function feedLi(f,i){var c=i===0?'chip--nu':i===2?'chip--klant':'chip--goed';var t=i===0?'Nu':i===2?'Klant':'Goed';return '<li>'+logo(f[0])+'<span><b>'+f[1]+'</b><small>'+f[2]+'</small></span><em class="chip '+c+'">'+t+'</em></li>'}
function grafiek(){
  var v=[14,18,15,21,24,22,28,31,29,34,37,41],W=400,H=150,p=10;
  var pt=v.map(function(y,i){return [p+i*(W-2*p)/(v.length-1),H-p-(y-10)*(H-2*p)/34]});
  var d=pt.map(function(q,i){return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ');
  var last=pt[pt.length-1];
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'
    +[0.25,0.5,0.75].map(function(f){return '<line x1="0" x2="'+W+'" y1="'+(H*f)+'" y2="'+(H*f)+'" stroke="#E5E5EA" stroke-width="1"/>'}).join('')
    +'<path d="'+d+' L'+last[0]+' '+H+' L'+p+' '+H+'Z" fill="rgba(0,122,255,.08)"/>'
    +'<path class="teken" d="'+d+'" fill="none" stroke="#007AFF" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    +'<circle cx="'+last[0]+'" cy="'+last[1]+'" r="4" fill="#007AFF"/></svg>';
}
function portaal(){
  return '<div class="pt"><aside class="pt-zij"><div class="merk">'+bm()+'<b>James<br>Robinson</b></div><span class="op-nu">Overzicht</span><span>Aanvragen</span><span>Campagnes</span><span>Budget</span><span>Merkkluis</span></aside>'
    +'<div class="pt-hoofd"><div class="pt-kop"><h4>Oktober</h4><span class="live"><i></i>Live</span><small>Voorbeeldcijfers</small></div>'
    +'<div class="pt-kpi"><div><small>Nieuwe <span data-b="mvA">'+B.mvA+'</span></small><b data-tel="38">38</b><em>+6</em></div><div><small>Kosten per <span data-b="ev">'+B.ev+'</span></small><b>€ 52</b><em>− € 8</em></div><div><small>Nieuwe klanten</small><b data-tel="9">9</b><em>+2</em></div><div><small>Advertentiebudget</small><b>€ 1.976</b><em style="color:var(--tekst-3)">van € 2.000</em></div></div>'
    +'<div class="pt-onder"><div class="pt-kaart"><small><span data-b="mvA">'+B.mvA+'</span> per week</small>'+grafiek()+'</div><div class="pt-kaart"><small>Net binnen</small><ul class="pt-feed" data-feed>'+B.feed.map(feedLi).join('')+'</ul></div></div></div></div>';
}
function slotScherm(){
  return '<div class="slot"><div class="slot-datum">maandag 19 oktober</div><div class="slot-tijd">9:41</div>'
    +'<div class="melding melding--in"><span class="ic">'+bm()+'</span><small><span>Portaal</span><span>nu</span></small><b data-melding="0">Nieuwe '+B.ev+'</b><span data-melding="1">'+B.feed[0][1]+', '+B.feed[0][2]+'</span></div>'
    +'<div class="melding"><span class="ic">'+bm()+'</span><small><span>Portaal</span><span>7 min</span></small><b>Nieuwe <span data-b="ev">'+B.ev+'</span></b><span>'+B.feed[1][1]+'</span></div></div>';
}
function googleAd(){
  return '<div class="gzk"><div class="gzk-balk">'+logo('google')+'<div class="gzk-veld"><span class="typ">marketingbureau zuid-limburg</span></div></div>'
    +'<div class="gzk-ad"><small>Gesponsord</small><div class="gzk-wie"><i>'+bm()+'</i><div>James Robinson<span>www.jamesrobinson.nl</span></div></div>'
    +'<h4>Performance-marketingbureau in Zuid-Limburg | James Robinson</h4><p>Meer aanvragen via Google en social. Elke maand meetbaar, maandelijks opzegbaar. Doe de check in een kwartier.</p>'
    +'<div class="gzk-links"><span>Prijzen</span><span>De check</span><span>Werkwijze</span></div></div><div class="gzk-rest"><i></i><i></i><i></i></div></div>';
}
function igAd(){
  return '<div class="ig"><div class="ig-kop"><i>'+bm()+'</i><div><b>jamesrobinson.nl</b><span>Gesponsord</span></div></div>'
    +'<div style="position:relative">'+foto('Stand-in','','',' ig-foto')+'<p class="foto-kop">Likes don\'t<span>pay the bills.</span></p></div>'
    +'<div class="ig-cta">Doe de check</div><div class="ig-tekst"><b>jamesrobinson.nl</b> Wij meten aanvragen, geen likes.</div></div>';
}
function landing(){
  return '<div class="lp"><div class="lp-tekst"><div class="merk">'+bm()+'<b>James<br>Robinson</b></div><h4>Vijftien vragen. Eén eerlijk antwoord.</h4><p>Of marketing voor jou gaat werken, en wat het kost.</p><div class="lp-form"><i></i><i></i><b>Start de check</b></div></div>'
    +foto('Stand-in','','')+'</div>';
}

/* ---------- Home ---------- */
var PAGINA={};
PAGINA.home=function(){
  var h='';
  /* Hero. Aesthetic-usability effect: het eerste beeld is het product (het portaal), net als bij Apple.
     Commitment en personalisatie: één tik op je branche en de pagina spreekt jouw taal. */
  h+='<section class="held" aria-labelledby="h-held"><div class="wrap"><div class="held-tekst">'
    +'<span class="boven op">Performance marketing in Zuid-Limburg</span>'
    +'<h1 class="kop-xl op op-2" id="h-held">Meer <span data-b="mv">'+B.mv+'</span>.<br><span class="grijs">Elke maand.</span></h1>'
    +'<p class="intro op op-3">Wij adverteren voor ondernemers in Zuid-Limburg, in Google en op social media. Je ziet elke <span data-b="ev">'+B.ev+'</span> binnenkomen en wat hij kostte. Werkt het niet, dan zeggen we het zelf.</p>'
    /* Hick en Von Restorff: één opvallende hoofdactie, één rustige tweede. */
    +'<div class="knoppen op op-3"><button type="button" class="knop" data-check>Start de check</button><a class="link" href="javascript:void(0)" data-naar="rekensom">Reken het uit</a></div>'
    +'<div class="branches op op-4" role="group" aria-label="Kies je branche"><small>Voor jouw branche</small>'+Object.keys(BRANCHE).filter(Boolean).map(function(k){return '<button type="button" data-branche="'+k+'" aria-pressed="'+(BRANCHE[k]===B)+'">'+BRANCHE[k].n+'</button>'}).join('')+'</div>'
    +'</div><div class="podium op op-2">'+mac(portaal())+tel(slotScherm())+'</div></div><div class="podium-voet"></div></section>';

  /* Herkenning. Problem-agitate: eerst het probleem in de woorden van de klant. */
  h+='<section class="s"><div class="wrap"><div class="kop-blok"><span class="boven op">Herkenbaar</span><h2 class="kop-l op op-2">Goed in je vak.<br><span class="grijs">Onvoorspelbaar in je agenda.</span></h2>'
    +'<p class="intro op op-3">Je klanten zijn tevreden en komen terug. Alleen weet je nooit hoeveel nieuwe er volgende maand bijkomen. Daar is wat aan te doen, met cijfers in plaats van hoop.</p></div>'
    +'<div class="herk">'
    +'<div class="op"><h3>Mond-tot-mond is je beste verkoper.</h3><p>Alleen bepaal jij niet wanneer hij langskomt. Een drukke maand en een stille maand wisselen elkaar af.</p></div>'
    +'<div class="op op-2"><h3>Je weet wat marketing kost. Niet wat het oplevert.</h3><p>Een rapport over bereik en likes zegt niets over je omzet. De vraag die telt: hoeveel aanvragen, en wat kostte elke aanvraag.</p></div>'
    +'<div class="op op-3"><h3>Posten kost tijd. Het levert weinig op.</h3><p>Een bericht bereikt gemiddeld 1 tot 3% van je eigen volgers.'+noot(1)+' Die kenden je al.</p></div>'
    +'</div></div></section>';

  /* Het systeem als bento. Chunking: vier onderdelen, elk met één beeld. */
  h+='<section class="s s--grijs"><div class="wrap"><div class="kop-blok"><span class="boven op">Hoe het werkt</span><h2 class="kop-l op op-2">Vier onderdelen.<br><span class="grijs">Eén doel: meer klanten.</span></h2></div>'
    +'<div class="bento">'
    +'<article class="tegel tegel--4 op"><div class="tegel-tekst"><span class="boven">De motor</span><h3>Adverteren.<span class="grijs">Vandaag aan, morgen gemeten.</span></h3><p>Google en Meta voorop. Elke week schuift budget naar wat aanvragen oplevert.</p></div><div class="tegel-beeld">'+googleAd()+'</div></article>'
    +'<article class="tegel tegel--2 op op-2"><div class="tegel-tekst"><span class="boven">Op social</span><h3>Bereik vóór de vraag.</h3></div><div class="tegel-beeld">'+tel(igAd())+'</div></article>'
    +'<article class="tegel tegel--3 tegel--foto op">'+foto('Stand-in · foto 01','Draaidag op locatie','Close-up van handen aan het werk. 1/1000 s, licht van opzij, bewegingsonscherpte in de achtergrond.')+'<div class="tegel-tekst"><span class="boven">De brandstof</span><h3>Content.<span class="grijs" style="color:rgba(255,255,255,.6)">Eén draaidag. Maanden aan advertenties.</span></h3><p>Een advertentie slijt. Daarom maken we elk kwartaal nieuwe.</p></div></article>'
    +'<article class="tegel tegel--3 op op-2"><div class="tegel-tekst"><span class="boven">De landing</span><h3>Eén pagina.<span class="grijs">Eén boodschap, één knop.</span></h3><p>Per campagne een eigen pagina op jouw website. We testen wat wint.</p></div><div class="tegel-beeld">'+mac(landing())+'</div></article>'
    +'<article class="tegel tegel--6 tegel--zwart op" style="grid-column:1/-1;min-height:440px"><div class="tegel-tekst" style="max-width:520px"><span class="boven" style="color:var(--bal)">De voordeur</span><h3>Een aanvraag.<span class="grijs">Klaar om te kopen.</span></h3><p>Daar stopt ons werk en begint het jouwe. We spreken vooraf af hoe snel je belt, en meten het.</p><a class="link" href="#werkwijze" style="margin-top:22px">Zo werkt het</a></div>'
    +'<div class="aanvraag" style="left:auto;width:min(380px,calc(100% - 80px));top:40px;bottom:auto">'+B.feed.slice(0,3).map(function(f,i){return '<div class="melding"><span class="ic">'+bm()+'</span><small><span>Portaal</span><span>'+(i?i*7+' min':'nu')+'</span></small><b>'+f[1]+'</b><span>'+f[2]+'</span></div>'}).join('')+'</div></article>'
    +'</div></div></section>';

  /* Autoriteit en specificiteit: drie cijfers, elk met bron. */
  h+='<section class="s s--zwart"><div class="wrap"><div class="kop-blok"><span class="boven boven--bal op">Wat we weten</span><h2 class="kop-l op op-2">Numbers don\'t lie.<br><span class="grijs">Drie die alles bepalen.</span></h2></div>'
    +'<div class="cijfers">'
    +'<div class="cijfer op"><b><span data-tel="7">7</span>×</b><h3>Zo veel vaker een echt gesprek.</h3><p>Als je binnen het uur terugbelt, in plaats van later. Daarom spreken we vooraf af hoe snel je belt.</p><span class="bron">Oldroyd e.a., Harvard Business Review, 2011</span></div>'
    +'<div class="cijfer op op-2"><b>1–3%</b><h3>Van je volgers ziet je bericht.</h3><p>Organisch bereik is klein en ongericht. Likes don\'t pay the bills. Advertenties wel.</p><span class="bron">Socialinsider, 2026</span></div>'
    +'<div class="cijfer op op-3"><b>10–20%</b><h3>Van de geteste ideeën wint.</h3><p>Zelfs bij Google. Daarom testen we, in plaats van te gokken. Ook onze eigen ideeën.</p><span class="bron">Kohavi en Thomke, Harvard Business Review, 2017</span></div>'
    +'</div></div></section>';

  /* Wederkerigheid: eerst iets waardevols geven. De klant rekent zelf (IKEA-effect). */
  h+='<section class="s" id="rekensom"><div class="wrap reken"><div class="kop-blok"><span class="boven op">De rekensom</span><h2 class="kop-l op op-2">Reken eerst.<br><span class="grijs">Adverteer daarna.</span></h2>'
    +'<p class="intro op op-3">Vul in wat een nieuwe klant je oplevert. Dan zie je wat een <span data-b="ev">'+B.ev+'</span> maximaal mag kosten, en hoeveel je er per maand nodig hebt. Dat getal wordt straks onze meetlat.</p></div>'
    +'<div class="paneel op op-2"><div class="schuif"><label for="rs-w"><span>Wat een nieuwe klant je het eerste jaar oplevert</span><output id="rs-ow" for="rs-w"></output></label><input type="range" id="rs-w" min="250" max="25000" step="250" value="3000"></div>'
    +'<div class="schuif"><label for="rs-c"><span>Hoeveel van de 10 <span data-b="mvA">'+B.mvA+'</span> klant worden</span><output id="rs-oc" for="rs-c"></output></label><input type="range" id="rs-c" min="1" max="9" step="1" value="3"></div>'
    +'<div class="schuif"><label for="rs-k"><span>Hoeveel nieuwe klanten je per maand wilt</span><output id="rs-ok" for="rs-k"></output></label><input type="range" id="rs-k" min="1" max="40" step="1" value="6"></div>'
    +'<div class="uitkomst" aria-live="polite"><div><small>Een <span data-b="ev">'+B.ev+'</span> mag je maximaal kosten</small><b id="rs-max">€ 0</b><span>Bij 30% marge.</span></div><div><small>Daarvoor heb je per maand nodig</small><b id="rs-aanv">0</b><span id="rs-uitleg"></span></div></div></div>'
    +'</div></section>';

  /* Transparantie en endowment: het portaal is van de klant. */
  h+='<section class="s s--grijs" id="portaal"><div class="wrap"><div class="kop-blok midden" style="text-align:center"><span class="boven op">Het portaal</span><h2 class="kop-l op op-2">Je ziet wat wij zien.<br><span class="grijs">Elk uur.</span></h2>'
    +'<p class="intro op op-3">Alle cijfers van al je kanalen op één scherm. Per aanvraag geef je een oordeel, zodat de campagne leert wat een goede klant is. Het blijft van jou, ook als je stopt.</p></div>'
    +'<div class="portaal-podium op">'+mac(portaal())+'</div>'
    +'<div class="drie"><div class="op"><h3><i class="stip" style="background:var(--rood)"></i>Live</h3><p>Google, Meta, LinkedIn, TikTok, je website en Search Console. Elk uur bijgewerkt.</p></div>'
    +'<div class="op op-2"><h3><i class="stip" style="background:var(--groen)"></i>Jouw oordeel</h3><p>Goed, twijfel of niet goed. En later: werd het een klant. Zo stuurt de campagne op klanten, niet op klikken.</p></div>'
    +'<div class="op op-3"><h3><i class="stip" style="background:var(--blauw)"></i>Van jou</h3><p>Accounts, data en portaal staan op jouw naam. Wij zijn beheerder, nooit eigenaar.</p></div></div></div></section>';

  /* Prijzen. Paradox of choice: één pakket. Anchoring: het totaal staat erbij.
     Risk reversal: maandelijks opzegbaar, alles op jouw naam. */
  h+='<section class="s" id="prijzen"><div class="wrap"><div class="kop-blok"><span class="boven op">Prijzen</span><h2 class="kop-l op op-2">Eén pakket.<br><span class="grijs">Daarna alleen wat de cijfers vragen.</span></h2>'
    +'<p class="intro op op-3">Eén prijslijst, voor iedereen gelijk. Geen uurtje-factuurtje en geen korting voor wie het hardst onderhandelt. Een versneller adviseren we pas als de cijfers erom vragen.</p></div>'
    +'<div class="prijs"><div class="pakket op"><h3>Het pakket</h3><div class="bedrag">€ 1.250</div><div class="per">per maand, exclusief btw</div>'
    +'<ul><li>Adverteren in Google en Meta, voor één campagne</li><li>Elk kwartaal een contentronde met nieuwe advertenties</li><li>Elke maand een Performance Review van een uur</li><li>Het portaal, live, en elke ochtend de dagmail</li><li>Een vast aanspreekpunt dat je campagne kent</li></ul>'
    +'<button type="button" class="knop knop--bal" data-check>Start de check</button></div>'
    +'<div class="pakket-rest"><div class="blok op op-2"><h3>Eenmalig: het fundament</h3><div class="bedrag">€ 4.500</div><p>Onderzoek, meting, je eerste campagne, een landingspagina en een dagdeel filmen. Live rond dag 19.</p><p style="margin-top:14px"><b style="font-weight:700;color:var(--tekst)">Advertentiebudget:</b> minimaal even groot als je pakket. Het gaat rechtstreeks naar Google en Meta, zonder marge.</p></div>'
    +'<div class="blok op op-3"><h3>Versnellers, als de cijfers erom vragen</h3><ul class="modules">'
    +[['Extra campagne','Tweede aanbod of doelgroep'],['Contentronde of draaidag','Advertenties slijten sneller dan gepland'],['Conversie-optimalisatie','Conversie blijft hangen'],['E-mail en automation','Aanvragen worden nog geen klant'],['SEO','Zoekwoorden bewijzen zich al maanden'],['LinkedIn of TikTok','Je doelgroep zit daar aantoonbaar']].map(function(m){return '<li><b>'+m[0]+'</b><span>'+m[1]+'</span><em>'+vul('[prijs]')+'</em></li>'}).join('')+'</ul></div></div></div>'
    +'<div class="garanties op"><span>Maandelijks opzegbaar</span><span>Alles op jouw naam</span><span>Nooit marge op je budget</span><span>Prijs vooraf bekend</span></div>'
    +'</div></section>';

  /* Team. Sociale identiteit en sport: het motto als advies. */
  h+='<section class="s s--zwart" id="team"><div class="wrap team"><div class="op">'+foto('Stand-in · foto 02','Het team in beweging','Padelbaan, avondlicht. Close-up van een smash, bal scherp, speler in bewegingsonscherpte. Grain zichtbaar.','','radial-gradient(45% 50% at 60% 40%,#46464C,transparent 70%),radial-gradient(40% 40% at 20% 85%,#26262A,transparent 70%),#101012')+'</div>'
    +'<div class="kop-blok"><span class="boven boven--bal op">Wie er aan je campagnes werkt</span><h2 class="kop-l op op-2">Momentum first.<br><span class="grijs">Mastery later.</span></h2>'
    +'<p class="intro op op-3">Ons motto, en ook ons advies aan jou. Een campagne die draait, leert. Een campagne in de la niet. Dus we gaan live, meten, en maken hem elke maand beter.</p>'
    +'<div class="team-cijfers op op-4"><div><b>10</b><span>specialisten in Hulsberg</span></div><div><b>7</b><span>begonnen hier als stagiair</span></div><div><b>2018</b><span>opgericht</span></div></div></div></div></section>';

  /* Sociale bewijskracht, alleen wat we kunnen onderbouwen. */
  h+='<section class="s s--grijs"><div class="wrap"><div class="kop-blok"><span class="boven op">Wat klanten zeggen</span><h2 class="kop-l op op-2">Elf reviews.<br><span class="grijs">Elf keer vijf sterren.</span></h2></div>'
    +'<div class="bewijs"><div class="review op" style="background:var(--wit)">'+logo('google')+'<b>5,0</b><div class="sterren">'+[1,2,3,4,5].map(function(){return IC.ster}).join('')+'</div><p>Gemiddelde van elf reviews op Google.'+noot(3)+'</p><a class="link" href="javascript:void(0)" data-toast="Link naar de Google-reviews volgt.">Lees ze op Google</a></div>'
    +'<div class="cases op op-2">'+[1,2,3].map(function(n){return '<div class="case"><i></i><div><b>Case '+n+' '+vul('[klant, branche]')+'</b><span>Uitdaging, aanpak, resultaat. Pas zichtbaar met toestemming en cijfers.</span></div><em>'+vul('[cijfer]')+'</em></div>'}).join('')+'</div></div></div></section>';

  /* Pratfall-effect en eerlijkheid: zeggen voor wie het niet is, verhoogt vertrouwen. */
  h+='<section class="s"><div class="wrap"><div class="kop-blok"><span class="boven op">Eerlijk vooraf</span><h2 class="kop-l op op-2">Niet voor iedereen.<br><span class="grijs">Met opzet.</span></h2><p class="intro op op-3">We beginnen alleen als we erin geloven. Anders zeggen we nee, liever nu dan over drie maanden.</p></div>'
    +'<div class="eerlijk"><div class="op"><h3>Het past als</h3><ul class="lijst"><li>je klanten een aanvraag, afspraak of offerte doen.</li><li>je nieuwe klanten kunt aannemen.</li><li>je een aanvraag snel terugbelt.</li><li>je de eerste maanden de tijd geeft om te leren.</li></ul></div>'
    +'<div class="op op-2"><h3>Het past niet als</h3><ul class="lijst lijst--nee"><li>je iemand zoekt die je feed vult.</li><li>het om één losse campagne gaat.</li><li>je bedrijf vooral om een webshop draait.</li><li>je nu geen extra klanten aankunt.</li></ul></div></div></div></section>';

  h+='<section class="s s--grijs"><div class="wrap vragen"><div class="kop-blok"><span class="boven op">Vragen</span><h2 class="kop-m op op-2">Wat iedereen<br><span class="grijs">eerst wil weten.</span></h2><p class="intro op op-3" style="font-size:19px">Staat je vraag er niet bij? Bel 045 792 0009. Er zit een mens aan de lijn.</p></div>'
    +'<div class="faq op">'+[
      ['Wat als het niet werkt?','Dan zeggen we het zelf, met de cijfers erbij. We sturen bij, of we stoppen op tijd. Je zit nergens aan vast: we zijn maandelijks opzegbaar, voor allebei.'],
      ['Wat kost het in totaal?','Het pakket is € 1.250 per maand. Je advertentiebudget is minimaal even groot en gaat rechtstreeks naar Google en Meta. Eenmalig betaal je het fundament van € 4.500. Alles exclusief btw.'],
      ['Hoeveel tijd kost het mij?','Een uur aan tafel bij de start, de toegangen binnen drie werkdagen, een dagdeel filmen en per aanvraag een oordeel in het portaal. En snel terugbellen. Dat laatste bepaalt het meest.'],
      ['Hoe snel zie ik resultaat?','Je eerste campagne staat rond dag 19 live. De eerste maanden zijn leren: platforms hebben tijd en data nodig. Rond maand drie trekken we de eerste voorzichtige conclusies.'],
      ['Waarom posten jullie niet op mijn social media?','Omdat een bericht maar 1 tot 3% van je volgers bereikt. Een verzorgd profiel hoort erbij, maar nieuwe klanten komen uit advertenties.'],
      ['Werken jullie ook buiten Zuid-Limburg?','Onze focus ligt binnen zo\'n 30 kilometer van Hulsberg. Online is ons vak, maar de beste gesprekken voer je aan tafel.']
    ].map(function(f){return '<details><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>'}).join('')+'</div></div></section>';
  return h+slot();
};

/* Peak-end-regel: de pagina eindigt op het sterkste moment, met één heldere actie. */
function slot(){
  return '<section class="slot-cta">'+foto('Stand-in · foto 03','Slotbeeld','Extreme close-up: padelbal net na de klap, vervormd. Zwarte achtergrond, één harde lichtbron, zware grain.')
    +'<div class="wrap"><h2 class="kop-xl op">Genoeg gelezen.<br><span style="color:rgba(255,255,255,.55)">Tijd om te rekenen.</span></h2>'
    +'<p class="intro op op-2">Vijftien vragen, een kwartier. Je krijgt meteen een eerlijke uitkomst met de rekensom erbij. Past het niet, dan zeggen we dat ook.</p>'
    +'<div class="knoppen op op-3"><button type="button" class="knop knop--bal" data-check>Start de check</button><span class="tel-tekst">Liever bellen? <b>045 792 0009</b></span></div></div></section>';
}

/* ---------- Werkwijze ---------- */
function abTest(){
  var kaart=function(n,pct,w,win){return '<div style="flex:1;min-width:0;display:grid;gap:12px"><span style="font:700 13px var(--letter);color:'+(win?'var(--tekst)':'var(--tekst-3)')+'">Versie '+n+(win?' · wint':'')+'</span>'
    +'<div style="aspect-ratio:3/4;border-radius:18px;background:#fff;box-shadow:0 0 0 1px var(--lijn-zacht),0 20px 40px -24px rgba(0,0,0,.3);padding:9%;display:flex;flex-direction:column;gap:8%;'+(win?'outline:2px solid var(--tekst);outline-offset:4px':'')+'"><div class="merk" style="gap:6px">'+bm()+'<b style="font-size:9px">James<br>Robinson</b></div><b style="font:700 clamp(15px,2vw,22px)/1.02 var(--letter);letter-spacing:-.03em">'+(win?'Vijftien vragen. Eén eerlijk antwoord.':'Wij helpen je groeien met marketing.')+'</b><span style="flex:1;border-radius:10px;background:var(--grijs)"></span><span style="height:12%;border-radius:99px;background:var(--blauw)"></span></div>'
    +'<div style="display:flex;align-items:center;gap:10px"><span style="flex:1;height:6px;border-radius:6px;background:var(--grijs-2);overflow:hidden"><i style="display:block;height:100%;width:'+w+';background:'+(win?'var(--groen)':'var(--tekst-3)')+'"></i></span><b class="tab" style="font:700 22px var(--letter)">'+pct+'</b></div></div>'};
  return '<div style="position:absolute;inset:0;padding:8%;display:flex;flex-direction:column;justify-content:center"><div style="display:flex;gap:6%">'+kaart('A','2,0%','40%')+kaart('B','3,1%','62%',1)+'</div><p class="mini" style="margin-top:20px">Conversieratio, voorbeeldcijfers</p></div>';
}
PAGINA.werkwijze=function(){
  var h='';
  h+='<section class="ww-held s" style="padding-bottom:clamp(72px,9vw,120px)"><div class="wrap"><span class="boven op">Werkwijze</span><h1 class="kop-xl op op-2">Geen gok.<br><span class="grijs">Een systeem.</span></h1>'
    +'<p class="intro op op-3" style="margin:22px auto 0">Voorspelbaar nieuwe aanvragen, en elke maand iets goedkoper. Vier onderdelen die op elkaar draaien, en jij ziet dezelfde cijfers als wij.</p>'
    +'<div class="flow op op-4">'+[['zoek','Adverteren','De motor'],['camera','Content','De brandstof'],['pagina','Landing','Waar het landt'],['bel','Aanvraag','De voordeur']].map(function(n){return '<div class="flow-n"><span class="flow-ic">'+IC[n[0]]+'</span><b>'+n[1]+'</b><small>'+n[2]+'</small></div>'}).join('')+'</div>'
    +'<div class="versnellers op"><small>Daarna, als de cijfers erom vragen</small><span>Conversie</span><span>E-mail</span><span>SEO</span><span>Extra campagne</span></div></div></section>';

  /* Scrollverhaal zoals een Apple-productpagina: de tekst scrolt, het beeld blijft staan. */
  var stappen=[
    ['De motor','Adverteren.','Vandaag aan, morgen gemeten.','Google en Meta voorop, LinkedIn voor zakelijke klanten, TikTok als je klant daar zit. Elke week schuift budget naar wat oplevert.','meer mensen die jou vinden, terwijl je aan het werk bent.','<div class="vb actief" data-vb="0">'+googleAd()+'</div>'],
    ['De brandstof','Content.','Beeld van jouw zaak.','Eerst een contentplan, dan een draaidag bij jou op locatie. Daaruit maken we elk kwartaal nieuwe advertenties, want een advertentie slijt.','een dagdeel filmen. De rest doen wij.','<div class="vb vb--zwart" data-vb="1">'+foto('Stand-in · foto 04','Draaidag','Camera op schouderhoogte, close-up van het vak van de klant. Ondiepe scherptediepte, bewegend onderwerp.')+'</div>'],
    ['De landing','Eén pagina.','Eén boodschap, één knop.','Per campagne een eigen pagina op jouw website. We testen koppen, beelden en formulieren, en houden wat wint.','meer aanvragen uit hetzelfde budget.','<div class="vb" data-vb="2">'+abTest()+'</div>'],
    ['De voordeur','Een aanvraag.','Klaar om te kopen.','Daar stopt ons werk en begint het jouwe. We spreken vooraf af hoe snel je belt, en meten het. Wie binnen het uur belt, heeft bijna 7× zo vaak een echt gesprek.'+noot(2),'je telefoon gaat vaker. Met de juiste mensen aan de lijn.','<div class="vb vb--zwart" data-vb="3" style="display:flex;align-items:center;justify-content:center">'+tel(slotScherm())+'</div>']
  ];
  h+='<section class="s" style="padding-top:0"><div class="wrap verhaal"><div class="verhaal-stappen">'+stappen.map(function(s,i){return '<div class="stap'+(i?'':' actief')+'" data-stap="'+i+'"><span class="boven">'+(i+1)+' · '+s[0]+'</span><h3>'+s[1]+'<span class="grijs">'+s[2]+'</span></h3><p>'+s[3]+'</p><p class="merk-jij"><b>Wat jij merkt:</b> '+s[4]+'</p><div class="vb-mobiel">'+s[5].replace(/vb( vb--zwart)? ?(actief)?/,'vb$1 actief')+'</div></div>'}).join('')+'</div>'
    +'<div class="verhaal-beeld" aria-hidden="true">'+stappen.map(function(s){return s[5]}).join('')+'</div></div></section>';

  /* Interactief: de keten. Laat zien in plaats van vertellen. */
  h+='<section class="s s--zwart" id="keten"><div class="wrap"><div class="kop-blok"><span class="boven boven--bal op">De keten</span><h2 class="kop-l op op-2">Twee van de honderd doen iets.<br><span class="grijs">Speel ermee.</span></h2><p class="intro op op-3">Van bezoeker naar aanvraag naar klant. Eén procentpunt conversie is meer waard dan veel extra budget. Probeer het zelf.</p></div>'
    +'<div class="keten"><div class="paneel op"><div class="schuif"><label for="kt-b"><span>Bezoekers per maand</span><output id="kt-ob" for="kt-b"></output></label><input type="range" id="kt-b" min="200" max="5000" step="100" value="1000"></div>'
    +'<div class="schuif"><label for="kt-c"><span>Conversieratio: bezoekers die een aanvraag doen</span><output id="kt-oc" for="kt-c"></output></label><input type="range" id="kt-c" min="0.5" max="8" step="0.5" value="2"></div>'
    +'<div class="schuif"><label for="kt-s"><span>Scoringsratio: aanvragen die klant worden</span><output id="kt-os" for="kt-s"></output></label><input type="range" id="kt-s" min="5" max="80" step="5" value="30"></div>'
    +'<p class="mini" style="margin-top:18px">Rekenvoorbeeld met een vast advertentiebudget van € 2.000 per maand.</p>'
    +'<div class="knelpunt">'+[['Weinig kliks','Nieuw beeld, andere boodschap, scherpere doelgroep'],['Weinig aanvragen','Snellere pagina, korter formulier, sterker aanbod'],['Weinig klanten','Sneller opvolgen. Dat is jouw kant; wij meten het.']].map(function(r){return '<div><b>'+r[0]+'</b><span>'+r[1]+'</span></div>'}).join('')+'</div></div>'
    +'<div class="trechter op op-2"><div class="tr" style="--w:100%"><span>Bezoekers</span><b id="kt-1"></b></div><div class="tr" id="kt-t2" style="--w:60%"><span>Aanvragen</span><b id="kt-2"></b></div><div class="tr tr--bal" id="kt-t3" style="--w:36%"><span>Klanten</span><b id="kt-3"></b></div>'
    +'<div class="kpi2"><div><small>Kosten per aanvraag</small><b id="kt-cpa"></b></div><div><small>Kosten per klant</small><b id="kt-cpk"></b></div></div><p class="intro" style="font-size:16px;margin-top:auto;padding-top:24px">Zet de conversieratio een procentpunt hoger en kijk wat er met de kosten gebeurt. Zonder één euro extra budget.</p></div></div></div></section>';

  /* Verwachtingen managen: eerst leren, dan versnellen. Voorkomt teleurstelling in maand twee. */
  h+='<section class="s"><div class="wrap"><div class="kop-blok"><span class="boven op">Wat je mag verwachten</span><h2 class="kop-l op op-2">Eerst leren.<br><span class="grijs">Dan versnellen.</span></h2><p class="intro op op-3">Platforms kunnen niet lezen, alleen meten. Tijd plus geld is data. In het begin loopt de lijn vlak; als er tractie is, versnelt hij. Bij de een na een week, bij de ander na zes maanden.</p></div>'
    +'<div class="curve op">'+curve()+'<p class="mini" style="margin-top:12px">Illustratie van het verloop, geen belofte. Het doel is vanaf dag één hetzelfde.</p></div></div></section>';

  var reis=[['Verkopen','Je betaalt niets',[['01','Van aanvraag tot afspraak','Een korte video, vijftien vragen en meteen een uitkomst.','Online'],['02','De quickscan','We bekijken je website en markt.','30 minuten'],['03','Het intakegesprek','Een uur aan tafel.','1 uur'],['04','Je voorstel','Op jouw cijfers, daarna 45 minuten samen.','3 werkdagen']]],
    ['Starten','De opstartmaand',[['05','Tekenen','Digitaal, dezelfde dag.','Dag 0'],['06','De onboarding','Toegangen en een sessie van 45 minuten.','3 werkdagen'],['07','Het fundament','Meting, content, pagina en je eerste campagne.','± 4 weken']]],
    ['Samenwerken','Maandelijks opzegbaar',[['08','Live en het ritme','Dagmail, Performance Review, 100-dagenreview en jaargesprek.','Vanaf dag 19']]]];
  h+='<section class="s s--grijs"><div class="wrap"><div class="kop-blok"><span class="boven op">De klantreis</span><h2 class="kop-l op op-2">Acht stappen.<br><span class="grijs">Je weet altijd welke de volgende is.</span></h2></div>'
    +'<div class="reis">'+reis.map(function(f,i){return '<div class="fase op op-'+(i+1)+'"><div class="fase-kop"><b>'+f[0]+'</b><small>'+f[1]+'</small></div><ol>'+f[2].map(function(s){return '<li><span>'+s[0]+'</span><h4>'+s[1]+'</h4><p>'+s[2]+'</p><em>'+s[3]+'</em></li>'}).join('')+'</ol></div>'}).join('')+'</div></div></section>';

  h+='<section class="s"><div class="wrap"><div class="kop-blok"><span class="boven op">Het ritme</span><h2 class="kop-l op op-2">Elke dag. Elke maand.<br><span class="grijs">Je weet waar je staat.</span></h2></div><div class="ritme">'
    +'<div class="rk op"><small>Elke dag · 7.00</small><h3>De dagmail</h3><p>Wat buiten de lijntjes valt, zien wij voordat jij het merkt.</p><div class="rk-mock dm"><b>Dagmail · 19 oktober</b><span>Uitgaven binnen budget</span><span>Meting werkt</span><span class="let">Advertentie afgekeurd: vervangen</span><span>Opvolgtijd gehaald</span></div></div>'
    +'<div class="rk op op-2"><small>Live</small><h3>Het portaal</h3><p>Dezelfde cijfers als wij. Per aanvraag een oordeel van jou.</p><div class="rk-mock"><b style="display:block;margin-bottom:10px">Offerteaanvraag · Google</b><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="chip chip--goed" style="margin:0">Goed</span><span class="chip" style="margin:0">Twijfel</span><span class="chip" style="margin:0">Niet goed</span></div></div></div>'
    +'<div class="rk op op-3"><small>Elke maand</small><h3>Performance Review</h3><p>Een uur: wat werkte, wat niet, en wat we nu doen.</p><div class="rk-mock agenda">'+['ma','di','wo','do','vr'].map(function(d,i){return '<span'+(i===2?' class="nu"':'')+'>'+d+'<b>'+(19+i)+'</b></span>'}).join('')+'</div></div>'
    +'<div class="rk op op-4"><small>Dag 100 en elk jaar</small><h3>Tussenstand</h3><p>De 100-dagenreview en het jaargesprek: doelen bijstellen op de cijfers.</p><div class="rk-mock dag100"><div class="balk"><i></i></div><span><b>Dag 100</b><span>van 365</span></span></div></div>'
    +'</div></div></section>';

  /* Commitment en wederkerigheid: afspraken van twee kanten. */
  h+='<section class="s s--grijs"><div class="wrap"><div class="kop-blok"><span class="boven op">Spelregels</span><h2 class="kop-l op op-2">Onze kant.<br><span class="grijs">Jouw kant.</span></h2></div><div class="afspraken">'
    +'<div class="op"><h3>Wat wij beloven</h3><ol>'+[['Resultaat staat op één','Werkt iets niet, dan zeggen we het zelf, met de cijfers erbij.'],['Maandelijks opzegbaar','Voor allebei.'],['Nooit iets erbovenop','Je budget gaat rechtstreeks naar het platform.'],['Alles op jouw naam','Wij zijn beheerder, nooit eigenaar.'],['Data beats opinion','De cijfers kiezen, ook tussen onze eigen ideeën.']].map(function(r){return '<li><div><b>'+r[0]+'</b><span>'+r[1]+'</span></div></li>'}).join('')+'</ol></div>'
    +'<div class="op op-2"><h3>Wat we van jou vragen</h3><ol>'+[['Toegangen binnen 3 werkdagen','Dan staat je campagne rond dag 19 live.'],['Eén beslisser','Die binnen 2 werkdagen reageert.'],['Snel opvolgen','Elke aanvraag binnen de afgesproken tijd, ook bij vakantie.'],['Per aanvraag een oordeel','In het portaal. Zo leert de campagne.'],['Tijd voor beeld','Een dagdeel om te filmen, en iemand die het werk doet.']].map(function(r){return '<li><div><b>'+r[0]+'</b><span>'+r[1]+'</span></div></li>'}).join('')+'</ol></div>'
    +'</div></div></section>';
  return h+slot();
};
function curve(){
  var W=1000,H=340,L=48,R=24,T=24,Bm=44,v=[0,3,6,10,15,22,31,42,54,65,76,86,95];
  var x=function(m){return L+m*(W-L-R)/12},y=function(a){return H-Bm-a*(H-T-Bm)/100};
  var d=v.map(function(a,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(a).toFixed(1)}).join(' ');
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Illustratie: de lijn loopt de eerste maanden vlak en versnelt daarna">';
  for(var m=0;m<=12;m+=3){s+='<line x1="'+x(m)+'" x2="'+x(m)+'" y1="'+T+'" y2="'+(H-Bm)+'" stroke="#E5E5EA"/><text x="'+x(m)+'" y="'+(H-Bm+24)+'" text-anchor="'+(m===12?'end':m?'middle':'start')+'">'+(m?'Maand '+m:'Start')+'</text>'}
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-Bm)+'" y2="'+(H-Bm)+'" stroke="#D2D2D7"/>';
  s+='<rect x="'+x(0)+'" y="'+T+'" width="'+(x(3)-x(0))+'" height="'+(H-T-Bm)+'" fill="#E8E8ED" opacity=".55"/>';
  s+='<text class="lbl" x="'+(x(0)+12)+'" y="'+(T+22)+'">Leren</text><text x="'+(x(0)+12)+'" y="'+(T+40)+'">Platforms verzamelen data</text>';
  s+='<path class="teken" d="'+d+'" fill="none" stroke="#1D1D1F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
  s+='<circle cx="'+x(3)+'" cy="'+y(10)+'" r="7" fill="#fff" stroke="#1D1D1F" stroke-width="3"/><text class="lbl" x="'+(x(3)+16)+'" y="'+(y(10)+34)+'">Rond maand 3: eerste conclusies</text>';
  s+='<circle cx="'+x(12)+'" cy="'+y(95)+'" r="9" fill="#DFFF3F" stroke="#1D1D1F" stroke-width="3"/><text class="lbl" x="'+(x(12)-16)+'" y="'+(y(95)+5)+'" text-anchor="end">Versnellers erbij</text>';
  return s+'</svg>';
}

/* ---------- Gedrag ---------- */
function rekenNu(){
  if(!$('#rs-w'))return;
  var w=+$('#rs-w').value,c=+$('#rs-c').value,k=+$('#rs-k').value;
  $('#rs-ow').textContent=euro(w);$('#rs-oc').textContent=c+' van de 10';$('#rs-ok').textContent=k;
  $('#rs-max').textContent=euro(w*.3*c/10);$('#rs-aanv').textContent=Math.ceil(k/(c/10));
  $('#rs-uitleg').textContent=B.mvA+', als er '+c+' van de 10 klant worden.';
}
function keten(){
  if(!$('#kt-b'))return;
  var b=+$('#kt-b').value,c=+$('#kt-c').value,s=+$('#kt-s').value,a=b*c/100,k=a*s/100;
  $('#kt-ob').textContent=b.toLocaleString('nl-NL');$('#kt-oc').textContent=String(c).replace('.',',')+'%';$('#kt-os').textContent=s+'%';
  $('#kt-1').textContent=b.toLocaleString('nl-NL');$('#kt-2').textContent=Math.round(a);$('#kt-3').textContent=k>=1?Math.round(k):String(Math.round(k*10)/10).replace('.',',');
  $('#kt-t2').style.setProperty('--w',Math.max(16,Math.min(90,20+c*9))+'%');$('#kt-t3').style.setProperty('--w',Math.max(10,Math.min(80,(20+c*9)*s/100*1.6))+'%');
  $('#kt-cpa').textContent=a>0?euro(2000/a):'–';$('#kt-cpk').textContent=k>0?euro(2000/k):'–';
}
function vulling(i){var p=(i.value-i.min)/(i.max-i.min)*100;i.style.setProperty('--p',p+'%')}
function kiesBranche(k){
  B=BRANCHE[k]||BRANCHE[''];try{localStorage.setItem('jr6-branche',k)}catch(e){}
  $$('[data-branche]').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-branche')===k&&!!k))});
  $$('[data-b]').forEach(function(e){e.textContent=B[e.getAttribute('data-b')]});
  $$('[data-feed]').forEach(function(u){u.innerHTML=B.feed.map(feedLi).join('')});
  var m0=$('[data-melding="0"]'),m1=$('[data-melding="1"]');if(m0){m0.textContent='Nieuwe '+B.ev;m1.textContent=B.feed[0][1]+', '+B.feed[0][2]}
  rekenNu();
}
function toast(t){var e=$('#toast');e.textContent=t;e.classList.add('aan');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('aan')},2600)}

/* De check als voorbeeld. Goal-gradient en Zeigarnik: voortgang zichtbaar, met een voorsprong vanaf de start. */
var CHECK=[
  ['Wat voor bedrijf heb je?','We stemmen de rest van de vragen erop af.',['Horeca','Makelaardij','Automotive','Zakelijke dienstverlening','Iets anders']],
  ['Hoeveel nieuwe klanten wil je per maand erbij?','Een schatting is genoeg.',['1 tot 5','6 tot 15','Meer dan 15']],
  ['Hoe snel bel je een aanvraag terug?','Eerlijk antwoord. Dit bepaalt het meest.',['Binnen het uur','Dezelfde dag','Een paar dagen later']]
];
function check(stap,antw){
  var d=$('#check');antw=antw||[];
  if(stap>=CHECK.length){
    var past=antw[2]!==2;
    d.innerHTML='<div class="check-kaart" role="dialog" aria-modal="true" aria-labelledby="ck-kop"><div class="check-top"><span>Voorbeeld van de uitkomst</span><button type="button" class="check-sluit" aria-label="Sluiten" data-sluit>×</button></div><div class="voortgang"><i style="width:100%"></i></div>'
      +(past?'<h3 id="ck-kop">Het lijkt te passen.</h3><p>De volgende stap is de quickscan: we bekijken je website en je markt, een half uur. Daarna een uur aan tafel. Je betaalt niets tot je tekent.</p>'
        :'<h3 id="ck-kop">Eerst de opvolging.</h3><p>Een aanvraag die een paar dagen wacht, boekt meestal ergens anders. Wie binnen het uur belt, heeft bijna 7× zo vaak een echt gesprek. Regel dat eerst; dan helpt adverteren pas echt.</p>')
      +'<span class="tel-tekst">045 792 0009</span><p class="mini" style="margin-top:20px">Dit is een voorbeeld met 3 vragen. De echte check heeft er 15 en geeft ook de rekensom.</p></div>';
    return;
  }
  var q=CHECK[stap],pct=10+stap*30;
  d.innerHTML='<div class="check-kaart" role="dialog" aria-modal="true" aria-labelledby="ck-kop"><div class="check-top"><span>Vraag '+(stap+1)+' van '+CHECK.length+' · voorbeeld</span><button type="button" class="check-sluit" aria-label="Sluiten" data-sluit>×</button></div><div class="voortgang"><i style="width:'+pct+'%"></i></div><h3 id="ck-kop">'+q[0]+'</h3><p>'+q[1]+'</p><div class="keuzes">'+q[2].map(function(o,i){return '<button type="button" data-keuze="'+i+'">'+o+'</button>'}).join('')+'</div></div>';
  d._stap=stap;d._antw=antw;
  var eerste=$('.keuzes button',d);if(eerste)eerste.focus();
}
function openCheck(){var d=$('#check');d.hidden=false;check(0,[])}
function sluitCheck(){$('#check').hidden=true}

/* ---------- Router en waarnemers ---------- */
var io;
function activeer(){
  if(io)io.disconnect();
  io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var t=e.target;t.classList.add('in');
    $$('[data-tel]',t).concat(t.hasAttribute('data-tel')?[t]:[]).forEach(telOp);io.unobserve(t)})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  $$('.op').forEach(function(e){io.observe(e)});
  $$('input[type=range]').forEach(function(i){vulling(i);i.addEventListener('input',function(){vulling(i);rekenNu();keten()})});
  rekenNu();keten();
  var stappen=$$('[data-stap]');
  if(stappen.length){var sio=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var n=e.target.getAttribute('data-stap');
    stappen.forEach(function(s){s.classList.toggle('actief',s===e.target)});$$('.verhaal-beeld [data-vb]').forEach(function(v){v.classList.toggle('actief',v.getAttribute('data-vb')===n)})})},{rootMargin:'-45% 0px -45% 0px'});
    stappen.forEach(function(s){sio.observe(s)})}
}
function telOp(e){if(e._klaar)return;e._klaar=1;var doel=+e.getAttribute('data-tel'),t0=null;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){e.textContent=doel;return}
  function f(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/1200);e.textContent=Math.round(doel*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
function route(){
  var h=location.hash.replace(/^#\/?/,''),pagina=h==='werkwijze'?'werkwijze':'home';
  $('#app').innerHTML=PAGINA[pagina]();
  $$('.nav-links a').forEach(function(a){if(a.getAttribute('href')==='#'+pagina)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  document.title=pagina==='werkwijze'?'Werkwijze · James Robinson':'James Robinson';
  window.scrollTo(0,0);activeer();
}
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-branche],[data-check],[data-sluit],[data-keuze],[data-naar],[data-toast]');if(!t)return;
  if(t.hasAttribute('data-branche')){var k=t.getAttribute('data-branche');kiesBranche(t.getAttribute('aria-pressed')==='true'?'':k)}
  else if(t.hasAttribute('data-check'))openCheck();
  else if(t.hasAttribute('data-sluit'))sluitCheck();
  else if(t.hasAttribute('data-keuze')){var d=$('#check');var a=d._antw.concat(+t.getAttribute('data-keuze'));check(d._stap+1,a)}
  else if(t.hasAttribute('data-toast'))toast(t.getAttribute('data-toast'));
  else if(t.hasAttribute('data-naar')){e.preventDefault();var doel=document.getElementById(t.getAttribute('data-naar'));
    if(!doel&&location.hash.indexOf('werkwijze')>-1){location.hash='';setTimeout(function(){var d2=document.getElementById(t.getAttribute('data-naar'));if(d2)d2.scrollIntoView({behavior:'smooth'})},60);return}
    if(doel)window.scrollTo({top:doel.getBoundingClientRect().top+scrollY-56,behavior:'smooth'})}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#check').hidden)sluitCheck()});
document.addEventListener('DOMContentLoaded',function(){
  document.documentElement.classList.add('js');
  window.addEventListener('hashchange',route);route();
  var bar=$('.mbalk');window.addEventListener('scroll',function(){bar.classList.toggle('aan',scrollY>620)},{passive:true});
});
