/**
 * Integratietests tegen een echte Postgres. Draait alleen als DATABASE_URL
 * is gezet en de migraties zijn uitgevoerd.
 *
 * Deze tests bewijzen de beloftes die het grootboek maakt: bedragen kloppen,
 * tekens kunnen niet omgedraaid worden, dezelfde ClickUp-taak kan niet twee
 * keer worden afgeboekt, en een boeking verdwijnt nooit.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, users, wallets, ledgerEntries } from '../../db/schema'
import { isConstraintViolation, describeDbError } from '../db-errors'
import {
  addEntry,
  reverseEntry,
  getWalletBalance,
  getWalletBalances,
  getWalletEntries,
  getSpendByCategory,
  getReversedEntryIds,
  LedgerError,
} from '../ledger'

let orgId: string
let walletId: string

/**
 * Drizzle wrapt driver-fouten, waardoor de constraint-naam niet in
 * error.message staat. assert.rejects met een regex werkt daarom niet;
 * deze helper kijkt op de juiste plek.
 */
async function assertViolates(fn: () => Promise<unknown>, constraint: string) {
  try {
    await fn()
  } catch (error) {
    assert.ok(
      isConstraintViolation(error, constraint),
      `verwachtte schending van ${constraint}, kreeg: ${String(error)}`,
    )
    assert.ok(
      describeDbError(error),
      `${constraint} hoort een leesbare foutmelding te hebben`,
    )
    return
  }
  assert.fail(`verwachtte een schending van ${constraint}, maar de query slaagde`)
}

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `test-${Date.now()}`, name: 'Testklant BV' })
    .returning()
  orgId = org!.id

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: orgId, name: 'Marketing abonnement' })
    .returning()
  walletId = wallet!.id
})

/**
 * Opruimen kan alleen door eerst de boekingen te verwijderen. Dat is met
 * opzet zo: ledger_entries.wallet_id heeft ON DELETE RESTRICT, zodat je in
 * productie nooit per ongeluk financiele historie weggooit.
 */
async function verwijderTestklant(id: string) {
  const rows = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.organizationId, id))
  for (const row of rows) {
    await db.delete(ledgerEntries).where(eq(ledgerEntries.walletId, row.id))
  }
  await db.delete(organizations).where(eq(organizations.id, id))
}

after(async () => {
  await verwijderTestklant(orgId)
  await client.end()
})

test('een nieuwe wallet begint op nul', async () => {
  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 0)
  assert.equal(balance.entryCount, 0)
})

test('bijschrijving verhoogt het saldo, afschrijving verlaagt het', async () => {
  await addEntry({
    walletId,
    kind: 'topup',
    amountCents: 150000, // 1500,00
    description: 'Factuur 2026-001',
    bookedOn: new Date('2026-01-01'),
  })
  await addEntry({
    walletId,
    kind: 'spend',
    amountCents: 12250, // 122,50
    description: 'Website wijzigingen',
    category: 'Web',
    bookedOn: new Date('2026-01-15'),
  })

  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 137750)
  assert.equal(balance.toppedUpCents, 150000)
  assert.equal(balance.spentCents, 12250)
})

test('datums uit het saldo zijn echte Date-objecten', async () => {
  // Drizzle's sql<Date> converteert niet: de driver levert een string.
  // Zonder expliciete conversie klapt elke datumweergave eruit met
  // "Invalid time value", en dat merk je pas in de browser.
  const balance = await getWalletBalance(walletId)

  assert.ok(balance.lastEntryOn instanceof Date, 'lastEntryOn moet een Date zijn')
  assert.ok(
    !Number.isNaN(balance.lastEntryOn!.getTime()),
    'lastEntryOn moet een geldige datum zijn',
  )
  // Dit is precies wat de UI doet en wat eerder de pagina liet crashen.
  assert.doesNotThrow(() =>
    new Intl.DateTimeFormat('nl-NL').format(balance.lastEntryOn!),
  )

  const meerdere = await getWalletBalances([walletId])
  const uitMap = meerdere.get(walletId)!
  assert.ok(uitMap.lastEntryOn instanceof Date, 'ook via getWalletBalances')

  // En bookedOn op de boekingen zelf.
  const entries = await getWalletEntries(walletId, { limit: 5 })
  for (const entry of entries) {
    assert.ok(entry.bookedOn instanceof Date, 'bookedOn moet een Date zijn')
    assert.ok(entry.createdAt instanceof Date, 'createdAt moet een Date zijn')
  }
})

