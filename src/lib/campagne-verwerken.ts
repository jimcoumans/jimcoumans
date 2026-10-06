import Anthropic from '@anthropic-ai/sdk'
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import { db } from '@/db'
import { campaigns, campaignKpis, campaignChannels, campaignTimeline, campaignVerwerkingen } from '@/db/schema'
import type { Campaign, CampaignVerwerking } from '@/db/schema'
import { parseAmountToCents } from './money'
import { formatDateInput } from './dates'
import { bewaar, haal } from './bestandsopslag'
import {
  getCampagne,
  listTeam,
  momentopname,
  KANAAL_SOORTEN,
  TIJDLIJN_OMSCHRIJVINGEN,
  type CampagneVolledig,
} from './campagnes'

/* -------------------------------------------------------------------------
   Feedback van de klant verwerken in een briefing.

   De klant krijgt de briefing als voorstel en reageert met aanvullingen of
   wijzigingen: per mail, in WhatsApp, soms als pdf. Die zetten we niet met
   de hand over. Je plakt of uploadt de feedback, de AI schrijft er een
   nieuwe, schone briefing van en zet die terug in het portaal.

   Eén eindproduct, zonder sporen van eerdere versies: geen "gewijzigd",
   geen doorgestreepte regels. De specialist die ermee aan de slag gaat,
   moet lezen wat er nu geldt, niet hoe het zo gekomen is. Wat er veranderde
   en wat nog open staat, bewaren we apart, als interne notitie bij de
   campagne.

   Het verwerken duurt langer dan een gewone serverfunctie op Netlify mag
   draaien (26 seconden). Daarom maakt het portaal eerst een verwerking aan
   en pakt een achtergrondfunctie hem op: zie
   netlify/functions/briefing-verwerken-background.mts.
   ------------------------------------------------------------------------- */

export class VerwerkError extends Error {}

export const MODEL = 'claude-opus-5-5'

/** Netlify neemt 6 MB per verzoek aan; met wat ruimte voor de rest van het formulier. */
export const MAX_BESTAND_BYTES = 4.5 * 1024 * 1024

/** Langer dan dit "bezig" is vastgelopen: een achtergrondfunctie stopt na 15 minuten. */
const VASTGELOPEN_NA_MS = 16 * 60 * 1000

/* ------------------------------ Vorm -------------------------------------- */

/*
 * Wat de AI terugstuurt: de hele briefing, niet alleen wat er verandert.
 * Zo kan hij een veld dat door de feedback niet meer klopt (een samenvatting
 * die nog over kerstavond gaat) ook herschrijven.
 *
 * Alles is tekst, leeg is "". Geen null en geen getallen met een betekenis
 * voor "niet ingevuld": dat houdt het schema eenvoudig, en bedragen en data
 * lezen we op dezelfde manier als wat iemand in het formulier typt.
 */
const Uitkomst = z.object({
  samenvatting: z.string(),
  doel: z.object({
    doelInEenZin: z.string(),
    resultaatDefinitie: z.string(),
    /** "berekend" of "vast". Tekst en geen enum: de SDK zet een enum om naar een omschrijving, dus we controleren zelf. */
    budgetVorm: z.string(),
    vastBudget: z.string(),
    budgetToelichting: z.string(),
    kpiOpmerkingen: z.string(),
  }),
  aanbod: z.object({
    wat: z.string(),
    boodschap: z.string(),
    waaromNu: z.string(),
    nietBeloofd: z.string(),
  }),
  doelgroep: z.object({
    regio: z.string(),
    uitsluitingen: z.string(),
    toelichting: z.string(),
  }),
  planning: z.object({
    start: z.string(),
    einde: z.string(),
    toelichting: z.string(),
  }),
  afspraken: z.object({
    klantDoet: z.string(),
    overig: z.string(),
  }),
  achtergrond: z.object({
    eerder: z.string(),
    risicos: z.string(),
  }),
  kpis: z.array(z.object({ label: z.string(), datum: z.string(), aantal: z.number(), prijs: z.string() })),
  /** status: "bestaat" of "maken". */
  kanalen: z.array(z.object({ soort: z.string(), aantal: z.string(), toelichting: z.string(), status: z.string() })),
  tijdlijn: z.array(z.object({ id: z.string(), datum: z.string(), omschrijving: z.string(), wie: z.string() })),
  wijzigingen: z.array(z.string()),
  openVragen: z.array(z.string()),
})
export type Uitkomst = z.infer<typeof Uitkomst>

