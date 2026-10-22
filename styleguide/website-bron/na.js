/* ==========================================================================
   Pagina's op dezelfde bouwstenen
   ========================================================================== */
function kaal(s){return String(s).replace(/<[^>]+>/g,'')}
function lokaal(naam,extra){return '<div class="ln" id="ln"><b>'+naam+'</b>'+(extra||'<a class="knop knop--rand" href="#/prijzen">Prijzen</a>')+'<a class="knop" href="#/past-het">Start de check</a></div>'}

/* ---------- Diensten ---------- */
var VIS={
  google:['google','slot'],social:['insta','slot'],bing:['google'],ab:['landing','landing'],mail:['mail','slot'],seo:['google','portaal']
};
var DIENST_BEELD={foto:['fotografie','studio'],video:['videografie','kantoor'],anim:['animatie','merk'],copy:['copywriting','merk'],host:[null,'merk']};
function contactVoor(spec){
  var k=Object.keys(JR.team).filter(function(k){return JR.team[k].spec===spec})[0]||'jim-kikken';
  return [k,JR.team[k]];
}
PAGINA.dienst=function(slug){
  var d=JR.diensten[slug]; if(!d)return PAGINA.nietGevonden();
  var h=lokaal(d.naam);
  h+='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw rv">'+d.groep+'</span><h1 class="hx rv">'+d.naam+'</h1>'
    +'<p class="lead rv rv-2" style="font-size:clamp(22px,2.4vw,32px);color:var(--ink);font-weight:600;letter-spacing:-.02em">'+kaal(d.merk)+'</p>'
    +'<p class="lead rv rv-2" style="margin-top:12px">'+d.sub+'</p>'
    +'<div class="knoppen rv rv-3"><a class="knop" href="#/past-het">Start de check</a><a class="ln-k" href="#/prijzen">Bekijk de prijzen</a></div></div></section>';
  /* Beeld */
  if(VIS[d.vis]){
    var t=VIS[d.vis];
    h+='<section class="s--wit"><div class="wrap wrap--breed"><div class="rv" style="background:var(--grijs);border-radius:var(--r-xl);padding:72px 24px 0;display:flex;justify-content:center;gap:clamp(16px,4vw,56px);overflow:hidden">'
      +t.map(function(x,i){return '<div style="position:relative"'+(i?' class="tel-2"':'')+'>'+(d.vis==='ab'?'<span class="label" style="position:absolute;left:50%;top:-40px;transform:translateX(-50%)">Versie '+(i?'B':'A')+'</span>':'')+tel(SCHERM[x](),'tel--half'+(x==='slot'?' tel--donker':''))+'</div>'}).join('')
      +'</div><p class="mid mini" style="margin-top:14px">Mock-ups in de huisstijl van James Robinson.</p></div></section>';
  } else {
    var b=DIENST_BEELD[d.vis]||[null,'merk'];
    h+='<section class="s--wit"><div class="wrap wrap--breed rv">'+(b[0]?beeld(b[0],b[1],'r-219 rond'):'<div class="beeld r-219 rond" data-t="merk" style="display:flex;align-items:center;justify-content:center"><div style="text-align:center"><div class="cijfer-xl" style="font-size:clamp(64px,10vw,140px);color:#fff">Alles in orde.</div><p style="color:rgba(255,255,255,.75);margin-top:12px">Back-up vannacht · gelukt &nbsp; Controle · elke minuut &nbsp; SPF, DKIM, DMARC · ingesteld</p></div></div>')+'</div></section>';
  }
  /* Wat erin zit */
  h+='<section class="s s--wit"><div class="wrap"><h2 class="h1 rv">Wat erin zit.</h2></div>'
    +rail('rail-wat',d.wat.map(function(w){return '<div class="vlak" style="min-height:240px"><span class="eyebrow eyebrow--klein">'+d.naam+'</span><h3>'+w[0]+'</h3><p>'+w[1]+'</p></div>'}),'rail--smal')+'</section>';
  /* Aanpak */
  h+='<section class="s s--grijs"><div class="wrap"><span class="eyebrow rv">De aanpak</span><h2 class="h1 rv">Zo spelen we.</h2><div class="stappen">'
    +d.aanpak.map(function(a,i){return '<div class="stap rv rv-'+(i%4+1)+'"><small>'+a[2]+'</small><h3>'+a[0]+'</h3><p>'+a[1]+'</p></div>'}).join('')+'</div></div></section>';
  /* Eerlijk */
  h+='<section class="s s--donker"><div class="wrap"><div class="split"><div><span class="eyebrow rv">Eerlijk vooraf</span><h2 class="h1 rv">Wat '+d.naam+' niet doet.</h2></div>'
    +'<ul class="vink vink--nee rv rv-2">'+d.eerlijk.map(function(e){return '<li>'+e+'</li>'}).join('')+'</ul></div></div></section>';
  /* Lange tekst */
  if(d.seo)h+='<section class="s s--wit"><div class="wrap wrap--tekst"><div class="prose">'+d.seo+'</div></div></section>';
  /* FAQ */
  h+='<section class="s '+(d.seo?'s--grijs':'s--wit')+'"><div class="wrap wrap--tekst"><h2 class="h2">Veelgestelde vragen.</h2><div class="faq">'+d.faq.map(function(f){return '<details><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>'}).join('')+'</div></div></section>';
  /* Contactpersoon en verwant */
  var c=contactVoor(d.spec);
  h+='<section class="s s--wit"><div class="wrap"><div class="raster-2" style="margin-top:0;align-items:stretch">'
    +'<div class="vlak" style="flex-direction:row;gap:28px;align-items:center;padding:28px"><div style="width:128px;flex:none;border-radius:20px;overflow:hidden;position:relative;aspect-ratio:4/5">'+beeld('portret','studio','',{sil:1,geenCap:1})+'</div><div><span class="eyebrow eyebrow--klein">Vragen over '+d.naam+'</span><h3>'+vul(c[1].n)+'</h3><p>'+vul(c[1].rol)+' · '+vul(c[1].spec)+'</p><a class="ln-k" style="padding-top:12px;display:inline-block" href="#/contact">Plan een gesprek</a></div></div>'
    +'<div class="vlak"><span class="eyebrow eyebrow--klein">Speelt samen met</span>'+d.rel.map(function(r){var x=JR.diensten[r];return x?'<a href="#/diensten/'+r+'" style="display:flex;justify-content:space-between;padding:14px 0;border-top:1px solid var(--lijn-zacht);color:var(--ink);font:600 19px var(--display)">'+x.naam+'<span class="ln-k" style="font:400 15px var(--text)">'+kaal(x.merk)+'</span></a>':''}).join('')+'</div>'
    +'</div></div></section>';
  h+=slot();
  return h;
};

PAGINA.diensten=function(){
  var groepen=['Adverteren','Content','Versnellers'], uitleg={Adverteren:'De motor. Het enige wat je vandaag aanzet en morgen meet.',Content:'De brandstof. Advertenties slijten; nieuwe content houdt de motor draaiend.',Versnellers:'Draait de motor, dan maken deze elke volgende klant goedkoper.'};
  var icoon={'google-ads':'zoek','social-advertising':'social','microsoft-ads':'zoek',fotografie:'camera',videografie:'camera',animatie:'alles',copywriting:'pagina','conversie-optimalisatie':'pagina','e-mailmarketing':'mail',seo:'groei',hosting:'bord'};
  var h='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw rv">Diensten</span><h1 class="hx rv">Eén doel.<span class="l">Meer klanten.</span></h1><p class="lead rv rv-2">Meer klanten voor jou. Je mag elke marketingvraag bij ons neerleggen: dat doen wij, of we zeggen bij wie je moet zijn.</p></div></section>';
  groepen.forEach(function(g,gi){
    var lijst=Object.keys(JR.diensten).filter(function(k){return JR.diensten[k].groep===g});
    h+='<section class="s '+(gi%2?'s--wit':'s--grijs')+'"><div class="wrap"><span class="eyebrow rv">'+g+'</span><h2 class="h2 rv" style="max-width:640px">'+uitleg[g]+'</h2><div class="raster-3">'
      +lijst.map(function(k,i){var d=JR.diensten[k];return '<a class="vlak rv rv-'+(i%3+1)+'" href="#/diensten/'+k+'"><span style="width:40px;height:40px;display:block;margin-bottom:22px" class="rij-ic">'+ic(icoon[k])+'</span><h3>'+d.naam+'</h3><p>'+kaal(d.merk)+'</p><span class="ln-k">Meer over '+d.naam+'</span></a>'}).join('')+'</div></div></section>';
  });
  h+='<section class="s s--donker"><div class="wrap"><div class="split"><div><span class="eyebrow">Eerlijk vooraf</span><h2 class="h1">Wat we niet doen.</h2><p class="lead">Wat we niet doen, doet iemand anders beter. Daar verwijzen we je naar door, zonder opslag.</p></div><ul class="vink vink--nee"><li>Social feeds vullen en beheren.</li><li>Bedrijfsvideo\'s.</li><li>Webshops als propositie.</li><li>Personeel werven.</li><li>Losse campagnes zonder samenwerking.</li><li>Leads opvolgen. Dat doe jij.</li></ul></div></div></section>';
  h+=slot();
  return h;
};

