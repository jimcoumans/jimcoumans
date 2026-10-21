import Anthropic from '@anthropic-ai/sdk'
import type { BetaContentBlockParam, BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  brandColors,
  brandFiles,
  brandFonts,
  brandVoices,
  campaigns,
  checkRegels,
  klantAfspraken,
  klantMerken,
  organizationAudiences,
  organizations,
  uitingChecks,
  users,
} from '@/db/schema'
import type { CheckBestand, CheckRegel, KlantAfspraak, KlantMerk, OrganizationAudience, UitingCheck } from '@/db/schema'
import { randomUUID } from 'node:crypto'
import { bewaar, haal, wis } from './bestandsopslag'
import { getProfiel } from './klantprofiel'
import { herkenFeedbackBestand } from './campagne-verwerken'
import { formatDateInput } from './dates'

/* -------------------------------------------------------------------------
   De uitingen-check.

   Elke uiting die we maken, gaat hier doorheen voordat de klant hem ziet.
   Een post, advertentie, nieuwsbrief, flyer of poster, als afbeelding, pdf,
   link of tekst. De AI legt hem naast alles wat we weten:

   - onze algemene regels (check_regels);
   - de afspraken met deze klant (klant_afspraken), ook het maatwerk dat
     anders alleen in iemands hoofd of in een mail staat;
   - het merk: welk logo hoort erop, de tone of voice, kleuren en letters;
   - de doelgroep, met de aanspreekvorm en de stijlaccenten van die groep;
   - de campagnebriefing en de landingspagina: kloppen aanbod, prijzen en
     data met wat de bezoeker straks ziet;
   - spelling en grammatica.

   Wat eruit komt is een lijst bevindingen met per stuk waar het zit, wat er
   mis is en hoe het beter kan, plus een oordeel: groen, oranje of rood. Dat
   oordeel rekenen we zelf uit de bevindingen uit, zodat het altijd
   hetzelfde werkt en niet afhangt van hoe de AI zich voelt.

   De landingspagina en een uiting-als-link haalt de AI zelf op, met de
   web_fetch-tool van Anthropic. Zo haalt deze server nooit een adres op dat
   iemand intypte: geen deur naar het interne netwerk.

   Net als het verwerken van feedback duurt een check langer dan een gewone
   serverfunctie mag draaien. Het portaal zet hem klaar, een
   achtergrondfunctie voert hem uit: netlify/functions/uiting-check-background.mts.
   ------------------------------------------------------------------------- */

export class CheckError extends Error {}

export const MODEL = 'claude-opus-5-5'

/**
 * Zoveel checks per 24 uur, voor het hele portaal. Een rem op de kosten
 * naast de limiet in de Claude Console. Ruim boven wat het team per dag
 * maakt; raakt het team hem, dan klopt er iets niet (of groeien we).
 */
export const MAX_CHECKS_PER_DAG = 150

/** Netlify neemt 6 MB per verzoek aan; de browser verkleint afbeeldingen eerst. */
export const MAX_TOTAAL_BYTES = 4.5 * 1024 * 1024
export const MAX_BESTANDEN = 10

/** Langer dan dit "bezig" is vastgelopen: een achtergrondfunctie stopt na 15 minuten. */
const VASTGELOPEN_NA_MS = 16 * 60 * 1000

/** Zoveel referentielogo's gaan mee; meer helpt de AI niet en kost alleen. */
const MAX_LOGOS = 8

export const SOORTEN = [
  { value: 'post', label: 'Post' },
  { value: 'advertentie', label: 'Advertentie' },
  { value: 'story', label: 'Story of reel' },
  { value: 'nieuwsbrief', label: 'Nieuwsbrief' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'poster', label: 'Poster' },
  { value: 'banner', label: 'Banner' },
  { value: 'landingspagina', label: 'Landingspagina' },
  { value: 'overig', label: 'Iets anders' },
] as const
export type Soort = (typeof SOORTEN)[number]['value']
export const SOORT_LABELS = Object.fromEntries(SOORTEN.map((s) => [s.value, s.label])) as Record<Soort, string>

export const CATEGORIEEN = ['merk', 'afspraak', 'toon', 'doelgroep', 'taal', 'feiten', 'huisstijl', 'overig'] as const
export type Categorie = (typeof CATEGORIEEN)[number]
export const CATEGORIE_LABELS: Record<Categorie, string> = {
  merk: 'Merk en logo',
  afspraak: 'Afspraak met de klant',
  toon: 'Tone of voice',
  doelgroep: 'Doelgroep',
  taal: 'Spelling en grammatica',
  feiten: 'Feiten en landingspagina',
  huisstijl: 'Huisstijl',
  overig: 'Overig',
}

export const ERNST = ['blokkerend', 'belangrijk', 'suggestie'] as const
export type Ernst = (typeof ERNST)[number]
export const ERNST_LABELS: Record<Ernst, string> = {
  blokkerend: 'Moet eerst opgelost',
  belangrijk: 'Belangrijk',
  suggestie: 'Suggestie',
}

export const OORDEEL_LABELS: Record<NonNullable<UitingCheck['oordeel']>, string> = {
  groen: 'Klaar voor de klant',
  oranje: 'Bekijk de punten',
  rood: 'Niet naar de klant',
}

/* ------------------------------ Vorm -------------------------------------- */

/*
 * Wat de AI terugstuurt. Alles is tekst: de SDK maakt van een enum een
 * omschrijving, dus categorie, ernst en uitkomst controleren we zelf.
 */
const AiUitkomst = z.object({
  samenvatting: z.string(),
  bevindingen: z.array(
    z.object({
      categorie: z.string(),
      ernst: z.string(),
      /** Waar in de uiting: "kop", "slide 2", "onderwerpregel", "caption, tweede zin". */
      waar: z.string(),
      /** De tekst zoals hij er nu staat, letterlijk. Leeg als het niet om tekst gaat. */
      citaat: z.string(),
      probleem: z.string(),
      voorstel: z.string(),
      /** De code van de regel of afspraak (R1, A3), of leeg. */
      regel: z.string(),
    }),
  ),
  /** Elke regel en afspraak die van toepassing was, met de uitkomst. */
  getoetst: z.array(z.object({ regel: z.string(), uitkomst: z.string(), toelichting: z.string() })),
  /** Wat niet te controleren was, en waarom. */
  nietGecontroleerd: z.array(z.string()),
  /** De tekst van de uiting met alleen de fouten verbeterd. Leeg als er niets te verbeteren is. */
  verbeterdeTekst: z.string(),
  landingspagina: z.object({ opgehaald: z.boolean(), wat: z.string() }),
})
type AiUitkomst = z.infer<typeof AiUitkomst>

export type Bevinding = {
  categorie: Categorie
  ernst: Ernst
  waar: string
  citaat: string
  probleem: string
  voorstel: string
  regel: string
}

export type Toets = { regel: string; uitkomst: 'ok' | 'fout' | 'onbekend' | 'nvt'; toelichting: string }

/** Wat we bewaren. De regels gaan mee als momentopname: wie een regel later wijzigt, verandert de geschiedenis niet. */
export type Uitkomst = {
  samenvatting: string
  bevindingen: Bevinding[]
  getoetst: Toets[]
  nietGecontroleerd: string[]
  verbeterdeTekst: string
  landingspagina: { opgehaald: boolean; wat: string } | null
  regels: { code: string; tekst: string }[]
}

