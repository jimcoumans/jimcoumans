import { and, asc, desc, eq, gt, lt } from 'drizzle-orm'
import { db } from '@/db'
import { contractTemplates, contractTemplateArticles, employerSettings, textTemplates } from '@/db/schema'
import type { ContractTemplate, ContractTemplateArticle } from '@/db/schema'

/* -------------------------------------------------------------------------
   Standaardteksten: de sjablonen van de contracten, de AVG-verklaring en de
   mails, zoals ze in het portaal te wijzigen zijn.

   Een tekst bevat {{plaatshouders}} die bij het opstellen worden ingevuld,
   en {{#als voorwaarde}}...{{/als}}-blokken die alleen blijven staan als de
   voorwaarde geldt. Wat hier staat is de lijst van wat er bestaat: een
   tikfout in een plaatshouder valt op bij het opslaan, niet pas in een
   contract dat al ondertekend is.

   Een opgesteld contract bewaart zijn eigen tekst. Een wijziging hier geldt
   dus alleen voor contracten die daarna worden opgesteld of gewijzigd.
   ------------------------------------------------------------------------- */

export class SjabloonError extends Error {}

/* --- Wat bedrijfsbreed geregeld is ---------------------------------------- */

export const REGELINGEN = [
  { sleutel: 'ziekteverzuimverzekering', label: 'Ziekteverzuimverzekering', inZin: 'een ziekteverzuimverzekering', verzekering: true },
  { sleutel: 'bedrijfsongevallenverzekering', label: 'Bedrijfsongevallenverzekering', inZin: 'een bedrijfsongevallenverzekering', verzekering: true },
  { sleutel: 'beroepsaansprakelijkheidsverzekering', label: 'Beroepsaansprakelijkheidsverzekering', inZin: 'een beroepsaansprakelijkheidsverzekering', verzekering: true },
  { sleutel: 'arbodienst', label: 'Contract met een arbodienst of bedrijfsarts', inZin: 'een contract met een arbodienst', verzekering: false },
  { sleutel: 'pensioenregeling', label: 'Pensioenregeling voor het personeel', inZin: 'een pensioenregeling', verzekering: false },
] as const

export type Regeling = (typeof REGELINGEN)[number]['sleutel']

export function isRegeling(s: string): s is Regeling {
  return REGELINGEN.some((r) => r.sleutel === s)
}

/** "een ziekteverzuimverzekering, een bedrijfsongevallenverzekering en een ..." of leeg. */
export function verzekeringenZin(regelingen: readonly string[]): string {
  const delen = REGELINGEN.filter((r) => r.verzekering && regelingen.includes(r.sleutel)).map((r) => r.inZin)
  if (delen.length <= 1) return delen[0] ?? ''
  return `${delen.slice(0, -1).join(', ')} en ${delen[delen.length - 1]}`
}

export async function slaRegelingenOp(regelingen: string[]): Promise<void> {
  const schoon = [...new Set(regelingen.filter(isRegeling))]
  const [w] = await db.select({ id: employerSettings.id }).from(employerSettings).limit(1)
  if (!w) throw new SjabloonError('Vul eerst de bedrijfsgegevens in.')
  await db.update(employerSettings).set({ regelingen: schoon, updatedAt: new Date() }).where(eq(employerSettings.id, w.id))
}

/* --- Plaatshouders en voorwaarden in een contract ------------------------- */

