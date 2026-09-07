/**
 * Tests voor de afspraak: een factuur van 1.000 euro betekent 1.000 euro
 * budget in de wallet. Factuur en bijschrijving mogen nooit uit elkaar lopen.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { db, client } from '../../db'
import { organizations, wallets, ledgerEntries, invoices } from '../../db/schema'
import { createInvoiceWithTopup, setInvoiceStatus, getOrganizationInvoices, findInvoicesWithoutTopup } from '../invoices'
import { getWalletBalance, reverseEntry, LedgerError } from '../ledger'

const suffix = Date.now()
let orgId: string
let walletId: string
let andereOrgId: string
let andereWalletId: string

before(async () => {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `factuur-${suffix}`, name: 'Factuur BV' })
    .returning()
  orgId = org!.id

  const [wallet] = await db
    .insert(wallets)
    .values({ organizationId: orgId, name: 'Marketing abonnement' })
    .returning()
  walletId = wallet!.id

  const [andere] = await db
    .insert(organizations)
    .values({ slug: `andere-${suffix}`, name: 'Andere Klant BV' })
    .returning()
  andereOrgId = andere!.id

  const [andereWallet] = await db
    .insert(wallets)
    .values({ organizationId: andereOrgId, name: 'Wallet' })
    .returning()
  andereWalletId = andereWallet!.id
})

after(async () => {
  for (const id of [walletId, andereWalletId]) {
    await db.delete(ledgerEntries).where(eq(ledgerEntries.walletId, id))
  }
  for (const id of [orgId, andereOrgId]) {
    await db.delete(organizations).where(eq(organizations.id, id))
  }
  await client.end()
})

test('een factuur van 1.000 euro geeft 1.000 euro budget', async () => {
  const { invoice, entry } = await createInvoiceWithTopup({
    organizationId: orgId,
    walletId,
    number: `${suffix}-001`,
    amountExclVatCents: 100_000,
    description: 'Marketing abonnement januari',
  })

  assert.equal(invoice.amountExclVatCents, 100_000)
  assert.equal(entry.amountCents, 100_000, 'de bijschrijving is even groot als de factuur')
  assert.equal(entry.kind, 'topup')
  assert.equal(entry.invoiceId, invoice.id, 'de bijschrijving verwijst naar de factuur')
  assert.equal(entry.source, 'invoice')

  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 100_000)
})

test('de btw wordt apart bewaard en zit niet in het budget', async () => {
  const { invoice } = await createInvoiceWithTopup({
    organizationId: orgId,
    walletId,
    number: `${suffix}-002`,
    amountExclVatCents: 100_000,
  })

  assert.equal(invoice.vatCents, 21_000, '21 procent btw')

  // Het budget is exclusief btw: btw is geen budget om marketing van te doen.
  const balance = await getWalletBalance(walletId)
  assert.equal(balance.balanceCents, 200_000, '2 x 1.000 euro, zonder btw')
})

test('het overzicht laat zien dat factuur en bijschrijving gelijk zijn', async () => {
  const facturen = await getOrganizationInvoices(orgId)

  for (const f of facturen) {
    assert.equal(
      f.toppedUpCents,
      f.amountExclVatCents,
      `factuur ${f.number}: bijgeschreven bedrag hoort gelijk te zijn`,
    )
  }
})

test('geen enkele factuur mist zijn bijschrijving', async () => {
  const scheef = await findInvoicesWithoutTopup()
  const eigen = scheef.filter((f) => f.organizationId === orgId)
  assert.deepEqual(eigen, [], 'elke factuur hoort een gelijke bijschrijving te hebben')
})

test('de betaalstatus raakt het budget niet', async () => {
  const voor = await getWalletBalance(walletId)

  const facturen = await getOrganizationInvoices(orgId)
  await setInvoiceStatus(facturen[0]!.id, 'paid')

  const na = await getWalletBalance(walletId)
  assert.equal(na.balanceCents, voor.balanceCents, 'betalen verandert het budget niet')
})

test('een dubbel factuurnummer wordt geweigerd en laat geen budget achter', async () => {
  const voor = await getWalletBalance(walletId)

  await assert.rejects(() =>
    createInvoiceWithTopup({
      organizationId: orgId,
      walletId,
      number: `${suffix}-001`, // bestaat al
      amountExclVatCents: 50_000,
    }),
  )

  const na = await getWalletBalance(walletId)
  assert.equal(
    na.balanceCents,
    voor.balanceCents,
    'een mislukte factuur mag geen budget bijschrijven',
  )
})

test('een wallet van een andere klant wordt geweigerd', async () => {
  // Zonder deze controle zou budget van de ene klant op de wallet van een
  // andere klant kunnen belanden.
  await assert.rejects(
    () =>
      createInvoiceWithTopup({
        organizationId: orgId,
        walletId: andereWalletId,
        number: `${suffix}-999`,
        amountExclVatCents: 50_000,
      }),
    LedgerError,
  )

  const balance = await getWalletBalance(andereWalletId)
  assert.equal(balance.balanceCents, 0, 'er is niets op de verkeerde wallet geboekt')
})

test('een factuurbedrag van nul of negatief wordt geweigerd', async () => {
  await assert.rejects(
    () =>
      createInvoiceWithTopup({
        organizationId: orgId,
        walletId,
        number: `${suffix}-nul`,
        amountExclVatCents: 0,
      }),
    LedgerError,
  )
  await assert.rejects(
    () =>
      createInvoiceWithTopup({
        organizationId: orgId,
        walletId,
        number: `${suffix}-min`,
        amountExclVatCents: -10_000,
      }),
    LedgerError,
  )
})

test('een creditnota gaat via een correctie op de bijschrijving', async () => {
  const { invoice, entry } = await createInvoiceWithTopup({
    organizationId: orgId,
    walletId,
    number: `${suffix}-credit`,
    amountExclVatCents: 75_000,
  })

  const naFactuur = await getWalletBalance(walletId)

  await reverseEntry(entry.id, { reason: `Creditnota op factuur ${invoice.number}` })

  const naCredit = await getWalletBalance(walletId)
  assert.equal(
    naCredit.balanceCents,
    naFactuur.balanceCents - 75_000,
    'het budget gaat er weer af',
  )

  // De bijschrijving telt niet meer mee als bijgeschreven budget.
  assert.equal(
    naCredit.toppedUpCents,
    naFactuur.toppedUpCents - 75_000,
    'en ook niet in het totaal bijgeschreven',
  )

  // De factuur blijft bestaan: historie verdwijnt niet.
  const [nogAanwezig] = await db.select().from(invoices).where(eq(invoices.id, invoice.id))
  assert.ok(nogAanwezig, 'de factuur zelf blijft staan')
})