/* ---------- Prijzen ---------- */
PAGINA.prijzen=function(){
  var h=lokaal('Prijzen','<a class="knop knop--rand" href="#/prijzen/rekenhulp">Rekenhulp</a>');
  h+='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw rv">Prijzen</span><h1 class="hx rv">Eén prijslijst.<span class="l">Geen kleine lettertjes.</span></h1><p class="lead rv rv-2">Geen uurtje-factuurtje, geen meerwerk en geen korting. Het advertentiebudget betaal je rechtstreeks aan het platform, op jouw naam, zonder iets erbovenop.</p></div></section>';
  h+='<section class="s s--wit s--naad"><div class="wrap"><div class="paneel rv"><div class="mid"><h2 class="h2">Kies je opstelling.</h2><p class="lead">Het pakket is het hoogste van twee: het aantal campagnes tegelijk, of je advertentiebudget.</p></div><div style="margin-top:56px">'+vergelijking(true)+'</div><p class="mid mini" style="margin-top:48px">Alle bedragen per maand, exclusief btw. Maandelijks opzegbaar, voor allebei.</p></div></div></section>';
  /* Fundament */
  h+='<section class="s s--grijs"><div class="wrap"><div class="split"><div><span class="eyebrow rv">Eenmalig, in de opstartmaand</span><h2 class="h1 rv">Het fundament.</h2><div class="stat rv rv-2" style="margin-top:28px"><small>Eenmalig</small><b>€ 4.500</b><span>Betaald bij ondertekening. Niet los verkrijgbaar, en na de start niet terug te krijgen.</span></div></div>'
    +'<div class="raster-2" style="margin-top:0;grid-template-columns:1fr"><div class="vlak rv"><h3>De basis</h3><p>Doelgroep, boodschap en concurrenten. Een technische audit en de meting. De advertentieaccounts, MailerLite, het portaal en de nulmeting.</p></div><div class="vlak rv rv-2"><h3>De eerste campagne</h3><p>Zoekwoorden, structuur en advertenties. Een landingspagina. Een dagdeel filmen, montage in drie formaten, en de livegang rond dag 19.</p></div></div></div></div></section>';
  /* Rekenhulp */
  h+='<section class="s s--wit" id="rekenhulp"><div class="wrap"><div class="mid"><span class="eyebrow rv">De rekenhulp</span><h2 class="h1 rv">Begin bij je ambitie.<span class="l">Niet bij je budget.</span></h2><p class="lead rv rv-2">Hoeveel extra omzet je wilt. Daaruit volgen het aantal klanten, de aanvragen en hoe groot de motor moet zijn.</p></div>'
    +'<div class="rh"><div class="rh-in">'
    +'<div class="rh-r"><label for="rh-omzet">Extra omzet per jaar <b id="rh-o-omzet"></b></label><input type="range" id="rh-omzet" min="25000" max="1000000" step="5000" value="150000"></div>'
    +'<div class="rh-r"><label for="rh-klant">Wat een klant oplevert <b id="rh-o-klant"></b></label><input type="range" id="rh-klant" min="250" max="50000" step="250" value="5000"></div>'
    +'<div class="rh-r"><label for="rh-conv">Aanvragen die klant worden <b id="rh-o-conv"></b></label><input type="range" id="rh-conv" min="5" max="80" step="1" value="25"></div>'
    +'<div class="rh-r"><label for="rh-cpa">Wat een aanvraag ongeveer kost <b id="rh-o-cpa"></b></label><input type="range" id="rh-cpa" min="10" max="400" step="5" value="60"></div>'
    +'<div class="rh-r"><label>Campagnes tegelijk</label><div class="seg" id="rh-camp">'+[1,2,3,4].map(function(n){return '<button type="button"'+(n===1?' class="op"':'')+'>'+n+'</button>'}).join('')+'</div></div>'
    +'</div><div class="rh-uit" aria-live="polite"><small>Jouw opstelling</small><div class="rh-pakket" id="rh-pakket">Starter</div><small id="rh-reden"></small>'
    +'<div class="rh-lijst"><div><span>Nieuwe klanten</span><b id="rh-klanten"></b></div><div><span>Aanvragen</span><b id="rh-aanvragen"></b></div><div><span>Advertentiebudget</span><b id="rh-budget"></b></div><div><span>Ons pakket</span><b id="rh-retainer"></b></div></div>'
    +'<p class="mini" id="rh-min" hidden style="margin-top:12px"></p>'
    +'<div class="rh-balk"><i id="rh-m1"></i><i id="rh-m2"></i></div><div class="rh-leg"><span id="rh-l1"></span><span id="rh-l2"></span></div>'
    +'<div class="rh-tot"><span>Per maand samen</span><b id="rh-totaal"></b></div><div class="rh-tot" style="margin-top:10px"><span class="mini" style="color:var(--inv-2)">Eerste jaar, met fundament</span><span id="rh-jaar" style="font-weight:600"></span></div>'
    +'<p class="mini" style="margin-top:24px">Een rekensom, geen belofte. Ons pakket is nooit meer dan de helft van wat je samen uitgeeft.</p></div></div></div></section>';
  /* Regels */
  h+='<section class="s s--donker"><div class="wrap"><span class="eyebrow rv">De regels</span><h2 class="h1 rv">Vier regels.<span class="l">Geen uitzonderingen.</span></h2><div class="stappen">'
    +[['Het hoogste van twee','Je pakket volgt uit het aantal campagnes of uit je budget. Wat hoger uitkomt, telt.'],['Tegelijk is tegelijk','Een campagne is één aanbod, voor één doelgroep, met één landingspagina. Google en Meta samen tellen als één.'],['Wij kiezen de kanalen','Minimaal € 500 per kanaal per campagne per maand. Op LinkedIn € 1.000.'],['Omhoog per direct','Omlaag per de eerste van de volgende maand.']]
      .map(function(r,i){return '<div class="stap rv rv-'+(i+1)+'"><small>Regel '+(i+1)+'</small><h3>'+r[0]+'</h3><p>'+r[1]+'</p></div>'}).join('')+'</div>'
    +'<div class="split" style="margin-top:120px"><div><h2 class="h2 rv">De 50%-regel.</h2><p class="lead rv">Ons pakket is nooit meer dan de helft van wat je samen uitgeeft. Advertentiebudget is de motor, geen restpost.</p></div><div class="stat rv rv-2"><small>Maximaal</small><b class="verloop" style="font-size:clamp(88px,10vw,140px)">50%</b><span>van pakket plus advertentiebudget is voor ons.</span></div></div></div></section>';
  /* Spelregels */
  h+='<section class="s s--wit"><div class="wrap"><div class="mid"><span class="eyebrow rv">Spelregels</span><h2 class="h1 rv">Wat je krijgt. Wat we vragen.</h2></div><div class="twee">'
    +'<div class="rv"><h3>Van ons</h3><ul class="vink"><li>Resultaat staat op één. Werkt iets niet, dan zeggen we het zelf.</li><li>Alles op jouw naam. Wij zijn beheerder, nooit eigenaar.</li><li>Nooit iets erbovenop. Doorverwijsvergoedingen melden we.</li><li>Niets gratis erbij. Wat erbuiten valt, krijgt vooraf een prijs.</li><li>Elke uiting klopt met je merk.</li></ul></div>'
    +'<div class="rv rv-2"><h3>Van jou</h3><ul class="vink"><li>Alle toegangen binnen 3 werkdagen na het tekenen.</li><li>Eén beslisser, die binnen 2 werkdagen reageert.</li><li>Elke aanvraag opgevolgd binnen de afgesproken tijd, ook bij vakantie.</li><li>Per aanvraag een oordeel in het portaal.</li><li>Dagdelen om te filmen, en iemand die het werk doet op beeld.</li></ul></div></div></div></section>';
  /* Toolset */
  h+='<section class="s s--grijs"><div class="wrap wrap--tekst"><span class="eyebrow rv">Op jouw naam</span><h2 class="h2 rv">De toolset.</h2><p class="lead rv">De leverancier factureert rechtstreeks aan jou. Wij zetten er niets bovenop.</p><div class="faq" style="margin-top:40px">'
    +['portaal','mailerlite','cookiescript','webmix','leadinfo','clickcease','calendly'].map(function(k){var t=JR.tools[k];return '<div style="display:flex;justify-content:space-between;gap:16px;padding:20px 0;border-bottom:1px solid var(--lijn)"><div><b style="font:600 19px var(--display)">'+t[0]+'</b><div class="klein grijs">'+t[1]+' '+t[3]+'.</div></div><b style="white-space:nowrap;font-weight:500">'+t[2]+'</b></div>'}).join('')+'</div></div></section>';
  h+='<section class="s s--wit"><div class="wrap wrap--tekst"><h2 class="h2">Veelgestelde vragen.</h2><div class="faq">'
    +[['Waarom geen uurtarief?','Omdat we niet worden afgerekend op uren, maar op aanvragen en wat ze kosten. Een vaste prijs per maand houdt ons scherp op wat het oplevert.'],['Wat als het niet werkt?','Dan zeggen we het zelf, met de cijfers erbij. Er is altijd een meetlat: de nulmeting en het doel. Je kunt maandelijks opzeggen.'],['Kan ik later een ander pakket kiezen?','Ja. Omhoog gaat per direct, omlaag per de eerste van de volgende maand.'],['Waarom is het fundament niet los te koop?','Het fundament is de voorbereiding op het seizoen. Zonder seizoen erachter levert het je niets op.']]
      .map(function(f){return '<details><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>'}).join('')+'</div></div></section>';
  h+=slot();
  return h;
};

