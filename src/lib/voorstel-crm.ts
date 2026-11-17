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
import { activities, competitors, contacts, organizationAudiences, organizationGoals, organizations } from '@/db/schema'
import { uniekeSlug } from './admin'
import { createContact } from './crm'
import { splitsNaam, volledigeNaam } from './namen'

export class CrmKoppelFout extends Error {}

export type CrmInvoer = {
  organizationId?: string | null
  contactId?: string | null
  bedrijf: { naam: string; handelsnaam?: string; plaats?: string; website?: string; telefoon?: string; email?: string; kvk?: string }
  contact?: { naam?: string; functie?: string; email?: string; telefoon?: string } | null
  /** Wat verder in het dossier staat. Alles optioneel; wat ontbreekt, laten we met rust. */
  profiel?: CrmProfiel | null
  /** Wie koppelt; komt op de notitie in de tijdlijn. */
  userId?: string | null
}

export type CrmProfiel = {
  straat?: string
  postcode?: string
  btwnr?: string
  branche?: string
  facebook?: string
  instagram?: string
  linkedin?: string
  youtube?: string
  tiktok?: string
  medewerkers?: string | number
  kernactiviteit?: string
  regio?: string
  hoofddoel?: string
  bron?: string
  /**
   * Lijsten: alleen meegestuurd als ze in de generator zijn veranderd. Zo komt
   * iets wat iemand in het CRM heeft verwijderd niet vanzelf terug.
   */
  lijsten?: { doelgroep?: string; concurrenten?: { naam: string; website?: string; notitie?: string }[]; doelen?: string[] } | null
  /** De intake en het plan als notitie op de tijdlijn. Eén notitie per dossier, die bijgewerkt wordt. */
  notitie?: { onderwerp: string; tekst: string; id?: string | null } | null
}

const DOELEN = ['aanvragen', 'reserveringen', 'omzet', 'naamsbekendheid'] as const
const BRONNEN = ['referral', 'network', 'inbound', 'outbound', 'partner', 'event', 'other'] as const

