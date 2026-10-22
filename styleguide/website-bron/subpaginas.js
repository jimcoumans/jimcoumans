/* ==========================================================================
   Subpagina's, ronde 5: dezelfde beeldtaal als de homepage.
   Elke sectie heeft een beeld: een mock-up, een diagram of iets om mee te
   spelen. Tekst ondersteunt het beeld, niet andersom.
   Overschrijft de oudere sjablonen uit na.js.
   ========================================================================== */

/* ---------- Bouwstenen ---------- */
function subHeld(o){
  return '<section class="gr '+(o.kleur||'gr--merk')+' sh"><i class="vlek vlek-1" aria-hidden="true"></i><i class="vlek vlek-2" aria-hidden="true"></i><div class="wrap sh-in">'
    +'<div class="sh-tekst">'+(o.kruimel?'<a class="sh-terug" href="'+o.kruimel[1]+'">'+o.kruimel[0]+'</a>':'')+'<span class="eyebrow rv">'+o.eyebrow+'</span>'
    +'<h1 class="sh-kop rv rv-2'+((o.licht||'').length>26?' sh-kop--lang':'')+(o.vet.length>14?' sh-kop--kleiner':'')+'">'+o.vet.replace('E-mail','E\u2011mail')+(o.licht?'<span class="l">'+o.licht+'</span>':'')+'</h1>'
    +(o.lead?'<p class="sh-lead rv rv-3">'+o.lead+'</p>':'')
    +(o.knoppen===false?'':'<div class="knoppen rv rv-3">'+(o.knoppen||'<a class="knop knop--lime knop--groot" href="#/past-het">Start de check</a><a class="knop knop--rand knop--groot" href="#/prijzen">Bekijk de prijzen</a>')+'</div>')
    +(o.extra||'')+'</div><div class="sh-beeld rv rv-2">'+(o.beeld||'')+'</div></div></section>';
}
/* Een rij met tekst en beeld, om en om */
function zz(o){
  return '<div class="zz'+(o.om?' zz--om':'')+'"><div class="zz-tekst rv"><span class="eyebrow">'+o.eyebrow+'</span><h3>'+o.vet+(o.licht?' <span class="l">'+o.licht+'</span>':'')+'</h3><p>'+o.p+'</p>'+(o.merk?'<p class="t3-merk"><b>Wat jij merkt:</b> '+o.merk+'</p>':'')+(o.link?'<a class="ln-k" href="'+o.link[1]+'">'+o.link[0]+'</a>':'')+'</div><div class="zz-beeld rv rv-2'+(o.donker?' zz-beeld--donker':'')+'">'+o.beeld+'</div></div>';
}
function sectieKop(eyebrow,vet,licht,lead){return '<div class="sk"><span class="eyebrow rv">'+eyebrow+'</span>'+vl('h1 rv',vet,licht)+(lead?'<p class="lead rv rv-2">'+lead+'</p>':'')+'</div>'}
function vinkLijst(items,nee){return '<ul class="vink'+(nee?' vink--nee':'')+'">'+items.map(function(i){return '<li>'+i+'</li>'}).join('')+'</ul>'}
function vragen(lijst){return '<div class="faq">'+lijst.map(function(f){return '<details><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>'}).join('')+'</div>'}
var IC2={
  pin:'<svg viewBox="0 0 44 44"><path d="M22 38s-11-10.4-11-18.5a11 11 0 0 1 22 0C33 27.6 22 38 22 38z"/><circle cx="22" cy="19.5" r="4"/></svg>',
  ab:'<svg viewBox="0 0 44 44"><rect x="6" y="9" width="14" height="26" rx="3"/><rect x="24" y="9" width="14" height="26" rx="3"/><path d="M10 28h6M28 24h6M28 28h6"/></svg>',
  flow:'<svg viewBox="0 0 44 44"><circle cx="10" cy="22" r="4"/><circle cx="34" cy="12" r="4"/><circle cx="34" cy="32" r="4"/><path d="M14 20l16-6M14 24l16 6"/></svg>',
  schild:'<svg viewBox="0 0 44 44"><path d="M22 6l13 5v10c0 9-6 15-13 17-7-2-13-8-13-17V11z"/><path d="M16 22l4.5 4.5L29 18"/></svg>',
  pen:'<svg viewBox="0 0 44 44"><path d="M10 34l3-9L28 10l6 6-15 15z"/><path d="M25 13l6 6"/></svg>',
  film:'<svg viewBox="0 0 44 44"><rect x="6" y="10" width="32" height="24" rx="4"/><path d="M19 17v10l8-5z"/></svg>'
};
function icoon(n){return IC2[n]||ic(n)}