const isCategorie = (s: string): s is Categorie => (CATEGORIEEN as readonly string[]).includes(s)
const isErnst = (s: string): s is Ernst => (ERNST as readonly string[]).includes(s)

/** De ruwe uitkomst van de AI naar onze vorm, met wat niet past naar iets veiligs. */
export function leesUitkomst(ai: AiUitkomst, regels: { code: string; tekst: string }[], metLp: boolean): Uitkomst {
  const bevindingen = ai.bevindingen
    .filter((b) => b.probleem.trim() !== '')
    .map((b) => {
      const categorie = b.categorie.trim().toLowerCase()
      const ernst = b.ernst.trim().toLowerCase()
      return {
        categorie: isCategorie(categorie) ? categorie : 'overig',
        // Een onbekende ernst telt als belangrijk: liever een keer te veel kijken dan een fout doorlaten.
        ernst: isErnst(ernst) ? ernst : 'belangrijk',
        waar: b.waar.trim(),
        citaat: b.citaat.trim(),
        probleem: b.probleem.trim(),
        voorstel: b.voorstel.trim(),
        regel: b.regel.trim().toUpperCase(),
      } satisfies Bevinding
    })
  const UITKOMSTEN = ['ok', 'fout', 'onbekend', 'nvt'] as const
  const getoetst = ai.getoetst.map((t) => {
    const u = t.uitkomst.trim().toLowerCase()
    return {
      regel: t.regel.trim().toUpperCase(),
      uitkomst: (UITKOMSTEN as readonly string[]).includes(u) ? (u as Toets['uitkomst']) : 'onbekend',
      toelichting: t.toelichting.trim(),
    }
  })
  return {
    samenvatting: ai.samenvatting.trim(),
    bevindingen,
    getoetst,
    nietGecontroleerd: ai.nietGecontroleerd.map((s) => s.trim()).filter(Boolean),
    verbeterdeTekst: ai.verbeterdeTekst.trim(),
    landingspagina: metLp ? { opgehaald: ai.landingspagina.opgehaald, wat: ai.landingspagina.wat.trim() } : null,
    regels,
  }
}

/**
 * Het oordeel, uit de bevindingen. Rood: er zit iets in dat niet naar de
 * klant mag. Oranje: er is iets te bekijken, of iets kon niet gecontroleerd
 * worden (een landingspagina die niet opende is geen groen licht). Groen:
 * alles is gecontroleerd en in orde.
 */
export function bepaalOordeel(u: Pick<Uitkomst, 'bevindingen' | 'nietGecontroleerd' | 'landingspagina'>): 'groen' | 'oranje' | 'rood' {
  if (u.bevindingen.some((b) => b.ernst === 'blokkerend')) return 'rood'
  if (u.bevindingen.some((b) => b.ernst === 'belangrijk')) return 'oranje'
  if (u.nietGecontroleerd.length > 0) return 'oranje'
  if (u.landingspagina && !u.landingspagina.opgehaald) return 'oranje'
  return 'groen'
}

/* ------------------------------ Regels en afspraken ----------------------- */

export async function listRegels(alleenActief = false): Promise<CheckRegel[]> {
  return db
    .select()
    .from(checkRegels)
    .where(alleenActief ? eq(checkRegels.actief, true) : undefined)
    .orderBy(asc(checkRegels.categorie), asc(checkRegels.createdAt))
}

function categorieUit(s: string, standaard: Categorie): Categorie {
  return isCategorie(s) ? s : standaard
}

export async function maakRegel(input: { titel: string; tekst: string; categorie: string }, userId: string): Promise<void> {
  if (!input.titel.trim() || !input.tekst.trim()) throw new CheckError('Geef de regel een titel en een omschrijving.')
  await db.insert(checkRegels).values({
    titel: input.titel.trim(),
    tekst: input.tekst.trim(),
    categorie: categorieUit(input.categorie, 'overig'),
    updatedByUserId: userId,
  })
}

