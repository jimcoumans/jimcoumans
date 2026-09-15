/**
 * Tests voor de tijdlijn van een klant.
 *
 * Het principe dat hier vastligt: wat het systeem al weet wordt bij het TONEN
 * opgehaald, niet als extra regel weggeschreven. Zou een offerte ook nog eens
 * als tijdlijnregel in de database staan, dan heb je twee waarheden die uit
 * elkaar lopen zodra iemand die offerte aanpast.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, users, activities, quotes, quoteLines } from '../../db/schema'
import { getTijdlijn, createActivity, laatsteContact, ActivityError } from '../tijdlijn'

const suffix = Date.now()
let orgId: string
let contactId: string
let userId: string
let quoteId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `tl-${suffix}`, name: `Tijdlijn BV ${suffix}` })
    .returning()
  orgId = org!.id

  const [contact] = await db
    .insert(contacts)
    .values({ organizationId: orgId, name: `Marieke ${suffix}` })
    .returning()
  contactId = contact!.id

  const [user] = await db
    .insert(users)
    .values({ email: `tl-${suffix}@test.nl`, name: `Bram ${suffix}`, role: 'staff' })
    .returning()
  userId = user!.id

  const [offerte] = await db
    .insert(quotes)
    .values({
      organizationId: orgId,
      number: `TL-${suffix}`,
      title: 'Merkpositionering',
      status: 'sent',
      issuedOn: new Date('2026-03-01T12:00:00Z'),
    })
    .returning()
  quoteId = offerte!.id

  await db.insert(quoteLines).values({
    quoteId,
    kind: 'service',
    description: 'Strategie',
    quantityHundredths: 100,
    unitPriceCents: 500_000,
    sortOrder: 1,
  })
})

after(async () => {
  await db.delete(activities).where(eq(activities.organizationId, orgId))
  await db.delete(quoteLines).where(eq(quoteLines.quoteId, quoteId))
  await db.delete(quotes).where(eq(quotes.organizationId, orgId))
  await db.delete(contacts).where(eq(contacts.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(inArray(users.id, [userId]))
  await client.end()
})

test('een offerte staat op de tijdlijn zonder dat hij er is ingeschreven', async () => {
  // Er is geen enkele regel in `activities` aangemaakt voor deze offerte.
  const handmatig = await db.select().from(activities).where(eq(activities.organizationId, orgId))
  assert.equal(handmatig.length, 0)

  const tijdlijn = await getTijdlijn(orgId)
  const offerte = tijdlijn.find((i) => i.bron === 'quote')
  assert.ok(offerte, 'de offerte komt uit zijn eigen tabel')
  assert.match(offerte!.titel, /Merkpositionering/)
  assert.equal(offerte!.bedragCents, 500_000)
})

test('een aangepaste offerte toont meteen het nieuwe bedrag', async () => {
  // Dit is waarom er niets wordt overgeschreven: één plek, één waarheid.
  await db
    .update(quoteLines)
    .set({ unitPriceCents: 750_000 })
    .where(eq(quoteLines.quoteId, quoteId))

  const tijdlijn = await getTijdlijn(orgId)
  const offerte = tijdlijn.find((i) => i.bron === 'quote')
  assert.equal(offerte!.bedragCents, 750_000, 'geen oud bedrag dat blijft hangen')
})

test('een gesprek met de hand vastleggen kan, met wie en door wie', async () => {
  await createActivity({
    organizationId: orgId,
    kind: 'call',
    subject: 'Gebeld over de campagne',
    body: 'Wil in mei starten.',
    contactId,
    userId,
    occurredAt: new Date('2026-04-01T12:00:00Z'),
  })

  const tijdlijn = await getTijdlijn(orgId)
  const gesprek = tijdlijn.find((i) => i.bron === 'activity')

  assert.ok(gesprek)
  assert.equal(gesprek!.kind, 'call')
  assert.match(gesprek!.metWie ?? '', /Marieke/)
  assert.match(gesprek!.wie ?? '', /Bram/)
})

test('de tijdlijn staat op volgorde, het nieuwste bovenaan', async () => {
  const tijdlijn = await getTijdlijn(orgId)
  const tijden = tijdlijn.map((i) => i.wanneer.getTime())
  const gesorteerd = [...tijden].sort((a, b) => b - a)
  assert.deepEqual(tijden, gesorteerd)
})

test('een notitie zonder titel wordt geweigerd', async () => {
  await assert.rejects(
    () => createActivity({ organizationId: orgId, kind: 'note', subject: 'x' }),
    (f: Error) => f instanceof ActivityError,
  )
})

test('laatste contact kijkt naar wat er met de hand is vastgelegd', async () => {
  const wanneer = await laatsteContact(orgId)
  assert.ok(wanneer)
  assert.equal(wanneer!.getUTCFullYear(), 2026)
  assert.equal(wanneer!.getUTCMonth(), 3, 'april')
})