/* ---------- Visuals per dienst ---------- */
function rankGrafiek(){
  return '<div class="rank"><div class="rank-kop"><span>'+logo('google')+'Positie op "marketingbureau zuid-limburg"</span><small>Voorbeeld</small></div><svg viewBox="0 0 400 180" preserveAspectRatio="none"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C4F000" stop-opacity=".35"/><stop offset="1" stop-color="#C4F000" stop-opacity="0"/></linearGradient></defs>'
    +[30,70,110,150].map(function(y){return '<line x1="0" x2="400" y1="'+y+'" y2="'+y+'" stroke="rgba(255,255,255,.08)"/>'}).join('')
    +'<path d="M0 168 L40 164 L80 160 L120 150 L160 138 L200 120 L240 96 L280 70 L320 50 L360 34 L400 24 V180 H0Z" fill="url(#rkg)"/><path class="teken-lijn" d="M0 168 L40 164 L80 160 L120 150 L160 138 L200 120 L240 96 L280 70 L320 50 L360 34 L400 24" fill="none" stroke="#C4F000" stroke-width="3" stroke-linecap="round"/><circle cx="400" cy="24" r="6" fill="#C4F000"/></svg>'
    +'<div class="rank-as"><span>Maand 1</span><span>Maand 12</span></div></div>';
}
function schrapper(){
  var w=[['Wij',0],['bieden',1],['innovatieve',1],['oplossingen',1],['op',1],['maat',1],['voor',1],['al',1],['uw',1],['marketingbehoeften.',1],['Meer',0],['klanten.',0],['Elke',0],['maand.',0]];
  return '<div class="schrap"><small>Elk woord gewogen</small><p>'+w.map(function(x,i){return '<span class="'+(x[1]?'weg':'blijft')+'" style="--i:'+i+'">'+x[0]+'</span>'}).join(' ')+'</p><div class="schrap-uit"><b>Meer klanten. Elke maand.</b><span>4 woorden over van 14</span></div></div>';
}
function abTest(){
  return '<div class="ab"><div class="ab-v"><span class="label">Versie A</span>'+laptopMet(ADV.landing())+'<div class="ab-bar"><i style="--w:40%"></i><b>2,0%</b></div></div><div class="ab-v ab-v--win"><span class="label" style="background:var(--lime);color:#111">Versie B · wint</span>'+laptopMet(ADV.landing(true))+'<div class="ab-bar"><i style="--w:62%"></i><b>3,1%</b></div></div><small class="ab-noot">Conversieratio, voorbeeldcijfers</small></div>';
}
function mailFlow(){
  return '<div class="mf">'+telefoon(SCHERM.mail())+'<ol class="mf-lijst">'+[['Aanvraag binnen','Direct'],['Bevestiging met wat er nu gebeurt','Binnen een minuut'],['Herinnering als er nog niet gebeld is','Na 1 dag'],['Klantverhaal en aanbod','Na 7 dagen'],['Nieuwsbrief','Elke maand']].map(function(s,i){return '<li style="--i:'+i+'"><b>'+s[0]+'</b><small>'+s[1]+'</small></li>'}).join('')+'</ol></div>';
}
function statusKaart(){
  return '<div class="status"><div class="status-kop"><i></i><b>Alles in orde</b><small>Laatste controle: 1 minuut geleden</small></div>'
    +[['Website bereikbaar','Elke minuut gecontroleerd'],['Back-up','Vannacht 03.00 uur'],['SPF, DKIM en DMARC','Ingesteld'],['Laadtijd','Binnen de norm'],['SSL-certificaat','Geldig']].map(function(r){return '<div class="status-r"><span class="ok"></span><span><b>'+r[0]+'</b><small>'+r[1]+'</small></span></div>'}).join('')
    +'<div class="uptime">'+new Array(41).join('<i></i>')+'</div><small class="mini">Laatste 40 dagen, voorbeeld</small></div>';
}
function zoeker(){return '<div class="zoeker"><div class="zoeker-in">'+creatief('momentum')+'<span class="zk-hoek zk-1"></span><span class="zk-hoek zk-2"></span><span class="zk-hoek zk-3"></span><span class="zk-hoek zk-4"></span><span class="zk-rec"><i></i>REC 00:12</span></div><div class="zoeker-strip">'+['likes','zeven','check','motor'].map(function(c){return creatief(c)}).join('')+'</div></div>'}
function animatieTijdlijn(){return '<div class="an">'+creatief('video')+'<div class="an-lijn"><span>0s</span><div><i style="left:8%"></i><i style="left:34%"></i><i style="left:61%"></i><i style="left:88%"></i><s></s></div><span>6s</span></div></div>'}
function dienstBeeld(d){
  switch(d.vis){
    case 'google': return '<div class="combo">'+browser(ADV.google(),'google.nl/search')+'<div class="combo-tel">'+telefoon(SCHERM.slot())+'</div></div>';
    case 'social': return '<div class="combo combo--social"><div class="cs-li">'+ADV.linkedin()+'</div><div class="cs-fb">'+ADV.facebook()+'</div><div class="combo-tel">'+telefoon(ADV.story())+'</div></div>';
    case 'bing': return '<div class="combo">'+browser(ADV.google().split(LOGO.google).join(''),'bing.com/search')+'</div>';
    case 'foto': return zoeker();
    case 'video': return '<div class="combo combo--video">'+ipad('<div style="position:relative;height:100%;background:#0F0F0F">'+ADV.youtube()+'</div>','ip--liggend')+'<div class="combo-tel">'+telefoon(ADV.tiktok())+'</div></div>';
    case 'anim': return animatieTijdlijn();
    case 'copy': return schrapper();
    case 'ab': return abTest();
    case 'mail': return mailFlow();
    case 'seo': return rankGrafiek();
    case 'host': return statusKaart();
  }
  return creatief('momentum');
}
var METEN={
  Adverteren:[['Klikratio','Wie de advertentie ziet en klikt'],['Kosten per klik','Wat elke bezoeker kost'],['Conversieratio','Wie een aanvraag doet'],['Kosten per aanvraag','Waar we op sturen']],
  Content:[['Eerste drie seconden','Wie blijft kijken'],['Klikratio per beeld','Welk beeld werkt'],['Kosten per aanvraag per beeld','Wat het beeld oplevert'],['Frequentie','Wanneer een beeld slijt']],
  Versnellers:[['Conversieratio','Meer uit hetzelfde verkeer'],['Openratio en klikken','Of mail gelezen wordt'],['Posities op bewezen woorden','Verkeer zonder klikprijs'],['Laadtijd','Elke seconde telt']]
};
var SUBICOON={zoekadvertenties:'zoek','performance-max':'alles',display:'pagina',youtube:'L:youtube','demand-gen':'social','lokaal-adverteren':'pin','facebook-en-instagram':'L:instagram',linkedin:'L:linkedin',tiktok:'L:tiktok',brandshoot:'camera',portret:'camera',event:'camera',product:'camera',interieur:'camera','video-ads':'film',reels:'film',bedrijfsvideo:'film'};
function subIcoon(slug,d,i){var s=SUBICOON[slug];if(s&&s.indexOf('L:')===0)return logo(s.slice(2),'si-logo');return '<span class="si">'+icoon(s||({Adverteren:'zoek',Content:'camera',Versnellers:['ab','mail','groei','schild'][i%4]})[d.groep])+'</span>'}

/* ---------- Diensten ---------- */
PAGINA.dienst=function(slug){
  var d=JR.diensten[slug]; if(!d)return PAGINA.nietGevonden();
  var merk=kaal(d.merk).split('. ');
  var h=lokaal(d.naam);
  h+=subHeld({kleur:d.groep==='Content'?'gr--nacht':'gr--merk',kruimel:['Diensten','#/diensten'],eyebrow:d.groep,vet:d.naam+'.',licht:kaal(d.merk),lead:d.sub,beeld:dienstBeeld(d)});
  /* Wat erin zit */
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Wat erin zit',d.wat.length+' onderdelen.','Eén doel.')
    +'<div class="sub-grid">'+d.wat.map(function(w,i){return '<div class="sub-k rv rv-'+(i%3+1)+'">'+subIcoon(w[2],d,i)+'<h3>'+w[0]+'</h3><p>'+w[1]+'</p></div>'}).join('')+'</div></div></section>';
  /* Zo spelen we */
  h+='<section class="s gr gr--licht"><div class="wrap">'+sectieKop('De aanpak','Zo spelen we.','Stap voor stap.')
    +'<ol class="tlh">'+d.aanpak.map(function(a,i){return '<li class="rv rv-'+(i%4+1)+'"><span class="tlh-chip">'+a[2]+'</span><span class="tlh-punt">'+(i+1)+'</span><h3>'+a[0]+'</h3><p>'+a[1]+'</p></li>'}).join('')+'</ol></div></section>';
  /* Wat we meten */
  var m=METEN[d.groep]||METEN.Adverteren;
  h+='<section class="s gr gr--merk"><div class="wrap"><div class="meet">'+sectieKop('In het portaal','Wat we meten.','Elk uur.','Geen bereik of likes. Alleen de cijfers die iets zeggen over aanvragen, en wat ze kosten.')
    +'<div class="meet-grid">'+m.map(function(x,i){var pts=[[0,40],[20,36],[40,38],[60,28],[80,30],[100,18],[120,20],[140,10]].map(function(p){return p[0]+' '+(i%2?50-p[1]:p[1])}).join(' L');return '<div class="meet-k rv rv-'+(i+1)+'"><small>'+x[1]+'</small><b>'+x[0]+'</b><svg viewBox="0 0 140 50" preserveAspectRatio="none"><path class="teken-lijn" d="M'+pts+'" fill="none" stroke="#C4F000" stroke-width="2" stroke-linecap="round"/></svg></div>'}).join('')+'</div></div></div></section>';
  /* Eerlijk vooraf */
  h+='<section class="s s--zwart"><div class="wrap">'+sectieKop('Eerlijk vooraf','Wat '+d.naam+' niet doet.','Dat zeggen we liever nu.')
    +'<div class="nee-grid">'+d.eerlijk.map(function(e,i){return '<div class="nee-k rv rv-'+(i+1)+'"><span class="nee-x"></span><p>'+e+'</p></div>'}).join('')+'</div></div></section>';
  /* Lange tekst met inhoudsopgave */
  if(d.seo){
    var kopjes=[];var seo=d.seo.replace(/<h2>(.*?)<\/h2>/g,function(_,t){var id='h-'+kopjes.length;kopjes.push([id,t]);return '<h2 id="'+id+'">'+t+'</h2>'});
    h+='<section class="s s--wit"><div class="wrap"><div class="lees"><aside class="lees-toc"><small>In dit stuk</small>'+kopjes.map(function(k){return '<a href="javascript:void(0)" data-naar="'+k[0]+'">'+k[1]+'</a>'}).join('')+'<div class="lees-cta"><b>Liever praten?</b><span>045 792 0009</span><a class="knop knop--klein" href="#/past-het">Start de check</a></div></aside><div class="prose">'+seo+'</div></div></div></section>';
  }
  /* Vragen */
  h+='<section class="s gr gr--licht"><div class="wrap"><div class="faq4"><div class="sk"><span class="eyebrow rv">Vragen</span>'+vl('h1 rv','Over '+d.naam+'.','Kort en eerlijk.')+'</div>'+vragen(d.faq)+'</div></div></section>';
  /* Contact en verwant */
  var c=contactVoor(d.spec);
  h+='<section class="s s--wit"><div class="wrap"><div class="cv">'
    +'<div class="cv-persoon rv"><div class="cv-av gr gr--merk"><span>'+(c[1].n.charAt(0)==='['?'?':c[1].n.split(' ').map(function(w){return w.charAt(0)}).join('').slice(0,2))+'</span></div><div><small>Jouw aanspreekpunt voor '+d.naam+'</small><h3>'+vul(c[1].n)+'</h3><p>'+vul(c[1].rol)+' · '+vul(c[1].spec)+'</p><div class="knoppen" style="margin-top:16px"><a class="knop knop--klein" href="#/contact">Plan een gesprek</a><a class="ln-k" href="tel:0457920009">045 792 0009</a></div></div></div>'
    +'<div class="cv-rel rv rv-2"><small>Werkt samen met</small>'+d.rel.map(function(r){var x=JR.diensten[r];return x?'<a href="#/diensten/'+r+'"><span><b>'+x.naam+'</b><em>'+kaal(x.merk)+'</em></span><i></i></a>':''}).join('')+'</div></div></div></section>';
  h+=slot();
  return h;
};