export async function wijzigRegel(id: string, input: { titel: string; tekst: string; categorie: string; actief: boolean }, userId: string): Promise<void> {
  if (!input.titel.trim() || !input.tekst.trim()) throw new CheckError('Geef de regel een titel en een omschrijving.')
  await db
    .update(checkRegels)
    .set({
      titel: input.titel.trim(),
      tekst: input.tekst.trim(),
      categorie: categorieUit(input.categorie, 'overig'),
      actief: input.actief,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(eq(checkRegels.id, id))
}

export async function verwijderRegel(id: string): Promise<void> {
  await db.delete(checkRegels).where(eq(checkRegels.id, id))
}

export type KlantInstellingen = {
  merken: (KlantMerk & { logos: { id: string; title: string }[] })[]
  logos: { id: string; title: string; merkId: string | null; logoVariant: string | null }[]
  afspraken: KlantAfspraak[]
  doelgroepen: OrganizationAudience[]
}

/** Alles wat per klant voor de check is vastgelegd. */
export async function getKlantInstellingen(organizationId: string): Promise<KlantInstellingen> {
  const [merken, logos, afspraken, doelgroepen] = await Promise.all([
    db.select().from(klantMerken).where(eq(klantMerken.organizationId, organizationId)).orderBy(asc(klantMerken.naam)),
    db
      .select({ id: brandFiles.id, title: brandFiles.title, merkId: brandFiles.merkId, logoVariant: brandFiles.logoVariant })
      .from(brandFiles)
      .where(and(eq(brandFiles.organizationId, organizationId), eq(brandFiles.kind, 'logo')))
      .orderBy(asc(brandFiles.title)),
    db.select().from(klantAfspraken).where(eq(klantAfspraken.organizationId, organizationId)).orderBy(desc(klantAfspraken.actief), asc(klantAfspraken.createdAt)),
    db.select().from(organizationAudiences).where(eq(organizationAudiences.organizationId, organizationId)).orderBy(asc(organizationAudiences.name)),
  ])
  return {
    merken: merken.map((m) => ({ ...m, logos: logos.filter((l) => l.merkId === m.id).map(({ id, title }) => ({ id, title })) })),
    logos,
    afspraken,
    doelgroepen,
  }
}

/** Hoort dit ding bij deze klant? Een formulier is een publiek endpoint; een id uit een andere klant mag niet door. */
async function hoortBij<T extends { organizationId: string }>(rij: T | undefined, organizationId: string, wat: string): Promise<T> {
  if (!rij || rij.organizationId !== organizationId) throw new CheckError(`Deze ${wat} hoort niet bij deze klant.`)
  return rij
}

async function merkVan(id: string | null, organizationId: string): Promise<string | null> {
  if (!id) return null
  const [m] = await db.select().from(klantMerken).where(eq(klantMerken.id, id)).limit(1)
  return (await hoortBij(m, organizationId, 'merk')).id
}

async function doelgroepVan(id: string | null, organizationId: string): Promise<string | null> {
  if (!id) return null
  const [d] = await db.select().from(organizationAudiences).where(eq(organizationAudiences.id, id)).limit(1)
  return (await hoortBij(d, organizationId, 'doelgroep')).id
}

export async function maakMerk(organizationId: string, input: { naam: string; omschrijving: string | null }): Promise<void> {
  if (!input.naam.trim()) throw new CheckError('Geef het merk een naam.')
  await db.insert(klantMerken).values({ organizationId, naam: input.naam.trim(), omschrijving: input.omschrijving })
}

export async function wijzigMerk(id: string, organizationId: string, input: { naam: string; omschrijving: string | null; logoIds: string[] }): Promise<void> {
  if (!input.naam.trim()) throw new CheckError('Geef het merk een naam.')
  await merkVan(id, organizationId)
  await db.transaction(async (tx) => {
    await tx.update(klantMerken).set({ naam: input.naam.trim(), omschrijving: input.omschrijving }).where(eq(klantMerken.id, id))
    // Eerst alle logo's van dit merk los, dan de gekozen eraan: zo is uitvinken ook opslaan.
    await tx.update(brandFiles).set({ merkId: null }).where(and(eq(brandFiles.organizationId, organizationId), eq(brandFiles.merkId, id)))
    if (input.logoIds.length > 0) {
      await tx
        .update(brandFiles)
        .set({ merkId: id })
        .where(and(eq(brandFiles.organizationId, organizationId), eq(brandFiles.kind, 'logo'), inArray(brandFiles.id, input.logoIds)))
    }
  })
}

export async function verwijderMerk(id: string, organizationId: string): Promise<void> {
  await merkVan(id, organizationId)
  await db.delete(klantMerken).where(eq(klantMerken.id, id))
}

export type AfspraakInvoer = {
  tekst: string
  categorie: string
  merkId: string | null
  doelgroepId: string | null
  kanaal: string | null
  soort: string | null
}

async function afspraakWaarden(organizationId: string, input: AfspraakInvoer) {
  if (!input.tekst.trim()) throw new CheckError('Schrijf de afspraak op.')
  const soort = input.soort && SOORTEN.some((s) => s.value === input.soort) ? input.soort : null
  return {
    tekst: input.tekst.trim(),
    categorie: categorieUit(input.categorie, 'afspraak'),
    merkId: await merkVan(input.merkId, organizationId),
    doelgroepId: await doelgroepVan(input.doelgroepId, organizationId),
    kanaal: input.kanaal?.trim() || null,
    soort,
  }
}

export async function maakAfspraak(organizationId: string, input: AfspraakInvoer, userId: string): Promise<void> {
  await db.insert(klantAfspraken).values({ organizationId, ...(await afspraakWaarden(organizationId, input)), createdByUserId: userId })
}

export async function wijzigAfspraak(id: string, organizationId: string, input: AfspraakInvoer & { actief: boolean }): Promise<void> {
  const [a] = await db.select().from(klantAfspraken).where(eq(klantAfspraken.id, id)).limit(1)
  await hoortBij(a, organizationId, 'afspraak')
  await db
    .update(klantAfspraken)
    .set({ ...(await afspraakWaarden(organizationId, input)), actief: input.actief })
    .where(eq(klantAfspraken.id, id))
}

export async function verwijderAfspraak(id: string, organizationId: string): Promise<void> {
  const [a] = await db.select().from(klantAfspraken).where(eq(klantAfspraken.id, id)).limit(1)
  await hoortBij(a, organizationId, 'afspraak')
  await db.delete(klantAfspraken).where(eq(klantAfspraken.id, id))
}

export async function zetDoelgroepStijl(
  id: string,
  organizationId: string,
  input: { address: 'je' | 'u' | 'wisselend' | null; styleNotes: string | null },
): Promise<void> {
  await doelgroepVan(id, organizationId)
  await db.update(organizationAudiences).set(input).where(eq(organizationAudiences.id, id))
}

/**
 * Geldt deze afspraak voor deze uiting, volgens wat er is ingevuld? Een leeg
 * veld op de afspraak betekent: voor alles. Het kanaal is vrije tekst, dus
 * "Instagram" past op "Instagram feed" en andersom.
 */
export function afspraakGeldt(
  a: Pick<KlantAfspraak, 'merkId' | 'doelgroepId' | 'kanaal' | 'soort'>,
  c: Pick<UitingCheck, 'merkId' | 'kanaalMerkId' | 'doelgroepId' | 'kanaal' | 'soort'>,
): boolean {
  if (a.merkId && a.merkId !== c.merkId && a.merkId !== c.kanaalMerkId) return false
  if (a.doelgroepId && a.doelgroepId !== c.doelgroepId) return false
  if (a.soort && a.soort !== c.soort) return false
  if (a.kanaal) {
    const k = a.kanaal.trim().toLowerCase()
    const ck = (c.kanaal ?? '').trim().toLowerCase()
    if (!ck || !(ck.includes(k) || k.includes(ck))) return false
  }
  return true
}

/* ------------------------------ Aanmaken ---------------------------------- */

function isVastgelopen(r: Pick<UitingCheck, 'status' | 'createdAt' | 'gestartOp'>, nu = Date.now()): boolean {
  if (r.status !== 'wacht' && r.status !== 'bezig') return false
  return nu - (r.gestartOp ?? r.createdAt).getTime() > VASTGELOPEN_NA_MS
}

/** Een link zoals iemand hem intypt, of null. Alleen http(s): de AI haalt hem op, niet wij. */
export function leesUrl(invoer: string | null | undefined): string | null {
  const s = (invoer ?? '').trim()
  if (!s) return null
  let url: URL
  try {
    // Alleen zonder protocol zetten we er https voor; ftp:// of iets anders wordt hieronder geweigerd.
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`)
  } catch {
    throw new CheckError(`"${s.slice(0, 80)}" is geen geldige link.`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new CheckError('Alleen links die met http of https beginnen.')
  if (url.username || url.password) throw new CheckError('Een link met inloggegevens erin nemen we niet aan.')
  return url.toString()
}

/** Een afbeelding als link: die geven we als beeld aan de AI, een pagina als iets om op te halen. */
export function isAfbeeldingUrl(url: string): boolean {
  try {
    return /\.(png|jpe?g|webp|gif)$/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}

export type CheckInvoer = {
  organizationId: string
  titel: string
  soort: string
  kanaal: string | null
  merkId: string | null
  kanaalMerkId: string | null
  doelgroepId: string | null
  campaignId: string | null
  doel: string | null
  tekst: string | null
  uitingUrl: string | null
  lpUrl: string | null
  toelichting: string | null
  bestanden: { naam: string; data: Buffer }[]
  /** Een nieuwe versie van een eerdere check. Het formulier is dan al ingevuld met die check; alleen de bestanden blijven als je geen nieuwe kiest. */
  vorigeCheckId: string | null
  userId: string
}

/**
 * Een check klaarzetten. De achtergrondfunctie pakt hem daarna op. Een
 * nieuwe versie zonder nieuwe bestanden houdt de bestanden van de vorige: zo
 * kun je na het verbeteren van alleen de tekst opnieuw checken.
 */
export async function maakCheck(input: CheckInvoer): Promise<UitingCheck> {
  let vorige: UitingCheck | null = null
  if (input.vorigeCheckId) {
    const [v] = await db.select().from(uitingChecks).where(eq(uitingChecks.id, input.vorigeCheckId)).limit(1)
    vorige = await hoortBij(v, input.organizationId, 'check')
  }
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, input.organizationId)).limit(1)
  if (!org) throw new CheckError('Deze klant bestaat niet (meer).')

  const soort = SOORTEN.find((s) => s.value === (input.soort || vorige?.soort))?.value
  if (!soort) throw new CheckError('Kies wat voor uiting het is.')
  const titel = input.titel.trim() || vorige?.titel || ''
  if (!titel) throw new CheckError('Geef de uiting een naam, bijvoorbeeld "Kerstbrunch · post 2".')

  const bestanden = input.bestanden.filter((b) => b.data.length > 0)
  if (bestanden.length > MAX_BESTANDEN) throw new CheckError(`Hooguit ${MAX_BESTANDEN} bestanden per check.`)
  const totaal = bestanden.reduce((n, b) => n + b.data.length, 0)
  if (totaal > MAX_TOTAAL_BYTES) throw new CheckError('De bestanden zijn samen groter dan 4,5 MB. Maak ze kleiner of check ze apart.')
  const soorten = bestanden.map((b) => {
    const s = herkenFeedbackBestand(b.data)
    if (!s || s.blok === 'tekst') throw new CheckError(`"${b.naam}" kunnen we niet lezen. Gebruik een afbeelding (png, jpg, webp) of een pdf.`)
    return s
  })

  const tekst = input.tekst?.trim() || null
  const uitingUrl = leesUrl(input.uitingUrl)
  const lpUrl = leesUrl(input.lpUrl)
  // Een nieuwe versie zonder nieuwe bestanden houdt die van de vorige, tenzij de uiting nu een andere link is.
  const overgenomen = vorige && bestanden.length === 0 && uitingUrl === vorige.uitingUrl ? vorige.bestanden : []
  if (!tekst && !uitingUrl && bestanden.length === 0 && overgenomen.length === 0) {
    throw new CheckError('Voeg de uiting toe: een afbeelding of pdf, een link, of de tekst.')
  }

  const merkId = await merkVan(input.merkId, input.organizationId)
  const kanaalMerkId = await merkVan(input.kanaalMerkId, input.organizationId)
  const doelgroepId = await doelgroepVan(input.doelgroepId, input.organizationId)
  let campaignId = input.campaignId
  if (campaignId) {
    const [c] = await db.select({ organizationId: campaigns.organizationId }).from(campaigns).where(eq(campaigns.id, campaignId)).limit(1)
    if (!c || c.organizationId !== input.organizationId) campaignId = null
  }

  const [vandaag] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(uitingChecks)
    .where(gte(uitingChecks.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)))
  if ((vandaag?.n ?? 0) >= MAX_CHECKS_PER_DAG) {
    throw new CheckError(
      `Het portaal deed de afgelopen 24 uur al ${MAX_CHECKS_PER_DAG} checks. Dat is de grens die we hebben ingesteld om de kosten te bewaken. Vraag een beheerder om hem op te hogen.`,
    )
  }

  // Eerst de bestanden, onder het id dat de rij zo krijgt; lukt het aanmaken daarna niet, dan gaan ze weer weg.
  const id = randomUUID()
  const bewaard: CheckBestand[] = []
  try {
    for (const [i, b] of bestanden.entries()) {
      const veiligeNaam = b.naam.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'uiting'
      const sleutel = `uitingen/${input.organizationId}/${id}/${i + 1}-${veiligeNaam}`
      await bewaar(sleutel, b.data, soorten[i]!.mime)
      bewaard.push({ naam: b.naam, type: soorten[i]!.mime, sleutel, bytes: b.data.length })
    }
    const [rij] = await db
      .insert(uitingChecks)
      .values({
        id,
        organizationId: input.organizationId,
        titel,
        soort,
        kanaal: input.kanaal?.trim() || null,
        merkId,
        kanaalMerkId,
        doelgroepId,
        campaignId,
        doel: input.doel?.trim() || null,
        tekst,
        uitingUrl,
        lpUrl,
        toelichting: input.toelichting?.trim() || null,
        bestanden: bewaard.length > 0 ? bewaard : overgenomen,
        versie: vorige ? vorige.versie + 1 : 1,
        vorigeCheckId: vorige?.id ?? null,
        createdByUserId: input.userId,
      })
      .returning()
    if (!rij) throw new CheckError('De check kon niet worden aangemaakt.')
    return rij
  } catch (error) {
    await Promise.all(bewaard.map((b) => wis(b.sleutel).catch(() => {})))
    throw error
  }
}

/* ------------------------------ De opdracht ------------------------------- */

export function systeemPrompt(vandaag: Date): string {
  return `Je bent de eindcontrole bij James Robinson, een marketingbureau in Zuid-Limburg. Elke uiting die het team maakt (post, advertentie, story, nieuwsbrief, flyer, poster, banner, landingspagina) komt langs jou voordat de klant hem ziet. Jij vindt de fouten, zodat de klant ze niet hoeft te vinden.

Je krijgt: de uiting (afbeeldingen, pdf, een link en/of de tekst), wat het is en voor wie, de regels die altijd gelden (codes R1, R2, ...), de afspraken met deze klant (codes A1, A2, ...), het merk met de referentielogo's, de tone of voice, de doelgroep en eventueel de campagnebriefing en de landingspagina.

Wat je controleert:
1. Merk en logo. Staat het logo van het juiste merk erop, in een geschikte variant voor de achtergrond, leesbaar en niet vervormd? Vergelijk met de referentielogo's. Een klant kan meer merken hebben: let op welk merk de inhoud is en op wiens kanaal het verschijnt, en wat de afspraken daarover zeggen.
2. De afspraken met de klant en de algemene regels. Toets elke regel en elke afspraak die van toepassing is. Afspraken die volgens de invoer niet van toepassing zijn, krijg je ter informatie: lijkt de uiting er toch onder te vallen (bijvoorbeeld omdat het verkeerde merk is ingevuld), meld dat dan.
3. Tone of voice. Klopt de toon met het merk: aanspreekvorm (je of u), woorden die wel en niet, de manier van schrijven?
4. Doelgroep. Spreekt de uiting de opgegeven doelgroep aan, met de aanspreekvorm en stijlaccenten van die groep? Een zakelijke uiting in de toon van de particuliere doelgroep (of andersom) is een fout. Past de uiting bij het doel?
5. Spelling en grammatica. Lees elke zin, ook kleine tekst in beeld, knoppen, voetteksten, onderwerpregel en preheader. Nederlandse spelling volgens het Groene Boekje: d/t, samenstellingen, aaneenschrijven, hoofdletters, leestekens, apostroffen, dubbele spaties.
6. Feiten. Prijzen, data, dagen, tijden, aantallen, adressen, voorwaarden en het aanbod: kloppen ze onderling, met de campagnebriefing en met de landingspagina? Rekent iets niet (een dag die niet bij de datum past, "vanaf € 25" tegenover € 29 op de pagina), dan is dat een fout.
7. Huisstijl. Kleuren, lettertypen en opmaak van het merk, voor zover je dat uit het beeld kunt zien.

De landingspagina en een uiting als link: haal ze op met web_fetch. Lukt het ophalen niet, zet dat dan in nietGecontroleerd en geef landingspagina.opgehaald = false. Verzin nooit wat er op een pagina staat.

Ernst:
- blokkerend: mag zo niet naar de klant. Verkeerd merk of logo, een geschonden afspraak of regel, de verkeerde doelgroep of aanspreekvorm, een feit dat niet klopt of afwijkt van de landingspagina, een spel- of grammaticafout.
- belangrijk: moet iemand naar kijken. Toon die afwijkt van het merk, een onduidelijke of ontbrekende call-to-action, afwijkende huisstijl, iets dat waarschijnlijk niet klopt maar je niet zeker weet.
- suggestie: kan beter, maar is geen fout.

Hoe je schrijft:
- Eén bevinding per probleem. "waar" zegt precies waar (kop, slide 3, knop, onderwerpregel, caption tweede zin). "citaat" is de tekst zoals hij er nu staat, letterlijk. "probleem" zegt in één of twee zinnen wat er mis is en waarom. "voorstel" geeft de verbeterde tekst of wat er moet gebeuren. "regel" is de code van de regel of afspraak (R2, A1) of leeg.
- categorie is een van: merk, afspraak, toon, doelgroep, taal, feiten, huisstijl, overig. ernst is een van: blokkerend, belangrijk, suggestie.
- Wees precies en eerlijk. Meld alleen echte problemen; smaak is geen fout. Twijfel je of je een letter in een afbeelding goed leest, meld het dan als belangrijk met "controleer" erbij in plaats van het als fout te brengen.
- getoetst: elke regel en elke afspraak die van toepassing is, met uitkomst ok, fout, onbekend (niet te controleren) of nvt, en een korte toelichting.
- nietGecontroleerd: wat je niet kon controleren en waarom (een pagina die niet opende, een afbeelding die te klein is om te lezen, geen referentielogo). Leeg als alles gecontroleerd is.
- verbeterdeTekst: de meegegeven tekst van de uiting (caption, advertentietekst) met alleen de fouten verbeterd, verder letterlijk gelijk. Leeg als er geen tekst is meegegeven of als er niets te verbeteren valt.
- samenvatting: één of twee zinnen voor de maker: kan dit naar de klant, en zo niet, wat eerst.
- Kort, concreet, Nederlands. Geen marketingtaal.

Vandaag is ${formatDateInput(vandaag)}.`
}

/** De context voor één check: regels, afspraken, merk, doelgroep, campagne. Gaat als tekst naar de AI. */
export async function bouwContext(c: UitingCheck): Promise<{ tekst: string; regels: { code: string; tekst: string }[]; logos: { titel: string; sleutel: string }[] }> {
  const [[org], regels, afspraken, merken, logos, [stem], kleuren, fonts, profiel, doelgroepRijen, campagneRijen] = await Promise.all([
    db.select().from(organizations).where(eq(organizations.id, c.organizationId)).limit(1),
    listRegels(true),
    db.select().from(klantAfspraken).where(and(eq(klantAfspraken.organizationId, c.organizationId), eq(klantAfspraken.actief, true))).orderBy(asc(klantAfspraken.createdAt)),
    db.select().from(klantMerken).where(eq(klantMerken.organizationId, c.organizationId)).orderBy(asc(klantMerken.naam)),
    db
      .select()
      .from(brandFiles)
      .where(and(eq(brandFiles.organizationId, c.organizationId), eq(brandFiles.kind, 'logo')))
      .orderBy(asc(brandFiles.createdAt)),
    db.select().from(brandVoices).where(eq(brandVoices.organizationId, c.organizationId)).limit(1),
    db.select().from(brandColors).where(eq(brandColors.organizationId, c.organizationId)).orderBy(asc(brandColors.position)),
    db.select().from(brandFonts).where(eq(brandFonts.organizationId, c.organizationId)),
    getProfiel(c.organizationId),
    db.select().from(organizationAudiences).where(eq(organizationAudiences.organizationId, c.organizationId)),
    c.campaignId ? db.select().from(campaigns).where(eq(campaigns.id, c.campaignId)).limit(1) : Promise.resolve([]),
  ])
  if (!org) throw new CheckError('Deze klant bestaat niet meer.')

  const merkNaam = (id: string | null) => (id ? (merken.find((m) => m.id === id)?.naam ?? 'onbekend merk') : merken.length > 0 ? `${org.name} (hoofdmerk)` : org.name)
  const doelgroep = doelgroepRijen.find((d) => d.id === c.doelgroepId) ?? null
  const campagne = campagneRijen[0] ?? null

  const codes: { code: string; tekst: string }[] = []
  const regelRegels = regels.map((r, i) => {
    const code = `R${i + 1}`
    codes.push({ code, tekst: `${r.titel}: ${r.tekst}` })
    return `- ${code} (${CATEGORIE_LABELS[r.categorie]}) ${r.titel}: ${r.tekst}`
  })
  const scope = (a: KlantAfspraak) =>
    [
      a.merkId ? `merk ${merkNaam(a.merkId)}` : null,
      a.doelgroepId ? `doelgroep ${doelgroepRijen.find((d) => d.id === a.doelgroepId)?.name ?? 'onbekend'}` : null,
      a.kanaal ? `kanaal ${a.kanaal}` : null,
      a.soort ? `soort ${SOORT_LABELS[a.soort as Soort] ?? a.soort}` : null,
    ].filter(Boolean)
  const geldend: string[] = []
  const overig: string[] = []
  afspraken.forEach((a, i) => {
    const code = `A${i + 1}`
    codes.push({ code, tekst: a.tekst })
    const s = scope(a)
    const regel = `- ${code} (${CATEGORIE_LABELS[a.categorie]}${s.length ? `; geldt voor ${s.join(', ')}` : ''}) ${a.tekst}`
    ;(afspraakGeldt(a, c) ? geldend : overig).push(regel)
  })

  // Een svg kan de AI niet zien; met een miniatuur (webp) wel.
  const bruikbaar = logos.filter((l) => l.contentType !== 'image/svg+xml' || l.hasThumbnail)
  // Eerst de logo's van de merken die op deze uiting spelen, dan de rest.
  const spelend = new Set([c.merkId, c.kanaalMerkId])
  const gekozen = [...bruikbaar.filter((l) => spelend.has(l.merkId)), ...bruikbaar.filter((l) => !spelend.has(l.merkId))].slice(0, MAX_LOGOS)

  const veld = (label: string, w: string | null | undefined) => (w && w.trim() ? `${label}: ${w.trim()}` : null)
  const blok = (kop: string, regels: (string | null)[]) => {
    const r = regels.filter((x): x is string => !!x)
    return r.length ? `## ${kop}\n${r.join('\n')}` : null
  }

  const delen = [
    `# Klant: ${org.name}`,
    blok('De uiting', [
      veld('Naam', c.titel),
      veld('Soort', SOORT_LABELS[c.soort as Soort] ?? c.soort),
      veld('Kanaal', c.kanaal),
      merken.length > 0 ? `Merk van de inhoud: ${merkNaam(c.merkId)}` : null,
      merken.length > 0 ? `Verschijnt op het kanaal van: ${merkNaam(c.kanaalMerkId)}` : null,
      `Doelgroep: ${doelgroep ? doelgroep.name : 'niet opgegeven'}`,
      veld('Doel', c.doel),
      veld('Extra toelichting van de maker', c.toelichting),
      c.versie > 1 ? `Dit is versie ${c.versie}.` : null,
    ]),
    blok('Algemene regels (gelden voor elke klant)', regelRegels.length ? regelRegels : ['Geen.']),
    blok('Afspraken met deze klant die van toepassing zijn', geldend.length ? geldend : ['Geen.']),
    overig.length ? blok('Andere afspraken met deze klant (volgens de invoer niet van toepassing; ter informatie)', overig) : null,
    merken.length > 0
      ? blok(
          'Merken van deze klant',
          [`- ${org.name} (hoofdmerk)`, ...merken.map((m) => `- ${m.naam}${m.omschrijving ? `: ${m.omschrijving}` : ''}`)],
        )
      : null,
    blok('Tone of voice van het merk', [
      stem?.address ? `Aanspreekvorm: ${stem.address}` : null,
      veld('Karakter', stem?.character),
      veld('Woorden die we wel gebruiken', stem?.wordsYes),
      veld('Woorden die we niet gebruiken', stem?.wordsNo),
      veld('Goede voorbeelden', stem?.goodExamples),
      veld('Slechte voorbeelden', stem?.badExamples),
      veld('Vaste call-to-actions', stem?.ctas),
      veld('Toon (klantprofiel)', profiel?.brandTone),
    ]),
    doelgroep
      ? blok(`Doelgroep: ${doelgroep.name}`, [
          veld('Wie', doelgroep.description),
          doelgroep.address ? `Aanspreekvorm voor deze groep: ${doelgroep.address}` : null,
          veld('Stijlaccenten voor deze groep', doelgroep.styleNotes),
        ])
      : null,
    doelgroepRijen.filter((d) => d.id !== c.doelgroepId && (d.styleNotes || d.address)).length > 0
      ? blok(
          'Andere doelgroepen van deze klant (om verwarring te herkennen)',
          doelgroepRijen
            .filter((d) => d.id !== c.doelgroepId && (d.styleNotes || d.address))
            .map((d) => `- ${d.name}${d.address ? ` (${d.address})` : ''}${d.styleNotes ? `: ${d.styleNotes}` : ''}`),
        )
      : null,
    blok('Huisstijl', [
      kleuren.length ? `Kleuren: ${kleuren.map((k) => `${k.name} ${k.hex} (${k.role})`).join(', ')}` : null,
      fonts.length ? `Lettertypen: ${fonts.map((f) => `${f.name} (${f.role})`).join(', ')}` : null,
      veld('Stijl (klantprofiel)', profiel?.brandStyle),
      veld('Beeld (klantprofiel)', profiel?.brandImagery),
    ]),
    blok('Wat de klant gevoelig vindt of niet wil', [veld('Gevoelig', profiel?.sensitivities), veld('Niet gewenst', profiel?.notWanted), veld('Afspraken', profiel?.clientCommitments)]),
    campagne
      ? blok(`Campagnebriefing: ${campagne.title}`, [
          veld('Samenvatting', campagne.summary),
          veld('Doel', campagne.goalSentence),
          veld('Wat we verkopen', campagne.offerWhat),
          veld('Kernboodschap', campagne.offerMessage),
          veld('Waarom nu', campagne.offerWhyNow),
          veld('Wat we niet beloven', campagne.offerNotPromised),
          veld('Regio', campagne.region),
          campagne.startOn || campagne.endOn ? `Looptijd: ${campagne.startOn ? formatDateInput(campagne.startOn) : '?'} tot ${campagne.endOn ? formatDateInput(campagne.endOn) : '?'}` : null,
          veld('Afspraken', campagne.agreementNotes),
        ])
      : null,
    blok('Links', [veld('De uiting als link', c.uitingUrl), veld('Landingspagina', c.lpUrl)]),
  ].filter(Boolean)

  return {
    tekst: delen.join('\n\n'),
    regels: codes,
    logos: gekozen.map((l) => ({
      titel: `${l.title}${merken.length > 0 ? ` (merk: ${merkNaam(l.merkId)})` : ''}${l.logoVariant ? `, ${l.logoVariant}` : ''}${l.logoBackground ? `, voor ${l.logoBackground}e achtergrond` : ''}`,
      sleutel: l.hasThumbnail ? `${l.storageKey}.klein` : l.storageKey,
    })),
  }
}

/* ------------------------------ Het model --------------------------------- */

export type Vraag = { systeem: string; inhoud: BetaContentBlockParam[]; magOphalen: boolean }
export type Antwoord = { data: unknown; invoerTokens: number; uitvoerTokens: number }
/** Wat het model teruggeeft, nog niet gecontroleerd. In de tests een nep-model. */
export type Model = (vraag: Vraag) => Promise<Antwoord>

/** Hoe vaak we een gepauzeerde beurt (de AI haalt nog pagina's op) laten doorgaan. */
const MAX_RONDES = 4

/**
 * Claude, met gestructureerde uitvoer en, als er een link is, web_fetch om
 * de pagina op te halen. De server van Anthropic haalt op, niet de onze.
 * Server-side fallback staat aan: weigert het model, dan neemt de API het
 * over met een ander model in plaats van dat de check stopt.
 */
export const claude: Model = async ({ systeem, inhoud, magOphalen }) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new CheckError('De AI-sleutel ontbreekt. Zet ANTHROPIC_API_KEY in de omgevingsvariabelen van Netlify.')
  }
  const client = new Anthropic()
  const berichten: BetaMessageParam[] = [{ role: 'user', content: inhoud }]
  let invoerTokens = 0
  let uitvoerTokens = 0
  for (let ronde = 0; ronde < MAX_RONDES; ronde++) {
    const bericht = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: betaZodOutputFormat(AiUitkomst) },
        ...(magOphalen ? { tools: [{ type: 'web_fetch_20260209' as const, name: 'web_fetch' as const, max_uses: 4 }] } : {}),
        system: systeem,
        messages: berichten,
      })
      .finalMessage()
    invoerTokens += bericht.usage.input_tokens + (bericht.usage.cache_read_input_tokens ?? 0) + (bericht.usage.cache_creation_input_tokens ?? 0)
    uitvoerTokens += bericht.usage.output_tokens

    if (bericht.stop_reason === 'pause_turn') {
      // De AI is nog aan het ophalen: de beurt teruggeven, dan gaat hij verder waar hij was.
      berichten.push({ role: 'assistant', content: bericht.content })
      continue
    }
    if (bericht.stop_reason === 'refusal') throw new CheckError('De AI wilde deze uiting niet beoordelen. Controleer hem met de hand.')
    if (bericht.stop_reason === 'max_tokens') throw new CheckError('Het antwoord van de AI was te lang en is afgebroken. Probeer het opnieuw, of check de onderdelen apart.')

    // Alleen de tekst na het laatste opgehaalde resultaat: daarvoor kan de AI hebben gezegd wat hij gaat ophalen.
    const laatsteTool = bericht.content.findLastIndex((b) => b.type !== 'text' && b.type !== 'thinking' && b.type !== 'redacted_thinking')
    const tekst = bericht.content
      .slice(laatsteTool + 1)
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
    try {
      return { data: JSON.parse(tekst), invoerTokens, uitvoerTokens }
    } catch {
      throw new CheckError('Het antwoord van de AI had niet de verwachte vorm. Probeer het opnieuw.')
    }
  }
  throw new CheckError('De AI bleef pagina’s ophalen en kwam niet tot een oordeel. Probeer het opnieuw.')
}

