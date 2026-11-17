/* -------------------------------------------------------------------------
   Het voorstel en het CRM.

   Wie een voorstel maakt, legt een bedrijf en een contactpersoon vast. Die
   horen in het CRM van de Wallet, niet alleen in de generator. Daarom koppelt
   de generator elk opgeslagen dossier aan een bedrijf en een contactpersoon:

   - Bestaat het bedrijf al (zelfde naam, hoofdletters maken niet uit), dan
     gebruiken we dat. Anders maken we het aan als prospect: er ligt een
     voorstel, dus het is meer dan een lead en nog geen klant.
   - Bestaat de contactpersoon al bij dat bedrijf (zelfde e-mail, anders
     zelfde naam), dan gebruiken we die. Anders maken we hem aan.

   Eén regel waar niet van afgeweken wordt: we vullen aan, we overschrijven
   nooit. Wat in het CRM staat, heeft iemand daar met reden neergezet. Een
   leeg veld vullen we uit het voorstel; een gevuld veld laten we staan.
   ------------------------------------------------------------------------- */

import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { contacts, organizations } from '@/db/schema'
import { uniekeSlug } from './admin'
import { createContact } from './crm'
import { splitsNaam, volledigeNaam } from './namen'

export class CrmKoppelFout extends Error {}

export type CrmInvoer = {
  organizationId?: string | null
  contactId?: string | null
  bedrijf: { naam: string; handelsnaam?: string; plaats?: string; website?: string; telefoon?: string; email?: string; kvk?: string }
  contact?: { naam?: string; functie?: string; email?: string; telefoon?: string } | null
}

export type CrmKoppeling = {
  organizationId: string
  organisatieNaam: string
  organisatieSlug: string
  nieuwBedrijf: boolean
  contactId: string | null
  contactNaam: string | null
  nieuwContact: boolean
}

const schoon = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Alleen de velden die nu leeg zijn en waarvoor we iets hebben. Wat er staat, blijft staan. */
export function aanvulling<K extends string>(
  huidig: Record<K, string | null>,
  nieuw: Partial<Record<K, string>>,
): Partial<Record<K, string>> {
  const uit: Partial<Record<K, string>> = {}
  for (const k of Object.keys(nieuw) as K[]) {
    const waarde = schoon(nieuw[k])
    if (waarde && !schoon(huidig[k])) uit[k] = waarde
  }
  return uit
}

/** Een Nederlands mobiel nummer (06 of +31 6) hoort in mobiel, de rest in telefoon. */
export function isMobiel(nummer: string): boolean {
  return /^(\+31\s*\(?0?\)?\s*6|0031\s*6|06)/.test(nummer.replace(/[\s-]/g, ''))
}

