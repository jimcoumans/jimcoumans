import { createHmac, timingSafeEqual } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientForms, clientJourneyItems, contacts, deals, organizations } from '@/db/schema'
import type { ClientForm } from '@/db/schema'
import { createActivity } from './tijdlijn'
import { VRAGEN, CONTACT, NOG_GEEN_WEBSITE, beoordeel, KLEUR_LABEL, type Antwoorden, type Kleur } from './formulieren/vragenlijst'
import { PUNTEN, standVanScan, type ScanInvulling, type ScanKleur } from './formulieren/quickscan'
import { INTAKE, ontbrekendInIntake } from './formulieren/intake'

/* -------------------------------------------------------------------------
   Formulieren in het klantdossier.

   Alles wat we een klant vragen of over een klant vastleggen in de
   verkoopfase, staat hier als gegevens bij de klant, niet als losse pdf. Een
   afgerond formulier vinkt de mijlpaal in de klantreis af en komt op de
   tijdlijn, zodat iedereen ziet in welke stap een klant zit.

   De vragenlijst kan de klant zelf invullen via een link, zonder in te
   loggen. Die link is te herleiden uit het id van het formulier, een
   versienummer en AUTH_SECRET: er staat geen token in de database, en een
   nieuwe link maakt de oude ongeldig.
   ------------------------------------------------------------------------- */

export class FormulierError extends Error {}

export type Soort = ClientForm['soort']

export const SOORT_LABEL: Record<Soort, string> = {
  vragenlijst: 'Vragenlijst',
  quickscan: 'Quickscan',
  intake: 'Vragenlijst intakegesprek',
}
export const SOORT_CODE: Record<Soort, string> = { vragenlijst: '01.1', quickscan: '02.1', intake: '03.2' }

/** Zo lang is een link voor de klant geldig. */
export const LINK_DAGEN = 30

const MAX_TEKST = 2000

/* ------------------------------ De link ----------------------------------- */

function geheim(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET ontbreekt of is te kort (minimaal 32 tekens).')
  return s
}

export function linkToken(id: string, versie: number): string {
  return createHmac('sha256', geheim()).update(`formulier:${id}:${versie}`).digest('base64url').slice(0, 32)
}

function tokenKlopt(id: string, versie: number, token: string): boolean {
  const verwacht = Buffer.from(linkToken(id, versie))
  const gegeven = Buffer.from(token)
  return verwacht.length === gegeven.length && timingSafeEqual(verwacht, gegeven)
}

export function linkPad(id: string, versie: number): string {
  return `/vragenlijst/${id}/${linkToken(id, versie)}`
}

/* ------------------------------ Lezen ------------------------------------- */

export type FormulierMetKlant = {
  formulier: ClientForm
  organisatie: { id: string; name: string; slug: string; website: string | null }
  deal: { id: string; title: string } | null
}

export async function listFormulieren(organizationId: string) {
  return db
    .select({ formulier: clientForms, dealTitel: deals.title })
    .from(clientForms)
    .leftJoin(deals, eq(deals.id, clientForms.dealId))
    .where(eq(clientForms.organizationId, organizationId))
    .orderBy(desc(clientForms.createdAt))
}

export async function getFormulier(id: string): Promise<FormulierMetKlant | null> {
  const [r] = await db
    .select({
      formulier: clientForms,
      organisatie: { id: organizations.id, name: organizations.name, slug: organizations.slug, website: organizations.website },
      dealId: deals.id,
      dealTitel: deals.title,
    })
    .from(clientForms)
    .innerJoin(organizations, eq(organizations.id, clientForms.organizationId))
    .leftJoin(deals, eq(deals.id, clientForms.dealId))
    .where(eq(clientForms.id, id))
    .limit(1)
  if (!r) return null
  return { formulier: r.formulier, organisatie: r.organisatie, deal: r.dealId ? { id: r.dealId, title: r.dealTitel ?? '' } : null }
}

/** De laatst afgeronde vragenlijst van een klant: de getallen voor de quickscan en het intakegesprek. */
export async function laatsteVragenlijst(organizationId: string): Promise<ClientForm | null> {
  const [r] = await db
    .select()
    .from(clientForms)
    .where(and(eq(clientForms.organizationId, organizationId), eq(clientForms.soort, 'vragenlijst'), eq(clientForms.status, 'ingevuld')))
    .orderBy(desc(clientForms.ingevuldOp))
    .limit(1)
  return r ?? null
}