PAGINA.diensten=function(){
  var groepen=[['Adverteren','De motor.','Het enige wat je vandaag aanzet en morgen meet.','gr--merk'],['Content','De brandstof.','Advertenties slijten. Nieuw beeld houdt de motor draaiend.','gr--nacht'],['Versnellers','Elke klant goedkoper.','Draait de motor, dan halen deze meer uit hetzelfde budget.','gr--blauw']];
  var dLogo={'google-ads':'L:google','social-advertising':'L:instagram','microsoft-ads':'zoek',fotografie:'camera',videografie:'film',animatie:'alles',copywriting:'pen','conversie-optimalisatie':'ab','e-mailmarketing':'mail',seo:'groei',hosting:'schild'};
  var orbit='<div class="orbit"><div class="orbit-kern gr gr--merk">'+bm()+'</div>'+KANALEN.map(function(k,i){return '<span class="orbit-l" style="--i:'+i+'">'+logo(k[0])+'</span>'}).join('')+'<svg class="orbit-ring" viewBox="0 0 400 400"><circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="95"/></svg></div>';
  var h=subHeld({kleur:'gr--nacht',eyebrow:'Diensten',vet:'Eén doel.',licht:'Meer klanten voor jou.',lead:'Adverteren, content en de versnellers die elke volgende klant goedkoper maken. Wat we niet doen, doet een partner. Zonder opslag.',beeld:orbit});
  groepen.forEach(function(g,gi){
    var lijst=Object.keys(JR.diensten).filter(function(k){return JR.diensten[k].groep===g[0]});
    var beeld=gi===0?'<div class="combo combo--klein">'+browser(ADV.google(),'google.nl')+'<div class="combo-tel">'+telefoon(ADV.story())+'</div></div>':gi===1?'<div class="wand wand--vast" aria-hidden="true">'+[['momentum','cr--staand','likes',''],['video','cr--staand','zeven','']].map(function(kol){var r='';for(var i=0;i<kol.length;i+=2)r+=creatief(kol[i]).replace('class="cr ','class="cr '+kol[i+1]+' ');return '<div class="wand-kol">'+r+r+'</div>'}).join('')+'</div>':'<div class="dg-vers">'+[['Conversie','+1 procentpunt','ab'],['E-mail','Terughalen wie er al was','mail'],['SEO','Bewezen woorden','groei'],['Techniek','Snel en veilig','schild']].map(function(v){return '<div><span class="si">'+icoon(v[2])+'</span><b>'+v[0]+'</b><small>'+v[1]+'</small></div>'}).join('')+'</div>';
    h+='<section class="s '+(gi%2?'s--wit':'gr gr--licht')+'"><div class="wrap"><div class="dg'+(gi===1?' dg--om':'')+'"><div class="dg-kop gr '+g[3]+' rv"><span class="eyebrow">'+g[0]+'</span><h2>'+g[1]+'</h2><p>'+g[2]+'</p><div class="dg-beeld">'+beeld+'</div></div>'
      +'<div class="dg-lijst">'+lijst.map(function(k,i){var d=JR.diensten[k],s=dLogo[k]||'zoek';return '<a class="dg-k rv rv-'+(i%3+1)+'" href="#/diensten/'+k+'">'+(s.indexOf('L:')===0?logo(s.slice(2),'si-logo'):'<span class="si">'+icoon(s)+'</span>')+'<span><b>'+d.naam+'</b><em>'+kaal(d.merk)+'</em></span><i></i></a>'}).join('')+'</div></div></div></section>';
  });
  h+='<section class="s s--zwart"><div class="wrap">'+sectieKop('Eerlijk vooraf','Wat we niet doen.','Dat doet iemand anders beter.','Daar verwijzen we je naar door, zonder opslag. Je mag elke marketingvraag bij ons neerleggen.')
    +'<div class="nee-grid nee-grid--6">'+['Social feeds vullen en beheren','Bedrijfsvideo\'s','Webshops als propositie','Personeel werven','Losse campagnes zonder samenwerking','Leads opvolgen. Dat doe jij.'].map(function(e,i){return '<div class="nee-k rv rv-'+(i%3+1)+'"><span class="nee-x"></span><p>'+e+'</p></div>'}).join('')+'</div></div></section>';
  return h+slot();
};

