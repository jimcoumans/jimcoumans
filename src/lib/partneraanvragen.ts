import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  organizationPartners,
  organizations,
  partnerAanvraagWerk,
  partnerAanvragen,
  partnerPakketten,
  partnerUitvragen,
  partnerWerkSjablonen,
  partners,
  quotes,
  users,
} from '@/db/schema'
import type { Partner, PartnerAanvraag, PartnerAanvraagWerk, PartnerPakket, PartnerUitvraag, PartnerWerkSjabloon } from '@/db/schema'
import { addQuoteLine, createQuote } from './quotes'
import { verstuurMail } from './mail'
import { formatEuro } from './money'
import { formatDate } from './dates'

/* -------------------------------------------------------------------------
   Partneraanvragen: van "de klant wil een video" naar een offerte.

   1. De aanvraag: wat, voor wie, wanneer, waar en hoeveel.
   2. De vergelijking: elke actieve partner met dat specialisme, met een
      matchscore (en waarom), het passende pakket en de prijs. De score is
      met opzet eenvoudig en uitlegbaar: elke punt heeft een reden die je op
      het scherm ziet. Geen zwarte doos die je moet geloven.
   3. De uitvraag: de gekozen partners krijgen een mail met een link. Daar
      zeggen ze of ze kunnen, welk pakket past en, als het nergens in past,
      wat het kost. Geen account nodig.
   4. Bevestigen: wij nemen hun prijs over of passen hem aan.
   5. Het voorstel: één klik maakt er een offerte van, met het werk van de
      partner één-op-één (geen opslag: inkoop is verkoop) en ons eigen werk
      apart, per regel aan of uit.
   ------------------------------------------------------------------------- */

export class AanvraagError extends Error {}

export const SPECIALISMEN = [
  'Video',
  'Fotografie',
  'Drone',
  'Animatie',
  'Motion design',
  'Grafisch ontwerp',
  'Copywriting',
  'Drukwerk',
  'Webdevelopment',
  'Vertaling',
  'Overig',
] as const

export const EENHEDEN = ['opdracht', 'dagdeel', 'dag', 'uur', 'stuk'] as const
export type Eenheid = (typeof EENHEDEN)[number]
export const EENHEID_LABELS: Record<Eenheid, string> = {
  opdracht: 'per opdracht',
  dagdeel: 'per dagdeel',
  dag: 'per dag',
  uur: 'per uur',
  stuk: 'per stuk',
}

export const UITVRAAG_STATUS_LABELS: Record<string, string> = {
  verstuurd: 'Wacht op antwoord',
  beantwoord: 'Beantwoord',
  bevestigd: 'Bevestigd',
  afgewezen: 'Afgewezen',
}

/** Zo lang is de link in een uitvraag geldig. Daarna vraag je opnieuw uit. */
const LINK_DAGEN = 21

const isEenheid = (s: string): s is Eenheid => (EENHEDEN as readonly string[]).includes(s)

/* ------------------------------ Rekenen ----------------------------------- */

type Omvang = Pick<PartnerAanvraag, 'dagdelen' | 'stuks'>

/** "2 dagdelen, 1 stuk", of leeg. */
export function omvangTekst(a: Omvang): string {
  return [a.dagdelen ? `${a.dagdelen} ${a.dagdelen === 1 ? 'dagdeel' : 'dagdelen'}` : null, a.stuks ? `${a.stuks} ${a.stuks === 1 ? 'stuk' : 'stuks'}` : null]
    .filter(Boolean)
    .join(', ')
}

/**
 * Hoe vaak een pakket meetelt voor deze aanvraag. Een pakket per opdracht
 * telt één keer; per dagdeel zoveel dagdelen als gevraagd; een dag is twee
 * dagdelen, een dagdeel vier uur. Ontbreekt de omvang, dan rekenen we met
 * één en zeggen we dat erbij.
 */
export function factorVoor(eenheid: string, a: Omvang): { factor: number; uitleg: string | null; aanname: boolean } {
  const e = isEenheid(eenheid) ? eenheid : 'opdracht'
  if (e === 'opdracht') return { factor: 1, uitleg: null, aanname: false }
  if (e === 'stuk') return a.stuks ? { factor: a.stuks, uitleg: `${a.stuks} ${a.stuks === 1 ? 'stuk' : 'stuks'}`, aanname: false } : { factor: 1, uitleg: 'aantal stuks onbekend, gerekend met 1', aanname: true }
  if (!a.dagdelen) return { factor: 1, uitleg: `omvang onbekend, gerekend met 1 ${e}`, aanname: true }
  if (e === 'dagdeel') return { factor: a.dagdelen, uitleg: `${a.dagdelen} ${a.dagdelen === 1 ? 'dagdeel' : 'dagdelen'}`, aanname: false }
  if (e === 'dag') return { factor: a.dagdelen / 2, uitleg: `${a.dagdelen / 2} ${a.dagdelen === 2 ? 'dag' : 'dagen'}`, aanname: false }
  return { factor: a.dagdelen * 4, uitleg: `${a.dagdelen * 4} uur (4 uur per dagdeel)`, aanname: false }
}

export function isVerlopen(p: Pick<PartnerPakket, 'geldigTot'>, vandaag: string): boolean {
  return !!p.geldigTot && p.geldigTot < vandaag
}

export type Indicatie = {
  pakket: PartnerPakket
  cents: number
  uitleg: string
  verlopen: boolean
  aanname: boolean
}

export function indicatieVoor(p: PartnerPakket, a: Omvang, vandaag: string): Indicatie {
  const { factor, uitleg, aanname } = factorVoor(p.eenheid, a)
  const cents = Math.round(p.prijsCents * factor)
  const eenheid = isEenheid(p.eenheid) ? EENHEID_LABELS[p.eenheid] : ''
  return {
    pakket: p,
    cents,
    uitleg: factor === 1 && !uitleg ? `${p.naam}: ${formatEuro(p.prijsCents)} ${eenheid}` : `${p.naam}: ${uitleg} × ${formatEuro(p.prijsCents)} ${eenheid}`,
    verlopen: isVerlopen(p, vandaag),
    aanname,
  }
}