/* ------------------------------ Aanmaken ---------------------------------- */

/**
 * Een formulier voor een klant. Staat er al een open formulier van dezelfde
 * soort, dan geven we dat terug: twee halve vragenlijsten helpen niemand.
 * Het hangt aan de open deal van de klant, als die er is.
 */
export async function maakFormulier(input: { organizationId: string; soort: Soort; userId: string }): Promise<ClientForm> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, input.organizationId)).limit(1)
  if (!org) throw new FormulierError('Deze klant bestaat niet meer.')

  const [open] = await db
    .select()
    .from(clientForms)
    .where(and(eq(clientForms.organizationId, input.organizationId), eq(clientForms.soort, input.soort), eq(clientForms.status, 'open')))
    .limit(1)
  if (open) return open

  const [deal] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.organizationId, input.organizationId), eq(deals.status, 'open')))
    .orderBy(desc(deals.createdAt))
    .limit(1)

  // Wat we al weten, vullen we vast in: de klant hoeft het niet nog eens te typen.
  const antwoorden: Record<string, unknown> = {}
  if (input.soort === 'vragenlijst') {
    const [vast] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.organizationId, input.organizationId), eq(contacts.isPrimary, true)))
      .limit(1)
    Object.assign(antwoorden, {
      bedrijf: org.name,
      ...(org.website ? { website: org.website } : {}),
      ...(vast?.firstName ? { voornaam: vast.firstName } : {}),
      ...(vast?.lastName ? { achternaam: vast.lastName } : {}),
      ...(vast?.email ? { email: vast.email } : {}),
      ...(vast?.phone ? { telefoon: vast.phone } : {}),
    })
  }
  if (input.soort === 'quickscan') {
    const v = await laatsteVragenlijst(input.organizationId)
    const a = (v?.antwoorden ?? {}) as Antwoorden
    antwoorden.gebied = typeof a.waar === 'string' ? a.waar : ''
    antwoorden.zoektermen = typeof a.watVerkoop === 'string' ? a.watVerkoop : ''
    antwoorden.punten = {}
    antwoorden.bevindingen = []
  }

  const [nieuw] = await db
    .insert(clientForms)
    .values({
      organizationId: input.organizationId,
      dealId: deal?.id ?? null,
      soort: input.soort,
      antwoorden,
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    })
    .returning()
  if (!nieuw) throw new FormulierError('Het formulier kon niet worden aangemaakt.')
  return nieuw
}

/**
 * Een link voor de klant, 30 dagen geldig. Met `opnieuw` wordt de vorige
 * link ongeldig (bijvoorbeeld als hij naar het verkeerde adres ging).
 */
export async function maakKlantlink(id: string, opnieuw = false): Promise<string> {
  const [f] = await db.select().from(clientForms).where(eq(clientForms.id, id)).limit(1)
  if (!f) throw new FormulierError('Dit formulier bestaat niet meer.')
  if (f.soort !== 'vragenlijst') throw new FormulierError('Alleen de vragenlijst vult de klant zelf in.')
  if (f.status !== 'open') throw new FormulierError('Deze vragenlijst is al ingevuld.')
  const versie = opnieuw ? f.linkVersie + 1 : f.linkVersie
  const verlooptOp = new Date(Date.now() + LINK_DAGEN * 86_400_000)
  await db.update(clientForms).set({ linkVersie: versie, linkVerlooptOp: verlooptOp, updatedAt: new Date() }).where(eq(clientForms.id, id))
  return linkPad(id, versie)
}

/** Het formulier achter een link, als die klopt en nog geldig is. Anders null, zonder te zeggen waarom. */
export async function formulierViaLink(id: string, token: string): Promise<(ClientForm & { klantnaam: string }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[A-Za-z0-9_-]{32}$/.test(token)) return null
  const [r] = await db
    .select({ f: clientForms, klantnaam: organizations.name })
    .from(clientForms)
    .innerJoin(organizations, eq(organizations.id, clientForms.organizationId))
    .where(eq(clientForms.id, id))
    .limit(1)
  if (!r || r.f.soort !== 'vragenlijst' || !r.f.linkVerlooptOp) return null
  if (!tokenKlopt(id, r.f.linkVersie, token)) return null
  if (r.f.linkVerlooptOp.getTime() < Date.now()) return null
  return { ...r.f, klantnaam: r.klantnaam }
}

