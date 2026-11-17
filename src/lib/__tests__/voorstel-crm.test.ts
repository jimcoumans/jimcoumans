/**
 * Tests voor de koppeling tussen een voorstel en het CRM. Drie dingen moeten
 * vastliggen: een bestaand bedrijf wordt gevonden in plaats van dubbel
 * aangemaakt (hoofdletters maken niet uit), een nieuw bedrijf wordt prospect,
 * en wat al in het CRM staat wordt aangevuld, nooit overschreven.
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, contacts, competitors, organizationGoals, organizationAudiences, activities } from '../../db/schema'
import { aanvulling, isMobiel, koppelAanCrm } from '../voorstel-crm'

const suffix = Date.now()
const orgs: string[] = []

after(async () => {
  if (orgs.length) await db.delete(organizations).where(inArray(organizations.id, orgs))
  await client.end()
})

test('aanvulling: alleen lege velden, niets overschrijven', () => {
  assert.deepEqual(aanvulling({ city: 'Hulsberg', website: null }, { city: 'Maastricht', website: 'flint.nl' }), { website: 'flint.nl' })
  assert.deepEqual(aanvulling({ city: '' }, { city: '  ' }), {})
})

test('mobiel of vast nummer', () => {
  assert.equal(isMobiel('06 12 34 56 78'), true)
  assert.equal(isMobiel('+31 6 12345678'), true)
  assert.equal(isMobiel('045 792 0009'), false)
})

test('bestaand bedrijf wordt gevonden, contactpersoon aangemaakt, niets overschreven', async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `vc-${suffix}`, name: `Wijnhuis Koppel ${suffix}`, status: 'lead', website: 'https://bestaand.nl' })
    .returning()
  orgs.push(org!.id)

  const k = await koppelAanCrm({
    bedrijf: { naam: `wijnhuis koppel ${suffix}`, plaats: 'Valkenburg', website: 'https://nieuw.nl' },
    contact: { naam: 'Sanne de Vries', functie: 'Eigenaar', email: 'Sanne@Voorbeeld.nl', telefoon: '06 12 34 56 78' },
  })
  assert.equal(k.organizationId, org!.id)
  assert.equal(k.nieuwBedrijf, false)
  assert.equal(k.nieuwContact, true)

  const [na] = await db.select().from(organizations).where(eq(organizations.id, org!.id))
  assert.equal(na!.website, 'https://bestaand.nl', 'website blijft staan')
  assert.equal(na!.city, 'Valkenburg', 'lege plaats is aangevuld')
  assert.equal(na!.status, 'lead', 'status verandert niet')

  const [c] = await db.select().from(contacts).where(eq(contacts.id, k.contactId!))
  assert.equal(c!.firstName, 'Sanne')
  assert.equal(c!.infix, 'de')
  assert.equal(c!.lastName, 'Vries')
  assert.equal(c!.email, 'sanne@voorbeeld.nl')
  assert.equal(c!.mobile, '06 12 34 56 78')
  assert.equal(c!.isPrimary, true, 'eerste contactpersoon wordt de vaste')

  // Nog een keer koppelen: dezelfde contactpersoon, niets dubbel.
  const k2 = await koppelAanCrm({
    organizationId: k.organizationId,
    bedrijf: { naam: `Wijnhuis Koppel ${suffix}` },
    contact: { naam: 'Sanne de Vries', email: 'sanne@voorbeeld.nl', functie: 'Directeur' },
  })
  assert.equal(k2.contactId, k.contactId)
  assert.equal(k2.nieuwContact, false)
  const alle = await db.select().from(contacts).where(eq(contacts.organizationId, org!.id))
  assert.equal(alle.length, 1)
  assert.equal(alle[0]!.jobTitle, 'Eigenaar', 'functie wordt niet overschreven')
})

test('onbekend bedrijf wordt aangemaakt als prospect', async () => {
  const k = await koppelAanCrm({ bedrijf: { naam: `Nieuw Bedrijf ${suffix}` }, contact: null })
  orgs.push(k.organizationId)
  assert.equal(k.nieuwBedrijf, true)
  assert.equal(k.contactId, null)
  const [org] = await db.select().from(organizations).where(eq(organizations.id, k.organizationId))
  assert.equal(org!.status, 'prospect')
})

test('zonder bedrijfsnaam geen koppeling', async () => {
  await assert.rejects(() => koppelAanCrm({ bedrijf: { naam: '  ' } }), /bedrijfsnaam/)
})

test('een eerdere koppeling geldt niet meer als de naam is veranderd', async () => {
  const eerst = await koppelAanCrm({ bedrijf: { naam: `Half ${suffix}` }, contact: { naam: 'Lars' } })
  orgs.push(eerst.organizationId)
  const daarna = await koppelAanCrm({
    organizationId: eerst.organizationId,
    contactId: eerst.contactId,
    bedrijf: { naam: `Half Getypt ${suffix}` },
    contact: { naam: 'Lars Huijdts' },
  })
  orgs.push(daarna.organizationId)
  assert.notEqual(daarna.organizationId, eerst.organizationId)
  assert.equal(daarna.contactNaam, 'Lars Huijdts')
})

test('profiel: velden aanvullen, lijsten toevoegen zonder dubbelen, notitie bijwerken', async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `vp-${suffix}`, name: `Profiel ${suffix}`, status: 'prospect', industry: 'Horeca' })
    .returning()
  orgs.push(org!.id)
  await db.insert(competitors).values({ organizationId: org!.id, name: 'Bestaande Concurrent' })

  const profiel = {
    branche: 'Retail',
    straat: 'Hoofdstraat 1',
    instagram: 'https://instagram.com/profiel',
    medewerkers: '12',
    hoofddoel: 'omzet',
    bron: 'referral',
    regio: 'Zuid-Limburg',
    lijsten: {
      doelgroep: 'Liefhebbers tussen 35 en 65',
      concurrenten: [{ naam: 'bestaande concurrent' }, { naam: 'Nieuwe Concurrent', website: 'https://nieuw.example' }],
      doelen: ['Fase 1: € 12.000 omzet per maand, binnen 6 maanden', 'Hogere orderwaarde'],
    },
    notitie: { onderwerp: 'Voorstel: intake en plan', tekst: 'Eerste versie' },
  }
  const k = await koppelAanCrm({ bedrijf: { naam: `Profiel ${suffix}` }, contact: null, profiel })

  const [na] = await db.select().from(organizations).where(eq(organizations.id, org!.id))
  assert.equal(na!.industry, 'Horeca', 'branche blijft staan')
  assert.equal(na!.addressLine, 'Hoofdstraat 1')
  assert.equal(na!.instagramUrl, 'https://instagram.com/profiel')
  assert.equal(na!.employeeCount, 12)
  assert.equal(na!.mainGoal, 'omzet')
  assert.equal(na!.leadSource, 'referral')

  const conc = await db.select().from(competitors).where(eq(competitors.organizationId, org!.id))
  assert.equal(conc.length, 2, 'bestaande concurrent niet dubbel')
  const doelen = await db.select().from(organizationGoals).where(eq(organizationGoals.organizationId, org!.id))
  assert.equal(doelen.length, 2)
  const groepen = await db.select().from(organizationAudiences).where(eq(organizationAudiences.organizationId, org!.id))
  assert.equal(groepen.length, 1)
  assert.equal(groepen[0]!.description, 'Liefhebbers tussen 35 en 65')

  // Tweede keer: zelfde lijsten, bijgewerkte notitie. Niets dubbel, notitie bijgewerkt.
  const k2 = await koppelAanCrm({
    organizationId: k.organizationId,
    bedrijf: { naam: `Profiel ${suffix}` },
    profiel: { ...profiel, notitie: { onderwerp: 'Voorstel: intake en plan', tekst: 'Tweede versie', id: k.notitieId } },
  })
  assert.equal(k2.notitieId, k.notitieId)
  const notities = await db.select().from(activities).where(eq(activities.organizationId, org!.id))
  assert.equal(notities.length, 1)
  assert.equal(notities[0]!.body, 'Tweede versie')
  assert.equal((await db.select().from(organizationGoals).where(eq(organizationGoals.organizationId, org!.id))).length, 2)
})