test('een lege wallet heeft geen laatste datum in plaats van een ongeldige', async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `leeg-${Date.now()}`, name: 'Lege Wallet BV' })
    .returning()
  const [w] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Nog niets geboekt' })
    .returning()

  const balance = await getWalletBalance(w!.id)
  assert.equal(balance.lastEntryOn, null)
  assert.equal(balance.balanceCents, 0)

  await verwijderTestklant(org!.id)
})

test('addEntry bepaalt zelf het teken, dus plus en min kunnen niet omdraaien', async () => {
  const entries = await getWalletEntries(walletId)
  const topup = entries.find((e) => e.kind === 'topup')
  const spend = entries.find((e) => e.kind === 'spend')

  assert.ok(topup!.amountCents > 0, 'bijschrijving moet positief zijn')
  assert.ok(spend!.amountCents < 0, 'afschrijving moet negatief zijn')
})

test('addEntry weigert nul, negatieve bedragen en lege omschrijving', async () => {
  await assert.rejects(
    () => addEntry({ walletId, kind: 'spend', amountCents: 0, description: 'Niets' }),
    LedgerError,
  )
  await assert.rejects(
    () => addEntry({ walletId, kind: 'spend', amountCents: -500, description: 'Fout' }),
    LedgerError,
  )
  await assert.rejects(
    () => addEntry({ walletId, kind: 'spend', amountCents: 500, description: '   ' }),
    LedgerError,
  )
})

test('de database weigert een boeking met een verkeerd teken', async () => {
  // Rechtstreekse insert die de check-constraint moet triggeren: een
  // bijschrijving met een negatief bedrag mag simpelweg niet bestaan,
  // ook niet als iemand addEntry() omzeilt.
  await assertViolates(
    () =>
      db.insert(ledgerEntries).values({
        walletId,
        kind: 'topup',
        amountCents: -1000,
        description: 'Onmogelijke bijschrijving',
        bookedOn: new Date(),
      }),
    'sign_matches_kind',
  )
})

test('de database weigert een boeking van nul', async () => {
  await assertViolates(
    () =>
      db.insert(ledgerEntries).values({
        walletId,
        kind: 'correction',
        amountCents: 0,
        description: 'Nulboeking',
        bookedOn: new Date(),
      }),
    'amount_not_zero',
  )
})

test('dezelfde ClickUp-taak kan niet twee keer worden afgeboekt', async () => {
  await addEntry({
    walletId,
    kind: 'spend',
    amountCents: 5000,
    description: 'Social post',
    source: 'clickup',
    sourceRef: 'TASK-123',
  })

  await assertViolates(
    () =>
      addEntry({
        walletId,
        kind: 'spend',
        amountCents: 5000,
        description: 'Social post (dubbel)',
        source: 'clickup',
        sourceRef: 'TASK-123',
      }),
    'ledger_source_ref_idx',
  )
})

test('handmatige boekingen zonder bron mogen wel op elkaar lijken', async () => {
  // De unieke index staat op (source, source_ref). Bij handmatige boekingen
  // is source_ref leeg, en meerdere NULLs zijn in Postgres toegestaan.
  // Zonder dat gedrag zou je maar een keer met de hand kunnen boeken.
  await addEntry({ walletId, kind: 'spend', amountCents: 1000, description: 'Overleg' })
  await addEntry({ walletId, kind: 'spend', amountCents: 1000, description: 'Overleg' })
  assert.ok(true)
})

test('een correctie laat de originele boeking staan en heft die op', async () => {
  const before = await getWalletBalance(walletId)

  const original = await addEntry({
    walletId,
    kind: 'spend',
    amountCents: 9900,
    description: 'Per ongeluk geboekt',
  })

  const afterSpend = await getWalletBalance(walletId)
  assert.equal(afterSpend.balanceCents, before.balanceCents - 9900)

  await reverseEntry(original.id, { reason: 'Dubbel geboekt door de sync' })

  const afterCorrection = await getWalletBalance(walletId)
  assert.equal(
    afterCorrection.balanceCents,
    before.balanceCents,
    'na correctie moet het saldo terug zijn op de oude waarde',
  )

  // De originele boeking staat er nog: historie wordt nooit gewist.
  const [stillThere] = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.id, original.id))
  assert.ok(stillThere, 'de originele boeking mag niet verdwijnen')

  const reversed = await getReversedEntryIds(walletId)
  assert.ok(reversed.has(original.id), 'de correctie moet naar het origineel wijzen')
})

