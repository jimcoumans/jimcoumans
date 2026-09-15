/**
 * Tests voor het medewerkerprofiel.
 *
 * Twee dingen zijn hier de moeite van het bewaken waard. Ten eerste: het
 * portfolio van een collega telt alleen wat hij DRAAGT — waar hij eerste
 * aanspreekpartner is. Meekijken bij een klant van een ander is geen
 * portfolio, anders telt dezelfde omzet twee keer.
 *
 * Ten tweede: contracturen worden in kwartieren opgeslagen. 36,5 uur is geen
 * rond getal en een kommagetal in de database gaat een keer mis; 3650
 * kwartieren gaat nooit mis.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq, inArray } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, subscriptions, wallets, organizationOwners } from '../../db/schema'
import {
  listTeam,
  getTeamlid,
  updateTeamlid,
  setHourlyCost,
  teamVerjaardagenInMaand,
  teamJubileaInMaand,
  formatContractUren,
  parseContractUren,
  TeamError,
} from '../team'
import { addOwner } from '../crm-owners'

const suffix = Date.now()
let dragenId: string
let meekijkenId: string
let sennaId: string
let joepId: string

async function klantMetAbonnement(naam: string, maandCents: number): Promise<string> {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `tm-${naam}-${suffix}`, name: `${naam} ${suffix}`, status: 'client' })
    .returning()

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Marketing' })
    .returning()

  await db.insert(subscriptions).values({
    organizationId: org!.id,
    walletId: wallet!.id,
    name: 'Marketingpartnership',
    amountExclVatCents: maandCents,
    status: 'active',
    billingDay: 2,
    startedOn: new Date('2026-01-02T12:00:00Z'),
  })

  return org!.id
}

before(async () => {
  dragenId = await klantMetAbonnement('Dragen', 850_000)
  meekijkenId = await klantMetAbonnement('Meekijken', 250_000)

  const gemaakt = await db
    .insert(users)
    .values([
      { email: `senna-${suffix}@test.nl`, name: `Senna ${suffix}`, role: 'staff' },
      { email: `joep-${suffix}@test.nl`, name: `Joep ${suffix}`, role: 'staff' },
    ])
    .returning()
  sennaId = gemaakt[0]!.id
  joepId = gemaakt[1]!.id
})

after(async () => {
  const orgIds = [dragenId, meekijkenId]
  await db.delete(subscriptions).where(inArray(subscriptions.organizationId, orgIds))
  await db.delete(organizationOwners).where(inArray(organizationOwners.organizationId, orgIds))
  await db.delete(wallets).where(inArray(wallets.organizationId, orgIds))
  await db.delete(organizations).where(inArray(organizations.id, orgIds))
  await db.delete(users).where(inArray(users.id, [sennaId, joepId]))
  await client.end()
})

/* --- Contracturen -------------------------------------------------------- */

test('contracturen gaan heen en weer zonder af te ronden', () => {
  assert.equal(parseContractUren('32'), 3200)
  assert.equal(parseContractUren('36,5'), 3650)
  assert.equal(parseContractUren('36.5'), 3650)
  assert.equal(formatContractUren(3650), '36,5 uur')
  assert.equal(formatContractUren(3200), '32 uur')
  assert.equal(formatContractUren(null), null)
})

test('onmogelijke contracturen worden niet opgeslagen', () => {
  // Leeg is "niet ingevuld", niet nul.
  assert.equal(parseContractUren(''), null)
  assert.equal(parseContractUren('   '), null)
  // Nul uur per week is geen contract, en 90 uur is een typefout.
  assert.equal(parseContractUren('0'), null)
  assert.equal(parseContractUren('-8'), null)
  assert.equal(parseContractUren('90'), null)
  assert.equal(parseContractUren('vier'), null)
})

/* --- Het profiel --------------------------------------------------------- */

test('een profiel bewaart alles wat je invult', async () => {
  await updateTeamlid(sennaId, {
    name: `Senna ${suffix}`,
    jobTitle: 'Marketing manager',
    department: 'Marketing',
    phone: '045 123 45 67',
    mobile: '06 12 34 56 78',
    linkedinUrl: 'https://www.linkedin.com/in/senna',
    birthDay: 14,
    birthMonth: 3,
    birthYear: 1995,
    startedOn: new Date('2021-09-01T12:00:00Z'),
    contractHoursPerWeekQuarters: 3650,
    notes: 'Werkt op woensdag niet.',
  })

  const detail = await getTeamlid(sennaId)
  assert.ok(detail)
  assert.equal(detail!.lid.jobTitle, 'Marketing manager')
  assert.equal(detail!.lid.department, 'Marketing')
  assert.equal(detail!.lid.mobile, '06 12 34 56 78')
  assert.equal(detail!.lid.birthDay, 14)
  assert.equal(detail!.lid.contractHoursPerWeekQuarters, 3650)
  assert.equal(detail!.lid.notes, 'Werkt op woensdag niet.')
})

test('een leeg veld wist wat er stond, in plaats van het te laten staan', async () => {
  // Zonder dit blijft een oud telefoonnummer staan nadat je het hebt
  // weggehaald, en bel je iemand die daar niet meer zit.
  await updateTeamlid(sennaId, { name: `Senna ${suffix}`, phone: '   ' })

  const detail = await getTeamlid(sennaId)
  assert.equal(detail!.lid.phone, null)
  assert.equal(detail!.lid.jobTitle, null, 'een veld dat je niet meestuurt telt ook als leeg')
})

test('een onbekende collega wijzigen geeft een leesbare fout', async () => {
  await assert.rejects(
    () => updateTeamlid('00000000-0000-0000-0000-000000000000', { name: 'Niemand' }),
    (f: Error) => f instanceof TeamError && /niet gevonden/i.test(f.message),
  )
})

