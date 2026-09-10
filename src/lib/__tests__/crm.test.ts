/**
 * Tests voor het CRM-deel: contactpersonen, partners en het accountregister.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, partners, organizationPartners, accounts } from '../../db/schema'
import {
  listContacts, createContact, makePrimaryContact, deleteContact,
  listPartners, createPartner, linkPartner, unlinkPartner,
  listPartnersForOrganization, listOrganizationsForPartner,
  listAccounts, createAccount,
  updateOrganizationDetails, getCrmCounts,
} from '../crm'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let orgA: string
let orgB: string
let fotograafId: string

before(async () => {
  const [a] = await db.insert(organizations).values({ slug: `crm-a-${suffix}`, name: `CRM Klant A ${suffix}` }).returning()
  orgA = a!.id
  const [b] = await db.insert(organizations).values({ slug: `crm-b-${suffix}`, name: `CRM Klant B ${suffix}` }).returning()
  orgB = b!.id
})

after(async () => {
  await db.delete(organizations).where(inArray(organizations.id, [orgA, orgB]))
  await db.delete(partners).where(eq(partners.id, fotograafId))
  await client.end()
})

/* ---------------------------- Contactpersonen --------------------------- */

test('een contactpersoon wordt aan een bedrijf gekoppeld', async () => {
  const c = await createContact({
    organizationId: orgA,
    name: 'Marieke Voncken',
    jobTitle: 'Eigenaar',
    email: 'Marieke@Voncken.NL',
    phone: '043 123 45 67',
    isPrimary: true,
  })

  assert.equal(c.organizationId, orgA)
  assert.equal(c.jobTitle, 'Eigenaar')
  assert.equal(c.email, 'marieke@voncken.nl', 'e-mail wordt genormaliseerd')
  assert.equal(c.isPrimary, true)
})

test('een tweede contactpersoon kan erbij, zonder de vaste te zijn', async () => {
  await createContact({ organizationId: orgA, name: 'Peter Janssen', jobTitle: 'Bedrijfsleider' })
  const lijst = await listContacts(orgA)

  assert.equal(lijst.length, 2)
  assert.equal(lijst[0]!.name, 'Marieke Voncken', 'de vaste contactpersoon staat bovenaan')
  assert.equal(lijst.filter((c) => c.isPrimary).length, 1)
})

test('een nieuwe vaste contactpersoon vervangt de vorige', async () => {
  // Zonder deze afhandeling zou de unieke index de invoer weigeren en moest
  // je eerst de oude omzetten, wat niemand onthoudt.
  await createContact({ organizationId: orgA, name: 'Sanne de Wit', isPrimary: true })

  const lijst = await listContacts(orgA)
  const vast = lijst.filter((c) => c.isPrimary)

  assert.equal(vast.length, 1, 'er is er precies één vast')
  assert.equal(vast[0]!.name, 'Sanne de Wit')
})

test('makePrimaryContact verplaatst de rol', async () => {
  const lijst = await listContacts(orgA)
  const peter = lijst.find((c) => c.name === 'Peter Janssen')!

  await makePrimaryContact(peter.id)

  const na = await listContacts(orgA)
  assert.equal(na.filter((c) => c.isPrimary).length, 1)
  assert.equal(na.find((c) => c.isPrimary)!.name, 'Peter Janssen')
})

test('de database weigert twee vaste contactpersonen bij dezelfde klant', async () => {
  // Ook als iemand createContact omzeilt.
  await assertViolatesConstraint(
    () => db.insert(contacts).values({ organizationId: orgA, name: 'Tweede vaste', isPrimary: true }),
    'contacts_one_primary_idx',
  )
})

test('twee klanten hebben elk hun eigen vaste contactpersoon', async () => {
  await createContact({ organizationId: orgB, name: 'Rob Damen', isPrimary: true })

  assert.equal((await listContacts(orgA)).filter((c) => c.isPrimary).length, 1)
  assert.equal((await listContacts(orgB)).filter((c) => c.isPrimary).length, 1)
})

test('meerdere mensen mogen de facturen ontvangen', async () => {
  await createContact({ organizationId: orgB, name: 'Boekhouding Damen', receivesInvoices: true })
  await createContact({ organizationId: orgB, name: 'Extern kantoor', receivesInvoices: true })

  const facturatie = (await listContacts(orgB)).filter((c) => c.receivesInvoices)
  assert.equal(facturatie.length, 2, 'hier geldt geen beperking van één')
})