export async function koppelAanCrm(inv: CrmInvoer): Promise<CrmKoppeling> {
  const naam = schoon(inv.bedrijf.naam)
  const handelsnaam = schoon(inv.bedrijf.handelsnaam) || naam
  if (!naam && !handelsnaam) throw new CrmKoppelFout('Vul eerst de bedrijfsnaam in.')

  /* --- Het bedrijf --- */
  let org: typeof organizations.$inferSelect | undefined
  const namen = [...new Set([naam, handelsnaam].filter(Boolean).map((n) => n.toLowerCase()))]
  // Een eerdere koppeling geldt alleen zolang de naam nog klopt; is die in het voorstel
  // veranderd, dan zoeken we opnieuw op naam.
  if (inv.organizationId) {
    ;[org] = await db.select().from(organizations).where(eq(organizations.id, inv.organizationId)).limit(1)
    if (org && !namen.includes(org.name.toLowerCase())) org = undefined
  }
  if (!org) {
    ;[org] = await db
      .select()
      .from(organizations)
      .where(sql`lower(${organizations.name}) in (${sql.join(namen.map((n) => sql`${n}`), sql`, `)})`)
      .limit(1)
  }
  let nieuwBedrijf = false
  const bedrijfsVelden = {
    city: schoon(inv.bedrijf.plaats),
    website: schoon(inv.bedrijf.website),
    phone: schoon(inv.bedrijf.telefoon),
    email: schoon(inv.bedrijf.email).toLowerCase(),
    kvkNumber: schoon(inv.bedrijf.kvk),
  }
  if (!org) {
    ;[org] = await db
      .insert(organizations)
      .values({
        slug: await uniekeSlug(handelsnaam),
        name: handelsnaam,
        status: 'prospect',
        city: bedrijfsVelden.city || null,
        website: bedrijfsVelden.website || null,
        phone: bedrijfsVelden.phone || null,
        email: bedrijfsVelden.email || null,
        kvkNumber: bedrijfsVelden.kvkNumber || null,
      })
      .returning()
    if (!org) throw new CrmKoppelFout('Het bedrijf kon niet in het CRM worden gezet.')
    nieuwBedrijf = true
  } else {
    const erbij = aanvulling(
      { city: org.city, website: org.website, phone: org.phone, email: org.email, kvkNumber: org.kvkNumber },
      bedrijfsVelden,
    )
    if (Object.keys(erbij).length) {
      await db.update(organizations).set({ ...erbij, updatedAt: new Date() }).where(eq(organizations.id, org.id))
    }
  }

  /* --- De contactpersoon --- */
  const c = inv.contact ?? {}
  const cNaam = schoon(c.naam)
  let contactId: string | null = null
  let contactNaam: string | null = null
  let nieuwContact = false
  if (cNaam) {
    const email = schoon(c.email).toLowerCase()
    const tel = schoon(c.telefoon)
    let bestaand: typeof contacts.$inferSelect | undefined
    if (inv.contactId) {
      ;[bestaand] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, inv.contactId), eq(contacts.organizationId, org.id)))
        .limit(1)
      // Zelfde regel als bij het bedrijf: alleen zolang naam of e-mail nog klopt.
      if (bestaand && bestaand.name.toLowerCase() !== cNaam.toLowerCase() && (!email || (bestaand.email ?? '').toLowerCase() !== email)) bestaand = undefined
    }
    if (!bestaand && email) {
      ;[bestaand] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.organizationId, org.id), sql`lower(${contacts.email}) = ${email}`))
        .limit(1)
    }
    if (!bestaand) {
      ;[bestaand] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.organizationId, org.id), sql`lower(${contacts.name}) = ${cNaam.toLowerCase()}`))
        .limit(1)
    }
    const telVeld = tel ? (isMobiel(tel) ? { mobile: tel } : { phone: tel }) : {}
    if (bestaand) {
      const erbij = aanvulling(
        { jobTitle: bestaand.jobTitle, email: bestaand.email, phone: bestaand.phone, mobile: bestaand.mobile },
        { jobTitle: schoon(c.functie), email, ...telVeld },
      )
      if (Object.keys(erbij).length) {
        await db.update(contacts).set({ ...erbij, updatedAt: new Date() }).where(eq(contacts.id, bestaand.id))
      }
      contactId = bestaand.id
      contactNaam = bestaand.name
    } else {
      const [heeftVast] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.organizationId, org.id), eq(contacts.isPrimary, true)))
        .limit(1)
      const delen = splitsNaam(cNaam)
      const nieuw = await createContact({
        organizationId: org.id,
        name: volledigeNaam(delen) || cNaam,
        ...delen,
        jobTitle: schoon(c.functie) || null,
        email: email || null,
        phone: 'phone' in telVeld ? telVeld.phone : null,
        mobile: 'mobile' in telVeld ? telVeld.mobile : null,
        // De eerste contactpersoon van een bedrijf is de vaste; staat er al een, dan blijft die het.
        isPrimary: !heeftVast,
      })
      contactId = nieuw.id
      contactNaam = nieuw.name
      nieuwContact = true
    }
  }

  return {
    organizationId: org.id,
    organisatieNaam: org.name,
    organisatieSlug: org.slug,
    nieuwBedrijf,
    contactId,
    contactNaam,
    nieuwContact,
  }
}
