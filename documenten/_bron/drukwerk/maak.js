// Drukklare pdf's met eigen formaat en afloop. Gebruik: node maak.js <html> <pdf>
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
;(async () => {
  const [html, pdf] = process.argv.slice(2)
  const b = await chromium.launch()
  const p = await b.newPage()
  await p.goto('file://' + require('path').resolve(html))
  await p.evaluate(() => document.fonts.ready)
  await p.pdf({ path: pdf, printBackground: true, preferCSSPageSize: true })
  await b.close()
  console.log('ok', pdf)
})()
