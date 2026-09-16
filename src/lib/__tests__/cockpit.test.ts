/**
 * Tests voor de cockpitcijfers.
 *
 * Deze bestaan omdat getCockpit rauwe SQL is. Dat is bewust — zeven losse
 * tellingen werden zeven netwerkrondes en liepen vast op een serverless
 * functie — maar rauwe SQL heeft geen typecontrole. Een verkeerde kolomnaam
 * geeft geen foutmelding maar een nul, en een nul op een dashboard ziet er
 * precies zo uit als een echte nul.
 *
 * Daarom wordt hier geteld met bekende data en vergeleken met de verwachte
 * uitkomst.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, partners, users, wallets, subscriptions, contacts } from '../../db/schema'
import { getCockpit } from '../cockpit'

const merk = `ck${Date.now()}`
const orgIds: string[] = []
const partnerIds: string[] = []
const userIds: string[] = []

/** De stand voordat wij er iets bij zetten. */
let voor: Awaited<ReturnType<typeof getCockpit>>

before(async () => {
  voor = await getCockpit()

  // Een klant met een lopend abonnement: telt als retainerklant.
  const [retainer] = await db
    .insert(organizations)
    .values({ slug: `${merk}-retainer`, name: `${merk} Retainer BV`, status: 'client' })
    .returning()
  orgIds.push(retainer!.id)

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: retainer!.id, name: 'Marketing' })
    .returning()

  await db.insert(subscriptions).values({
    organizationId: retainer!.id,
    walletId: wallet!.id,
    name: `${merk} abonnement`,
    amountExclVatCents: 160000,
    status: 'active',
    startedOn: new Date('2025-01-01'),
  })

  // Een klant zonder abonnement: telt als projectklant.
  const [project] = await db
    .insert(organizations)
    .values({ slug: `${merk}-project`, name: `${merk} Project BV`, status: 'client' })
    .returning()
  orgIds.push(project!.id)

  const [prospect] = await db
    .insert(organizations)
    .values({ slug: `${merk}-prospect`, name: `${merk} Prospect BV`, status: 'prospect' })
    .returning()
  orgIds.push(prospect!.id)

  // Een klantaccount dat nog nooit heeft ingelogd.
  const [klantGebruiker] = await db
    .insert(users)
    .values({ email: `${merk}-klant@voorbeeld.nl`, role: 'client', organizationId: project!.id })
    .returning()
  userIds.push(klantGebruiker!.id)

  // Een collega in dienst en een die weg is.
  const [collega] = await db
    .insert(users)
    .values({ email: `${merk}-collega@jamesrobinson.nl`, role: 'staff' })
    .returning()
  userIds.push(collega!.id)

  const [vertrokken] = await db
    .insert(users)
    .values({
      email: `${merk}-oud@jamesrobinson.nl`,
      role: 'staff',
      endedOn: new Date('2024-01-01'),
    })
    .returning()
  userIds.push(vertrokken!.id)

  const [partner] = await db
    .insert(partners)
    .values({ name: `${merk} Drukker`, active: true })
    .returning()
  partnerIds.push(partner!.id)

  await db.insert(contacts).values({ organizationId: project!.id, name: `${merk} Contact` })
})

after(async () => {
  await db.delete(contacts).where(inArray(contacts.organizationId, orgIds))
  await db.delete(users).where(inArray(users.id, userIds))
  await db.delete(partners).where(inArray(partners.id, partnerIds))
  await db.delete(organizations).where(inArray(organizations.id, orgIds))
  await client.end()
})

test('bedrijven worden per status geteld', async () => {
  const na = await getCockpit()

  assert.equal(na.bedrijven, voor.bedrijven + 3, 'drie bedrijven erbij')
  assert.equal(na.klanten, voor.klanten + 2, 'twee klanten erbij')
  assert.equal(na.prospects, voor.prospects + 1, 'een prospect erbij')
})

test('een klant met abonnement is een retainerklant, zonder is projectklant', async () => {
  const na = await getCockpit()

  assert.equal(na.retainerKlanten, voor.retainerKlanten + 1)
  assert.equal(na.projectKlanten, voor.projectKlanten + 1)
})

test('retainer- en projectklanten tellen samen op tot het aantal klanten', async () => {
  const na = await getCockpit()
  // Dit hoeft niet altijd te kloppen — een prospect kan ook een abonnement
  // hebben — maar met deze gegevens wel, en het legt de bedoeling vast.
  assert.equal(na.projectKlanten, na.klanten - (na.retainerKlanten - voor.retainerKlanten) - (voor.klanten - voor.projectKlanten))
})

test('een collega uit dienst telt niet meer mee', async () => {
  const na = await getCockpit()
  // Twee toegevoegd, waarvan een met een einddatum in het verleden.
  assert.equal(na.collegas, voor.collegas + 1)
})

test('een klantaccount dat nooit heeft ingelogd telt wel mee, maar niet als ingelogd', async () => {
  const na = await getCockpit()

  assert.equal(na.klantgebruikers, voor.klantgebruikers + 1)
  assert.equal(na.klantgebruikersIngelogd, voor.klantgebruikersIngelogd)
  assert.equal(na.klantenMetToegang, voor.klantenMetToegang + 1)
})

test('contactpersonen en collega’s tellen samen als mensen in het CRM', async () => {
  const na = await getCockpit()
  // Een contactpersoon en een collega in dienst erbij.
  assert.equal(na.mensenInCrm, voor.mensenInCrm + 2)
})

test('actieve partners worden geteld', async () => {
  const na = await getCockpit()
  assert.equal(na.actievePartners, voor.actievePartners + 1)
})

test('alle cijfers zijn getallen en geen tekst', async () => {
  // Rauwe SQL geeft tellingen soms als string terug. Belandt zo'n string op
  // het scherm, dan gaat optellen stuk op een plek die er niets mee te maken
  // heeft.
  const na = await getCockpit()
  for (const [naam, waarde] of Object.entries(na)) {
    assert.equal(typeof waarde, 'number', `${naam} is geen getal`)
    assert.ok(Number.isFinite(waarde), `${naam} is geen geldig getal`)
  }
})
