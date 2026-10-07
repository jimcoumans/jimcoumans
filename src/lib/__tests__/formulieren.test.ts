/**
 * Formulieren in het klantdossier.
 *
 * Wat hier vastligt: een formulier hangt aan de klant en de open deal, de
 * link voor de klant werkt alleen met het juiste token en maar één keer, een
 * afgeronde vragenlijst is beoordeeld en vinkt de klantreis af, de quickscan
 * rondt pas af als hij compleet is, en de stopknop houdt het scanrapport tegen.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { asc, eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, users, deals, pipelineStages, clientJourneyItems, activities } from '../../db/schema'
import {
  maakFormulier,
  maakKlantlink,
  formulierViaLink,
  dienInViaLink,
  slaOp,
  rondAf,
  geefVrij,
  getFormulier,
  linkToken,
  FormulierError,
} from '../formulieren'
import { PUNTEN } from '../formulieren/quickscan'

const suffix = Date.now()
let orgId: string
let userId: string
let dealId: string

before(async () => {
  const [org] = await db.insert(organizations).values({ slug: `bbc-${suffix}`, name: `Balance ${suffix}`, status: 'lead' }).returning()
  orgId = org!.id
  await db.insert(contacts).values({ organizationId: orgId, name: 'Sanne Peters', firstName: 'Sanne', lastName: 'Peters', email: 'sanne@test.nl', isPrimary: true })
  const [u] = await db.insert(users).values({ email: `bbc-${suffix}@test.nl`, name: `Robin ${suffix}`, role: 'staff' }).returning()
  userId = u!.id
  const [fase] = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.sortOrder)).limit(1)
  const [d] = await db.insert(deals).values({ organizationId: orgId, stageId: fase!.id, title: 'Marketingpartner' }).returning()
  dealId = d!.id
})

after(async () => {
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(eq(users.id, userId))
  await client.end()
})

const antwoorden = {
  aanWie: 'Aan bedrijven',
  hoeKlant: 'Ze vragen een offerte, afspraak of reservering aan',
  watVerkoop: 'Lidmaatschap van een zakenclub',
  waar: 'In de regio rond mijn vestiging',
  budgetNu: '€ 1.000 – 2.500',
  waaraan: ['LinkedIn', 'Een bureau of freelancer', 'Iets wat niet bestaat'],
  website: 'balance.example',
  opdracht: '2.400',
  duur: 'Drie tot vijf jaar',
  perJaar: '1',
  aanvragen: '8',
  conversie: '',
  doorlooptijd: 'Een paar weken',
  knelpunt: ['Ik krijg te weinig aanvragen'],
  beginnen: 'Binnen een maand',
}

test('een vragenlijst hangt aan de klant en de open deal, met de contactgegevens al ingevuld', async () => {
  const f = await maakFormulier({ organizationId: orgId, soort: 'vragenlijst', userId })
  assert.equal(f.dealId, dealId)
  const a = f.antwoorden as Record<string, string>
  assert.equal(a.voornaam, 'Sanne')
  assert.equal(a.email, 'sanne@test.nl')
  // Nog een keer: hetzelfde open formulier, geen tweede.
  const weer = await maakFormulier({ organizationId: orgId, soort: 'vragenlijst', userId })
  assert.equal(weer.id, f.id)
})

test('de link werkt alleen met het juiste token, en een nieuwe link maakt de oude ongeldig', async () => {
  const f = await maakFormulier({ organizationId: orgId, soort: 'vragenlijst', userId })
  const pad = await maakKlantlink(f.id)
  const [, , id, token] = pad.split('/')
  assert.ok(await formulierViaLink(id!, token!))
  assert.equal(await formulierViaLink(id!, 'x'.repeat(32)), null)
  const nieuw = await maakKlantlink(f.id, true)
  assert.notEqual(nieuw, pad)
  assert.equal(await formulierViaLink(id!, token!), null)
  assert.ok(await formulierViaLink(id!, nieuw.split('/')[3]!))
})

test('de klant vult in: beoordeeld, klantreis afgevinkt, op de tijdlijn, en maar één keer', async () => {
  const f = await maakFormulier({ organizationId: orgId, soort: 'vragenlijst', userId })
  const pad = await maakKlantlink(f.id)
  const token = pad.split('/')[3]!

  await assert.rejects(dienInViaLink(f.id, token, { aanWie: 'Aan bedrijven' }), /Vul nog in/)

  const b = await dienInViaLink(f.id, token, antwoorden)
  // 2.400 × 1 × 30% × 1 jaar × 20% ("weet ik niet") = 144: groen.
  assert.equal(b.kleur, 'groen')
  const opgeslagen = (await getFormulier(f.id))!
  assert.equal(opgeslagen.formulier.status, 'ingevuld')
  assert.equal(opgeslagen.formulier.ingevuldDoorKlant, true)
  // Een optie die niet bestaat, wordt niet bewaard.
  assert.deepEqual((opgeslagen.formulier.antwoorden as Record<string, unknown>).waaraan, ['LinkedIn', 'Een bureau of freelancer'])

  const gevinkt = await db.select().from(clientJourneyItems).where(eq(clientJourneyItems.organizationId, orgId))
  assert.deepEqual(gevinkt.map((g) => g.itemKey).sort(), ['01.beoordeeld', '01.vragenlijst'])
  const notities = await db.select().from(activities).where(eq(activities.organizationId, orgId))
  assert.ok(notities.some((n) => n.subject.startsWith('Vragenlijst ingevuld door de klant: groen')))
  // De website staat nu op de klantkaart.
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId))
  assert.equal(org!.website, 'balance.example')

  await assert.rejects(dienInViaLink(f.id, token, antwoorden), FormulierError)
})

test('wij vullen in: een onleesbaar getal slaat niets op, afronden pas als het compleet is', async () => {
  const f = await maakFormulier({ organizationId: orgId, soort: 'vragenlijst', userId })
  await slaOp(f.id, { aanWie: 'Aan bedrijven', website: 'balance.example' }, userId)
  await assert.rejects(slaOp(f.id, { aanWie: 'Aan particulieren', opdracht: 'ongeveer duizend' }, userId), /Niet opgeslagen\. Vraag 8/)
  // Het eerder opgeslagene staat er nog: niets half overschreven.
  assert.equal(((await getFormulier(f.id))!.formulier.antwoorden as Record<string, unknown>).aanWie, 'Aan bedrijven')
  // Afronden met lege verplichte vragen: geen beoordeling, en het formulier blijft open.
  await assert.rejects(rondAf(f.id, userId), /nog niet afgerond: zonder vraag 2, 3/)
  assert.equal((await getFormulier(f.id))!.formulier.status, 'open')
  assert.equal((await getFormulier(f.id))!.formulier.uitkomst, null)
})

test('de quickscan rondt pas af als hij compleet is, en de stopknop houdt het rapport tegen', async () => {
  const f = await maakFormulier({ organizationId: orgId, soort: 'quickscan', userId })
  // Het gebied en de zoektermen komen uit de vragenlijst.
  assert.equal((f.antwoorden as Record<string, string>).zoektermen, 'Lidmaatschap van een zakenclub')
  await assert.rejects(rondAf(f.id, userId), /Nog niet compleet/)

  const punten: Record<string, Record<string, string>> = {}
  for (const p of PUNTEN) punten[String(p.nr)] = p.normen ? { kleur: 'groen', gezien: 'ok' } : { gezien: 'niemand' }
  punten['11'] = { kleur: 'rood', gezien: 'geen bedankpagina' }
  const bevindingen = [1, 2, 3].map((i) => ({ punt: String(10 + i), gezien: `gezien ${i}`, gevolg: `gevolg ${i}` }))
  await slaOp(f.id, { punten, bevindingen, zoektermen: 'zakenclub', gebied: 'Limburg' }, userId)
  await rondAf(f.id, userId)
  await geefVrij(f.id, userId)
  assert.equal((await getFormulier(f.id))!.formulier.status, 'vrijgegeven')

  // Een tweede scan met punt 8 op rood: afronden mag, vrijgeven niet.
  const g = await maakFormulier({ organizationId: orgId, soort: 'quickscan', userId })
  punten['8'] = { kleur: 'rood', gezien: 'Wix zonder code' }
  await slaOp(g.id, { punten, bevindingen }, userId)
  await rondAf(g.id, userId)
  await assert.rejects(geefVrij(g.id, userId), /stopknop/)
})

test('het intakegesprek rondt niet af zonder de vier verplichte vragen', async () => {
  const f = await maakFormulier({ organizationId: orgId, soort: 'intake', userId })
  await slaOp(f.id, { i1: 'Weten of het past', i3: '€ 50.000' }, userId)
  await assert.rejects(rondAf(f.id, userId), /vraag 6, 10, 24/)
  await slaOp(f.id, { i1: 'Weten of het past', i3: '€ 50.000', i6: '10 erbij', i10: 'Lidmaatschap', i24: '14 oktober' }, userId)
  await rondAf(f.id, userId)
  const gevinkt = await db.select().from(clientJourneyItems).where(eq(clientJourneyItems.organizationId, orgId))
  assert.ok(gevinkt.some((g) => g.itemKey === '03.gevoerd'))
})

test('het token hangt af van id en versie', () => {
  assert.notEqual(linkToken('a', 0), linkToken('a', 1))
  assert.equal(linkToken('a', 0).length, 32)
})
