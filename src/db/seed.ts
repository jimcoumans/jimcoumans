/**
 * Vult de database met voorbeelddata om het systeem te kunnen bekijken.
 * Bedoeld voor lokaal gebruik en demo's, niet voor productie.
 *
 * Gebruik: npm run db:seed
 */
import { eq, inArray, sql } from 'drizzle-orm'
import { db, client } from './index'
import { organizations, users, wallets, invoices, ledgerEntries, services } from './schema'
import { addServiceEntry, addEntry, reverseEntry } from '../lib/ledger'
import { createInvoiceWithTopup } from '../lib/invoices'

const DEMO_SLUGS = ['hotel-voncken-demo', 'damen-makelaardij-demo']

/* --------------------------- Dienstencatalogus --------------------------- */

const DIENSTEN = [
  {
    code: 'SOC-POST',
    name: 'Social media post',
    description: 'Eén post inclusief beeld, tekst en inplannen.',
    category: 'Social Management',
    department: 'Marketing',
    unit: 'piece' as const,
    unitPriceCents: 10_000,
    costPriceCents: 3_500,
    estimatedMinutes: 45,
  },
  {
    code: 'SEA-BEHEER',
    name: 'Google Ads beheer',
    description: 'Maandelijks beheer en optimalisatie van de campagnes.',
    category: 'SEA',
    department: 'Marketing',
    unit: 'month' as const,
    unitPriceCents: 42_500,
    costPriceCents: 12_000,
  },
  {
    code: 'WEB-UUR',
    name: 'Webontwikkeling',
    description: 'Aanpassingen en doorontwikkeling van de website.',
    category: 'Web',
    department: 'Web',
    unit: 'hour' as const,
    unitPriceCents: 8_500,
    costPriceCents: 4_000,
    estimatedMinutes: 60,
  },
  {
    code: 'SEO-TEKST',
    name: 'SEO-tekst',
    description: 'Zoekwoordonderzoek en een geoptimaliseerde pagina-tekst.',
    category: 'SEO',
    department: 'Marketing',
    unit: 'piece' as const,
    unitPriceCents: 8_000,
    costPriceCents: 3_000,
  },
  {
    code: 'MAIL-NB',
    name: 'Nieuwsbrief',
    description: 'Opzet, tekst, beeld en verzending van één nieuwsbrief.',
    category: 'E-mail Marketing',
    department: 'Marketing',
    unit: 'piece' as const,
    unitPriceCents: 18_500,
    costPriceCents: 6_000,
  },
  {
    code: 'FOTO-DAG',
    name: 'Fotografie halve dag',
    description: 'Fotograaf op locatie, inclusief nabewerking.',
    category: 'Fotografie',
    department: 'Content Creatie',
    unit: 'piece' as const,
    unitPriceCents: 55_000,
    costPriceCents: 30_000,
  },
  {
    code: 'STRAT',
    name: 'Strategiesessie',
    description: 'Sessie met het team over positionering en plan.',
    category: 'Marketing Management',
    department: 'Marketing',
    unit: 'hour' as const,
    unitPriceCents: 15_000,
  },
]