/* ---------- Werkwijze ---------- */
PAGINA.werkwijze=function(){
  var h=lokaal('Werkwijze');
  h+='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw rv">Werkwijze</span><h1 class="hx rv">Geen gok.<span class="l">Een systeem.</span></h1><p class="lead rv rv-2">Voorspelbaar nieuwe aanvragen via advertenties, en elke maand iets goedkoper. Alles meetbaar, en jij ziet dezelfde cijfers als wij.</p></div></section>';
  h+='<section class="s--wit"><div class="wrap wrap--breed rv">'+beeld('intake','kantoor','r-219 rond')+'</div></section>';
  h+='<section class="s s--wit"><div class="wrap"><span class="eyebrow rv">Het systeem</span><h2 class="h1 rv">Vier onderdelen.</h2><div class="stappen">'
    +[['De motor','Adverteren','Google Ads en Meta, standaard. LinkedIn bij zakelijke klanten, TikTok als je doelgroep daar zit.'],['De brandstof','Content','Eerst een contentplan, dan een draaidag op locatie. In 9:16, 4:5 en 1:1.'],['De landing','Je website','Eén pagina per campagne, met één boodschap en één actie.'],['De voordeur','Een aanvraag','Daar eindigt ons werk. Daarna ben jij aan zet.']]
      .map(function(s,i){return '<div class="stap rv rv-'+(i+1)+'"><small>'+s[0]+'</small><h3>'+s[1]+'</h3><p>'+s[2]+'</p></div>'}).join('')+'</div>'
    +'<div class="raster-4">'+[['Conversie','Meer aanvragen uit hetzelfde verkeer.','conversie-optimalisatie'],['E-mail','Terughalen wie er al was.','e-mailmarketing'],['SEO','Verkeer zonder kosten per klik, op bewezen woorden.','seo'],['Landingspagina\'s','Verbeteren of toevoegen.','conversie-optimalisatie']]
      .map(function(v,i){return '<a class="vlak rv rv-'+(i+1)+'" href="#/diensten/'+v[2]+'"><span class="eyebrow eyebrow--klein">Versneller</span><h3>'+v[0]+'</h3><p>'+v[1]+'</p></a>'}).join('')+'</div></div></section>';
  /* De keten */
  h+='<section class="s s--donker"><div class="wrap mid"><span class="eyebrow rv">De keten</span><h2 class="h1 rv">Twee van de honderd doen iets.</h2><p class="lead rv rv-2">De andere achtennegentig waren er ook. Daarom is één procentpunt conversie meer waard dan veel extra budget.</p>'
    +'<div class="stats stats--rij" style="grid-template-columns:repeat(4,1fr);margin-top:72px">'+[['Balbezit','Impressies','Wie je advertentie ziet.'],['Kansen','Bezoekers','Wie doorklikt. De doorklikratio.'],['Op doel','Aanvragen','Wie iets doet. De conversieratio.'],['Doelpunt','Klanten','Wie klant wordt. Dat is jouw schakel.']]
      .map(function(k,i){return '<div class="stat rv rv-'+(i+1)+'"><small>'+k[0]+'</small><b style="font-size:clamp(28px,3vw,40px)">'+k[1]+'</b><span>'+k[2]+'</span></div>'}).join('')+'</div></div></section>';
  /* Klantreis */
  h+='<section class="s s--wit"><div class="wrap"><span class="eyebrow rv">De klantreis</span><h2 class="h1 rv">Acht stappen.</h2><ol class="reis">'
    +[['Van aanvraag tot afspraak','Een korte video, vijftien vragen en meteen een uitkomst.','Verkopen'],['De scouting · quickscan','We bekijken je website en je markt. Een half uur.','Verkopen'],['Het intakegesprek','Een uur aan tafel, in Hulsberg of bij jou.','Verkopen'],['Het gameplan · voorstel','Binnen 3 werkdagen een voorstel op jouw cijfers. Daarna 45 minuten samen.','Verkopen'],['Tekenen','Digitaal, dezelfde dag.','Starten'],['De onboarding','Toegangen binnen 3 werkdagen, een sessie van 45 minuten.','Starten'],['De voorbereiding · fundament','Set-up en content in ongeveer vier weken. Live rond dag 19.','Starten'],['Het seizoen','Dagelijkse controle, een update per maand, een Performance Review en de 100-dagenreview.','Samenwerken']]
      .map(function(s,i){return '<li class="rv"><span class="nr">0'+(i+1)+'</span><div><h3>'+s[0]+'</h3><p>'+s[1]+'</p></div><span class="fase">'+s[2]+'</span></li>'}).join('')+'</ol></div></section>';
  h+=slot();
  return h;
};

/* ---------- Portaal ---------- */
PAGINA.portaal=function(){
  var h=lokaal('Het scorebord','<a class="knop knop--rand" href="#/inloggen">Inloggen</a>');
  h+='<section class="s gr gr--licht pk mid" style="overflow:hidden"><div class="wrap"><span class="eyebrow eyebrow--blauw rv">Het portaal</span><h1 class="hx rv">Geen rapport.<span class="l">Een scorebord.</span></h1><p class="lead rv rv-2">Alle cijfers van al je kanalen op één scherm, elk uur bijgewerkt. Het blijft van jou, ook als je stopt.</p></div>'
    +'<div class="wrap wrap--breed" style="margin-top:72px"><div class="rv">'+laptop()+'</div><p class="mid voorbeeld-label">Voorbeeldcijfers.</p></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="kenmerken" style="margin-top:0">'
    +'<div class="kenmerk rv">'+ic('klok')+'<p><b>Elk uur bijgewerkt.</b> Google, Meta, LinkedIn, TikTok, je website en Search Console.</p></div>'
    +'<div class="kenmerk rv rv-2">'+ic('duim')+'<p><b>Per aanvraag een oordeel.</b> Goed, twijfel of niet goed. En later: werd het een klant.</p></div>'
    +'<div class="kenmerk rv rv-3">'+ic('sleutel')+'<p><b>De merkkluis.</b> Logo\'s, foto\'s, video\'s en je huisstijl op één plek.</p></div></div></div></section>';
  h+='<section class="s s--donker" style="overflow:hidden"><div class="wrap"><div class="split" style="align-items:center"><div><span class="eyebrow">Ook in je broekzak</span><h2 class="h1">Een aanvraag.<br>Nu.</h2><p class="lead">Elke nieuwe aanvraag direct op je telefoon. Hoe sneller je belt, hoe groter de kans op een gesprek.<sup class="vn"><a href="#noten">2</a></sup></p></div><div style="display:flex;justify-content:center;gap:24px">'+tel(SCHERM.slot(),'tel--donker')+'</div></div></div></section>';
  h+=slot('Bekijk het met','je eigen cijfers.','In het intakegesprek laten we het portaal zien. Daarna weet je of het past.');
  return h;
};

/* ---------- Team en spelers ---------- */
PAGINA.team=function(){
  var h='<section class="held s--zwart" style="min-height:min(80vh,760px)">'+beeld('team','kantoor')+'<div class="verdonker"></div><div class="held-in"><h1 class="eyebrow rv">Over James Robinson</h1><p class="hx rv rv-2">Geen bureau.<span class="l">Een selectie.</span></p></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="split"><div><h2 class="h1 rv">Bedacht in 2017.<br>Opgericht in 2018.</h2><div class="tekst rv rv-2"><p>Een performance-marketingbureau in Hulsberg, voor ondernemers in Zuid-Limburg. Online is ons vak, maar de beste gesprekken voer je aan tafel.</p><p>Jim Coumans richtte het bureau op. Jim Kikken is sinds 2022 mede-eigenaar, met data-gedreven performance marketing als vak. Voor fotografie, video, animatie en techniek werken we met vaste specialisten.</p></div></div>'
    +'<div class="stats">'+stat('In Hulsberg','10','mensen in de selectie.')+stat('Begonnen als stagiair','7','van de tien. We leiden op in onze eigen manier van werken.')+'</div></div></div></section>';
  h+='<section class="s s--donker"><div class="wrap"><span class="eyebrow rv">De selectie</span><h2 class="h1 rv">Staf, selectie en jeugd.</h2><div class="raster-4">'+Object.keys(JR.team).map(function(k){return '<div class="rv">'+spelerKaart(k)+'</div>'}).join('')+'</div></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="bento" style="margin-top:0"><div class="tegel op-beeld b-3 rv">'+beeld('kantoor','daglicht')+'<span class="eyebrow" style="color:var(--ink)">Het kantoor</span><h3 style="color:var(--ink)">Ingericht om te presteren.</h3><p class="grijs" style="color:var(--ink-2)">Plekken voor stilte. Ruimte voor grote ideeën.</p></div>'
    +'<a class="tegel tegel--donker b-3 rv rv-2" href="#/werken-bij" style="color:var(--inv)"><span class="eyebrow eyebrow--blauw">Werken bij</span><h3>Speel mee.</h3><p class="grijs">Stage, afstuderen of een vaste plek in de selectie.</p><div class="tegel-voet" style="padding-bottom:44px"><span class="ln-k">Bekijk de vacatures</span></div></a></div></div></section>';
  h+=slot();
  return h;
};
PAGINA.speler=function(k){
  var p=JR.team[k]; if(!p)return PAGINA.nietGevonden();
  var h='<section class="s s--donker" style="padding-top:72px"><div class="wrap"><a class="ln-k" href="#/team" style="font-size:14px">De selectie</a><div class="split" style="margin-top:40px;align-items:end"><div class="kaart speler"><div class="media rond" style="border-radius:var(--r-l)">'+beeld('portret','studio','',{sil:1})+'<span class="nr" style="font-size:160px">'+p.nr+'</span></div></div>'
    +'<div><span class="eyebrow eyebrow--blauw">'+vul(p.rol)+'</span><h1 class="h1">'+vul(p.n)+'</h1><p class="lead">'+vul(p.spec)+'</p>'+(p.jrnxt?'<span class="speler"><span class="badge" style="margin-top:20px">JRNXT · begon als stagiair</span></span>':'')
    +'<div class="stats stats--rij stats--klein" style="margin-top:48px;grid-template-columns:repeat(3,1fr)">'+stat('Bij James Robinson',vul(p.sinds),'sinds')+stat('Cases',vul('[ ]'),'als speler')+stat('Artikelen',vul('[ ]'),'zelf geschreven')+'</div></div></div></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="raster-3" style="margin-top:0">'+[['Bio','[Een paar zinnen in de eigen woorden van de speler.]'],['Trots op','[Eén resultaat of moment.]'],['Volgens een collega','[Eén zin van een collega.]']].map(function(b){return '<div class="vlak"><span class="eyebrow eyebrow--klein">'+b[0]+'</span><p style="color:var(--ink);font:600 21px/1.35 var(--display);letter-spacing:-.015em">'+vul(b[1])+'</p></div>'}).join('')+'</div></div></section>';
  h+=slot();
  return h;
};

