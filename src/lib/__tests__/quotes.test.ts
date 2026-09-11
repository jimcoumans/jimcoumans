/**
 * Tests voor offertes. Het hoofdgeval is de doorzetopdracht: een aanvraag
 * voor een training die een partner uitvoert, met onze marge en uren erbovenop.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { and, eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, partners, services, quotes, quoteLines, contacts } from '../../db/schema'
import {
  createQuote, addQuoteLine, deleteQuoteLine, setQuoteStatus,
  getQuote, listQuotes, nextQuoteNumber, quoteTotals, lineTotals,
  getPartnerFigures, getQuoteFigures, isEditable, QuoteError,
} from '../quotes'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let orgId: string
let trainerId: string
let fotograafId: string
let dienstId: string
let offerteId: string
/**
 * getQuoteFigures kijkt naar ALLE offertes, ook die van de seed of van een
 * rondje klikken in de browser. Daarom leggen we vooraf vast wat er al stond
 * en toetsen we daarna het verschil; anders slaagt deze test alleen op een
 * lege database.
 */
let basis: Awaited<ReturnType<typeof getQuoteFigures>>

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `off-${suffix}`, name: `Offerte Klant ${suffix}` })
    .returning()
  orgId = org!.id

  const [trainer] = await db
    .insert(partners)
    .values({ name: `Trainingsbureau ${suffix}`, type: 'other', hourlyRateCents: 12_000 })
    .returning()
  trainerId = trainer!.id

  const [foto] = await db
    .insert(partners)
    .values({ name: `Fotograaf ${suffix}`, type: 'photographer', hourlyRateCents: 9_500 })
    .returning()
  fotograafId = foto!.id

  const [dienst] = await db
    .insert(services)
    .values({ name: `Projectbegeleiding ${suffix}`, unit: 'hour', unitPriceCents: 12_500, costPriceCents: 6_000 })
    .returning()
  dienstId = dienst!.id

  basis = await getQuoteFigures()
})