/* ------------------------------ Uitvoeren --------------------------------- */

function bestandsblok(b: CheckBestand, data: Buffer): BetaContentBlockParam {
  if (b.type === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: data.toString('base64') }, title: b.naam }
  }
  return {
    type: 'image',
    source: { type: 'base64', media_type: b.type as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: data.toString('base64') },
  }
}

/**
 * Een check uitvoeren. Alleen een check die wacht, wordt opgepakt, en maar
 * één keer: dan is het niet erg dat de achtergrondfunctie voor iedereen aan
 * te roepen is.
 */
export async function voerCheckUit(id: string, model: Model = claude, vandaag = new Date()): Promise<UitingCheck | null> {
  const [opgepakt] = await db
    .update(uitingChecks)
    .set({ status: 'bezig', gestartOp: new Date() })
    .where(and(eq(uitingChecks.id, id), eq(uitingChecks.status, 'wacht')))
    .returning()
  if (!opgepakt) return null

  try {
    const context = await bouwContext(opgepakt)
    const inhoud: BetaContentBlockParam[] = [{ type: 'text', text: context.tekst }]

    if (context.logos.length > 0) {
      inhoud.push({ type: 'text', text: 'De referentielogo’s uit de merkkluis:' })
      for (const logo of context.logos) {
        const bestand = await haal(logo.sleutel)
        if (!bestand) continue
        const type = bestand.contentType
        if (!/^image\/(png|jpeg|webp|gif)$/.test(type)) continue
        inhoud.push({ type: 'text', text: logo.titel })
        inhoud.push({ type: 'image', source: { type: 'base64', media_type: type as 'image/png', data: bestand.data.toString('base64') } })
      }
    } else {
      inhoud.push({ type: 'text', text: 'Er staan geen logo’s in de merkkluis van deze klant. Controleer het logo zo goed als je kunt en zet in nietGecontroleerd dat er geen referentie was.' })
    }

    if (opgepakt.vorigeCheckId) {
      const [vorige] = await db.select({ uitkomst: uitingChecks.uitkomst, versie: uitingChecks.versie }).from(uitingChecks).where(eq(uitingChecks.id, opgepakt.vorigeCheckId)).limit(1)
      const v = vorige?.uitkomst as Uitkomst | null | undefined
      if (v && v.bevindingen.length > 0) {
        inhoud.push({
          type: 'text',
          text: `Bij versie ${vorige!.versie} vond je dit. Controleer of het is opgelost, en zoek daarnaast opnieuw naar alles:\n${v.bevindingen.map((b) => `- [${b.ernst}] ${b.waar}: ${b.probleem}`).join('\n')}`,
        })
      }
    }

    inhoud.push({ type: 'text', text: '# De uiting' })
    for (const b of opgepakt.bestanden) {
      const bestand = await haal(b.sleutel)
      if (!bestand) throw new CheckError(`Het bestand "${b.naam}" is niet meer te vinden. Upload het opnieuw.`)
      inhoud.push({ type: 'text', text: `Bestand: ${b.naam}` })
      inhoud.push(bestandsblok(b, bestand.data))
    }
    if (opgepakt.uitingUrl) {
      if (isAfbeeldingUrl(opgepakt.uitingUrl)) inhoud.push({ type: 'image', source: { type: 'url', url: opgepakt.uitingUrl } })
      else inhoud.push({ type: 'text', text: `De uiting staat op ${opgepakt.uitingUrl}. Haal hem op met web_fetch.` })
    }
    if (opgepakt.tekst) inhoud.push({ type: 'text', text: `De tekst bij de uiting:\n\n${opgepakt.tekst}` })
    if (opgepakt.lpUrl) inhoud.push({ type: 'text', text: `De landingspagina: ${opgepakt.lpUrl}. Haal hem op met web_fetch en vergelijk.` })
    inhoud.push({ type: 'text', text: 'Controleer de uiting en geef je bevindingen.' })

    const magOphalen = !!opgepakt.lpUrl || (!!opgepakt.uitingUrl && !isAfbeeldingUrl(opgepakt.uitingUrl))
    const antwoord = await model({ systeem: systeemPrompt(vandaag), inhoud, magOphalen })
    const gelezen = AiUitkomst.safeParse(antwoord.data)
    if (!gelezen.success) throw new CheckError('Het antwoord van de AI had niet de verwachte vorm. Probeer het opnieuw.')

    const uitkomst = leesUitkomst(gelezen.data, context.regels, !!opgepakt.lpUrl)
    const [klaar] = await db
      .update(uitingChecks)
      .set({
        status: 'klaar',
        oordeel: bepaalOordeel(uitkomst),
        uitkomst,
        invoerTokens: antwoord.invoerTokens,
        uitvoerTokens: antwoord.uitvoerTokens,
        klaarOp: new Date(),
      })
      .where(eq(uitingChecks.id, id))
      .returning()
    return klaar ?? null
  } catch (error) {
    const melding =
      error instanceof CheckError
        ? error.message
        : error instanceof Anthropic.APIError
          ? `De AI gaf een fout (${error.status ?? 'onbekend'}). Probeer het over een paar minuten opnieuw.`
          : 'Er ging iets mis bij het checken. Kijk in de logs van Netlify.'
    if (!(error instanceof CheckError)) console.error('[uitingen-check] mislukt:', error)
    const [mis] = await db.update(uitingChecks).set({ status: 'fout', fout: melding, klaarOp: new Date() }).where(eq(uitingChecks.id, id)).returning()
    return mis ?? null
  }
}

