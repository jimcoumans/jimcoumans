import {
  pgTable,
  text,
  timestamp,
  integer,
  bigint,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
  check,
  boolean,
  primaryKey,
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
/** Waar een klant in de relatie staat. */
export const organizationStatusEnum = pgEnum('organization_status', [
  'lead', // binnengekomen, nog geen gesprek
  'prospect', // in gesprek, nog geen klant
  'client', // lopende samenwerking
  'former', // oud-klant
])

/** Waar een lead vandaan komt. Vrije tekst met suggesties zou ook kunnen,
 *  maar een vaste lijst maakt "wat levert het meeste op" beantwoordbaar. */
export const leadSourceEnum = pgEnum('lead_source', [
  'referral', // doorverwijzing van een klant of relatie
  'network', // eigen netwerk
  'inbound', // via de website of een formulier
  'outbound', // zelf benaderd
  'partner', // via een partner
  'event', // beurs, borrel, spreekbeurt
  'other',
])

/** Wat er op de tijdlijn van een klant kan staan. */
export const activityKindEnum = pgEnum('activity_kind', [
  'note', // losse notitie
  'call', // telefoongesprek
  'meeting', // afspraak of bezoek
  'email', // mailwisseling
  'task', // afspraak met jezelf
])

/** Waar een offerte in het traject staat. */
export const quoteStatusEnum = pgEnum('quote_status', [
  'draft', // concept, nog niet naar de klant
  'awaiting_partner', // wachten op de offerte van een partner
  'sent', // bij de klant
  'accepted', // akkoord: dit is een opdracht
  'declined', // afgewezen
  'expired', // verlopen zonder reactie
])

/** Waar een offerteregel vandaan komt. */
export const quoteLineKindEnum = pgEnum('quote_line_kind', [
  'service', // een dienst uit onze eigen catalogus
  'partner', // werk dat een externe partner uitvoert
  'custom', // eenmalig, niet uit de catalogus
  'discount', // korting: een negatieve regel
])

/** Van wie een account is. Bepaalt wie het bij een breuk kan intrekken. */
export const accountOwnerEnum = pgEnum('account_owner', [
  'client', // de klant is eigenaar, wij hebben toegang gekregen
  'agency', // James Robinson is eigenaar
  'shared', // gezamenlijk, bijv. een account op naam van beiden
])

/** Soort externe partner. */
export const partnerTypeEnum = pgEnum('partner_type', [
  'photographer',
  'videographer',
  'printer',
  'developer',
  'copywriter',
  'translator',
  'designer',
  'other',
])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', // loopt: wordt maandelijks gefactureerd
  'paused', // tijdelijk stil: geen facturen, wel bewaard
  'ended', // gestopt
])


/* ---------------------------- Personeelsdossier -------------------------- */

/**
 * Hoe je iemand aanspreekt.
 *
 * Dit veld bestaat om een brief of mail goed te laten beginnen, en daarom
 * staat er 'neutraal' bij naast heer en mevrouw. Bij honderd contactpersonen
 * weet je het lang niet altijd, en dan is "Geachte heer" gokken. Neutraal
 * levert "Beste <voornaam>" op, en dat kan altijd.
 */
export const aanhefEnum = pgEnum('aanhef', ['heer', 'mevrouw', 'neutraal'])

/**
 * Hoe iemand betaald wordt.
 *
 * Een management fee is geen salaris: er gaat geen vakantiegeld overheen en
 * er zitten geen werkgeverslasten op, want het is een factuur van een eigen
 * BV. Zou je het als salaris invoeren, dan reken je je maandlast structureel
 * een derde te hoog.
 */
export const beloningEnum = pgEnum('beloning_soort', ['loondienst', 'management_fee'])

/**
 * DISC-type: hoe iemand het liefst benaderd wordt.
 *
 * D wil de kern, I wil het gesprek, S wil de rust, C wil de onderbouwing.
 * Alleen de vier hoofdtypes; een combinatie zet je in de achtergrond, want
 * een keuzelijst met zestien vakjes vult niemand in.
 */
export const discEnum = pgEnum('disc_type', ['D', 'I', 'S', 'C'])

/** Wat iemand drinkt. Klein detail, groot effect als je het onthoudt. */
export const drinkEnum = pgEnum('drink_preference', [
  'koffie_zwart',
  'koffie_suiker',
  'koffie_melk',
  'koffie_melk_suiker',
  'cappuccino',
  'latte_macchiato',
  'thee',
  'spa_rood',
  'spa_blauw',
  'anders',
])

/** Waarop iemand het liefst bereikt wordt. */
export const kanaalEnum = pgEnum('contact_channel', ['mail', 'telefoon', 'whatsapp', 'app'])

export const contractTypeEnum = pgEnum('contract_type', [
  'bepaalde_tijd',
  'onbepaalde_tijd',
  'oproep',
  'stage',
  'zzp',
])

/**
 * Wat er in een dossier terecht kan komen.
 *
 * Er staat met opzet geen 'ziekte' of 'verzuim' tussen. Een werkgever mag
 * wettelijk vastleggen DAT iemand ziek is, maar niet wat hij heeft; een vrij
 * tekstveld bij een verzuimregel is een uitnodiging om dat toch te doen.
 * Verzuim hoort daarom in een eigen vorm met vaste velden, niet hier.
 */
export const dossierKindEnum = pgEnum('dossier_kind', [
  'gesprek',
  'afspraak',
  'opleiding',
  'waarschuwing',
  'mijlpaal',
  'overig',
])

export const assetKindEnum = pgEnum('asset_kind', [
  'laptop',
  'telefoon',
  'auto',
  'sleutel',
  'toegangspas',
  'overig',
])

/** Bedrijf of particulier, zoals Moneybird het onderscheidt. */
export const klantTypeEnum = pgEnum('klant_type', ['bedrijf', 'particulier'])

/** Hoe de factuur de deur uit gaat. Dezelfde keuzes als in Moneybird. */
export const verzendmethodeEnum = pgEnum('verzendmethode', ['email', 'peppol', 'zelf'])

/** Rechtsvorm. Bepaalt wie er tekent en wie aansprakelijk is. */
export const legalFormEnum = pgEnum('legal_form', [
  'eenmanszaak',
  'vof',
  'maatschap',
  'cv',
  'bv',
  'nv',
  'stichting',
  'vereniging',
  'overheid',
  'anders',
])