/* ------------------------------ Antwoorden lezen -------------------------- */

const kort = (w: unknown) => (typeof w === 'string' ? w.trim().slice(0, MAX_TEKST) : '')

/** Alleen bekende vragen, alleen bestaande opties, nooit eindeloze tekst. */
export function schoonVragenlijst(ruw: Record<string, unknown>): Antwoorden {
  const uit: Antwoorden = {}
  for (const v of VRAGEN) {
    const w = ruw[v.id]
    if (v.soort === 'keuze') {
      const t = kort(w)
      if (v.opties.includes(t)) uit[v.id] = t
    } else if (v.soort === 'meer') {
      const lijst = (Array.isArray(w) ? w : w === undefined ? [] : [w]).map(kort).filter((o) => v.opties.includes(o))
      uit[v.id] = [...new Set(lijst)]
    } else if (v.soort === 'getal') {
      const t = kort(w).replace(/[€%\s.]/g, '').replace(',', '.')
      const n = t === '' ? null : Number(t)
      uit[v.id] = n !== null && Number.isFinite(n) && n >= (v.min ?? -Infinity) && n <= (v.max ?? Infinity) ? n : null
    } else {
      uit[v.id] = kort(w)
    }
  }
  uit.knelpuntAnders = kort(ruw.knelpuntAnders)
  for (const c of CONTACT) uit[c.id] = kort(ruw[c.id])
  return uit
}

export function schoonQuickscan(ruw: Record<string, unknown>): ScanInvulling & { zoektermen: string; gebied: string } {
  const kleuren: ScanKleur[] = ['groen', 'oranje', 'rood', 'nvt']
  const punten: ScanInvulling['punten'] = {}
  const bron = (ruw.punten ?? {}) as Record<string, Record<string, unknown>>
  for (const p of PUNTEN) {
    const r = bron[String(p.nr)] ?? {}
    const kleur = kort(r.kleur) as ScanKleur
    punten[String(p.nr)] = { kleur: kleuren.includes(kleur) && p.normen ? kleur : null, gezien: kort(r.gezien), notitie: kort(r.notitie) }
  }
  const bevindingen = (Array.isArray(ruw.bevindingen) ? ruw.bevindingen : []).slice(0, 3).map((b) => {
    const r = (b ?? {}) as Record<string, unknown>
    const nr = Number(r.punt)
    return { punt: PUNTEN.some((p) => p.nr === nr) ? nr : null, gezien: kort(r.gezien), gevolg: kort(r.gevolg) }
  })
  return { zoektermen: kort(ruw.zoektermen), gebied: kort(ruw.gebied), punten, bevindingen }
}

export function schoonIntake(ruw: Record<string, unknown>): Record<string, string> {
  const uit: Record<string, string> = {}
  for (const v of INTAKE) uit[v.id] = kort(ruw[v.id])
  return uit
}

/** Een HTML-formulier omzetten naar de ruwe vorm die de schoonmakers hierboven lezen. */
export function antwoordenUitFormData(soort: Soort, f: FormData): Record<string, unknown> {
  if (soort === 'vragenlijst') {
    const uit: Record<string, unknown> = {}
    for (const v of VRAGEN) uit[v.id] = v.soort === 'meer' ? f.getAll(v.id).map(String) : (f.get(v.id) ?? undefined)
    uit.knelpuntAnders = f.get('knelpuntAnders') ?? ''
    if (f.get('geenWebsite')) uit.website = NOG_GEEN_WEBSITE
    for (const c of CONTACT) uit[c.id] = f.get(c.id) ?? ''
    return uit
  }
  if (soort === 'quickscan') {
    const punten: Record<string, Record<string, unknown>> = {}
    for (const p of PUNTEN) {
      punten[String(p.nr)] = { kleur: f.get(`p${p.nr}_kleur`) ?? '', gezien: f.get(`p${p.nr}_gezien`) ?? '', notitie: f.get(`p${p.nr}_notitie`) ?? '' }
    }
    const bevindingen = [1, 2, 3].map((i) => ({ punt: f.get(`b${i}_punt`) ?? '', gezien: f.get(`b${i}_gezien`) ?? '', gevolg: f.get(`b${i}_gevolg`) ?? '' }))
    return { zoektermen: f.get('zoektermen') ?? '', gebied: f.get('gebied') ?? '', punten, bevindingen }
  }
  const uit: Record<string, unknown> = {}
  for (const v of INTAKE) uit[v.id] = f.get(v.id) ?? ''
  return uit
}

