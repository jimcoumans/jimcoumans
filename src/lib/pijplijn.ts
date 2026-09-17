import { and, asc, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { deals, pipelineStages, organizations, contacts, users } from '@/db/schema'
import type { Deal, PipelineStage } from '@/db/schema'
import { uniekeSlug } from './admin'

/* -------------------------------------------------------------------------
   De salespijplijn.

   Het mechanisme waar dit op draait is niet het bord met fases — dat is
   alleen de weergave. Het mechanisme is de VOLGENDE ACTIE. Een open deal
   zonder afgesproken vervolgstap is een deal die niemand meer aanraakt, en
   die zakt weg tot hij over een half jaar ineens verloren blijkt.

   Daarom staat in elk overzicht bovenaan wat er achterloopt: deals zonder
   volgende actie, en deals waarvan de datum voorbij is. Niet weggestopt in
   een filter dat je moet aanzetten, maar vervelend in beeld.

   Bedragen worden nooit bij elkaar opgeteld over de soorten heen. Een
   retainer van 1.600 per maand en een project van 8.000 eenmalig zijn twee
   verschillende dingen; er is geen getal dat ze samenvat zonder te liegen.
   Elk totaal in dit bestand is dus een paar: per maand en eenmalig.
   ------------------------------------------------------------------------- */

export class PijplijnError extends Error {}

export const BRON_LABELS: Record<string, string> = {
  referral: 'Doorverwijzing',
  network: 'Eigen netwerk',
  inbound: 'Inbound',
  outbound: 'Zelf benaderd',
  partner: 'Via een partner',
  event: 'Evenement',
  other: 'Anders',
}

export const SOORT_LABELS = {
  retainer: 'Retainer',
  project: 'Project',
} as const

/** Hoe de status van een bedrijf in een keuzelijst leest. */
export const BEDRIJF_STATUS_LABELS = {
  lead: 'lead',
  prospect: 'prospect',
  client: 'klant',
  former: 'oud-klant',
} as const

/** Twee totalen die niet bij elkaar opgeteld mogen worden. */
export type Bedragen = {
  /** Som van de retainerdeals, per maand. */
  perMaandCents: number
  /** Som van de projectdeals, eenmalig. */
  eenmaligCents: number
}

function legeBedragen(): Bedragen {
  return { perMaandCents: 0, eenmaligCents: 0 }
}

function telErbij(totaal: Bedragen, deal: { kind: string; valueCents: number | null }): void {
  if (deal.valueCents === null) return
  if (deal.kind === 'retainer') totaal.perMaandCents += deal.valueCents
  else totaal.eenmaligCents += deal.valueCents
}

/** Eén deal met alles erbij wat je op een kaart wilt zien. */
export type DealKaart = {
  deal: Deal
  klantNaam: string
  klantSlug: string
  contactNaam: string | null
  eigenaarNaam: string | null
  stageNaam: string
  kansPercent: number
  /**
   * Hoeveel dagen de volgende actie te laat is. Negatief is nog te gaan,
   * null betekent dat er geen volgende actie staat.
   */
  actieOverDagen: number | null
  /** Geen volgende actie, of een datum die voorbij is. */
  looptAchter: boolean
}

/** Hoeveel dagen tussen vandaag en een datum. Negatief is in het verleden. */
function dagenTot(datum: Date, nu: Date): number {
  const eenDag = 24 * 60 * 60 * 1000
  const a = Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate())
  const b = Date.UTC(nu.getFullYear(), nu.getMonth(), nu.getDate())
  return Math.round((a - b) / eenDag)
}

/**
 * Alle fases, van links naar rechts.
 *
 * Gearchiveerde fases komen mee als er nog deals in staan; anders zou een
 * oude deal van het bord verdwijnen zonder dat iemand dat merkt.
 */
export async function listFases(): Promise<PipelineStage[]> {
  return db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.sortOrder), asc(pipelineStages.name))
}

export type PijplijnFilter = {
  /** Alleen deals van deze eigenaar (users.id). */
  eigenaar?: string
  /** 'open' (standaard), 'won', 'lost' of 'alles'. */
  status?: string
}

/**
 * Alle deals met wat erbij hoort, in één query.
 *
 * Eén query en geen vier: elke query is vanaf de server een netwerkronde van
 * bijna honderd milliseconde. Een bord dat per deal de klant, de
 * contactpersoon en de eigenaar erbij haalt zou bij dertig deals negentig
 * rondes doen en over de tijdslimiet gaan. Dat is hier eerder gebeurd en het
 * levert een 502 op zonder foutmelding.
 */