/**
 * Het pakket dat we voorstellen: het goedkoopste dat nog geldig is. Zijn ze
 * allemaal verlopen, dan het goedkoopste verlopen pakket, met een vlag.
 */
export function kiesPakket(pakketten: PartnerPakket[], a: Omvang & { specialisme: string }, vandaag: string): Indicatie | null {
  const passend = pakketten.filter((p) => p.actief && p.specialisme === a.specialisme).map((p) => indicatieVoor(p, a, vandaag))
  if (passend.length === 0) return null
  const geldig = passend.filter((i) => !i.verlopen)
  const uit = geldig.length > 0 ? geldig : passend
  return uit.reduce((beste, i) => (i.cents < beste.cents ? i : beste))
}

/** Wat ons eigen werk kost: alleen de regels die aan staan. */
export function onsWerkCents(werk: Pick<PartnerAanvraagWerk, 'aan' | 'urenHonderdsten' | 'uurtariefCents'>[]): number {
  return werk.filter((w) => w.aan).reduce((n, w) => n + Math.round((w.urenHonderdsten * w.uurtariefCents) / 100), 0)
}

export type Ervaring = {
  /** Bevestigde opdrachten in de branche van de aanvraag. */
  brancheOpdrachten: number
  /** Bevestigde opdrachten voor deze klant. */
  klantOpdrachten: number
  /** Staat als vaste partner op de klantkaart. */
  vasteRol: string | null
  beoordelingen: number[]
}

export type Match = { score: number; redenen: string[]; bezwaren: string[] }

/**
 * De matchscore, van 0 tot 100. Elke punt heeft een reden.
 *
 * - Werkt graag voor de branche: 25 (wat wij van de partner weten).
 * - Ervaring in de branche: 5 per opdracht, tot 15 (wat we zagen).
 * - Kent de klant: 20 (vaste partner of eerdere opdracht).
 * - Prijsafspraak voor dit werk: 15, verlopen 5.
 * - Beoordeling: rond de 3 sterren neutraal, per ster erboven 10 erbij,
 *   per ster eronder 10 eraf.
 * - Basis: 25, zodat een nieuwe partner zonder geschiedenis niet op nul
 *   staat; anders krijgt hij nooit een kans om geschiedenis op te bouwen.
 */
export function berekenMatch(
  partner: Pick<Partner, 'branches'>,
  aanvraag: Pick<PartnerAanvraag, 'branche' | 'specialisme'>,
  indicatie: Pick<Indicatie, 'verlopen' | 'pakket'> | null,
  ervaring: Ervaring,
): Match {
  let score = 25
  const redenen: string[] = []
  const bezwaren: string[] = []
  const branche = aanvraag.branche?.trim()

  if (branche && partner.branches.some((b) => b.toLowerCase() === branche.toLowerCase())) {
    score += 25
    redenen.push(`Werkt graag voor ${branche.toLowerCase()}`)
  }
  if (ervaring.brancheOpdrachten > 0 && branche) {
    score += Math.min(15, ervaring.brancheOpdrachten * 5)
    redenen.push(`${ervaring.brancheOpdrachten} ${ervaring.brancheOpdrachten === 1 ? 'opdracht' : 'opdrachten'} in ${branche.toLowerCase()} via ons`)
  }
  if (ervaring.vasteRol) {
    score += 20
    redenen.push(`${ervaring.vasteRol} bij deze klant`)
  } else if (ervaring.klantOpdrachten > 0) {
    score += 20
    redenen.push(`Werkte al ${ervaring.klantOpdrachten} keer voor deze klant`)
  }
  if (!indicatie) {
    bezwaren.push(`Geen prijsafspraak voor ${aanvraag.specialisme.toLowerCase()}`)
  } else if (indicatie.verlopen) {
    score += 5
    bezwaren.push(`Prijsafspraak verlopen sinds ${formatDate(new Date(`${indicatie.pakket.geldigTot}T12:00:00`))}`)
  } else {
    score += 15
    redenen.push('Vaste prijsafspraak')
  }
  if (ervaring.beoordelingen.length > 0) {
    const gem = ervaring.beoordelingen.reduce((a, b) => a + b, 0) / ervaring.beoordelingen.length
    score += Math.round((gem - 3) * 10)
    const tekst = `Beoordeling ${gem.toFixed(1).replace('.', ',')} uit 5 (${ervaring.beoordelingen.length}×)`
    if (gem >= 3.5) redenen.push(tekst)
    else if (gem < 3) bezwaren.push(tekst)
  }
  return { score: Math.max(0, Math.min(100, score)), redenen, bezwaren }
}

/* ------------------------------ Sjablonen voor ons werk ------------------- */

export async function listSjablonen(alleenActief = false): Promise<PartnerWerkSjabloon[]> {
  return db
    .select()
    .from(partnerWerkSjablonen)
    .where(alleenActief ? eq(partnerWerkSjablonen.actief, true) : undefined)
    .orderBy(asc(partnerWerkSjablonen.volgorde), asc(partnerWerkSjablonen.naam))
}

export type WerkInvoer = { naam: string; omschrijving: string | null; urenHonderdsten: number | null; uurtariefCents: number | null }

function controleerWerk(w: WerkInvoer): { urenHonderdsten: number; uurtariefCents: number } {
  if (!w.naam.trim()) throw new AanvraagError('Geef het onderdeel een naam.')
  if (!w.urenHonderdsten || w.urenHonderdsten <= 0) throw new AanvraagError(`Vul bij "${w.naam}" het aantal uren in.`)
  if (!w.uurtariefCents || w.uurtariefCents <= 0) throw new AanvraagError(`Vul bij "${w.naam}" het uurtarief in.`)
  return { urenHonderdsten: w.urenHonderdsten, uurtariefCents: w.uurtariefCents }
}

export async function maakSjabloon(w: WerkInvoer & { standaardAan: boolean }): Promise<void> {
  const getallen = controleerWerk(w)
  const [hoogste] = await db.select({ max: sql<number | null>`max(${partnerWerkSjablonen.volgorde})` }).from(partnerWerkSjablonen)
  await db.insert(partnerWerkSjablonen).values({ naam: w.naam.trim(), omschrijving: w.omschrijving, ...getallen, standaardAan: w.standaardAan, volgorde: (hoogste?.max ?? 0) + 10 })
}