/* ---------- Werken bij ---------- */
PAGINA['werken-bij']=function(){
  var h='<section class="held s--zwart" style="min-height:min(80vh,760px)">'+beeld('werken','kantoor')+'<div class="verdonker"></div><div class="held-in"><h1 class="eyebrow rv">Werken bij James Robinson</h1><p class="hx rv rv-2">Begin als stagiair.<span class="l">Speel in de selectie.</span></p><div class="knoppen rv rv-3"><a class="knop knop--licht" href="#vacatures">Bekijk de vacatures</a></div></div></section>';
  h+='<section class="s s--wit mid"><div class="wrap"><span class="eyebrow rv">JRNXT</span><h2 class="h1 rv">De jeugdopleiding.</h2><p class="lead rv rv-2">Je leert het vak in onze manier van werken, met echte klanten en echte budgetten.</p></div></section>';
  h+='<section class="s s--grijs" id="vacatures"><div class="wrap wrap--tekst"><h2 class="h2">Open plekken.</h2><div class="faq" style="margin-top:32px">'
    +Object.keys(JR.vacatures).map(function(k){var v=JR.vacatures[k];return '<a href="#/contact" style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:24px 0;border-bottom:1px solid var(--lijn);color:var(--ink)"><div><span class="label">'+v[1]+'</span><b style="display:block;font:600 24px/1.25 var(--display);letter-spacing:-.02em;margin-top:10px">'+v[0]+'</b><span class="grijs">'+v[2]+'</span></div><span class="ln-k">Solliciteer</span></a>'}).join('')+'</div></div></section>';
  h+='<section class="s s--donker"><div class="wrap"><div class="bento" style="margin-top:0"><a class="tegel op-beeld b-3 rv" href="#/playground" style="color:#fff">'+beeld('club-padel','avond')+'<span class="eyebrow">De playground</span><h3>Ook buiten kantoor een team.</h3><p class="grijs">Padel tegen bedrijven uit de regio.</p></a><a class="tegel op-beeld b-3 rv rv-2" href="#/events" style="color:#fff">'+beeld('club-thuis','avond')+'<span class="eyebrow">Events</span><h3>Thuiswedstrijden.</h3><p class="grijs">Met klanten, met het team, of op een podium.</p></a></div></div></section>';
  h+=slot('Geen vacature die past.','Wel een speler die past.','Stuur een open sollicitatie.');
  return h;
};

/* ---------- Club ---------- */
PAGINA.playground=function(){
  var h='<section class="s s--donker" style="padding-top:72px"><div class="wrap"><div class="poster rv" style="min-height:min(78vh,700px)">'+beeld('club-padel','avond')+'<span class="eyebrow">De playground · Duel 01 · Padel</span><div><h1 class="vs" style="font-size:clamp(48px,8vw,112px)">James Robinson<em>vs</em>Fagro</h1><p style="margin-top:16px;color:rgba(255,255,255,.8)">'+vul('[datum] · [uitslag]')+'</p></div></div></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="split"><div><span class="eyebrow">Daag ons uit</span><h2 class="h1">Jullie team.<br>Ons team.</h2><p class="lead">Padel of een andere sport. Elk duel krijgt een eigen pagina, met de uitslag.</p></div><form class="raster-2" style="margin-top:0;grid-template-columns:1fr" onsubmit="return false"><div class="veld"><label for="pg-b">Bedrijfsnaam</label><input id="pg-b"></div><div class="veld"><label for="pg-s">Sport</label><select id="pg-s"><option>Padel</option><option>Iets anders</option></select></div><div class="veld"><label for="pg-m">E-mailadres</label><input id="pg-m" type="email"></div><div><button class="knop" type="submit">Daag ons uit</button></div></form></div></div></section>';
  return h+slot();
};
PAGINA.events=function(){
  var soort={eigen:'Voor klanten en ondernemers',team:'Teamevent',extern:'Op het podium'};
  var h='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw">Events</span><h1 class="hx">Thuis&shy;wedstrijden.<span class="l">Iedereen welkom.</span></h1><p class="lead">Met klanten, met het team, of waar we spreken. Na afloop een terugblik met foto\'s.</p></div></section>';
  h+='<section class="s s--wit s--naad"><div class="wrap wrap--tekst"><div class="faq" style="margin-top:0">'+JR.events.map(function(e){return '<div style="display:grid;grid-template-columns:80px 1fr auto;gap:20px;align-items:center;padding:24px 0;border-bottom:1px solid var(--lijn)"><div style="text-align:center"><b style="display:block;font:700 32px/1 var(--display)">'+vul(e.d)+'</b><span class="klein grijs">'+vul(e.m)+'</span></div><div><span class="label">'+soort[e.soort]+'</span><b style="display:block;font:600 21px/1.25 var(--display);margin-top:8px">'+vul(e.t)+'</b><span class="klein grijs">'+vul(e.p)+' · '+vul(e.plek)+'</span></div>'+(e.soort==='eigen'?'<a class="knop knop--klein" href="#/contact">Aanmelden</a>':'<span></span>')+'</div>'}).join('')+'</div></div></section>';
  return h+slot();
};

/* ---------- Kennis ---------- */
PAGINA.kennis=function(){
  var ks=Object.keys(JR.artikelen), eerste=JR.artikelen[ks[0]];
  var h='<section class="s gr gr--licht pk"><div class="wrap"><span class="eyebrow eyebrow--blauw">De analyse</span><h1 class="hx">Wat we leren.<span class="l">Ongefilterd.</span></h1></div></section>';
  h+='<section class="s--wit"><div class="wrap"><a class="tegel tegel--donker rv" href="#/kennis/'+ks[0]+'" style="min-height:460px;color:var(--inv);justify-content:space-between;padding-bottom:44px"><span class="eyebrow eyebrow--blauw">'+eerste.s+' · '+eerste.min+' minuten</span><div><div class="cijfer-xl verloop" style="font-size:clamp(96px,14vw,200px)">'+eerste.n+'</div><h2 class="h2" style="max-width:760px;margin-top:12px">'+eerste.t+'</h2></div></a></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="raster-3" style="margin-top:0">'+ks.slice(1).map(function(k,i){var a=JR.artikelen[k];return '<a class="vlak rv rv-'+(i%3+1)+'" href="#/kennis/'+k+'" style="min-height:300px"><span class="eyebrow eyebrow--klein">'+a.s+' · '+a.min+' min</span><div class="verloop" style="font:700 56px/1 var(--display);letter-spacing:-.04em;margin:18px 0">'+a.n+'</div><h3>'+a.t+'</h3></a>'}).join('')+'</div></div></section>';
  return h+slot();
};
PAGINA.artikel=function(k){
  var a=JR.artikelen[k]; if(!a)return PAGINA.nietGevonden();
  var h='<section class="s gr gr--licht pk"><div class="wrap wrap--tekst"><a class="ln-k" href="#/kennis" style="font-size:14px">De analyse</a><span class="eyebrow eyebrow--klein" style="margin-top:32px">'+a.s+' · '+a.min+' minuten lezen</span><h1 class="h1" style="font-size:clamp(36px,4.6vw,56px)">'+a.t+'</h1></div></section>';
  h+='<section class="s s--wit s--naad"><div class="wrap wrap--tekst"><div class="prose">'+(a.body||'<p>'+vul('[Artikel in te vullen]')+'</p>')+'</div></div></section>';
  return h+slot();
};

/* ---------- Branches ---------- */
PAGINA.branche=function(k){
  var b=JR.branches[k]; if(!b)return PAGINA.nietGevonden();
  var h='<section class="held s--zwart" style="min-height:min(76vh,720px)">'+beeld('b-'+k,k==='horeca'?'warm':(k==='zorg'||k==='zakelijke-dienstverlening'?'daglicht':'kantoor'))+'<div class="verdonker"></div><div class="held-in"><h1 class="eyebrow rv" style="color:#fff">Marketing voor '+b.n.toLowerCase()+'</h1><p class="hx rv rv-2" style="color:#fff">'+b.r+'</p></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="split"><div><span class="eyebrow">'+b.n+'</span><h2 class="h1">Waar we op sturen.</h2><p class="lead">Op '+b.doel+'. Niet op bereik of likes.</p></div><ul class="vink">'+b.w.map(function(w){return '<li>'+w+'</li>'}).join('')+'</ul></div></div></section>';
  h+='<section class="s s--grijs"><div class="wrap"><div class="raster-4" style="margin-top:0">'+Object.keys(JR.branches).filter(function(x){return x!==k}).slice(0,4).map(function(x){return '<a class="vlak" href="#/branches/'+x+'"><span class="eyebrow eyebrow--klein">Branche</span><h3>'+JR.branches[x].n+'</h3><p>'+JR.branches[x].r+'</p></a>'}).join('')+'</div></div></section>';
  return h+slot();
};

/* ---------- Uitslagen ---------- */
PAGINA.resultaten=function(){
  var h='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw">Uitslagen</span><h1 class="hx">De stand.<span class="l">Voor en na.</span></h1><p class="lead">Wedstrijdverslagen met echte cijfers en de naam van de klant. Ze verschijnen hier zodra de klant akkoord geeft.</p></div></section>';
  h+='<section class="s s--grijs mid"><div class="wrap"><div class="cijfer-xl verloop">5,0</div>'+sterren()+'<p class="lead" style="margin-top:4px">Elf reviews op Google.<sup class="vn"><a href="#noten">3</a></sup></p></div></section>';
  return h+slot();
};