/**
 * Hoe de relatie ervoor staat, met de hand ingevuld.
 *
 * Bewust een oordeel van een mens en geen berekening. Een klant kan keurig
 * betalen en toch op het punt staan te vertrekken; dat weet de marketing
 * manager en dat weet geen enkele query.
 */
export const relationHealthEnum = pgEnum('relation_health', [
  'uitstekend',
  'goed',
  'aandacht',
  'zorgelijk',
])

/* ------------------------------- Klanten -------------------------------- */

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** URL-veilige naam, gebruikt in links. */
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Logo van de klant. Leeg laat de initialen zien. */
    logoImageId: uuid('logo_image_id'),
    /** Task-id van het bedrijf in de ClickUp CRM-lijst. */
    clickupCompanyId: text('clickup_company_id'),

    /* --- Bedrijfsgegevens --- */
    status: organizationStatusEnum('status').notNull().default('client'),
    /** Branche, bijv. Horeca of Makelaardij. Vrije tekst met een suggestielijst. */
    industry: text('industry'),
    kvkNumber: text('kvk_number'),
    vatNumber: text('vat_number'),
    website: text('website'),
    phone: text('phone'),
    /** Algemeen e-mailadres van het bedrijf, niet van een persoon. */
    email: text('email'),
    addressLine: text('address_line'),
    postalCode: text('postal_code'),
    city: text('city'),
    country: text('country').notNull().default('Nederland'),
    clientSince: timestamp('client_since', { withTimezone: true }),
    notes: text('notes'),

    /* --- Moneybird ---
       Dezelfde velden als in de boekhouding, zodat we die kant op kunnen
       synchroniseren zonder eerst alles opnieuw te moeten invoeren.

       Het klantnummer is het belangrijkste veld van dit hele blok: daar hangt
       de koppeling met ClickUp aan. Een dubbel klantnummer laat die
       automatisering stilletjes naar de verkeerde klant wijzen, en daarom
       staat er een unieke index op.

       Wat hier NIET staat is de IBAN. Die heeft de boekhouding nodig om te
       incasseren en daar staat hij al; vanuit dit systeem wordt niets
       afgeschreven. Zodra dat verandert is het één kolom erbij. */
    customerNumber: text('customer_number'),
    klantType: klantTypeEnum('klant_type'),
    /** Id van dit contact in Moneybird, voor de koppeling. */
    moneybirdContactId: text('moneybird_contact_id'),
    verzendmethode: verzendmethodeEnum('verzendmethode'),
    /** Projectnummer zoals dat in Moneybird als extra veld staat. */
    projectNumber: text('project_number'),

    /* --- Facturatie ---
       Apart van het bezoekadres, want de post gaat vaak ergens anders heen
       dan waar je op de koffie komt. Leeg laten betekent: gebruik het adres
       hierboven. */
    invoiceEmail: text('invoice_email'),
    invoiceAddressLine: text('invoice_address_line'),
    invoicePostalCode: text('invoice_postal_code'),
    invoiceCity: text('invoice_city'),
    /** Klantnummer of referentie die op de factuur moet. */
    invoiceReference: text('invoice_reference'),
    /** T.a.v. op de factuur, als die naar een specifiek persoon moet. */
    invoiceAttn: text('invoice_attn'),
    paymentTermDays: integer('payment_term_days'),

    /* --- Profiel ---
       Waarmee je klanten met elkaar kunt vergelijken en filteren: waar zitten
       ze, wat doen ze, hoe groot zijn ze, en hoe staat de relatie ervoor. */

    /** Regio, bijv. Zuid-Limburg. Los van de stad: daarop filter je. */
    region: text('region'),
    legalForm: legalFormEnum('legal_form'),
    /** Wanneer het bedrijf is opgericht. Levert ook jubilea op. */
    foundedOn: timestamp('founded_on', { withTimezone: true }),
    relationHealth: relationHealthEnum('relation_health'),
    /** Eén zin: waar verdienen ze hun geld mee. */
    coreActivity: text('core_activity'),
    employeeCount: integer('employee_count'),
    /**
     * Jaaromzet bij benadering, in centen.
     *
     * Bigint omdat centen bij een omzet boven 21 miljoen niet meer in een
     * gewone integer passen, en dat is precies het soort grens waar je pas
     * tegenaan loopt als het misgaat.
     */
    annualRevenueCents: bigint('annual_revenue_cents', { mode: 'number' }),

    /* --- Online ---
       Waar ze te vinden zijn. Handig bij een audit en bij het opstellen van
       een voorstel: je ziet in één blik welke kanalen ze wel en niet hebben. */
    linkedinUrl: text('linkedin_url'),
    facebookUrl: text('facebook_url'),
    instagramUrl: text('instagram_url'),
    youtubeUrl: text('youtube_url'),
    tiktokUrl: text('tiktok_url'),

    /** Bij welk bureau zaten ze hiervoor, en waarom zijn ze weg. */
    previousAgencies: text('previous_agencies'),
    /** Waar je bij deze klant op moet letten. Kort en concreet. */
    alertOn: text('alert_on'),

    /* --- Commercieel --- */
    /** Waar deze lead vandaan kwam. Blijft staan als hij klant wordt; dat is
        precies wat je wilt weten als je vraagt wat het meeste oplevert. */
    leadSource: leadSourceEnum('lead_source'),
    /** Wat de volgende stap is, en wanneer. Dit is de pijplijn zonder bord. */
    nextActionOn: timestamp('next_action_on', { withTimezone: true }),
    nextActionNote: text('next_action_note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('organizations_slug_idx').on(t.slug),
    uniqueIndex('organizations_clickup_idx').on(t.clickupCompanyId),
    index('organizations_status_idx').on(t.status),
    index('organizations_industry_idx').on(t.industry),
    index('organizations_region_idx').on(t.region),
    // Een dubbel klantnummer laat de ClickUp-automatisering stilletjes naar
    // de verkeerde klant wijzen. Dat vangt de database af.
    uniqueIndex('organizations_customer_number_idx').on(t.customerNumber),
    uniqueIndex('organizations_moneybird_idx').on(t.moneybirdContactId),
    index('organizations_health_idx').on(t.relationHealth),
    check(
      'organization_employee_count_valid',
      sql`${t.employeeCount} IS NULL OR ${t.employeeCount} >= 0`,
    ),
    check(
      'organization_revenue_not_negative',
      sql`${t.annualRevenueCents} IS NULL OR ${t.annualRevenueCents} >= 0`,
    ),
    // Om "wat staat er deze week open" te kunnen vragen zonder alles te lezen.
    index('organizations_next_action_idx').on(t.nextActionOn),
    check(
      'organization_payment_term_positive',
      sql`${t.paymentTermDays} IS NULL OR ${t.paymentTermDays} > 0`,
    ),
  ],
)

