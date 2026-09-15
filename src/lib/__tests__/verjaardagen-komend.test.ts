/**
 * Tests voor het overzicht "wie is er binnenkort jarig".
 *
 * De valkuil is de jaarwisseling. Een naïeve berekening vergelijkt datums
 * binnen hetzelfde jaar, en dan loopt het overzicht eind december leeg —
 * precies wanneer je er het meest aan hebt.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, contactChildren, users } from '../../db/schema'
import { komendeVerjaardagen } from '../verjaardagen'

const suffix = Date.now()
let orgId: string
let contactId: string
let collegaId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `vj-${suffix}`, name: `Jarig BV ${suffix}` })
    .returning()
  orgId = org!.id

  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId: orgId,
      name: `Oudjaar ${suffix}`,
      birthDay: 2,
      birthMonth: 1,
      birthYear: 1985,
    })
    .returning()
  contactId = contact!.id

  await db.insert(contactChildren).values({
    contactId,
    name: `Kind ${suffix}`,
    birthDay: 30,
    birthMonth: 12,
    birthYear: 2018,
  })

  const [collega] = await db
    .insert(users)
    .values({
      email: `vj-${suffix}@test.nl`,
      name: `Collega ${suffix}`,
      role: 'staff',
      birthDay: 31,
      birthMonth: 12,
      birthYear: 1990,
    })
    .returning()
  collegaId = collega!.id
})

after(async () => {
  await db.delete(contactChildren).where(eq(contactChildren.contactId, contactId))
  await db.delete(contacts).where(eq(contacts.organizationId, orgId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await db.delete(users).where(inArray(users.id, [collegaId]))
  await client.end()
})

/** Alleen de mensen uit deze test, want de database heeft er meer. */
function onze(lijst: Awaited<ReturnType<typeof komendeVerjaardagen>>) {
  return lijst.filter((v) => v.naam.includes(String(suffix)))
}

test('het overzicht loopt over de jaarwisseling heen', async () => {
  // Op 29 december: het kind is over 1 dag jarig, de collega over 2 en de
  // contactpersoon over 4 — in januari.
  const lijst = onze(await komendeVerjaardagen(7, new Date(2026, 11, 29, 10, 0)))

  assert.equal(lijst.length, 3, 'alle drie staan erin')
  assert.equal(lijst[0]!.overDagen, 1)
  assert.match(lijst[0]!.naam, /^Kind/)
  assert.equal(lijst[1]!.overDagen, 2)
  assert.match(lijst[1]!.naam, /^Collega/)
  assert.equal(lijst[2]!.overDagen, 4, 'de 2e januari, over de jaargrens')
  assert.match(lijst[2]!.naam, /^Oudjaar/)
})

test('de leeftijd hoort bij het jaar waarin gevierd wordt', async () => {
  const lijst = onze(await komendeVerjaardagen(7, new Date(2026, 11, 29, 10, 0)))

  const collega = lijst.find((v) => v.naam.startsWith('Collega'))!
  assert.equal(collega.wordt, 36, 'op 31 december 2026 wordt hij 36')

  const contact = lijst.find((v) => v.naam.startsWith('Oudjaar'))!
  assert.equal(contact.wordt, 42, 'op 2 januari 2027 wordt hij 42, niet 41')
})

test('wie vandaag jarig is staat bovenaan met nul dagen', async () => {
  const lijst = onze(await komendeVerjaardagen(7, new Date(2026, 11, 31, 9, 0)))
  assert.equal(lijst[0]!.overDagen, 0)
  assert.match(lijst[0]!.naam, /^Collega/)
})

test('buiten het venster staat niemand', async () => {
  // Half juni: niemand van deze drie is binnen een week jarig.
  const lijst = onze(await komendeVerjaardagen(7, new Date(2026, 5, 15, 9, 0)))
  assert.equal(lijst.length, 0)
})

test('een groter venster haalt meer mensen op', async () => {
  const lijst = onze(await komendeVerjaardagen(30, new Date(2026, 11, 10, 9, 0)))
  assert.equal(lijst.length, 3, 'binnen dertig dagen zijn ze alle drie aan de beurt')
})

test('er staat bij waar iemand hoort', async () => {
  const lijst = onze(await komendeVerjaardagen(7, new Date(2026, 11, 29, 10, 0)))

  const kind = lijst.find((v) => v.soort === 'kind')!
  assert.match(kind.bij ?? '', /kind van/)
  assert.equal(kind.href, null, 'een kind heeft geen eigen pagina')

  const contact = lijst.find((v) => v.soort === 'contact')!
  assert.match(contact.bij ?? '', /Jarig BV/)
  assert.match(contact.href ?? '', /\/beheer\/klanten\//)
})

test('zonder geboortejaar blijft de leeftijd leeg in plaats van verzonnen', async () => {
  const [zonder] = await db
    .insert(contacts)
    .values({
      organizationId: orgId,
      name: `Zonderjaar ${suffix}`,
      birthDay: 1,
      birthMonth: 1,
    })
    .returning()

  const lijst = onze(await komendeVerjaardagen(7, new Date(2026, 11, 29, 10, 0)))
  const hij = lijst.find((v) => v.naam.startsWith('Zonderjaar'))!
  assert.equal(hij.wordt, null)

  await db.delete(contacts).where(eq(contacts.id, zonder!.id))
})