/** De velden van de campagne die een verwerking mag aanpassen, en dus ook terugzet. */
const VERWERKBARE_VELDEN = [
  'summary',
  'goalSentence',
  'resultDefinition',
  'budgetMode',
  'fixedBudgetCents',
  'budgetNote',
  'kpiNotes',
  'offerWhat',
  'offerMessage',
  'offerWhyNow',
  'offerNotPromised',
  'region',
  'exclusions',
  'audienceNotes',
  'startOn',
  'endOn',
  'planningNotes',
  'clientDoes',
  'agreementNotes',
  'backgroundPrevious',
  'backgroundRisks',
] as const satisfies readonly (keyof Campaign)[]

const ymd = (d: Date | null) => (d ? formatDateInput(d) : '')
const bedrag = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(2).replace('.', ','))

/** De briefing in dezelfde vorm als de uitkomst, zodat de AI hem kan herschrijven in plaats van opnieuw bedenken. */
export function briefingAlsInvoer(v: CampagneVolledig) {
  const c = v.campagne
  return {
    samenvatting: c.summary ?? '',
    doel: {
      doelInEenZin: c.goalSentence ?? '',
      resultaatDefinitie: c.resultDefinition ?? '',
      budgetVorm: c.budgetMode,
      vastBudget: bedrag(c.fixedBudgetCents),
      budgetToelichting: c.budgetNote ?? '',
      kpiOpmerkingen: c.kpiNotes ?? '',
    },
    aanbod: {
      wat: c.offerWhat ?? '',
      boodschap: c.offerMessage ?? '',
      waaromNu: c.offerWhyNow ?? '',
      nietBeloofd: c.offerNotPromised ?? '',
    },
    doelgroep: { regio: c.region ?? '', uitsluitingen: c.exclusions ?? '', toelichting: c.audienceNotes ?? '' },
    planning: { start: ymd(c.startOn), einde: ymd(c.endOn), toelichting: c.planningNotes ?? '' },
    afspraken: { klantDoet: c.clientDoes ?? '', overig: c.agreementNotes ?? '' },
    achtergrond: { eerder: c.backgroundPrevious ?? '', risicos: c.backgroundRisks ?? '' },
    kpis: v.kpis.map((k) => ({ label: k.label, datum: ymd(k.on), aantal: k.targetQuantity, prijs: bedrag(k.priceCents) })),
    kanalen: v.kanalen.map((k) => ({ soort: k.kind, aantal: k.quantity ?? '', toelichting: k.note ?? '', status: k.status })),
    tijdlijn: v.tijdlijn.map((t) => ({
      id: t.id,
      datum: ymd(t.dueOn),
      omschrijving: t.description,
      wie: t.assigneeName ?? t.assigneeLabel ?? '',
    })),
  }
}

/* ------------------------------ De opdracht ------------------------------- */

