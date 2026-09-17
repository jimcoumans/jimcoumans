/**
 * Tests voor de salespijplijn.
 *
 * Wat hier vastligt is niet de weergave maar het mechanisme: een open deal
 * zonder afgesproken vervolgstap loopt achter en moet als zodanig herkend
 * worden. Dat is de hele reden dat een pijplijn werkt in plaats van een
 * lijst met goede bedoelingen.
 *
 * En de regels die niet overtreden mogen worden: een verloren deal heeft een
 * reden, een gesloten deal heeft een sluitdatum, en retainers worden nooit
 * bij projecten opgeteld.
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, deals, pipelineStages, users } from '../../db/schema'
import {
  maakDeal,
  verplaatsDeal,
  zetVolgendeActie,
  winDeal,
  verliesDeal,
  heropenDeal,
  wisDeal,
  getBord,
  getScorekaart,
  listDeals,
  telAchterstand,
  PijplijnError,
} from '../pijplijn'

const merk = `pl${Date.now()}`
let prospectId: string
let klantId: string
let eersteFase: string
let tweedeFase: string
let collegaId: string
const gemaakteDeals: string[] = []

before(async () => {
  const fases = await db
    .select()
    .from(pipelineStages)
    .orderBy(pipelineStages.sortOrder)

  assert.ok(fases.length >= 2, 'de migratie hoort vijf fases te hebben neergezet')
  eersteFase = fases[0]!.id
  tweedeFase = fases[1]!.id

  const [prospect] = await db
    .insert(organizations)
    .values({ slug: `${merk}-prospect`, name: `${merk} Prospect BV`, status: 'prospect' })
    .returning()
  prospectId = prospect!.id

  const [klant] = await db
    .insert(organizations)
    .values({ slug: `${merk}-klant`, name: `${merk} Klant BV`, status: 'client' })
    .returning()
  klantId = klant!.id

  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}@jamesrobinson.nl`, name: 'Sanne de Wit', role: 'staff' })
    .returning()
  collegaId = collega!.id
})

beforeEach(async () => {
  // Elke test begint met een schone lei bij deze twee bedrijven; anders
  // beïnvloeden de bordtotalen van de een de verwachtingen van de ander.
  await db.delete(deals).where(inArray(deals.organizationId, [prospectId, klantId]))
})

after(async () => {
  await db.delete(deals).where(inArray(deals.organizationId, [prospectId, klantId]))
  if (gemaakteDeals.length > 0) {
    await db.delete(deals).where(inArray(deals.id, gemaakteDeals))
  }
  await db.delete(users).where(eq(users.id, collegaId))
  await db.delete(organizations).where(inArray(organizations.id, [prospectId, klantId]))
  await client.end()
})

/* --- Aanmaken ------------------------------------------------------------ */

test('een deal zonder fase komt in de eerste fase van het bord', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Marketing partnership' })
  gemaakteDeals.push(deal.id)

  assert.equal(deal.stageId, eersteFase)
  assert.equal(deal.status, 'open')
  assert.equal(deal.kind, 'retainer', 'retainer is de standaard bij een bureau')
})

test('een deal zonder naam wordt geweigerd', async () => {
  await assert.rejects(
    () => maakDeal({ organizationId: prospectId, title: '   ' }),
    (f: unknown) => f instanceof PijplijnError,
  )
})

/* --- De volgende actie: het mechanisme -------------------------------- */

test('een deal zonder volgende actie loopt achter', async () => {
  await maakDeal({ organizationId: prospectId, title: 'Zonder vervolgstap' })

  const kaarten = await listDeals({ status: 'open' })
  const kaart = kaarten.find((k) => k.deal.title === 'Zonder vervolgstap')

  assert.ok(kaart)
  assert.equal(kaart.actieOverDagen, null)
  assert.equal(kaart.looptAchter, true, 'geen vervolgstap betekent achterlopen')
})

test('een volgende actie in het verleden loopt achter, in de toekomst niet', async () => {
  const nu = new Date('2026-06-15T12:00:00Z')

  await maakDeal({
    organizationId: prospectId,
    title: 'Te laat',
    nextAction: 'Terugbellen',
    nextActionOn: new Date('2026-06-10T12:00:00Z'),
  })
  await maakDeal({
    organizationId: prospectId,
    title: 'Op tijd',
    nextAction: 'Voorstel sturen',
    nextActionOn: new Date('2026-06-20T12:00:00Z'),
  })

  const kaarten = await listDeals({ status: 'open' }, nu)
  const telaat = kaarten.find((k) => k.deal.title === 'Te laat')
  const optijd = kaarten.find((k) => k.deal.title === 'Op tijd')

  assert.equal(telaat?.actieOverDagen, -5)
  assert.equal(telaat?.looptAchter, true)

  assert.equal(optijd?.actieOverDagen, 5)
  assert.equal(optijd?.looptAchter, false)
})