export type CrmKoppeling = {
  organizationId: string
  organisatieNaam: string
  organisatieSlug: string
  nieuwBedrijf: boolean
  contactId: string | null
  contactNaam: string | null
  nieuwContact: boolean
  /** De notitie op de tijdlijn, om de volgende keer bij te werken in plaats van een nieuwe te maken. */
  notitieId: string | null
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
  const p = inv.profiel ?? {}
  const bedrijfsVelden = {
    city: schoon(inv.bedrijf.plaats),
    website: schoon(inv.bedrijf.website),
    phone: schoon(inv.bedrijf.telefoon),
    email: schoon(inv.bedrijf.email).toLowerCase(),
    kvkNumber: schoon(inv.bedrijf.kvk),
    addressLine: schoon(p.straat),
    postalCode: schoon(p.postcode),
    vatNumber: schoon(p.btwnr),
    industry: schoon(p.branche),
    facebookUrl: schoon(p.facebook),
    instagramUrl: schoon(p.instagram),
    linkedinUrl: schoon(p.linkedin),
    youtubeUrl: schoon(p.youtube),
    tiktokUrl: schoon(p.tiktok),
    coreActivity: schoon(p.kernactiviteit),
    region: schoon(p.regio),
  }
  // Velden die geen tekst zijn: ook alleen invullen als ze leeg zijn.
  const medewerkers = Number(String(p.medewerkers ?? '').replace(/[^0-9]/g, '')) || null
  const hoofddoel = (DOELEN as readonly string[]).includes(schoon(p.hoofddoel)) ? (schoon(p.hoofddoel) as (typeof DOELEN)[number]) : null
  const bron = (BRONNEN as readonly string[]).includes(schoon(p.bron)) ? (schoon(p.bron) as (typeof BRONNEN)[number]) : null
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
        addressLine: bedrijfsVelden.addressLine || null,
        postalCode: bedrijfsVelden.postalCode || null,
        vatNumber: bedrijfsVelden.vatNumber || null,
        industry: bedrijfsVelden.industry || null,
        facebookUrl: bedrijfsVelden.facebookUrl || null,
        instagramUrl: bedrijfsVelden.instagramUrl || null,
        linkedinUrl: bedrijfsVelden.linkedinUrl || null,
        youtubeUrl: bedrijfsVelden.youtubeUrl || null,
        tiktokUrl: bedrijfsVelden.tiktokUrl || null,
        coreActivity: bedrijfsVelden.coreActivity || null,
        region: bedrijfsVelden.region || null,
        employeeCount: medewerkers,
        mainGoal: hoofddoel,
        leadSource: bron,
      })
      .returning()
    if (!org) throw new CrmKoppelFout('Het bedrijf kon niet in het CRM worden gezet.')
    nieuwBedrijf = true
  } else {
    const erbij: Record<string, unknown> = aanvulling(
      {
        city: org.city, website: org.website, phone: org.phone, email: org.email, kvkNumber: org.kvkNumber,
        addressLine: org.addressLine, postalCode: org.postalCode, vatNumber: org.vatNumber, industry: org.industry,
        facebookUrl: org.facebookUrl, instagramUrl: org.instagramUrl, linkedinUrl: org.linkedinUrl,
        youtubeUrl: org.youtubeUrl, tiktokUrl: org.tiktokUrl, coreActivity: org.coreActivity, region: org.region,
      },
      bedrijfsVelden,
    )
    if (medewerkers && org.employeeCount == null) erbij.employeeCount = medewerkers
    if (hoofddoel && !org.mainGoal) erbij.mainGoal = hoofddoel
    if (bron && !org.leadSource) erbij.leadSource = bron
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

  /* --- Doelgroep, concurrenten en doelen: toevoegen wat er nog niet staat --- */
  const lijsten = p.lijsten
  if (lijsten) {
    const doelgroep = schoon(lijsten.doelgroep)
    if (doelgroep) {
      const [ideaal] = await db
        .select()
        .from(organizationAudiences)
        .where(and(eq(organizationAudiences.organizationId, org.id), sql`lower(${organizationAudiences.name}) = 'ideale klant'`))
        .limit(1)
      if (!ideaal) {
        await db.insert(organizationAudiences).values({ organizationId: org.id, name: 'Ideale klant', description: doelgroep })
      } else if (!schoon(ideaal.description)) {
        await db.update(organizationAudiences).set({ description: doelgroep }).where(eq(organizationAudiences.id, ideaal.id))
      }
    }
    const bekendeConcurrenten = new Set(
      (await db.select({ naam: competitors.name }).from(competitors).where(eq(competitors.organizationId, org.id))).map((r) => r.naam.trim().toLowerCase()),
    )
    for (const k of lijsten.concurrenten ?? []) {
      const kn = schoon(k?.naam)
      if (!kn || bekendeConcurrenten.has(kn.toLowerCase())) continue
      await db.insert(competitors).values({
        organizationId: org.id,
        name: kn,
        website: schoon(k.website) || null,
        notes: schoon(k.notitie) || null,
        createdByUserId: inv.userId ?? null,
      })
      bekendeConcurrenten.add(kn.toLowerCase())
    }
    const bekendeDoelen = new Set(
      (await db.select({ titel: organizationGoals.title }).from(organizationGoals).where(eq(organizationGoals.organizationId, org.id))).map((r) => r.titel.trim().toLowerCase()),
    )
    for (const d of lijsten.doelen ?? []) {
      const titel = schoon(d)
      if (!titel || bekendeDoelen.has(titel.toLowerCase())) continue
      await db.insert(organizationGoals).values({ organizationId: org.id, title: titel, createdByUserId: inv.userId ?? null })
      bekendeDoelen.add(titel.toLowerCase())
    }
  }

  /* --- De intake en het plan als notitie op de tijdlijn ---
     Eén notitie per dossier. Bestaat hij nog (zelfde bedrijf, zelfde onderwerp), dan
     werken we hem bij: het is onze eigen samenvatting, geen notitie van een collega. */
  let notitieId: string | null = null
  const n = p.notitie
  if (n && schoon(n.tekst) && schoon(n.onderwerp)) {
    let bestaande: typeof activities.$inferSelect | undefined
    if (n.id) {
      ;[bestaande] = await db
        .select()
        .from(activities)
        .where(and(eq(activities.id, n.id), eq(activities.organizationId, org.id), eq(activities.subject, schoon(n.onderwerp))))
        .limit(1)
    }
    if (bestaande) {
      if (bestaande.body !== n.tekst) {
        await db.update(activities).set({ body: n.tekst, contactId: contactId ?? bestaande.contactId, updatedAt: new Date() }).where(eq(activities.id, bestaande.id))
      }
      notitieId = bestaande.id
    } else {
      const [nieuw] = await db
        .insert(activities)
        .values({ organizationId: org.id, contactId, userId: inv.userId ?? null, kind: 'note', subject: schoon(n.onderwerp), body: n.tekst })
        .returning({ id: activities.id })
      notitieId = nieuw?.id ?? null
    }
  }

  return {
    notitieId,
    organizationId: org.id,
    organisatieNaam: org.name,
    organisatieSlug: org.slug,
    nieuwBedrijf,
    contactId,
    contactNaam,
    nieuwContact,
  }
}