export async function wijzigSjabloon(id: string, w: WerkInvoer & { standaardAan: boolean; actief: boolean }): Promise<void> {
  const getallen = controleerWerk(w)
  await db
    .update(partnerWerkSjablonen)
    .set({ naam: w.naam.trim(), omschrijving: w.omschrijving, ...getallen, standaardAan: w.standaardAan, actief: w.actief })
    .where(eq(partnerWerkSjablonen.id, id))
}

/* ------------------------------ Partnerprofiel en pakketten --------------- */

export async function zetPartnerProfiel(
  partnerId: string,
  p: { specialismen: string[]; branches: string[]; werkgebied: string | null; sterktes: string | null },
): Promise<void> {
  const specialismen = [...new Set(p.specialismen.filter((s) => (SPECIALISMEN as readonly string[]).includes(s)))]
  const branches = [...new Set(p.branches.map((b) => b.trim()).filter(Boolean))].slice(0, 20)
  const [rij] = await db
    .update(partners)
    .set({ specialismen, branches, werkgebied: p.werkgebied, sterktes: p.sterktes, updatedAt: new Date() })
    .where(eq(partners.id, partnerId))
    .returning({ id: partners.id })
  if (!rij) throw new AanvraagError('Deze partner bestaat niet meer.')
}

export type PakketInvoer = {
  specialisme: string
  naam: string
  omschrijving: string | null
  prijsCents: number | null
  eenheid: string
  geldigTot: string | null
}

function pakketWaarden(p: PakketInvoer) {
  if (!(SPECIALISMEN as readonly string[]).includes(p.specialisme)) throw new AanvraagError('Kies voor welk specialisme deze prijsafspraak geldt.')
  if (!p.naam.trim()) throw new AanvraagError('Geef de prijsafspraak een naam, bijvoorbeeld "Halve draaidag + montage".')
  if (!p.prijsCents || p.prijsCents <= 0) throw new AanvraagError('Vul de prijs in.')
  if (p.geldigTot && !/^\d{4}-\d{2}-\d{2}$/.test(p.geldigTot)) throw new AanvraagError('De datum "geldig tot" is niet te lezen.')
  return {
    specialisme: p.specialisme,
    naam: p.naam.trim(),
    omschrijving: p.omschrijving?.trim() || null,
    prijsCents: p.prijsCents,
    eenheid: isEenheid(p.eenheid) ? p.eenheid : 'opdracht',
    geldigTot: p.geldigTot || null,
  }
}

export async function maakPakket(partnerId: string, p: PakketInvoer): Promise<void> {
  await db.insert(partnerPakketten).values({ partnerId, ...pakketWaarden(p) })
}

export async function wijzigPakket(id: string, p: PakketInvoer & { actief: boolean }): Promise<void> {
  await db
    .update(partnerPakketten)
    .set({ ...pakketWaarden(p), actief: p.actief, updatedAt: new Date() })
    .where(eq(partnerPakketten.id, id))
}

export async function verwijderPakket(id: string): Promise<void> {
  await db.delete(partnerPakketten).where(eq(partnerPakketten.id, id))
}

export async function pakkettenPerPartner(): Promise<Map<string, PartnerPakket[]>> {
  const rijen = await db.select().from(partnerPakketten).orderBy(asc(partnerPakketten.specialisme), asc(partnerPakketten.prijsCents))
  const uit = new Map<string, PartnerPakket[]>()
  for (const r of rijen) uit.set(r.partnerId, [...(uit.get(r.partnerId) ?? []), r])
  return uit
}

/* ------------------------------ Aanvragen --------------------------------- */

export type AanvraagInvoer = {
  organizationId: string
  titel: string
  specialisme: string
  vraag: string
  branche: string | null
  voorkeursdatum: string | null
  datumToelichting: string | null
  locatie: string | null
  dagdelen: number | null
  stuks: number | null
  notities: string | null
}

function aanvraagWaarden(a: Omit<AanvraagInvoer, 'organizationId'>) {
  if (!a.titel.trim()) throw new AanvraagError('Geef de aanvraag een naam, bijvoorbeeld "Woningvideo Hoofdstraat 12".')
  if (!(SPECIALISMEN as readonly string[]).includes(a.specialisme)) throw new AanvraagError('Kies wat er gemaakt moet worden.')
  if (!a.vraag.trim()) throw new AanvraagError('Beschrijf de vraag. Die gaat letterlijk naar de partner.')
  if (a.voorkeursdatum && !/^\d{4}-\d{2}-\d{2}$/.test(a.voorkeursdatum)) throw new AanvraagError('De voorkeursdatum is niet te lezen.')
  if ((a.dagdelen !== null && a.dagdelen <= 0) || (a.stuks !== null && a.stuks <= 0)) throw new AanvraagError('Dagdelen en aantal zijn hele getallen boven nul, of leeg.')
  return {
    titel: a.titel.trim(),
    specialisme: a.specialisme,
    vraag: a.vraag.trim(),
    branche: a.branche?.trim() || null,
    voorkeursdatum: a.voorkeursdatum || null,
    datumToelichting: a.datumToelichting?.trim() || null,
    locatie: a.locatie?.trim() || null,
    dagdelen: a.dagdelen,
    stuks: a.stuks,
    notities: a.notities?.trim() || null,
  }
}

