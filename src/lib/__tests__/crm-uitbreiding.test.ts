/**
 * Tests voor de CRM-uitbreiding: accountmanagers, labels, verjaardagen en
 * de tijdlijn.
 *
 * De nadruk ligt op de regels die je niet ziet maar wel voelt als ze er niet
 * zijn: dat er altijd precies één eerste aanspreekpartner is, dat een label
 * niet twee keer bestaat in verschillende schrijfwijzen, en dat een
 * verjaardag zonder geboortejaar gewoon werkt.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray, sql } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, contacts, tags, organizationTags, activities } from '../../db/schema'
import {
  listOwners, addOwner, makePrimaryOwner, removeOwner, updateOwnerRole,
  listOrganizationsForOwner,
} from '../crm-owners'
import { attachTag, detachTag, listTags, listTagsForOrganization, renameTag, TagError } from '../crm-tags'
import { verjaardagenInMaand, jubileaInMaand, attentiesDezeMaand } from '../verjaardagen'
import { getTijdlijn, createActivity, laatsteContact, ActivityError } from '../tijdlijn'

const suffix = Date.now()
let orgId: string
let anderOrgId: string
let jimId: string
let kikkenId: string
let robinId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `crm-${suffix}`, name: `CRM Klant ${suffix}`, status: 'client' })
    .returning()
  orgId = org!.id

  const [ander] = await db
    .insert(organizations)
    .values({ slug: `crm2-${suffix}`, name: `CRM Klant twee ${suffix}`, status: 'lead' })
    .returning()
  anderOrgId = ander!.id

  const gemaakt = await db
    .insert(users)
    .values([
      { email: `jim-${suffix}@test.nl`, name: 'Jim C', role: 'admin' },
      { email: `kikken-${suffix}@test.nl`, name: 'Jim K', role: 'staff' },
      { email: `robin-${suffix}@test.nl`, name: 'Robin', role: 'staff' },
    ])
    .returning()
  jimId = gemaakt[0]!.id
  kikkenId = gemaakt[1]!.id
  robinId = gemaakt[2]!.id
})

after(async () => {
  await db.delete(activities).where(inArray(activities.organizationId, [orgId, anderOrgId]))
  await db.delete(organizationTags).where(inArray(organizationTags.organizationId, [orgId, anderOrgId]))
  await db.delete(tags).where(sql`${tags.name} LIKE ${'test-' + suffix + '%'}`)
  await db.delete(contacts).where(eq(contacts.organizationId, orgId))
  await db.delete(organizations).where(inArray(organizations.id, [orgId, anderOrgId]))
  await db.delete(users).where(inArray(users.id, [jimId, kikkenId, robinId]))
  await client.end()
})

/* --------------------------- Accountmanagers ---------------------------- */

test('de eerste accountmanager wordt vanzelf de aanspreekpartner', async () => {
  // Anders heeft een klant wel accountmanagers maar geen eerste, en dan
  // voelt niemand zich verantwoordelijk.
  await addOwner({ organizationId: orgId, userId: jimId, role: 'Strategie' })

  const owners = await listOwners(orgId)
  assert.equal(owners.length, 1)
  assert.equal(owners[0]!.isPrimary, true)
  assert.equal(owners[0]!.role, 'Strategie')
})

test('een tweede accountmanager erbij laat de eerste met rust', async () => {
  await addOwner({ organizationId: orgId, userId: kikkenId, role: 'SEA' })

  const owners = await listOwners(orgId)
  assert.equal(owners.length, 2)
  assert.equal(owners.filter((o) => o.isPrimary).length, 1, 'er blijft er precies één primair')
  assert.equal(owners[0]!.name, 'Jim C', 'de aanspreekpartner staat bovenaan')
})

test('de aanspreekpartner overdragen haalt de rol bij de ander weg', async () => {
  const owners = await listOwners(orgId)
  const kikken = owners.find((o) => o.userId === kikkenId)!

  await makePrimaryOwner(kikken.id)

  const na = await listOwners(orgId)
  assert.equal(na.filter((o) => o.isPrimary).length, 1)
  assert.equal(na.find((o) => o.isPrimary)!.userId, kikkenId)
})

