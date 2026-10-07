/**
 * De briefing in één keer opslaan, en opmerkingenvelden als losse punten.
 *
 * Wat hier vastligt: alles wat je in het scherm wijzigt, gaat in één keer
 * de database in; regels die blijven houden hun id (en de tijdlijn zijn
 * koppeling met ClickUp); de tijdlijn staat daarna op datum; een fout noemt
 * de regel en laat de briefing ongemoeid; en opslaan overschrijft niet
 * stilletjes feedback die intussen is verwerkt.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, campaigns, campaignKpis, campaignTimeline, campaignVerwerkingen } from '../../db/schema'
import { getCampagne } from '../campagnes'
import { leesPunten, schrijfPunten, groepeerPunten } from '../punten'
import { conceptVan, inhoudVan, leesConcept, sorteerTijdlijn, ConceptFout, type BriefingConcept } from '../briefing-concept'
import { slaConceptOp } from '../briefing-opslaan'

/* ------------------------------ Punten ---------------------------------- */

test('punten: platte tekst wordt losse punten, met subpunten onder het punt erboven', () => {
  const tekst = 'Kerstbrunch, € 47,50\n\nKerstdiner all-in, € 115\n- Voorgerecht: paling\n- Hoofdgerecht: hert\nOp kerstavond geen aanbod.'
  const p = leesPunten(tekst)
  assert.deepEqual(
    p.map((x) => [x.tekst, x.sub]),
    [
      ['Kerstbrunch, € 47,50', false],
      ['Kerstdiner all-in, € 115', false],
      ['Voorgerecht: paling', true],
      ['Hoofdgerecht: hert', true],
      ['Op kerstavond geen aanbod.', false],
    ],
  )
  assert.deepEqual(groepeerPunten(p)[1], { tekst: 'Kerstdiner all-in, € 115', sub: ['Voorgerecht: paling', 'Hoofdgerecht: hert'] })
  // Heen en terug verandert niets aan de inhoud.
  assert.deepEqual(leesPunten(schrijfPunten(p)), p)
})

test('punten: overal een streepje ervoor zijn gewone punten, geen subpunten', () => {
  assert.deepEqual(
    leesPunten('- een\r\n- twee\r\n• drie').map((x) => x.sub),
    [false, false, false],
  )
  assert.equal(schrijfPunten([{ tekst: '  ', sub: false }]), null)
  // Een subpunt bovenaan heeft geen hoofdpunt en wordt een gewoon punt.
  assert.equal(schrijfPunten([{ tekst: 'los', sub: true }, { tekst: 'onder', sub: true }]), 'los\n- onder')
})

/* ------------------------------ Concept --------------------------------- */

function leegConcept(): BriefingConcept {
  return {
    title: 'Kerst',
    marketingManagerId: '',
    specialistIds: [],
    contactIds: [],
    summary: '',
    goalSentence: '',
    resultDefinition: '',
    offerMessage: '',
    region: '',
    budgetMode: 'berekend',
    fixedBudget: '',
    startOn: '',
    endOn: '',
    voorstel: [],
    lijsten: {
      kpiNotes: [],
      budgetNote: [],
      offerWhat: [],
      offerWhyNow: [],
      offerNotPromised: [],
      exclusions: [],
      audienceNotes: [],
      planningNotes: [],
      clientDoes: [],
      agreementNotes: [],
      backgroundPrevious: [],
      backgroundRisks: [],
      assumptionNotes: [],
    },
    aannames: { cpm: '', ctr: '', conversion: '', units: '1', adsShare: '', buffer: '20', sourceCpm: '', sourceClickThrough: '', sourceConversion: '', sourceUnits: '' },
    kpis: [],
    deliverables: [],
    tijdlijn: [],
  }
}

test('concept: de tijdlijn staat op datum, regels zonder datum onderaan', () => {
  const r = sorteerTijdlijn([
    { dueOn: '', description: 'Ooit' },
    { dueOn: '2026-11-05', description: 'Ad 6 klaar' },
    { dueOn: '2026-10-09', description: 'Akkoord' },
    { dueOn: '2026-10-09', description: 'Aftrap' },
  ])
  assert.deepEqual(
    r.map((x) => x.description),
    ['Aftrap', 'Akkoord', 'Ad 6 klaar', 'Ooit'],
  )
})