/** Een nieuwe aanvraag, met ons eigen werk uit de sjablonen: wat standaard aan staat, staat aan. */
export async function maakAanvraag(input: AanvraagInvoer, userId: string): Promise<PartnerAanvraag> {
  const [org] = await db.select({ industry: organizations.industry }).from(organizations).where(eq(organizations.id, input.organizationId)).limit(1)
  if (!org) throw new AanvraagError('Kies de klant.')
  const waarden = aanvraagWaarden({ ...input, branche: input.branche ?? org.industry })
  const sjablonen = await listSjablonen(true)
  return db.transaction(async (tx) => {
    const [rij] = await tx.insert(partnerAanvragen).values({ organizationId: input.organizationId, ...waarden, createdByUserId: userId }).returning()
    if (!rij) throw new AanvraagError('De aanvraag kon niet worden opgeslagen.')
    if (sjablonen.length > 0) {
      await tx.insert(partnerAanvraagWerk).values(
        sjablonen.map((s) => ({
          aanvraagId: rij.id,
          naam: s.naam,
          omschrijving: s.omschrijving,
          urenHonderdsten: s.urenHonderdsten,
          uurtariefCents: s.uurtariefCents,
          aan: s.standaardAan,
          volgorde: s.volgorde,
        })),
      )
    }
    return rij
  })
}

async function openAanvraag(id: string): Promise<PartnerAanvraag> {
  const [a] = await db.select().from(partnerAanvragen).where(eq(partnerAanvragen.id, id)).limit(1)
  if (!a) throw new AanvraagError('Deze aanvraag bestaat niet meer.')
  if (a.status !== 'open') throw new AanvraagError('Er is al een voorstel gemaakt of de aanvraag is geannuleerd. Wijzig de offerte zelf.')
  return a
}

export async function wijzigAanvraag(id: string, input: Omit<AanvraagInvoer, 'organizationId'>): Promise<void> {
  await openAanvraag(id)
  await db
    .update(partnerAanvragen)
    .set({ ...aanvraagWaarden(input), updatedAt: new Date() })
    .where(eq(partnerAanvragen.id, id))
}

export async function zetAanvraagStatus(id: string, status: 'open' | 'geannuleerd'): Promise<void> {
  await db.update(partnerAanvragen).set({ status, updatedAt: new Date() }).where(eq(partnerAanvragen.id, id))
}

/**
 * Ons werk op deze aanvraag opslaan: per regel aan of uit, met uren en
 * tarief. De basisfee staat standaard aan, maar mag uit: soms nemen we
 * acquisitie en briefing voor eigen rekening, of zit het al in de uren voor
 * marketingmanagement.
 */
export async function zetWerk(
  aanvraagId: string,
  regels: { id: string; aan: boolean; urenHonderdsten: number | null; uurtariefCents: number | null }[],
): Promise<void> {
  await openAanvraag(aanvraagId)
  const bestaand = await db.select().from(partnerAanvraagWerk).where(eq(partnerAanvraagWerk.aanvraagId, aanvraagId))
  const perId = new Map(bestaand.map((w) => [w.id, w]))
  await db.transaction(async (tx) => {
    for (const r of regels) {
      const w = perId.get(r.id)
      if (!w) continue
      const getallen = controleerWerk({ naam: w.naam, omschrijving: null, urenHonderdsten: r.urenHonderdsten, uurtariefCents: r.uurtariefCents })
      await tx.update(partnerAanvraagWerk).set({ aan: r.aan, ...getallen }).where(eq(partnerAanvraagWerk.id, r.id))
    }
  })
}

export async function voegWerkToe(aanvraagId: string, w: WerkInvoer): Promise<void> {
  await openAanvraag(aanvraagId)
  const getallen = controleerWerk(w)
  const [hoogste] = await db
    .select({ max: sql<number | null>`max(${partnerAanvraagWerk.volgorde})` })
    .from(partnerAanvraagWerk)
    .where(eq(partnerAanvraagWerk.aanvraagId, aanvraagId))
  await db.insert(partnerAanvraagWerk).values({ aanvraagId, naam: w.naam.trim(), omschrijving: w.omschrijving, ...getallen, aan: true, volgorde: (hoogste?.max ?? 0) + 10 })
}

/* ------------------------------ Lezen ------------------------------------- */

export type AanvraagRij = PartnerAanvraag & {
  klant: string
  slug: string
  door: string | null
  uitgevraagd: number
  beantwoord: number
  bevestigd: number
  quoteNummer: string | null
  quoteStatus: string | null
}

export async function listAanvragen(): Promise<AanvraagRij[]> {
  const rijen = await db
    .select({
      a: partnerAanvragen,
      klant: organizations.name,
      slug: organizations.slug,
      door: users.name,
      quoteNummer: quotes.number,
      quoteStatus: quotes.status,
    })
    .from(partnerAanvragen)
    .innerJoin(organizations, eq(organizations.id, partnerAanvragen.organizationId))
    .leftJoin(users, eq(users.id, partnerAanvragen.createdByUserId))
    .leftJoin(quotes, eq(quotes.id, partnerAanvragen.quoteId))
    .orderBy(desc(partnerAanvragen.createdAt))
    .limit(200)
  const ids = rijen.map((r) => r.a.id)
  const uitvragen = ids.length
    ? await db.select({ aanvraagId: partnerUitvragen.aanvraagId, status: partnerUitvragen.status }).from(partnerUitvragen).where(inArray(partnerUitvragen.aanvraagId, ids))
    : []
  return rijen.map((r) => {
    const eigen = uitvragen.filter((u) => u.aanvraagId === r.a.id)
    return {
      ...r.a,
      klant: r.klant,
      slug: r.slug,
      door: r.door,
      uitgevraagd: eigen.length,
      beantwoord: eigen.filter((u) => u.status !== 'verstuurd').length,
      bevestigd: eigen.filter((u) => u.status === 'bevestigd').length,
      quoteNummer: r.quoteNummer,
      quoteStatus: r.quoteStatus,
    }
  })
}

export type UitvraagRij = PartnerUitvraag & {
  partner: Pick<Partner, 'id' | 'name' | 'email' | 'contactName'>
  pakket: PartnerPakket | null
  antwoordPakket: PartnerPakket | null
  link: string
}

export type AanvraagDetail = {
  aanvraag: PartnerAanvraag
  klant: { id: string; name: string; slug: string; city: string | null; website: string | null; industry: string | null }
  werk: PartnerAanvraagWerk[]
  uitvragen: UitvraagRij[]
  quote: { id: string; number: string; status: string } | null
}