export function systeemPrompt(vandaag: Date, team: string[]): string {
  return `Je werkt bij James Robinson, een marketingbureau in Zuid-Limburg. Je verwerkt de reactie van een klant op een campagnebriefing.

Je krijgt de huidige briefing als JSON en de feedback van de klant (tekst, een pdf of een afbeelding). Je geeft de volledige nieuwe briefing terug in dezelfde vorm, plus twee interne lijsten.

Waar de briefing voor is: een specialist (campagne, content, techniek) pakt hem op en gaat ermee aan de slag zonder het voortraject te kennen. Hij moet in één keer lezen wat er nu geldt.

Regels voor de briefing zelf:
- Eén eindproduct. Schrijf alsof het altijd zo heeft gestaan. Nergens woorden die naar een eerdere versie of naar de feedback verwijzen: geen "nieuw", "aangepast", "gewijzigd", "update", "in plaats van", "voorheen", "zoals de klant aangaf", "op verzoek van", geen versienummers, geen doorgestreepte of gemarkeerde tekst.
- Wat de klant schrapt, verdwijnt overal: uit de tekstvelden, de samenvatting, de KPI's, de kanalen en de tijdlijn.
- Feiten van de klant gaan voor: prijzen, tijden, menu's, aantallen, links, wat wel en niet wordt aangeboden. Neem ze precies over, met de spelling van de klant.
- Ideeën van de klant over de marketing zelf (kanalen, aantal posts, timing van advertenties) zijn input, geen opdracht. Het vak ligt bij ons. Neem een idee op als het klopt; kan het niet meer (de datum is voorbij) of botst het met het advies in de briefing, kies dan wat verstandig is en zet het verschil in openVragen.
- Verzin niets. Geen cijfers, prijzen, data, namen of beloftes die niet in de briefing of de feedback staan. Is iets onduidelijk, laat het veld dan zoals het was en zet de vraag in openVragen.
- Velden waar de feedback niets over zegt, neem je letterlijk over.
- Kort, concreet, Nederlands. Geen marketingtaal. Houd de schrijfstijl van de bestaande briefing aan.
- De samenvatting is één of twee zinnen. Pas hem aan als de kern van de campagne verandert.

Vorm:
- Data als JJJJ-MM-DD, of "" als er geen is. Vandaag is ${formatDateInput(vandaag)}.
- Bedragen als tekst in euro's met een komma: "47,50". Leeg is "".
- KPI's: één regel per product of onderdeel dat verkocht moet worden, eventueel per datum. "aantal" is een heel getal groter dan nul; "prijs" is de prijs per stuk.
- Kanalen: "status" is "bestaat" of "maken". Gebruik bij voorkeur deze soorten: ${KANAAL_SOORTEN.join(', ')}.
- Tijdlijn: houd het "id" van een bestaande regel die blijft, ook als de datum of omschrijving verandert. Een nieuwe regel krijgt id "". Gebruik bij voorkeur deze omschrijvingen: ${TIJDLIJN_OMSCHRIJVINGEN.join(', ')}. "wie" is een naam uit het team (${team.join(', ') || 'geen'}) of een rol: Campagne, Content, Content en techniek, Campagne en techniek, Klant. Leeg mag.

De twee interne lijsten (die komen niet in de briefing, alleen als notitie in het portaal):
- wijzigingen: wat er in de briefing veranderde, één korte regel per wijziging, hooguit vijftien.
- openVragen: wat de marketingmanager nog moet navragen of beslissen. Bijvoorbeeld tegenstrijdigheden, ontbrekende gegevens, ideeën van de klant die we anders doen, of data die al voorbij zijn. Leeg als er niets open staat.`
}

/** Woorden die in een schone briefing niet thuishoren. Een vangnet, niet de regel zelf. */
const VERSIETAAL =
  /\((nieuw|gewijzigd|aangepast|update)\)|\bop verzoek van\b|\bzoals (de klant|jullie|u) (aangaf|aangeeft|vroeg|wil)|\bin plaats van (eerder|het eerdere)\b|\bwas eerder\b|\bvoorheen\b|\bversie \d/i

export function vindVersietaal(u: Uitkomst): string[] {
  const teksten: [string, string][] = [
    ['samenvatting', u.samenvatting],
    ...Object.entries(u.doel).map(([k, w]) => [`doel.${k}`, String(w)] as [string, string]),
    ...Object.entries(u.aanbod).map(([k, w]) => [`aanbod.${k}`, w] as [string, string]),
    ...Object.entries(u.doelgroep).map(([k, w]) => [`doelgroep.${k}`, w] as [string, string]),
    ...Object.entries(u.planning).map(([k, w]) => [`planning.${k}`, w] as [string, string]),
    ...Object.entries(u.afspraken).map(([k, w]) => [`afspraken.${k}`, w] as [string, string]),
    ...Object.entries(u.achtergrond).map(([k, w]) => [`achtergrond.${k}`, w] as [string, string]),
    ...u.kanalen.map((k, i) => [`kanaal ${i + 1}`, `${k.soort} ${k.toelichting}`] as [string, string]),
    ...u.tijdlijn.map((t, i) => [`tijdlijn ${i + 1}`, t.omschrijving] as [string, string]),
  ]
  return teksten.filter(([, w]) => VERSIETAAL.test(w)).map(([veld]) => veld)
}

/* ------------------------------ Het model --------------------------------- */

export type Vraag = { systeem: string; inhoud: BetaContentBlockParam[] }
/** Wat het model teruggeeft, nog niet gecontroleerd. In de tests een nep-model. */
export type Model = (vraag: Vraag) => Promise<unknown>

/**
 * Claude, met gestructureerde uitvoer zodat er altijd een briefing in de
 * juiste vorm terugkomt. Server-side fallback staat aan: weigert het model
 * een verzoek, dan neemt de API het over met een ander model in plaats van
 * dat de verwerking stopt.
 */