/* ---------------------------- Contactpersonen --------------------------- */

/**
 * Een contactpersoon bij een klant.
 *
 * Dit is met opzet iets anders dan een rij in `users`. Een contactpersoon is
 * CRM-gegeven: wie bel je, wie tekent, wie krijgt de factuur. Een user is een
 * identiteit die kan inloggen. De meeste contactpersonen hoeven nooit in te
 * loggen, en niet elke inlogger is een contactpersoon. Wil je iemand beide
 * geven, dan wijst userId naar het account.
 */
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /**
     * De volledige naam zoals je hem toont.
     *
     * De app stelt hem samen uit de delen hieronder. Zo staat er nooit een
     * naam op het scherm die iets anders zegt dan de velden waarop je
     * sorteert of waarmee je een aanhef maakt.
     */
    name: text('name').notNull(),
    firstName: text('first_name'),
    /** Tussenvoegsel: van, de, van der. Apart, want je sorteert er niet op. */
    infix: text('infix'),
    lastName: text('last_name'),
    aanhef: aanhefEnum('aanhef'),
    /** Profielfoto. Leeg laat de initialen zien. */
    avatarImageId: uuid('avatar_image_id'),
    /** Functie binnen het bedrijf, bijv. Eigenaar of Marketing manager. */
    jobTitle: text('job_title'),
    email: text('email'),
    phone: text('phone'),
    mobile: text('mobile'),
    linkedinUrl: text('linkedin_url'),
    /** Afdeling, bijv. Marketing of Directie. */
    department: text('department'),

    /* --- Verjaardag ---
       Dag en maand apart, want lang niet iedereen deelt zijn geboortejaar en
       een verzonnen jaartal is erger dan geen jaartal. Ze horen wel bij
       elkaar: een dag zonder maand zegt niets. */
    birthDay: integer('birth_day'),
    birthMonth: integer('birth_month'),
    birthYear: integer('birth_year'),

    /* --- Attentiewaarde ---
       Dit deel maakt het verschil tussen een adresboek en iemand kennen. Het
       is allemaal optioneel: een half ingevuld profiel is beter dan een leeg
       profiel dat niemand durft aan te raken. */

    /** Hoe je hem het makkelijkst bereikt. */
    preferredChannel: kanaalEnum('preferred_channel'),
    /** D, I, S of C: hoe iemand het liefst benaderd wordt. */
    discType: discEnum('disc_type'),
    drinkPreference: drinkEnum('drink_preference'),
    /** Naam van de partner. Eén veld: we bouwen geen stamboom. */
    partnerName: text('partner_name'),
    /** Waar hij vandaan komt, waar we hem van kennen, wat zijn verhaal is. */
    background: text('background'),
    /** Vrij veld: voetbal, wielrennen, koken. Kommagescheiden leest prima. */
    hobbies: text('hobbies'),

    /** De vaste contactpersoon. Er kan er maar één per klant zijn. */
    isPrimary: boolean('is_primary').notNull().default(false),
    /** Krijgt de facturen. Meerdere mensen mogen dit zijn. */
    receivesInvoices: boolean('receives_invoices').notNull().default(false),

    /** Optioneel gekoppeld aan een account dat kan inloggen. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('contacts_org_idx').on(t.organizationId),
    // Om "wie is er deze maand jarig" te kunnen vragen.
    index('contacts_birthday_idx').on(t.birthMonth, t.birthDay),
    check(
      'contact_birthday_complete',
      sql`(${t.birthDay} IS NULL) = (${t.birthMonth} IS NULL)`,
    ),
    check(
      'contact_birth_day_valid',
      sql`${t.birthDay} IS NULL OR (${t.birthDay} >= 1 AND ${t.birthDay} <= 31)`,
    ),
    check(
      'contact_birth_month_valid',
      sql`${t.birthMonth} IS NULL OR (${t.birthMonth} >= 1 AND ${t.birthMonth} <= 12)`,
    ),
    check(
      'contact_birth_year_valid',
      sql`${t.birthYear} IS NULL OR (${t.birthYear} >= 1900 AND ${t.birthYear} <= 2100)`,
    ),
    index('contacts_name_idx').on(t.name),
    uniqueIndex('contacts_user_idx').on(t.userId),
    // Twee vaste contactpersonen bij dezelfde klant betekent dat niemand
    // weet wie je moet bellen. De index staat alleen op de primaire rijen,
    // zodat er wel meerdere niet-primaire contacten mogen bestaan.
    uniqueIndex('contacts_one_primary_idx')
      .on(t.organizationId)
      .where(sql`${t.isPrimary}`),
  ],
)

/* ------------------------------- Offertes ------------------------------- */

/**
 * Een offerte aan een klant.
 *
 * Een offerte kan werk van onszelf bevatten, werk dat een partner uitvoert,
 * of allebei. Bij een doorzetopdracht koop je bij de partner in en zet je er
 * je eigen marge en uren bovenop; de klant ziet één voorstel.
 *
 * De bedragen staan op de regels, niet hier. Een totaal dat als kolom wordt
 * bijgehouden loopt vroeg of laat uit de pas met de regels waar het uit
 * hoort te volgen.
 */
/* -------------------------------------------------------------------------
   Accountmanagers.

   Normaal is er één per klant, maar het kunnen er meer zijn — bij een klant
   waar zowel een strateeg als een performance-specialist op zit. Daarom een
   eigen tabel en geen kolom op het bedrijf: een kolom dwingt je tot één, en
   dan ga je de tweede in een notitieveld zetten.
   ------------------------------------------------------------------------- */

export const organizationOwners = pgTable(
  'organization_owners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Waarvoor deze persoon aanspreekpunt is, bijv. Strategie of SEA. */
    role: text('role'),
    /** De eerste aanspreekpartner. Er kan er maar één zijn. */
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Dezelfde collega twee keer op dezelfde klant is een vergissing.
    uniqueIndex('organization_owners_pair_idx').on(t.organizationId, t.userId),
    index('organization_owners_user_idx').on(t.userId),
    // Eén eerste aanspreekpartner per klant, afgedwongen door de database.
    uniqueIndex('organization_owners_primary_idx')
      .on(t.organizationId)
      .where(sql`${t.isPrimary}`),
  ],
)