export async function listDeals(
  filter: PijplijnFilter = {},
  nu: Date = new Date(),
): Promise<DealKaart[]> {
  const status = filter.status ?? 'open'

  const voorwaarden = []
  if (status !== 'alles') voorwaarden.push(sql`${deals.status} = ${status}`)
  if (filter.eigenaar) voorwaarden.push(eq(deals.ownerUserId, filter.eigenaar))

  const rijen = await db
    .select({
      deal: deals,
      klantNaam: organizations.name,
      klantSlug: organizations.slug,
      contactNaam: contacts.name,
      eigenaarNaam: users.name,
      eigenaarEmail: users.email,
      stageNaam: pipelineStages.name,
      kans: pipelineStages.probabilityPercent,
      stageOrde: pipelineStages.sortOrder,
    })
    .from(deals)
    .innerJoin(organizations, eq(organizations.id, deals.organizationId))
    .innerJoin(pipelineStages, eq(pipelineStages.id, deals.stageId))
    .leftJoin(contacts, eq(contacts.id, deals.contactId))
    .leftJoin(users, eq(users.id, deals.ownerUserId))
    .where(voorwaarden.length > 0 ? and(...voorwaarden) : undefined)
    .orderBy(
      asc(pipelineStages.sortOrder),
      // Wat achterloopt bovenaan: eerst zonder actie, dan de oudste datum.
      asc(sql`CASE WHEN ${deals.nextActionOn} IS NULL THEN 0 ELSE 1 END`),
      asc(deals.nextActionOn),
      desc(deals.valueCents),
    )

  return rijen.map((r) => {
    const overDagen =
      r.deal.nextActionOn === null ? null : dagenTot(r.deal.nextActionOn, nu)

    return {
      deal: r.deal,
      klantNaam: r.klantNaam,
      klantSlug: r.klantSlug,
      contactNaam: r.contactNaam,
      // Een collega zonder naam ingevuld: dan het mailadres, want "null" op
      // een kaart vertelt je niet wie hem trekt.
      eigenaarNaam: r.eigenaarNaam ?? r.eigenaarEmail ?? null,
      stageNaam: r.stageNaam,
      kansPercent: r.kans,
      actieOverDagen: overDagen,
      // Achterlopen is: geen actie afgesproken, of de datum is voorbij.
      // Alleen bij open deals; een gewonnen deal hoeft geen vervolgstap.
      looptAchter:
        r.deal.status === 'open' && (overDagen === null || overDagen < 0),
    }
  })
}

export type BordKolom = {
  fase: PipelineStage
  kaarten: DealKaart[]
  bedragen: Bedragen
  /** Bedragen maal de kans van de fase. */
  gewogen: Bedragen
}

export type Bord = {
  kolommen: BordKolom[]
  totaal: Bedragen
  gewogenTotaal: Bedragen
  /** Deals zonder volgende actie of met een datum die voorbij is. */
  achterstand: DealKaart[]
  aantalOpen: number
}

/**
 * Het bord: de fases met hun deals.
 *
 * De gewogen bedragen zijn het totaal maal de kans van de fase. Dat is de
 * enige manier waarop een pijplijntotaal iets betekent: tien deals in
 * "Nieuw" van tienduizend euro is geen honderdduizend euro omzet, het is
 * tienduizend euro verwachting.
 */
export async function getBord(
  filter: PijplijnFilter = {},
  nu: Date = new Date(),
): Promise<Bord> {
  // Twee queries: de fases en de deals. Niet meer.
  const [fases, kaarten] = await Promise.all([listFases(), listDeals(filter, nu)])

  const kolommen: BordKolom[] = fases.map((fase) => {
    const eigen = kaarten.filter((k) => k.deal.stageId === fase.id)
    const bedragen = legeBedragen()
    for (const k of eigen) telErbij(bedragen, k.deal)

    return {
      fase,
      kaarten: eigen,
      bedragen,
      gewogen: {
        perMaandCents: Math.round((bedragen.perMaandCents * fase.probabilityPercent) / 100),
        eenmaligCents: Math.round((bedragen.eenmaligCents * fase.probabilityPercent) / 100),
      },
    }
  })

  // Een gearchiveerde fase zonder deals hoort niet op het bord.
  const zichtbaar = kolommen.filter((k) => k.fase.active || k.kaarten.length > 0)

  const totaal = legeBedragen()
  const gewogenTotaal = legeBedragen()
  for (const k of zichtbaar) {
    totaal.perMaandCents += k.bedragen.perMaandCents
    totaal.eenmaligCents += k.bedragen.eenmaligCents
    gewogenTotaal.perMaandCents += k.gewogen.perMaandCents
    gewogenTotaal.eenmaligCents += k.gewogen.eenmaligCents
  }

  return {
    kolommen: zichtbaar,
    totaal,
    gewogenTotaal,
    achterstand: kaarten.filter((k) => k.looptAchter),
    aantalOpen: kaarten.filter((k) => k.deal.status === 'open').length,
  }
}