test('een contactpersoon kan verwijderd worden', async () => {
  const lijst = await listContacts(orgB)
  const extern = lijst.find((c) => c.name === 'Extern kantoor')!

  await deleteContact(extern.id)
  assert.ok(!(await listContacts(orgB)).some((c) => c.id === extern.id))
})

test('contactpersonen verdwijnen met de klant mee', async () => {
  const [tijdelijk] = await db
    .insert(organizations)
    .values({ slug: `weg-${suffix}`, name: 'Weg BV' })
    .returning()
  await createContact({ organizationId: tijdelijk!.id, name: 'Iemand' })

  await db.delete(organizations).where(eq(organizations.id, tijdelijk!.id))

  const over = await db.select().from(contacts).where(eq(contacts.organizationId, tijdelijk!.id))
  assert.deepEqual(over, [], 'geen contactpersonen zonder bedrijf')
})

/* ------------------------------- Partners ------------------------------- */

test('een partner wordt aangemaakt met tariefafspraken', async () => {
  const p = await createPartner({
    name: `Studio Lens ${suffix}`,
    type: 'photographer',
    contactName: 'Tom Lens',
    email: 'tom@studiolens.nl',
    hourlyRateCents: 9500,
    dayRateCents: 65000,
    paymentTermDays: 30,
    agreementNotes: 'Reiskosten binnen Limburg inbegrepen. Nabewerking per uur.',
  })
  fotograafId = p.id

  assert.equal(p.hourlyRateCents, 9500)
  assert.equal(p.dayRateCents, 65000)
  assert.equal(p.paymentTermDays, 30)
  assert.ok(p.agreementNotes?.includes('Reiskosten'))
})

test('de database weigert een tarief van nul of negatief', async () => {
  await assertViolatesConstraint(
    () => db.insert(partners).values({ name: 'Gratis', type: 'other', hourlyRateCents: 0 }),
    'partner_hourly_positive',
  )
  await assertViolatesConstraint(
    () => db.insert(partners).values({ name: 'Negatief', type: 'other', dayRateCents: -100 }),
    'partner_day_positive',
  )
})

test('een partner wordt aan een klant gekoppeld met een rol', async () => {
  await linkPartner({
    organizationId: orgA,
    partnerId: fotograafId,
    role: 'Huisfotograaf',
    since: new Date(2024, 2, 1),
  })

  const links = await listPartnersForOrganization(orgA)
  assert.equal(links.length, 1)
  assert.equal(links[0]!.role, 'Huisfotograaf')
  assert.equal(links[0]!.partner.name, `Studio Lens ${suffix}`)
})

test('zonder afwijkend tarief geldt het standaardtarief van de partner', async () => {
  const links = await listPartnersForOrganization(orgA)
  assert.equal(links[0]!.effectiveHourlyRateCents, 9500)
})

test('een afwijkend tarief voor één klant overschrijft het standaardtarief', async () => {
  await linkPartner({
    organizationId: orgB,
    partnerId: fotograafId,
    role: 'Fotograaf woningpresentaties',
    customHourlyRateCents: 8000,
  })

  const bijB = await listPartnersForOrganization(orgB)
  assert.equal(bijB[0]!.effectiveHourlyRateCents, 8000, 'de klantafspraak geldt')

  const bijA = await listPartnersForOrganization(orgA)
  assert.equal(bijA[0]!.effectiveHourlyRateCents, 9500, 'en raakt de andere klant niet')
})

test('dezelfde partner kan niet twee keer aan dezelfde klant hangen', async () => {
  // Anders weet niemand welke afspraak geldt.
  await assertViolatesConstraint(
    () => db.insert(organizationPartners).values({
      organizationId: orgA, partnerId: fotograafId, role: 'Nogmaals fotograaf',
    }),
    'org_partners_pair_idx',
  )
})

test('vanuit de partner is te zien bij welke klanten hij hoort', async () => {
  const klanten = await listOrganizationsForPartner(fotograafId)
  assert.equal(klanten.length, 2)
  assert.ok(klanten.some((k) => k.link.role === 'Huisfotograaf'))
})

