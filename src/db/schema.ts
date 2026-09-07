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
  boolean,
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

   5. Een boeking legt het TARIEF VAN DAT MOMENT vast, niet alleen een
      verwijzing naar de dienst. Verhoog je "Social media post" van 100
      naar 120 euro, dan blijven oude boekingen op 100 staan. Een grootboek
      dat verandert als je een prijslijst aanpast, is geen grootboek.
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

/** Waar een dienst per stuk in wordt afgerekend. */
export const serviceUnitEnum = pgEnum('service_unit', [
  'piece', // per stuk, bijv. een social post
  'hour', // per uur
  'month', // per maand, bijv. campagnebeheer
  'project', // vaste prijs voor een project
])

export const syncStatusEnum = pgEnum('sync_status', ['running', 'success', 'failed'])

/** Staat van een abonnement. Alleen 'active' wordt gefactureerd. */
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', // loopt: wordt maandelijks gefactureerd
  'paused', // tijdelijk stil: geen facturen, wel bewaard
  'ended', // gestopt
])

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

/* ------------------------------- Diensten ------------------------------- */

/**
 * De dienstencatalogus: wat James Robinson levert en wat het kost.
 *
 * Het tarief hier is het TARIEF VAN NU. Bij het boeken wordt het naar de
 * boeking gekopieerd, zodat een prijswijziging nooit oude boekingen raakt.
 */
export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Korte code voor intern gebruik, bijv. SOC-POST. */
    code: text('code'),
    name: text('name').notNull(),
    description: text('description'),
    /** Productgroep zoals in ClickUp: SEA, SEO, Social Management, ... */
    category: text('category'),
    /** Afdeling: Marketing, Web, Managed Services, Content Creatie. */
    department: text('department'),
    unit: serviceUnitEnum('unit').notNull().default('piece'),
    /** Verkooptarief per eenheid, in centen. */
    unitPriceCents: integer('unit_price_cents').notNull(),
    /**
     * Kostprijs per eenheid in centen: inkoop of interne uurkosten.
     * Alleen voor de marge in het financiele overzicht; klanten zien dit
     * nooit.
     */
    costPriceCents: integer('cost_price_cents'),
    /** Verwachte tijd per eenheid in minuten, voor capaciteitsplanning. */
    estimatedMinutes: integer('estimated_minutes'),
    /** Interne notities, bijv. wat er wel en niet bij hoort. */
    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('services_name_idx').on(t.name),
    uniqueIndex('services_code_idx').on(t.code),
    index('services_active_idx').on(t.active),
    // Een dienst van nul euro is geen dienst maar een vergissing.
    check('service_price_positive', sql`${t.unitPriceCents} > 0`),
    check(
      'service_cost_not_negative',
      sql`${t.costPriceCents} IS NULL OR ${t.costPriceCents} >= 0`,
    ),
  ],
)

/* ------------------------------ Abonnementen ---------------------------- */