test('de aanspreekpartner weghalen wijst een opvolger aan', async () => {
  // Een klant met accountmanagers maar zonder aanspreekpartner is een gat.
  const owners = await listOwners(orgId)
  const primair = owners.find((o) => o.isPrimary)!

  await removeOwner(primair.id)

  const na = await listOwners(orgId)
  assert.equal(na.length, 1)
  assert.equal(na[0]!.isPrimary, true, 'de overgebleven collega neemt het over')
})

test('dezelfde collega twee keer op dezelfde klant wordt geweigerd', async () => {
  await assert.rejects(() => addOwner({ organizationId: orgId, userId: jimId }))
})

test('je kunt zien bij welke klanten iemand accountmanager is', async () => {
  await addOwner({ organizationId: anderOrgId, userId: jimId })
  const van = await listOrganizationsForOwner(jimId)
  assert.ok(van.length >= 2)
  assert.ok(van.some((v) => v.organizationSlug === `crm2-${suffix}`))
})

test('de rol van een accountmanager is te wijzigen', async () => {
  const owners = await listOwners(orgId)
  await updateOwnerRole(owners[0]!.id, 'Accountmanagement')
  const na = await listOwners(orgId)
  assert.equal(na[0]!.role, 'Accountmanagement')
})

/* -------------------------------- Labels -------------------------------- */

test('een label dat al bestaat wordt hergebruikt, ongeacht hoofdletters', async () => {
  // Anders krijg je "Horeca" naast "horeca": twee halve groepen.
  const eerste = await attachTag({ organizationId: orgId, name: `test-${suffix}-Horeca` })
  const tweede = await attachTag({ organizationId: anderOrgId, name: `TEST-${suffix}-horeca` })

  assert.equal(tweede.id, eerste.id, 'hetzelfde label')
  assert.equal(tweede.name, `test-${suffix}-Horeca`, 'de eerste schrijfwijze blijft staan')
})

test('hetzelfde label twee keer op dezelfde klant is geen fout', async () => {
  await attachTag({ organizationId: orgId, name: `test-${suffix}-Horeca` })
  const labels = await listTagsForOrganization(orgId)
  assert.equal(labels.filter((l) => l.name === `test-${suffix}-Horeca`).length, 1)
})

test('een label telt bij hoeveel klanten het hangt', async () => {
  const alle = await listTags()
  const horeca = alle.find((t) => t.name === `test-${suffix}-Horeca`)!
  assert.equal(horeca.organizationCount, 2)
})

test('een label van één teken wordt geweigerd', async () => {
  await assert.rejects(
    () => attachTag({ organizationId: orgId, name: 'x' }),
    (f: Error) => f instanceof TagError,
  )
})

test('een label loshalen raakt de andere klant niet', async () => {
  const labels = await listTagsForOrganization(orgId)
  const horeca = labels.find((l) => l.name === `test-${suffix}-Horeca`)!

  await detachTag(orgId, horeca.id)

  assert.equal((await listTagsForOrganization(orgId)).length, 0)
  assert.equal((await listTagsForOrganization(anderOrgId)).length, 1, 'de ander houdt zijn label')
})

test('een label hernoemen geldt overal tegelijk', async () => {
  const labels = await listTagsForOrganization(anderOrgId)
  await renameTag(labels[0]!.id, `test-${suffix}-Gastvrijheid`, 'purple')

  const na = await listTagsForOrganization(anderOrgId)
  assert.equal(na[0]!.name, `test-${suffix}-Gastvrijheid`)
  assert.equal(na[0]!.color, 'purple')
})

/* ----------------------------- Verjaardagen ----------------------------- */

test('een verjaardag zonder geboortejaar werkt gewoon', async () => {
  // Veel mensen delen hun jaartal niet. Een verzonnen jaar is erger dan geen.
  await db.insert(contacts).values({
    organizationId: orgId, name: 'Marieke Zonderjaar',
    birthDay: 12, birthMonth: 3,
  })

  const maart = await verjaardagenInMaand(3, 2026)
  const marieke = maart.find((v) => v.naam === 'Marieke Zonderjaar')!

  assert.ok(marieke)
  assert.equal(marieke.wordt, null, 'geen leeftijd zonder jaartal')
  assert.equal(marieke.dag, 12)
})

