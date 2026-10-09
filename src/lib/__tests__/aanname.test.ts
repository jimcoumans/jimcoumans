/**
 * Tests voor aannemen: van kandidaat naar collega in één stap.
 *
 * Wat hier vastligt: dat er niets half achterblijft. Een contract dat in geen
 * dossier staat, een paspoortkopie die met de bewaartermijn van de kandidaat
 * wordt gewist, of een OP-toeslag die onderweg verdwijnt.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import {
  users,
  candidates,
  vacancies,
  generatedContracts,
  employmentContracts,
  salaryRecords,
  personalRecords,
  dossierEntries,
  organizations,
} from '../../db/schema'
import { wisKandidaten } from '../werving'
import { stelContractOp, getSjabloon, getWerkgever, listFunctieprofielen, bewaarContract, type ContractInvoer } from '../contracten'
import { neemAan, markeerGetekend, vervolgstappen, werkadresVoorstel, AannameError } from '../aanname'
import { maandlast } from '../kosten'
import { zorgVoorGegevens, maakGegevenslink, gegevensViaLink } from '../persoonsgegevens'
import { jaarloonCents } from '../personeel-labels'

const merk = `aan${Date.now()}`
const gemaakteUsers: string[] = []
const gemaakteKandidaten: string[] = []
const gemaakteVacatures: string[] = []
const gemaakteOrganisaties: string[] = []

const dag = (j: number, m: number, d: number) => new Date(j, m - 1, d, 12, 0, 0)

async function kandidaatMetContract(opties: { soort?: 'proforma' | 'definitief'; vacatureId?: string | null } = {}) {
  const [k] = await db
    .insert(candidates)
    .values({
      name: `${merk} Daan Voncken`,
      firstName: 'Daan',
      lastName: 'Voncken',
      email: `${merk}-prive@example.com`,
      phone: '06 12345678',
      status: 'contract',
      vacancyId: opties.vacatureId ?? null,
    })
    .returning()
  gemaakteKandidaten.push(k!.id)

  const sjabloon = (await getSjabloon('bepaalde_tijd'))!
  const werkgever = (await getWerkgever())!
  const profiel = (await listFunctieprofielen()).find((p) => p.title === 'Marketing Manager')!
  const invoer: ContractInvoer = {
    candidateId: k!.id,
    naam: 'Daniël Matthijs Voncken',
    aanhef: 'heer',
    adres: 'Sint Hubertusstraat 9',
    postcode: '6181 EZ',
    woonplaats: 'Elsloo',
    geboortedatum: dag(1996, 5, 1),
    jobProfileId: profiel.id,
    functie: 'Marketing Manager',
    soort: 'bepaalde_tijd',
    ingangsdatum: dag(2026, 10, 13),
    looptijdMaanden: 7,
    proeftijdMaanden: 1,
    urenPerWeekKwartier: 2400,
    schaalNaam: 'Medior',
    trede: 12,
    brutoMaandCents: 209_559,
    opToeslagCents: 20_956,
    vakantietoeslagBp: 800,
    vakantieUrenFulltime: 200,
    vakantieUren: 120,
  }
  const concept = stelContractOp(invoer, sjabloon, werkgever, profiel)
  const contract = await bewaarContract(invoer, concept, sjabloon, opties.soort ?? 'definitief', null)
  return { kandidaat: k!, contract }
}

before(async () => {
  assert.ok(await getSjabloon('bepaalde_tijd'), 'de migratie hoort een sjabloon neer te zetten')
})

after(async () => {
  await wisKandidaten(gemaakteKandidaten)
  if (gemaakteUsers.length > 0) await db.delete(users).where(inArray(users.id, gemaakteUsers))
  if (gemaakteVacatures.length > 0) await db.delete(vacancies).where(inArray(vacancies.id, gemaakteVacatures))
  if (gemaakteOrganisaties.length > 0) await db.delete(organizations).where(inArray(organizations.id, gemaakteOrganisaties))
  await client.end()
})

test('het voorstel voor een werkadres is de roepnaam, zonder accenten', () => {
  assert.equal(werkadresVoorstel('Daniël'), 'daniel@jamesrobinson.nl')
  assert.equal(werkadresVoorstel('Anne-Fleur'), 'annefleur@jamesrobinson.nl')
  assert.equal(werkadresVoorstel(null), '')
})

test('een pro forma kan niet de basis zijn van een aanname', async () => {
  const { kandidaat, contract } = await kandidaatMetContract({ soort: 'proforma' })
  await assert.rejects(
    neemAan({ kandidaatId: kandidaat.id, contractId: contract.id, werkEmail: `${merk}-pf@jamesrobinson.nl`, doorUserId: null }),
    (e: unknown) => e instanceof AannameError && /pro forma/.test(e.message),
  )
})

test('zonder ondertekening geen aanname', async () => {
  const { kandidaat, contract } = await kandidaatMetContract()
  await assert.rejects(
    neemAan({ kandidaatId: kandidaat.id, contractId: contract.id, werkEmail: `${merk}-ng@jamesrobinson.nl`, doorUserId: null }),
    (e: unknown) => e instanceof AannameError && /getekend/.test(e.message),
  )
})

test('een adres van een klant wordt geen collega', async () => {
  const { kandidaat, contract } = await kandidaatMetContract()
  await markeerGetekend(contract.id, dag(2026, 10, 9))
  const [org] = await db.insert(organizations).values({ name: `${merk} Klant BV`, slug: `${merk}-klant` }).returning()
  gemaakteOrganisaties.push(org!.id)
  const [klant] = await db.insert(users).values({ email: `${merk}-klant@example.com`, role: 'client', organizationId: org!.id }).returning()
  gemaakteUsers.push(klant!.id)
  await assert.rejects(
    neemAan({ kandidaatId: kandidaat.id, contractId: contract.id, werkEmail: klant!.email, doorUserId: null }),
    (e: unknown) => e instanceof AannameError && /klant/.test(e.message),
  )
})

test('aannemen zet alles in een keer goed', async () => {
  const [vacature] = await db.insert(vacancies).values({ title: `${merk} Marketing Manager`, positions: 1, status: 'open' }).returning()
  gemaakteVacatures.push(vacature!.id)
  const { kandidaat, contract } = await kandidaatMetContract({ vacatureId: vacature!.id })
  await db.insert(personalRecords).values({
    candidateId: kandidaat.id,
    officialFirstNames: 'Daniël Matthijs',
    lastName: 'Voncken',
    birthDate: dag(1996, 5, 1),
    addressLine: 'Sint Hubertusstraat 9',
    postalCode: '6181 EZ',
    city: 'Elsloo',
  })
  await markeerGetekend(contract.id, dag(2026, 10, 9))

  const email = `${merk}-daan@jamesrobinson.nl`
  const { userId } = await neemAan({ kandidaatId: kandidaat.id, contractId: contract.id, werkEmail: email, afdeling: 'Marketing', doorUserId: null })
  gemaakteUsers.push(userId)

  const [u] = await db.select().from(users).where(eq(users.id, userId))
  assert.equal(u!.email, email)
  assert.equal(u!.role, 'staff')
  assert.equal(u!.name, 'Daan Voncken')
  assert.equal(u!.jobTitle, 'Marketing Manager')
  assert.equal(u!.department, 'Marketing')
  assert.equal(u!.contractHoursPerWeekQuarters, 2400)
  assert.equal(u!.birthMonth, 5)
  assert.equal(u!.city, 'Elsloo')

  const [ec] = await db.select().from(employmentContracts).where(eq(employmentContracts.userId, userId))
  assert.equal(ec!.type, 'bepaalde_tijd')
  assert.ok(ec!.signedOn, 'de ondertekening gaat mee naar het dossier')

  const [sr] = await db.select().from(salaryRecords).where(eq(salaryRecords.userId, userId))
  assert.equal(sr!.grossMonthlyCents, 209_559)
  assert.equal(sr!.opAllowanceCents, 20_956, 'de OP-toeslag mag onderweg niet verdwijnen')
  assert.match(sr!.reason!, /Medior trede 12/)

  const [gc] = await db.select().from(generatedContracts).where(eq(generatedContracts.id, contract.id))
  assert.equal(gc!.userId, userId)

  const [pr] = await db.select().from(personalRecords).where(eq(personalRecords.userId, userId))
  assert.ok(pr, 'de persoonsgegevens staan bij de collega')
  assert.equal(pr!.candidateId, null, 'en hangen niet meer aan de kandidaat, anders wist de bewaartermijn ze')

  const [k] = await db.select().from(candidates).where(eq(candidates.id, kandidaat.id))
  assert.equal(k!.status, 'aangenomen')
  assert.equal(k!.hiredUserId, userId)
  assert.ok(k!.retentionUntil)

  const [v] = await db.select().from(vacancies).where(eq(vacancies.id, vacature!.id))
  assert.equal(v!.status, 'vervuld', 'een vacature met een plek is na een aanname vol')

  const dossier = await db.select().from(dossierEntries).where(eq(dossierEntries.userId, userId))
  assert.equal(dossier.length, 1)
  assert.match(dossier[0]!.subject, /In dienst als Marketing Manager/)

  // Twee keer aannemen kan niet.
  await assert.rejects(
    neemAan({ kandidaatId: kandidaat.id, contractId: contract.id, werkEmail: email, doorUserId: null }),
    (e: unknown) => e instanceof AannameError,
  )

  // De vervolgstappen zien wat er gedaan is.
  const stappen = await vervolgstappen({ userId })
  const stand = Object.fromEntries(stappen.map((s) => [s.sleutel, s.klaar]))
  assert.equal(stand.contract, true)
  assert.equal(stand.getekend, true)
  assert.equal(stand.aangenomen, true)
  assert.equal(stand.exemplaar, false, 'het getekende exemplaar is nog niet geupload')
  assert.equal(stand.salarisadministratie, false)
})

test('de OP-toeslag telt mee in de kosten, zonder vakantiegeld erover', () => {
  const last = maandlast({ grossMonthlyCents: 200_000, opAllowanceCents: 20_000, holidayAllowancePercent: 8, employerCostPercent: 0, soort: 'loondienst' })
  // 2000 + 200 OP + 8% over 2000 = 2360
  assert.equal(last.totaalCents, 236_000)
  assert.equal(jaarloonCents({ grossMonthlyCents: 200_000, opAllowanceCents: 20_000, holidayAllowancePercent: 8 }), 2_000_00 * 12 + 192_000 + 240_000)
})

test('een pro forma wordt niet getekend', async () => {
  const { contract } = await kandidaatMetContract({ soort: 'proforma' })
  await assert.rejects(markeerGetekend(contract.id, dag(2026, 10, 9)), (e: unknown) => e instanceof AannameError)
})

test('de invullink blijft werken na de aanname', async () => {
  const { kandidaat, contract } = await kandidaatMetContract()
  const record = await zorgVoorGegevens(kandidaat.id)
  const pad = await maakGegevenslink(record.id)
  const [, , id, token] = pad.split('/')
  await markeerGetekend(contract.id, dag(2026, 10, 9))
  const { userId } = await neemAan({ kandidaatId: kandidaat.id, contractId: contract.id, werkEmail: `${merk}-link@jamesrobinson.nl`, doorUserId: null })
  gemaakteUsers.push(userId)
  const via = await gegevensViaLink(id!, token!)
  assert.ok(via, 'wie nog iets moet aanleveren, kan dat na de aanname gewoon doen')
  assert.equal(via!.voornaam, 'Daan')
})