export const claude: Model = async ({ systeem, inhoud }) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new VerwerkError('De AI-sleutel ontbreekt. Zet ANTHROPIC_API_KEY in de omgevingsvariabelen van Netlify.')
  }
  const client = new Anthropic()
  const bericht = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: betaZodOutputFormat(Uitkomst) },
      system: systeem,
      messages: [{ role: 'user', content: inhoud }],
    })
    .finalMessage()

  if (bericht.stop_reason === 'refusal') throw new VerwerkError('De AI wilde deze feedback niet verwerken. Verwerk hem met de hand.')
  if (bericht.stop_reason === 'max_tokens') throw new VerwerkError('Het antwoord van de AI was te lang en is afgebroken. Probeer het met kortere feedback.')
  const tekst = bericht.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  try {
    return JSON.parse(tekst)
  } catch {
    throw new VerwerkError('Het antwoord van de AI was geen geldige briefing. Probeer het opnieuw.')
  }
}

/* ------------------------------ Bestanden --------------------------------- */

type Soort = { mime: string; blok: 'document' | 'afbeelding' | 'tekst' }

/** Wat een bestand echt is, op de inhoud en niet op de naam. */
export function herkenFeedbackBestand(data: Buffer): Soort | null {
  const begin = data.subarray(0, 12)
  const hex = begin.toString('hex')
  if (begin.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', blok: 'document' }
  if (hex.startsWith('89504e470d0a1a0a')) return { mime: 'image/png', blok: 'afbeelding' }
  if (hex.startsWith('ffd8ff')) return { mime: 'image/jpeg', blok: 'afbeelding' }
  if (begin.subarray(0, 4).toString('latin1') === 'GIF8') return { mime: 'image/gif', blok: 'afbeelding' }
  if (begin.subarray(0, 4).toString('latin1') === 'RIFF' && begin.subarray(8, 12).toString('latin1') === 'WEBP')
    return { mime: 'image/webp', blok: 'afbeelding' }
  // Platte tekst: een mail (.eml), .txt of .md. Geen nul-bytes en geldige UTF-8.
  const stuk = data.subarray(0, 64 * 1024)
  if (!stuk.includes(0)) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(stuk)
      return { mime: 'text/plain', blok: 'tekst' }
    } catch {
      return null
    }
  }
  return null
}

function bestandsblok(soort: Soort, data: Buffer, naam: string): BetaContentBlockParam {
  if (soort.blok === 'document') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: data.toString('base64') }, title: naam }
  }
  if (soort.blok === 'afbeelding') {
    return {
      type: 'image',
      source: { type: 'base64', media_type: soort.mime as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: data.toString('base64') },
    }
  }
  return { type: 'text', text: `Bestand "${naam}":\n\n${data.toString('utf8')}` }
}

/* ------------------------------ Aanmaken ---------------------------------- */

function isVastgelopen(r: Pick<CampaignVerwerking, 'status' | 'createdAt' | 'gestartOp'>, nu = Date.now()): boolean {
  if (r.status !== 'wacht' && r.status !== 'bezig') return false
  return nu - (r.gestartOp ?? r.createdAt).getTime() > VASTGELOPEN_NA_MS
}

/**
 * Een verwerking klaarzetten. De achtergrondfunctie pakt hem daarna op;
 * tot die tijd is er nog niets aan de briefing veranderd.
 */
export async function maakVerwerking(input: {
  campaignId: string
  invoer: string
  bestand: { naam: string; data: Buffer } | null
  userId: string
}): Promise<CampaignVerwerking> {
  const invoer = input.invoer.trim()
  const bestand = input.bestand && input.bestand.data.length > 0 ? input.bestand : null
  if (invoer === '' && !bestand) throw new VerwerkError('Plak de feedback of kies een bestand.')

  const [campagne] = await db.select({ id: campaigns.id, status: campaigns.status }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1)
  if (!campagne) throw new VerwerkError('Deze campagne bestaat niet meer.')
  if (campagne.status === 'afgerond') throw new VerwerkError('Een afgeronde campagne passen we niet meer aan.')

  const lopend = await db
    .select()
    .from(campaignVerwerkingen)
    .where(and(eq(campaignVerwerkingen.campaignId, input.campaignId), inArray(campaignVerwerkingen.status, ['wacht', 'bezig'])))
  if (lopend.some((r) => !isVastgelopen(r))) throw new VerwerkError('Er loopt al een verwerking voor deze briefing. Wacht tot die klaar is.')

  let soort: Soort | null = null
  if (bestand) {
    if (bestand.data.length > MAX_BESTAND_BYTES) throw new VerwerkError('Het bestand is groter dan 4,5 MB. Maak het kleiner of plak de tekst.')
    soort = herkenFeedbackBestand(bestand.data)
    if (!soort) {
      throw new VerwerkError('Dit soort bestand lezen we niet. Gebruik pdf, een afbeelding of tekst. Een Word-bestand: bewaar het eerst als pdf.')
    }
  }

  const [rij] = await db
    .insert(campaignVerwerkingen)
    .values({ campaignId: input.campaignId, invoer: invoer || null, createdByUserId: input.userId })
    .returning()
  if (!rij) throw new VerwerkError('De verwerking kon niet worden aangemaakt.')
  if (!bestand || !soort) return rij

  const veiligeNaam = bestand.naam.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'feedback'
  const sleutel = `briefing-feedback/${input.campaignId}/${rij.id}/${veiligeNaam}`
  try {
    await bewaar(sleutel, bestand.data, soort.mime)
  } catch (error) {
    await db.delete(campaignVerwerkingen).where(eq(campaignVerwerkingen.id, rij.id))
    throw error
  }
  const [metBestand] = await db
    .update(campaignVerwerkingen)
    .set({ bestandNaam: bestand.naam, bestandType: soort.mime, bestandSleutel: sleutel })
    .where(eq(campaignVerwerkingen.id, rij.id))
    .returning()
  return metBestand ?? rij
}