/* ---------- Contact ---------- */
PAGINA.contact=function(){
  var h='<section class="s gr gr--licht pk mid"><div class="wrap"><span class="eyebrow eyebrow--blauw">Contact</span><h1 class="hx">Bel. Mail.<span class="l">Of kom langs.</span></h1><p class="lead">Online is ons vak. De beste gesprekken voer je aan tafel.</p></div></section>';
  h+='<section class="s--wit"><div class="wrap wrap--breed">'+beeld('pand','avond','r-219 rond')+'</div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="raster-3" style="margin-top:0">'
    +'<div class="vlak"><span class="eyebrow eyebrow--klein">Bellen</span><h3>045 792 0009</h3><p>Maandag tot en met vrijdag, 8.00 tot 18.00 uur. Ligt je campagne of website eruit, bel dan altijd.</p><a class="ln-k" href="tel:0457920009">Bel ons</a></div>'
    +'<div class="vlak"><span class="eyebrow eyebrow--klein">Mailen</span><h3>support@<wbr>jamesrobinson.nl</h3><p>Antwoord binnen één werkdag, van wie erover gaat.</p><a class="ln-k" href="mailto:support@jamesrobinson.nl">Stuur een mail</a></div>'
    +'<div class="vlak"><span class="eyebrow eyebrow--klein">Langskomen</span><h3>Hulsberg</h3><p>'+vul('[Straat en huisnummer], [postcode] Hulsberg')+'</p><a class="ln-k" href="#/past-het">Plan een intakegesprek</a></div>'
    +'</div></div></section>';
  return h;
};

/* ---------- Beeldregie ---------- */
PAGINA.beeldregie=function(){
  var h='<section class="s gr gr--licht pk"><div class="wrap"><span class="eyebrow eyebrow--blauw">Voor de shoot</span><h1 class="hx">Beeldregie.</h1><p class="lead">Elk beeldvlak op de site, met wat erin moet. Gegroepeerd per draaidag, zodat je in vier dagen alles hebt. Tot die tijd staat er een lichtstudie in dezelfde sfeer.</p></div></section>';
  Object.keys(DAGEN).forEach(function(d){
    var ids=Object.keys(SHOTS).filter(function(k){return SHOTS[k].dag===d});
    h+='<section class="s s--grijs s--naad"><div class="wrap"><h2 class="h2">'+DAGEN[d]+'</h2><p class="grijs" style="margin-top:6px">'+ids.length+' beeld'+(ids.length>1?'en':'')+'</p><div class="shots">'
      +ids.map(function(k){var s=SHOTS[k],t={A:'avond',B:'kantoor',C:'warm',D:'studio',E:'merk'}[d];return '<article class="shot">'+beeld(k,t,'',{sil:d==='D',geenCap:1,geenPauze:1})+'<div class="in"><small>'+(s.v?'Video':'Foto')+'</small><h3>'+s.t+'</h3><dl><dt>Wat</dt><dd>'+s.wat+'</dd><dt>Waar</dt><dd>'+s.waar+'</dd><dt>Licht</dt><dd>'+s.licht+'</dd><dt>Formaat</dt><dd>'+s.fmt+'</dd></dl></div></article>'}).join('')+'</div></div></section>';
  });
  h+='<section class="s s--wit"><div class="wrap wrap--tekst"><h2 class="h2">Voor alle beelden.</h2><ul class="vink" style="margin-top:24px"><li>Eigen beeld. Geen stockfoto\'s.</li><li>Echte mensen, echte momenten. Niemand kijkt in de camera, behalve in de portretten.</li><li>Gestyled, niet kunstzinnig. Rustige achtergronden, veel ruimte boven het onderwerp voor tekst.</li><li>Elke foto ook in 4:5 en 9:16, zodat hij in advertenties terugkomt.</li><li>Video zonder geluid te begrijpen, loops van 8 tot 12 seconden.</li></ul></div></section>';
  return h;
};

PAGINA.nietGevonden=function(){
  return '<section class="s gr gr--licht pk mid" style="min-height:70vh"><div class="wrap"><span class="eyebrow eyebrow--blauw">404</span><h1 class="hx">Buitenspel.</h1><p class="lead">Deze pagina bestaat niet, of niet meer.</p><div class="knoppen"><a class="knop" href="#/">Naar de homepage</a></div></div></section>';
};