/* ---------- Werkwijze ---------- */
function systeemFlow(){
  var n=[['zoek','Adverteren','De motor'],['camera','Content','De brandstof'],['pagina','Landing','Waar het landt'],['bel','Aanvraag','De voordeur']];
  return '<div class="sf">'+n.map(function(x,i){return '<div class="sf-n" style="--i:'+i+'"><span class="sf-ic'+(i===3?' sf-ic--lime':'')+'">'+(x[0]==='bel'?IC.bel.replace('fill="#fff"','fill="currentColor"'):icoon(x[0]))+'</span><b>'+x[1]+'</b><small>'+x[2]+'</small></div>'+(i<3?'<span class="sf-pijl"><i></i></span>':'')}).join('')
    +'<div class="sf-vers"><small>Versnellers</small>'+['Conversie','E-mail','SEO','Landingspagina\'s'].map(function(v){return '<span>'+v+'</span>'}).join('')+'</div></div>';
}
function ketenWidget(){
  return '<div class="kt"><div class="kt-in">'
    +'<div class="rs-r"><label for="kt-b"><span>Bezoekers per maand</span> <b id="kt-ob"></b></label><input type="range" id="kt-b" min="200" max="5000" step="100" value="1000"></div>'
    +'<div class="rs-r"><label for="kt-c"><span>Conversieratio: bezoekers die een aanvraag doen</span> <b id="kt-oc"></b></label><input type="range" id="kt-c" min="0.5" max="8" step="0.5" value="2"></div>'
    +'<div class="rs-r"><label for="kt-s"><span>Scoringsratio: aanvragen die klant worden</span> <b id="kt-os"></b></label><input type="range" id="kt-s" min="5" max="80" step="5" value="30"></div>'
    +'<p class="mini" style="margin-top:16px">Rekenvoorbeeld met een vast advertentiebudget van € 2.000 per maand.</p>'
    +'<div class="kt-knop"><small>Waar het hapert, en wat we eraan doen</small>'+[['Weinig kliks','Nieuw beeld, andere boodschap, scherpere doelgroep'],['Weinig aanvragen','Snellere pagina, korter formulier, sterker aanbod'],['Weinig klanten','Sneller opvolgen. Dat is jouw kant; wij meten het.']].map(function(r){return '<div><b>'+r[0]+'</b><span>'+r[1]+'</span></div>'}).join('')+'</div></div>'
    +'<div class="kt-uit"><div class="kt-trap"><div class="kt-t" style="--w:100%"><span>Bezoekers</span><b id="kt-1"></b></div><div class="kt-t" style="--w:60%" id="kt-t2"><span>Aanvragen</span><b id="kt-2"></b></div><div class="kt-t kt-t--lime" style="--w:36%" id="kt-t3"><span>Klanten</span><b id="kt-3"></b></div></div>'
    +'<div class="kt-kpi"><div><small>Kosten per aanvraag</small><b id="kt-cpa"></b></div><div><small>Kosten per klant</small><b id="kt-cpk"></b></div></div><p class="kt-les">Zet de conversieratio een procentpunt hoger en kijk wat er met de kosten gebeurt. Zonder één euro extra budget.</p></div></div>';
}
function keten(){
  if(!$('#kt-b'))return;
  function r(){var b=+$('#kt-b').value,c=+$('#kt-c').value,s=+$('#kt-s').value,a=b*c/100,k=a*s/100;
    $('#kt-ob').textContent=b.toLocaleString('nl-NL');$('#kt-oc').textContent=String(c).replace('.',',')+'%';$('#kt-os').textContent=s+'%';
    $('#kt-1').textContent=b.toLocaleString('nl-NL');$('#kt-2').textContent=Math.round(a);$('#kt-3').textContent=Math.round(k*10)/10>=1?Math.round(k):String(Math.round(k*10)/10).replace('.',',');
    $('#kt-t2').style.setProperty('--w',Math.max(14,Math.min(90,20+c*9))+'%');$('#kt-t3').style.setProperty('--w',Math.max(8,Math.min(80,(20+c*9)*s/100*1.6))+'%');
    $('#kt-cpa').textContent=a>0?euro(2000/a):'–';$('#kt-cpk').textContent=k>0?euro(2000/k):'–'}
  ['#kt-b','#kt-c','#kt-s'].forEach(function(id){$(id).addEventListener('input',r)});r();
}
PAGINA.werkwijze=function(){
  var h=lokaal('Werkwijze');
  h+=subHeld({eyebrow:'Werkwijze',vet:'Geen gok.',licht:'Een systeem.',lead:'Voorspelbaar nieuwe aanvragen, en elke maand iets goedkoper. Vier onderdelen die op elkaar draaien, en jij ziet dezelfde cijfers als wij.',beeld:systeemFlow()});
  /* Het systeem in vier rijen */
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Het systeem','Vier onderdelen.','Eén doel.')
    +zz({eyebrow:'1 · De motor',vet:'Adverteren.',licht:'Vandaag aan, morgen gemeten.',p:'Google en Meta voorop, LinkedIn voor zakelijke klanten, TikTok en YouTube als je klant daar zit. Elke week schuift budget naar wat oplevert.',merk:'meer mensen die jou vinden, terwijl je aan het werk bent.',link:['Over adverteren','#/diensten/google-ads'],beeld:'<div class="combo combo--klein">'+browser(ADV.google(),'google.nl/search')+'<div class="combo-tel">'+telefoon(ADV.story())+'</div></div>'})
    +zz({om:1,donker:1,eyebrow:'2 · De brandstof',vet:'Content.',licht:'Beeld van jouw zaak.',p:'Eerst een contentplan, dan een draaidag bij jou op locatie. Daaruit maken we steeds nieuwe advertenties, want een advertentie slijt.',merk:'een dagdeel filmen. De rest doen wij.',link:['Over content','#/diensten/videografie'],beeld:zoeker()})
    +zz({eyebrow:'3 · De landing',vet:'Eén pagina.',licht:'Eén boodschap, één knop.',p:'Per campagne een eigen pagina op jouw website. We testen koppen, beelden en formulieren, en houden wat wint.',merk:'meer aanvragen uit hetzelfde budget.',link:['Over conversie','#/diensten/conversie-optimalisatie'],beeld:abTest()})
    +zz({om:1,eyebrow:'4 · De voordeur',vet:'Een aanvraag.',licht:'Klaar om te kopen.',p:'Daar stopt ons werk en begint het jouwe. We spreken vooraf af hoe snel je belt, en meten het.',merk:'je telefoon gaat vaker. Met de juiste mensen aan de lijn.',beeld:'<div class="av-kaart av-kaart--los"><small>Aanvragen deze maand</small><span class="getal" data-tel="38">0</span><span class="plus">+6 ten opzichte van vorige maand</span><ul class="feed feed--held" style="margin-top:14px">'+feedHtml(BRANCHE[''])+'</ul></div>'})
    +'</div></section>';
  /* De keten */
  h+='<section class="s gr gr--nacht" id="keten"><div class="wrap">'+sectieKop('De keten','Twee van de honderd doen iets.','Speel ermee.','Van bezoeker naar aanvraag naar klant. Eén procentpunt conversie is meer waard dan veel extra budget. Probeer het zelf.')+ketenWidget()+'</div></section>';
  /* De klantreis */
  var reis=[['Verkopen','Je betaalt niets',[['01','Van aanvraag tot afspraak','Een korte video, vijftien vragen en meteen een uitkomst.','Online'],['02','De scouting','We bekijken je website en markt.','30 minuten'],['03','Het intakegesprek','Een uur aan tafel.','1 uur'],['04','Je voorstel','Op jouw cijfers, daarna 45 minuten samen.','3 werkdagen']]],
    ['Starten','De opstartmaand',[['05','Tekenen','Digitaal, dezelfde dag.','Dag 0'],['06','De onboarding','Toegangen en een sessie van 45 minuten.','3 werkdagen'],['07','Het fundament','Meting, content, pagina en je eerste campagne.','± 4 weken']]],
    ['Samenwerken','Maandelijks opzegbaar',[['08','Live en het maandritme','Dagmail, maandupdate, Performance Review, 100-dagenreview en jaargesprek.','Vanaf dag 19']]]];
  h+='<section class="s gr gr--licht"><div class="wrap">'+sectieKop('De klantreis','Acht stappen.','Van eerste klik tot seizoen.')
    +'<div class="kr">'+reis.map(function(f,fi){return '<div class="kr-fase kr-fase--'+fi+' rv rv-'+(fi+1)+'"><div class="kr-kop"><b>'+f[0]+'</b><small>'+f[1]+'</small></div>'+f[2].map(function(s){return '<div class="kr-stap"><span class="kr-nr">'+s[0]+'</span><div><h4>'+s[1]+'</h4><p>'+s[2]+'</p></div><span class="kr-tijd">'+s[3]+'</span></div>'}).join('')+'</div>'}).join('')+'</div></div></section>';
  /* Het ritme */
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Het ritme','Elke dag. Elke maand.','Je weet altijd waar je staat.')
    +'<div class="ritme">'
    +'<div class="ritme-k rv"><span class="ritme-tijd">Elke dag · 7.00</span><h3>De dagmail</h3><p>Wat buiten de lijntjes valt, zien wij voordat jij het merkt.</p><div class="mini-mail"><b>Dagmail · 14 oktober</b>'+[['ok','Uitgaven binnen budget'],['ok','Meting werkt'],['let','Advertentie afgekeurd: vervangen'],['ok','Opvolgtijd gehaald']].map(function(r){return '<span class="mm-'+r[0]+'">'+r[1]+'</span>'}).join('')+'</div></div>'
    +'<div class="ritme-k rv rv-2"><span class="ritme-tijd">Elk uur</span><h3>Het portaal</h3><p>Dezelfde cijfers als wij. Per aanvraag een oordeel van jou.</p><div class="mini-oordeel"><b>Offerteaanvraag · Google</b><div><span class="label" style="background:#E6F7EB;color:#1D7D3F">Goed</span><span class="label">Twijfel</span><span class="label">Niet goed</span></div></div></div>'
    +'<div class="ritme-k rv rv-3"><span class="ritme-tijd">Volgens je pakket</span><h3>Performance Review</h3><p>Een uur: wat werkte, wat niet, en wat we de komende periode doen.</p><div class="mini-agenda">'+['ma','di','wo','do','vr'].map(function(d,i){return '<span'+(i===2?' class="op"':'')+'>'+d+'<b>'+(14+i)+'</b></span>'}).join('')+'</div></div>'
    +'<div class="ritme-k rv rv-4"><span class="ritme-tijd">Dag 100 en elk jaar</span><h3>Tussenstand en nieuw seizoen</h3><p>De 100-dagenreview en het jaargesprek: doelen bijstellen op de cijfers.</p><div class="mini-balk"><i style="width:28%"></i><span>Dag 100 van 365</span></div></div>'
    +'</div></div></section>';
  /* Spelregels */
  var regels=[['Resultaat staat op één','Werkt iets niet, dan zeggen we het zelf, met de cijfers erbij.'],['Maandelijks opzegbaar','Voor allebei. Het fundament krijg je na de start niet terug.'],['Alleen als we erin geloven','Op basis van onderzoek en een hypothese.'],['De 50%-regel','Ons pakket is nooit meer dan de helft van wat je samen uitgeeft.'],['Nooit iets erbovenop','Doorverwijsvergoedingen melden we.'],['Niets gratis erbij','Wat erbuiten valt, krijgt vooraf een prijs.'],['Altijd on-brand','Elke uiting klopt met je merk.'],['Data beats opinion','De cijfers kiezen, ook tussen onze eigen ideeën.'],['Alles op jouw naam','Wij zijn beheerder, nooit eigenaar.']];
  h+='<section class="s s--zwart"><div class="wrap">'+sectieKop('Spelregels','Negen regels.','Voor allebei.')+'<div class="regels">'+regels.map(function(r,i){return '<div class="regel rv rv-'+(i%3+1)+'"><span>'+(i+1)+'</span><h3>'+r[0]+'</h3><p>'+r[1]+'</p></div>'}).join('')+'</div></div></section>';
  return h+slot();
};

