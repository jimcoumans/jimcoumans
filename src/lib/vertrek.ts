import { and, asc, desc, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { activities, campaignContacts, campaigns, contactOrganizations, contacts, deals, organizations, users } from '@/db/schema'
import type { Contact } from '@/db/schema'
import { CrmError } from './crm'
import { maakBedrijfAlsLead, maakDeal, PijplijnError } from './pijplijn'

/* -------------------------------------------------------------------------
   Een contactpersoon vertrekt bij een bedrijf.

   Uit het CRM halen is fout: de persoon blijft een relatie, en wie van baan
   wisselt en tevreden was, is een warme lead. Alleen het veld "bedrijf"
   leegmaken is ook fout: dan blijft de login werken, verdwijnt de
   geschiedenis en heeft de klant ineens stil geen vaste contactpersoon meer.

   Daarom één handeling die alles tegelijk doet en vastlegt.
   ------------------------------------------------------------------------- */

/** Adressen van gratis maildiensten zijn privé: die nemen we niet weg. */
const PRIVE_DOMEINEN = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.nl', 'outlook.com', 'outlook.nl', 'live.nl', 'live.com',
  'msn.com', 'icloud.com', 'me.com', 'yahoo.com', 'yahoo.nl', 'ziggo.nl', 'kpnmail.nl', 'home.nl', 'planet.nl',
  'hetnet.nl', 'xs4all.nl', 'casema.nl', 'chello.nl', 'telfort.nl', 'proton.me', 'protonmail.com',
])

export function isZakelijkAdres(email: string | null): boolean {
  if (!email || !email.includes('@')) return false
  return !PRIVE_DOMEINEN.has(email.split('@')[1]!.trim().toLowerCase())
}

export type Bestemming =
  | { soort: 'crm'; organizationId: string }
  | { soort: 'tekst'; naam: string; alsLead: boolean }
  | { soort: 'onbekend' }

export type VertrekUitkomst = {
  /** Hoeveel portalaccounts voor dit bedrijf er dicht zijn gezet. */
  geblokkeerd: number
  wasVast: boolean
  mailVerplaatst: boolean
  nieuwBedrijfId: string | null
  dealId: string | null
}

const datumNL = (d: Date) => d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' })

/**
 * Laat een persoon vertrekken bij een bedrijf: zijn hoofdbedrijf of een van
 * zijn extra bedrijven.
 */
