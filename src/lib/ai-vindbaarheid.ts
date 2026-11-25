import { and, asc, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import { db } from '@/db'
import { aiMeetsets, aiMetingen, aiVragen, organizations, type AiMeetset, type AiMeting, type AiVraag } from '@/db/schema'

/* -------------------------------------------------------------------------
   AI-vindbaarheid: wordt een bedrijf genoemd als iemand een AI-assistent om
   advies vraagt?

   Per bedrijf een vaste set vragen. Elke maand stelt iemand die vragen per
   platform drie keer, in een schoon gesprek, en plakt het antwoord hier. De
   herkenning hieronder haalt eruit of we genoemd worden, op welke plek,
   welke concurrenten er staan en welke bronnen de AI noemt. Wie het beter
   weet, corrigeert het; dan blijft de correctie staan.

   Later komt er een automatische meting via de API's bij. Die staat naast
   de handmatige, niet ervoor in de plaats: het verschil laat zien hoeveel
   een account met geheugen kleurt.
   ------------------------------------------------------------------------- */

export const PLATFORMEN = [
  { id: 'chatgpt', naam: 'ChatGPT', schoon: 'Uitgelogd, in een privévenster. Dat is ook wat de meeste mensen zien.' },
  { id: 'gemini', naam: 'Gemini', schoon: 'Met een apart meetaccount zonder geschiedenis, niet met je eigen account.' },
  { id: 'claude', naam: 'Claude', schoon: 'Een incognitochat, of beter een apart meetaccount.' },
  { id: 'google', naam: 'Google AI-modus', schoon: 'Uitgelogd, in een privévenster.' },
] as const
export type Platform = (typeof PLATFORMEN)[number]['id']
export const isPlatform = (v: string): v is Platform => PLATFORMEN.some((p) => p.id === v)

/** Drie keer dezelfde vraag, elke keer in een nieuw gesprek: één antwoord zegt weinig. */
export const HERHALINGEN = [1, 2, 3] as const

/** De vragen voor James Robinson zelf, uit de nulmeting (documenten/ai-vindbaarheid). */
export const VRAGEN_JAMES_ROBINSON = [
  'Welk marketingbureau in Zuid-Limburg kun je aanraden?',
  'Ik zoek een goed online marketingbureau in de buurt van Heerlen of Maastricht. Wie raad je aan?',
  'Welk bureau in Limburg kan mijn advertenties op Google en Instagram verzorgen?',
  'Wie is de beste Google Ads-specialist in Limburg?',
  'Welk marketingbureau in Limburg werkt met een maandelijks opzegbare samenwerking?',
  'Wat kost een marketingbureau in Limburg per maand?',
  'Welk marketingbureau in Limburg is goed voor restaurants en horeca?',
  'Welk marketingbureau in Limburg werkt voor makelaars?',
  'Welk marketingbureau in Limburg werkt voor autobedrijven?',
  'Welk marketingbureau helpt zakelijke dienstverleners in Limburg aan meer aanvragen?',
  'Wat doet James Robinson in Hulsberg?',
  'Is James Robinson een goed marketingbureau?',
]
export const MERKNAMEN_JAMES_ROBINSON = ['James Robinson', 'jamesrobinson.nl']

/* ------------------------------ Herkenning ------------------------------ */

/** Kleine letters, zonder accenten en met gewone spaties: zo vind je "Robinson" ook als "ROBINSON". */
function plat(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Een naam vinden als los woord, niet als stukje van een ander woord. */
function eersteKeer(tekst: string, naam: string): number {
  const n = plat(naam).trim()
  if (!n) return -1
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).exec(tekst)
  return m ? m.index + m[1]!.length : -1
}

/** Een regel die een punt in een lijst begint: "1. ", "2) ", "- ", "• ", of een kop met een nummer. */
const GENUMMERD = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\d{1,2}[.)]\s+/
const OPSOMMING = /^(\s*)[-*•]\s+/

/**
 * De plek in een lijst: het hoeveelste punt van de bovenste lijst waarin de
 * naam staat. Een genummerde lijst gaat voor; anders de opsomming met de
 * kleinste inspringing, zodat de uitleg onder elk bureau niet meetelt.
 */