/* --- Hoe het loopt ------------------------------------------------------- */

export type Scorekaart = {
  gewonnen: number
  verloren: number
  /** Van de gesloten deals, hoeveel procent gewonnen. Null als er geen zijn. */
  scoringskansPercent: number | null
  gewonnenBedragen: Bedragen
  /** De redenen waarom er verloren is, met hoe vaak. Meest voorkomend eerst. */
  verliesredenen: { reden: string; aantal: number }[]
}

/**
 * Wat de pijplijn heeft opgeleverd, in één query.
 *
 * De verliesredenen zijn hier het punt. Een scoringskans van veertig procent
 * is een getal; "zeven keer verloren op prijs" is iets waar je iets aan kunt
 * doen. Daarom staat er in de database een check op: een verloren deal zonder
 * reden wordt geweigerd.
 */
export async function getScorekaart(filter: PijplijnFilter = {}): Promise<Scorekaart> {
  const voorwaarden = [sql`${deals.status} <> 'open'`]
  if (filter.eigenaar) voorwaarden.push(eq(deals.ownerUserId, filter.eigenaar))

  const rijen = await db
    .select({
      status: deals.status,
      kind: deals.kind,
      valueCents: deals.valueCents,
      lostReason: deals.lostReason,
    })
    .from(deals)
    .where(and(...voorwaarden))

  const gewonnenBedragen = legeBedragen()
  let gewonnen = 0
  let verloren = 0
  const redenen = new Map<string, number>()

  for (const r of rijen) {
    if (r.status === 'won') {
      gewonnen += 1
      telErbij(gewonnenBedragen, r)
    } else if (r.status === 'lost') {
      verloren += 1
      const reden = (r.lostReason ?? '').trim()
      if (reden !== '') redenen.set(reden, (redenen.get(reden) ?? 0) + 1)
    }
  }

  const gesloten = gewonnen + verloren

  return {
    gewonnen,
    verloren,
    scoringskansPercent: gesloten === 0 ? null : Math.round((gewonnen / gesloten) * 100),
    gewonnenBedragen,
    verliesredenen: [...redenen.entries()]
      .map(([reden, aantal]) => ({ reden, aantal }))
      .sort((a, b) => b.aantal - a.aantal || a.reden.localeCompare(b.reden, 'nl')),
  }
}

/** Wie er deals trekt. Voor het filter. */
export async function listDealEigenaren(): Promise<{ id: string; naam: string }[]> {
  const rijen = await db
    .selectDistinct({ id: users.id, naam: users.name, email: users.email })
    .from(deals)
    .innerJoin(users, eq(users.id, deals.ownerUserId))
    .orderBy(asc(users.name))

  return rijen.map((r) => ({ id: r.id, naam: r.naam ?? r.email }))
}

/**
 * Alleen naam en id van elk bedrijf, voor een keuzelijst.
 *
 * listOrganizations() doet vier queries: het haalt ook alle wallets, saldo's
 * en gebruikersaantallen op. Prima voor een klantenoverzicht, zonde voor een
 * dropdown waar je twee velden gebruikt. Vier netwerkrondes voor niets is
 * vanaf de server bijna een halve seconde.
 */
export type Bedrijfsnaam = {
  id: string
  naam: string
  status: 'lead' | 'prospect' | 'client' | 'former'
}

export async function listBedrijfsnamen(): Promise<Bedrijfsnaam[]> {
  const rijen = await db
    .select({ id: organizations.id, naam: organizations.name, status: organizations.status })
    .from(organizations)
    .orderBy(asc(organizations.name))

  return rijen
}

