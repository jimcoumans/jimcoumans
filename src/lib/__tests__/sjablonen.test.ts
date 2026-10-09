/**
 * Tests voor de standaardteksten.
 *
 * Wat hier vastligt: dat de lijst met plaatshouders en voorwaarden die het
 * portaal toont precies klopt met wat het systeem invult. Zou die lijst iets
 * missen, dan wordt een geldige tekst geweigerd; zou hij te veel bevatten,
 * dan staat er straks [ONBEKEND: ...] in een contract.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { client } from '../../db'
import {
  controleerTekst,
  verzekeringenZin,
  listSjablonen,
  CONTRACT_PLAATSHOUDERS,
  INTRO_PLAATSHOUDERS,
  CONTRACT_VOORWAARDEN,
} from '../sjablonen'
import { stelContractOp, contractWerkgever, listFunctieprofielen, type ContractInvoer } from '../contracten'
import { getBedrijf, avgTekst, STANDAARD_AVG_TEKST, AVG_PLAATSHOUDERS } from '../bedrijf'
import { MAIL_SJABLONEN, MAIL_PLAATSHOUDERS, MAIL_VOORWAARDEN, contractMail, welkomMail, gegevensMail } from '../mailsjablonen'

after(async () => {
  await client.end()
})

const kent = { plaatshouders: CONTRACT_PLAATSHOUDERS, voorwaarden: CONTRACT_VOORWAARDEN }

test('een tikfout in een plaatshouder of voorwaarde valt op', () => {
  assert.deepEqual(controleerTekst('Op {{ingangsdatum}} begint {{functie}}.', kent), [])
  assert.match(controleerTekst('Op {{ingangsdatm}}.', kent).join(' '), /Onbekende plaatshouder \{\{ingangsdatm\}\}/)
  assert.match(controleerTekst('{{#als bereikbar}}x{{/als}}', kent).join(' '), /Onbekende voorwaarde "bereikbar"/)
  assert.match(controleerTekst('{{#als bereikbaar}}x', kent).join(' '), /elk blok moet sluiten/)
  assert.match(controleerTekst('Een {losse} accolade', kent).join(' '), /losse accolade/)
})

test('elk huidig sjabloon gaat door de controle', async () => {
  const sjablonen = await listSjablonen()
  assert.ok(sjablonen.length > 0)
  for (const s of sjablonen) {
    for (const a of s.artikelen) assert.deepEqual(controleerTekst(a.body, kent), [], `${s.template.name}: ${a.title}`)
    assert.deepEqual(controleerTekst(s.template.intro ?? '', { ...kent, plaatshouders: { ...CONTRACT_PLAATSHOUDERS, ...INTRO_PLAATSHOUDERS } }), [], `${s.template.name}: begeleidende tekst`)
  }
})

test('elke plaatshouder uit de lijst wordt ook echt ingevuld', async () => {
  const sjablonen = await listSjablonen()
  const s = sjablonen.find((x) => x.template.kind === 'bepaalde_tijd')!
  const alles = Object.keys(CONTRACT_PLAATSHOUDERS).map((n) => `{{${n}}}`).join(' ')
  const intro = Object.keys({ ...CONTRACT_PLAATSHOUDERS, ...INTRO_PLAATSHOUDERS }).map((n) => `{{${n}}}`).join(' ')
  const nep = {
    template: { ...s.template, intro },
    artikelen: [{ ...s.artikelen[0]!, body: alles, voorwaarde: 'altijd' as const }],
  }
  const bedrijf = (await getBedrijf())!
  const profiel = (await listFunctieprofielen()).find((p) => p.title === 'Marketing Manager')!
  const invoer: ContractInvoer = {
    candidateId: 'x', naam: 'A B', functie: 'Marketing Manager', soort: 'bepaalde_tijd', ingangsdatum: new Date(2026, 9, 13, 12),
    looptijdMaanden: 7, urenPerWeekKwartier: 2400, brutoMaandCents: 200_000, schaalNaam: 'Medior', trede: 12, relatiebeding: true, jobProfileId: profiel.id,
  }
  const c = stelContractOp(invoer, nep, contractWerkgever(bedrijf, null, 'https://x'), profiel)
  assert.deepEqual(c.ontbrekend, [])
})

test('elke voorwaarde uit de lijst kent het systeem', async () => {
  const sjablonen = await listSjablonen()
  const s = sjablonen.find((x) => x.template.kind === 'bepaalde_tijd')!
  const body = Object.keys(CONTRACT_VOORWAARDEN).map((n) => `{{#als ${n}}}ja{{/als}}`).join(' ')
  const nep = { template: { ...s.template, intro: '' }, artikelen: [{ ...s.artikelen[0]!, body, voorwaarde: 'altijd' as const }] }
  const bedrijf = (await getBedrijf())!
  const invoer: ContractInvoer = { candidateId: 'x', naam: 'A B', functie: 'F', soort: 'bepaalde_tijd', ingangsdatum: new Date(2026, 9, 13, 12), looptijdMaanden: 7, urenPerWeekKwartier: 2400, brutoMaandCents: 200_000 }
  const c = stelContractOp(invoer, nep, contractWerkgever(bedrijf, null, null), null)
  assert.ok(!c.ontbrekend.some((o) => o.startsWith('voorwaarde ')), c.ontbrekend.join(', '))
})

test('de verzekeringen lezen als een zin, of vallen weg', () => {
  assert.equal(verzekeringenZin([]), '')
  assert.equal(verzekeringenZin(['ziekteverzuimverzekering']), 'een ziekteverzuimverzekering')
  assert.equal(
    verzekeringenZin(['ziekteverzuimverzekering', 'bedrijfsongevallenverzekering', 'arbodienst']),
    'een ziekteverzuimverzekering en een bedrijfsongevallenverzekering',
  )
})

test('de standaard-AVG-verklaring en de mails gaan door de controle', () => {
  assert.deepEqual(controleerTekst(STANDAARD_AVG_TEKST, { plaatshouders: AVG_PLAATSHOUDERS, voorwaarden: {} }), [])
  assert.equal(avgTekst({ avgText: null }), STANDAARD_AVG_TEKST)
  for (const m of Object.values(MAIL_SJABLONEN)) {
    assert.deepEqual(controleerTekst(m.tekst, { plaatshouders: MAIL_PLAATSHOUDERS, voorwaarden: MAIL_VOORWAARDEN }), [], m.label)
    assert.deepEqual(controleerTekst(m.onderwerp, { plaatshouders: MAIL_PLAATSHOUDERS, voorwaarden: MAIL_VOORWAARDEN }), [], m.label)
  }
})

test('de mails worden ingevuld zonder losse plaatshouders, en een eigen tekst gaat voor', () => {
  const c = { aan: 'a@b.nl', roepnaam: 'Daan', functie: 'Marketing Manager', startdatum: new Date(2026, 9, 13, 12), afzender: 'Jim Coumans', merk: 'James Robinson', handboekLink: 'https://x/h', gegevenslink: null }
  const m = contractMail(c)
  assert.equal(m.onderwerp, 'Je contract bij James Robinson')
  assert.match(m.tekst, /met ingang van 13 oktober 2026/)
  assert.match(m.tekst, /https:\/\/x\/h/)
  assert.doesNotMatch(m.tekst, /persoonlijke link/, 'zonder invullink geen alinea erover')
  for (const mail of [m, welkomMail(c), gegevensMail(c)]) assert.doesNotMatch(mail.tekst + mail.onderwerp, /\{\{|\}\}|ONBEKEND/)
  const eigen = new Map([['mail_contract', { subject: 'Contract {{roepnaam}}', body: 'Hoi {{roepnaam}}' }]])
  assert.deepEqual([contractMail(c, eigen).onderwerp, contractMail(c, eigen).tekst], ['Contract Daan', 'Hoi Daan'])
})

test('voorwaarden mogen in elkaar staan', async () => {
  const { pasVoorwaardenToe } = await import('../invullen')
  const bron = 'A{{#als x}} B{{#als y}} C{{/als}}{{#alsniet y}} D{{/alsniet}}{{/als}}'
  assert.equal(pasVoorwaardenToe(bron, { x: true, y: true }).tekst, 'A B C')
  assert.equal(pasVoorwaardenToe(bron, { x: true, y: false }).tekst, 'A B D')
  assert.equal(pasVoorwaardenToe(bron, { x: false, y: true }).tekst, 'A')
  assert.deepEqual(controleerTekst(bron, { plaatshouders: {}, voorwaarden: { x: '', y: '' } }), [])
})