/**
 * Een doorlopend abonnement van een klant.
 *
 * Zolang de staat 'active' is, wordt op de facturatiedag van elke maand een
 * factuur aangemaakt en het bedrag als budget bijgeschreven op de wallet.
 * Dat gebeurt door de dagelijkse run in src/lib/billing.ts.
 *
 * Dat een maand niet twee keer gefactureerd kan worden, is geen kwestie van
 * goed opletten: op invoices staat een unieke index op (abonnement, periode).
 * De database weigert de tweede poging, ook als de run dubbel draait.
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /**
     * De wallet waar het budget op komt.
     * ON DELETE RESTRICT: een wallet met een abonnement eraan verdwijnt niet
     * zomaar, want dan zou het budget nergens meer heen kunnen.
     */
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'restrict' }),

    name: text('name').notNull(),
    description: text('description'),

    /** Maandbedrag exclusief btw, in centen. Dit wordt het budget. */
    amountExclVatCents: integer('amount_excl_vat_cents').notNull(),
    /** Btw-percentage voor de factuur. Het budget is altijd exclusief btw. */
    vatRatePercent: integer('vat_rate_percent').notNull().default(21),

    status: subscriptionStatusEnum('status').notNull().default('active'),

    /**
     * Dag van de maand waarop gefactureerd wordt. Maximaal 28, zodat de
     * dag in februari ook bestaat.
     */
    billingDay: integer('billing_day').notNull().default(2),

    /** Eerste maand die gefactureerd wordt. */
    startedOn: timestamp('started_on', { withTimezone: true }).notNull(),
    /** Laatste maand die gefactureerd wordt. Leeg = doorlopend. */
    endsOn: timestamp('ends_on', { withTimezone: true }),

    /** Optioneel: bij welke dienst uit de catalogus dit abonnement hoort. */
    serviceId: uuid('service_id').references(() => services.id, {
      onDelete: 'set null',
    }),

    /** Task-id van het abonnement in ClickUp, voor de koppeling. */
    clickupTaskId: text('clickup_task_id'),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subscriptions_org_idx').on(t.organizationId),
    index('subscriptions_wallet_idx').on(t.walletId),
    index('subscriptions_status_idx').on(t.status),
    uniqueIndex('subscriptions_clickup_idx').on(t.clickupTaskId),
    check('subscription_amount_positive', sql`${t.amountExclVatCents} > 0`),
    check(
      'subscription_billing_day_valid',
      sql`${t.billingDay} >= 1 AND ${t.billingDay} <= 28`,
    ),
    check(
      'subscription_vat_valid',
      sql`${t.vatRatePercent} >= 0 AND ${t.vatRatePercent} <= 100`,
    ),
    // Een einddatum voor de startdatum zou betekenen dat er nooit
    // gefactureerd wordt; dat is bijna zeker een typefout.
    check(
      'subscription_ends_after_start',
      sql`${t.endsOn} IS NULL OR ${t.endsOn} >= ${t.startedOn}`,
    ),
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

    /**
     * Gevuld als deze factuur uit een abonnement komt.
     *
     * ON DELETE RESTRICT: een abonnement met facturen kan niet verwijderd
     * worden. Dat is met opzet en om twee redenen. Financiele historie
     * verdwijnt niet, en met SET NULL zou de periode achterblijven zonder
     * abonnement, waardoor de check hieronder zou breken en dezelfde maand
     * opnieuw gefactureerd kon worden. Een abonnement dat afloopt zet je op
     * 'ended'; verwijderen hoort niet.
     */
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'restrict',
    }),
    /**
     * De maand waarover deze abonnementsfactuur gaat, als 'JJJJ-MM'.
     * Samen met subscriptionId uniek: dat maakt dubbel factureren
     * onmogelijk in plaats van onwaarschijnlijk.
     */
    period: text('period'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invoices_org_idx').on(t.organizationId),
    uniqueIndex('invoices_org_number_idx').on(t.organizationId, t.number),
    uniqueIndex('invoices_moneybird_idx').on(t.moneybirdId),
    // De sluitsteen onder de maandelijkse run: een abonnement kan per
    // periode maar een factuur hebben.
    uniqueIndex('invoices_subscription_period_idx').on(t.subscriptionId, t.period),
    index('invoices_subscription_idx').on(t.subscriptionId),
    // Een periode zonder abonnement, of een abonnement zonder periode, zou
    // buiten die unieke index vallen en dus dubbel kunnen.
    check(
      'subscription_needs_period',
      sql`(${t.subscriptionId} IS NULL) = (${t.period} IS NULL)`,
    ),
    check('period_format', sql`${t.period} IS NULL OR ${t.period} ~ '^[0-9]{4}-[0-9]{2}$'`),
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

    /* --- Geleverde dienst (bij afschrijvingen) --- */

    /**
     * Welke dienst er is geleverd. Blijft leeg bij bijschrijvingen en bij
     * losse boekingen zonder dienst uit de catalogus.
     * ON DELETE RESTRICT: een dienst die is geboekt kan niet verdwijnen,
     * anders is niet meer te zien wat er geleverd is.
     */
    serviceId: uuid('service_id').references(() => services.id, {
      onDelete: 'restrict',
    }),
    /** Aantal eenheden, in honderdsten zodat 1,5 uur ook kan (= 150). */
    quantityHundredths: integer('quantity_hundredths'),
    /**
     * Het tarief per eenheid op het moment van boeken, in centen.
     * Bewust gekopieerd van de dienst: een prijswijziging mag oude
     * boekingen niet veranderen.
     */
    unitPriceCents: integer('unit_price_cents'),
    /**
     * De kostprijs per eenheid op het moment van boeken, in centen.
     * Om dezelfde reden gekopieerd: anders verandert de marge van vorig
     * jaar zodra je een inkoopprijs bijwerkt. Klanten zien dit nooit.
     */
    unitCostCents: integer('unit_cost_cents'),

    /**
     * Wie de dienst heeft geleverd. Dit is de basis voor het overzicht per
     * medewerker en is iets anders dan created_by_user_id (wie het invoerde).
     */
    deliveredByUserId: uuid('delivered_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

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
    index('ledger_service_idx').on(t.serviceId),
    index('ledger_delivered_by_idx').on(t.deliveredByUserId),
    index('ledger_booked_on_idx').on(t.bookedOn),
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
    // Een aantal van nul of negatief levert een bedrag op dat niet bij de
    // boeking past.
    check(
      'quantity_positive',
      sql`${t.quantityHundredths} IS NULL OR ${t.quantityHundredths} > 0`,
    ),
    // Staat er een dienst op de boeking, dan horen aantal en tarief er ook
    // bij: anders is het bedrag niet na te rekenen.
    check(
      'service_needs_quantity_and_price',
      sql`(${t.serviceId} IS NULL)
       OR (${t.quantityHundredths} IS NOT NULL AND ${t.unitPriceCents} IS NOT NULL)`,
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
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  wallet: one(wallets, {
    fields: [subscriptions.walletId],
    references: [wallets.id],
  }),
  service: one(services, {
    fields: [subscriptions.serviceId],
    references: [services.id],
  }),
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
  service: one(services, {
    fields: [ledgerEntries.serviceId],
    references: [services.id],
  }),
  createdBy: one(users, {
    fields: [ledgerEntries.createdByUserId],
    references: [users.id],
  }),
  deliveredBy: one(users, {
    fields: [ledgerEntries.deliveredByUserId],
    references: [users.id],
  }),
}))

export const servicesRelations = relations(services, ({ many }) => ({
  entries: many(ledgerEntries),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  entries: many(ledgerEntries),
}))

export type Organization = typeof organizations.$inferSelect
export type User = typeof users.$inferSelect
export type Wallet = typeof wallets.$inferSelect
export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type Service = typeof services.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type NewService = typeof services.$inferInsert
export type SyncRun = typeof syncRuns.$inferSelect
