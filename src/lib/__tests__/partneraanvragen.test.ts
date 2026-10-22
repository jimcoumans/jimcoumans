/**
 * Partneraanvragen: van vraag naar voorstel.
 *
 * Wat hier vastligt: alleen partners met het gevraagde specialisme doen
 * mee; de prijs komt uit het goedkoopste geldige pakket, met de omvang van
 * de aanvraag; de match legt elke punt uit en leert van eerdere opdrachten;
 * een partner antwoordt alleen met de juiste link; ons werk staat per regel
 * aan of uit; en het voorstel zet het werk van de partner één-op-één op de
 * offerte, zonder opslag.
 *
 * Er gaat geen mail weg: zonder mailsleutel legt het portaal vast dat het
 * mailen niet lukte, en dat is precies wat we hier ook willen zien.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, partners, partnerPakketten, partnerUitvragen, partnerAanvraagWerk, quoteLines, quotes, users } from '../../db/schema'
import type { PartnerPakket } from '../../db/schema'
import {
  berekenMatch,
  beantwoord,
  bevestig,
  beoordeel,
  factorVoor,
  getAanvraag,
  kiesPakket,
  maakAanvraag,
  maakVoorstel,
  onsWerkCents,
  uitvraagMail,
  uitvraagToken,
  uitvraagViaLink,
  vergelijk,
  verstuurUitvragen,
  zetWerk,
  AanvraagError,
} from '../partneraanvragen'

const suffix = Date.now()
const VANDAAG = '2026-10-22'
let orgId: string
let userId: string
let user: { id: string; name: string | null; email: string }
let lensId: string
let beeldId: string
let fotoId: string
let pakketLens: string
let pakketBeeldAnder: string
const quoteIds: string[] = []
let oudeMailSleutel: string | undefined

function pakket(extra: Partial<PartnerPakket>): PartnerPakket {
  return {
    id: 'p',
    partnerId: 'x',
    specialisme: 'Video',
    naam: 'Pakket',
    omschrijving: null,
    prijsCents: 10000,
    eenheid: 'opdracht',
    geldigTot: null,
    actief: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  }
}

before(async () => {
  oudeMailSleutel = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  const [org] = await db.insert(organizations).values({ slug: `pa-${suffix}`, name: `Makelaar ${suffix}`, industry: 'Makelaardij', city: 'Valkenburg' }).returning()
  orgId = org!.id
  const [u] = await db.insert(users).values({ email: `pa-${suffix}@test.nl`, name: `Stan ${suffix}`, role: 'staff' }).returning()
  userId = u!.id
  user = { id: userId, name: u!.name, email: u!.email }
  const [lens] = await db
    .insert(partners)
    .values({ name: `Studio Lens ${suffix}`, type: 'videographer', email: `lens-${suffix}@test.nl`, specialismen: ['Video', 'Drone'], branches: ['Makelaardij'] })
    .returning()
  lensId = lens!.id
  const [beeld] = await db.insert(partners).values({ name: `Beeldwerk ${suffix}`, type: 'videographer', specialismen: ['Video'] }).returning()
  beeldId = beeld!.id
  const [foto] = await db.insert(partners).values({ name: `Fotostudio ${suffix}`, type: 'photographer', specialismen: ['Fotografie'] }).returning()
  fotoId = foto!.id
  const pakketten = await db
    .insert(partnerPakketten)
    .values([
      { partnerId: lensId, specialisme: 'Video', naam: 'Woningvideo', prijsCents: 95000, eenheid: 'opdracht' },
      { partnerId: beeldId, specialisme: 'Video', naam: 'Dagdeel filmen', prijsCents: 30000, eenheid: 'dagdeel' },
      { partnerId: beeldId, specialisme: 'Video', naam: 'Montage per video', prijsCents: 25000, eenheid: 'stuk' },
      { partnerId: fotoId, specialisme: 'Fotografie', naam: 'Woningfoto’s', prijsCents: 40000, eenheid: 'opdracht' },
    ])
    .returning()
  pakketLens = pakketten[0]!.id
  pakketBeeldAnder = pakketten[2]!.id
})

after(async () => {
  for (const id of quoteIds) await db.delete(quotes).where(eq(quotes.id, id))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  for (const id of [lensId, beeldId, fotoId]) await db.delete(partners).where(eq(partners.id, id))
  await db.delete(users).where(eq(users.id, userId))
  if (oudeMailSleutel !== undefined) process.env.RESEND_API_KEY = oudeMailSleutel
  await client.end()
})

/* ------------------------------ Zonder database --------------------------- */

test('de omvang telt mee per eenheid, en een aanname staat erbij', () => {
  assert.equal(factorVoor('opdracht', { dagdelen: 3, stuks: 2 }).factor, 1)
  assert.equal(factorVoor('dagdeel', { dagdelen: 3, stuks: null }).factor, 3)
  assert.equal(factorVoor('dag', { dagdelen: 4, stuks: null }).factor, 2)
  assert.equal(factorVoor('uur', { dagdelen: 1, stuks: null }).factor, 4)
  assert.equal(factorVoor('stuk', { dagdelen: null, stuks: 5 }).factor, 5)
  const onbekend = factorVoor('dagdeel', { dagdelen: null, stuks: null })
  assert.equal(onbekend.factor, 1)
  assert.equal(onbekend.aanname, true)
})