/* ======================= De check: 15 vragen ======================= */
var check=(function(){
  var BANDEN=['Minder dan € 1.000','€ 1.000 – 2.500','€ 2.500 – 5.000','Meer dan € 5.000'], GEEN='Ik heb nog geen website';
  var V=[
    {id:'aanWie',o:'Je bedrijf',v:'Aan wie verkoop je',s:'keuze',opt:['Aan bedrijven','Aan particulieren','Aan allebei']},
    {id:'hoeKlant',o:'Je bedrijf',v:'Hoe word je klant bij jou',s:'keuze',opt:['Ze vragen een offerte, afspraak of reservering aan','Ze kopen direct online','Ze komen langs in de winkel of zaak','Een combinatie']},
    {id:'watVerkoop',o:'Je bedrijf',v:'Wat verkoop je, in één zin',h:'Geen slogan. Gewoon wat iemand bij je koopt.',s:'tekst',ph:'Badkamers op maat, inclusief montage'},
    {id:'waar',o:'Je klanten',v:'Waar zitten je klanten',s:'keuze',opt:['In de regio rond mijn vestiging','In heel Nederland','In Nederland en daarbuiten']},
    {id:'budgetNu',o:'Je marketing',v:'Wat geef je nu per maand uit aan marketing',h:'Advertenties, bureaus, freelancers, drukwerk. Ons kleinste pakket kost, samen met het advertentiebudget, ongeveer €&nbsp;2.000 per maand.',s:'keuze',opt:['Nog niets'].concat(BANDEN)},
    {id:'waaraan',o:'Je marketing',v:'Waar geef je het aan uit',h:'Nog niets uitgegeven? Kies dan waar je het aan wilt gaan uitgeven.',s:'meer',opt:['Google of Bing','Facebook of Instagram','LinkedIn','TikTok','Vindbaar zonder advertenties','E-mail','Social zonder advertenties','Drukwerk, radio of tv','Een bureau of freelancer'],optioneel:1},
    {id:'budgetGepland',o:'Je marketing',v:'Wat wil je per maand gaan uitgeven',s:'keuze',opt:BANDEN,optioneel:1},
    {id:'website',o:'Je marketing',v:'Het adres van je website',h:'Die bekijken we voor het gesprek, samen met je markt.',s:'url'},
    {id:'opdracht',o:'Je cijfers',v:'Wat een gemiddelde opdracht waard is',h:'Wat een klant per keer betaalt. Hieruit rekenen we uit wat een aanvraag mag kosten.',s:'getal',voor:'€'},
    {id:'duur',o:'Je cijfers',v:'Hoe lang een klant gemiddeld klant blijft',s:'keuze',opt:['Eenmalige aankoop','Korter dan een jaar','Een tot twee jaar','Drie tot vijf jaar','Langer dan vijf jaar']},
    {id:'perJaar',o:'Je cijfers',v:'Hoe vaak een klant per jaar koopt',h:'Een getal van 1 tot 52.',s:'getal',na:'keer per jaar',optioneel:1},
    {id:'aanvragen',o:'Je cijfers',v:'Hoeveel aanvragen je nu per maand krijgt',h:'Telefoon, mail en formulieren samen. Dit is het vertrekpunt waar we straks alles mee vergelijken.',s:'getal',na:'per maand'},
    {id:'conversie',o:'Je cijfers',v:'Welk deel daarvan klant wordt',h:'Weet je het niet, laat het dan leeg. We rekenen dan met 20%.',s:'getal',na:'%',optioneel:1},
    {id:'doorlooptijd',o:'Je klanten',v:'Hoe lang het duurt van eerste contact tot opdracht',s:'keuze',opt:['Direct','Een paar dagen','Een paar weken','Een paar maanden','Langer dan een half jaar']},
    {id:'knelpunt',o:'Je doel',v:'Waar je nu tegenaan loopt',s:'meer',opt:['Te weinig aanvragen','Wel aanvragen, maar niet de goede','Aanvragen worden te weinig klant','Geen tijd of kennis om het zelf te doen','Niet weten wat marketing oplevert'],optioneel:1},
    {id:'beginnen',o:'Je doel',v:'Wanneer je wilt beginnen',s:'keuze',opt:['Zo snel mogelijk','Binnen een maand','Binnen drie maanden','Later dan drie maanden','Ik oriënteer me nog']}
  ];
  var st={stap:'intro',i:0,a:{},slot:null};
  function getal(w){if(typeof w!=='string')return null;var t=w.replace(/[€%\s]/g,'');if(t==='')return null;if(t.indexOf(',')>=0&&t.indexOf('.')>=0)t=t.replace(/\./g,'').replace(',','.');else if(t.indexOf(',')>=0)t=t.replace(',','.');else if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,'');var n=Number(t);return isFinite(n)?n:null}
  function euro(n){return '€ '+n.toLocaleString('nl-NL',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})}
  function lijst(){var a=st.a;return V.filter(function(v){return !(v.id==='budgetGepland'&&a.budgetNu!=='Nog niets')&&!(v.id==='perJaar'&&a.duur==='Eenmalige aankoop')})}
  function heeft(v){var w=st.a[v.id];return Array.isArray(w)?w.length>0:(typeof w==='string'&&w.trim()!=='')}
  function som(){var a=st.a,op=getal(a.opdracht);if(op===null||op<=0)return null;var een=a.duur==='Eenmalige aankoop',keer=een?1:Math.min(52,Math.max(1,getal(a.perJaar)||1)),jr=a.duur==='Korter dan een jaar'?.5:1,geen=getal(a.aanvragen)===0,c=geen?null:getal(a.conversie),conv=c===null?20:Math.min(100,Math.max(0,c)),om=op*keer,max=Math.round(om*.3*jr*(conv/100)*100)/100;
    return {max:max,rijen:[['Gemiddelde opdracht',euro(op)],[een?'Eenmalige aankoop':'Keer per jaar','× '+keer],['Omzet per klant per jaar',euro(om)],['Marge','× 30%'],['Terugverdienen binnen',jr===.5?'½ jaar':'1 jaar'],[c===null?'Wordt klant (aangenomen)':'Wordt klant','× '+conv+'%'],['Per aanvraag maximaal',euro(max)]]}}
  function oordeel(){var a=st.a,s=som(),r=[];
    if(a.hoeKlant==='Ze kopen direct online')r.push('Je klanten kopen direct online. Webshops zijn niet ons vak; er zijn bureaus die daar beter in zijn.');
    if(a.website===GEEN)r.push('Je hebt nog geen website. Begin daar: onze partner Webmix bouwt websites waar we later op kunnen adverteren.');
    if(r.length)return{k:'rood',r:r,s:s};
    if(a.beginnen==='Later dan drie maanden'||a.beginnen==='Ik oriënteer me nog')return{k:'later',r:[],s:s};
    var o=[];if(a.budgetNu==='Minder dan € 1.000'||(a.budgetNu==='Nog niets'&&a.budgetGepland==='Minder dan € 1.000'))o.push('Je budget. Ons kleinste pakket kost, samen met het advertentiebudget, ongeveer €&nbsp;2.000 per maand.');
    if(s&&s.max<30)o.push('Wat een aanvraag mag kosten: '+euro(s.max)+'. Dat is krap om winstgevend te adverteren.');
    if(a.aanWie==='Aan bedrijven'&&a.waar==='In de regio rond mijn vestiging'&&a.doorlooptijd==='Langer dan een half jaar')o.push('Je markt: bedrijven in je eigen regio, die er langer dan een half jaar over doen om te beslissen.');
    if(o.length)return{k:'oranje',r:o,s:s};return{k:'groen',r:[],s:s}}
  var T={groen:['b-groen','Het past','Het past. Laten we kennismaken.','We zien een samenwerking voor ons. De volgende stap is het intakegesprek: een uur aan tafel, over je bedrijf en je doelen.'],
    oranje:['b-oranje','Eén punt eerst','Bijna. Eén punt bespreken we eerst.','Iemand van ons belt je binnen één werkdag. Een kwartier, over dit ene punt:'],
    later:['b-later','Nog even niet','Je wilt later beginnen.','We sturen je rond dat moment één bericht. Tot die tijd: één keer per maand de beste stukken in je inbox.'],
    rood:['b-rood','Eerlijk nee','Dan zijn wij nu niet de juiste partij.','Dat zeggen we liever nu dan over drie maanden.']};
  var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  var zijNa='<div class="ck-blok"><span class="eyebrow eyebrow--klein">Wat er daarna gebeurt</span><ol class="reis" style="margin-top:12px"><li style="grid-template-columns:28px 1fr;padding:14px 0"><span class="nr" style="font-size:17px">1</span><div><h3 style="font-size:17px">Direct je uitkomst</h3><p>Groen, oranje of een eerlijk nee.</p></div></li><li style="grid-template-columns:28px 1fr;padding:14px 0"><span class="nr" style="font-size:17px">2</span><div><h3 style="font-size:17px">De scouting</h3><p>We bekijken je website en markt.</p></div></li><li style="grid-template-columns:28px 1fr;padding:14px 0"><span class="nr" style="font-size:17px">3</span><div><h3 style="font-size:17px">Het intakegesprek</h3><p>Een uur aan tafel, in Hulsberg of bij jou.</p></div></li><li style="grid-template-columns:28px 1fr;padding:14px 0"><span class="nr" style="font-size:17px">4</span><div><h3 style="font-size:17px">Je voorstel</h3><p>Binnen 3 werkdagen, op jouw cijfers.</p></div></li></ol></div>';
  var zijBel='<div class="ck-blok"><span class="eyebrow eyebrow--klein">Liever bellen</span><p style="font:600 24px var(--display);letter-spacing:-.02em">045 792 0009</p><p class="klein grijs" style="margin-top:4px">Maandag tot en met vrijdag, 8.00 tot 18.00 uur.</p></div>';
  function render(){
    var el=document.getElementById('check-app'); if(!el)return; var a=st.a, h='';
    if(st.stap==='intro'){
      h='<div class="ck-kaart"><span class="eyebrow eyebrow--klein">De voorbespreking</span><h1 class="h1" style="font-size:clamp(36px,4.6vw,60px)">Vijftien vragen.<span class="l" style="display:block;font-weight:300">Eén eerlijk antwoord.</span></h1><p class="lead">Over je bedrijf, je klanten en je marketing nu. Je krijgt meteen een eerlijk antwoord, met de rekensom erbij: wat een aanvraag jou mag kosten.</p><div class="knoppen"><button class="knop knop--groot" data-a="start" type="button">Start de check</button><span class="klein grijs">Geen account nodig.</span></div></div><aside class="ck-zij">'+zijNa+zijBel+'</aside>';
    } else if(st.stap==='vraag'){
      var L=lijst(), i=Math.min(st.i,L.length-1), v=L[i], w=a[v.id], kan=v.optioneel||heeft(v), laatste=i===L.length-1;
      h='<div class="ck-kaart"><div class="ck-teller"><span>Vraag '+(i+1)+' van '+L.length+'</span><span>'+v.o+'</span></div><div class="ck-bar"><i style="width:'+Math.round((i+1)/(L.length+1)*100)+'%"></i></div><h1 class="ck-vraag">'+v.v+'</h1>';
      if(v.s==='keuze'||v.s==='meer'){h+='<div class="ck-opties">'+v.opt.map(function(o,n){var on=v.s==='meer'?(Array.isArray(w)&&w.indexOf(o)>=0):w===o;return '<button type="button" class="ck-opt'+(v.s==='meer'?' multi':'')+(on?' on':'')+'" data-o="'+n+'" aria-pressed="'+on+'"><i></i>'+esc(o)+'</button>'}).join('')+'</div>'}
      else if(v.s==='url'){h+='<div class="ck-input"><input id="ck-in" type="url" placeholder="www.jouwbedrijf.nl" value="'+(w&&w!==GEEN?esc(w):'')+'"></div><button type="button" class="ck-opt multi'+(w===GEEN?' on':'')+'" data-a="geen" style="margin-top:12px"><i></i>Ik heb nog geen website</button>'}
      else {h+='<div class="ck-input">'+(v.voor?'<span class="fix">'+v.voor+'</span>':'')+'<input id="ck-in" type="'+(v.s==='getal'?'text':'text')+'" inputmode="'+(v.s==='getal'?'decimal':'text')+'" placeholder="'+esc(v.ph||'')+'" value="'+(w?esc(w):'')+'">'+(v.na?'<span class="fix" style="font:400 18px var(--text)">'+v.na+'</span>':'')+'</div>'}
      h+='<div class="ck-nav"><button class="ck-terug" type="button" data-a="terug">‹ Vorige</button><button class="knop" type="button" data-a="verder"'+(kan?'':' disabled')+'>'+(laatste?'Naar je gegevens':(v.optioneel&&!heeft(v)?'Overslaan':'Volgende'))+'</button></div></div>';
      h+='<aside class="ck-zij">'+(v.h?'<div class="ck-blok"><span class="eyebrow eyebrow--klein">Waarom we dit vragen</span><p class="klein grijs" style="color:var(--ink)">'+v.h+'</p></div>':'')+zijBel+'</aside>';
    } else if(st.stap==='contact'){
      var c=st.c||{};
      h='<div class="ck-kaart"><div class="ck-teller"><span>Bijna klaar</span><span>Je gegevens</span></div><div class="ck-bar"><i style="width:100%"></i></div><h1 class="ck-vraag">Waar sturen we je uitkomst heen</h1><div class="ck-velden">'+[['voornaam','Voornaam'],['achternaam','Achternaam'],['email','E-mailadres'],['telefoon','Telefoon'],['bedrijf','Bedrijfsnaam'],['rol','Je rol']].map(function(f){return '<div><label for="ck-'+f[0]+'">'+f[1]+'</label><input id="ck-'+f[0]+'" data-c="'+f[0]+'" value="'+esc(c[f[0]]||'')+'"></div>'}).join('')+'</div><div class="ck-nav"><button class="ck-terug" type="button" data-a="terug">‹ Vorige</button><button class="knop" type="button" data-a="uitkomst">Bekijk je uitkomst</button></div></div><aside class="ck-zij"><div class="ck-blok"><span class="eyebrow eyebrow--klein">Je gegevens</span><p class="klein grijs" style="color:var(--ink)">We nemen alleen contact op over je uitkomst. Geen nieuwsbrief, tenzij je daar zelf om vraagt.</p></div></aside>';
    } else {
      var u=oordeel(), t=T[u.k];
      h='<div class="ck-kaart"><span class="ck-badge '+t[0]+'">'+t[1]+'</span><h1 class="h2" style="margin-top:20px">'+t[2]+'</h1><p class="lead">'+t[3]+'</p>'+u.r.map(function(r){return '<div class="ck-reden">'+r+'</div>'}).join('');
      if(u.k==='groen'){var sl=[['Dinsdag','[datum] · 10.00'],['Woensdag','[datum] · 14.30'],['Donderdag','[datum] · 09.00']];h+='<h2 class="h4" style="margin-top:36px">Kies een moment</h2><p class="klein grijs" style="margin-top:6px">Minstens drie werkdagen vooruit. Dan hebben we je website en markt al bekeken.</p><div class="ck-slots">'+sl.map(function(s,n){return '<button type="button" class="ck-slot'+(st.slot===n?' on':'')+'" data-s="'+n+'"><b>'+s[0]+'</b>'+s[1]+'</button>'}).join('')+'</div><p class="mini" style="margin-top:10px">Agenda via Calendly. De momenten hier zijn een voorbeeld.</p>'+(st.slot!==null?'<div class="ck-reden" style="background:#E6F7EB;color:var(--groen-tekst)"><strong>Je intakegesprek staat gepland.</strong> '+sl[st.slot][0]+' '+sl[st.slot][1]+', bij ons in Hulsberg. Het magazine krijg je aan tafel.</div>':'')}
      if(u.k==='rood')h+='<div class="knoppen"><a class="knop knop--rand" href="#/">Bekijk onze partners</a></div>';
      if(u.k==='later')h+='<div class="knoppen"><button class="knop knop--rand" type="button">Kennis in je inbox</button></div>';
      h+='</div><aside class="ck-zij">'+(u.s&&u.k!=='rood'?'<div class="ck-blok ck-blok--donker"><span class="eyebrow eyebrow--klein" style="color:var(--blauw-dm)">Jouw rekensom</span><h2 class="h4" style="color:#fff">Wat een aanvraag jou mag kosten</h2><table class="som"><tbody>'+u.s.rijen.map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>'}).join('')+'</tbody></table><p class="mini" style="margin-top:12px">Met 30% marge. In het intakegesprek vullen we je eigen marge in.</p></div>':'')+'<button class="ck-terug" type="button" data-a="opnieuw" style="text-align:left">‹ Antwoorden aanpassen</button></aside>';
    }
    el.innerHTML=h;
    var inp=document.getElementById('ck-in'); if(inp){inp.addEventListener('input',function(){var L=lijst(),v=L[Math.min(st.i,L.length-1)];st.a[v.id]=inp.value;var b=el.querySelector('[data-a=verder]');var ok=v.optioneel||heeft(v);if(b){b.disabled=!ok;}});}
    el.querySelectorAll('[data-c]').forEach(function(x){x.addEventListener('input',function(){st.c=st.c||{};st.c[x.getAttribute('data-c')]=x.value})});
  }
  document.addEventListener('click',function(ev){
    var root=document.getElementById('check-app'); if(!root||!root.contains(ev.target))return;
    var b=ev.target.closest('button'); if(!b)return; var L=lijst(), v=L[Math.min(st.i,L.length-1)], act=b.getAttribute('data-a');
    if(act==='start'){st.stap='vraag';st.i=0}
    else if(act==='terug'){if(st.stap==='contact'){st.stap='vraag';st.i=L.length-1}else if(st.i===0)st.stap='intro';else st.i--}
    else if(act==='verder'){if(st.i===L.length-1)st.stap='contact';else st.i++}
    else if(act==='uitkomst'){st.stap='uitkomst'}
    else if(act==='opnieuw'){st.stap='vraag';st.i=0;st.slot=null}
    else if(act==='geen'){st.a.website=st.a.website===GEEN?'':GEEN}
    else if(b.hasAttribute('data-o')){var o=v.opt[+b.getAttribute('data-o')];if(v.s==='meer'){var w=Array.isArray(st.a[v.id])?st.a[v.id].slice():[];var p=w.indexOf(o);if(p>=0)w.splice(p,1);else w.push(o);st.a[v.id]=w}else{st.a[v.id]=o;render();setTimeout(function(){if(st.i<L.length-1){st.i++;render()}},220);return}}
    else if(b.hasAttribute('data-s')){st.slot=+b.getAttribute('data-s')}
    else return;
    render(); var k=root.querySelector('.ck-kaart'); if(k&&k.getBoundingClientRect().top<0)root.scrollIntoView({behavior:'smooth'});
  });
  return {render:render};
})();
function checkPagina(){
  return '<section class="s s--grijs" style="padding-top:56px;min-height:90vh"><div class="wrap"><div id="check-app" class="ck"></div></div></section>';
}