/**
 * Een bedrijf aanmaken vanuit de pijplijn, als lead.
 *
 * Dit hoort hier omdat een deal vaak eerder bestaat dan het bedrijf. Je
 * krijgt een naam op een borrel en wilt die kwijt voordat je hem vergeet.
 * Moet je daarvoor eerst naar Klanten om een klant aan te maken die geen
 * klant is, dan doe je het niet en staat de deal nergens.
 *
 * Status lead en niet client: het is nog geen klant. De kolom heeft client
 * als standaardwaarde omdat bijna alles in dit systeem een klant is, dus
 * moet die hier expliciet meegegeven worden.
 *
 * Verder blijft dit leeg. Adres, kvk en facturatie vul je in als het een
 * klant wordt; op dit moment weet je die dingen nog niet en een half
 * ingevuld formulier houdt je alleen maar op.
 */
export async function maakBedrijfAlsLead(naam: string): Promise<{ id: string; naam: string }> {
  const schoon = naam.trim()
  if (schoon === '') {
    throw new PijplijnError('Geef het nieuwe bedrijf een naam.')
  }

  /* Eerst kijken of het er al staat. Twee keer "Brouwer Horeca Groep" in de
     lijst is erger dan een melding: de deals verdelen zich dan over twee
     bedrijven en geen van beide overzichten klopt nog. Hoofdletters negeren,
     want dat is precies hoe zo'n dubbele ontstaat. */
  const [bestaat] = await db
    .select({ id: organizations.id, naam: organizations.name })
    .from(organizations)
    .where(sql`lower(${organizations.name}) = lower(${schoon})`)
    .limit(1)

  if (bestaat) {
    throw new PijplijnError(
      `${bestaat.naam} staat al in het systeem. Kies het bedrijf in de lijst in plaats van het opnieuw aan te maken.`,
    )
  }

  const [org] = await db
    .insert(organizations)
    .values({ slug: await uniekeSlug(schoon), name: schoon, status: 'lead' })
    .returning({ id: organizations.id, naam: organizations.name })

  if (!org) throw new PijplijnError('Het bedrijf kon niet worden opgeslagen.')
  return org
}

/** Deals bij één klant, voor de klantpagina. */
export async function listDealsVoorKlant(
  organizationId: string,
  nu: Date = new Date(),
): Promise<DealKaart[]> {
  const alle = await listDeals({ status: 'alles' }, nu)
  return alle.filter((k) => k.deal.organizationId === organizationId)
}

/* --- Wijzigen ------------------------------------------------------------ */

export type NieuweDeal = {
  organizationId: string
  stageId?: string | null
  contactId?: string | null
  title: string
  kind?: 'retainer' | 'project'
  valueCents?: number | null
  expectedCloseOn?: Date | null
  ownerUserId?: string | null
  source?: string | null
  nextAction?: string | null
  nextActionOn?: Date | null
  notes?: string | null
}

export async function maakDeal(input: NieuweDeal): Promise<Deal> {
  if (input.title.trim() === '') {
    throw new PijplijnError('Geef de deal een naam, anders weet niemand later waar het over ging.')
  }

  // Geen fase meegegeven: de eerste van het bord. Zo kun je een deal in één
  // veld invoeren zonder eerst over fases na te denken.
  let stageId = input.stageId ?? null
  if (!stageId) {
    const [eerste] = await db
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(eq(pipelineStages.active, true))
      .orderBy(asc(pipelineStages.sortOrder))
      .limit(1)

    if (!eerste) {
      throw new PijplijnError(
        'Er zijn nog geen fases in de pijplijn. Voeg er eerst een toe.',
      )
    }
    stageId = eerste.id
  }

  const [deal] = await db
    .insert(deals)
    .values({
      organizationId: input.organizationId,
      stageId,
      contactId: input.contactId ?? null,
      title: input.title.trim(),
      kind: input.kind ?? 'retainer',
      valueCents: input.valueCents ?? null,
      expectedCloseOn: input.expectedCloseOn ?? null,
      ownerUserId: input.ownerUserId ?? null,
      source: (input.source ?? null) as never,
      nextAction: input.nextAction?.trim() || null,
      nextActionOn: input.nextActionOn ?? null,
      notes: input.notes?.trim() || null,
    })
    .returning()

  if (!deal) throw new PijplijnError('De deal kon niet worden opgeslagen.')
  return deal
}

/** Een deal naar een andere fase. */
export async function verplaatsDeal(dealId: string, stageId: string): Promise<void> {
  const [bij] = await db
    .update(deals)
    .set({ stageId, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.status, 'open')))
    .returning({ id: deals.id })

  if (!bij) {
    throw new PijplijnError(
      'Deze deal staat niet meer open. Een gesloten deal verplaats je niet; zet hem eerst terug op open.',
    )
  }
}