export async function vertrekBijBedrijf(
  contactId: string,
  organizationId: string,
  inv: { datum?: Date; bestemming: Bestemming },
  door: { id: string },
): Promise<VertrekUitkomst> {
  const datum = inv.datum ?? new Date()
  const best = inv.bestemming
  if (best.soort === 'crm' && best.organizationId === organizationId) throw new CrmError('Kies een ander bedrijf dan het bedrijf dat deze persoon verlaat.')
  if (best.soort === 'tekst' && best.naam.trim() === '') throw new CrmError('Vul de naam van de nieuwe werkgever in, of kies "onbekend".')

  const uitkomst = await db.transaction(async (tx) => {
    const [c] = await tx.select().from(contacts).where(eq(contacts.id, contactId)).limit(1)
    if (!c) throw new CrmError('Contactpersoon niet gevonden.')
    const [org] = await tx.select({ id: organizations.id, name: organizations.name, health: organizations.relationHealth }).from(organizations).where(eq(organizations.id, organizationId)).limit(1)
    if (!org) throw new CrmError('Bedrijf niet gevonden.')

    const isHoofd = c.organizationId === organizationId
    const [extra] = await tx
      .select()
      .from(contactOrganizations)
      .where(and(eq(contactOrganizations.contactId, contactId), eq(contactOrganizations.organizationId, organizationId)))
      .limit(1)
    if (!isHoofd && (!extra || extra.endedOn !== null)) throw new CrmError(`${c.name} werkt niet (meer) bij ${org.name}.`)

    // 1. Geschiedenis: de koppeling blijft staan, met een einddatum.
    if (isHoofd) {
      await tx
        .insert(contactOrganizations)
        .values({ contactId, organizationId, role: c.jobTitle, endedOn: datum })
        .onConflictDoUpdate({ target: [contactOrganizations.contactId, contactOrganizations.organizationId], set: { endedOn: datum, role: c.jobTitle } })
    } else {
      await tx
        .update(contactOrganizations)
        .set({ endedOn: datum })
        .where(and(eq(contactOrganizations.contactId, contactId), eq(contactOrganizations.organizationId, organizationId)))
    }

    // 2. Portaltoegang dicht. Geblokkeerd, niet verwijderd: zo blijft
    //    zichtbaar wie er ooit toegang had. Werkt meteen, want de sessie wordt
    //    bij elk verzoek opnieuw gecontroleerd.
    const wie = [c.userId ? eq(users.id, c.userId) : undefined, c.email ? sql`lower(${users.email}) = lower(${c.email})` : undefined].filter(Boolean)
    const geblokkeerd = wie.length
      ? await tx
          .update(users)
          .set({ disabledAt: new Date() })
          .where(and(eq(users.role, 'client'), eq(users.organizationId, organizationId), isNull(users.disabledAt), or(...wie)))
          .returning({ id: users.id })
      : []

    // 3. Het hoofdbedrijf: rollen eraf, nieuwe werkgever erop, werkmail naar de notities.
    let mailVerplaatst = false
    const wasVast = isHoofd && c.isPrimary
    if (isHoofd) {
      const zakelijk = isZakelijkAdres(c.email)
      mailVerplaatst = zakelijk
      const notitie = zakelijk ? `Oud zakelijk e-mailadres (${org.name}, tot ${datumNL(datum)}): ${c.email}` : null
      await tx
        .update(contacts)
        .set({
          organizationId: best.soort === 'crm' ? best.organizationId : null,
          companyName: best.soort === 'tekst' ? best.naam.trim() : null,
          isPrimary: false,
          receivesInvoices: false,
          ...(zakelijk ? { email: null, notes: [c.notes?.trim(), notitie].filter(Boolean).join('\n') } : {}),
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId))
      // Wordt een extra bedrijf het hoofdbedrijf, dan hoort het niet ook nog bij de extra's.
      if (best.soort === 'crm') {
        await tx
          .delete(contactOrganizations)
          .where(and(eq(contactOrganizations.contactId, contactId), eq(contactOrganizations.organizationId, best.organizationId), isNull(contactOrganizations.endedOn)))
      }
    }

    // 4. Was dit de vaste contactpersoon, dan is de relatie kwetsbaar: de
    //    opvolger kent ons niet en heeft niet voor ons gekozen.
    if (wasVast && org.health !== 'zorgelijk') {
      await tx.update(organizations).set({ relationHealth: 'aandacht', updatedAt: new Date() }).where(eq(organizations.id, organizationId))
    }

    // 5. Op de tijdlijn van het bedrijf.
    const naar = best.soort === 'tekst' ? best.naam.trim() : best.soort === 'onbekend' ? 'onbekend' : null
    await tx.insert(activities).values({
      organizationId,
      contactId,
      userId: door.id,
      kind: 'note',
      subject: `${c.name} vertrokken`,
      body: [
        `Per ${datumNL(datum)}${c.jobTitle ? `, was ${c.jobTitle}` : ''}.`,
        naar ? `Gaat naar: ${naar}.` : null,
        geblokkeerd.length ? `Toegang tot het portaal geblokkeerd (${geblokkeerd.length} account${geblokkeerd.length === 1 ? '' : 's'}).` : null,
        wasVast ? 'Was de vaste contactpersoon. Relatiegezondheid op "Vraagt aandacht" gezet.' : null,
      ]
        .filter(Boolean)
        .join(' '),
      occurredAt: datum,
    })
    if (wasVast) {
      await tx.insert(activities).values({
        organizationId,
        userId: door.id,
        kind: 'task',
        subject: `Kennismaken met de opvolger van ${c.firstName?.trim() || c.name}`,
        body: 'Kies daarna een nieuwe vaste contactpersoon bij Contacten.',
        occurredAt: new Date(),
      })
    }

    return { geblokkeerd: geblokkeerd.length, wasVast, mailVerplaatst, contact: c }
  })

  // 6. Optioneel: de nieuwe werkgever als lead in de pijplijn. Buiten de
  //    transactie, want het vertrek zelf moet ook staan als dit mislukt.
  let nieuwBedrijfId: string | null = best.soort === 'crm' ? best.organizationId : null
  let dealId: string | null = null
  if (best.soort === 'tekst' && best.alsLead && organizationId === uitkomst.contact.organizationId) {
    try {
      const lead = await maakBedrijfAlsLead(best.naam)
      nieuwBedrijfId = lead.id
      await db.update(contacts).set({ organizationId: lead.id, companyName: null, updatedAt: new Date() }).where(eq(contacts.id, contactId))
      const voornaam = uitkomst.contact.firstName?.trim() || uitkomst.contact.name
      const deal = await maakDeal({
        organizationId: lead.id,
        contactId,
        title: `${lead.naam} via ${voornaam}`,
        source: 'network',
        ownerUserId: door.id,
        nextAction: `Kennismaken met ${voornaam} in de nieuwe rol`,
        nextActionOn: new Date(Date.now() + 14 * 86_400_000),
      })
      dealId = deal.id
    } catch (e) {
      if (e instanceof PijplijnError) throw new CrmError(`Het vertrek is vastgelegd, maar de lead lukte niet: ${e.message}`)
      throw e
    }
  }

  return { geblokkeerd: uitkomst.geblokkeerd, wasVast: uitkomst.wasVast, mailVerplaatst: uitkomst.mailVerplaatst, nieuwBedrijfId, dealId }
}