/** Vastgelopen checks van een klant als mislukt markeren, zodat het overzicht klopt. */
export async function markeerVastgelopen(organizationId?: string): Promise<void> {
  const rijen = await db
    .select()
    .from(uitingChecks)
    .where(and(inArray(uitingChecks.status, ['wacht', 'bezig']), organizationId ? eq(uitingChecks.organizationId, organizationId) : undefined))
  const vast = rijen.filter((r) => isVastgelopen(r)).map((r) => r.id)
  if (vast.length === 0) return
  await db
    .update(uitingChecks)
    .set({ status: 'fout', fout: 'Vastgelopen: de check is nooit afgerond. Probeer het opnieuw.', klaarOp: new Date() })
    .where(inArray(uitingChecks.id, vast))
}

/** Een check die mislukte opnieuw klaarzetten, met dezelfde invoer. */
export async function probeerOpnieuw(id: string): Promise<void> {
  const [r] = await db.select().from(uitingChecks).where(eq(uitingChecks.id, id)).limit(1)
  if (!r) throw new CheckError('Deze check bestaat niet meer.')
  if (r.status !== 'fout') throw new CheckError('Alleen een mislukte check kun je opnieuw starten.')
  await db.update(uitingChecks).set({ status: 'wacht', fout: null, gestartOp: null, klaarOp: null }).where(eq(uitingChecks.id, id))
}

