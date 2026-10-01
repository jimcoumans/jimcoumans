const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
(async()=>{const b=await chromium.launch();const p=await b.newPage();
for(const j of jobs){
  await p.goto('file://'+j.html);await p.evaluate(()=>document.fonts.ready);
  const voet=`<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7px;color:#86868b;padding:0 16mm;display:flex;justify-content:space-between"><span>James Robinson · ${j.voet.replace(/&/g,'&amp;')}</span><span>Versie 1.0 · oktober 2026 · pagina <span class="pageNumber"></span> van <span class="totalPages"></span></span></div>`;
  await p.pdf({path:j.pdf,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:voet});
  console.log('ok',j.pdf.split('/').slice(-2).join('/'));
}
await b.close();})();
