/**
 * Tests voor het overkoepelende CRM.
 *
 * Wat hier vastligt: een contactpersoon hoort bij een klant OF bij een
 * partner, nooit bij allebei en nooit bij geen van beide. Dat is geen
 * netheid maar noodzaak — een persoon die nergens bij hoort vind je nooit
 * meer terug, want elk overzicht komt via een klant of via een partner
 * binnen.
 *
 * En: een collega staat in dezelfde lijst als de marketingmanager van een
 * klant en de vaste drukker, maar wel met zijn eigen label.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray, sql } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, partners, users } from '../../db/schema'
import { createContact, CrmError, makePrimaryContact } from '../crm'
import { listCrmPersonen, telPerSoort, listPartnerContacten } from '../crm-personen'
import { komendeVerjaardagen } from '../verjaardagen'

const suffix = Date.now()
const merk = `crmp${suffix}`

let orgId: string
let partnerId: string
let tweedePartnerId: string
let collegaId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `${merk}-klant`, name: `${merk} Klant BV`, status: 'client' })
    .returning()
  orgId = org!.id

  const [partner] = await db
    .insert(partners)
    .values({ name: `${merk} Drukkerij`, type: 'printer' })
    .returning()
  partnerId = partner!.id

  const [tweede] = await db
    .insert(partners)
    .values({ name: `${merk} Fotograaf`, type: 'photographer' })
    .returning()
  tweedePartnerId = tweede!.id

  const [collega] = await db
    .insert(users)
    .values({
      email: `${merk}@jamesrobinson.nl`,
      name: 'Sanne de Wit',
      // Het tussenvoegsel apart, zoals splitsNaam het ook doet. Zou 'de Wit'
      // in het achternaamveld staan, dan sorteert Sanne onder de D.
      firstName: 'Sanne',
      infix: 'de',
      lastName: 'Wit',
      role: 'staff',
      jobTitle: 'Marketing manager',
      department: 'Marketing',
    })
    .returning()
  collegaId = collega!.id
})

after(async () => {
  await db.delete(contacts).where(eq(contacts.organizationId, orgId))
  await db.delete(contacts).where(inArray(contacts.partnerId, [partnerId, tweedePartnerId]))
  await db.delete(partners).where(inArray(partners.id, [partnerId, tweedePartnerId]))
  await db.delete(users).where(eq(users.id, collegaId))
  await db.delete(organizations).where(eq(organizations.id, orgId))
  await client.end()
})

test('een contactpersoon kan bij een partner horen', async () => {
  const contact = await createContact({
    partnerId,
    name: 'Ruud Peters',
    firstName: 'Ruud',
    lastName: 'Peters',
    email: `ruud-${merk}@drukkerij.nl`,
    jobTitle: 'Accountmanager',
  })

  assert.equal(contact.partnerId, partnerId)
  assert.equal(contact.organizationId, null)

  const bijPartner = await listPartnerContacten(partnerId)
  assert.equal(bijPartner.length, 1)
  assert.equal(bijPartner[0]!.name, 'Ruud Peters')
})

test('een contactpersoon bij allebei wordt geweigerd', async () => {
  await assert.rejects(
    () => createContact({ organizationId: orgId, partnerId, name: 'Niemand Nergens' }),
    (fout: unknown) => fout instanceof CrmError,
  )
})

test('een contactpersoon bij geen van beide wordt geweigerd', async () => {
  await assert.rejects(
    () => createContact({ name: 'Zwevende Ziel' }),
    (fout: unknown) => fout instanceof CrmError,
  )
})

test('de database weigert het ook als de app het zou doorlaten', async () => {
  // De check in de app is een nettere melding; deze regel bewijst dat het
  // slot eronder zit. Zonder die check zou een script of een handmatige
  // INSERT er alsnog langs kunnen.
  await assert.rejects(() =>
    db.execute(
      sql`INSERT INTO contacts (name) VALUES (${'Rechtstreeks Ingevoegd ' + merk})`,
    ),
  )
})

test('klant, partner en collega staan in één lijst met eigen label', async () => {
  await createContact({
    organizationId: orgId,
    name: 'Marieke van der Voncken',
    firstName: 'Marieke',
    infix: 'van der',
    lastName: 'Voncken',
    jobTitle: 'Eigenaar',
  })

  const mensen = await listCrmPersonen({ zoek: merk })
  // De zoekterm zit in de naam van de klant, de partner en het mailadres van
  // de collega, dus alle drie de bronnen komen langs.
  const soorten = new Set(mensen.map((m) => m.soort))

  assert.ok(soorten.has('klant'), 'klantcontact ontbreekt')
  assert.ok(soorten.has('partner'), 'partnercontact ontbreekt')
  assert.ok(soorten.has('collega'), 'collega ontbreekt')

  const partnerContact = mensen.find((m) => m.soort === 'partner')
  assert.equal(partnerContact?.bijNaam, `${merk} Drukkerij`)

  const collega = mensen.find((m) => m.soort === 'collega')
  assert.equal(collega?.bijNaam, 'Marketing')
  assert.equal(collega?.href, `/beheer/medewerkers/${collegaId}`)
})

test('er wordt op achternaam gesorteerd, niet op het tussenvoegsel', async () => {
  const mensen = await listCrmPersonen({ zoek: merk })
  const namen = mensen.map((m) => m.naam)

  const voncken = namen.indexOf('Marieke van der Voncken')
  const peters = namen.indexOf('Ruud Peters')
  const wit = namen.indexOf('Sanne de Wit')

  assert.ok(voncken >= 0 && peters >= 0 && wit >= 0, 'niet iedereen gevonden')
  // Peters < Voncken < Wit. Zou er op de volledige naam gesorteerd worden,
  // dan stond Marieke bij de M en Sanne bij de S.
  assert.ok(peters < voncken, 'Peters hoort voor Voncken')
  assert.ok(voncken < wit, 'Voncken hoort voor Wit')
})

test('filteren op soort laat alleen die groep zien', async () => {
  const alleen = await listCrmPersonen({ zoek: merk, soort: 'partner' })
  assert.ok(alleen.length > 0)
  assert.ok(alleen.every((m) => m.soort === 'partner'))
})

test('de telling per soort klopt met de lijst', async () => {
  const mensen = await listCrmPersonen({ zoek: merk })
  const telling = telPerSoort(mensen)
  const som = Object.values(telling).reduce((a, b) => a + b, 0)
  assert.equal(som, mensen.length)
})

test('een vaste contactpersoon bij een partner raakt die van een klant niet', async () => {
  const klantContact = await createContact({
    organizationId: orgId,
    name: 'Vaste Klantpersoon',
    isPrimary: true,
  })

  const partnerContact = await createContact({
    partnerId: tweedePartnerId,
    name: 'Vaste Partnerpersoon',
    isPrimary: true,
  })

  // De partner aanwijzen mag de klant niet omzetten. Dat zou gebeuren als de
  // vlag zou worden gewist op "organization_id = NULL", want NULL = NULL
  // levert geen treffer op en dan gaat het stil mis.
  await makePrimaryContact(partnerContact.id)

  const [nog] = await db
    .select({ isPrimary: contacts.isPrimary })
    .from(contacts)
    .where(eq(contacts.id, klantContact.id))

  assert.equal(nog?.isPrimary, true, 'de vaste contactpersoon bij de klant is weggevallen')
})

test('een jarige partnercontact staat in het verjaardagsoverzicht', async () => {
  const morgen = new Date()
  morgen.setDate(morgen.getDate() + 2)

  await createContact({
    partnerId,
    name: 'Jarige Drukker',
    birthDay: morgen.getDate(),
    birthMonth: morgen.getMonth() + 1,
    birthYear: 1980,
  })

  const komend = await komendeVerjaardagen(7)
  const gevonden = komend.find((v) => v.naam === 'Jarige Drukker')

  assert.ok(gevonden, 'de partnercontact ontbreekt in het overzicht')
  assert.equal(gevonden.soort, 'partner')
  assert.equal(gevonden.bij, `${merk} Drukkerij`)
})