/* ==========================================================================
   Navigatie, footer, router en interactie
   ========================================================================== */
var MENU=[
  {k:'Werkwijze',h:'#/werkwijze'},
  {k:'Diensten',h:'#/diensten',groot:[['Google Ads','#/diensten/google-ads'],['Social advertising','#/diensten/social-advertising'],['Foto en video','#/diensten/videografie'],['Conversie','#/diensten/conversie-optimalisatie'],['E-mail','#/diensten/e-mailmarketing'],['SEO','#/diensten/seo']],fijn:[['Alle diensten','#/diensten'],['Fotografie','#/diensten/fotografie'],['Animatie','#/diensten/animatie'],['Copywriting','#/diensten/copywriting'],['Hosting en techniek','#/diensten/hosting'],['Microsoft Ads','#/diensten/microsoft-ads']]},
  {k:'Prijzen',h:'#/prijzen'},
  {k:'Voor jou',h:'#/branches/horeca',groot:Object.keys(JR.branches).slice(0,6).map(function(k){return [JR.branches[k].n,'#/branches/'+k]}),fijn:[['Zorg','#/branches/zorg'],['Overheid','#/branches/overheid'],['Uitslagen','#/resultaten'],['Het scorebord','#/portaal']]},
  {k:'Kennis',h:'#/kennis'},
  {k:'Over ons',h:'#/team',groot:[['De selectie','#/team'],['Werken bij','#/werken-bij'],['De playground','#/playground'],['Events','#/events']],fijn:[['Contact','#/contact'],['Beeldregie','#/beeldregie']]}
];

function kop(){
  return '<header class="gn" id="gn"><div class="wrap"><a class="gn-merk" href="#/" aria-label="James Robinson, naar de homepage">'+bm()+woordmerk()+'</a>'
    +'<nav class="gn-links" aria-label="Hoofdmenu">'+MENU.map(function(m,i){return '<a href="'+m.h+'" data-mm="'+(m.groot?i:'')+'">'+m.k+'</a>'}).join('')+'</nav>'
    +'<div class="gn-acties"><a class="gn-in" href="#/portaal">Inloggen</a><a class="knop knop--lime" href="#/past-het">Start de check</a><button class="gn-menu" type="button" aria-label="Menu" aria-expanded="false"><i></i></button></div></div>'
    +MENU.map(function(m,i){return m.groot?'<div class="mm" data-mm-paneel="'+i+'"><div class="wrap"><div class="groot"><small>'+m.k+'</small>'+m.groot.map(function(l){return '<a href="'+l[1]+'">'+l[0]+'</a>'}).join('')+'</div><div class="fijn"><small>Meer</small>'+m.fijn.map(function(l){return '<a href="'+l[1]+'">'+l[0]+'</a>'}).join('')+'</div></div></div>':''}).join('')
    +'<div class="gn-vol">'+MENU.map(function(m){return '<a href="'+m.h+'">'+m.k+'</a>'}).join('')+'<small>Snel naar</small><div class="sub"><a href="#/past-het">Start de check</a><a href="#/contact">Contact</a><a href="#/portaal">Inloggen in het portaal</a><a href="tel:0457920009">045 792 0009</a></div></div>'
    +'</header>';
}

function voet(){
  return '<footer class="ft"><div class="wrap"><ol class="ft-noten" id="noten">'
    +'<li>Socialinsider, 2026. Gemiddeld organisch bereik van berichten op Facebook en Instagram, als deel van het aantal volgers.</li>'
    +'<li>Oldroyd, McElheran en Elkington, The Short Life of Online Sales Leads, Harvard Business Review, 2011.</li>'
    +'<li>Google-reviews, stand '+vul('[datum]')+'.</li>'
    +'<li>Kohavi en Thomke, The Surprising Power of Online Experiments, Harvard Business Review, 2017.</li>'
    +'<p>Cijfers in het portaal, op telefoons en op de laptop zijn voorbeeldcijfers. Mock-ups tonen de huisstijl van James Robinson. Alle bedragen exclusief btw.</p></ol>'
    +'<div class="ft-kol">'
    +'<div><h4>Werkwijze</h4><a href="#/werkwijze">Zo werkt het</a><a href="#/prijzen">Prijzen</a><a href="#/prijzen/rekenhulp">Rekenhulp</a><a href="#/past-het">De check</a><a href="#/portaal">Het scorebord</a></div>'
    +'<div><h4>Diensten</h4>'+Object.keys(JR.diensten).slice(0,8).map(function(k){return '<a href="#/diensten/'+k+'">'+JR.diensten[k].naam+'</a>'}).join('')+'</div>'
    +'<div><h4>Voor jou</h4>'+Object.keys(JR.branches).map(function(k){return '<a href="#/branches/'+k+'">'+JR.branches[k].n+'</a>'}).join('')+'</div>'
    +'<div><h4>Kennis</h4><a href="#/kennis">De analyse</a><a href="#/resultaten">Uitslagen</a><h4 style="margin-top:20px">De club</h4><a href="#/playground">Playground</a><a href="#/events">Events</a></div>'
    +'<div><h4>Over ons</h4><a href="#/team">De selectie</a><a href="#/werken-bij">Werken bij</a><a href="#/contact">Contact</a><a href="#/beeldregie">Beeldregie</a></div>'
    +'</div><div class="ft-onder"><span>Copyright © 2026 James Robinson B.V. Hulsberg. 045 792 0009 · support@jamesrobinson.nl</span><span><a href="#/contact">Privacy</a><a href="#/contact">Cookies</a><a href="#/contact">Voorwaarden</a></span></div></div></footer>';
}

function chat(){
  return '<button class="chat-knop" type="button" aria-label="Chat met ons">'+IC.chat+'<i></i></button>'
    +'<div class="chat" role="dialog" aria-label="Chat"><div class="chat-kop"><b>Chat met de selectie</b><small id="chat-st">Er zit nu iemand klaar. Meestal antwoord binnen een paar minuten.</small></div>'
    +'<div class="chat-in"><div class="chat-toestand" aria-label="Toestand (alleen in het ontwerp)"><button class="op" data-ct="0">Bemand</button><button data-ct="1">Na 18.00</button><button data-ct="2">Verstuurd</button></div><div id="chat-body"><label class="vh" for="chat-t">Je bericht</label><textarea id="chat-t" placeholder="Je bericht"></textarea><button class="knop knop--klein" style="margin-top:10px" type="button" data-ct="2">Versturen</button></div></div></div>';
}