/** De volgende stap vastleggen of weghalen. */
export async function zetVolgendeActie(
  dealId: string,
  actie: string | null,
  opDatum: Date | null,
): Promise<void> {
  const schoon = (actie ?? '').trim()

  // De database weigert een van de twee; hier een melding die uitlegt waarom.
  if ((schoon === '') !== (opDatum === null)) {
    throw new PijplijnError(
      'Een vervolgstap hoort een datum te hebben, en een datum hoort een vervolgstap te hebben. Vul ze allebei in, of allebei niet.',
    )
  }

  await db
    .update(deals)
    .set({
      nextAction: schoon === '' ? null : schoon,
      nextActionOn: opDatum,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId))
}

/**
 * Een deal winnen.
 *
 * Wat hier WEL gebeurt: de deal gaat dicht, en het bedrijf wordt klant als
 * het dat nog niet was. Dat is geen aanname maar een vaststelling — een
 * gewonnen deal bij een prospect betekent dat die prospect een klant is.
 *
 * Wat hier NIET gebeurt: er wordt geen abonnement aangemaakt. Een abonnement
 * betekent dat er elke maand geld beweegt en budget wordt bijgeschreven, en
 * dat hoort een bewuste handeling te zijn met een bedrag en een startdatum
 * die iemand heeft nagekeken. Op de dealkaart staat daarvoor een knop.
 */
export async function winDeal(dealId: string, opDatum: Date = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const [deal] = await tx
      .update(deals)
      .set({ status: 'won', closedAt: opDatum, lostReason: null, updatedAt: new Date() })
      .where(eq(deals.id, dealId))
      .returning({ organizationId: deals.organizationId })

    if (!deal) throw new PijplijnError('Deal niet gevonden.')

    await tx
      .update(organizations)
      .set({ status: 'client', updatedAt: new Date() })
      .where(
        and(
          eq(organizations.id, deal.organizationId),
          // Een oud-klant blijft oud-klant tot iemand dat zelf omzet; die
          // situatie vraagt een gesprek en geen automatische wijziging.
          or(eq(organizations.status, 'lead'), eq(organizations.status, 'prospect')),
        ),
      )
  })
}

/**
 * Een deal verliezen, met een reden.
 *
 * De reden is verplicht en dat is met opzet. Een verloren deal zonder reden
 * leert je niets, en aan het eind van het jaar is de vraag "waarom lopen we
 * die af" dan niet te beantwoorden. De database weigert het ook.
 */
export async function verliesDeal(
  dealId: string,
  reden: string,
  opDatum: Date = new Date(),
): Promise<void> {
  if (reden.trim() === '') {
    throw new PijplijnError(
      'Vul in waarom deze deal verloren is. Zonder reden leer je er niets van, en over een jaar is niet meer te zeggen waarom we ze aflopen.',
    )
  }

  const [bij] = await db
    .update(deals)
    .set({
      status: 'lost',
      lostReason: reden.trim(),
      closedAt: opDatum,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId))
    .returning({ id: deals.id })

  if (!bij) throw new PijplijnError('Deal niet gevonden.')
}

/** Een gesloten deal weer openzetten. */
export async function heropenDeal(dealId: string): Promise<void> {
  const [bij] = await db
    .update(deals)
    .set({ status: 'open', closedAt: null, lostReason: null, updatedAt: new Date() })
    .where(eq(deals.id, dealId))
    .returning({ id: deals.id })

  if (!bij) throw new PijplijnError('Deal niet gevonden.')
}

export async function wisDeal(dealId: string): Promise<void> {
  await db.delete(deals).where(eq(deals.id, dealId))
}

/** Voor het dashboard: hoeveel deals hebben geen vervolgstap. */
export async function telAchterstand(nu: Date = new Date()): Promise<number> {
  const [rij] = await db
    .select({ n: sql<string>`COUNT(*)` })
    .from(deals)
    .where(
      and(
        eq(deals.status, 'open'),
        /* lt() en geen ruwe SQL-template.

           Een Date in een ruwe template wordt doorgegeven als de JavaScript-
           tekst "Thu Sep 17 2026 10:30:19 GMT+0000", en dat kan Postgres niet
           vergelijken met een timestamptz. Je krijgt dan geen verkeerd
           antwoord maar een harde fout — wat nog net het beste geval is. Dit
           is in dit project al drie keer misgegaan; gebruik bij datums altijd
           de getypeerde operator. */
        or(isNull(deals.nextActionOn), lt(deals.nextActionOn, nu)),
      ),
    )

  return Number(rij?.n ?? 0)
}
