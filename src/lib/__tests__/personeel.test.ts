/**
 * Tests voor het personeelsdossier.
 *
 * Twee dingen zijn hier de moeite waard om te bewaken.
 *
 * Het salaris werkt als het grootboek: je overschrijft niets, je zet er een
 * regel bij met een ingangsdatum. "Wat verdient hij nu" is dan een vraag aan
 * de geschiedenis en niet aan een veld dat iemand vergeten is bij te werken.
 *
 * En de ketenregeling. Die telt tijdelijke contracten en de tijd ertussen, en
 * een fout daarin kost geld: te laat opmerken dat de derde verlenging de
 * vierde was betekent een vast dienstverband dat je niet had gepland.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import {
  users,
  employmentContracts,
  salaryRecords,
  dossierEntries,
  companyAssets,
} from '../../db/schema'
import type { EmploymentContract } from '../../db/schema'
import {
  listContracten,
  addContract,
  ketensignaal,
  listSalarissen,
  huidigSalaris,
  addSalaris,
  verwijderSalaris,
  jaarloonCents,
  listDossier,
  addDossierRegel,
  listMiddelen,
  addMiddel,
  leverMiddelIn,
  openstaandeMiddelen,
  PersoneelError,
} from '../personeel'
import { assertViolatesConstraint } from './helpers'

const suffix = Date.now()
let sennaId: string
let joepId: string

before(async () => {
  const gemaakt = await db
    .insert(users)
    .values([
      { email: `pd-senna-${suffix}@test.nl`, name: `Senna ${suffix}`, role: 'staff' },
      { email: `pd-joep-${suffix}@test.nl`, name: `Joep ${suffix}`, role: 'staff' },
    ])
    .returning()
  sennaId = gemaakt[0]!.id
  joepId = gemaakt[1]!.id
})

after(async () => {
  const ids = [sennaId, joepId]
  await db.delete(companyAssets).where(inArray(companyAssets.userId, ids))
  await db.delete(dossierEntries).where(inArray(dossierEntries.userId, ids))
  await db.delete(salaryRecords).where(inArray(salaryRecords.userId, ids))
  await db.delete(employmentContracts).where(inArray(employmentContracts.userId, ids))
  await db.delete(users).where(inArray(users.id, ids))
  await client.end()
})

/** Een contract zonder database, om de ketentelling los te kunnen voeden. */
function contract(
  type: EmploymentContract['type'],
  van: string,
  tot: string | null,
): EmploymentContract {
  return {
    id: `${van}-${tot}`,
    userId: 'x',
    type,
    startedOn: new Date(`${van}T12:00:00Z`),
    endsOn: tot === null ? null : new Date(`${tot}T12:00:00Z`),
    hoursPerWeekQuarters: 3200,
    jobTitle: null,
    signedOn: null,
    notes: null,
    createdAt: new Date(),
    createdByUserId: null,
  }
}

/* --- De ketenregeling ---------------------------------------------------- */

test('zonder tijdelijke contracten is er geen keten', () => {
  const signaal = ketensignaal([contract('onbepaalde_tijd', '2020-01-01', null)])
  assert.equal(signaal.aantal, 0)
  assert.equal(signaal.stand, 'ruim')
})

test('twee tijdelijke contracten achter elkaar geven nog ruimte', () => {
  const signaal = ketensignaal(
    [
      contract('bepaalde_tijd', '2024-01-01', '2024-12-31'),
      contract('bepaalde_tijd', '2025-01-01', '2025-12-31'),
    ],
    new Date('2025-06-01T12:00:00Z'),
  )
  assert.equal(signaal.aantal, 2)
  assert.equal(signaal.stand, 'ruim')
})

test('het derde contract is het laatste dat nog tijdelijk kan zijn', () => {
  const signaal = ketensignaal(
    [
      contract('bepaalde_tijd', '2024-01-01', '2024-06-30'),
      contract('bepaalde_tijd', '2024-07-01', '2024-12-31'),
      contract('bepaalde_tijd', '2025-01-01', '2025-06-30'),
    ],
    new Date('2025-03-01T12:00:00Z'),
  )
  assert.equal(signaal.aantal, 3)
  assert.equal(signaal.stand, 'laatste', 'hier moet je gaan nadenken')
})

test('een vierde contract gaat over de grens', () => {
  const signaal = ketensignaal(
    [
      contract('bepaalde_tijd', '2023-01-01', '2023-06-30'),
      contract('bepaalde_tijd', '2023-07-01', '2023-12-31'),
      contract('bepaalde_tijd', '2024-01-01', '2024-06-30'),
      contract('bepaalde_tijd', '2024-07-01', '2024-12-31'),
    ],
    new Date('2024-09-01T12:00:00Z'),
  )
  assert.equal(signaal.aantal, 4)
  assert.equal(signaal.stand, 'over')
})

test('boven de 36 maanden gaat het ook over, ook met maar twee contracten', () => {
  const signaal = ketensignaal(
    [
      contract('bepaalde_tijd', '2021-01-01', '2023-01-01'),
      contract('bepaalde_tijd', '2023-01-02', '2024-06-01'),
    ],
    new Date('2024-03-01T12:00:00Z'),
  )
  assert.equal(signaal.aantal, 2)
  assert.ok(signaal.maanden > 36, `keten beslaat ${signaal.maanden} maanden`)
  assert.equal(signaal.stand, 'over')
})