/* ---------- Prijzen ---------- */
function vijftig(){return '<div class="v50"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="22"/><circle class="v50-boog" cx="100" cy="100" r="78" fill="none" stroke="#C4F000" stroke-width="22" stroke-dasharray="245 490" transform="rotate(-90 100 100)" stroke-linecap="butt"/></svg><div class="v50-in"><b>50%</b><small>maximaal voor ons</small></div><div class="v50-leg"><span><i style="background:var(--lime)"></i>Ons pakket</span><span><i style="background:rgba(255,255,255,.25)"></i>Advertentiebudget, rechtstreeks naar het platform</span></div></div>'}
PAGINA.prijzen=function(){
  var h=lokaal('Prijzen','<a class="knop knop--rand" href="#/prijzen/rekenhulp">Rekenhulp</a>');
  var bon='<div class="bon"><div class="bon-kop">'+bm()+'<span><b>Jouw maand</b><small>Voorbeeld: Starter</small></span></div>'
    +[['Pakket Starter','€ 1.000','James Robinson'],['Advertentiebudget','€ 1.000','Rechtstreeks naar Google en Meta'],['Portaal','€ 25','Op jouw naam'],['Marge op je budget','€ 0','Nooit']].map(function(r,i){return '<div class="bon-r'+(i===3?' bon-r--nul':'')+'"><span><b>'+r[0]+'</b><small>'+r[2]+'</small></span><em>'+r[1]+'</em></div>'}).join('')
    +'<div class="bon-tot"><span>Per maand</span><b>€ 2.025</b></div><small class="mini">Exclusief btw. Plus eenmalig het fundament.</small></div>';
  h+=subHeld({eyebrow:'Prijzen',vet:'Wat het kost.',licht:'Voordat je belt.',lead:'Eén prijslijst, voor iedereen gelijk. Geen uurtje-factuurtje, geen meerwerk, geen korting voor wie het hardst onderhandelt.',knoppen:'<a class="knop knop--lime knop--groot" href="#rekenhulp">Reken het uit</a><a class="knop knop--rand knop--groot" href="#/past-het">Start de check</a>',beeld:bon});
  h+='<section class="s gr gr--licht"><div class="wrap">'+sectieKop('De pakketten','Kies je opstelling.','Op je ambitie.','Het pakket is het hoogste van twee: het aantal campagnes tegelijk, of je advertentiebudget.')
    +'<div class="pk4">'+PAKKETTEN.map(function(p,i){var sp='';for(var j=0;j<p.c;j++)sp+='<i></i>';return '<div class="rv rv-'+(i+1)+'"><div class="spelers">'+sp+'</div><h3>'+p.n+'</h3><div class="prijs">'+euro(p.p)+'</div><div class="pm">per maand, plus advertentiebudget</div><ul><li>'+p.c+' campagne'+(p.c>1?'s':'')+' tegelijk</li><li>Advertentiebudget '+p.bud.replace('Vanaf','vanaf')+'</li><li>Nieuwe content: '+p.cr.toLowerCase()+'</li><li>'+p.dd.replace(' per jaar','')+' draaidag'+(p.c>1?'en':'')+' per jaar</li><li>Performance Review: '+p.pr.toLowerCase()+'</li></ul><a class="knop knop--klein" style="margin-top:22px;align-self:flex-start" href="#/past-het">Start met '+p.n+'</a></div>'}).join('')+'</div>'
    +'<div class="matrix rv"><div class="matrix-r matrix-kop"><span>In elk pakket</span>'+PAKKETTEN.map(function(p){return '<b>'+p.n+'</b>'}).join('')+'</div>'
    +['Adverteren in Google en op social','Foto, video en ontwerp','Landingspagina\'s en conversie','E-mail en automation','SEO op woorden die converteren','Het portaal, elk uur bijgewerkt','Dagmail om 7.00 uur','Maandelijks opzegbaar'].map(function(r){return '<div class="matrix-r"><span>'+r+'</span>'+PAKKETTEN.map(function(){return '<i class="ja"></i>'}).join('')+'</div>'}).join('')+'</div>'
    +'</div></section>';
  /* Fundament */
  h+='<section class="s s--wit"><div class="wrap"><div class="fund">'+sectieKop('Eenmalig','Het fundament.','€ 4.500.','Betaald bij ondertekening, uitgevoerd in de opstartmaand. Niet los verkrijgbaar.')
    +'<div class="fund-k"><div class="fund-blok rv"><span class="eyebrow">De basis</span>'+vinkLijst(['Doelgroep, boodschap en concurrenten','Technische audit en meting','Advertentieaccounts op jouw naam','MailerLite en het portaal','De nulmeting: je vertrekpunt'])+'</div>'
    +'<div class="fund-blok fund-blok--donker rv rv-2"><span class="eyebrow">De eerste campagne</span>'+vinkLijst(['Zoekwoorden, structuur en advertenties','Een landingspagina','Een dagdeel filmen','Montage in drie formaten','Live rond dag 19'])+'</div></div>'
    +'<div class="fund-lijn rv"><div class="tl3"><div><small>Dag</small><b>0</b><span>Tekenen en betalen.</span></div><div><small>Werkdag</small><b>3</b><span>Alle toegangen binnen.</span></div><div><small>Dag</small><b>19</b><span>Je eerste campagne live.</span></div></div></div></div></div></section>';
  /* Rekenhulp */
  h+='<section class="s gr gr--nacht" id="rekenhulp"><div class="wrap">'+sectieKop('De rekenhulp','Begin bij je ambitie.','Niet bij je budget.','Hoeveel extra omzet je wilt. Daaruit volgen het aantal klanten, de aanvragen en hoe groot de motor moet zijn.')
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
    +'<p class="mini" style="margin-top:24px">Een rekensom, geen belofte.</p></div></div></div></section>';
  /* 50% */
  h+='<section class="s s--zwart"><div class="wrap"><div class="split" style="align-items:center">'+sectieKop('De 50%-regel','De helft.','Hooguit.','Ons pakket is nooit meer dan de helft van wat je samen uitgeeft. Advertentiebudget is de motor, geen restpost.')+'<div class="rv rv-2">'+vijftig()+'</div></div></div></section>';
  /* Regels en toolset */
  h+='<section class="s gr gr--licht"><div class="wrap">'+sectieKop('Spelregels en toolset','Vier regels.','En wat er op jouw naam staat.')
    +'<div class="regels regels--licht">'+[['Het hoogste van twee','Je pakket volgt uit het aantal campagnes of uit je budget. Wat hoger uitkomt, telt.'],['Tegelijk is tegelijk','Eén campagne is één aanbod, voor één doelgroep, met één landingspagina. Google en Meta samen tellen als één.'],['Wij kiezen de kanalen','Minimaal € 500 per kanaal per campagne per maand. Op LinkedIn € 1.000.'],['Omhoog per direct','Omlaag per de eerste van de volgende maand.']].map(function(r,i){return '<div class="regel rv rv-'+(i+1)+'"><span>'+(i+1)+'</span><h3>'+r[0]+'</h3><p>'+r[1]+'</p></div>'}).join('')+'</div>'
    +'<div class="tools">'+['portaal','mailerlite','cookiescript','webmix','leadinfo','clickcease','calendly'].map(function(k,i){var t=JR.tools[k];return '<div class="tool rv rv-'+(i%4+1)+'"><span class="tool-ini">'+t[0].charAt(0)+'</span><span><b>'+t[0]+'</b><small>'+t[1]+'</small></span><em>'+t[2]+'</em><i>'+t[3]+'</i></div>'}).join('')+'</div>'
    +'<p class="mini" style="margin-top:14px">De leverancier factureert rechtstreeks aan jou. Wij zetten er niets bovenop; een doorverwijsvergoeding melden we.</p></div></section>';
  h+='<section class="s s--wit"><div class="wrap"><div class="faq4"><div class="sk"><span class="eyebrow rv">Vragen</span>'+vl('h1 rv','Over geld.','Recht voor zijn raap.')+'</div>'+vragen([['Waarom geen uurtarief?','Omdat we niet worden afgerekend op uren, maar op aanvragen en wat ze kosten. Een vaste prijs houdt ons scherp op wat het oplevert.'],['Wat als het niet werkt?','Dan zeggen we het zelf, met de cijfers erbij. Er is altijd een meetlat: de nulmeting en het doel. Je kunt maandelijks opzeggen.'],['Kan ik later een ander pakket kiezen?','Ja. Omhoog gaat per direct, omlaag per de eerste van de volgende maand.'],['Waarom is het fundament niet los te koop?','Het fundament is de voorbereiding op het seizoen. Zonder seizoen erachter levert het je niets op.'],['Wat gebeurt er met mijn accounts als ik stop?','Die zijn en blijven van jou: advertentieaccounts, data, MailerLite en het portaal.']])+'</div></div></section>';
  return h+slot();
};