test('een boeking kan maar één keer worden gecorrigeerd', async () => {
  const entry = await addEntry({
    walletId,
    kind: 'spend',
    amountCents: 2500,
    description: 'Eenmalig te corrigeren',
  })

  await reverseEntry(entry.id, { reason: 'Eerste correctie' })

  await assert.rejects(
    () => reverseEntry(entry.id, { reason: 'Tweede correctie' }),
    /al gecorrigeerd/,
  )
})

test('een correctie kan niet zelf gecorrigeerd worden', async () => {
  const entry = await addEntry({
    walletId,
    kind: 'spend',
    amountCents: 1100,
    description: 'Bron voor correctie',
  })
  const correction = await reverseEntry(entry.id, { reason: 'Reden' })

  await assert.rejects(
    () => reverseEntry(correction.id, { reason: 'Nog een keer' }),
    /niet zelf corrigeren/,
  )
})

test('een correctie zonder reden wordt geweigerd', async () => {
  const entry = await addEntry({
    walletId,
    kind: 'spend',
    amountCents: 700,
    description: 'Zonder reden corrigeren',
  })
  await assert.rejects(() => reverseEntry(entry.id, { reason: '  ' }), LedgerError)
})

test('het lopende saldo op het overzicht klopt met het eindsaldo', async () => {
  const entries = await getWalletEntries(walletId, { limit: 500 })
  const balance = await getWalletBalance(walletId)

  // getWalletEntries geeft nieuwste eerst, dus de eerste rij hoort het
  // huidige saldo te tonen, precies zoals op een bankafschrift.
  assert.equal(entries[0]!.runningBalanceCents, balance.balanceCents)

  // En de som van alle boekingen moet ook kloppen.
  const sum = entries.reduce((acc, e) => acc + e.amountCents, 0)
  assert.equal(sum, balance.balanceCents)
})

test('het overzicht van de klant telt exact op tot het saldo', async () => {
  // Dit is de kernbelofte van de wallet: er zijn geen boekingen die het
  // saldo raken maar buiten het overzicht blijven. Anders zou de klant een
  // saldo zien dat hij niet kan narekenen.
  const balance = await getWalletBalance(walletId)
  const all = await getWalletEntries(walletId, { limit: 1000 })

  assert.equal(all.length, balance.entryCount, 'alle boekingen horen in het overzicht')
  assert.equal(
    all.reduce((acc, e) => acc + e.amountCents, 0),
    balance.balanceCents,
  )
})

test('een periodefilter laat het lopende saldo intact', async () => {
  // Als je alleen januari opvraagt, moet het saldo per regel nog steeds
  // het echte saldo zijn, niet het saldo binnen die periode.
  const januari = await getWalletEntries(walletId, {
    from: new Date('2026-01-01'),
    to: new Date('2026-01-31'),
  })

  assert.ok(januari.length > 0, 'er zijn boekingen in januari')
  const eersteTopup = januari.find((e) => e.kind === 'topup')
  assert.equal(
    eersteTopup!.runningBalanceCents,
    150000,
    'het saldo na de eerste bijschrijving is het volledige budget',
  )
})