/* -------------------------------------------------------------------------
   Labels.

   Post-its op een bedrijf: "heeft webshop", "seizoensgebonden", "Limburg".
   Dit is de ontsnapping voor alles wat we niet als veld hebben voorzien,
   zonder dat er voor elke inval een migratie nodig is.
   ------------------------------------------------------------------------- */

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    /** Kleur uit de huisstijl, voor herkenbaarheid in een lange lijst. */
    color: text('color'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Twee keer hetzelfde label is twee halve groepen.
    uniqueIndex('tags_name_idx').on(sql`lower(${t.name})`),
  ],
)

export const organizationTags = pgTable(
  'organization_tags',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.tagId] }),
    index('organization_tags_tag_idx').on(t.tagId),
  ],
)

/* -------------------------------------------------------------------------
   Tijdlijn.

   Hier staat alleen wat iemand met de hand vastlegt: een gesprek, een
   bezoek, een notitie. Offertes, facturen en boekingen staan al ergens
   anders en worden bij het tonen door de tijdlijn gemengd. Ze hier nog eens
   overschrijven zou betekenen dat er twee waarheden zijn die uit elkaar
   kunnen lopen, en dat is precies wat dit systeem niet moet doen.
   ------------------------------------------------------------------------- */

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Met wie, als het om een persoon ging. */
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    /** Wie het vastlegde. Blijft leeg als die collega later vertrekt. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    kind: activityKindEnum('kind').notNull().default('note'),
    subject: text('subject').notNull(),
    body: text('body'),

    /** Wanneer het gebeurde — niet wanneer het werd ingevoerd. */
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activities_org_idx').on(t.organizationId, t.occurredAt),
    index('activities_contact_idx').on(t.contactId),
    check('activity_subject_not_empty', sql`length(trim(${t.subject})) > 0`),
  ],
)

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),

    /** Offertenummer zoals de klant het ziet, bijv. OFF-2026-014. */
    number: text('number').notNull(),
    title: text('title').notNull(),
    status: quoteStatusEnum('status').notNull().default('draft'),

    /** Contactpersoon aan wie de offerte is gericht. */
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),

    /** Inleidende tekst boven de regels. */
    introText: text('intro_text'),
    /** Voorwaarden onder de regels. */
    termsText: text('terms_text'),

    vatRatePercent: integer('vat_rate_percent').notNull().default(21),

    issuedOn: timestamp('issued_on', { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),

    /** Waarom afgewezen; leerzaam bij het volgende voorstel. */
    declineReason: text('decline_reason'),

    notes: text('notes'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('quotes_org_idx').on(t.organizationId),
    index('quotes_status_idx').on(t.status),
    uniqueIndex('quotes_number_idx').on(t.number),
    check(
      'quote_vat_valid',
      sql`${t.vatRatePercent} >= 0 AND ${t.vatRatePercent} <= 100`,
    ),
  ],
)

/**
 * Een regel op een offerte.
 *
 * Elke regel kent TWEE bedragen: wat de klant betaalt (unitPriceCents) en wat
 * het ons kost (unitCostCents). Bij een partnerregel is de kostprijs wat de
 * partner ons factureert; bij een eigen dienst de interne kostprijs. Daaruit
 * volgt de marge per regel, per offerte en per partner, zonder dat daar een
 * aparte administratie voor nodig is.
 */
export const quoteLines = pgTable(
  'quote_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),

    /** Volgorde op de offerte. */
    sortOrder: integer('sort_order').notNull().default(0),
    kind: quoteLineKindEnum('kind').notNull().default('custom'),

    /** Bij kind 'service': welke dienst uit de catalogus. */
    serviceId: uuid('service_id').references(() => services.id, { onDelete: 'set null' }),
    /** Bij kind 'partner': wie het uitvoert. */
    partnerId: uuid('partner_id').references(() => partners.id, { onDelete: 'restrict' }),

    description: text('description').notNull(),
    /** Toelichting die de klant leest. */
    detail: text('detail'),

    /** Aantal in honderdsten, zodat 1,5 uur ook kan. */
    quantityHundredths: integer('quantity_hundredths').notNull().default(100),
    /** Wat de klant per eenheid betaalt, in centen. */
    unitPriceCents: integer('unit_price_cents').notNull(),
    /** Wat het ons per eenheid kost, in centen. Leeg = onbekend. */
    unitCostCents: integer('unit_cost_cents'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('quote_lines_quote_idx').on(t.quoteId, t.sortOrder),
    index('quote_lines_partner_idx').on(t.partnerId),
    index('quote_lines_service_idx').on(t.serviceId),
    // Een aantal van nul levert een regel op die niets doet maar wel
    // meetelt in het overzicht.
    check('quote_line_quantity_positive', sql`${t.quantityHundredths} > 0`),
    // Een kortingsregel is negatief; alle andere regels positief.
    check(
      'quote_line_price_sign',
      sql`(${t.kind} = 'discount' AND ${t.unitPriceCents} < 0)
       OR (${t.kind} <> 'discount' AND ${t.unitPriceCents} > 0)`,
    ),
    check(
      'quote_line_cost_not_negative',
      sql`${t.unitCostCents} IS NULL OR ${t.unitCostCents} >= 0`,
    ),
    // Een partnerregel zonder partner is niet terug te voeren op wie het
    // uitvoert, en valt dus buiten de partnerrapportage.
    check(
      'partner_line_needs_partner',
      sql`(${t.kind} <> 'partner') OR (${t.partnerId} IS NOT NULL)`,
    ),
  ],
)

/* ---------------------------- Accountregister --------------------------- */