test('wat achterloopt staat bovenaan in de lijst', async () => {
  const nu = new Date('2026-06-15T12:00:00Z')

  // In omgekeerde volgorde aangemaakt, zodat de sortering echt iets doet.
  await maakDeal({
    organizationId: prospectId,
    title: 'Volgende week',
    nextAction: 'Bellen',
    nextActionOn: new Date('2026-06-22T12:00:00Z'),
  })
  await maakDeal({ organizationId: prospectId, title: 'Niets afgesproken' })

  const kaarten = (await listDeals({ status: 'open' }, nu)).filter(
    (k) => k.deal.organizationId === prospectId,
  )

  assert.equal(
    kaarten[0]?.deal.title,
    'Niets afgesproken',
    'een deal zonder vervolgstap hoort bovenaan, niet weggestopt',
  )
})

test('een vervolgstap zonder datum wordt geweigerd, en omgekeerd', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Halve afspraak' })

  await assert.rejects(
    () => zetVolgendeActie(deal.id, 'Bellen', null),
    (f: unknown) => f instanceof PijplijnError,
  )
  await assert.rejects(
    () => zetVolgendeActie(deal.id, null, new Date('2026-07-01')),
    (f: unknown) => f instanceof PijplijnError,
  )

  // Allebei leeg mag: de vervolgstap weghalen.
  await zetVolgendeActie(deal.id, null, null)
})

test('een gewonnen deal loopt niet achter, ook zonder vervolgstap', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Gewonnen zonder stap' })
  await winDeal(deal.id)

  const kaarten = await listDeals({ status: 'alles' })
  const kaart = kaarten.find((k) => k.deal.id === deal.id)

  assert.equal(kaart?.looptAchter, false, 'een gesloten deal hoeft geen vervolgstap')
})

/* --- Winnen en verliezen ---------------------------------------------- */

test('een gewonnen deal maakt van een prospect een klant', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Wordt klant' })
  await winDeal(deal.id)

  const [org] = await db
    .select({ status: organizations.status })
    .from(organizations)
    .where(eq(organizations.id, prospectId))

  assert.equal(org?.status, 'client')
})

test('winnen maakt geen abonnement aan', async () => {
  const deal = await maakDeal({
    organizationId: prospectId,
    title: 'Met bedrag',
    valueCents: 160000,
  })
  await winDeal(deal.id)

  const { subscriptions } = await import('../../db/schema')
  const abos = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, prospectId))

  assert.equal(
    abos.length,
    0,
    'geld dat elke maand beweegt hoort een bewuste handeling te zijn, geen bijeffect',
  )
})

test('een gewonnen deal heeft een sluitdatum en geen verliesreden', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Dicht' })
  await winDeal(deal.id)

  const [na] = await db.select().from(deals).where(eq(deals.id, deal.id))
  assert.ok(na?.closedAt instanceof Date)
  assert.equal(na?.lostReason, null)
})

test('verliezen zonder reden wordt geweigerd', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Verloren' })

  await assert.rejects(
    () => verliesDeal(deal.id, '   '),
    (f: unknown) => f instanceof PijplijnError,
  )

  const [na] = await db.select({ status: deals.status }).from(deals).where(eq(deals.id, deal.id))
  assert.equal(na?.status, 'open', 'de deal mag niet half gesloten achterblijven')
})

test('de database weigert het ook als de app het zou doorlaten', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Rechtstreeks' })

  // Zonder deze check in de database zou een script of een handmatige update
  // er alsnog een reden-loze verloren deal in kunnen zetten.
  await assert.rejects(() =>
    db
      .update(deals)
      .set({ status: 'lost', closedAt: new Date() })
      .where(eq(deals.id, deal.id)),
  )
})

test('heropenen haalt de sluitdatum en de reden weg', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Toch weer open' })
  await verliesDeal(deal.id, 'Te duur gevonden')
  await heropenDeal(deal.id)

  const [na] = await db.select().from(deals).where(eq(deals.id, deal.id))
  assert.equal(na?.status, 'open')
  assert.equal(na?.closedAt, null)
  assert.equal(na?.lostReason, null)
})