/* ------------------------------ De poort ---------------------------------- */

/**
 * Vrijgeven voor de klant. Groen mag zo. Oranje of rood mag alleen met een
 * reden: soms weet de maker iets wat de check niet weet (de klant vroeg er
 * zelf om), maar dan staat dat erbij en is het een bewuste keuze. Alleen de
 * nieuwste versie kan vrij: een oude versie naar de klant sturen is precies
 * de fout die we willen voorkomen.
 */
export async function geefVrij(id: string, userId: string, reden: string | null): Promise<void> {
  const [r] = await db.select().from(uitingChecks).where(eq(uitingChecks.id, id)).limit(1)
  if (!r) throw new CheckError('Deze check bestaat niet meer.')
  if (r.status !== 'klaar' || !r.oordeel) throw new CheckError('Vrijgeven kan pas als de check klaar is.')
  if (r.vrijgegevenOp) throw new CheckError('Deze versie is al vrijgegeven.')
  const [nieuwer] = await db.select({ id: uitingChecks.id }).from(uitingChecks).where(eq(uitingChecks.vorigeCheckId, id)).limit(1)
  if (nieuwer) throw new CheckError('Er is al een nieuwere versie. Geef die vrij.')
  const toelichting = reden?.trim() || null
  if (r.oordeel !== 'groen' && (!toelichting || toelichting.length < 10)) {
    throw new CheckError('De check is niet groen. Schrijf op waarom de uiting toch naar de klant mag.')
  }
  await db
    .update(uitingChecks)
    .set({ vrijgegevenOp: new Date(), vrijgegevenDoorUserId: userId, vrijgaveReden: toelichting })
    .where(and(eq(uitingChecks.id, id), sql`${uitingChecks.vrijgegevenOp} IS NULL`))
}