test('concept: een fout noemt de regel waar het misgaat', () => {
  const c = leegConcept()
  c.kpis = [{ sleutel: 'a', id: null, label: 'Kerstdiner', on: '', targetQuantity: 'zestig', price: '115' }]
  assert.throws(() => leesConcept(c), (e: unknown) => e instanceof ConceptFout && /KPI 1 \(Kerstdiner\)/.test(e.message))

  const d = leegConcept()
  d.deliverables = [{ sleutel: 'b', id: null, name: 'Ad 1', kind: '', note: '', quantity: '', liveFrom: '', liveUntil: '', status: 'maken' }]
  assert.throws(() => leesConcept(d), /Deliverable 1 \(Ad 1\): kies het kanaal/)

  const e = leegConcept()
  e.startOn = '2026-12-01'
  e.endOn = '2026-10-01'
  assert.throws(() => leesConcept(e), /einddatum ligt vóór de start/)

  // Een lege regel telt niet mee en geeft geen fout.
  const f = leegConcept()
  f.kpis = [{ sleutel: 'c', id: null, label: '', on: '', targetQuantity: '', price: '' }]
  f.tijdlijn = [{ sleutel: 'd', id: null, dueOn: '', description: '  ', assignee: '' }]
  const g = leesConcept(f)
  assert.equal(g.kpis.length, 0)
  assert.equal(g.tijdlijn.length, 0)
})

test('concept: sleutels en lege regels tellen niet als wijziging', () => {
  const a = leegConcept()
  a.lijsten.clientDoes = [{ sleutel: 'x', tekst: 'Elke maandag de stand', sub: false }]
  const b = structuredClone(a)
  b.lijsten.clientDoes = [
    { sleutel: 'y', tekst: 'Elke maandag de stand ', sub: false },
    { sleutel: 'z', tekst: '', sub: false },
  ]
  assert.equal(inhoudVan(a), inhoudVan(b))
  b.lijsten.clientDoes.push({ sleutel: 'q', tekst: 'Flyer laten drukken', sub: false })
  assert.notEqual(inhoudVan(a), inhoudVan(b))
})

/* ------------------------------ Opslaan --------------------------------- */

const suffix = Date.now()
let orgId: string
let userId: string
let campaignId: string
let tijdlijnId: string

before(async () => {
  const [org] = await db.insert(organizations).values({ slug: `bo-${suffix}`, name: `Opslaan BV ${suffix}` }).returning()
  orgId = org!.id
  const [user] = await db.insert(users).values({ email: `bo-${suffix}@test.nl`, name: `Bram ${suffix}`, role: 'staff' }).returning()
  userId = user!.id
  const [c] = await db
    .insert(campaigns)
    .values({
      organizationId: orgId,
      title: 'Kerst bij de test',
      planningNotes: 'Akkoord uiterlijk vrijdag.\r\nStart op 15 oktober.',
      startOn: new Date('2026-10-07T12:00:00'),
      endOn: new Date('2026-12-17T12:00:00'),
    })
    .returning()
  campaignId = c!.id
  await db.insert(campaignKpis).values({ campaignId, position: 0, label: 'Kerstdiner', targetQuantity: 60, priceCents: 11500 })
  const [t] = await db
    .insert(campaignTimeline)
    .values({ campaignId, dueOn: new Date('2026-10-09T12:00:00'), description: 'Briefing akkoord', clickupTaskId: 'cu-123' })
    .returning()
  tijdlijnId = t!.id
  await db.insert(campaignTimeline).values({ campaignId, dueOn: new Date('2026-10-12T12:00:00'), description: 'Doelgroepen klaar' })
})

after(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(eq(users.id, userId))
  await client.end()
})