test('een teruggedraaide besteding verdwijnt uit besteed en uit de verdeling', async () => {
  // Dit ging eerder mis: de correctie is een positief bedrag en werd
  // daardoor als bijgeschreven budget geteld, terwijl de oorspronkelijke
  // besteding bleef staan als uitgegeven geld. Het saldo klopte wel, maar
  // de cijfers die de klant las waren te hoog.
  const [org] = await db
    .insert(organizations)
    .values({ slug: `netto-${Date.now()}`, name: 'Netto BV' })
    .returning()
  const [w] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Netto wallet' })
    .returning()

  await addEntry({
    walletId: w!.id,
    kind: 'topup',
    amountCents: 100_000,
    description: 'Budget',
  })
  await addEntry({
    walletId: w!.id,
    kind: 'spend',
    amountCents: 30_000,
    description: 'Echt werk',
    category: 'SEA',
  })
  const fout = await addEntry({
    walletId: w!.id,
    kind: 'spend',
    amountCents: 21_000,
    description: 'Dubbel geboekt',
    category: 'Social Ads',
  })
  await reverseEntry(fout.id, { reason: 'Viel binnen het abonnement' })

  const balance = await getWalletBalance(w!.id)

  assert.equal(balance.balanceCents, 70_000, 'saldo: 100.000 - 30.000')
  assert.equal(
    balance.toppedUpCents,
    100_000,
    'de correctie mag niet als bijgeschreven budget gelden',
  )
  assert.equal(
    balance.spentCents,
    30_000,
    'de teruggedraaide besteding hoort niet meer bij besteed',
  )

  // Bijgeschreven minus besteed hoort exact het saldo te zijn.
  assert.equal(balance.toppedUpCents - balance.spentCents, balance.balanceCents)

  const perCategorie = await getSpendByCategory(w!.id)
  assert.deepEqual(
    perCategorie,
    [{ category: 'SEA', spentCents: 30_000 }],
    'Social Ads staat op nul en hoort dus niet in de verdeling',
  )

  // Ook via de bulk-variant die het overzicht gebruikt.
  const bulk = (await getWalletBalances([w!.id])).get(w!.id)!
  assert.equal(bulk.toppedUpCents, 100_000)
  assert.equal(bulk.spentCents, 30_000)

  await verwijderTestklant(org!.id)
})

test('een correctie op een bijschrijving verlaagt het bijgeschreven budget', async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `topupcorr-${Date.now()}`, name: 'Topup Correctie BV' })
    .returning()
  const [w] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Wallet' })
    .returning()

  await addEntry({ walletId: w!.id, kind: 'topup', amountCents: 50_000, description: 'Goed' })
  const fout = await addEntry({
    walletId: w!.id,
    kind: 'topup',
    amountCents: 50_000,
    description: 'Verkeerde factuur',
  })
  await reverseEntry(fout.id, { reason: 'Factuur hoorde bij een andere klant' })

  const balance = await getWalletBalance(w!.id)
  assert.equal(balance.balanceCents, 50_000)
  assert.equal(balance.toppedUpCents, 50_000, 'de teruggedraaide factuur telt niet mee')
  assert.equal(balance.spentCents, 0, 'en het is zeker geen besteding')

  await verwijderTestklant(org!.id)
})

test('verbruik per productgroep telt alleen afschrijvingen', async () => {
  const perCategory = await getSpendByCategory(walletId)
  const web = perCategory.find((c) => c.category === 'Web')

  assert.ok(web, 'categorie Web moet voorkomen')
  assert.ok(web!.spentCents > 0, 'verbruik is een positief getal')
  assert.ok(
    perCategory.every((c) => c.spentCents > 0),
    'er mogen geen bijschrijvingen tussen zitten',
  )
})

test('het saldo mag negatief worden bij overschrijding', async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `overspend-${Date.now()}`, name: 'Overschrijder BV' })
    .returning()
  const [w] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Strippenkaart' })
    .returning()

  await addEntry({ walletId: w!.id, kind: 'topup', amountCents: 10000, description: 'Start' })
  await addEntry({ walletId: w!.id, kind: 'spend', amountCents: 25000, description: 'Meer werk' })

  const balance = await getWalletBalance(w!.id)
  // Werk dat al gedaan is kun je niet ongedaan maken. Het saldo laat de
  // overschrijding zien in plaats van de boeking te weigeren.
  assert.equal(balance.balanceCents, -15000)

  await verwijderTestklant(org!.id)
})

test('een wallet met boekingen kan niet worden verwijderd', async () => {
  // Financiele historie is geen wegwerpartikel. De database blokkeert het,
  // ook als iemand het per ongeluk probeert.
  await assertViolates(
    () => db.delete(wallets).where(eq(wallets.id, walletId)),
    'ledger_entries_wallet_id_wallets_id_fk',
  )
})