function schoon(soort: Soort, ruw: Record<string, unknown>): Record<string, unknown> {
  return soort === 'vragenlijst' ? schoonVragenlijst(ruw) : soort === 'quickscan' ? schoonQuickscan(ruw) : schoonIntake(ruw)
}

/* ------------------------------ Opslaan en afronden ----------------------- */

async function vinkAf(organizationId: string, keys: string[], userId: string | null) {
  await db
    .insert(clientJourneyItems)
    .values(keys.map((itemKey) => ({ organizationId, itemKey, doneByUserId: userId })))
    .onConflictDoNothing()
}

/** Tussentijds opslaan door het team. Een afgeronde vragenlijst wordt opnieuw beoordeeld. */
export async function slaOp(id: string, ruw: Record<string, unknown>, userId: string): Promise<ClientForm> {
  const [f] = await db.select().from(clientForms).where(eq(clientForms.id, id)).limit(1)
  if (!f) throw new FormulierError('Dit formulier bestaat niet meer.')
  const antwoorden = schoon(f.soort, ruw)
  const uitkomst = f.soort === 'vragenlijst' && f.status !== 'open' ? beoordeel(antwoorden as Antwoorden).kleur : f.uitkomst
  const [r] = await db
    .update(clientForms)
    .set({ antwoorden, uitkomst, updatedByUserId: userId, updatedAt: new Date() })
    .where(eq(clientForms.id, id))
    .returning()
  return r!
}

/** De website uit de vragenlijst op de klantkaart, als daar nog niets staat. */
async function websiteOpKlantkaart(organizationId: string, a: Antwoorden) {
  const site = typeof a.website === 'string' ? a.website.trim() : ''
  if (!site || site === NOG_GEEN_WEBSITE) return
  const [org] = await db.select({ website: organizations.website }).from(organizations).where(eq(organizations.id, organizationId)).limit(1)
  if (org && !org.website) await db.update(organizations).set({ website: site, updatedAt: new Date() }).where(eq(organizations.id, organizationId))
}

