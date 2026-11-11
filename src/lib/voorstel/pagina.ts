/* -------------------------------------------------------------------------
   De voorstelgenerator in de Wallet.

   De generator is één HTML-pagina (generator.html), precies zoals hij op
   claude.ai draaide: dezelfde schermen, dezelfde PDF. Op claude.ai bewaarde
   hij zijn dossiers via window.claude.use('db'). Hier zetten we vóór zijn
   eigen script een kleine vervanger neer die naar /api/voorstellen praat,
   zodat de dossiers in de database van de Wallet staan en het hele team ze
   ziet. De generator zelf blijft ongewijzigd; aanpassen doe je in
   generator.html.
   ------------------------------------------------------------------------- */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const BESTAND = path.join(/*turbopackIgnore: true*/ process.cwd(), 'src/lib/voorstel/generator.html')

/** De vervanger voor window.claude: database en downloads via de Wallet; AI volgt later. */
export const SHIM = `(function(){
  var api = function(p, o){
    return fetch('/api/voorstellen' + p, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, o || {}))
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){
        if(!r.ok || !j.ok){ var e = new Error(j.error || 'fout'); e.code = r.status === 401 ? 'geen_toegang' : (j.error || 'serverfout'); throw e; }
        return j;
      }); });
  };
  var luisteraars = [];
  var lijst = function(){ return api('').then(function(j){
    var snap = { docs: j.dossiers.map(function(d){ return { id: d.id, data: function(){ return d; } }; }) };
    luisteraars.forEach(function(f){ f(snap); }); return snap; }); };
  var dossiers = {
    orderBy: function(){ return { onSnapshot: function(cb, err){ luisteraars.push(cb); lijst().catch(function(e){ if(err) err(e); }); return function(){}; } }; },
    doc: function(id){ var p = '/' + encodeURIComponent(id); return {
      set: function(body){ return api(p, { method: 'PUT', body: JSON.stringify(body) }).then(function(){ lijst().catch(function(){}); }); },
      get: function(){ return api(p).then(function(j){ return { exists: !!j.bestaat, data: function(){ return j.dossier; } }; }); },
      delete: function(){ return api(p, { method: 'DELETE' }).then(function(){ lijst().catch(function(){}); }); }
    }; }
  };
  var db = {
    collection: function(n){ if(n !== 'dossiers') throw new Error('Onbekende collectie: ' + n); return dossiers; },
    doc: function(pad){ var key = encodeURIComponent(String(pad).split('/')[1] || ''); return {
      onSnapshot: function(cb){ api('/instellingen/' + key).then(function(j){ cb({ exists: !!j.bestaat, data: function(){ return j.data; } }); }).catch(function(){}); return function(){}; },
      set: function(data){ return api('/instellingen/' + key, { method: 'PUT', body: JSON.stringify(data) }); }
    }; }
  };
  var downloads = { save: function(o){
    var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename;
    document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return Promise.resolve();
  } };
  window.claude = { use: function(n){
    if(n === 'db') return Promise.resolve(db);
    if(n === 'downloads') return Promise.resolve(downloads);
    return Promise.reject(new Error('Niet beschikbaar in de Wallet: ' + n));
  } };
})();`

const TERUG = `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;background:#1C1C1E;color:#fff;padding:8px 16px;display:flex;justify-content:space-between;gap:12px;align-items:center"><a href="/beheer" style="color:#fff;text-decoration:none">← Terug naar het beheer</a><span style="color:#ADADB2">Voorstelgenerator · dossiers staan in de Wallet</span></div>`

/** De generator met de vervanger en een terugbalk erin. */
export function zetIn(html: string): string {
  let uit = html.replace('AI werkt in de gepubliceerde pagina op claude.ai.', 'AI-hulp volgt in een volgende versie van het portaal.')
  const script = uit.indexOf('<script')
  if (script < 0) throw new Error('De generator heeft geen script.')
  uit = `${uit.slice(0, script)}<script>${SHIM}</script>${uit.slice(script)}`
  uit = uit.replace('<body>', `<body>${TERUG}`)
  return uit
}

let cache: string | null = null

export async function generatorPagina(): Promise<string> {
  if (cache && process.env.NODE_ENV === 'production') return cache
  cache = zetIn(await readFile(BESTAND, 'utf8'))
  return cache
}