test('met geboortejaar rekent hij uit welke leeftijd iemand wordt', async () => {
  await db.insert(contacts).values({
    organizationId: orgId, name: 'Rob Metjaar',
    birthDay: 3, birthMonth: 3, birthYear: 1980,
  })

  const maart = await verjaardagenInMaand(3, 2026)
  assert.equal(maart.find((v) => v.naam === 'Rob Metjaar')!.wordt, 46)
})

test('de database weigert een dag zonder maand', async () => {
  // Een dag zonder maand zegt niets, en dan sta je met een half gegeven.
  await assert.rejects(
    () => db.insert(contacts).values({ organizationId: orgId, name: 'Half', birthDay: 5 }),
  )
})

test('de database weigert een onmogelijke maand', async () => {
  await assert.rejects(
    () => db.insert(contacts).values({
      organizationId: orgId, name: 'Onmogelijk', birthDay: 5, birthMonth: 13,
    }),
  )
})

test('verjaardagen staan op dagvolgorde', async () => {
  const maart = await verjaardagenInMaand(3, 2026)
  const eigen = maart.filter((v) => v.organizationId === orgId)
  assert.deepEqual(eigen.map((v) => v.dag), [...eigen.map((v) => v.dag)].sort((a, b) => a - b))
})

test('een jubileum telt pas vanaf één jaar', async () => {
  // "Nul jaar klant" is de dag zelf en geen moment om te vieren.
  const nu = new Date('2026-06-15T12:00:00Z')

  await db.update(organizations)
    .set({ clientSince: new Date('2026-06-01T12:00:00Z') })
    .where(eq(organizations.id, orgId))
  assert.equal((await jubileaInMaand(6, nu)).some((j) => j.organizationId === orgId), false)

  await db.update(organizations)
    .set({ clientSince: new Date('2021-06-08T12:00:00Z') })
    .where(eq(organizations.id, orgId))
  const vijf = (await jubileaInMaand(6, nu)).find((j) => j.organizationId === orgId)!
  assert.equal(vijf.jaren, 5)
})

test('attenties van deze maand komen in één keer', async () => {
  const uitkomst = await attentiesDezeMaand(new Date('2026-03-01T12:00:00Z'))
  assert.equal(uitkomst.maand, 3)
  assert.ok(uitkomst.verjaardagen.length >= 2)
})

/* ------------------------------- Tijdlijn ------------------------------- */

test('een notitie komt op de tijdlijn met wie en wanneer', async () => {
  await createActivity({
    organizationId: orgId, kind: 'call', subject: 'Gebeld over de zomercampagne',
    body: 'Marieke wil in mei starten.', userId: jimId,
    occurredAt: new Date('2026-02-10T10:00:00Z'),
  })

  const tijdlijn = await getTijdlijn(orgId)
  const item = tijdlijn.find((t) => t.titel === 'Gebeld over de zomercampagne')!

  assert.ok(item)
  assert.equal(item.bron, 'activity')
  assert.equal(item.kind, 'call')
  assert.equal(item.wie, 'Jim C')
})

test('een notitie zonder titel wordt geweigerd', async () => {
  await assert.rejects(
    () => createActivity({ organizationId: orgId, kind: 'note', subject: ' ' }),
    (f: Error) => f instanceof ActivityError,
  )
})

test('de tijdlijn staat op volgorde, nieuwste eerst', async () => {
  await createActivity({
    organizationId: orgId, kind: 'meeting', subject: 'Op bezoek geweest',
    occurredAt: new Date('2026-04-01T10:00:00Z'),
  })

  const tijdlijn = await getTijdlijn(orgId)
  const tijden = tijdlijn.map((t) => t.wanneer.getTime())
  assert.deepEqual(tijden, [...tijden].sort((a, b) => b - a))
})

test('laatste contact vertelt wanneer er voor het laatst iets was', async () => {
  const wanneer = await laatsteContact(orgId)
  assert.equal(wanneer?.toISOString().slice(0, 10), '2026-04-01')
})

test('een klant zonder notities heeft geen laatste contact', async () => {
  assert.equal(await laatsteContact(anderOrgId), null)
})