/* ------------------------------ Uitvoeren --------------------------------- */

/**
 * Een verwerking uitvoeren. Wordt hij al door iemand anders gedaan, of is hij
 * al klaar, dan gebeurt er niets: alleen een verwerking die wacht, wordt
 * opgepakt, en maar één keer. Daardoor is het niet erg dat de
 * achtergrondfunctie voor iedereen aan te roepen is.
 *
 * Gaat er iets mis, dan blijft de briefing zoals hij was: het terugschrijven
 * is de laatste stap, in één transactie.
 */
export async function voerVerwerkingUit(id: string, model: Model = claude, vandaag = new Date()): Promise<CampaignVerwerking | null> {
  const [opgepakt] = await db
    .update(campaignVerwerkingen)
    .set({ status: 'bezig', gestartOp: new Date() })
    .where(and(eq(campaignVerwerkingen.id, id), eq(campaignVerwerkingen.status, 'wacht')))
    .returning()
  if (!opgepakt) return null

  try {
    const v = await getCampagne(opgepakt.campaignId)
    if (!v) throw new VerwerkError('Deze campagne bestaat niet meer.')
    const team = await listTeam()

    const inhoud: BetaContentBlockParam[] = [
      {
        type: 'text',
        text: `Klant: ${v.organisatie.name}\nCampagne: ${v.campagne.title}\n\nDe huidige briefing:\n\n${JSON.stringify(briefingAlsInvoer(v), null, 2)}${
          v.doelgroepen.length > 0
            ? `\n\nDe gekozen doelgroepen (ter informatie, die pas je hier niet aan):\n${v.doelgroepen.map((d) => `- ${d.name}${d.description ? `: ${d.description}` : ''}`).join('\n')}`
            : ''
        }`,
      },
    ]
    if (opgepakt.bestandSleutel) {
      const bestand = await haal(opgepakt.bestandSleutel)
      if (!bestand) throw new VerwerkError('Het bestand met de feedback is niet meer te vinden. Upload het opnieuw.')
      const soort = herkenFeedbackBestand(bestand.data)
      if (!soort) throw new VerwerkError('Het bestand met de feedback kon niet gelezen worden.')
      inhoud.push({ type: 'text', text: 'De feedback van de klant, als bestand:' })
      inhoud.push(bestandsblok(soort, bestand.data, opgepakt.bestandNaam ?? 'feedback'))
    }
    if (opgepakt.invoer) inhoud.push({ type: 'text', text: `De feedback van de klant:\n\n${opgepakt.invoer}` })
    inhoud.push({ type: 'text', text: 'Geef de volledige nieuwe briefing terug, met de wijzigingen en open vragen als interne lijsten.' })

    const ruw = await model({ systeem: systeemPrompt(vandaag, team.map((t) => t.name ?? t.email)), inhoud })
    const gelezen = Uitkomst.safeParse(ruw)
    if (!gelezen.success) throw new VerwerkError('Het antwoord van de AI had niet de vorm van een briefing. Probeer het opnieuw.')

    const extraVragen = await pasToe(v, gelezen.data, team)
    const versietaal = vindVersietaal(gelezen.data)
    if (versietaal.length > 0) {
      extraVragen.push(`Lees ${versietaal.join(', ')} na: daar lijkt nog naar een eerdere versie verwezen te worden.`)
    }

    const [klaar] = await db
      .update(campaignVerwerkingen)
      .set({
        status: 'klaar',
        wijzigingen: gelezen.data.wijzigingen.map((w) => w.trim()).filter(Boolean),
        openVragen: [...gelezen.data.openVragen.map((w) => w.trim()).filter(Boolean), ...extraVragen],
        voor: momentopname(v),
        klaarOp: new Date(),
      })
      .where(eq(campaignVerwerkingen.id, id))
      .returning()
    return klaar ?? null
  } catch (error) {
    const melding =
      error instanceof VerwerkError
        ? error.message
        : error instanceof Anthropic.APIError
          ? `De AI gaf een fout (${error.status ?? 'onbekend'}). Probeer het over een paar minuten opnieuw.`
          : 'Er ging iets mis bij het verwerken. Kijk in de logs van Netlify.'
    if (!(error instanceof VerwerkError)) console.error('[briefing verwerken] mislukt:', error)
    const [mis] = await db
      .update(campaignVerwerkingen)
      .set({ status: 'fout', fout: melding, klaarOp: new Date() })
      .where(eq(campaignVerwerkingen.id, id))
      .returning()
    return mis ?? null
  }
}