/* ---------- Portaal ---------- */
PAGINA.portaal=function(){
  var h=lokaal('Het portaal','<a class="knop knop--rand" href="#/inloggen">Inloggen</a>');
  h+='<section class="gr gr--merk sh sh--breed"><i class="vlek vlek-1"></i><i class="vlek vlek-2"></i><div class="wrap"><div class="sh-tekst sh-tekst--mid"><span class="eyebrow rv">Het portaal</span><h1 class="sh-kop rv rv-2">Je ziet wat wij zien.<span class="l">Elk uur.</span></h1><p class="sh-lead rv rv-3">Alle cijfers van al je kanalen op één scherm. Het blijft van jou, ook als je stopt.</p></div>'
    +'<div class="sb-stage rv">'+browser(scorebord(),'portaal.jamesrobinson.nl')+'<div class="zw zw-1"><small>Kosten per aanvraag</small><b>€ 52</b> <span style="color:var(--groen-tekst);font-size:12px">−€ 8</span></div><div class="zw zw-2"><small>Jouw oordeel</small><div style="display:flex;gap:6px;margin-top:6px"><span class="label" style="background:#E6F7EB;color:#1D7D3F">Goed</span><span class="label">Twijfel</span><span class="label">Niet goed</span></div></div><div class="zw zw-3">'+logo('google')+'<span><small>Zojuist</small><strong style="font-size:13px">Nieuwe aanvraag via Google</strong></span></div></div></div></section>';
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Wat erin zit','Vier dingen.','Die een rapport nooit kan.')
    +zz({eyebrow:'Elk uur',vet:'Alle kanalen.',licht:'Eén scherm.',p:'Google, Meta, LinkedIn, TikTok, je website en Search Console. Elk uur bijgewerkt, geen pdf van een maand oud.',beeld:'<div class="av-kaart av-kaart--los"><small>Aanvragen per kanaal</small>'+[['google',24,100],['facebook',8,34],['instagram',6,26],['linkedin',4,17],['tiktok',2,9]].map(function(k){return '<div class="sb-kn" style="font-size:13px">'+logo(k[0])+'<i><s style="width:'+k[2]+'%"></s></i><b>'+k[1]+'</b></div>'}).join('')+'<small style="margin-top:10px">Voorbeeldcijfers</small></div>'})
    +zz({om:1,eyebrow:'Per aanvraag',vet:'Jij beoordeelt.',licht:'De campagne leert.',p:'Goed, twijfel of niet goed. En later: werd het een klant. Zo stuurt de campagne op klanten, niet op klikken.',beeld:'<ul class="feed feed--rustig oordeel-lijst">'+[['google','Offerteaanvraag','Goed'],['instagram','Afspraak','Twijfel'],['linkedin','Kennismaking','Goed'],['facebook','Offerteaanvraag','Klant']].map(function(f){return '<li>'+logo(f[0])+'<span><b>'+f[1]+'</b><small>Vandaag</small></span><em'+(f[2]==='Klant'?' class="goal"':'')+'>'+f[2]+'</em></li>'}).join('')+'</ul>'})
    +zz({eyebrow:'Op je telefoon',vet:'Een aanvraag.',licht:'Nu.',p:'Elke nieuwe aanvraag direct op je telefoon. Hoe sneller je belt, hoe groter de kans op een echt gesprek.',beeld:'<div class="combo combo--solo">'+telefoon(SCHERM.slot())+'</div>'})
    +zz({om:1,donker:1,eyebrow:'De merkkluis',vet:'Alles van je merk.',licht:'Op één plek.',p:'Logo\'s, foto\'s, video\'s en je huisstijl. Wat we op een draaidag maken, staat hier de dag erna.',beeld:'<div class="kluis">'+['momentum','likes','zeven','check','video','motor'].map(function(c){return creatief(c)}).join('')+'</div>'})
    +'</div></section>';
  return h+slot('Bekijk het met','je eigen cijfers.','In het intakegesprek laten we het portaal zien. Daarna weet je of het past.');
};