/**
 * WELKE systemen een klant heeft en wie erbij kan. Bewust GEEN wachtwoorden.
 *
 * Er is met opzet geen kolom voor een wachtwoord, sleutel of token, ook niet
 * versleuteld. De reden: zodra de inloggegevens van tientallen klanten in
 * deze database staan, is één lek geen incident meer maar een sleutelbos
 * naar alle klantomgevingen tegelijk. Dat risico hoort bij een
 * wachtwoordmanager die daarvoor gebouwd en gecontroleerd is.
 *
 * Wat hier wel staat is het overzicht: welk systeem, van wie het account is,
 * of er tweestapsverificatie op zit, en WAAR het wachtwoord te vinden is
 * (vaultReference). Daarmee kun je in een oogopslag zien wat er bij een
 * klant hoort, zonder dat dit bestand zelf een doelwit wordt.
 *
 * Er staat een test op die faalt zodra iemand hier alsnog een
 * wachtwoordkolom aan toevoegt.
 */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** Hoe wij het noemen, bijv. "WordPress admin". */
    name: text('name').notNull(),
    /** Het systeem: WordPress, Google Ads, Meta Business Manager, ... */
    system: text('system'),
    url: text('url'),

    /**
     * Waarmee je inlogt: meestal een e-mailadres. Dit is geen geheim, maar
     * wel de helft van de sleutel, dus het staat alleen in het beheer.
     */
    loginHint: text('login_hint'),

    owner: accountOwnerEnum('owner').notNull().default('client'),

    /**
     * Waar het wachtwoord staat, bijv. de naam van het item in 1Password.
     * Een verwijzing, geen inhoud.
     */
    vaultReference: text('vault_reference'),
    /**
     * Directe link naar het item in de wachtwoordmanager (Bitwarden).
     * Dit is een verwijzing, geen geheim: wie de link opent moet nog steeds
     * zelf in Bitwarden kunnen. Het scheelt alleen het zoeken.
     */
    vaultUrl: text('vault_url'),

    hasMfa: boolean('has_mfa').notNull().default(false),
    /** Wie de tweestapscode kan geven. */
    mfaNotes: text('mfa_notes'),

    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('accounts_org_idx').on(t.organizationId),
    index('accounts_system_idx').on(t.system),
  ],
)

/* ------------------------------- Partners ------------------------------- */

/**
 * Een externe partner: fotograaf, drukker, videograaf, freelance developer.
 * Hier staan de afspraken die met hen gelden, los van een specifieke klant.
 */
export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: partnerTypeEnum('type').notNull().default('other'),

    contactName: text('contact_name'),
    email: text('email'),
    phone: text('phone'),
    website: text('website'),

    kvkNumber: text('kvk_number'),
    vatNumber: text('vat_number'),

    /* --- Tariefafspraken --- */
    /** Uurtarief in centen. */
    hourlyRateCents: integer('hourly_rate_cents'),
    /** Dagtarief in centen. */
    dayRateCents: integer('day_rate_cents'),
    /** Betaaltermijn in dagen. */
    paymentTermDays: integer('payment_term_days'),
    /** Wat er verder is afgesproken: staffels, reiskosten, voorwaarden. */
    agreementNotes: text('agreement_notes'),

    notes: text('notes'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('partners_name_idx').on(t.name),
    index('partners_type_idx').on(t.type),
    index('partners_active_idx').on(t.active),
    check(
      'partner_hourly_positive',
      sql`${t.hourlyRateCents} IS NULL OR ${t.hourlyRateCents} > 0`,
    ),
    check('partner_day_positive', sql`${t.dayRateCents} IS NULL OR ${t.dayRateCents} > 0`),
    check(
      'partner_term_positive',
      sql`${t.paymentTermDays} IS NULL OR ${t.paymentTermDays} > 0`,
    ),
  ],
)

/**
 * Welke partner bij welke klant hoort, en in welke rol.
 * Dit is waar "de huisfotograaf van Hotel Voncken" vandaan komt.
 */