/** Alles wat in een contractsjabloon tussen {{ }} kan staan, met uitleg voor wie de tekst schrijft. */
export const CONTRACT_PLAATSHOUDERS: Record<string, string> = {
  werkgever_naam: 'Juridische naam: James Robinson B.V.',
  werkgever_merk: 'Naam zoals we hem voeren: James Robinson',
  werkgever_adres: 'Adres van de hoofdvestiging',
  werkgever_postcode: 'Postcode van de hoofdvestiging',
  werkgever_vestigingsplaats: 'Plaats van de hoofdvestiging',
  werkgever_ondertekenaars: 'Wie namens de werkgever tekent: Jim Coumans en Jim Kikken',
  werkplek_adres: 'Adres van de standplaats',
  werkplek_postcode: 'Postcode van de standplaats',
  werkplek_plaats: 'Plaats van de standplaats',
  kantoortijden: 'Kantoortijden van de standplaats tussen haakjes, of leeg',
  werknemer_aanhef: 'Dhr. of Mevr., of leeg',
  werknemer_naam: 'Volledige naam zoals in het paspoort',
  voornaam: 'Roepnaam',
  werknemer_adres: 'Adres van de werknemer',
  werknemer_postcode: 'Postcode van de werknemer',
  werknemer_woonplaats: 'Woonplaats van de werknemer',
  werknemer_geboortedatum: 'Geboortedatum, voluit',
  functie: 'Functie',
  ingangsdatum: 'Ingangsdatum, voluit: 13 oktober 2026',
  looptijd: 'Looptijd in woorden: zeven maanden',
  einddatum: 'Einddatum van rechtswege, voluit',
  proeftijd: 'Proeftijd in woorden: één maand',
  uren_per_week: 'Uren per week: 24',
  salaris: 'Bruto maandsalaris: € 2.360,41',
  schaal_trede: 'Schaal en trede: schaal Medior, trede 20',
  salaris_peildatum: 'Datum waarop het salarishuis is gelezen (de ingangsdatum)',
  vakantietoeslag_percent: 'Vakantietoeslag in procenten: 8',
  vakantiedagen_fulltime: 'Vakantiedagen bij fulltime: 25',
  vakantie_uren_fulltime: 'Vakantie-uren bij fulltime: 200',
  vakantie_uren: 'Vakantie-uren naar rato: 120',
  salaris_fulltime: 'Bruto maandsalaris bij een volledige werkweek: € 3.934,02',
  uren_fulltime: 'Uren van een volledige werkweek: 40',
  deeltijdfactor: 'Deel van een volledige werkweek: 0,6',
  op_toeslag_percent: 'OP-toeslag in procenten: 10',
  op_toeslag_bedrag: 'OP-toeslag per maand: € 236,04',
  relatiebeding_maanden: 'Duur van het relatiebeding in maanden',
  relatiebeding_motivering: 'Motivering uit het functieprofiel',
  extra_afspraken: 'Extra afspraken bij dit contract of de functie',
  verzekeringen_zin: 'De verzekeringen die bedrijfsbreed geregeld zijn, als opsomming',
}

/** Alleen in de begeleidende tekst: hele zinnen die het systeem opbouwt. */
export const INTRO_PLAATSHOUDERS: Record<string, string> = {
  duur_zin: 'Zin over bepaalde of onbepaalde tijd',
  op_toeslag_zin: 'Regel over de OP-toeslag, of leeg',
  proeftijd_zin: 'Regel over de proeftijd',
  relatiebeding_zin: 'Regel over het relatiebeding, of leeg',
  handboek_zin: 'Alinea met de link naar het personeelshandboek',
}

/** Wat er in {{#als ...}} kan staan. */
export const CONTRACT_VOORWAARDEN: Record<string, string> = {
  bepaalde_tijd: 'Contract voor bepaalde tijd',
  onbepaalde_tijd: 'Contract voor onbepaalde tijd',
  proeftijd: 'Er is een geldige proeftijd',
  relatiebeding: 'Relatiebeding staat aan',
  op_toeslag: 'OP-toeslag in plaats van pensioen',
  vrijetijdsbudget: 'Vrijetijdsbudget staat aan',
  extra_afspraken: 'Er zijn extra afspraken',
  schaal: 'Het salaris komt uit een schaal en trede',
  deeltijd: 'Minder uren dan een volledige werkweek, en het fulltime salaris is bekend',
  bereikbaar: 'Bereikbaar op werkdagen tijdens kantoortijden',
  nevenwerk_toestemming: 'Nevenwerk alleen met toestemming',
  nevenwerk_vrij: 'Nevenwerk vrij, behalve voor klanten',
  verzekeringen: 'Minstens een verzekering is bedrijfsbreed geregeld',
  ...Object.fromEntries(REGELINGEN.map((r) => [r.sleutel, `Bedrijfsbreed geregeld: ${r.label.toLowerCase()}`])),
}