/* ---------- Over ons ---------- */
PAGINA.team=function(){
  var spelers=Object.keys(JR.team);
  var tinten=['gr--merk','gr--nacht','gr--blauw'];
  var h=subHeld({kleur:'gr--nacht',eyebrow:'Over James Robinson',vet:'Geen bureau.',licht:'Een selectie.',lead:'Tien specialisten in Hulsberg. Zeven begonnen hier als stagiair. Online is ons vak; de beste gesprekken voeren we aan tafel.',knoppen:'<a class="knop knop--lime knop--groot" href="#/werken-bij">Werken bij</a><a class="knop knop--rand knop--groot" href="#/contact">Kom langs</a>',beeld:'<div class="team-stapel">'+spelers.slice(0,3).map(function(k,i){return spelerKaart(k,tinten[i])}).join('')+'</div>'});
  /* Tijdlijn */
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Het verhaal','Bedacht in 2017.','Nog steeds in beweging.')
    +'<div class="jaren">'+[['2017','Het idee','Jim Coumans bedenkt James Robinson.'],['2018','Opgericht','Het bureau start in Zuid-Limburg.'],['2022','Twee eigenaren','Jim Kikken wordt mede-eigenaar, met data-gedreven performance marketing als vak.'],['Nu','Tien in Hulsberg','Zeven van de tien begonnen hier als stagiair.']].map(function(j,i){return '<div class="jaar rv rv-'+(i+1)+'"><b>'+j[0]+'</b><h3>'+j[1]+'</h3><p>'+j[2]+'</p></div>'}).join('')+'</div></div></section>';
  /* Principes */
  var pr=[['Resultaat staat op één','Marketing moet geld opleveren; anders is het een hobby.','groei'],['Numbers don\'t lie','De cijfers wegen zwaarder dan onze mening. En dan die van jou.','bord'],['Science + art','Data vindt de juiste persoon; het merk zorgt dat die blijft kijken.','alles'],['Radicale transparantie','Alles op jouw naam, realtime cijfers, nooit marge erbovenop.','sleutel'],['Eerlijk nee','We beginnen alleen als we erin geloven.','duim'],['Slimmer werken','AI en automatisering waar het iets oplevert. Mensen beslissen.','klok']];
  h+='<section class="s s--zwart"><div class="wrap">'+sectieKop('Waar we in geloven','Zes principes.','Geen poster aan de muur.')+'<div class="princ">'+pr.map(function(p,i){return '<div class="princ-k rv rv-'+(i%3+1)+'"><span class="si si--donker">'+icoon(p[2])+'</span><h3>'+p[0]+'</h3><p>'+p[1]+'</p></div>'}).join('')+'</div></div></section>';
  /* Selectie */
  h+='<section class="s gr gr--nacht"><div class="wrap">'+sectieKop('De selectie','Staf, selectie en jeugd.','')+'</div>'+rail('rail-team',spelers.map(function(k,i){return spelerKaart(k,tinten[i%3])}),'rail--portret')+'<div class="wrap"><p class="mini" style="color:rgba(255,255,255,.5)">Portretten volgen na de portretdag.</p></div></section>';
  /* Kantoor en werken bij */
  var stip='';for(var n=0;n<10;n++)stip+='<span class="'+(n<7?'aan':'')+'"><i></i></span>';
  h+='<section class="s s--wit"><div class="wrap"><div class="duo2">'
    +'<div class="kantoor gr gr--merk rv"><span class="kantoor-bm" aria-hidden="true">'+bm()+'</span><span class="kantoor-pin">'+icoon('pin')+'Hulsberg, Zuid-Limburg</span><div><span class="eyebrow">Het kantoor</span><h3>Ingericht <span class="l">om te presteren.</span></h3><p>Plekken voor stilte. Ruimte voor grote ideeën. En koffie voor wie langskomt. Een paar keer per jaar staan we met klanten op de padelbaan.</p><a class="knop knop--lime" href="#/contact">Kom langs</a></div></div>'
    +'<a class="kantoor kantoor--donker rv rv-2" href="#/werken-bij"><div class="zeven zeven--klein">'+stip+'</div><div><span class="eyebrow">Werken bij</span><h3>Begin als stagiair. <span class="l">Speel in de selectie.</span></h3><p>Zeven van de tien collega\'s begonnen hier als stagiair. Stage, afstuderen of een vaste plek.</p><span class="ln-k">Bekijk de vacatures</span></div></a>'
    +'</div></div></section>';
  return h+slot();
};

/* ---------- Werken bij ---------- */
PAGINA['werken-bij']=function(){
  var zeven='<div class="zeven">'+new Array(11).join('x').split('').map(function(_,i){return '<span class="'+(i<7?'aan':'')+'"><i></i></span>'}).join('')+'<p><b>7 van de 10</b> collega\'s begonnen hier als stagiair.</p></div>';
  var h=subHeld({kleur:'gr--nacht',eyebrow:'Werken bij James Robinson',vet:'Begin als stagiair.',licht:'Speel in de selectie.',lead:'Je leert het vak in onze manier van werken, met echte klanten en echte budgetten.',knoppen:'<a class="knop knop--lime knop--groot" href="#vacatures">Bekijk de vacatures</a>',beeld:zeven});
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Wat je hier doet','Echte campagnes.','Vanaf week één.')
    +'<div class="princ princ--licht">'+[['Echte budgetten','Je werkt aan campagnes die vandaag live staan, met de cijfers van gisteren.','groei'],['Eén manier van werken','Wat we doen, staat beschreven. Je hoeft niet te raden hoe het hoort.','pagina'],['Slim gereedschap','AI en automatisering waar het werk beter van wordt.','alles'],['Buiten kantoor','Padel tegen andere bedrijven en met klanten.','duim']].map(function(p,i){return '<div class="princ-k rv rv-'+(i%3+1)+'"><span class="si">'+icoon(p[2])+'</span><h3>'+p[0]+'</h3><p>'+p[1]+'</p></div>'}).join('')+'</div></div></section>';
  h+='<section class="s gr gr--licht" id="vacatures"><div class="wrap">'+sectieKop('Open plekken','Drie manieren.','Om in te stappen.')
    +'<div class="vac">'+Object.keys(JR.vacatures).map(function(k,i){var v=JR.vacatures[k];return '<a class="vac-k rv rv-'+(i+1)+'" href="#/contact"><span class="label">'+v[1]+'</span><h3>'+v[0]+'</h3><p>'+v[2]+'</p><span class="ln-k">Solliciteer</span></a>'}).join('')+'</div></div></section>';
  return h+slot('Geen vacature die past.','Wel een speler die past.','Stuur een open sollicitatie.');
};