export const organizationPartners = pgTable(
  'organization_partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),

    /** De rol bij deze klant, bijv. Huisfotograaf of Vaste drukker. */
    role: text('role').notNull(),
    /** Afwijkend uurtarief voor deze klant, in centen. Leeg = het standaardtarief. */
    customHourlyRateCents: integer('custom_hourly_rate_cents'),
    since: timestamp('since', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('org_partners_org_idx').on(t.organizationId),
    index('org_partners_partner_idx').on(t.partnerId),
    // Dezelfde partner twee keer aan dezelfde klant hangen levert alleen
    // verwarring op over welke afspraak geldt.
    uniqueIndex('org_partners_pair_idx').on(t.organizationId, t.partnerId),
    check(
      'org_partner_rate_positive',
      sql`${t.customHourlyRateCents} IS NULL OR ${t.customHourlyRateCents} > 0`,
    ),
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

    /* --- Portfolio ---
       Niet elke collega draagt een klantportfolio. Wie dat wel doet krijgt
       een eigen kolom op het portfoliobord, met een maandelijks doel om de
       belasting tegen af te zetten. */
    isMarketingManager: boolean('is_marketing_manager').notNull().default(false),
    /** Maanddoel in centen, bijv. 2000000 voor 20.000 euro. */
    monthlyTargetCents: integer('monthly_target_cents'),

    /* --- Wie is dit --- */
    jobTitle: text('job_title'),
    /** Afdeling: Marketing, Web, Managed Services, Content Creatie. */
    department: text('department'),
    phone: text('phone'),
    mobile: text('mobile'),
    linkedinUrl: text('linkedin_url'),

    /* --- Verjaardag ---
       Zelfde afspraak als bij contactpersonen: dag en maand horen bij elkaar,
       het jaar mag je weglaten. Collega's staan hierdoor in hetzelfde
       attentieoverzicht als klanten; dat is waar het om begonnen was. */
    birthDay: integer('birth_day'),
    birthMonth: integer('birth_month'),
    birthYear: integer('birth_year'),

    /* --- In dienst --- */
    startedOn: timestamp('started_on', { withTimezone: true }),
    endedOn: timestamp('ended_on', { withTimezone: true }),
    /** Contracturen per week, in kwartieren: 3200 is 32 uur. */
    contractHoursPerWeekQuarters: integer('contract_hours_week_quarters'),
    /**
     * Wat een uur van deze collega ons kost, in centen.
     *
     * Alleen zichtbaar voor beheerders: dit ligt dicht tegen salaris aan en
     * hoort niet op een scherm dat het hele team openslaat.
     */
    hourlyCostCents: integer('hourly_cost_cents'),

    firstName: text('first_name'),
    infix: text('infix'),
    lastName: text('last_name'),
    aanhef: aanhefEnum('aanhef'),
    avatarImageId: uuid('avatar_image_id'),

    /**
     * Bcrypt-hash van het wachtwoord, gemaakt door pgcrypto.
     *
     * Dit is geen bewaard geheim: uit een bcrypt-hash valt het wachtwoord niet
     * terug te rekenen, en er zit een salt in zodat twee mensen met hetzelfde
     * wachtwoord een andere hash krijgen.
     *
     * Het hashen én het vergelijken gebeurt in de database met pgcrypto. Dat
     * scheelt een extra pakket, en het betekent dat een wachtwoord ook met één
     * regel SQL te zetten is — precies wat je nodig hebt als niemand kan
     * inloggen en de mail het niet doet.
     *
     * Leeg betekent: deze gebruiker logt in met een inloglink. Dat blijft de
     * standaard voor klanten.
     */
    passwordHash: text('password_hash'),

    /* Adres en noodcontact: wat je nodig hebt als er iets misgaat of als er
       post heen moet. Geen BSN en geen IBAN — zie de toelichting bij het
       personeelsdossier verderop. */
    addressLine: text('address_line'),
    postalCode: text('postal_code'),
    city: text('city'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    emergencyContactRelation: text('emergency_contact_relation'),

    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('users_department_idx').on(t.department),
    index('users_birthday_idx').on(t.birthMonth, t.birthDay),
    check(
      'user_birthday_complete',
      sql`(${t.birthDay} IS NULL) = (${t.birthMonth} IS NULL)`,
    ),
    check(
      'user_birth_day_valid',
      sql`${t.birthDay} IS NULL OR (${t.birthDay} >= 1 AND ${t.birthDay} <= 31)`,
    ),
    check(
      'user_birth_month_valid',
      sql`${t.birthMonth} IS NULL OR (${t.birthMonth} >= 1 AND ${t.birthMonth} <= 12)`,
    ),
    check(
      'user_contract_hours_valid',
      sql`${t.contractHoursPerWeekQuarters} IS NULL OR (${t.contractHoursPerWeekQuarters} > 0 AND ${t.contractHoursPerWeekQuarters} <= 8000)`,
    ),
    check(
      'user_hourly_cost_not_negative',
      sql`${t.hourlyCostCents} IS NULL OR ${t.hourlyCostCents} >= 0`,
    ),
    // Uit dienst voordat je begon kan niet.
    check(
      'user_employment_order',
      sql`${t.endedOn} IS NULL OR ${t.startedOn} IS NULL OR ${t.endedOn} >= ${t.startedOn}`,
    ),
    check(
      'user_target_positive',
      sql`${t.monthlyTargetCents} IS NULL OR ${t.monthlyTargetCents} > 0`,
    ),
    // Een doel zonder portfolio zegt niets; het hoort bij de rol.
    check(
      'user_target_needs_manager',
      sql`${t.monthlyTargetCents} IS NULL OR ${t.isMarketingManager}`,
    ),
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

    /**
     * Het maandbudget exclusief btw, in centen: wat de klant aan diensten
     * krijgt en wat er in zijn wallet wordt bijgeschreven.
     */
    amountExclVatCents: integer('amount_excl_vat_cents').notNull(),
    /**
     * Korting in centen: wat er van de factuur af gaat.
     *
     * Het budget blijft heel — de klant krijgt waar hij recht op heeft — maar
     * hij betaalt minder. Zo staat de korting als getal in de administratie
     * in plaats van verstopt in een lager budget, en kun je zien hoeveel we
     * per maand weggeven.
     *
     * Nul bij iedereen die geen korting heeft, en dat is het gewone geval.
     */
    discountCents: integer('discount_cents').notNull().default(0),
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
    check('subscription_discount_not_negative', sql`${t.discountCents} >= 0`),
    // De korting mag het budget niet opeten: dan zou er een factuur van nul
    // of minder uitgaan, en dat is geen factuur meer.
    check(
      'subscription_discount_below_amount',
      sql`${t.discountCents} < ${t.amountExclVatCents}`,
    ),
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
  contacts: many(contacts),
  partners: many(organizationPartners),
  accounts: many(accounts),
  quotes: many(quotes),
}))

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [quotes.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, { fields: [quotes.contactId], references: [contacts.id] }),
  lines: many(quoteLines),
}))

export const quoteLinesRelations = relations(quoteLines, ({ one }) => ({
  quote: one(quotes, { fields: [quoteLines.quoteId], references: [quotes.id] }),
  service: one(services, { fields: [quoteLines.serviceId], references: [services.id] }),
  partner: one(partners, { fields: [quoteLines.partnerId], references: [partners.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  organization: one(organizations, {
    fields: [accounts.organizationId],
    references: [organizations.id],
  }),
}))

export const contactsRelations = relations(contacts, ({ one }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
}))

export const partnersRelations = relations(partners, ({ many }) => ({
  organizations: many(organizationPartners),
}))

export const organizationPartnersRelations = relations(organizationPartners, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationPartners.organizationId],
    references: [organizations.id],
  }),
  partner: one(partners, {
    fields: [organizationPartners.partnerId],
    references: [partners.id],
  }),
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

/**
 * De kinderen van een contactpersoon.
 *
 * Een eigen tabel omdat er meerdere zijn en je ze los wilt kunnen bijwerken.
 *
 * Hou dit klein. Dit zijn gegevens van kinderen van iemand anders, en die
 * bewaar je niet omdat het kan maar omdat je er iets mee doet: een naam
 * noemen, een kaartje sturen. Een naam, een verjaardag en een zin is genoeg;
 * meer heb je niet nodig en wil je niet verantwoorden.
 */
export const contactChildren = pgTable(
  'contact_children',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    birthDay: integer('birth_day'),
    birthMonth: integer('birth_month'),
    birthYear: integer('birth_year'),
    /** Eén zin: voetbalt, zit in de examenklas, heet naar zijn opa. */
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('contact_children_contact_idx').on(t.contactId),
    check('child_name_not_empty', sql`length(trim(${t.name})) > 0`),
    check('child_birthday_complete', sql`(${t.birthDay} IS NULL) = (${t.birthMonth} IS NULL)`),
    check(
      'child_birth_day_valid',
      sql`${t.birthDay} IS NULL OR (${t.birthDay} >= 1 AND ${t.birthDay} <= 31)`,
    ),
    check(
      'child_birth_month_valid',
      sql`${t.birthMonth} IS NULL OR (${t.birthMonth} >= 1 AND ${t.birthMonth} <= 12)`,
    ),
  ],
)