/* ------------------------------ Lezen ------------------------------------- */

export type CheckRij = UitingCheck & { klant: string; slug: string; door: string | null; vastgelopen: boolean }

export async function listChecks(filter: { organizationId?: string; limiet?: number } = {}, nu = Date.now()): Promise<CheckRij[]> {
  const rijen = await db
    .select({ check: uitingChecks, klant: organizations.name, slug: organizations.slug, door: users.name, email: users.email })
    .from(uitingChecks)
    .innerJoin(organizations, eq(organizations.id, uitingChecks.organizationId))
    .leftJoin(users, eq(users.id, uitingChecks.createdByUserId))
    .where(filter.organizationId ? eq(uitingChecks.organizationId, filter.organizationId) : undefined)
    .orderBy(desc(uitingChecks.createdAt))
    .limit(filter.limiet ?? 100)
  return rijen.map((r) => ({ ...r.check, klant: r.klant, slug: r.slug, door: r.door ?? r.email ?? null, vastgelopen: isVastgelopen(r.check, nu) }))
}

export type CheckDetail = CheckRij & {
  merk: string | null
  kanaalMerk: string | null
  doelgroep: string | null
  campagne: { id: string; title: string } | null
  vrijgegevenDoor: string | null
  versies: { id: string; versie: number; oordeel: UitingCheck['oordeel']; status: UitingCheck['status']; createdAt: Date }[]
  nieuwste: boolean
}

