/**
 * Tests voor het vertrek van een contactpersoon bij een bedrijf.
 *
 * Wat hier vastligt: de persoon blijft in het CRM, haar login bij dat bedrijf
 * gaat dicht, de rollen gaan eraf, de geschiedenis blijft bewaard, en een
 * vertrekkende vaste contactpersoon zet de relatie op "Vraagt aandacht".
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { and, eq, ilike, inArray, like } from 'drizzle-orm'
import { db, client } from '../../db'
import { activities, contactOrganizations, contacts, deals, organizations, users } from '../../db/schema'
import { createContact, extraBedrijvenVan, gekoppeldeContacten, koppelContactAanBedrijf, CrmError } from '../crm'
import { maakDeal } from '../pijplijn'
import { isZakelijkAdres, klantenZonderVasteContact, nogOpenBij, oudContactpersonen, vertrekBijBedrijf, vorigeWerkgevers } from '../vertrek'

const merk = `vtrk${Date.now()}`
let klantId: string
let tweedeId: string
let collegaId: string

before(async () => {
  const [k] = await db.insert(organizations).values({ slug: `${merk}-klant`, name: `${merk} Klant`, status: 'client', relationHealth: 'goed' }).returning()
  const [t] = await db.insert(organizations).values({ slug: `${merk}-twee`, name: `${merk} Tweede`, status: 'client' }).returning()
  const [u] = await db.insert(users).values({ email: `${merk}@jamesrobinson.nl`, name: 'Collega', role: 'staff' }).returning()
  klantId = k!.id
  tweedeId = t!.id
  collegaId = u!.id
})

after(async () => {
  const orgs = await db.select({ id: organizations.id }).from(organizations).where(like(organizations.name, `${merk}%`))
  const ids = orgs.map((o) => o.id)
  await db.delete(deals).where(inArray(deals.organizationId, ids))
  await db.delete(contacts).where(like(contacts.email, `%${merk}%`))
  await db.delete(contacts).where(like(contacts.notes, `%${merk}%`))
  await db.delete(contacts).where(inArray(contacts.organizationId, ids))
  await db.delete(users).where(ilike(users.email, `%${merk}%`))
  await db.delete(organizations).where(inArray(organizations.id, ids))
  await client.end()
})

test('privé-adressen blijven staan, zakelijke niet', () => {
  assert.equal(isZakelijkAdres('marieke@hotelx.nl'), true)
  assert.equal(isZakelijkAdres('marieke@gmail.com'), false)
  assert.equal(isZakelijkAdres(null), false)
})

test('de vaste contactpersoon vertrekt: login dicht, rollen eraf, geschiedenis bewaard', async () => {
  const c = await createContact({ organizationId: klantId, name: 'Marieke Voncken', firstName: 'Marieke', lastName: 'Voncken', jobTitle: 'Directeur', email: `marieke@${merk}.nl`, isPrimary: true, receivesInvoices: true })
  await db.insert(users).values({ email: `MARIEKE@${merk}.nl`, role: 'client', organizationId: klantId })
  // Een login bij een ander bedrijf blijft ongemoeid.
  await db.insert(users).values({ email: `marieke+twee@${merk}.nl`, role: 'client', organizationId: tweedeId })

  const uit = await vertrekBijBedrijf(c.id, klantId, { bestemming: { soort: 'tekst', naam: `${merk} Nieuwe werkgever`, alsLead: false } }, { id: collegaId })
  assert.equal(uit.geblokkeerd, 1)
  assert.equal(uit.wasVast, true)
  assert.equal(uit.mailVerplaatst, true)

  const [na] = await db.select().from(contacts).where(eq(contacts.id, c.id))
  assert.equal(na!.organizationId, null, 'niet meer bij de klant')
  assert.equal(na!.companyName, `${merk} Nieuwe werkgever`)
  assert.equal(na!.isPrimary, false)
  assert.equal(na!.receivesInvoices, false)
  assert.equal(na!.email, null, 'werkmail weg uit het mailveld')
  assert.match(na!.notes ?? '', new RegExp(`marieke@${merk}.nl`), 'maar bewaard in de notities')

  const logins = await db.select().from(users).where(ilike(users.email, `%marieke%${merk}%`))
  assert.ok(logins.find((l) => l.organizationId === klantId)!.disabledAt, 'login bij de klant geblokkeerd')
  assert.equal(logins.find((l) => l.organizationId === tweedeId)!.disabledAt, null, 'login elders niet')

  const [org] = await db.select().from(organizations).where(eq(organizations.id, klantId))
  assert.equal(org!.relationHealth, 'aandacht')

  const tijdlijn = await db.select().from(activities).where(eq(activities.organizationId, klantId))
  assert.ok(tijdlijn.some((a) => a.subject === 'Marieke Voncken vertrokken'))
  assert.ok(tijdlijn.some((a) => a.kind === 'task' && a.subject.includes('opvolger van Marieke')))

  const oud = await oudContactpersonen(klantId)
  assert.deepEqual(oud.map((o) => [o.contact.id, o.rol]), [[c.id, 'Directeur']])
  assert.equal((await vorigeWerkgevers(c.id))[0]!.organizationId, klantId)
  assert.ok((await klantenZonderVasteContact()).some((k) => k.slug === `${merk}-klant`))
})

test('vertrekken bij een extra bedrijf laat het hoofdbedrijf staan', async () => {
  const c = await createContact({ organizationId: tweedeId, name: 'Ruud Peters', email: `ruud@gmail.com`, notes: merk })
  await koppelContactAanBedrijf(c.id, klantId, 'Bestuurslid')
  assert.equal((await gekoppeldeContacten(klantId)).length, 1)

  await vertrekBijBedrijf(c.id, klantId, { bestemming: { soort: 'onbekend' } }, { id: collegaId })
  const [na] = await db.select().from(contacts).where(eq(contacts.id, c.id))
  assert.equal(na!.organizationId, tweedeId)
  assert.equal(na!.email, 'ruud@gmail.com')
  assert.equal((await gekoppeldeContacten(klantId)).length, 0)
  assert.equal((await extraBedrijvenVan(c.id)).length, 0)

  // Komt hij terug, dan wordt de oude rij weer een lopende koppeling.
  await koppelContactAanBedrijf(c.id, klantId, 'Adviseur')
  const [rij] = await db.select().from(contactOrganizations).where(and(eq(contactOrganizations.contactId, c.id), eq(contactOrganizations.organizationId, klantId)))
  assert.equal(rij!.endedOn, null)
  assert.equal(rij!.role, 'Adviseur')
})

test('naar een bedrijf uit het CRM, en een open deal blijft gemeld', async () => {
  const c = await createContact({ organizationId: klantId, name: 'Sanne Wit', email: `sanne@${merk}.nl` })
  const deal = await maakDeal({ organizationId: klantId, contactId: c.id, title: `${merk} uitbreiding` })
  await vertrekBijBedrijf(c.id, klantId, { bestemming: { soort: 'crm', organizationId: tweedeId } }, { id: collegaId })
  const [na] = await db.select().from(contacts).where(eq(contacts.id, c.id))
  assert.equal(na!.organizationId, tweedeId)
  const open = await nogOpenBij(c.id)
  assert.deepEqual(open.deals.map((d) => d.id), [deal.id], 'de deal bij haar oude werkgever staat nog op haar naam')
})

test('de nieuwe werkgever als lead: bedrijf en deal erbij', async () => {
  const c = await createContact({ organizationId: klantId, name: 'Lotte Smeets', firstName: 'Lotte', email: `lotte@${merk}.nl` })
  const uit = await vertrekBijBedrijf(c.id, klantId, { bestemming: { soort: 'tekst', naam: `${merk} Leadbedrijf`, alsLead: true } }, { id: collegaId })
  assert.ok(uit.nieuwBedrijfId && uit.dealId)
  const [lead] = await db.select().from(organizations).where(eq(organizations.id, uit.nieuwBedrijfId!))
  assert.equal(lead!.status, 'lead')
  const [d] = await db.select().from(deals).where(eq(deals.id, uit.dealId!))
  assert.equal(d!.contactId, c.id)
  assert.match(d!.nextAction ?? '', /Kennismaken met Lotte/)
  const [na] = await db.select().from(contacts).where(eq(contacts.id, c.id))
  assert.equal(na!.organizationId, lead!.id)
})

test('vertrekken waar je niet werkt, wordt geweigerd', async () => {
  const c = await createContact({ organizationId: tweedeId, name: 'Iemand Anders', notes: merk })
  await assert.rejects(() => vertrekBijBedrijf(c.id, klantId, { bestemming: { soort: 'onbekend' } }, { id: collegaId }), CrmError)
})