function leesDatum(waarde: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(waarde.trim())
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const ofNull = (s: string) => s.trim() || null

type Teamlid = { id: string; name: string | null; email: string }

/** "wie" uit de AI terug naar een collega of een rol. */
function wieNaar(
  wie: string,
  team: Teamlid[],
  bestaand: CampagneVolledig['tijdlijn'][number] | undefined,
): { assigneeUserId: string | null; assigneeLabel: string | null } {
  const naam = wie.trim()
  if (naam === '') return { assigneeUserId: null, assigneeLabel: null }
  if (bestaand && bestaand.assigneeUserId && bestaand.assigneeName?.toLowerCase() === naam.toLowerCase()) {
    return { assigneeUserId: bestaand.assigneeUserId, assigneeLabel: null }
  }
  const klein = naam.toLowerCase()
  const precies = team.filter((t) => t.name?.toLowerCase() === klein || t.email.toLowerCase() === klein)
  if (precies.length === 1) return { assigneeUserId: precies[0]!.id, assigneeLabel: null }
  const voornaam = team.filter((t) => t.name?.toLowerCase().split(' ')[0] === klein)
  if (voornaam.length === 1) return { assigneeUserId: voornaam[0]!.id, assigneeLabel: null }
  return { assigneeUserId: null, assigneeLabel: naam }
}

/**
 * De nieuwe briefing terugschrijven, in één transactie. Wat niet in de
 * database past (een KPI zonder aantal), laten we weg en melden we als open
 * vraag, zodat niets stilletjes verdwijnt.
 */
async function pasToe(v: CampagneVolledig, u: Uitkomst, team: Teamlid[]): Promise<string[]> {
  const c = v.campagne
  const vragen: string[] = []

  let startOn = u.planning.start.trim() === '' ? null : leesDatum(u.planning.start)
  let endOn = u.planning.einde.trim() === '' ? null : leesDatum(u.planning.einde)
  if ((u.planning.start.trim() !== '' && !startOn) || (u.planning.einde.trim() !== '' && !endOn)) {
    vragen.push('De AI gaf een start- of einddatum die niet te lezen was; de oude datums staan er nog.')
    startOn = c.startOn
    endOn = c.endOn
  }
  if (startOn && endOn && endOn < startOn) {
    vragen.push('De einddatum viel voor de startdatum; de oude datums staan er nog.')
    startOn = c.startOn
    endOn = c.endOn
  }

  const vastBudget = u.doel.vastBudget.trim() === '' ? null : parseAmountToCents(u.doel.vastBudget)
  const fixedBudgetCents = vastBudget !== null && vastBudget > 0 ? vastBudget : null

  const kpis = u.kpis.flatMap((k, i) => {
    const label = k.label.trim()
    if (label === '' || !Number.isInteger(k.aantal) || k.aantal <= 0) {
      vragen.push(`KPI "${label || `regel ${i + 1}`}" had geen geldig aantal en is weggelaten. Vul hem met de hand in.`)
      return []
    }
    const prijs = k.prijs.trim() === '' ? null : parseAmountToCents(k.prijs)
    return [{ label, on: leesDatum(k.datum), targetQuantity: k.aantal, priceCents: prijs !== null && prijs >= 0 ? prijs : null }]
  })
  const kanalen = u.kanalen
    .filter((k) => k.soort.trim() !== '')
    .map((k) => ({
      kind: k.soort.trim(),
      quantity: ofNull(k.aantal),
      note: ofNull(k.toelichting),
      status: k.status.trim().toLowerCase() === 'bestaat' ? ('bestaat' as const) : ('maken' as const),
    }))

  const bestaand = new Map(v.tijdlijn.map((t) => [t.id, t]))
  const tijdlijn = u.tijdlijn
    .filter((t) => t.omschrijving.trim() !== '')
    .map((t) => {
      const oud = bestaand.get(t.id.trim())
      return {
        id: oud?.id ?? null,
        dueOn: leesDatum(t.datum),
        description: t.omschrijving.trim(),
        ...wieNaar(t.wie, team, oud),
      }
    })
  // Twee regels met hetzelfde id: alleen de eerste houdt het.
  const gezien = new Set<string>()
  for (const t of tijdlijn) {
    if (t.id && gezien.has(t.id)) t.id = null
    else if (t.id) gezien.add(t.id)
  }
  const blijvend = [...gezien]

  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({
        summary: ofNull(u.samenvatting),
        goalSentence: ofNull(u.doel.doelInEenZin),
        resultDefinition: ofNull(u.doel.resultaatDefinitie),
        budgetMode: u.doel.budgetVorm.trim().toLowerCase() === 'vast' ? 'vast' : 'berekend',
        fixedBudgetCents,
        budgetNote: ofNull(u.doel.budgetToelichting),
        kpiNotes: ofNull(u.doel.kpiOpmerkingen),
        offerWhat: ofNull(u.aanbod.wat),
        offerMessage: ofNull(u.aanbod.boodschap),
        offerWhyNow: ofNull(u.aanbod.waaromNu),
        offerNotPromised: ofNull(u.aanbod.nietBeloofd),
        region: ofNull(u.doelgroep.regio),
        exclusions: ofNull(u.doelgroep.uitsluitingen),
        audienceNotes: ofNull(u.doelgroep.toelichting),
        startOn,
        endOn,
        planningNotes: ofNull(u.planning.toelichting),
        clientDoes: ofNull(u.afspraken.klantDoet),
        agreementNotes: ofNull(u.afspraken.overig),
        backgroundPrevious: ofNull(u.achtergrond.eerder),
        backgroundRisks: ofNull(u.achtergrond.risicos),
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, c.id))

    await tx.delete(campaignKpis).where(eq(campaignKpis.campaignId, c.id))
    if (kpis.length > 0) await tx.insert(campaignKpis).values(kpis.map((k, i) => ({ campaignId: c.id, position: i, ...k })))

    await tx.delete(campaignChannels).where(eq(campaignChannels.campaignId, c.id))
    if (kanalen.length > 0) await tx.insert(campaignChannels).values(kanalen.map((k, i) => ({ campaignId: c.id, position: i, ...k })))

    // De tijdlijn niet wissen en opnieuw vullen: een regel die blijft, houdt zijn koppeling met ClickUp.
    await tx
      .delete(campaignTimeline)
      .where(
        blijvend.length > 0
          ? and(eq(campaignTimeline.campaignId, c.id), notInArray(campaignTimeline.id, blijvend))
          : eq(campaignTimeline.campaignId, c.id),
      )
    for (const { id, ...regel } of tijdlijn) {
      if (id) await tx.update(campaignTimeline).set(regel).where(eq(campaignTimeline.id, id))
      else await tx.insert(campaignTimeline).values({ campaignId: c.id, ...regel })
    }
  })
  return vragen
}

