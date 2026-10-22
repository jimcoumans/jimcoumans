/* Ronde 7: de homepage in zeven schermen, in de toon van Nike.
   Kort, uitdagend, vanuit de ondernemer. Vervangt PAGINA.home en slot() uit app.js. */
function belScherm(){
  return '<div class="bel"><div class="bel-ring"><i></i><i></i><span>'+bm()+'</span></div>'
    +'<small>Nieuwe aanvraag</small><b data-bel>'+B.feed[0][1]+'</b><span data-bel2>'+B.feed[0][2]+'</span>'
    +'<div class="bel-knoppen"><span class="bel-nee" aria-hidden="true"></span><span class="bel-ja" aria-hidden="true"></span></div><em>Bel binnen het uur</em></div>';
}
function staafjes(){
  var v=[12,15,14,19,22,26],m=['mei','jun','jul','aug','sep','okt'];
  return '<div class="staaf">'+v.map(function(x,i){return '<div><i style="--h:'+(x/26*100)+'%"></i><b class="tab">'+x+'</b><small>'+m[i]+'</small></div>'}).join('')+'</div>';
}
function dalend(){
  var v=[96,88,81,74,69,62],W=300,H=130,p=12,mx=100,mn=55;
  var pt=v.map(function(y,i){return [p+i*(W-2*p)/(v.length-1),p+(mx-y)*(H-2*p)/(mx-mn)]});
  var d=pt.map(function(q,i){return (i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ');
  var l=pt[pt.length-1],f=pt[0];
  return '<svg viewBox="0 0 '+W+' '+(H+22)+'" aria-hidden="true"><path class="teken" d="'+d+'" fill="none" stroke="#1D1D1F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    +'<circle cx="'+f[0]+'" cy="'+f[1]+'" r="4" fill="#fff" stroke="#1D1D1F" stroke-width="2"/><circle cx="'+l[0]+'" cy="'+l[1]+'" r="7" fill="#34C759"/>'
    +'<text x="'+f[0]+'" y="'+(f[1]+24)+'" font-size="13" fill="#86868B">€ 96</text><text x="'+l[0]+'" y="'+(l[1]+28)+'" text-anchor="end" font-size="15" font-weight="700" fill="#1F8A3B">€ 62</text></svg>';
}
PAGINA.home=function(){
  var h='';
  /* 1. Hero. Begrip van het probleem en geld in één zin. Het beeld: de telefoon gaat. */
  h+='<section class="h7"><div class="wrap h7-in"><div>'
    +'<h1 class="h7-kop op">Je wilt geen marketing.<br><span class="h7-mark">Je wilt klanten.</span></h1>'
    +'<p class="h7-lead op op-2">Wij zorgen dat je telefoon gaat. Elke maand, meetbaar tot op de euro. Werkt het niet, dan hoor je dat van ons. Niet van je boekhouder.</p>'
    +'<div class="knoppen op op-3"><button type="button" class="knop knop--zwart knop--groot" data-check>Doe de check</button><span class="h7-duur">15 minuten. Eerlijk antwoord.</span></div>'
    +'<div class="branches h7-branches op op-4" role="group" aria-label="Kies je branche"><small>Jouw branche</small>'+Object.keys(BRANCHE).filter(Boolean).map(function(k){return '<button type="button" data-branche="'+k+'" aria-pressed="'+(BRANCHE[k]===B)+'">'+BRANCHE[k].n+'</button>'}).join('')+'</div>'
    +'</div><div class="h7-tel op op-2">'+tel(belScherm())+'<p class="mini">Voorbeeld</p></div></div>'
    +'<div class="band" aria-label="Kort samengevat"><div class="band-in">'+['5,0 op Google','Maandelijks opzegbaar','Alles op jouw naam','Nooit marge op je budget','Elke ochtend om 7.00 gecontroleerd'].concat(['5,0 op Google','Maandelijks opzegbaar','Alles op jouw naam','Nooit marge op je budget','Elke ochtend om 7.00 gecontroleerd']).map(function(t){return '<span>'+t+'</span>'}).join('')+'</div></div></section>';

  /* 2. Herkenning. Manifest-stijl: de klant herkent zijn eigen week. */
  h+='<section class="s s--zwart manifest"><div class="wrap"><span class="boven boven--bal op">Je kent het</span>'
    +'<p class="mf-r op">Drukke maand. Stille maand. <span>Je weet nooit welke eraan komt.</span></p>'
    +'<p class="mf-r op">Je bureau stuurt een rapport vol bereik. <span>Je kassa merkt er niets van.</span></p>'
    +'<p class="mf-r op">Je post, je boost, je hoopt.</p>'
    +'<p class="mf-r mf-r--bal op">Dat is geen plan. Dat is een gok.</p></div></section>';

  /* 3. Wat je krijgt. Rendement, zichtbaar gemaakt. */
  h+='<section class="s s--grijs"><div class="wrap"><h2 class="kop-l op">Voorspelbaar. Meetbaar.<br><span class="grijs">Steeds goedkoper.</span></h2>'
    +'<div class="krijg">'
    +'<article class="kr op"><div class="kr-beeld">'+staafjes()+'</div><h3>Een vaste stroom <span data-b="mvA">'+B.mvA+'</span>.</h3><p>Uit Google en social, elke maand. Niet alleen als het meezit.</p></article>'
    +'<article class="kr op op-2"><div class="kr-beeld"><small class="kr-label">Kosten per klant</small>'+dalend()+'</div><h3>Elke maand goedkoper per klant.</h3><p>Omdat we testen in plaats van gokken. Wat wint, krijgt het budget.</p></article>'
    +'<article class="kr op op-3"><div class="kr-beeld kr-live"><span class="live"><i></i>Live</span><small>Kosten per <span data-b="ev">'+B.ev+'</span></small><b class="tab">€ 52</b><em>− € 8 deze maand</em><small class="kr-tijd">Bijgewerkt om 9.00</small></div><h3>Elk uur je cijfers live.</h3><p>Je ziet precies wat elke klant kost. Geen pdf van een maand oud.</p></article>'
    +'</div><p class="mini" style="margin-top:20px">Voorbeeldcijfers.</p></div></section>';

  /* 4. Waarom wij. De besten, en eerlijk. Elk punt is controleerbaar. */
  h+='<section class="s"><div class="wrap"><h2 class="kop-l op">Wij spelen op resultaat.<br><span class="grijs">Niet op uren.</span></h2><div class="waarom">'
    +[['Aanvragen','We worden afgerekend op aanvragen. Niet op uren en niet op likes.'],['7.00','Elke ochtend checken we elke campagne. We zien een probleem voordat jij het merkt.'],['Jouw naam','Accounts, data en portaal staan op jouw naam. Stop je, dan neem je alles mee.'],['Nee','Past het niet? Dan zeggen we nee. Liever nu dan over drie maanden.']]
      .map(function(r,i){return '<div class="wr op"><b'+(i===3?' class="wr-nee"':'')+'>'+r[0]+'</b><p>'+r[1]+'</p></div>'}).join('')+'</div></div></section>';

  /* 5. Bewijs. Alleen wat klopt. De vakken laten zien wat er nog moet komen. */
  h+='<section class="s s--grijs"><div class="wrap"><h2 class="kop-l op">Vraag het<br><span class="grijs">onze klanten.</span></h2><div class="bewijs7">'
    +'<div class="score op">'+logo('google')+'<b>5,0</b><div class="sterren">'+[1,2,3,4,5].map(function(){return IC.ster}).join('')+'</div><p>11 reviews op Google. Allemaal vijf sterren.'+noot(3)+'</p></div>'
    +'<div class="cases7">'+[1,2,3].map(function(n,i){return '<article class="c7 op op-'+(i+1)+'"><small>'+vul('[Klant]')+' · '+vul('[branche]')+'</small><div class="c7-cijfer"><span>Kosten per aanvraag</span><b>'+vul('[van]')+' <i>→</i> '+vul('[naar]')+'</b></div><p>'+vul('[Eén zin: wat er veranderde voor de ondernemer.]')+'</p></article>'}).join('')+'</div></div></div></section>';

  /* 6. Prijs. Eén getal, geen kleine lettertjes. */
  h+='<section class="s s--zwart"><div class="wrap prijs7"><div><h2 class="kop-l op">Eén pakket.<br><span class="grijs">Geen kleine lettertjes.</span></h2><p class="intro op op-2">Eén prijs, voor iedereen gelijk. Daarna alleen extra\'s als de cijfers erom vragen, met de prijs vooraf erbij.</p></div>'
    +'<div class="p7 op op-2"><div class="p7-bedrag tab">€ 1.250</div><span class="p7-per">per maand, exclusief btw</span><ul><li>Maandelijks opzegbaar</li><li>Geen marge op je advertentiebudget. Nooit.</li><li>Eenmalig het fundament: € 4.500</li></ul><button type="button" class="knop knop--bal" data-check>Doe de check</button></div></div></section>';
  return h+slot();
};
/* 7. Slot. Uitdaging, dan één actie. */
function slot(){
  return '<section class="slot-cta">'+foto('Stand-in · foto 03','Slotbeeld','Extreme close-up: padelbal net na de klap, vervormd. Zwarte achtergrond, één harde lichtbron, zware grain.')
    +'<div class="wrap"><h2 class="kop-xl op">Je concurrent<br>adverteert al.</h2>'
    +'<p class="slot-sub op op-2">De vraag is alleen wie als eerste terugbelt.</p>'
    +'<div class="knoppen op op-3"><button type="button" class="knop knop--bal knop--groot" data-check>Doe de check</button><span class="tel-tekst">Of bel <b>045 792 0009</b></span></div></div></section>';
}
var oudKies=kiesBranche;
kiesBranche=function(k){oudKies(k);var a=$('[data-bel]'),b=$('[data-bel2]');if(a){a.textContent=B.feed[0][1];b.textContent=B.feed[0][2]}};