test('een onderbreking van meer dan zes maanden begint een nieuwe keten', () => {
  // Dit is het geval dat je fout wilt hebben: zonder deze regel zou een
  // collega die drie jaar geleden ook al eens bij ons werkte meteen vast zijn.
  const signaal = ketensignaal(
    [
      contract('bepaalde_tijd', '2020-01-01', '2020-12-31'),
      contract('bepaalde_tijd', '2021-01-01', '2021-12-31'),
      contract('bepaalde_tijd', '2022-01-01', '2022-12-31'),
      // Ruim een jaar niets, daarna terug.
      contract('bepaalde_tijd', '2024-06-01', '2025-05-31'),
    ],
    new Date('2024-09-01T12:00:00Z'),
  )
  assert.equal(signaal.aantal, 1, 'alleen het contract na de onderbreking telt')
  assert.equal(signaal.stand, 'ruim')
})

test('een onderbreking van precies een half jaar breekt de keten niet', () => {
  // Zes maanden mag nog; pas MEER dan zes maanden telt als onderbreking.
  const signaal = ketensignaal(
    [
      contract('bepaalde_tijd', '2024-01-01', '2024-03-31'),
      contract('bepaalde_tijd', '2024-09-15', '2025-03-31'),
    ],
    new Date('2024-12-01T12:00:00Z'),
  )
  assert.equal(signaal.aantal, 2, 'het gat is net geen zeven maanden')
})

test('stage en zzp tellen niet mee in de keten', () => {
  // Andere overeenkomsten, andere regels. Ze meetellen zou een vals alarm
  // geven bij elke stagiair die blijft.
  const signaal = ketensignaal([
    contract('stage', '2023-01-01', '2023-06-30'),
    contract('zzp', '2023-07-01', '2023-12-31'),
    contract('bepaalde_tijd', '2024-01-01', '2024-12-31'),
  ])
  assert.equal(signaal.aantal, 1)
})

/* --- Contracten in de database ------------------------------------------- */

test('een contract voor onbepaalde tijd met einddatum wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      addContract({
        userId: sennaId,
        type: 'onbepaalde_tijd',
        startedOn: new Date('2024-01-01T12:00:00Z'),
        endsOn: new Date('2025-01-01T12:00:00Z'),
        hoursPerWeekQuarters: 3200,
        jobTitle: null,
        signedOn: null,
        notes: null,
      }),
    (f: Error) => f instanceof PersoneelError && /onbepaalde tijd/.test(f.message),
  )
})

test('ook de database weigert dat, als iemand de app omzeilt', async () => {
  await assertViolatesConstraint(
    () =>
      db.insert(employmentContracts).values({
        userId: sennaId,
        type: 'onbepaalde_tijd',
        startedOn: new Date('2024-01-01T12:00:00Z'),
        endsOn: new Date('2025-01-01T12:00:00Z'),
      }),
    'contract_permanent_has_no_end',
  )
})

test('contracten komen op volgorde terug, nieuwste eerst', async () => {
  await addContract({
    userId: sennaId,
    type: 'bepaalde_tijd',
    startedOn: new Date('2023-01-01T12:00:00Z'),
    endsOn: new Date('2023-12-31T12:00:00Z'),
    hoursPerWeekQuarters: 3200,
    jobTitle: 'Marketing manager',
    signedOn: null,
    notes: null,
  })
  await addContract({
    userId: sennaId,
    type: 'bepaalde_tijd',
    startedOn: new Date('2024-01-01T12:00:00Z'),
    endsOn: new Date('2024-12-31T12:00:00Z'),
    hoursPerWeekQuarters: 3650,
    jobTitle: 'Marketing manager',
    signedOn: null,
    notes: null,
  })

  const lijst = await listContracten(sennaId)
  assert.equal(lijst.length, 2)
  assert.equal(lijst[0]!.startedOn.getUTCFullYear(), 2024, 'nieuwste bovenaan')

  const signaal = ketensignaal(lijst, new Date('2024-06-01T12:00:00Z'))
  assert.equal(signaal.aantal, 2)
})

/* --- Salaris ------------------------------------------------------------- */

test('het huidige salaris is de laatste regel die al is ingegaan', async () => {
  await addSalaris({
    userId: sennaId,
    grossMonthlyCents: 320_000,
    basedOnHoursQuarters: 3200,
    holidayAllowancePercent: 8,
    effectiveFrom: new Date('2023-01-01T12:00:00Z'),
    reason: 'Indiensttreding',
  })
  await addSalaris({
    userId: sennaId,
    grossMonthlyCents: 355_000,
    basedOnHoursQuarters: 3200,
    holidayAllowancePercent: 8,
    effectiveFrom: new Date('2024-01-01T12:00:00Z'),
    reason: 'Periodieke verhoging',
  })

  const nu = await huidigSalaris(sennaId, new Date('2024-06-01T12:00:00Z'))
  assert.equal(nu!.grossMonthlyCents, 355_000)

  const toen = await huidigSalaris(sennaId, new Date('2023-06-01T12:00:00Z'))
  assert.equal(toen!.grossMonthlyCents, 320_000, 'vorig jaar gold het oude bedrag')
})