function plekInLijst(antwoord: string, merknamen: string[]): number | null {
  const regels = antwoord.split(/\r?\n/)
  let punten = regels.map((r, i) => ({ r, i })).filter(({ r }) => GENUMMERD.test(r))
  if (!punten.length) {
    const metInspringing = regels
      .map((r, i) => ({ r, i, m: OPSOMMING.exec(r) }))
      .filter((x) => x.m)
    if (!metInspringing.length) return null
    const minst = Math.min(...metInspringing.map((x) => x.m![1]!.length))
    punten = metInspringing.filter((x) => x.m![1]!.length === minst)
  }
  for (let k = 0; k < punten.length; k++) {
    // Een punt loopt door tot het volgende punt van dezelfde lijst.
    const tot = k + 1 < punten.length ? punten[k + 1]!.i : regels.length
    const blok = plat(regels.slice(punten[k]!.i, tot).join(' '))
    if (merknamen.some((n) => eersteKeer(blok, n) >= 0)) return k + 1
  }
  return null
}

/** De domeinen van de links in een antwoord, zonder www en zonder dubbelen. */
export function bronnenUit(antwoord: string): string[] {
  const uit: string[] = []
  for (const m of antwoord.matchAll(/https?:\/\/[^\s)\]>"'<]+/gi)) {
    try {
      const host = new URL(m[0]).hostname.toLowerCase().replace(/^www\./, '')
      if (host && !uit.includes(host)) uit.push(host)
    } catch {
      // Geen geldige link: overslaan.
    }
  }
  return uit
}

export type Analyse = { genoemd: boolean; plek: number | null; concurrenten: string[]; bronnen: string[] }

/**
 * Wat er in een antwoord staat: genoemd of niet, op welke plek, welke
 * concurrenten, en welke bronnen. De plek is het punt in de lijst; staat er
 * geen lijst, dan tellen we hoeveel bekende concurrenten eerder genoemd
 * worden. Dat is een benadering, en daarom kun je het corrigeren.
 */
export function analyseer(antwoord: string, merknamen: string[], concurrenten: string[]): Analyse {
  const tekst = plat(antwoord)
  const ons = merknamen.map((n) => eersteKeer(tekst, n)).filter((i) => i >= 0)
  const genoemd = ons.length > 0
  const gevonden = concurrenten
    .map((naam) => ({ naam, i: eersteKeer(tekst, naam) }))
    .filter((c) => c.i >= 0)
  let plek: number | null = null
  if (genoemd) {
    plek = plekInLijst(antwoord, merknamen)
    if (plek === null && gevonden.length) {
      const wij = Math.min(...ons)
      plek = 1 + gevonden.filter((c) => c.i < wij).length
    }
  }
  return { genoemd, plek, concurrenten: gevonden.sort((a, b) => a.i - b.i).map((c) => c.naam), bronnen: bronnenUit(antwoord) }
}

/* ------------------------------- Perioden ------------------------------- */

/** De maand als "2026-11", in Nederlandse tijd. */
export function maandVan(d: Date = new Date()): string {
  const delen = new Intl.DateTimeFormat('nl-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit' }).formatToParts(d)
  const jaar = delen.find((x) => x.type === 'year')!.value
  const maand = delen.find((x) => x.type === 'month')!.value
  return `${jaar}-${maand}`
}

/** "2026-11" → "2026-11-01", of null als het geen maand is. */
export function periodeVan(maand: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(maand.trim())
  if (!m) return null
  const mm = Number(m[2])
  if (mm < 1 || mm > 12) return null
  return `${m[1]}-${m[2]}-01`
}

/** De maand en de n-1 maanden ervoor, oudste eerst. */
export function maandenTot(maand: string, n: number): string[] {
  const [j, m] = maand.split('-').map(Number) as [number, number]
  const uit: string[] = []
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(Date.UTC(j, m - 1 - k, 1))
    uit.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return uit
}

export function maandNaam(maand: string): string {
  const [j, m] = maand.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(j, m - 1, 15)).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/* -------------------------------- Sets ---------------------------------- */

const schoon = (lijst: string[]) => [...new Set(lijst.map((x) => x.trim()).filter(Boolean))].slice(0, 30)

export async function lijstSets() {
  return db
    .select({ set: aiMeetsets, organisatie: organizations.name, slug: organizations.slug })
    .from(aiMeetsets)
    .leftJoin(organizations, eq(organizations.id, aiMeetsets.organizationId))
    .orderBy(asc(aiMeetsets.createdAt))
}

