/**
 * Vult de database met voorbeelddata om het portaal te kunnen bekijken.
 * Bedoeld voor lokaal gebruik en demo's, niet voor productie.
 *
 * Gebruik: npm run db:seed
 */
import { eq, sql } from 'drizzle-orm'
import { db, client } from './index'
import { organizations, users, wallets, invoices, ledgerEntries } from './schema'
import { addEntry, reverseEntry } from '../lib/ledger'

const DEMO_SLUG = 'hotel-voncken-demo'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:seed is niet bedoeld voor productie.')
  }

  console.log('Voorbeelddata aanmaken...')

  // Bestaande demodata weghalen. In productie kan dit niet, want
  // ledger_entries beschermt de wallet tegen verwijderen.
  const [bestaand] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEMO_SLUG))

  if (bestaand) {
    const rows = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.organizationId, bestaand.id))
    for (const row of rows) {
      await db.delete(ledgerEntries).where(eq(ledgerEntries.walletId, row.id))
    }
    await db.delete(organizations).where(eq(organizations.id, bestaand.id))
  }

  const [org] = await db
    .insert(organizations)
    .values({ slug: DEMO_SLUG, name: 'Hotel Voncken (demo)' })
    .returning()

  const [klant] = await db
    .insert(users)
    .values({
      email: 'demo-klant@voorbeeld.nl',
      name: 'Demo Klant',
      role: 'client',
      organizationId: org!.id,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { organizationId: org!.id, disabledAt: null },
    })
    .returning()

  // Het JR-team, met de adressen uit ADMIN_EMAILS.
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

  const [wallet] = await db
    .insert(wallets)
    .values({
      organizationId: org!.id,
      name: 'Marketing abonnement',
      lowBalanceThresholdCents: 25_000,
    })
    .returning()

  const [strippen] = await db
    .insert(wallets)
    .values({ organizationId: org!.id, name: 'Strippenkaart extra werk' })
    .returning()

  // --- Facturen die het budget opbouwen ---
  const factuurData = [
    { number: '2026-0112', maand: 0, cents: 150_000, status: 'paid' as const },
    { number: '2026-0198', maand: 1, cents: 150_000, status: 'paid' as const },
    { number: '2026-0264', maand: 2, cents: 150_000, status: 'open' as const },
  ]

  for (const f of factuurData) {
    const uitgifte = new Date(2026, f.maand, 1)
    const [factuur] = await db
      .insert(invoices)
      .values({
        organizationId: org!.id,
        number: f.number,
        description: 'Marketing abonnement',
        amountExclVatCents: f.cents,
        vatCents: Math.round(f.cents * 0.21),
        status: f.status,
        issuedOn: uitgifte,
        dueOn: new Date(2026, f.maand, 15),
        paidOn: f.status === 'paid' ? new Date(2026, f.maand, 8) : null,
      })
      .returning()

    await addEntry({
      walletId: wallet!.id,
      kind: 'topup',
      amountCents: f.cents,
      description: `Budget ${uitgifte.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`,
      category: 'Marketing Management',
      bookedOn: uitgifte,
      source: 'invoice',
      invoiceId: factuur!.id,
    })
  }

  // --- Afgenomen diensten ---
  const werk = [
    { maand: 0, dag: 8, wat: 'Website wijzigingen', cents: 12_250, cat: 'Web' },
    { maand: 0, dag: 12, wat: 'Google Ads beheer januari', cents: 42_500, cat: 'SEA' },
    { maand: 0, dag: 18, wat: 'Social content 12 posts', cents: 38_000, cat: 'Social Management' },
    { maand: 0, dag: 24, wat: 'Fotografie nieuwe kamers', cents: 55_000, cat: 'Fotografie' },
    { maand: 1, dag: 5, wat: 'Google Ads beheer februari', cents: 42_500, cat: 'SEA' },
    { maand: 1, dag: 11, wat: 'Nieuwsbrief valentijnsactie', cents: 18_500, cat: 'E-mail Marketing' },
    { maand: 1, dag: 19, wat: 'Social content 12 posts', cents: 38_000, cat: 'Social Management' },
    { maand: 1, dag: 26, wat: 'Landingspagina arrangementen', cents: 74_000, cat: 'Web' },
    { maand: 2, dag: 3, wat: 'Google Ads beheer maart', cents: 42_500, cat: 'SEA' },
    { maand: 2, dag: 9, wat: 'SEO teksten 4 paginas', cents: 32_000, cat: 'SEO' },
    { maand: 2, dag: 14, wat: 'Social content 12 posts', cents: 38_000, cat: 'Social Management' },
  ]

  for (const w of werk) {
    await addEntry({
      walletId: wallet!.id,
      kind: 'spend',
      amountCents: w.cents,
      description: w.wat,
      category: w.cat,
      bookedOn: new Date(2026, w.maand, w.dag),
      source: 'clickup',
      sourceRef: `demo-${w.maand}-${w.dag}`,
    })
  }

  // Een boeking die is teruggedraaid, zodat te zien is hoe een correctie
  // in het overzicht staat.
  const fout = await addEntry({
    walletId: wallet!.id,
    kind: 'spend',
    amountCents: 21_000,
    description: 'Bannerset zomercampagne',
    category: 'Social Ads',
    bookedOn: new Date(2026, 2, 16),
    source: 'clickup',
    sourceRef: 'demo-correctie',
  })
  await reverseEntry(fout.id, {
    reason: 'Dubbel geboekt: dit werk valt binnen het abonnement.',
    createdByUserId: klant!.id,
  })

  // --- Strippenkaart met een kleiner budget ---
  await addEntry({
    walletId: strippen!.id,
    kind: 'topup',
    amountCents: 100_000,
    description: 'Strippenkaart 10 uur',
    bookedOn: new Date(2026, 0, 15),
    source: 'manual',
  })
  await addEntry({
    walletId: strippen!.id,
    kind: 'spend',
    amountCents: 87_500,
    description: 'Rebranding restaurantmenu',
    category: 'Content Creatie',
    bookedOn: new Date(2026, 1, 20),
    source: 'manual',
  })

  console.log('')
  console.log('Klaar. Inloggen kan met:')
  console.log(`  klant: demo-klant@voorbeeld.nl  (${org!.name})`)
  for (const email of adminEmails) console.log(`  team:  ${email}`)
  console.log('')
  console.log('Zonder RESEND_API_KEY komt de inloglink in de serverlog te staan.')
}

main()
  .catch((err) => {
    console.error('Seed mislukt:', err)
    process.exitCode = 1
  })
  .finally(() => client.end())