test('het goedkoopste geldige pakket wint; verlopen alleen als er niets anders is', () => {
  const a = { specialisme: 'Video', dagdelen: 2, stuks: null }
  const goedkoopVerlopen = pakket({ id: 'oud', prijsCents: 10000, geldigTot: '2026-01-01' })
  const duurGeldig = pakket({ id: 'nu', prijsCents: 20000 })
  assert.equal(kiesPakket([goedkoopVerlopen, duurGeldig], a, VANDAAG)?.pakket.id, 'nu')
  const alleenOud = kiesPakket([goedkoopVerlopen], a, VANDAAG)
  assert.equal(alleenOud?.verlopen, true)
  assert.equal(kiesPakket([pakket({ specialisme: 'Fotografie' })], a, VANDAAG), null, 'een ander specialisme telt niet')
  assert.equal(kiesPakket([pakket({ actief: false })], a, VANDAAG), null, 'een uitgezet pakket telt niet')
  const perDagdeel = kiesPakket([pakket({ prijsCents: 30000, eenheid: 'dagdeel' })], a, VANDAAG)
  assert.equal(perDagdeel?.cents, 60000)
})

test('de match legt elke punt uit', () => {
  const geen = { brancheOpdrachten: 0, klantOpdrachten: 0, vasteRol: null, beoordelingen: [] }
  const a = { branche: 'Makelaardij', specialisme: 'Video' }
  const nieuw = berekenMatch({ branches: [] }, a, null, geen)
  assert.equal(nieuw.score, 25, 'een nieuwe partner zonder prijs staat niet op nul')
  assert.match(nieuw.bezwaren.join(), /Geen prijsafspraak/)

  const sterk = berekenMatch({ branches: ['makelaardij'] }, a, { verlopen: false, pakket: pakket({}) }, { brancheOpdrachten: 4, klantOpdrachten: 0, vasteRol: 'Huisvideograaf', beoordelingen: [5, 5] })
  assert.equal(sterk.score, 100)
  assert.deepEqual(sterk.redenen.length, 5)
  assert.match(sterk.redenen.join(), /Huisvideograaf bij deze klant/)

  const slecht = berekenMatch({ branches: [] }, a, { verlopen: true, pakket: pakket({ geldigTot: '2026-01-01' }) }, { ...geen, beoordelingen: [1, 2] })
  assert.ok(slecht.score < 25)
  assert.match(slecht.bezwaren.join(), /verlopen/)
  assert.match(slecht.bezwaren.join(), /Beoordeling 1,5/)
})

test('ons werk telt alleen wat aan staat', () => {
  assert.equal(
    onsWerkCents([
      { aan: true, urenHonderdsten: 150, uurtariefCents: 10000 },
      { aan: false, urenHonderdsten: 200, uurtariefCents: 12500 },
    ]),
    15000,
  )
})

test('de mail noemt de pakketten en de link, en niet wat de klant betaalt', () => {
  const m = uitvraagMail({
    partner: { name: 'Studio Lens', contactName: 'Tom Lens' },
    aanvraag: { specialisme: 'Video', vraag: 'Woningvideo met drone', voorkeursdatum: '2026-11-14', datumToelichting: null, locatie: 'Valkenburg', dagdelen: 1, stuks: null } as never,
    klant: { name: 'Makelaar X', city: 'Valkenburg', website: null },
    pakketten: [pakket({ naam: 'Woningvideo', prijsCents: 95000 })],
    link: 'https://wallet.jamesrobinson.nl/uitvraag/x/y',
    afzender: 'Stan',
  })
  assert.match(m.tekst, /^Hoi Tom,/)
  assert.match(m.tekst, /Woningvideo: €\s950 per opdracht/)
  assert.match(m.tekst, /https:\/\/wallet\.jamesrobinson\.nl\/uitvraag\/x\/y/)
  assert.match(m.onderwerp, /video voor Makelaar X/)
})

/* ------------------------------ Met database ------------------------------ */