test('een gesloten deal kun je niet verplaatsen', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Dicht en vast' })
  await winDeal(deal.id)

  await assert.rejects(
    () => verplaatsDeal(deal.id, tweedeFase),
    (f: unknown) => f instanceof PijplijnError,
  )
})

/* --- Bedragen: nooit optellen over de soorten heen -------------------- */

test('retainers en projecten worden apart geteld', async () => {
  await maakDeal({
    organizationId: prospectId,
    title: 'Retainer',
    kind: 'retainer',
    valueCents: 160000,
    stageId: eersteFase,
  })
  await maakDeal({
    organizationId: prospectId,
    title: 'Project',
    kind: 'project',
    valueCents: 800000,
    stageId: eersteFase,
  })

  const bord = await getBord({ status: 'open' })
  const kolom = bord.kolommen.find((k) => k.fase.id === eersteFase)

  assert.ok(kolom)
  assert.equal(kolom.bedragen.perMaandCents, 160000)
  assert.equal(kolom.bedragen.eenmaligCents, 800000)
  // 1.600 per maand en 8.000 eenmalig: er is geen getal dat die twee
  // samenvat zonder te liegen, dus het blijven er twee.
  assert.notEqual(
    kolom.bedragen.perMaandCents + kolom.bedragen.eenmaligCents,
    kolom.bedragen.perMaandCents,
  )
})

test('een deal zonder bedrag telt niet mee als nul maar wordt overgeslagen', async () => {
  await maakDeal({ organizationId: prospectId, title: 'Bedrag onbekend', stageId: eersteFase })
  const bord = await getBord({ status: 'open' })
  const kolom = bord.kolommen.find((k) => k.fase.id === eersteFase)

  assert.equal(kolom?.bedragen.perMaandCents, 0)
  assert.equal(kolom?.kaarten.length, 1, 'de deal staat wel op het bord')
})

test('het gewogen bedrag is het totaal maal de kans van de fase', async () => {
  const [fase] = await db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.id, eersteFase))

  await maakDeal({
    organizationId: prospectId,
    title: 'Gewogen',
    kind: 'retainer',
    valueCents: 100000,
    stageId: eersteFase,
  })

  const bord = await getBord({ status: 'open' })
  const kolom = bord.kolommen.find((k) => k.fase.id === eersteFase)

  assert.equal(kolom?.gewogen.perMaandCents, Math.round((100000 * fase!.probabilityPercent) / 100))
})

/* --- Scorekaart --------------------------------------------------------- */

test('de scoringskans en de verliesredenen kloppen', async () => {
  const a = await maakDeal({ organizationId: klantId, title: 'A', valueCents: 100000 })
  const b = await maakDeal({ organizationId: klantId, title: 'B' })
  const c = await maakDeal({ organizationId: klantId, title: 'C' })

  await winDeal(a.id)
  await verliesDeal(b.id, 'Te duur')
  await verliesDeal(c.id, 'Te duur')

  const kaart = await getScorekaart()

  assert.ok(kaart.gewonnen >= 1)
  assert.ok(kaart.verloren >= 2)
  assert.ok(kaart.scoringskansPercent !== null)

  const teDuur = kaart.verliesredenen.find((r) => r.reden === 'Te duur')
  assert.ok(teDuur, 'de reden hoort in de lijst te staan')
  assert.ok(teDuur.aantal >= 2, 'twee keer dezelfde reden hoort geteld te worden')
})

/* --- Achterstand voor het dashboard ---------------------------------- */

test('de achterstand telt open deals zonder of met een verlopen vervolgstap', async () => {
  const voor = await telAchterstand()

  await maakDeal({ organizationId: prospectId, title: 'Vergeten' })
  await maakDeal({
    organizationId: prospectId,
    title: 'Netjes',
    nextAction: 'Bellen',
    nextActionOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const na = await telAchterstand()
  assert.equal(na, voor + 1, 'alleen de vergeten deal telt mee')
})

test('een verwijderde deal is echt weg', async () => {
  const deal = await maakDeal({ organizationId: prospectId, title: 'Weg' })
  await wisDeal(deal.id)

  const rijen = await db.select().from(deals).where(eq(deals.id, deal.id))
  assert.equal(rijen.length, 0)
})