/* ------------------------------ Lezen en terugdraaien --------------------- */

export type VerwerkingWeergave = CampaignVerwerking & { vastgelopen: boolean; magTerug: boolean; door: string | null }

export async function listVerwerkingen(campaignId: string, nu = Date.now()): Promise<VerwerkingWeergave[]> {
  const rijen = await db
    .select()
    .from(campaignVerwerkingen)
    .where(eq(campaignVerwerkingen.campaignId, campaignId))
    .orderBy(desc(campaignVerwerkingen.createdAt))
  const team = new Map((await listTeam()).map((t) => [t.id, t.name ?? t.email]))
  const laatsteKlaar = rijen.find((r) => r.status === 'klaar')
  return rijen.map((r) => ({
    ...r,
    vastgelopen: isVastgelopen(r, nu),
    magTerug: r.id === laatsteKlaar?.id && r.voor !== null,
    door: r.createdByUserId ? (team.get(r.createdByUserId) ?? null) : null,
  }))
}

/** Een vastgelopen verwerking als mislukt markeren, zodat er een nieuwe kan starten. */
export async function markeerVastgelopen(campaignId: string): Promise<void> {
  const rijen = await db
    .select()
    .from(campaignVerwerkingen)
    .where(and(eq(campaignVerwerkingen.campaignId, campaignId), inArray(campaignVerwerkingen.status, ['wacht', 'bezig'])))
  const vast = rijen.filter((r) => isVastgelopen(r)).map((r) => r.id)
  if (vast.length === 0) return
  await db
    .update(campaignVerwerkingen)
    .set({ status: 'fout', fout: 'Vastgelopen: de verwerking is nooit afgerond. Probeer het opnieuw.', klaarOp: new Date() })
    .where(inArray(campaignVerwerkingen.id, vast))
}

