import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

/* -------------------------------------------------------------------------
   Uitgangspunten van dit datamodel
   -------------------------------------------------------------------------
   1. Alle bedragen zijn HELE CENTEN (integer). Nooit floats: 0.1 + 0.2 is
      in binaire floats niet 0.3, en dat is bij geld onacceptabel.

   2. ledger_entries is APPEND-ONLY. Een boeking wordt nooit gewijzigd of
      verwijderd. Een fout corrigeer je met een tegenboeking die verwijst
      naar het origineel (reverses_entry_id). Zo is het saldo van een klant
      altijd te herleiden en verandert historie nooit achter hun rug om.

   3. Het saldo is nooit een kolom, altijd een som over de boekingen.
      Een saldo-kolom raakt op een dag uit sync met de boekingen en dan
      weet je niet meer welke van de twee liegt.

   4. ELKE boeking is zichtbaar voor de klant. Er is bewust geen manier om
      een boeking te verbergen: zodra een boeking het saldo raakt maar niet
      in het overzicht staat, telt het overzicht van de klant niet meer op
      tot het saldo dat erboven staat. Dan is het geen afschrift meer maar
      een verhaal. Moet er iets niet naar de klant, dan hoort het niet in
      de wallet.
   ------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum('user_role', ['client', 'staff', 'admin'])

/** Soort boeking. Bepaalt ook het toegestane teken van het bedrag. */
export const entryKindEnum = pgEnum('entry_kind', [
  'topup', // bijschrijving: budget verhoogd, meestal via een factuur
  'spend', // afschrijving: afgenomen dienst
  'correction', // correctie op een eerdere boeking (beide richtingen)
])

export const entrySourceEnum = pgEnum('entry_source', [
  'clickup', // automatisch uit de ClickUp-sync
  'manual', // met de hand geboekt door het JR-team
  'invoice', // gekoppeld aan een factuur
])

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'overdue',
  'credited',
])

export const walletStatusEnum = pgEnum('wallet_status', ['active', 'paused', 'closed'])

export const syncStatusEnum = pgEnum('sync_status', ['running', 'success', 'failed'])

/* ------------------------------- Klanten -------------------------------- */

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** URL-veilige naam, gebruikt in links. */
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Task-id van het bedrijf in de ClickUp CRM-lijst. */
    clickupCompanyId: text('clickup_company_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('organizations_slug_idx').on(t.slug),
    uniqueIndex('organizations_clickup_idx').on(t.clickupCompanyId),
  ],
)

/* ------------------------------ Gebruikers ------------------------------ */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    role: userRoleEnum('role').notNull().default('client'),
    /** Verplicht voor klanten, leeg voor JR-medewerkers. */
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('users_org_idx').on(t.organizationId),
    // Een klant zonder organisatie zou nergens bij horen en dus alles of
    // niets kunnen zien. De database weigert dat.
    check(
      'client_needs_org',
      sql`(${t.role} <> 'client') OR (${t.organizationId} IS NOT NULL)`,
    ),
  ],
)

/* ------------------------------- Sessies -------------------------------- */

/** Eenmalige inloglink. Wordt na gebruik ongeldig gemaakt. */
export const loginTokens = pgTable(
  'login_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** SHA-256 van het token. De klare waarde staat alleen in de e-mail. */
    tokenHash: text('token_hash').notNull(),
    email: text('email').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    requestedIp: text('requested_ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('login_tokens_hash_idx').on(t.tokenHash),
    index('login_tokens_email_idx').on(t.email),
  ],
)

/* ------------------------------- Wallets -------------------------------- */

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Bijv. "Marketing abonnement" of "Strippenkaart 2026". */
    name: text('name').notNull(),
    /** Task-id van het abonnement in ClickUp, als die er is. */
    clickupSubscriptionId: text('clickup_subscription_id'),
    status: walletStatusEnum('status').notNull().default('active'),
    /**
     * Optionele ondergrens waarbij de klant en het team een signaal krijgen.
     * In centen. Leeg = geen signaal.
     */
    lowBalanceThresholdCents: integer('low_balance_threshold_cents'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (t) => [
    index('wallets_org_idx').on(t.organizationId),
    uniqueIndex('wallets_clickup_idx').on(t.clickupSubscriptionId),
  ],
)