async function rondVragenlijstAf(f: ClientForm, antwoorden: Antwoorden, userId: string | null, doorKlant: boolean): Promise<Kleur> {
  const b = beoordeel(antwoorden)
  await db
    .update(clientForms)
    .set({
      antwoorden,
      uitkomst: b.kleur,
      status: 'ingevuld',
      ingevuldOp: new Date(),
      ingevuldDoorKlant: doorKlant,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(eq(clientForms.id, f.id))
  await vinkAf(f.organizationId, ['01.vragenlijst', '01.beoordeeld'], userId)
  await websiteOpKlantkaart(f.organizationId, antwoorden)
  await createActivity({
    organizationId: f.organizationId,
    kind: 'note',
    subject: `Vragenlijst ingevuld${doorKlant ? ' door de klant' : ''}: ${KLEUR_LABEL[b.kleur].toLowerCase()}`,
    body: [...b.redenen, b.maxPerAanvraag !== null ? `Mag per aanvraag kosten: € ${b.maxPerAanvraag.toLocaleString('nl-NL')}` : ''].filter(Boolean).join('\n'),
    userId,
  })
  return b.kleur
}

/** De klant vult de vragenlijst in via de link. Eén keer; daarna is hij van ons. */
export async function dienInViaLink(id: string, token: string, ruw: Record<string, unknown>): Promise<Kleur> {
  const f = await formulierViaLink(id, token)
  if (!f) throw new FormulierError('Deze link werkt niet meer. Vraag ons om een nieuwe.')
  if (f.status !== 'open') throw new FormulierError('Deze vragenlijst is al ingevuld. Dank je wel!')
  const antwoorden = schoonVragenlijst(ruw)
  const zonder = VRAGEN.filter((v) => v.id !== 'budgetGepland' && v.id !== 'perJaar' && v.id !== 'conversie' && v.id !== 'waaraan' && v.id !== 'knelpunt')
    .filter((v) => {
      const w = antwoorden[v.id]
      return w === null || w === undefined || w === ''
    })
  if (zonder.length > 0) throw new FormulierError(`Vul nog in: vraag ${zonder.map((v) => v.nr).join(', ')}.`)
  return rondVragenlijstAf(f, antwoorden, null, true)
}

/** Afronden door het team: de mijlpaal in de klantreis gaat aan, en het komt op de tijdlijn. */
export async function rondAf(id: string, userId: string): Promise<void> {
  const [f] = await db.select().from(clientForms).where(eq(clientForms.id, id)).limit(1)
  if (!f) throw new FormulierError('Dit formulier bestaat niet meer.')
  if (f.status !== 'open') throw new FormulierError('Dit formulier is al afgerond.')
  const a = f.antwoorden as Record<string, unknown>

  if (f.soort === 'vragenlijst') {
    await rondVragenlijstAf(f, schoonVragenlijst(a), userId, false)
    return
  }
  if (f.soort === 'quickscan') {
    const stand = standVanScan(schoonQuickscan(a))
    if (!stand.compleet) throw new FormulierError(`Nog niet compleet: ${stand.ontbreekt.join('; ')}.`)
    await db.update(clientForms).set({ status: 'ingevuld', ingevuldOp: new Date(), updatedByUserId: userId, updatedAt: new Date() }).where(eq(clientForms.id, id))
    await vinkAf(f.organizationId, ['02.scan'], userId)
    await createActivity({
      organizationId: f.organizationId,
      kind: 'note',
      subject: stand.stopknop ? 'Quickscan ingevuld: de stopknop staat op rood' : 'Quickscan ingevuld',
      body: `${stand.telling.groen} groen, ${stand.telling.oranje} oranje, ${stand.telling.rood} rood.`,
      userId,
    })
    return
  }
  const leeg = ontbrekendInIntake(a)
  if (leeg.length > 0) throw new FormulierError(`Zonder vraag ${leeg.map((v) => v.nr).join(', ')} geen voorstel. Vul die eerst in.`)
  await db.update(clientForms).set({ status: 'ingevuld', ingevuldOp: new Date(), updatedByUserId: userId, updatedAt: new Date() }).where(eq(clientForms.id, id))
  await vinkAf(f.organizationId, ['03.gevoerd'], userId)
  await createActivity({ organizationId: f.organizationId, kind: 'meeting', subject: 'Intakegesprek gevoerd, vragenlijst ingevuld', userId })
}

/** Het scanrapport vrijgeven. Niet als de stopknop op rood staat: dan gaat de afspraak niet door. */
export async function geefVrij(id: string, userId: string): Promise<void> {
  const [f] = await db.select().from(clientForms).where(eq(clientForms.id, id)).limit(1)
  if (!f) throw new FormulierError('Dit formulier bestaat niet meer.')
  if (f.soort !== 'quickscan' || f.status !== 'ingevuld') throw new FormulierError('Rond de quickscan eerst af.')
  if (standVanScan(schoonQuickscan(f.antwoorden as Record<string, unknown>)).stopknop) {
    throw new FormulierError('De stopknop staat op rood: geen scanrapport. Zeg de afspraak af met de mail “niet meten” (01.3).')
  }
  await db.update(clientForms).set({ status: 'vrijgegeven', vrijgegevenOp: new Date(), updatedByUserId: userId, updatedAt: new Date() }).where(eq(clientForms.id, id))
  await vinkAf(f.organizationId, ['02.rapport'], userId)
}

/** Een afgerond formulier weer openzetten om iets te corrigeren. */
export async function heropen(id: string, userId: string): Promise<void> {
  await db.update(clientForms).set({ status: 'open', updatedByUserId: userId, updatedAt: new Date() }).where(eq(clientForms.id, id))
}

/** Alleen een formulier dat nog niet is afgerond. Wat de klant invulde, blijft. */
export async function wisFormulier(id: string): Promise<string | null> {
  const [f] = await db.select().from(clientForms).where(eq(clientForms.id, id)).limit(1)
  if (!f) return null
  if (f.status !== 'open' || f.ingevuldDoorKlant) throw new FormulierError('Een afgerond formulier blijft in het dossier.')
  await db.delete(clientForms).where(eq(clientForms.id, id))
  return f.organizationId
}