/* -------------------------------------------------------------------------
   Rondom de klant: vestigingen, concurrenten en doelen.

   Alle drie eigen tabellen omdat er meerdere van kunnen zijn. Een lijstje in
   een tekstveld leest prima tot je erop wilt filteren of er een datum aan
   wilt hangen, en dan moet je alsnog opnieuw beginnen.
   ------------------------------------------------------------------------- */

/** Vestigingen. De hoofdvestiging staat als adres op de klant zelf. */
export const organizationLocations = pgTable(
  'organization_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    addressLine: text('address_line'),
    postalCode: text('postal_code'),
    city: text('city'),
    phone: text('phone'),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('organization_locations_org_idx').on(t.organizationId),
    check('location_name_not_empty', sql`length(trim(${t.name})) > 0`),
  ],
)

/**
 * Concurrenten van een klant.
 *
 * Per klant vastgelegd en niet als eigen bedrijvenlijst. Dezelfde partij kan
 * bij de ene klant een concurrent zijn en bij de andere niet, en wat je erover
 * noteert gaat over díe verhouding. Eén gedeelde concurrentenlijst zou die
 * context weggooien.
 */
export const competitors = pgTable(
  'competitors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    website: text('website'),
    /** Waarom zij: wat doen ze beter, waar zitten ze in de weg. */
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('competitors_org_idx').on(t.organizationId),
    index('competitors_name_idx').on(t.name),
    check('competitor_name_not_empty', sql`length(trim(${t.name})) > 0`),
  ],
)

/**
 * De doelen van een klant.
 *
 * Met een streefdatum en een vinkje, want een doel zonder datum is een wens.
 * Wat er gebeurd is om het te halen staat op de tijdlijn.
 */
export const organizationGoals = pgTable(
  'organization_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    notes: text('notes'),
    targetOn: timestamp('target_on', { withTimezone: true }),
    achievedOn: timestamp('achieved_on', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('organization_goals_org_idx').on(t.organizationId),
    check('goal_title_not_empty', sql`length(trim(${t.title})) > 0`),
  ],
)

/**
 * Mislukte inlogpogingen, om brute kracht af te remmen.
 *
 * Een wachtwoordveld op een openbare URL is een uitnodiging om te raden. Met
 * een inloglink was dat geen probleem — daar valt niets te raden — maar met
 * een wachtwoord wel. Na te veel misser op hetzelfde adres gaat de deur een
 * kwartier op slot.
 *
 * Alleen mislukte pogingen worden bewaard. Een geslaagde inlog laat geen
 * spoor achter dat je later nog nodig hebt.
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
    ip: text('ip'),
  },
  (t) => [index('login_attempts_email_idx').on(t.email, t.attemptedAt)],
)

/* -------------------------------------------------------------------------
   Afbeeldingen: logo's en profielfoto's.

   Ze staan in de database en niet in een aparte opslagdienst. Dat is een
   bewuste afweging: het gaat om honderd logo's en tien pasfoto's van hooguit
   een paar honderd kilobyte, en dat weegt niet op tegen een extra dienst met
   eigen sleutels, een eigen bucket en een eigen manier om stuk te gaan.
   Groeit dit uit tot documenten of veel grotere bestanden, dan is het tijd om
   het te verhuizen — en dan hoeft alleen dit bestand mee.

   Een eigen tabel, zodat de bytes niet in elke query over klanten of
   contactpersonen meekomen en het weggooien van een foto één regel is.

   SVG wordt bewust geweigerd. Een SVG kan script bevatten, en een plaatje dat
   iemand kan uploaden en dat daarna in de browser van een collega draait, is
   een gat dat je niet wilt.
   ------------------------------------------------------------------------- */

export const images = pgTable(
  'images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** image/png, image/jpeg of image/webp. */
    contentType: text('content_type').notNull(),
    bytes: integer('bytes').notNull(),
    data: text('data').notNull(),
    /** Oorspronkelijke bestandsnaam, puur om te tonen. */
    filename: text('filename'),
    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Een megabyte is ruim voor een logo en krap genoeg om te voorkomen dat
    // iemand een foto van zijn telefoon rechtstreeks in de database zet.
    check('image_size_reasonable', sql`${t.bytes} > 0 AND ${t.bytes} <= 1048576`),
    check(
      'image_type_allowed',
      sql`${t.contentType} IN ('image/png', 'image/jpeg', 'image/webp')`,
    ),
  ],
)

/* -------------------------------------------------------------------------
   Personeelsdossier

   Wat hier NIET in staat, en waarom:

   - Geen BSN en geen kopie identiteitsbewijs. Die heeft de salarisadministratie
     nodig en die staan daar al. Ze hier ook bewaren verdubbelt het risico
     zonder dat er iets bij komt.
   - Geen IBAN, om dezelfde reden: er wordt vanuit dit systeem niet uitbetaald.
   - Geen medische gegevens. Een werkgever mag vastleggen dat iemand ziek is,
     niet wat hij heeft. Daarom is er hier geen veld waar dat in zou passen.

   Wat er wel in staat is wat we met iemand hebben afgesproken en hoe dat in
   de loop van de tijd veranderd is.
   ------------------------------------------------------------------------- */

/**
 * De contracten van een collega, op volgorde.
 *
 * Eén regel per contract, ook bij een verlenging. Dat is niet alleen
 * geschiedenis: de ketenregeling telt het aantal tijdelijke contracten en de
 * tijd ertussen, en dat kun je niet berekenen uit één rij die je steeds
 * overschrijft.
 */
export const employmentContracts = pgTable(
  'employment_contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    type: contractTypeEnum('type').notNull(),
    startedOn: timestamp('started_on', { withTimezone: true }).notNull(),
    /** Leeg bij een contract voor onbepaalde tijd. */
    endsOn: timestamp('ends_on', { withTimezone: true }),

    /** Contracturen per week in kwartieren: 3200 is 32 uur. */
    hoursPerWeekQuarters: integer('hours_week_quarters'),
    jobTitle: text('job_title'),
    signedOn: timestamp('signed_on', { withTimezone: true }),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('employment_contracts_user_idx').on(t.userId, t.startedOn),
    check(
      'contract_ends_after_start',
      sql`${t.endsOn} IS NULL OR ${t.endsOn} >= ${t.startedOn}`,
    ),
    // Een contract voor onbepaalde tijd met een einddatum is geen contract
    // voor onbepaalde tijd. Dit is precies het soort fout dat je pas merkt
    // als de ketenregeling verkeerd rekent.
    check(
      'contract_permanent_has_no_end',
      sql`${t.type} <> 'onbepaalde_tijd' OR ${t.endsOn} IS NULL`,
    ),
    check(
      'contract_hours_valid',
      sql`${t.hoursPerWeekQuarters} IS NULL OR (${t.hoursPerWeekQuarters} > 0 AND ${t.hoursPerWeekQuarters} <= 8000)`,
    ),
  ],
)