after(async () => {
  await db.delete(quotes).where(eq(quotes.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(partners).where(inArray(partners.id, [trainerId, fotograafId]))
  await db.delete(services).where(eq(services.id, dienstId))
  await client.end()
})

/* ------------------------------- Rekenwerk ------------------------------ */

test('een regel rekent aantal maal tarief, met marge', () => {
  const t = lineTotals({ quantityHundredths: 300, unitPriceCents: 12_500, unitCostCents: 6_000 })

  assert.equal(t.revenueCents, 37_500, '3 uur van 125 euro')
  assert.equal(t.costCents, 18_000, '3 uur van 60 euro kostprijs')
  assert.equal(t.marginCents, 19_500)
  assert.equal(t.marginPercent, 52)
  assert.equal(t.hasCost, true)
})

test('een regel zonder kostprijs meldt dat de marge niet compleet is', () => {
  const t = lineTotals({ quantityHundredths: 100, unitPriceCents: 50_000, unitCostCents: null })
  assert.equal(t.costCents, 0)
  assert.equal(t.hasCost, false, 'zodat de offerte kan waarschuwen')
})

test('een kortingsregel is negatief en verlaagt het totaal', () => {
  const t = lineTotals({ quantityHundredths: 100, unitPriceCents: -25_000, unitCostCents: null })
  assert.equal(t.revenueCents, -25_000)
})

test('gebroken aantallen kloppen tot op de cent', () => {
  const t = lineTotals({ quantityHundredths: 150, unitPriceCents: 12_500, unitCostCents: 6_000 })
  assert.equal(t.revenueCents, 18_750, '1,5 uur van 125 euro')
  assert.equal(t.costCents, 9_000)
})

/* ------------------------ De doorzetopdracht ---------------------------- */

test('een offerte wordt aangemaakt met een oplopend nummer', async () => {
  const nummer = await nextQuoteNumber()
  assert.match(nummer, /^OFF-\d{4}-\d{3}$/)

  const q = await createQuote({
    organizationId: orgId,
    title: 'Training klantgericht werken',
    introText: 'Naar aanleiding van je vraag over een training voor het team.',
  })
  offerteId = q.id

  assert.equal(q.status, 'draft')
  assert.equal(q.number, nummer)
  assert.equal(q.vatRatePercent, 21)
})

test('de partner voert het werk uit: hun offerte is onze kostprijs', async () => {
  // Het trainingsbureau offreert ons 1.800 euro voor twee dagdelen.
  // Wij rekenen de klant 2.400 euro.
  await addQuoteLine({
    quoteId: offerteId,
    kind: 'partner',
    partnerId: trainerId,
    description: 'Training klantgericht werken, twee dagdelen',
    detail: 'Uitgevoerd door een trainer met horeca-ervaring.',
    quantityHundredths: 100,
    unitPriceCents: 240_000,
    unitCostCents: 180_000,
  })

  const detail = await getQuote(offerteId)
  const regel = detail!.lines[0]!

  assert.equal(regel.kind, 'partner')
  assert.equal(regel.partnerName, `Trainingsbureau ${suffix}`)
  assert.equal(regel.totals.revenueCents, 240_000)
  assert.equal(regel.totals.costCents, 180_000)
  assert.equal(regel.totals.marginCents, 60_000, 'onze marge op de doorzet')
  assert.equal(regel.totals.marginPercent, 25)
})

test('onze eigen uren komen er als aparte regel bovenop', async () => {
  await addQuoteLine({
    quoteId: offerteId,
    kind: 'service',
    serviceId: dienstId,
    description: 'Projectbegeleiding en afstemming',
    quantityHundredths: 400, // 4 uur
    unitPriceCents: 12_500,
    unitCostCents: 6_000,
  })

  const detail = await getQuote(offerteId)

  assert.equal(detail!.lines.length, 2)
  assert.equal(detail!.totals.subtotalCents, 240_000 + 50_000, 'training plus 4 uur begeleiding')
  assert.equal(detail!.totals.costCents, 180_000 + 24_000)
  assert.equal(detail!.totals.marginCents, 86_000, 'marge op de doorzet plus op onze uren')
  assert.equal(detail!.totals.partnerCostCents, 180_000, 'wat er naar de partner gaat')
  assert.equal(detail!.totals.costComplete, true)
})

test('het btw-bedrag volgt uit het subtotaal', async () => {
  const detail = await getQuote(offerteId)
  assert.equal(detail!.totals.vatCents, Math.round(290_000 * 0.21))
  assert.equal(detail!.totals.totalCents, 290_000 + detail!.totals.vatCents)
})

test('een regel zonder kostprijs maakt de marge onbetrouwbaar en dat wordt gemeld', async () => {
  const regel = await addQuoteLine({
    quoteId: offerteId,
    kind: 'custom',
    description: 'Zaalhuur',
    quantityHundredths: 100,
    unitPriceCents: 45_000,
  })

  const detail = await getQuote(offerteId)
  assert.equal(detail!.totals.costComplete, false, 'zodat de offerte kan waarschuwen')

  await deleteQuoteLine(regel.id)
  assert.equal((await getQuote(offerteId))!.totals.costComplete, true)
})

/* ------------------------------- Statusflow ----------------------------- */

test('een concept mag gewijzigd worden, een verstuurde offerte niet', async () => {
  assert.equal(isEditable({ status: 'draft' }), true)
  assert.equal(isEditable({ status: 'awaiting_partner' }), true)
  assert.equal(isEditable({ status: 'sent' }), false)
  assert.equal(isEditable({ status: 'accepted' }), false)
})

test('een offerte zonder regels versturen wordt geweigerd', async () => {
  const leeg = await createQuote({ organizationId: orgId, title: 'Leeg voorstel' })
  await assert.rejects(() => setQuoteStatus(leeg.id, 'sent'), QuoteError)
})

test('wachten op de partner is een eigen status', async () => {
  // Precies het geval uit de praktijk: de aanvraag is binnen, de partner
  // moet nog offreren.
  const q = await createQuote({ organizationId: orgId, title: 'Wacht op trainer' })
  await setQuoteStatus(q.id, 'awaiting_partner')

  const na = await getQuote(q.id)
  assert.equal(na!.quote.status, 'awaiting_partner')
  assert.equal(isEditable(na!.quote), true, 'je kunt er nog aan werken')
})

test('versturen legt het moment vast', async () => {
  await setQuoteStatus(offerteId, 'sent')
  const detail = await getQuote(offerteId)

  assert.equal(detail!.quote.status, 'sent')
  assert.ok(detail!.quote.sentAt instanceof Date)
})

test('een verstuurde offerte kan niet meer gewijzigd worden', async () => {
  await assert.rejects(
    () =>
      addQuoteLine({
        quoteId: offerteId,
        kind: 'custom',
        description: 'Er stiekem bij',
        quantityHundredths: 100,
        unitPriceCents: 10_000,
      }),
    /ligt al bij de klant/,
  )
})

test('akkoord van de klant maakt er een opdracht van', async () => {
  await setQuoteStatus(offerteId, 'accepted')
  const detail = await getQuote(offerteId)

  assert.equal(detail!.quote.status, 'accepted')
  assert.ok(detail!.quote.decidedAt instanceof Date)
})

test('een geaccepteerde offerte kan niet meer van status veranderen', async () => {
  // Een gewijzigde afspraak is een nieuwe offerte, geen statuswijziging.
  await assert.rejects(() => setQuoteStatus(offerteId, 'declined'), /nieuwe offerte/)
  await assert.rejects(() => setQuoteStatus(offerteId, 'draft'), /nieuwe offerte/)
})

test('een afwijzing bewaart de reden', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Voorstel dat afvalt' })
  await addQuoteLine({
    quoteId: q.id, kind: 'custom', description: 'Iets',
    quantityHundredths: 100, unitPriceCents: 50_000, unitCostCents: 20_000,
  })
  await setQuoteStatus(q.id, 'sent')
  await setQuoteStatus(q.id, 'declined', { declineReason: 'Te duur, gaan zelf iets doen.' })

  const na = await getQuote(q.id)
  assert.equal(na!.quote.status, 'declined')
  assert.equal(na!.quote.declineReason, 'Te duur, gaan zelf iets doen.')
})

/* ---------------------------- Partnercijfers ---------------------------- */

test('per partner is te zien wat er via ons is verdiend', async () => {
  const cijfers = await getPartnerFigures()
  const trainer = cijfers.find((c) => c.partnerId === trainerId)!

  assert.equal(trainer.acceptedCount, 1, 'één opdracht')
  assert.equal(trainer.revenueCents, 240_000, 'wat wij de klant rekenden')
  assert.equal(trainer.partnerCostCents, 180_000, 'wat de partner via ons kreeg')
  assert.equal(trainer.marginCents, 60_000, 'onze winst op deze partner')
  assert.equal(trainer.marginPercent, 25)
})

test('alleen geaccepteerde offertes tellen als omzet', async () => {
  // Een voorstel dat nog niet door is, is geen geld.
  const q = await createQuote({ organizationId: orgId, title: 'Nog open voorstel' })
  await addQuoteLine({
    quoteId: q.id, kind: 'partner', partnerId: trainerId,
    description: 'Tweede training', quantityHundredths: 100,
    unitPriceCents: 300_000, unitCostCents: 200_000,
  })
  await setQuoteStatus(q.id, 'sent')

  const cijfers = await getPartnerFigures()
  const trainer = cijfers.find((c) => c.partnerId === trainerId)!

  assert.equal(trainer.revenueCents, 240_000, 'het open voorstel telt niet mee')
  assert.equal(trainer.quoteCount, 2, 'maar wordt wel geteld als offerte')
  assert.equal(trainer.acceptedCount, 1)
  assert.equal(trainer.openCount, 1)
})

test('met includeAllStatuses zie je wat er in de pijplijn zit', async () => {
  const cijfers = await getPartnerFigures({ includeAllStatuses: true })
  const trainer = cijfers.find((c) => c.partnerId === trainerId)!

  assert.equal(trainer.revenueCents, 540_000, 'akkoord plus open')
  assert.equal(trainer.partnerCostCents, 380_000)
})

test('een partner zonder offertes staat niet in de cijfers', async () => {
  const cijfers = await getPartnerFigures()
  assert.ok(
    !cijfers.some((c) => c.partnerId === fotograafId),
    'de fotograaf heeft geen offerteregels',
  )
})

test('de kerncijfers tellen offertes, waarde en scoringskans', async () => {
  const f = await getQuoteFigures()

  assert.ok(f.totalCount - basis.totalCount >= 4)
  assert.equal(f.acceptedCount - basis.acceptedCount, 1)
  assert.equal(f.acceptedValueCents - basis.acceptedValueCents, 290_000)
  assert.equal(f.acceptedMarginCents - basis.acceptedMarginCents, 86_000)

  // De scoringskans deelt door wat BESLIST is, niet door alles wat er ligt.
  // Dat is het hele punt van het cijfer, dus dat rekenen we hier los na.
  const alle = await listQuotes()
  const akkoord = alle.filter((q) => q.status === 'accepted').length
  const beslist = alle.filter((q) => q.status === 'accepted' || q.status === 'declined').length
  assert.ok(beslist > 0, 'er is minstens iets beslist')
  assert.ok(beslist < alle.length, 'en er ligt ook nog iets open, anders toetst dit niets')
  assert.equal(f.winRatePercent, Math.round((akkoord / beslist) * 100))
})

test('een offerte die door korting op nul uitkomt gaat niet de deur uit', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Alleen korting' })
  await addQuoteLine({
    quoteId: q.id, kind: 'custom', description: 'Advies',
    quantityHundredths: 100, unitPriceCents: 50_000, unitCostCents: 20_000,
  })
  await addQuoteLine({
    quoteId: q.id, kind: 'discount', description: 'Te ruime korting',
    quantityHundredths: 100, unitPriceCents: -50_000,
  })

  await assert.rejects(
    () => setQuoteStatus(q.id, 'sent'),
    (fout: Error) => fout instanceof QuoteError && /nul of lager/.test(fout.message),
    'nul euro is geen voorstel',
  )

  // Met een kleinere korting mag het wel.
  await db
    .update(quoteLines)
    .set({ unitPriceCents: -10_000 })
    .where(and(eq(quoteLines.quoteId, q.id), eq(quoteLines.kind, 'discount')))

  await setQuoteStatus(q.id, 'sent')
  const na = await getQuote(q.id)
  assert.equal(na!.quote.status, 'sent')
  assert.equal(na!.totals.subtotalCents, 40_000)
})