export async function getAanvraag(id: string): Promise<AanvraagDetail | null> {
  const [r] = await db
    .select({ a: partnerAanvragen, klant: organizations })
    .from(partnerAanvragen)
    .innerJoin(organizations, eq(organizations.id, partnerAanvragen.organizationId))
    .where(eq(partnerAanvragen.id, id))
    .limit(1)
  if (!r) return null
  const [werk, uitvragen, quote] = await Promise.all([
    db.select().from(partnerAanvraagWerk).where(eq(partnerAanvraagWerk.aanvraagId, id)).orderBy(asc(partnerAanvraagWerk.volgorde)),
    db
      .select({ u: partnerUitvragen, partner: { id: partners.id, name: partners.name, email: partners.email, contactName: partners.contactName } })
      .from(partnerUitvragen)
      .innerJoin(partners, eq(partners.id, partnerUitvragen.partnerId))
      .where(eq(partnerUitvragen.aanvraagId, id))
      .orderBy(asc(partners.name)),
    r.a.quoteId ? db.select({ id: quotes.id, number: quotes.number, status: quotes.status }).from(quotes).where(eq(quotes.id, r.a.quoteId)).limit(1) : Promise.resolve([]),
  ])
  const pakketIds = uitvragen.flatMap(({ u }) => [u.pakketId, u.antwoordPakketId]).filter((x): x is string => !!x)
  const pakketten = pakketIds.length ? await db.select().from(partnerPakketten).where(inArray(partnerPakketten.id, pakketIds)) : []
  const pakket = (pid: string | null) => (pid ? (pakketten.find((p) => p.id === pid) ?? null) : null)
  return {
    aanvraag: r.a,
    klant: { id: r.klant.id, name: r.klant.name, slug: r.klant.slug, city: r.klant.city, website: r.klant.website, industry: r.klant.industry },
    werk,
    uitvragen: uitvragen.map(({ u, partner }) => ({ ...u, partner, pakket: pakket(u.pakketId), antwoordPakket: pakket(u.antwoordPakketId), link: uitvraagPad(u.id, u.linkVersie) })),
    quote: quote[0] ?? null,
  }
}

export type VergelijkRij = {
  partner: Partner
  pakketten: PartnerPakket[]
  indicatie: Indicatie | null
  match: Match
  klantprijsCents: number | null
  uitvraag: PartnerUitvraag | null
}

/**
 * De vergelijking: elke actieve partner met het gevraagde specialisme, de
 * beste match bovenaan. De ervaring komt uit eerdere bevestigde uitvragen
 * en uit de klantkaart; dat groeit vanzelf met elke opdracht.
 */
export async function vergelijk(aanvraagId: string, vandaag = new Date().toISOString().slice(0, 10)): Promise<VergelijkRij[]> {
  const [a] = await db.select().from(partnerAanvragen).where(eq(partnerAanvragen.id, aanvraagId)).limit(1)
  if (!a) return []
  const kandidaten = await db
    .select()
    .from(partners)
    .where(and(eq(partners.active, true), sql`${a.specialisme} = ANY(${partners.specialismen})`))
  if (kandidaten.length === 0) return []
  const ids = kandidaten.map((p) => p.id)

  const [pakketten, werk, eerdere, rollen, hier] = await Promise.all([
    db.select().from(partnerPakketten).where(inArray(partnerPakketten.partnerId, ids)),
    db.select().from(partnerAanvraagWerk).where(eq(partnerAanvraagWerk.aanvraagId, aanvraagId)),
    db
      .select({ partnerId: partnerUitvragen.partnerId, organizationId: partnerAanvragen.organizationId, branche: partnerAanvragen.branche, beoordeling: partnerUitvragen.beoordeling })
      .from(partnerUitvragen)
      .innerJoin(partnerAanvragen, eq(partnerAanvragen.id, partnerUitvragen.aanvraagId))
      .where(and(inArray(partnerUitvragen.partnerId, ids), eq(partnerUitvragen.status, 'bevestigd'), sql`${partnerUitvragen.aanvraagId} <> ${aanvraagId}`)),
    db
      .select({ partnerId: organizationPartners.partnerId, role: organizationPartners.role })
      .from(organizationPartners)
      .where(and(eq(organizationPartners.organizationId, a.organizationId), inArray(organizationPartners.partnerId, ids))),
    db.select().from(partnerUitvragen).where(eq(partnerUitvragen.aanvraagId, aanvraagId)),
  ])
  const eigenWerk = onsWerkCents(werk)
  const branche = a.branche?.toLowerCase() ?? null

  return kandidaten
    .map((partner) => {
      const eigenPakketten = pakketten.filter((p) => p.partnerId === partner.id)
      const indicatie = kiesPakket(eigenPakketten, a, vandaag)
      const opdrachten = eerdere.filter((e) => e.partnerId === partner.id)
      const match = berekenMatch(partner, a, indicatie, {
        brancheOpdrachten: branche ? opdrachten.filter((e) => e.branche?.toLowerCase() === branche).length : 0,
        klantOpdrachten: opdrachten.filter((e) => e.organizationId === a.organizationId).length,
        vasteRol: rollen.find((r) => r.partnerId === partner.id)?.role ?? null,
        beoordelingen: opdrachten.flatMap((e) => (e.beoordeling ? [e.beoordeling] : [])),
      })
      return {
        partner,
        pakketten: eigenPakketten.filter((p) => p.actief && p.specialisme === a.specialisme),
        indicatie,
        match,
        klantprijsCents: indicatie ? indicatie.cents + eigenWerk : null,
        uitvraag: hier.find((u) => u.partnerId === partner.id) ?? null,
      }
    })
    .sort((x, y) => y.match.score - x.match.score || (x.indicatie?.cents ?? Infinity) - (y.indicatie?.cents ?? Infinity))
}

/* ------------------------------ De link ----------------------------------- */

function geheim(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET ontbreekt of is te kort (minimaal 32 tekens).')
  return s
}

export function uitvraagToken(id: string, versie: number): string {
  return createHmac('sha256', geheim()).update(`uitvraag:${id}:${versie}`).digest('base64url').slice(0, 32)
}

export function uitvraagPad(id: string, versie: number): string {
  return `/uitvraag/${id}/${uitvraagToken(id, versie)}`
}