/** Waar een heel artikel van afhangt: de keuzes in de database. Fijner kan met {{#als}} in de tekst. */
export const ARTIKEL_VOORWAARDEN: Record<ContractTemplateArticle['voorwaarde'], string> = {
  altijd: 'Altijd',
  bepaalde_tijd: 'Alleen bij bepaalde tijd',
  onbepaalde_tijd: 'Alleen bij onbepaalde tijd',
  proeftijd: 'Alleen met proeftijd',
  relatiebeding: 'Alleen met relatiebeding',
  op_toeslag: 'Alleen met OP-toeslag',
  pensioenregeling: 'Alleen met pensioenregeling',
  vrijetijdsbudget: 'Alleen met vrijetijdsbudget',
  extra_afspraken: 'Alleen met extra afspraken',
}

/**
 * Controleert een tekst: onbekende plaatshouders, onbekende voorwaarden en
 * blokken die niet sluiten. Geeft de fouten in gewone taal terug.
 */
export function controleerTekst(tekst: string, kent: { plaatshouders: Record<string, string>; voorwaarden: Record<string, string> }): string[] {
  const fouten: string[] = []
  const zonderBlokken = tekst.replace(/\{\{\s*(#als|#alsniet)\s+([a-z0-9_]+)\s*\}\}|\{\{\s*\/(als|alsniet)\s*\}\}/gi, (_h, soort: string, naam: string) => {
    if (soort && !(naam in kent.voorwaarden)) fouten.push(`Onbekende voorwaarde "${naam}".`)
    return ''
  })
  for (const m of zonderBlokken.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
    const naam = m[1]!
    if (!(naam in kent.plaatshouders)) fouten.push(`Onbekende plaatshouder {{${naam}}}.`)
  }
  for (const [open, dicht, naam] of [
    [/\{\{\s*#als\s/gi, /\{\{\s*\/als\s*\}\}/gi, 'als'],
    [/\{\{\s*#alsniet\s/gi, /\{\{\s*\/alsniet\s*\}\}/gi, 'alsniet'],
  ] as const) {
    const o = tekst.match(open)?.length ?? 0
    const d = tekst.match(dicht)?.length ?? 0
    if (o !== d) fouten.push(`Er ${o === 1 ? 'staat' : 'staan'} ${o} {{#${naam}}} en ${d} {{/${naam}}}: elk blok moet sluiten.`)
  }
  // Een enkele accolade is bijna altijd een tikfout.
  if (/[{}]/.test(tekst.replace(/\{\{[^{}]*\}\}/g, ''))) fouten.push('Er staat een losse accolade in de tekst. Plaatshouders hebben er twee: {{zo}}.')
  return [...new Set(fouten)]
}

/* --- Contractsjablonen beheren -------------------------------------------- */

export const SOORT_LABELS: Record<ContractTemplate['kind'], string> = {
  bepaalde_tijd: 'Arbeidsovereenkomst bepaalde tijd',
  onbepaalde_tijd: 'Arbeidsovereenkomst onbepaalde tijd',
  oproep: 'Oproepovereenkomst',
  stage: 'Stageovereenkomst',
  zzp: 'Overeenkomst van opdracht',
}

/** De soorten waar het contractformulier mee kan werken. */
export const BRUIKBARE_SOORTEN = ['bepaalde_tijd', 'onbepaalde_tijd'] as const

export type SjabloonMetArtikelen = { template: ContractTemplate; artikelen: ContractTemplateArticle[] }

/** Het geldende sjabloon per soort, met artikelen. */
export async function listSjablonen(): Promise<SjabloonMetArtikelen[]> {
  const templates = await db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.active, true))
    .orderBy(asc(contractTemplates.kind), desc(contractTemplates.effectiveFrom))
  const perSoort = new Map<string, ContractTemplate>()
  for (const t of templates) if (!perSoort.has(t.kind)) perSoort.set(t.kind, t)
  const uit: SjabloonMetArtikelen[] = []
  for (const template of perSoort.values()) {
    const artikelen = await db
      .select()
      .from(contractTemplateArticles)
      .where(eq(contractTemplateArticles.templateId, template.id))
      .orderBy(asc(contractTemplateArticles.sortOrder))
    uit.push({ template, artikelen })
  }
  return uit
}

async function getArtikel(id: string): Promise<ContractTemplateArticle> {
  const [a] = await db.select().from(contractTemplateArticles).where(eq(contractTemplateArticles.id, id)).limit(1)
  if (!a) throw new SjabloonError('Dit artikel bestaat niet meer.')
  return a
}

function eisGeldig(tekst: string, extra: Record<string, string> = {}) {
  const fouten = controleerTekst(tekst, { plaatshouders: { ...CONTRACT_PLAATSHOUDERS, ...extra }, voorwaarden: CONTRACT_VOORWAARDEN })
  if (fouten.length > 0) throw new SjabloonError(fouten.join(' '))
}

export async function slaIntroOp(templateId: string, intro: string): Promise<void> {
  eisGeldig(intro, INTRO_PLAATSHOUDERS)
  await db.update(contractTemplates).set({ intro: intro.trim() || null }).where(eq(contractTemplates.id, templateId))
}

export type ArtikelInvoer = {
  id?: string | null
  templateId: string
  title: string
  body: string
  voorwaarde: ContractTemplateArticle['voorwaarde']
}

export async function slaArtikelOp(a: ArtikelInvoer): Promise<void> {
  if (!a.title.trim()) throw new SjabloonError('Geef het artikel een titel.')
  if (!a.body.trim()) throw new SjabloonError('Een artikel zonder tekst kan niet. Haal het weg als het er niet in hoort.')
  if (!(a.voorwaarde in ARTIKEL_VOORWAARDEN)) throw new SjabloonError('Onbekende voorwaarde voor dit artikel.')
  if (/^\s*artikel\s+\d+/i.test(a.title)) throw new SjabloonError('Zet geen nummer in de titel: de artikelen worden bij het opstellen genummerd.')
  eisGeldig(a.body)
  const waarden = { title: a.title.trim(), body: a.body.replace(/\r\n/g, '\n').trim(), voorwaarde: a.voorwaarde }
  if (a.id) {
    await db.update(contractTemplateArticles).set(waarden).where(eq(contractTemplateArticles.id, a.id))
    return
  }
  const [laatste] = await db
    .select({ n: contractTemplateArticles.sortOrder })
    .from(contractTemplateArticles)
    .where(eq(contractTemplateArticles.templateId, a.templateId))
    .orderBy(desc(contractTemplateArticles.sortOrder))
    .limit(1)
  await db.insert(contractTemplateArticles).values({ templateId: a.templateId, sortOrder: (laatste?.n ?? 0) + 1, ...waarden })
}

export async function wisArtikel(id: string): Promise<void> {
  await getArtikel(id)
  await db.delete(contractTemplateArticles).where(eq(contractTemplateArticles.id, id))
}

/** Een artikel een plek omhoog of omlaag. De volgorde is uniek, dus ruilen via een tijdelijke plek. */
export async function verschuifArtikel(id: string, richting: 'op' | 'neer'): Promise<void> {
  const a = await getArtikel(id)
  const [buur] = await db
    .select()
    .from(contractTemplateArticles)
    .where(
      and(
        eq(contractTemplateArticles.templateId, a.templateId),
        richting === 'op' ? lt(contractTemplateArticles.sortOrder, a.sortOrder) : gt(contractTemplateArticles.sortOrder, a.sortOrder),
      ),
    )
    .orderBy(richting === 'op' ? desc(contractTemplateArticles.sortOrder) : asc(contractTemplateArticles.sortOrder))
    .limit(1)
  if (!buur) return
  await db.transaction(async (tx) => {
    await tx.update(contractTemplateArticles).set({ sortOrder: -1 }).where(eq(contractTemplateArticles.id, a.id))
    await tx.update(contractTemplateArticles).set({ sortOrder: a.sortOrder }).where(eq(contractTemplateArticles.id, buur.id))
    await tx.update(contractTemplateArticles).set({ sortOrder: buur.sortOrder }).where(eq(contractTemplateArticles.id, a.id))
  })
}

/** Het artikel over de duur bij onbepaalde tijd: wat er anders is dan bij een tijdelijk contract. */
const DUUR_ONBEPAALD = `De arbeidsovereenkomst wordt aangegaan voor onbepaalde tijd, ingaande op {{ingangsdatum}}.

Partijen kunnen de arbeidsovereenkomst opzeggen met inachtneming van de wettelijke opzegtermijn. Voor de procedure voor beëindiging, daarin begrepen de vereisten en de geldende opzegtermijnen, wordt verwezen naar Titel 10 van Boek 7 van het Burgerlijk Wetboek en naar het Personeelshandboek.

De arbeidsovereenkomst eindigt in ieder geval zonder dat opzegging is vereist op de dag waarop de werknemer de AOW-gerechtigde leeftijd bereikt.`

/**
 * Een sjabloon voor een soort die er nog niet is, als kopie van een bestaand
 * sjabloon. Bij onbepaalde tijd komt er meteen een artikel over de duur bij:
 * het artikel uit een tijdelijk contract valt dan vanzelf weg.
 */
export async function maakSjabloon(kind: ContractTemplate['kind'], vanTemplateId: string): Promise<string> {
  const bestaand = (await listSjablonen()).find((s) => s.template.kind === kind)
  if (bestaand) throw new SjabloonError(`Er is al een sjabloon voor ${SOORT_LABELS[kind].toLowerCase()}.`)
  const [bron] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, vanTemplateId)).limit(1)
  if (!bron) throw new SjabloonError('Het sjabloon om van te kopiëren bestaat niet meer.')
  const artikelen = await db.select().from(contractTemplateArticles).where(eq(contractTemplateArticles.templateId, bron.id)).orderBy(asc(contractTemplateArticles.sortOrder))
  return db.transaction(async (tx) => {
    const [nieuw] = await tx
      .insert(contractTemplates)
      .values({ name: SOORT_LABELS[kind], kind, effectiveFrom: new Date(2000, 0, 1), active: true, intro: bron.intro, notes: `Kopie van ${bron.name}.` })
      .returning({ id: contractTemplates.id })
    let volgorde = 0
    for (const a of artikelen) {
      volgorde += 1
      await tx.insert(contractTemplateArticles).values({ templateId: nieuw!.id, sortOrder: volgorde, title: a.title, body: a.body, voorwaarde: a.voorwaarde })
      // Direct na het artikel over de duur bij bepaalde tijd: dat over onbepaalde tijd.
      if (kind === 'onbepaalde_tijd' && a.voorwaarde === 'bepaalde_tijd' && a.title === 'Duur') {
        volgorde += 1
        await tx.insert(contractTemplateArticles).values({ templateId: nieuw!.id, sortOrder: volgorde, title: 'Duur', body: DUUR_ONBEPAALD, voorwaarde: 'onbepaalde_tijd' })
      }
    }
    return nieuw!.id
  })
}

/* --- Losse standaardteksten (mails) --------------------------------------- */

export async function getTekstOverrides(): Promise<Map<string, { subject: string | null; body: string }>> {
  const rijen = await db.select().from(textTemplates)
  return new Map(rijen.map((r) => [r.key, { subject: r.subject, body: r.body }]))
}

export async function slaTekstOp(key: string, subject: string | null, body: string | null, doorUserId: string | null): Promise<void> {
  if (body === null) {
    await db.delete(textTemplates).where(eq(textTemplates.key, key))
    return
  }
  await db
    .insert(textTemplates)
    .values({ key, subject, body, updatedByUserId: doorUserId })
    .onConflictDoUpdate({ target: textTemplates.key, set: { subject, body, updatedAt: new Date(), updatedByUserId: doorUserId } })
}