test('een verhoging die nog moet ingaan telt vandaag nog niet', async () => {
  // Zo kun je een afspraak vooruit invoeren zonder dat het scherm vandaag
  // iets laat zien wat nog niet waar is.
  await addSalaris({
    userId: sennaId,
    grossMonthlyCents: 390_000,
    basedOnHoursQuarters: 3200,
    holidayAllowancePercent: 8,
    effectiveFrom: new Date('2026-07-01T12:00:00Z'),
    reason: 'Promotie',
  })

  const nu = await huidigSalaris(sennaId, new Date('2026-01-15T12:00:00Z'))
  assert.equal(nu!.grossMonthlyCents, 355_000, 'de promotie gaat pas in juli in')

  const straks = await huidigSalaris(sennaId, new Date('2026-08-01T12:00:00Z'))
  assert.equal(straks!.grossMonthlyCents, 390_000)
})

test('twee salarissen op dezelfde ingangsdatum kan niet', async () => {
  // Dan is niet te zeggen welke geldt, en kiest een query er willekeurig een.
  await assertViolatesConstraint(
    () =>
      db.insert(salaryRecords).values({
        userId: sennaId,
        grossMonthlyCents: 400_000,
        effectiveFrom: new Date('2024-01-01T12:00:00Z'),
      }),
    'salary_records_user_date_idx',
  )
})

test('een salaris van nul of minder wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      addSalaris({
        userId: joepId,
        grossMonthlyCents: 0,
        basedOnHoursQuarters: null,
        holidayAllowancePercent: 8,
        effectiveFrom: new Date('2024-01-01T12:00:00Z'),
        reason: null,
      }),
    (f: Error) => f instanceof PersoneelError,
  )
})

test('een salarisregel mag weg, want het is een afspraak en geen uitbetaling', async () => {
  const regels = await listSalarissen(sennaId)
  const promotie = regels.find((r) => r.reason === 'Promotie')!

  await verwijderSalaris(promotie.id)

  const na = await listSalarissen(sennaId)
  assert.equal(na.length, regels.length - 1)
})

test('het jaarloon telt het vakantiegeld mee', () => {
  assert.equal(
    jaarloonCents({ grossMonthlyCents: 300_000, holidayAllowancePercent: 8 }),
    3_888_000,
    '36.000 plus 8 procent is 38.880',
  )
  assert.equal(
    jaarloonCents({ grossMonthlyCents: 300_000, holidayAllowancePercent: 0 }),
    3_600_000,
  )
})

/* --- Dossier ------------------------------------------------------------- */

test('een dossierregel onthoudt wie hem heeft geschreven', async () => {
  await addDossierRegel({
    userId: joepId,
    kind: 'gesprek',
    subject: 'Functioneringsgesprek',
    body: 'Goed jaar gedraaid.',
    happenedOn: new Date('2026-02-10T12:00:00Z'),
    createdByUserId: sennaId,
  })

  const dossier = await listDossier(joepId)
  assert.equal(dossier.length, 1)
  assert.equal(dossier[0]!.subject, 'Functioneringsgesprek')
  assert.match(dossier[0]!.doorWie ?? '', /Senna/)
})

test('een dossierregel zonder titel wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      addDossierRegel({
        userId: joepId,
        kind: 'overig',
        subject: '   ',
        body: 'wel een tekst',
        happenedOn: new Date(),
      }),
    (f: Error) => f instanceof PersoneelError,
  )
})

/* --- Bedrijfsmiddelen ---------------------------------------------------- */

test('een uitgegeven middel staat open tot het is ingeleverd', async () => {
  const middel = await addMiddel({
    userId: joepId,
    kind: 'laptop',
    label: 'MacBook Pro 14, 2023',
    serial: 'C02XY',
    handedOutOn: new Date('2024-03-01T12:00:00Z'),
    notes: null,
  })

  let open = await openstaandeMiddelen(joepId)
  assert.equal(open.length, 1, 'hij heeft de laptop nog')

  await leverMiddelIn(middel.id, new Date('2026-01-31T12:00:00Z'))

  open = await openstaandeMiddelen(joepId)
  assert.equal(open.length, 0)

  const alles = await listMiddelen(joepId)
  assert.equal(alles.length, 1, 'ingeleverd is niet hetzelfde als weg')
  assert.ok(alles[0]!.returnedOn)
})

test('inleveren voor de uitgifte kan niet', async () => {
  const middel = await addMiddel({
    userId: joepId,
    kind: 'telefoon',
    label: 'iPhone 15',
    serial: null,
    handedOutOn: new Date('2025-01-01T12:00:00Z'),
    notes: null,
  })

  await assert.rejects(
    () => leverMiddelIn(middel.id, new Date('2024-01-01T12:00:00Z')),
    (f: Error) => f instanceof PersoneelError,
  )
})