/* ---------- Router ---------- */
function route(){
  var h=(location.hash||'#/').replace(/^#\/?/,''), d=h.split('/'), html, anker=null;
  if(h===''||h==='home')html=PAGINA.home();
  else if(d[0]==='diensten'&&d[1])html=PAGINA.dienst(d[1]);
  else if(d[0]==='diensten')html=PAGINA.diensten();
  else if(d[0]==='prijzen'){html=PAGINA.prijzen();if(d[1]==='rekenhulp')anker='rekenhulp'}
  else if(d[0]==='team'&&d[1])html=PAGINA.speler(d[1]);
  else if(d[0]==='kennis'&&d[1])html=PAGINA.artikel(d[1]);
  else if(d[0]==='branches')html=PAGINA.branche(d[1]);
  else if(d[0]==='past-het')html=checkPagina();
  else if(d[0]==='inloggen')html=PAGINA.portaal();
  else if(PAGINA[d[0]]&&d[0]!=='dienst')html=PAGINA[d[0]]();
  else if(document.getElementById(h)){document.getElementById(h).scrollIntoView({behavior:'smooth'});return}
  else html=PAGINA.nietGevonden();
  var main=$('#main'); main.innerHTML=html;
  $$('.gn-links a').forEach(function(a){a.classList.toggle('actief','#/'+d[0]===a.getAttribute('href').split('/').slice(0,2).join('/'))});
  document.body.classList.remove('open');
  window.scrollTo(0,anker?$('#'+anker).getBoundingClientRect().top+window.scrollY-60:0);
  activeer(main);
  if(d[0]==='prijzen')rekenhulp();
  if(h===''||h==='home'){rekensom();try{var kb=localStorage.getItem('jr-branche');if(kb&&BRANCHE[kb])kiesBranche(kb)}catch(e){}}
  if(d[0]==='past-het')check.render();if(window.naRender)naRender(d);
}

/* ---------- Interactie ---------- */
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'}):null;
function activeer(root){
  $$('.rv',root).forEach(function(el){if(io)io.observe(el);else el.classList.add('in')});
  /* Carrousels */
  $$('.rail-pijlen',root).forEach(function(p){
    var r=document.getElementById(p.getAttribute('data-rail')), b=$$('button',p);
    function st(){b[0].disabled=r.scrollLeft<8;b[1].disabled=r.scrollLeft+r.clientWidth>=r.scrollWidth-8}
    b.forEach(function(x,i){x.addEventListener('click',function(){var k=r.firstElementChild;var w=k?k.getBoundingClientRect().width+20:400;r.scrollBy({left:(i?1:-1)*w,behavior:'smooth'})})});
    r.addEventListener('scroll',st,{passive:true});st();
  });
  /* Manifest: woord voor woord oplichten tijdens het scrollen */
  $$('[data-oplicht]',root).forEach(function(m){
    var w=$$('span',m);
    function upd(){var r=m.getBoundingClientRect(),vh=window.innerHeight,p=Math.min(1,Math.max(0,(vh*.85-r.top)/(r.height+vh*.35)));var n=Math.round(p*w.length);w.forEach(function(x,i){x.classList.toggle('aan',i<n)})}
    window.addEventListener('scroll',upd,{passive:true});upd();
  });
  /* Tellers die oplopen zodra ze in beeld komen */
  $$('[data-tel]',root).forEach(function(el){
    var doel=+el.getAttribute('data-tel'),gestart=false;
    function start(){if(gestart)return;gestart=true;var t0=performance.now();(function stap(t){var p=Math.min(1,(t-t0)/1400),e=1-Math.pow(1-p,3);el.textContent=Math.round(doel*e);if(p<1)requestAnimationFrame(stap)})(t0)}
    if('IntersectionObserver' in window){new IntersectionObserver(function(es,o){if(es[0].isIntersecting){start();o.disconnect()}},{threshold:.4}).observe(el)}else start();
  });
  /* Honderd volgers: er lichten er twee op */
  $$('[data-volgers]',root).forEach(function(el){
    var p=$$('i',el);
    function aan(){[23,67].forEach(function(n,i){setTimeout(function(){p[n].classList.add('aan')},400+i*500)})}
    if('IntersectionObserver' in window){new IntersectionObserver(function(es,o){if(es[0].isIntersecting){aan();o.disconnect()}},{threshold:.5}).observe(el)}else aan();
  });
  /* Timer sinds de aanvraag */
  $$('[data-timer]',root).forEach(function(el){
    var s=0;var id=setInterval(function(){if(!document.body.contains(el)){clearInterval(id);return}s=(s+1)%3600;el.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},1000);
  });
  /* Tabs die vanzelf doorlopen, zoals op stripe.com */
  $$('[data-tabs]',root).forEach(function(rij){
    var tabs=$$('.tab',rij),sec=rij.closest('section'),items=$$('[data-paneel]',sec),uit=$$('[data-u]',sec),nu=0,klok=null;
    function toon(i){nu=i;tabs.forEach(function(t,j){t.classList.toggle('op',j===i);t.setAttribute('aria-selected',j===i);var b=t.querySelector('i');if(b){b.style.animation='none';void b.offsetWidth;b.style.animation=''}});items.forEach(function(x,j){x.classList.toggle('op',j===i)});uit.forEach(function(x,j){x.hidden=j!==i})}
    function verder(){clearTimeout(klok);klok=setTimeout(function(){if(!document.body.contains(rij))return;toon((nu+1)%tabs.length);verder()},5000)}
    tabs.forEach(function(t,i){t.addEventListener('click',function(){toon(i);verder()})});
    toon(0);verder();
  });
  /* Video pauzeren */
  $$('.beeld-pauze',root).forEach(function(b){b.addEventListener('click',function(){var v=b.closest('.beeld');v.classList.toggle('pauze');b.setAttribute('aria-label',v.classList.contains('pauze')?'Speel de video af':'Pauzeer de video')})});
}

var ln=null;
window.addEventListener('scroll',function(){
  var l=document.getElementById('ln'); if(!l)return;
  l.classList.toggle('toon',window.scrollY>420);
},{passive:true});

document.addEventListener('click',function(e){
  var m=e.target.closest('.gn-menu');
  if(m){document.body.classList.toggle('open');m.setAttribute('aria-expanded',document.body.classList.contains('open'));return}
  var ck=e.target.closest('.chat-knop');
  if(ck){$('.chat').classList.toggle('toon');return}
  var ct=e.target.closest('[data-ct]');
  if(ct){var n=+ct.getAttribute('data-ct');$$('.chat-toestand button').forEach(function(b,i){b.classList.toggle('op',i===n)});
    $('#chat-st').textContent=['Er zit nu iemand klaar. Meestal antwoord binnen een paar minuten.','Na 18.00 uur zit er niemand. Laat een bericht achter; je krijgt binnen één werkdag antwoord via support@.','Verstuurd. Je krijgt antwoord van wie erover gaat.'][n];
    $('#chat-body').hidden=n===2;return}
  if(!e.target.closest('.chat')&&$('.chat'))$('.chat').classList.remove('toon');
});

/* Mega-menu op desktop */
(function(){
  var dicht=null;
  document.addEventListener('mouseover',function(e){
    var a=e.target.closest('[data-mm]'), p=e.target.closest('.mm');
    if(a&&a.getAttribute('data-mm')!==''){clearTimeout(dicht);$$('.mm').forEach(function(x){x.classList.toggle('toon',x.getAttribute('data-mm-paneel')===a.getAttribute('data-mm'))});return}
    if(p){clearTimeout(dicht);return}
    if(e.target.closest('.gn'))return;
    dicht=setTimeout(function(){$$('.mm').forEach(function(x){x.classList.remove('toon')})},160);
  });
  document.addEventListener('click',function(e){if(e.target.closest('.mm a,.gn-links a,.gn-vol a'))$$('.mm').forEach(function(x){x.classList.remove('toon')})});
})();

/* ---------- Rekenhulp ---------- */
function rekenhulp(){
  var e=euro, camp=1;
  function reken(){
    var omzet=+$('#rh-omzet').value, klant=+$('#rh-klant').value, conv=+$('#rh-conv').value, cpa=+$('#rh-cpa').value;
    $('#rh-o-omzet').textContent=e(omzet); $('#rh-o-klant').textContent=e(klant); $('#rh-o-conv').textContent=conv+'%'; $('#rh-o-cpa').textContent=e(cpa);
    var kpm=Math.max(1,Math.ceil(Math.ceil(omzet/klant)/12)), apm=Math.ceil(kpm/(conv/100)), nodig=Math.ceil(apm*cpa/50)*50, min=Math.max(1000,camp*1000), bud=Math.max(nodig,min);
    var opB=PAKKETTEN[0]; PAKKETTEN.forEach(function(p,i){if(bud>=[0,2500,5000,7500][i])opB=p});
    var opC=PAKKETTEN[camp-1], pk=opC.p>opB.p?opC:opB, tot=pk.p+bud, pct=Math.round(pk.p/tot*100);
    $('#rh-pakket').textContent=pk.n;
    $('#rh-reden').textContent=opC.p>opB.p?'Gekozen op het aantal campagnes.':'Gekozen op je advertentiebudget.';
    $('#rh-klanten').textContent=kpm+' per maand'; $('#rh-aanvragen').textContent=apm+' per maand';
    $('#rh-budget').textContent=e(bud)+' per maand'; $('#rh-retainer').textContent=e(pk.p)+' per maand';
    var m=$('#rh-min'); m.hidden=!(bud>nodig); m.textContent='Je rekensom komt uit op '+e(nodig)+'. We rekenen met het minimum: € 500 per kanaal per campagne, op Google en Meta.';
    $('#rh-totaal').textContent=e(tot); $('#rh-m1').style.width=pct+'%'; $('#rh-m2').style.width=(100-pct)+'%';
    $('#rh-l1').textContent='Pakket '+pct+'%'; $('#rh-l2').textContent='Advertentiebudget '+(100-pct)+'%';
    $('#rh-jaar').textContent=e(4500+12*tot);
  }
  ['#rh-omzet','#rh-klant','#rh-conv','#rh-cpa'].forEach(function(id){$(id).addEventListener('input',reken)});
  $('#rh-camp').addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b)return;camp=+b.textContent;$$('button',this).forEach(function(x){x.classList.toggle('op',x===b)});reken()});
  reken();
}

/* ---------- Start ---------- */
document.addEventListener('DOMContentLoaded',function(){
  document.body.insertAdjacentHTML('afterbegin',kop()+'<main id="main"></main>'+voet()+chat());
  window.addEventListener('hashchange',route);
  route();
});