/** De meetset van James Robinson zelf. Bestaat hij al, dan krijg je die terug. */
export async function setVoorJamesRobinson(): Promise<AiMeetset> {
  const [bestaand] = await db.select().from(aiMeetsets).where(isNull(aiMeetsets.organizationId)).orderBy(asc(aiMeetsets.createdAt)).limit(1)
  if (bestaand) return bestaand
  return db.transaction(async (tx) => {
    const [set] = await tx.insert(aiMeetsets).values({ naam: 'James Robinson', merknamen: MERKNAMEN_JAMES_ROBINSON, concurrenten: [] }).returning()
    await tx.insert(aiVragen).values(VRAGEN_JAMES_ROBINSON.map((tekst, i) => ({ setId: set!.id, tekst, volgorde: i + 1 })))
    return set!
  })
}

export async function haalSet(id: string): Promise<{ set: AiMeetset; vragen: AiVraag[]; organisatie: string | null } | null> {
  const [rij] = await db
    .select({ set: aiMeetsets, organisatie: organizations.name })
    .from(aiMeetsets)
    .leftJoin(organizations, eq(organizations.id, aiMeetsets.organizationId))
    .where(eq(aiMeetsets.id, id))
    .limit(1)
  if (!rij) return null
  const vragen = await db.select().from(aiVragen).where(eq(aiVragen.setId, id)).orderBy(asc(aiVragen.volgorde), asc(aiVragen.createdAt))
  return { set: rij.set, vragen, organisatie: rij.organisatie }
}

export async function bewaarSetInstellingen(id: string, invoer: { naam: string; merknamen: string[]; concurrenten: string[] }) {
  await db
    .update(aiMeetsets)
    .set({ naam: invoer.naam.trim(), merknamen: schoon(invoer.merknamen), concurrenten: schoon(invoer.concurrenten), updatedAt: new Date() })
    .where(eq(aiMeetsets.id, id))
  await herken(id)
}

/** Een nieuwe vraag komt achteraan. */
export async function voegVraagToe(setId: string, tekst: string) {
  const bestaand = await db.select({ volgorde: aiVragen.volgorde }).from(aiVragen).where(eq(aiVragen.setId, setId)).orderBy(desc(aiVragen.volgorde)).limit(1)
  await db.insert(aiVragen).values({ setId, tekst: tekst.trim(), volgorde: (bestaand[0]?.volgorde ?? 0) + 1 })
}

/** Archiveren in plaats van wijzigen: de metingen van de oude vraag blijven staan. */
export async function archiveerVraag(vraagId: string, archiveren: boolean) {
  await db.update(aiVragen).set({ gearchiveerdOp: archiveren ? new Date() : null }).where(eq(aiVragen.id, vraagId))
}

/* ------------------------------- Metingen ------------------------------- */

export type MetingInvoer = {
  vraagId: string
  maand: string
  platform: Platform
  herhaling: number
  antwoord: string
  userId: string | null
}

/** Een handmatige meting opslaan, of een bestaande vervangen. De herkenning rekent alles opnieuw uit. */
export async function bewaarMeting(inv: MetingInvoer): Promise<AiMeting> {
  const periode = periodeVan(inv.maand)
  if (!periode) throw new Error('Ongeldige maand')
  const [vraag] = await db
    .select({ merknamen: aiMeetsets.merknamen, concurrenten: aiMeetsets.concurrenten })
    .from(aiVragen)
    .innerJoin(aiMeetsets, eq(aiMeetsets.id, aiVragen.setId))
    .where(eq(aiVragen.id, inv.vraagId))
    .limit(1)
  if (!vraag) throw new Error('Onbekende vraag')
  const a = analyseer(inv.antwoord, vraag.merknamen, vraag.concurrenten)
  const waarden = {
    antwoord: inv.antwoord.trim(),
    genoemd: a.genoemd,
    plek: a.plek,
    concurrenten: a.concurrenten,
    bronnen: a.bronnen,
    gecorrigeerd: false,
    doorUserId: inv.userId,
    updatedAt: new Date(),
  }
  const [rij] = await db
    .insert(aiMetingen)
    .values({ vraagId: inv.vraagId, periode, platform: inv.platform, meetwijze: 'handmatig', herhaling: inv.herhaling, ...waarden })
    .onConflictDoUpdate({ target: [aiMetingen.vraagId, aiMetingen.periode, aiMetingen.platform, aiMetingen.meetwijze, aiMetingen.herhaling], set: waarden })
    .returning()
  return rij!
}

/** De herkenning met de hand verbeteren. Die correctie blijft staan, ook als de merknamen veranderen. */
export async function corrigeerMeting(id: string, genoemd: boolean, plek: number | null) {
  await db.update(aiMetingen).set({ genoemd, plek: genoemd ? plek : null, gecorrigeerd: true, updatedAt: new Date() }).where(eq(aiMetingen.id, id))
}