/* ------------------------------ Constraints ----------------------------- */

test('de database weigert een partnerregel zonder partner', async () => {
  // Zonder partner valt de regel buiten de partnerrapportage.
  await assertViolatesConstraint(
    () =>
      db.insert(quoteLines).values({
        quoteId: offerteId, kind: 'partner',
        description: 'Partnerwerk zonder partner',
        quantityHundredths: 100, unitPriceCents: 10_000,
      }),
    'partner_line_needs_partner',
  )
})

test('de database weigert een aantal van nul', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(quoteLines).values({
        quoteId: offerteId, kind: 'custom', description: 'Nul stuks',
        quantityHundredths: 0, unitPriceCents: 10_000,
      }),
    'quote_line_quantity_positive',
  )
})

test('de database weigert een gewone regel met een negatief bedrag', async () => {
  // Negatief hoort bij een kortingsregel; anders is het een typefout.
  await assertViolatesConstraint(
    () =>
      db.insert(quoteLines).values({
        quoteId: offerteId, kind: 'custom', description: 'Negatief',
        quantityHundredths: 100, unitPriceCents: -5_000,
      }),
    'quote_line_price_sign',
  )
})

test('een offertenummer kan niet twee keer bestaan', async () => {
  const bestaand = await getQuote(offerteId)
  await assertViolatesConstraint(
    () =>
      db.insert(quotes).values({
        organizationId: orgId, number: bestaand!.quote.number, title: 'Dubbel nummer',
      }),
    'quotes_number_idx',
  )
})

test('een klant met offertes kan niet verwijderd worden', async () => {
  await assertViolatesConstraint(
    () => db.delete(organizations).where(eq(organizations.id, orgId)),
    'quotes_organization_id_organizations_id_fk',
  )
})

test('een partner met offerteregels kan niet verwijderd worden', async () => {
  // Anders is niet meer te zien wie het werk heeft uitgevoerd.
  await assertViolatesConstraint(
    () => db.delete(partners).where(eq(partners.id, trainerId)),
    'quote_lines_partner_id_partners_id_fk',
  )
})

test('regels verdwijnen met de offerte mee', async () => {
  const q = await createQuote({ organizationId: orgId, title: 'Tijdelijk' })
  await addQuoteLine({
    quoteId: q.id, kind: 'custom', description: 'Regel',
    quantityHundredths: 100, unitPriceCents: 10_000,
  })

  await db.delete(quotes).where(eq(quotes.id, q.id))
  const over = await db.select().from(quoteLines).where(eq(quoteLines.quoteId, q.id))
  assert.deepEqual(over, [])
})