const MEDEWERKERS = [
  { email: 'anna@jamesrobinson.nl', name: 'Anna de Vries' },
  { email: 'bram@jamesrobinson.nl', name: 'Bram Peeters' },
  { email: 'chiara@jamesrobinson.nl', name: 'Chiara Smeets' },
]

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:seed is niet bedoeld voor productie.')
  }

  console.log('Voorbeelddata aanmaken...')

  /* --- Oude demodata weghalen --- */
  const bestaande = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.slug, DEMO_SLUGS))

  for (const org of bestaande) {
    const rows = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.organizationId, org.id))
    for (const row of rows) {
      await db.delete(ledgerEntries).where(eq(ledgerEntries.walletId, row.id))
    }
    await db.delete(organizations).where(eq(organizations.id, org.id))
  }

  /* --- Diensten --- */
  const dienstIds = new Map<string, string>()
  for (const dienst of DIENSTEN) {
    const [rij] = await db
      .insert(services)
      .values(dienst)
      .onConflictDoUpdate({
        target: services.code,
        set: {
          name: dienst.name,
          description: dienst.description,
          category: dienst.category,
          department: dienst.department,
          unit: dienst.unit,
          unitPriceCents: dienst.unitPriceCents,
          costPriceCents: dienst.costPriceCents,
          active: true,
          updatedAt: new Date(),
        },
      })
      .returning()
    dienstIds.set(dienst.code, rij!.id)
  }
  console.log(`  ${DIENSTEN.length} diensten`)

  /* --- Het team --- */
  const adminEmails = (process.env.ADMIN_EMAILS ?? 'jim@jamesrobinson.nl')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  for (const email of adminEmails) {
    await db
      .insert(users)
      .values({ email, role: 'admin' })
      .onConflictDoUpdate({ target: users.email, set: { role: 'admin', disabledAt: null } })
  }

  const medewerkerIds = new Map<string, string>()
  for (const mw of MEDEWERKERS) {
    const [rij] = await db
      .insert(users)
      .values({ ...mw, role: 'staff' })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: mw.name, role: 'staff', organizationId: null, disabledAt: null },
      })
      .returning()
    medewerkerIds.set(mw.email, rij!.id)
  }
  const anna = medewerkerIds.get('anna@jamesrobinson.nl')!
  const bram = medewerkerIds.get('bram@jamesrobinson.nl')!
  const chiara = medewerkerIds.get('chiara@jamesrobinson.nl')!
  console.log(`  ${MEDEWERKERS.length} medewerkers en ${adminEmails.length} beheerder(s)`)

  /* ---------------------------- Klant 1 --------------------------------- */

  const [voncken] = await db
    .insert(organizations)
    .values({ slug: 'hotel-voncken-demo', name: 'Hotel Voncken (demo)' })
    .returning()

  await db
    .insert(users)
    .values({
      email: 'demo-klant@voorbeeld.nl',
      name: 'Demo Klant',
      role: 'client',
      organizationId: voncken!.id,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { organizationId: voncken!.id, role: 'client', disabledAt: null },
    })

  const [vonckenWallet] = await db
    .insert(wallets)
    .values({
      organizationId: voncken!.id,
      name: 'Marketing abonnement',
      lowBalanceThresholdCents: 50_000,
    })
    .returning()

  const [strippen] = await db
    .insert(wallets)
    .values({ organizationId: voncken!.id, name: 'Strippenkaart extra werk' })
    .returning()

  // Facturen: elke factuur schrijft zijn bedrag bij als budget.
  for (const maand of [0, 1, 2]) {
    await createInvoiceWithTopup({
      organizationId: voncken!.id,
      walletId: vonckenWallet!.id,
      number: `2026-01${12 + maand * 43}`,
      amountExclVatCents: 250_000,
      description: `Marketing abonnement ${new Date(2026, maand, 1).toLocaleDateString('nl-NL', { month: 'long' })}`,
      issuedOn: new Date(2026, maand, 1),
      status: maand < 2 ? 'paid' : 'open',
    })
  }

  // Geleverde diensten.
  const werk: [string, number, number, number, string][] = [
    // [dienstcode, maand, dag, aantal in honderdsten, medewerker]
    ['WEB-UUR', 0, 8, 150, chiara],
    ['SEA-BEHEER', 0, 12, 100, bram],
    ['SOC-POST', 0, 18, 1_200, anna],
    ['FOTO-DAG', 0, 24, 100, chiara],
    ['SEA-BEHEER', 1, 5, 100, bram],
    ['MAIL-NB', 1, 11, 100, anna],
    ['SOC-POST', 1, 19, 1_200, anna],
    ['WEB-UUR', 1, 26, 875, chiara],
    ['SEA-BEHEER', 2, 3, 100, bram],
    ['SEO-TEKST', 2, 9, 400, bram],
    ['SOC-POST', 2, 14, 1_200, anna],
  ]

  for (const [code, maand, dag, aantal, medewerker] of werk) {
    await addServiceEntry({
      walletId: vonckenWallet!.id,
      serviceId: dienstIds.get(code)!,
      quantityHundredths: aantal,
      bookedOn: new Date(2026, maand, dag),
      deliveredByUserId: medewerker,
    })
  }

  // Een boeking die is teruggedraaid, zodat te zien is hoe dat oogt.
  const fout = await addServiceEntry({
    walletId: vonckenWallet!.id,
    serviceId: dienstIds.get('SOC-POST')!,
    quantityHundredths: 200,
    description: 'Bannerset zomercampagne',
    bookedOn: new Date(2026, 2, 16),
    deliveredByUserId: anna,
  })
  await reverseEntry(fout.id, {
    reason: 'Dubbel geboekt: dit werk valt binnen het abonnement.',
  })

  // Strippenkaart: los bijgeschreven budget, zonder factuur.
  await addEntry({
    walletId: strippen!.id,
    kind: 'topup',
    amountCents: 100_000,
    description: 'Strippenkaart extra werk',
    bookedOn: new Date(2026, 0, 15),
    source: 'manual',
  })
  await addServiceEntry({
    walletId: strippen!.id,
    serviceId: dienstIds.get('STRAT')!,
    quantityHundredths: 300,
    description: 'Strategiesessie rebranding restaurant',
    bookedOn: new Date(2026, 1, 20),
    deliveredByUserId: chiara,
  })

  /* ---------------------------- Klant 2 --------------------------------- */

  const [damen] = await db
    .insert(organizations)
    .values({ slug: 'damen-makelaardij-demo', name: 'Damen Makelaardij (demo)' })
    .returning()

  const [damenWallet] = await db
    .insert(wallets)
    .values({
      organizationId: damen!.id,
      name: 'Marketing abonnement',
      lowBalanceThresholdCents: 20_000, // saldo komt hieronder: melding zichtbaar
    })
    .returning()

  await createInvoiceWithTopup({
    organizationId: damen!.id,
    walletId: damenWallet!.id,
    number: '2026-0155',
    amountExclVatCents: 95_000,
    description: 'Marketing abonnement Q1',
    issuedOn: new Date(2026, 0, 5),
    status: 'paid',
  })

  for (const [code, dag, aantal, medewerker] of [
    ['SEA-BEHEER', 10, 100, bram],
    ['SOC-POST', 22, 400, anna],
  ] as [string, number, number, string][]) {
    await addServiceEntry({
      walletId: damenWallet!.id,
      serviceId: dienstIds.get(code)!,
      quantityHundredths: aantal,
      bookedOn: new Date(2026, 1, dag),
      deliveredByUserId: medewerker,
    })
  }

  console.log('')
  console.log('Klaar. Inloggen kan met:')
  console.log('  klant: demo-klant@voorbeeld.nl  (Hotel Voncken)')
  for (const email of adminEmails) console.log(`  beheerder: ${email}`)
  for (const mw of MEDEWERKERS) console.log(`  medewerker: ${mw.email}`)
  console.log('')
  console.log('Een inloglink maak je met:')
  console.log('  npm run login:link -- <e-mailadres>')
}

main()
  .catch((err) => {
    console.error('Seed mislukt:', err)
    process.exitCode = 1
  })
  .finally(() => client.end())