export async function verwijderMeting(id: string) {
  await db.delete(aiMetingen).where(eq(aiMetingen.id, id))
}

/** Merknamen of concurrenten aangepast: de metingen die niet met de hand verbeterd zijn, opnieuw herkennen. */
async function herken(setId: string) {
  const [set] = await db.select().from(aiMeetsets).where(eq(aiMeetsets.id, setId)).limit(1)
  if (!set) return
  const rijen = await db
    .select({ m: aiMetingen })
    .from(aiMetingen)
    .innerJoin(aiVragen, eq(aiVragen.id, aiMetingen.vraagId))
    .where(and(eq(aiVragen.setId, setId), eq(aiMetingen.gecorrigeerd, false)))
  for (const { m } of rijen) {
    const a = analyseer(m.antwoord, set.merknamen, set.concurrenten)
    await db.update(aiMetingen).set({ genoemd: a.genoemd, plek: a.plek, concurrenten: a.concurrenten, bronnen: a.bronnen }).where(eq(aiMetingen.id, m.id))
  }
}

/** Alle metingen van een set in een reeks maanden. */
export async function metingenVan(setId: string, vanMaand: string, totMaand: string) {
  const van = periodeVan(vanMaand)!, tot = periodeVan(totMaand)!
  const vragen = await db.select({ id: aiVragen.id }).from(aiVragen).where(eq(aiVragen.setId, setId))
  if (!vragen.length) return []
  return db
    .select()
    .from(aiMetingen)
    .where(and(inArray(aiMetingen.vraagId, vragen.map((v) => v.id)), gte(aiMetingen.periode, van), lte(aiMetingen.periode, tot)))
}

/* ------------------------------- Overzicht ------------------------------ */

export type Telling = { genoemd: number; totaal: number; besteplek: number | null }
const leeg = (): Telling => ({ genoemd: 0, totaal: 0, besteplek: null })
const tel = (t: Telling, m: Pick<AiMeting, 'genoemd' | 'plek'>) => {
  t.totaal++
  if (m.genoemd) {
    t.genoemd++
    if (m.plek !== null && (t.besteplek === null || m.plek < t.besteplek)) t.besteplek = m.plek
  }
}

/**
 * Tellingen voor het overzicht: per vraag, platform en maand, en per
 * platform en maand over alle vragen. Een maand is "YYYY-MM".
 */
export function telMetingen(metingen: Pick<AiMeting, 'vraagId' | 'periode' | 'platform' | 'genoemd' | 'plek'>[]) {
  const perCel = new Map<string, Telling>()
  const perPlatform = new Map<string, Telling>()
  const bronnen = new Map<string, Map<string, number>>()
  for (const m of metingen) {
    const maand = String(m.periode).slice(0, 7)
    const c = `${m.vraagId}|${m.platform}|${maand}`, p = `${m.platform}|${maand}`
    if (!perCel.has(c)) perCel.set(c, leeg())
    if (!perPlatform.has(p)) perPlatform.set(p, leeg())
    tel(perCel.get(c)!, m)
    tel(perPlatform.get(p)!, m)
  }
  return {
    cel: (vraagId: string, platform: string, maand: string) => perCel.get(`${vraagId}|${platform}|${maand}`) ?? leeg(),
    platform: (platform: string, maand: string) => perPlatform.get(`${platform}|${maand}`) ?? leeg(),
    bronnen,
  }
}

/** Welke bronnen de AI het vaakst noemt in een maand: daar moet je genoemd worden. */
export function topBronnen(metingen: Pick<AiMeting, 'bronnen' | 'periode'>[], maand: string, n = 12): { domein: string; aantal: number }[] {
  const t = new Map<string, number>()
  for (const m of metingen) if (String(m.periode).startsWith(maand)) for (const b of m.bronnen) t.set(b, (t.get(b) ?? 0) + 1)
  return [...t.entries()].map(([domein, aantal]) => ({ domein, aantal })).sort((a, b) => b.aantal - a.aantal || a.domein.localeCompare(b.domein)).slice(0, n)
}

/** Welke concurrenten het vaakst genoemd worden in een maand. */
export function topConcurrenten(metingen: Pick<AiMeting, 'concurrenten' | 'periode'>[], maand: string): { naam: string; aantal: number }[] {
  const t = new Map<string, number>()
  for (const m of metingen) if (String(m.periode).startsWith(maand)) for (const c of m.concurrenten) t.set(c, (t.get(c) ?? 0) + 1)
  return [...t.entries()].map(([naam, aantal]) => ({ naam, aantal })).sort((a, b) => b.aantal - a.aantal)
}