test('een verjaardag zonder maand wordt door de database geweigerd', async () => {
  // Een dag zonder maand zegt niets, dus dat mag er niet in staan.
  await assert.rejects(() =>
    updateTeamlid(joepId, { name: `Joep ${suffix}`, birthDay: 9, birthMonth: null }),
  )
})

/* --- Wat iemand draagt --------------------------------------------------- */

test('alleen wat je draagt telt mee in je portfolio', async () => {
  await addOwner({ organizationId: dragenId, userId: sennaId, role: 'Marketing manager' })
  // De tweede klant krijgt eerst Joep als eerste aanspreekpartner; Senna kijkt
  // daar alleen mee. Anders zou de eerste die erbij komt vanzelf primair zijn.
  await addOwner({ organizationId: meekijkenId, userId: joepId, role: 'Marketing manager' })
  await addOwner({ organizationId: meekijkenId, userId: sennaId, role: 'Meekijker' })

  const detail = await getTeamlid(sennaId)
  assert.equal(detail!.klanten.length, 2, 'beide klanten staan op zijn kaart')
  assert.equal(
    detail!.portfolioCents,
    850_000,
    'alleen de klant waar hij eerste aanspreekpartner is telt mee',
  )
})

test('de teamlijst telt hetzelfde portfolio als het profiel', async () => {
  const team = await listTeam()
  const senna = team.find((l) => l.id === sennaId)
  const detail = await getTeamlid(sennaId)

  assert.ok(senna, 'Senna staat in de teamlijst')
  assert.equal(senna!.portfolioCents, detail!.portfolioCents)
  assert.equal(senna!.klanten, 1, 'de lijst telt de klanten die hij draagt')
})

test('een klant van de portal staat niet in de teamlijst', async () => {
  const team = await listTeam()
  assert.equal(
    team.some((l) => l.organizationId !== null),
    false,
    'alleen collega’s zonder eigen organisatie horen hier',
  )
})

/* --- De uurkostprijs ----------------------------------------------------- */

test('de uurkostprijs staat los van de rest van het profiel', async () => {
  await setHourlyCost(sennaId, 4250)
  let detail = await getTeamlid(sennaId)
  assert.equal(detail!.lid.hourlyCostCents, 4250)

  // Het profiel opslaan mag de kostprijs niet wissen: dat formulier ziet een
  // medewerker wél en dit veld niet.
  await updateTeamlid(sennaId, { name: `Senna ${suffix}`, jobTitle: 'Marketing manager' })
  detail = await getTeamlid(sennaId)
  assert.equal(detail!.lid.hourlyCostCents, 4250, 'kostprijs overleeft een profielwijziging')

  await setHourlyCost(sennaId, null)
  detail = await getTeamlid(sennaId)
  assert.equal(detail!.lid.hourlyCostCents, null)
})

test('een negatieve uurkostprijs wordt geweigerd', async () => {
  await assert.rejects(
    () => setHourlyCost(sennaId, -100),
    (f: Error) => f instanceof TeamError,
  )
})

/* --- Attenties ----------------------------------------------------------- */

test('collega’s die deze maand jarig zijn staan op volgorde van dag', async () => {
  // Allebei opnieuw zetten: een eerdere test heeft Senna's profiel bewust
  // leeggemaakt om te bewijzen dat een leeg veld ook echt wist.
  await updateTeamlid(sennaId, {
    name: `Senna ${suffix}`,
    birthDay: 14,
    birthMonth: 3,
    birthYear: 1995,
    startedOn: new Date('2021-09-01T12:00:00Z'),
  })
  await updateTeamlid(joepId, {
    name: `Joep ${suffix}`,
    birthDay: 4,
    birthMonth: 3,
    birthYear: 1988,
  })

  const jarig = await teamVerjaardagenInMaand(3, 2026)
  const onze = jarig.filter((v) => v.userId === sennaId || v.userId === joepId)

  assert.equal(onze.length, 2)
  assert.equal(onze[0]!.userId, joepId, 'de 4e komt voor de 14e')
  assert.equal(onze[0]!.wordt, 38)
  assert.equal(onze[1]!.wordt, 31)
})

test('wie uit dienst is hoeft geen kaartje meer', async () => {
  await updateTeamlid(joepId, {
    name: `Joep ${suffix}`,
    birthDay: 4,
    birthMonth: 3,
    birthYear: 1988,
    endedOn: new Date('2026-01-31T12:00:00Z'),
    startedOn: new Date('2020-01-06T12:00:00Z'),
  })

  const jarig = await teamVerjaardagenInMaand(3, 2026)
  assert.equal(jarig.some((v) => v.userId === joepId), false)

  const jubilea = await teamJubileaInMaand(1, new Date('2026-01-15T12:00:00Z'))
  assert.equal(jubilea.some((j) => j.userId === joepId), false, 'ook geen jubileum meer')

  // Weer terugdraaien; de volgende test rekent op iemand in dienst.
  await db.update(users).set({ endedOn: null }).where(eq(users.id, joepId))
})

test('het eerste jaar is nog geen jubileum', async () => {
  // Senna is op 1 september 2021 begonnen; dat is hierboven gezet.
  const netBegonnen = await teamJubileaInMaand(9, new Date('2021-09-15T12:00:00Z'))
  assert.equal(
    netBegonnen.some((j) => j.userId === sennaId),
    false,
    'in je eerste jaar vier je nog niets',
  )

  const naVijfJaar = await teamJubileaInMaand(9, new Date('2026-09-15T12:00:00Z'))
  const senna = naVijfJaar.find((j) => j.userId === sennaId)
  assert.ok(senna, 'vijf jaar in dienst is wel een jubileum')
  assert.equal(senna!.jaren, 5)
})