function tokenKlopt(id: string, versie: number, token: string): boolean {
  const verwacht = Buffer.from(uitvraagToken(id, versie))
  const gegeven = Buffer.from(token)
  return verwacht.length === gegeven.length && timingSafeEqual(verwacht, gegeven)
}

/* ------------------------------ Uitvragen --------------------------------- */

const basisUrl = () => (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function datumTekst(a: Pick<PartnerAanvraag, 'voorkeursdatum' | 'datumToelichting'>): string {
  const datum = a.voorkeursdatum ? formatDate(new Date(`${a.voorkeursdatum}T12:00:00`)) : null
  return [datum, a.datumToelichting].filter(Boolean).join(', ') || 'in overleg'
}

/** De mail aan de partner. Kort: alles staat achter de link, en daar antwoordt hij ook. */
export function uitvraagMail(input: {
  partner: Pick<Partner, 'name' | 'contactName'>
  aanvraag: PartnerAanvraag
  klant: { name: string; city: string | null; website: string | null }
  pakketten: PartnerPakket[]
  link: string
  afzender: string
}): { onderwerp: string; tekst: string } {
  const { aanvraag: a, klant } = input
  const omvang = omvangTekst(a)
  const regels = [
    `Hoi ${input.partner.contactName?.split(' ')[0] ?? input.partner.name},`,
    '',
    `We hebben een opdracht die bij je past: ${a.specialisme.toLowerCase()} voor ${klant.name}${klant.city ? ` in ${klant.city}` : ''}.`,
    '',
    `Wat: ${a.vraag}`,
    `Wanneer: ${datumTekst(a)}`,
    a.locatie ? `Waar: ${a.locatie}` : null,
    omvang ? `Omvang: ${omvang}` : null,
    klant.website ? `Klant: ${klant.name}, ${klant.website}` : `Klant: ${klant.name}`,
    '',
    input.pakketten.length > 0
      ? `Past dit binnen ${input.pakketten.length === 1 ? 'dit pakket' : 'een van deze pakketten'} dat we met je hebben afgesproken?\n${input.pakketten.map((p) => `- ${p.naam}: ${formatEuro(p.prijsCents)} ${EENHEID_LABELS[p.eenheid as Eenheid] ?? ''}`).join('\n')}`
      : 'We hebben voor dit werk nog geen vaste prijs met je afgesproken. Wat zou het kosten?',
    '',
    `Laat het ons weten via deze link, dat kost je een minuut: ${input.link}`,
    '',
    'Kun je niet op deze datum, zeg dat dan ook; dan kijken we samen naar een ander moment.',
    '',
    'Groet,',
    input.afzender,
    'James Robinson',
  ]
  return {
    onderwerp: `Aanvraag ${a.specialisme.toLowerCase()} voor ${klant.name}${a.voorkeursdatum ? `, ${formatDate(new Date(`${a.voorkeursdatum}T12:00:00`))}` : ''}`,
    tekst: regels.filter((r) => r !== null).join('\n'),
  }
}

export type Uitvraagkeuze = { partnerId: string; pakketId: string | null }

/**
 * De gekozen partners uitvragen. Elke partner krijgt een eigen link. Lukt
 * het mailen niet (geen mailsleutel, verkeerd adres), dan staat de uitvraag
 * er toch, met de reden en de link om zelf te delen: het werk mag niet
 * stilvallen omdat een mail niet weg kon.
 */
export async function verstuurUitvragen(
  aanvraagId: string,
  keuzes: Uitvraagkeuze[],
  user: { id: string; name: string | null; email: string },
  vandaag = new Date().toISOString().slice(0, 10),
): Promise<{ verstuurd: number; mislukt: string[] }> {
  const a = await openAanvraag(aanvraagId)
  if (keuzes.length === 0) throw new AanvraagError('Vink minstens één partner aan.')
  const [klant] = await db.select().from(organizations).where(eq(organizations.id, a.organizationId)).limit(1)
  if (!klant) throw new AanvraagError('De klant bestaat niet meer.')
  const al = await db.select({ partnerId: partnerUitvragen.partnerId }).from(partnerUitvragen).where(eq(partnerUitvragen.aanvraagId, aanvraagId))
  const dubbel = keuzes.filter((k) => al.some((u) => u.partnerId === k.partnerId))
  if (dubbel.length > 0) throw new AanvraagError('Een van de gekozen partners is al uitgevraagd. Gebruik bij die partner "Opnieuw versturen".')

  const gekozen = await db.select().from(partners).where(inArray(partners.id, keuzes.map((k) => k.partnerId)))
  const pakketten = await db.select().from(partnerPakketten).where(inArray(partnerPakketten.partnerId, keuzes.map((k) => k.partnerId)))
  const mislukt: string[] = []
  let verstuurd = 0

  for (const k of keuzes) {
    const partner = gekozen.find((p) => p.id === k.partnerId)
    if (!partner) continue
    const eigen = pakketten.filter((p) => p.partnerId === partner.id && p.actief && p.specialisme === a.specialisme)
    const pakket = k.pakketId ? (eigen.find((p) => p.id === k.pakketId) ?? null) : (kiesPakket(eigen, a, vandaag)?.pakket ?? null)
    const indicatie = pakket ? indicatieVoor(pakket, a, vandaag).cents : null
    const [u] = await db
      .insert(partnerUitvragen)
      .values({ aanvraagId, partnerId: partner.id, pakketId: pakket?.id ?? null, indicatieCents: indicatie, createdByUserId: user.id })
      .returning()
    if (!u) continue
    const fout = await mailUitvraag(u, partner, a, klant, eigen, user)
    if (fout) mislukt.push(`${partner.name}: ${fout}`)
    else verstuurd++
  }
  await db.update(partnerAanvragen).set({ updatedAt: new Date() }).where(eq(partnerAanvragen.id, aanvraagId))
  return { verstuurd, mislukt }
}

async function mailUitvraag(
  u: PartnerUitvraag,
  partner: Partner,
  a: PartnerAanvraag,
  klant: { name: string; city: string | null; website: string | null },
  pakketten: PartnerPakket[],
  user: { name: string | null; email: string },
): Promise<string | null> {
  let fout: string | null = null
  if (!partner.email) fout = 'Er staat geen e-mailadres bij deze partner.'
  else {
    const mail = uitvraagMail({ partner, aanvraag: a, klant, pakketten, link: `${basisUrl()}${uitvraagPad(u.id, u.linkVersie)}`, afzender: user.name ?? user.email })
    try {
      await verstuurMail({ aan: partner.email, antwoordAan: user.email, cc: user.email, onderwerp: mail.onderwerp, tekst: mail.tekst })
    } catch (error) {
      fout = error instanceof Error ? error.message : 'Mailen mislukt.'
    }
  }
  await db.update(partnerUitvragen).set({ mailFout: fout }).where(eq(partnerUitvragen.id, u.id))
  return fout
}

/** Opnieuw versturen: een nieuwe link (de oude werkt dan niet meer) en een nieuwe mail. */
export async function verstuurOpnieuw(uitvraagId: string, user: { id: string; name: string | null; email: string }): Promise<string | null> {
  const [u] = await db.select().from(partnerUitvragen).where(eq(partnerUitvragen.id, uitvraagId)).limit(1)
  if (!u) throw new AanvraagError('Deze uitvraag bestaat niet meer.')
  const a = await openAanvraag(u.aanvraagId)
  if (u.status === 'bevestigd') throw new AanvraagError('Deze partner is al bevestigd.')
  const [nieuw] = await db
    .update(partnerUitvragen)
    .set({ linkVersie: u.linkVersie + 1, verstuurdOp: new Date(), status: 'verstuurd' })
    .where(eq(partnerUitvragen.id, uitvraagId))
    .returning()
  const [partner] = await db.select().from(partners).where(eq(partners.id, u.partnerId)).limit(1)
  const [klant] = await db.select().from(organizations).where(eq(organizations.id, a.organizationId)).limit(1)
  const pakketten = await db.select().from(partnerPakketten).where(and(eq(partnerPakketten.partnerId, u.partnerId), eq(partnerPakketten.actief, true), eq(partnerPakketten.specialisme, a.specialisme)))
  return mailUitvraag(nieuw!, partner!, a, klant!, pakketten, user)
}

/* ------------------------------ De partner antwoordt ---------------------- */

export type UitvraagVoorPartner = {
  id: string
  status: string
  partnernaam: string
  klant: { name: string; city: string | null; website: string | null }
  aanvraag: Pick<PartnerAanvraag, 'specialisme' | 'vraag' | 'voorkeursdatum' | 'datumToelichting' | 'locatie' | 'dagdelen' | 'stuks'>
  datum: string
  pakketten: PartnerPakket[]
  voorgesteldPakketId: string | null
  antwoord: Pick<PartnerUitvraag, 'beschikbaar' | 'andereDatum' | 'antwoordPakketId' | 'antwoordPrijsCents' | 'antwoordOpmerking' | 'beantwoordOp'>
}

/**
 * De uitvraag zoals de partner hem ziet, via de link. Alleen wat hij nodig
 * heeft: geen interne notities, geen prijzen van andere partners, niet wat
 * wij de klant rekenen.
 */
export async function uitvraagViaLink(id: string, token: string, nu = Date.now()): Promise<UitvraagVoorPartner | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const [r] = await db
    .select({ u: partnerUitvragen, partner: partners, a: partnerAanvragen, klant: organizations })
    .from(partnerUitvragen)
    .innerJoin(partners, eq(partners.id, partnerUitvragen.partnerId))
    .innerJoin(partnerAanvragen, eq(partnerAanvragen.id, partnerUitvragen.aanvraagId))
    .innerJoin(organizations, eq(organizations.id, partnerAanvragen.organizationId))
    .where(eq(partnerUitvragen.id, id))
    .limit(1)
  if (!r || !tokenKlopt(id, r.u.linkVersie, token)) return null
  if (nu - r.u.verstuurdOp.getTime() > LINK_DAGEN * 86_400_000) return null
  if (r.a.status === 'geannuleerd') return null
  const pakketten = await db
    .select()
    .from(partnerPakketten)
    .where(and(eq(partnerPakketten.partnerId, r.partner.id), eq(partnerPakketten.actief, true), eq(partnerPakketten.specialisme, r.a.specialisme)))
    .orderBy(asc(partnerPakketten.prijsCents))
  return {
    id: r.u.id,
    status: r.u.status,
    partnernaam: r.partner.name,
    klant: { name: r.klant.name, city: r.klant.city, website: r.klant.website },
    aanvraag: r.a,
    datum: datumTekst(r.a),
    pakketten,
    voorgesteldPakketId: r.u.pakketId,
    antwoord: r.u,
  }
}