/* ---------- Branche ---------- */
PAGINA.branche=function(k){
  var b=JR.branches[k], B=BRANCHE[k]; if(!b||!B)return PAGINA.nietGevonden();
  var kanaalVan=function(t){return /LinkedIn/i.test(t)?logo('linkedin','si-logo'):/Social|Instagram|Facebook/i.test(t)?logo('instagram','si-logo'):/E-mail|Automation/i.test(t)?'<span class="si">'+icoon('mail')+'</span>':/Landingspagina/i.test(t)?'<span class="si">'+icoon('pagina')+'</span>':/Opvolging|uur/i.test(t)?'<span class="si">'+icoon('klok')+'</span>':/Leadinfo/i.test(t)?'<span class="si">'+icoon('bord')+'</span>':logo('google','si-logo')};
  var kaart='<div class="h4-kaart"><div class="h4-kop">'+bm()+'<span><b>Portaal</b><small>Voorbeeld · '+b.n+'</small></span><span class="h4-live"><i></i>Live</span></div><div class="h4-getal"><small>Nieuwe '+B.mv+' deze maand</small><b data-tel="38">0</b><span>+6 ten opzichte van vorige maand</span></div><ul class="feed feed--held">'+feedHtml(B)+'</ul></div>';
  var h=subHeld({kruimel:['Voor jou','#/'],eyebrow:'Marketing voor '+b.n.toLowerCase()+' in Zuid-Limburg',vet:'Meer '+B.mv+'.',licht:b.r,lead:'Wij adverteren voor '+b.n.toLowerCase()+' in Zuid-Limburg, in Google en op social media. We sturen op '+b.doel+', niet op bereik of likes.',beeld:kaart});
  h+='<section class="s s--wit"><div class="wrap">'+sectieKop('Wat we voor je doen','Vier zetten.','Voor '+b.n.toLowerCase()+'.')
    +'<div class="sub-grid sub-grid--4">'+b.w.map(function(w,i){return '<div class="sub-k rv rv-'+(i+1)+'">'+kanaalVan(w)+'<h3>'+w+'</h3></div>'}).join('')+'</div></div></section>';
  h+='<section class="s gr gr--nacht" id="rekensom"><div class="wrap"><div class="rs"><div class="sk"><span class="eyebrow rv">De rekensom</span>'+vl('h1 rv','Wat mag een '+B.ev,'jou kosten.')+'<p class="lead rv rv-2">Vul in wat een nieuwe klant je oplevert. Dan zie je wat een '+B.ev+' maximaal mag kosten, en hoeveel je er per maand nodig hebt.</p></div>'
    +'<div class="rs-kaart rv rv-2"><div class="rs-r"><label for="rs-w"><span>Wat een nieuwe klant je in het eerste jaar oplevert</span> <b id="rs-ow"></b></label><input type="range" id="rs-w" min="100" max="25000" step="100" value="2000"></div>'
    +'<div class="rs-r"><label for="rs-c"><span>Hoeveel van de 10 '+B.mv+' klant worden</span> <b id="rs-oc"></b></label><input type="range" id="rs-c" min="1" max="9" step="1" value="3"></div>'
    +'<div class="rs-r"><label for="rs-k"><span>Hoeveel nieuwe klanten je per maand wilt</span> <b id="rs-ok"></b></label><input type="range" id="rs-k" min="1" max="60" step="1" value="8"></div>'
    +'<div class="rs-uit"><div><small>Een '+B.ev+' mag je maximaal kosten</small><b id="rs-max">€ 0</b><span>Bij 30% marge.</span></div><div><small>Daarvoor heb je per maand nodig</small><b id="rs-aanv">0</b><span id="rs-uitleg"></span></div></div>'
    +'<span data-b="mv" hidden>'+B.mv+'</span><a class="knop knop--lime" style="margin-top:22px" href="#/past-het">Reken het door met je echte cijfers</a></div></div></div></section>';
  h+='<section class="s gr gr--licht"><div class="wrap">'+sectieKop('Andere branches','Ook voor','')+'<div class="chips">'+Object.keys(JR.branches).filter(function(x){return x!==k}).map(function(x){return '<a href="#/branches/'+x+'">'+JR.branches[x].n+'</a>'}).join('')+'</div></div></section>';
  return h+slot();
};

/* ---------- Contact ---------- */
PAGINA.contact=function(){
  var kaart='<div class="regio"><svg viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="170" class="r3"/><circle cx="200" cy="200" r="115" class="r2"/><circle cx="200" cy="200" r="60" class="r1"/>'
    +[['10 km',200,134],['20 km',200,79],['30 km',200,24]].map(function(r){return '<text x="'+r[1]+'" y="'+r[2]+'" class="km">'+r[0]+'</text>'}).join('')
    +[['Maastricht',120,223,1],['Valkenburg',172,206,1],['Heerlen',251,194],['Kerkrade',296,206],['Sittard-Geleen',177,104],['Brunssum',245,149]].map(function(p){return '<g><circle cx="'+p[1]+'" cy="'+p[2]+'" r="4" class="stip"/><text x="'+(p[3]?p[1]-8:p[1]+8)+'" y="'+(p[2]+4)+'"'+(p[3]?' text-anchor="end"':'')+'>'+p[0]+'</text></g>'}).join('')
    +'<circle cx="200" cy="200" r="9" class="thuis"/><text x="200" y="230" text-anchor="middle" class="thuis-t">Hulsberg</text></svg><small>Onze focus: ongeveer 30 km rond Hulsberg</small></div>';
  var h=subHeld({kleur:'gr--nacht',eyebrow:'Contact',vet:'Bel. Mail.',licht:'Of kom langs.',lead:'Online is ons vak. De beste gesprekken voer je aan tafel.',knoppen:'<a class="knop knop--lime knop--groot" href="tel:0457920009">045 792 0009</a><a class="knop knop--rand knop--groot" href="mailto:support@jamesrobinson.nl">Stuur een mail</a>',beeld:kaart});
  h+='<section class="s s--wit"><div class="wrap"><div class="ct">'
    +[['bel','Bellen','045 792 0009','Maandag tot en met vrijdag, 8.00 tot 18.00 uur. Ligt je campagne of website eruit, bel dan altijd.','tel:0457920009','Bel ons'],['mail','Mailen','support@jamesrobinson.nl','Antwoord binnen één werkdag, van wie erover gaat.','mailto:support@jamesrobinson.nl','Stuur een mail'],['pin','Langskomen','Hulsberg',vul('[Straat en huisnummer], [postcode] Hulsberg'),'#/past-het','Plan een intakegesprek']].map(function(c,i){return '<a class="ct-k rv rv-'+(i+1)+'" href="'+c[4]+'"><span class="si">'+(c[0]==='bel'?IC.bel.replace('fill="#fff"','fill="currentColor"'):icoon(c[0]))+'</span><small>'+c[1]+'</small><h3>'+c[2]+'</h3><p>'+c[3]+'</p><span class="ln-k">'+c[5]+'</span></a>'}).join('')
    +'</div></div></section>';
  return h;
};

/* Wordt aangeroepen na elke paginawissel */
function naRender(d){
  if(d[0]==='werkwijze')keten();
  if(d[0]==='branches')rekensom();
  $$('[data-naar]').forEach(function(a){a.addEventListener('click',function(){var t=document.getElementById(a.getAttribute('data-naar'));if(t)window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-110,behavior:'smooth'})})});
}