type Momentopname = {
  campagne: Record<string, unknown>
  kpis: { id: string; position: number; label: string; on: string | null; targetQuantity: number; priceCents: number | null }[]
  kanalen: { id: string; position: number; kind: string; quantity: string | null; note: string | null; status: 'bestaat' | 'maken' }[]
  tijdlijn: {
    id: string
    dueOn: string | null
    description: string
    assigneeUserId: string | null
    assigneeLabel: string | null
    clickupTaskId: string | null
  }[]
}

const alsDatum = (w: unknown) => (typeof w === 'string' ? new Date(w) : null)

/**
 * De briefing terugzetten zoals hij was vlak voor de verwerking. Alleen de
 * laatste verwerking: een oudere terugdraaien zou alles wat daarna kwam
 * stilletjes weggooien.
 */
export async function draaiVerwerkingTerug(id: string): Promise<void> {
  const [r] = await db.select().from(campaignVerwerkingen).where(eq(campaignVerwerkingen.id, id)).limit(1)
  if (!r) throw new VerwerkError('Deze verwerking bestaat niet meer.')
  if (r.status !== 'klaar' || !r.voor) throw new VerwerkError('Alleen een afgeronde verwerking kun je terugdraaien.')
  const [laatste] = await db
    .select({ id: campaignVerwerkingen.id })
    .from(campaignVerwerkingen)
    .where(and(eq(campaignVerwerkingen.campaignId, r.campaignId), eq(campaignVerwerkingen.status, 'klaar')))
    .orderBy(desc(campaignVerwerkingen.createdAt))
    .limit(1)
  if (laatste?.id !== r.id) throw new VerwerkError('Alleen de laatste verwerking kun je terugdraaien.')

  const voor = r.voor as Momentopname
  const velden: Record<string, unknown> = {}
  for (const veld of VERWERKBARE_VELDEN) {
    const w = voor.campagne[veld] ?? null
    velden[veld] = veld === 'startOn' || veld === 'endOn' ? alsDatum(w) : w
  }

  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({ ...(velden as Partial<Campaign>), updatedAt: new Date() })
      .where(eq(campaigns.id, r.campaignId))
    await tx.delete(campaignKpis).where(eq(campaignKpis.campaignId, r.campaignId))
    if (voor.kpis.length > 0) {
      await tx.insert(campaignKpis).values(voor.kpis.map((k) => ({ ...k, campaignId: r.campaignId, on: alsDatum(k.on) })))
    }
    await tx.delete(campaignChannels).where(eq(campaignChannels.campaignId, r.campaignId))
    if (voor.kanalen.length > 0) await tx.insert(campaignChannels).values(voor.kanalen.map((k) => ({ ...k, campaignId: r.campaignId })))
    await tx.delete(campaignTimeline).where(eq(campaignTimeline.campaignId, r.campaignId))
    if (voor.tijdlijn.length > 0) {
      await tx.insert(campaignTimeline).values(
        voor.tijdlijn.map((t) => ({
          id: t.id,
          campaignId: r.campaignId,
          dueOn: alsDatum(t.dueOn),
          description: t.description,
          assigneeUserId: t.assigneeUserId,
          assigneeLabel: t.assigneeLabel,
          clickupTaskId: t.clickupTaskId,
        })),
      )
    }
    await tx.update(campaignVerwerkingen).set({ status: 'teruggedraaid' }).where(eq(campaignVerwerkingen.id, id))
  })
}