export type Antwoord = {
  beschikbaar: boolean
  andereDatum: string | null
  /** Een pakket-id, of null als het in geen pakket past. */
  pakketId: string | null
  prijsCents: number | null
  opmerking: string | null
}

/** Het antwoord van de partner. Hij mag het aanpassen tot wij hem hebben bevestigd. */
export async function beantwoord(id: string, token: string, antwoord: Antwoord): Promise<void> {
  const u = await uitvraagViaLink(id, token)
  if (!u) throw new AanvraagError('Deze link werkt niet (meer). Vraag ons om een nieuwe.')
  if (u.status === 'bevestigd' || u.status === 'afgewezen') throw new AanvraagError('We hebben je antwoord al verwerkt. Wil je iets wijzigen, mail of bel ons dan.')
  const pakket = antwoord.pakketId ? u.pakketten.find((p) => p.id === antwoord.pakketId) : null
  if (antwoord.pakketId && !pakket) throw new AanvraagError('Kies een van de pakketten, of "past in geen pakket".')
  // Niet beschikbaar is ook een antwoord; dan hoeft er geen pakket of prijs bij.
  if (antwoord.beschikbaar && !pakket && !antwoord.prijsCents) throw new AanvraagError('Past het in geen pakket? Vul dan je prijs voor deze opdracht in.')
  if (antwoord.prijsCents !== null && antwoord.prijsCents <= 0) throw new AanvraagError('Vul een prijs boven nul in.')
  await db
    .update(partnerUitvragen)
    .set({
      status: 'beantwoord',
      beschikbaar: antwoord.beschikbaar,
      andereDatum: antwoord.andereDatum?.trim().slice(0, 300) || null,
      antwoordPakketId: pakket?.id ?? null,
      antwoordPrijsCents: antwoord.prijsCents,
      antwoordOpmerking: antwoord.opmerking?.trim().slice(0, 2000) || null,
      beantwoordOp: new Date(),
    })
    .where(eq(partnerUitvragen.id, id))
}