test('opslaan: alles in één keer, regels houden hun id, de tijdlijn op datum', async () => {
  const v = await getCampagne(campaignId)
  const c = conceptVan(v!)
  assert.deepEqual(
    c.lijsten.planningNotes.map((p) => p.tekst),
    ['Akkoord uiterlijk vrijdag.', 'Start op 15 oktober.'],
  )

  // Wat iemand in het scherm doet: een planningspunt erbij, de akkoorddatum naar later, een KPI en een regel erbij.
  c.lijsten.planningNotes.push({ sleutel: 'n-1', tekst: 'Per moment stoppen zodra het vol is.', sub: false })
  c.lijsten.clientDoes = [{ sleutel: 'n-2', tekst: 'Elke maandag de stand uit Odoo', sub: false }]
  c.tijdlijn = c.tijdlijn.map((t) => (t.id === tijdlijnId ? { ...t, dueOn: '2026-10-20' } : t))
  c.tijdlijn.push({ sleutel: 'n-3', id: null, dueOn: '2026-10-15', description: 'Live', assignee: 'label:Campagne' })
  c.kpis.push({ sleutel: 'n-4', id: null, label: 'Kerstbrunch', on: '2026-12-25', targetQuantity: '60', price: '47,50' })

  const uit = await slaConceptOp(campaignId, c, new Date().toISOString())
  assert.ok(uit.ids['n-3'] && uit.ids['n-4'], 'nieuwe regels krijgen een id terug')

  const na = await getCampagne(campaignId)
  assert.equal(na!.campagne.planningNotes, 'Akkoord uiterlijk vrijdag.\nStart op 15 oktober.\nPer moment stoppen zodra het vol is.')
  assert.equal(na!.campagne.clientDoes, 'Elke maandag de stand uit Odoo')
  assert.deepEqual(
    na!.tijdlijn.map((t) => t.description),
    ['Doelgroepen klaar', 'Live', 'Briefing akkoord'],
  )
  const akkoord = na!.tijdlijn.find((t) => t.id === tijdlijnId)
  assert.equal(akkoord?.clickupTaskId, 'cu-123', 'de regel houdt zijn koppeling met ClickUp')
  assert.deepEqual(
    na!.kpis.map((k) => [k.label, k.priceCents]),
    [
      ['Kerstdiner', 11500],
      ['Kerstbrunch', 4750],
    ],
  )
  assert.equal(na!.omzetCents, 60 * 11500 + 60 * 4750)

  // Opnieuw laden geeft hetzelfde concept: niets staat nog open.
  const terug = conceptVan(na!)
  const metIds = {
    ...c,
    kpis: c.kpis.map((k) => (k.id ? k : { ...k, id: uit.ids[k.sleutel]! })),
    tijdlijn: c.tijdlijn.map((t) => (t.id ? t : { ...t, id: uit.ids[t.sleutel]! })),
  }
  assert.equal(inhoudVan(terug), inhoudVan(metIds))
})

test('opslaan: een regel weghalen haalt hem weg; een fout laat alles staan', async () => {
  const v = await getCampagne(campaignId)
  const c = conceptVan(v!)
  c.tijdlijn = c.tijdlijn.filter((t) => t.description !== 'Live')
  await slaConceptOp(campaignId, c, new Date().toISOString())
  const na = await getCampagne(campaignId)
  assert.equal(na!.tijdlijn.length, 2)

  const fout = conceptVan(na!)
  fout.title = 'Andere naam'
  fout.kpis[0]!.targetQuantity = '0'
  await assert.rejects(slaConceptOp(campaignId, fout, new Date().toISOString()), /KPI 1/)
  const ongemoeid = await getCampagne(campaignId)
  assert.equal(ongemoeid!.campagne.title, 'Kerst bij de test')

  await assert.rejects(slaConceptOp(campaignId, { title: 42 }, new Date().toISOString()), /kwam niet goed door/)
})

test('opslaan: feedback die intussen is verwerkt, wordt niet stilletjes overschreven', async () => {
  const geladen = new Date(Date.now() - 60_000).toISOString()
  await db.insert(campaignVerwerkingen).values({
    campaignId,
    status: 'klaar',
    invoer: 'Kerstavond doen we niet.',
    klaarOp: new Date(),
  })
  const c = conceptVan((await getCampagne(campaignId))!)
  await assert.rejects(slaConceptOp(campaignId, c, geladen), /feedback in de briefing verwerkt/)
  // Wie na de verwerking laadde, kan gewoon opslaan.
  await slaConceptOp(campaignId, c, new Date(Date.now() + 1000).toISOString())
})