/**
 * Het salaris van een collega, per ingangsdatum.
 *
 * Net als het grootboek: je overschrijft niets, je zet er een regel bij. Het
 * huidige salaris is de regel met de laatste ingangsdatum die al verstreken
 * is. Zo kun je een verhoging vooruit invoeren en blijft zichtbaar wat er
 * wanneer is afgesproken.
 *
 * Alleen zichtbaar voor beheerders.
 */
export const salaryRecords = pgTable(
  'salary_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /** Bruto per maand in centen, bij het aantal uren hieronder. */
    grossMonthlyCents: integer('gross_monthly_cents').notNull(),
    /**
     * De contracturen waarbij dit bedrag is afgesproken, in kwartieren.
     *
     * Staat er bewust bij in plaats van dat het uit het contract wordt
     * gehaald: gaat iemand later minder werken, dan zou hetzelfde bedrag
     * ineens iets anders betekenen.
     */
    basedOnHoursQuarters: integer('based_on_hours_quarters'),
    soort: beloningEnum('soort').notNull().default('loondienst'),
    /** Vakantiegeld in procenten; wettelijk minimaal 8. Nul bij een fee. */
    holidayAllowancePercent: integer('holiday_allowance_percent').notNull().default(8),
    /**
     * Werkgeverslasten in procenten bovenop het brutoloon inclusief
     * vakantiegeld: sociale premies, pensioen, verzekeringen.
     *
     * Dit veld bestaat omdat brutoloon niet is wat iemand kost. Reken je met
     * bruto, dan zie je ongeveer driekwart van je grootste kostenpost. Bij een
     * management fee staat hier nul: die lasten zitten er niet op.
     */
    employerCostPercent: integer('employer_cost_percent').notNull().default(28),

    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    /** Waarom: indiensttreding, periodiek, promotie, urenwijziging. */
    reason: text('reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    // Twee salarissen op dezelfde ingangsdatum: dan is niet te zeggen welke
    // geldt. De database laat dat niet toe in plaats van dat een query
    // willekeurig kiest.
    uniqueIndex('salary_records_user_date_idx').on(t.userId, t.effectiveFrom),
    check('salary_positive', sql`${t.grossMonthlyCents} > 0`),
    check(
      'salary_holiday_allowance_valid',
      sql`${t.holidayAllowancePercent} >= 0 AND ${t.holidayAllowancePercent} <= 100`,
    ),
    check(
      'salary_hours_valid',
      sql`${t.basedOnHoursQuarters} IS NULL OR (${t.basedOnHoursQuarters} > 0 AND ${t.basedOnHoursQuarters} <= 8000)`,
    ),
    check(
      'salary_employer_cost_valid',
      sql`${t.employerCostPercent} >= 0 AND ${t.employerCostPercent} <= 200`,
    ),
    // Op een management fee zitten geen werkgeverslasten en geen
    // vakantiegeld. Zou dat wel mogen, dan telt hetzelfde bedrag bij de ene
    // eigenaar anders mee dan bij de andere.
    check(
      'fee_has_no_employer_cost',
      sql`${t.soort} <> 'management_fee' OR (${t.employerCostPercent} = 0 AND ${t.holidayAllowancePercent} = 0)`,
    ),
  ],
)

/** Wat er met iemand is besproken of afgesproken. Alleen voor beheerders. */
export const dossierEntries = pgTable(
  'dossier_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    kind: dossierKindEnum('kind').notNull(),
    subject: text('subject').notNull(),
    body: text('body'),
    happenedOn: timestamp('happened_on', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('dossier_entries_user_idx').on(t.userId, t.happenedOn),
    check('dossier_subject_not_empty', sql`length(trim(${t.subject})) > 0`),
  ],
)

/** Wat een collega van ons in beheer heeft: laptop, telefoon, auto, sleutel. */
export const companyAssets = pgTable(
  'company_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    kind: assetKindEnum('kind').notNull(),
    label: text('label').notNull(),
    serial: text('serial'),
    handedOutOn: timestamp('handed_out_on', { withTimezone: true }).notNull(),
    /** Leeg zolang iemand het nog heeft. */
    returnedOn: timestamp('returned_on', { withTimezone: true }),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('company_assets_user_idx').on(t.userId),
    check('asset_label_not_empty', sql`length(trim(${t.label})) > 0`),
    check(
      'asset_returned_after_handout',
      sql`${t.returnedOn} IS NULL OR ${t.returnedOn} >= ${t.handedOutOn}`,
    ),
  ],
)

export type Organization = typeof organizations.$inferSelect
export type User = typeof users.$inferSelect
export type Wallet = typeof wallets.$inferSelect
export type LedgerEntry = typeof ledgerEntries.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type Service = typeof services.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Contact = typeof contacts.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Quote = typeof quotes.$inferSelect
export type QuoteLine = typeof quoteLines.$inferSelect
export type Partner = typeof partners.$inferSelect
export type OrganizationPartner = typeof organizationPartners.$inferSelect
export type OrganizationOwner = typeof organizationOwners.$inferSelect
export type Tag = typeof tags.$inferSelect
export type Activity = typeof activities.$inferSelect
export type NewService = typeof services.$inferInsert
export type SyncRun = typeof syncRuns.$inferSelect
export type EmploymentContract = typeof employmentContracts.$inferSelect
export type SalaryRecord = typeof salaryRecords.$inferSelect
export type DossierEntry = typeof dossierEntries.$inferSelect
export type CompanyAsset = typeof companyAssets.$inferSelect
export type Image = typeof images.$inferSelect
export type ContactChild = typeof contactChildren.$inferSelect
export type OrganizationLocation = typeof organizationLocations.$inferSelect
export type Competitor = typeof competitors.$inferSelect
export type OrganizationGoal = typeof organizationGoals.$inferSelect