export async function getCheck(id: string): Promise<CheckDetail | null> {
  const [r] = await db
    .select({ check: uitingChecks, klant: organizations.name, slug: organizations.slug, door: users.name, email: users.email })
    .from(uitingChecks)
    .innerJoin(organizations, eq(organizations.id, uitingChecks.organizationId))
    .leftJoin(users, eq(users.id, uitingChecks.createdByUserId))
    .where(eq(uitingChecks.id, id))
    .limit(1)
  if (!r) return null
  const c = r.check
  const merkIds = [c.merkId, c.kanaalMerkId].filter((x): x is string => !!x)
  const [merken, doelgroep, campagne, vrijgever] = await Promise.all([
    merkIds.length ? db.select().from(klantMerken).where(inArray(klantMerken.id, merkIds)) : Promise.resolve([]),
    c.doelgroepId ? db.select({ name: organizationAudiences.name }).from(organizationAudiences).where(eq(organizationAudiences.id, c.doelgroepId)).limit(1) : Promise.resolve([]),
    c.campaignId ? db.select({ id: campaigns.id, title: campaigns.title }).from(campaigns).where(eq(campaigns.id, c.campaignId)).limit(1) : Promise.resolve([]),
    c.vrijgegevenDoorUserId ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, c.vrijgegevenDoorUserId)).limit(1) : Promise.resolve([]),
  ])

  // De hele keten van versies: terug via vorigeCheckId, vooruit via wie naar deze verwijst.
  const keten: UitingCheck[] = [c]
  let terug = c.vorigeCheckId
  while (terug && keten.length < 50) {
    const [v] = await db.select().from(uitingChecks).where(eq(uitingChecks.id, terug)).limit(1)
    if (!v) break
    keten.unshift(v)
    terug = v.vorigeCheckId
  }
  let vooruit = c.id
  while (keten.length < 50) {
    const [v] = await db.select().from(uitingChecks).where(eq(uitingChecks.vorigeCheckId, vooruit)).limit(1)
    if (!v) break
    keten.push(v)
    vooruit = v.id
  }

  return {
    ...c,
    klant: r.klant,
    slug: r.slug,
    door: r.door ?? r.email ?? null,
    vastgelopen: isVastgelopen(c),
    merk: merken.find((m) => m.id === c.merkId)?.naam ?? null,
    kanaalMerk: merken.find((m) => m.id === c.kanaalMerkId)?.naam ?? null,
    doelgroep: doelgroep[0]?.name ?? null,
    campagne: campagne[0] ?? null,
    vrijgegevenDoor: vrijgever[0] ? (vrijgever[0].name ?? vrijgever[0].email) : null,
    versies: keten.map((v) => ({ id: v.id, versie: v.versie, oordeel: v.oordeel, status: v.status, createdAt: v.createdAt })),
    nieuwste: keten[keten.length - 1]!.id === c.id,
  }
}

export type KlantVoorCheck = {
  organisatie: { id: string; name: string; slug: string }
  instellingen: KlantInstellingen
  campagnes: { id: string; title: string }[]
  /** Waar de check op kan leunen, zodat de maker ziet of er genoeg is vastgelegd. */
  basis: { regels: number; afspraken: number; logos: number; stem: boolean }
}

export async function getKlantVoorCheck(by: { slug: string } | { id: string }): Promise<KlantVoorCheck | null> {
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where('slug' in by ? eq(organizations.slug, by.slug) : eq(organizations.id, by.id))
    .limit(1)
  if (!org) return null
  const [instellingen, campagnes, regels, [stem]] = await Promise.all([
    getKlantInstellingen(org.id),
    db
      .select({ id: campaigns.id, title: campaigns.title })
      .from(campaigns)
      .where(and(eq(campaigns.organizationId, org.id), sql`${campaigns.status} <> 'afgerond'`))
      .orderBy(desc(campaigns.createdAt)),
    listRegels(true),
    db.select({ character: brandVoices.character, address: brandVoices.address, goodExamples: brandVoices.goodExamples }).from(brandVoices).where(eq(brandVoices.organizationId, org.id)).limit(1),
  ])
  return {
    organisatie: org,
    instellingen,
    campagnes,
    basis: {
      regels: regels.length,
      afspraken: instellingen.afspraken.filter((a) => a.actief).length,
      logos: instellingen.logos.length,
      stem: !!(stem && (stem.address || stem.character?.trim() || stem.goodExamples?.trim())),
    },
  }
}

/** De klanten om uit te kiezen: lopende klanten eerst, dan wie nog in gesprek is. */
export async function listKlantenVoorCheck() {
  return db
    .select({ name: organizations.name, slug: organizations.slug, status: organizations.status })
    .from(organizations)
    .where(inArray(organizations.status, ['client', 'prospect']))
    .orderBy(asc(organizations.status), asc(organizations.name))
}