/* ------------------------------- Facturen ------------------------------- */

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Factuurnummer zoals de klant het op de factuur ziet. */
    number: text('number').notNull(),
    description: text('description'),
    /** Bedrag exclusief btw, in centen. De wallet rekent altijd excl. btw. */
    amountExclVatCents: integer('amount_excl_vat_cents').notNull(),
    vatCents: integer('vat_cents').notNull().default(0),
    status: invoiceStatusEnum('status').notNull().default('open'),
    issuedOn: timestamp('issued_on', { withTimezone: true }).notNull(),
    dueOn: timestamp('due_on', { withTimezone: true }),
    paidOn: timestamp('paid_on', { withTimezone: true }),
    /** Id in Moneybird, voor latere koppeling. */
    moneybirdId: text('moneybird_id'),
    pdfUrl: text('pdf_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invoices_org_idx').on(t.organizationId),
    uniqueIndex('invoices_org_number_idx').on(t.organizationId, t.number),
    uniqueIndex('invoices_moneybird_idx').on(t.moneybirdId),
  ],
)

/* ------------------------------ Grootboek ------------------------------- */

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),

    kind: entryKindEnum('kind').notNull(),

    /**
     * Bedrag in centen, MET teken:
     *   positief = bijschrijving (budget erbij)
     *   negatief = afschrijving (budget eraf)
     * Het saldo is simpelweg de som van deze kolom.
     */
    amountCents: integer('amount_cents').notNull(),

    /** Wat de klant leest, bijv. "Website wijzigingen". */
    description: text('description').notNull(),
    /** Optionele toelichting, bijv. wat er precies is aangepast. */
    detail: text('detail'),
    /** Productgroep uit ClickUp: SEA, SEO, Social Ads, ... */
    category: text('category'),

    /** Datum waarop het werk is gedaan of het budget is bijgeschreven. */
    bookedOn: timestamp('booked_on', { withTimezone: true }).notNull(),

    source: entrySourceEnum('source').notNull().default('manual'),
    /** Bijv. het ClickUp task-id. Houdt de sync idempotent. */
    sourceRef: text('source_ref'),

    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),

    /** Bij een correctie: welke boeking wordt teruggedraaid. */
    reversesEntryId: uuid('reverses_entry_id'),

    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ledger_wallet_booked_idx').on(t.walletId, t.bookedOn),
    index('ledger_kind_idx').on(t.kind),
    // Dezelfde ClickUp-taak mag nooit twee keer worden afgeboekt.
    uniqueIndex('ledger_source_ref_idx').on(t.source, t.sourceRef),
    // Een boeking van 0 zegt niets en vervuilt het overzicht.
    check('amount_not_zero', sql`${t.amountCents} <> 0`),
    // Tekens moeten bij het soort boeking passen. Alleen een correctie
    // mag beide kanten op.
    check(
      'sign_matches_kind',
      sql`(${t.kind} = 'topup' AND ${t.amountCents} > 0)
       OR (${t.kind} = 'spend' AND ${t.amountCents} < 0)
       OR (${t.kind} = 'correction')`,
    ),
    // Alleen een correctie mag naar een andere boeking verwijzen.
    check(
      'only_corrections_reverse',
      sql`(${t.reversesEntryId} IS NULL) OR (${t.kind} = 'correction')`,
    ),
  ],
)

/* ---------------------------- Sync-geschiedenis ------------------------- */

export const syncRuns = pgTable(
  'sync_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: text('source').notNull().default('clickup'),
    status: syncStatusEnum('status').notNull().default('running'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    organizationsSeen: integer('organizations_seen').notNull().default(0),
    walletsSeen: integer('wallets_seen').notNull().default(0),
    entriesCreated: integer('entries_created').notNull().default(0),
    entriesSkipped: integer('entries_skipped').notNull().default(0),
    /** Vrije tekst met wat er misging of wat er is overgeslagen. */
    notes: text('notes'),
  },
  (t) => [index('sync_runs_started_idx').on(t.startedAt)],
)

/* ------------------------------- Relaties ------------------------------- */

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  wallets: many(wallets),
  invoices: many(invoices),
}))

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}))

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [wallets.organizationId],
    references: [organizations.id],
  }),
  entries: many(ledgerEntries),
}))

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  wallet: one(wallets, { fields: [ledgerEntries.walletId], references: [wallets.id] }),
  invoice: one(invoices, { fields: [ledgerEntries.invoiceId], references: [invoices.id] }),
  createdBy: one(users, {
    fields: [ledgerEntries.createdByUserId],
    references: [users.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  entries: many(ledgerEntries),
}))

export type Organization = typeof organizations.$inferSelect
export type User = typeof users.$inferSelect
export type Wallet = typeof wallets.$inferSelect
export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type SyncRun = typeof syncRuns.$inferSelect