/* ----------------------------- Geschiedenis ----------------------------- */

export type OudContact = { contact: Contact; rol: string | null; tot: Date }

/** Wie hier ooit werkte en is vertrokken. Wie inmiddels weer terug is, staat er niet bij. */
export async function oudContactpersonen(organizationId: string): Promise<OudContact[]> {
  const rijen = await db
    .select({ contact: contacts, rol: contactOrganizations.role, tot: contactOrganizations.endedOn })
    .from(contactOrganizations)
    .innerJoin(contacts, eq(contacts.id, contactOrganizations.contactId))
    .where(
      and(
        eq(contactOrganizations.organizationId, organizationId),
        isNotNull(contactOrganizations.endedOn),
        sql`${contacts.organizationId} IS DISTINCT FROM ${organizationId}`,
      ),
    )
    .orderBy(desc(contactOrganizations.endedOn))
  return rijen.map((r) => ({ ...r, tot: r.tot! }))
}

/** Waar deze persoon eerder werkte. */
export async function vorigeWerkgevers(contactId: string) {
  const rijen = await db
    .select({ organizationId: organizations.id, naam: organizations.name, slug: organizations.slug, rol: contactOrganizations.role, tot: contactOrganizations.endedOn })
    .from(contactOrganizations)
    .innerJoin(organizations, eq(organizations.id, contactOrganizations.organizationId))
    .where(and(eq(contactOrganizations.contactId, contactId), isNotNull(contactOrganizations.endedOn)))
    .orderBy(desc(contactOrganizations.endedOn))
  return rijen.map((r) => ({ ...r, tot: r.tot! }))
}

/**
 * Lopende deals en campagnes waar deze persoon nog als contact op staat,
 * bij een bedrijf waar die persoon niet (meer) werkt. Die wil je omzetten.
 */
export async function nogOpenBij(contactId: string) {
  const [c] = await db.select({ organizationId: contacts.organizationId }).from(contacts).where(eq(contacts.id, contactId)).limit(1)
  if (!c) return { deals: [], campagnes: [] }
  const extra = await db
    .select({ id: contactOrganizations.organizationId })
    .from(contactOrganizations)
    .where(and(eq(contactOrganizations.contactId, contactId), isNull(contactOrganizations.endedOn)))
  const hier = [c.organizationId, ...extra.map((e) => e.id)].filter((x): x is string => !!x)
  const nietHier = (kolom: typeof deals.organizationId | typeof campaigns.organizationId) => (hier.length ? sql`${kolom} NOT IN (${sql.join(hier.map((h) => sql`${h}`), sql`, `)})` : undefined)

  const [d, k] = await Promise.all([
    db
      .select({ id: deals.id, titel: deals.title, bedrijf: organizations.name })
      .from(deals)
      .innerJoin(organizations, eq(organizations.id, deals.organizationId))
      .where(and(eq(deals.contactId, contactId), eq(deals.status, 'open'), nietHier(deals.organizationId)))
      .orderBy(asc(deals.title)),
    db
      .select({ id: campaigns.id, titel: campaigns.title, bedrijf: organizations.name })
      .from(campaignContacts)
      .innerJoin(campaigns, eq(campaigns.id, campaignContacts.campaignId))
      .innerJoin(organizations, eq(organizations.id, campaigns.organizationId))
      .where(and(eq(campaignContacts.contactId, contactId), ne(campaigns.status, 'afgerond'), nietHier(campaigns.organizationId)))
      .orderBy(asc(campaigns.title)),
  ])
  return { deals: d, campagnes: k }
}

/** Klanten zonder vaste contactpersoon, voor "Vraagt aandacht". */
export async function klantenZonderVasteContact(): Promise<{ naam: string; slug: string }[]> {
  return db
    .select({ naam: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(
      and(
        eq(organizations.status, 'client'),
        isNull(organizations.archivedAt),
        sql`NOT EXISTS (SELECT 1 FROM ${contacts} WHERE ${contacts.organizationId} = ${organizations.id} AND ${contacts.isPrimary})`,
      ),
    )
    .orderBy(asc(sql`lower(${organizations.name})`))
}