/* ------------------------------ Wij bevestigen ---------------------------- */

/**
 * De prijs die de partner noemt: zijn eigen bedrag, anders het pakket dat
 * hij koos (met de omvang van de aanvraag), anders onze indicatie.
 */
export function voorgesteldePrijs(u: Pick<UitvraagRij, 'antwoordPrijsCents' | 'antwoordPakket' | 'indicatieCents'>, a: Omvang, vandaag: string): number | null {
  if (u.antwoordPrijsCents) return u.antwoordPrijsCents
  if (u.antwoordPakket) return indicatieVoor(u.antwoordPakket, a, vandaag).cents
  return u.indicatieCents
}

export async function bevestig(uitvraagId: string, prijsCents: number | null, userId: string): Promise<void> {
  const [u] = await db.select().from(partnerUitvragen).where(eq(partnerUitvragen.id, uitvraagId)).limit(1)
  if (!u) throw new AanvraagError('Deze uitvraag bestaat niet meer.')
  await openAanvraag(u.aanvraagId)
  if (u.beschikbaar === false) throw new AanvraagError('Deze partner kan niet. Vraag opnieuw uit met een andere datum, of kies een andere partner.')
  if (!prijsCents || prijsCents <= 0) throw new AanvraagError('Vul de prijs in die we met de partner afspreken.')
  await db
    .update(partnerUitvragen)
    .set({ status: 'bevestigd', prijsCents, bevestigdOp: new Date(), bevestigdDoorUserId: userId })
    .where(eq(partnerUitvragen.id, uitvraagId))
}

export async function wijsAf(uitvraagId: string): Promise<void> {
  const [u] = await db.select().from(partnerUitvragen).where(eq(partnerUitvragen.id, uitvraagId)).limit(1)
  if (!u) throw new AanvraagError('Deze uitvraag bestaat niet meer.')
  await db.update(partnerUitvragen).set({ status: 'afgewezen' }).where(eq(partnerUitvragen.id, uitvraagId))
}

/** Na de opdracht: hoe ging het? Telt mee in de volgende match. */
export async function beoordeel(uitvraagId: string, beoordeling: number, notitie: string | null): Promise<void> {
  if (!Number.isInteger(beoordeling) || beoordeling < 1 || beoordeling > 5) throw new AanvraagError('Geef een beoordeling van 1 tot 5.')
  const [u] = await db.select().from(partnerUitvragen).where(eq(partnerUitvragen.id, uitvraagId)).limit(1)
  if (!u || u.status !== 'bevestigd') throw new AanvraagError('Alleen een bevestigde opdracht kun je beoordelen.')
  await db.update(partnerUitvragen).set({ beoordeling, beoordelingNotitie: notitie?.trim() || null }).where(eq(partnerUitvragen.id, uitvraagId))
}

/* ------------------------------ Het voorstel ------------------------------ */

/** Een tekst als zin: met een punt erachter als die er nog niet staat. */
const zin = (t: string | null | undefined) => (t?.trim() ? (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`) : null)

/**
 * Van aanvraag naar offerte. Het werk van de partner gaat één-op-één door:
 * verkoopprijs is inkoopprijs. Ons eigen werk komt er per onderdeel bij,
 * alleen wat aan staat. De offerte is een concept in de offertemodule; daar
 * werk je hem af en verstuur je hem.
 */
export async function maakVoorstel(aanvraagId: string, uitvraagId: string, userId: string): Promise<string> {
  const a = await openAanvraag(aanvraagId)
  const detail = await getAanvraag(aanvraagId)
  const u = detail?.uitvragen.find((x) => x.id === uitvraagId)
  if (!detail || !u) throw new AanvraagError('Kies een partner van deze aanvraag.')
  if (u.status !== 'bevestigd' || !u.prijsCents) throw new AanvraagError('Bevestig eerst de prijs van deze partner.')

  const pakket = u.antwoordPakket ?? u.pakket
  const quote = await createQuote({
    organizationId: a.organizationId,
    title: a.titel,
    introText: a.vraag,
    createdByUserId: userId,
  })
  await addQuoteLine({
    quoteId: quote.id,
    kind: 'partner',
    partnerId: u.partnerId,
    description: pakket ? `${a.specialisme}: ${pakket.naam}` : a.specialisme,
    detail: [zin(pakket?.omschrijving), `Uitgevoerd door ${u.partner.name}.`, a.voorkeursdatum ? zin(`Datum: ${datumTekst(a)}`) : null].filter(Boolean).join(' '),
    quantityHundredths: 100,
    // Geen opslag: de klant betaalt wat de partner ons rekent.
    unitPriceCents: u.prijsCents,
    unitCostCents: u.prijsCents,
  })
  for (const w of detail.werk.filter((x) => x.aan)) {
    await addQuoteLine({
      quoteId: quote.id,
      kind: 'custom',
      description: w.naam,
      detail: w.omschrijving,
      quantityHundredths: w.urenHonderdsten,
      unitPriceCents: w.uurtariefCents,
    })
  }
  await db.update(partnerAanvragen).set({ status: 'voorstel', quoteId: quote.id, updatedAt: new Date() }).where(eq(partnerAanvragen.id, aanvraagId))
  return quote.id
}

/** Voor schermen: is deze prijsafspraak vandaag verlopen? */
export function isVerlopenVandaag(p: Pick<PartnerPakket, 'geldigTot'>): boolean {
  return isVerlopen(p, new Date().toISOString().slice(0, 10))
}