test('het partneroverzicht telt hoeveel klanten een partner heeft', async () => {
  const lijst = await listPartners()
  const lens = lijst.find((p) => p.id === fotograafId)!
  assert.equal(lens.clientCount, 2)
})

test('een koppeling kan losgemaakt worden zonder de partner te verwijderen', async () => {
  const links = await listPartnersForOrganization(orgB)
  await unlinkPartner(links[0]!.id)

  assert.equal((await listPartnersForOrganization(orgB)).length, 0)
  const nog = await db.select().from(partners).where(eq(partners.id, fotograafId))
  assert.equal(nog.length, 1, 'de partner zelf blijft bestaan')
})

/* ---------------------------- Accountregister --------------------------- */

test('een account wordt vastgelegd zonder wachtwoord', async () => {
  const a = await createAccount({
    organizationId: orgA,
    name: 'WordPress admin',
    system: 'WordPress',
    url: 'https://hotelvoncken.nl/wp-admin',
    loginHint: 'marketing@hotelvoncken.nl',
    owner: 'client',
    vaultReference: '1Password → Klanten → Hotel Voncken → WordPress',
    hasMfa: true,
    mfaNotes: 'Code loopt via de telefoon van Marieke.',
  })

  assert.equal(a.name, 'WordPress admin')
  assert.equal(a.hasMfa, true)
  assert.ok(a.vaultReference?.includes('1Password'))

  // De kern van de afspraak: er is geen veld om een wachtwoord in te zetten.
  assert.ok(!('password' in a), 'een account heeft geen wachtwoordveld')
  assert.ok(!('secret' in a), 'en ook geen geheimveld')
})

test('accounts staan op volgorde met de actieve bovenaan', async () => {
  await createAccount({ organizationId: orgA, name: 'Google Ads', system: 'Google Ads', owner: 'agency' })
  await db.insert(accounts).values({ organizationId: orgA, name: 'Oude webshop', active: false })

  const lijst = await listAccounts(orgA)
  assert.equal(lijst.length, 3)
  assert.equal(lijst.at(-1)!.name, 'Oude webshop', 'inactief onderaan')
})

test('accounts verdwijnen met de klant mee', async () => {
  const [tijdelijk] = await db
    .insert(organizations)
    .values({ slug: `acc-weg-${suffix}`, name: 'Account Weg BV' })
    .returning()
  await createAccount({ organizationId: tijdelijk!.id, name: 'Iets' })

  await db.delete(organizations).where(eq(organizations.id, tijdelijk!.id))
  const over = await db.select().from(accounts).where(eq(accounts.organizationId, tijdelijk!.id))
  assert.deepEqual(over, [])
})

/* --------------------------- Bedrijfsgegevens --------------------------- */

test('bedrijfsgegevens worden opgeslagen', async () => {
  await updateOrganizationDetails(orgA, {
    status: 'client',
    industry: 'Horeca',
    kvkNumber: '14012345',
    vatNumber: 'NL001234567B01',
    website: 'https://hotelvoncken.nl',
    city: 'Valkenburg',
    postalCode: '6301 AA',
    clientSince: new Date(2021, 5, 1),
  })

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgA))
  assert.equal(org!.industry, 'Horeca')
  assert.equal(org!.kvkNumber, '14012345')
  assert.equal(org!.city, 'Valkenburg')
  assert.equal(org!.country, 'Nederland', 'het land staat standaard op Nederland')
  assert.ok(org!.clientSince instanceof Date)
})

test('een lege wijziging laat bestaande gegevens staan', async () => {
  await updateOrganizationDetails(orgA, { phone: '043 601 22 38' })

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgA))
  assert.equal(org!.phone, '043 601 22 38')
  assert.equal(org!.industry, 'Horeca', 'de branche is niet leeggemaakt')
  assert.equal(org!.kvkNumber, '14012345')
})

test('de aantallen per klant kloppen', async () => {
  const counts = await getCrmCounts([orgA, orgB])
  const a = counts.get(orgA)!

  assert.equal(a.contacts, (await listContacts(orgA)).length)
  assert.equal(a.partners, 1)
  assert.equal(a.accounts, 3)

  const b = counts.get(orgB)!
  assert.equal(b.partners, 0, 'de koppeling is losgemaakt')
})