test('van aanvraag naar voorstel', async () => {
  const a = await maakAanvraag(
    { organizationId: orgId, titel: 'Woningvideo Hoofdstraat', specialisme: 'Video', vraag: 'Woningvideo met drone', branche: null, voorkeursdatum: '2026-11-14', datumToelichting: null, locatie: 'Valkenburg', dagdelen: 2, stuks: 1, notities: null },
    userId,
  )
  assert.equal(a.branche, 'Makelaardij', 'de branche komt van de klantkaart')

  const detail = await getAanvraag(a.id)
  const basisfee = detail!.werk.find((w) => w.naam.startsWith('Basisfee'))
  assert.equal(basisfee?.aan, true, 'de basisfee staat standaard aan')
  assert.ok(detail!.werk.some((w) => !w.aan), 'de rest staat standaard uit')

  // Alleen de partners uit deze test: in een gedeelde database staan er meer.
  const rijen = (await vergelijk(a.id, VANDAAG)).filter((r) => [lensId, beeldId, fotoId].includes(r.partner.id))
  assert.deepEqual(rijen.map((r) => r.partner.id), [lensId, beeldId], 'alleen videopartners, de beste match eerst')
  assert.equal(rijen[0]!.indicatie?.cents, 95000)
  assert.equal(rijen[1]!.indicatie?.cents, 25000, 'het goedkoopste pakket: één montage van 250 tegenover twee dagdelen van 300')
  assert.equal(rijen[0]!.klantprijsCents, 95000 + onsWerkCents(detail!.werk))

  const r = await verstuurUitvragen(a.id, [{ partnerId: lensId, pakketId: null }, { partnerId: beeldId, pakketId: pakketBeeldAnder }], user, VANDAAG)
  assert.equal(r.verstuurd, 0)
  assert.equal(r.mislukt.length, 2, 'zonder mailsleutel gaat er niets weg, en dat staat erbij')
  await assert.rejects(() => verstuurUitvragen(a.id, [{ partnerId: lensId, pakketId: null }], user, VANDAAG), /al uitgevraagd/)

  const [lens] = await db.select().from(partnerUitvragen).where(eq(partnerUitvragen.partnerId, lensId))
  assert.equal(lens!.pakketId, pakketLens)
  assert.ok(lens!.mailFout)

  // De partner antwoordt, maar alleen met de juiste link.
  await assert.rejects(() => beantwoord(lens!.id, 'fout-token', { beschikbaar: true, andereDatum: null, pakketId: pakketLens, prijsCents: null, opmerking: null }), AanvraagError)
  const token = uitvraagToken(lens!.id, lens!.linkVersie)
  await assert.rejects(() => beantwoord(lens!.id, token, { beschikbaar: true, andereDatum: null, pakketId: pakketBeeldAnder, prijsCents: null, opmerking: null }), /Kies een van de pakketten/)
  await beantwoord(lens!.id, token, { beschikbaar: true, andereDatum: null, pakketId: pakketLens, prijsCents: null, opmerking: 'Drone mag daar' })
  const zicht = await uitvraagViaLink(lens!.id, token)
  assert.equal(zicht?.status, 'beantwoord')
  assert.equal(await uitvraagViaLink(lens!.id, token, Date.now() + 30 * 86_400_000), null, 'na drie weken werkt de link niet meer')

  await assert.rejects(() => maakVoorstel(a.id, lens!.id, userId), /Bevestig eerst/)
  await assert.rejects(() => bevestig(lens!.id, null, userId), /Vul de prijs in/)
  await bevestig(lens!.id, 95000, userId)

  // Acquisitie voor eigen rekening: de basisfee uit.
  await zetWerk(
    a.id,
    detail!.werk.map((w) => ({ id: w.id, aan: false, urenHonderdsten: w.urenHonderdsten, uurtariefCents: w.uurtariefCents })),
  )
  const quoteId = await maakVoorstel(a.id, lens!.id, userId)
  quoteIds.push(quoteId)
  const regels = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId))
  assert.equal(regels.length, 1, 'alleen het werk van de partner, want ons werk staat uit')
  assert.equal(regels[0]!.kind, 'partner')
  assert.equal(regels[0]!.unitPriceCents, 95000)
  assert.equal(regels[0]!.unitCostCents, 95000, 'geen opslag: verkoop is inkoop')

  await assert.rejects(() => maakVoorstel(a.id, lens!.id, userId), /al een voorstel/)
  await beoordeel(lens!.id, 5, 'Mooi werk')
})

test('ons werk komt per regel op de offerte, en eerdere opdrachten tellen mee in de match', async () => {
  const a = await maakAanvraag(
    { organizationId: orgId, titel: 'Tweede woning', specialisme: 'Video', vraag: 'Woningvideo', branche: null, voorkeursdatum: null, datumToelichting: null, locatie: null, dagdelen: null, stuks: null, notities: null },
    userId,
  )
  const rijen = await vergelijk(a.id, VANDAAG)
  const lens = rijen.find((r) => r.partner.id === lensId)!
  assert.match(lens.match.redenen.join(), /1 opdracht in makelaardij/)
  assert.match(lens.match.redenen.join(), /Werkte al 1 keer voor deze klant/)
  assert.match(lens.match.redenen.join(), /Beoordeling 5,0/)

  await verstuurUitvragen(a.id, [{ partnerId: lensId, pakketId: null }], user, VANDAAG)
  const [u] = await db.select().from(partnerUitvragen).where(eq(partnerUitvragen.aanvraagId, a.id))
  await bevestig(u!.id, 90000, userId)
  const quoteId = await maakVoorstel(a.id, u!.id, userId)
  quoteIds.push(quoteId)
  const regels = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, quoteId))
  const werk = await db.select().from(partnerAanvraagWerk).where(eq(partnerAanvraagWerk.aanvraagId, a.id))
  assert.equal(regels.length, 1 + werk.filter((w) => w.aan).length)
  assert.ok(regels.some((r) => r.kind === 'custom' && r.description.startsWith('Basisfee')))
})
