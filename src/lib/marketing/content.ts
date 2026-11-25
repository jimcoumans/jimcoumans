import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  marketingAssets,
  marketingClientIndustries,
  marketingClients,
  marketingContentAssetLinks,
  marketingContentBlocks,
  marketingContentClientLinks,
  marketingContentComments,
  marketingContentIndustryLinks,
  marketingContentItems,
  marketingContentRevisions,
  marketingContentSubjectLinks,
  marketingCoverage,
  marketingEngineComponents,
  marketingIndustries,
  marketingPackageComponents,
  marketingSubjects,
  users,
  type MarketingContentBlock,
  type MarketingContentItem,
} from '@/db/schema'
import { MarketingFout, magMarketing, type OnderwerpType } from './registers'
import { soortVan, standaardModus, toegestaneModi, veldenVan, type Paginasoort, type Veld } from './velden'

/* -------------------------------------------------------------------------
   Content van Marketing → Website: aanmaken, velden met overerving,
   workflow, revisies, bewijs per context, de matrix en de exports.

   Workflow en publicatie staan los van elkaar: goedgekeurd is nog niet
   gepubliceerd. Publiceren gebeurt met de hand in WordPress en wordt hier
   alleen vastgelegd. Niets in deze module schrijft naar WordPress.
   ------------------------------------------------------------------------- */

type Rol = string | null | undefined
const eis = (rol: Rol, recht: 'bewerken' | 'beoordelen' | 'beheren') => {
  if (!magMarketing(rol, recht)) throw new MarketingFout(recht === 'bewerken' ? 'Je hebt geen toegang tot Marketing.' : 'Alleen een beheerder mag dit.')
}

export type Modus = 'override' | 'inherit' | 'hidden'
export type Herkomst = 'eigen' | 'bron' | 'verborgen' | 'leeg'
export type VeldStaat = {
  veld: Veld
  modus: Modus
  eigen: string
  /** De tekst van de algemene bron, alleen bij varianten. */
  bron: string | null
  effectief: string
  herkomst: Herkomst
  /** Eigen tekst die woordelijk gelijk is aan de bron: telt niet als uniek. */
  gelijkAanBron: boolean
}

const leeg = (s: string | null | undefined) => !String(s ?? '').trim()
const gelijk = (a: string, b: string) => a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase()

/** De algemene pagina van een onderwerp: de bron van zijn branchevarianten. */
export async function algemeneBron(subjectId: string) {
  const [bron] = await db
    .select()
    .from(marketingContentItems)
    .where(
      and(
        eq(marketingContentItems.subjectId, subjectId),
        isNull(marketingContentItems.industryId),
        eq(marketingContentItems.contentKind, 'page'),
        ne(marketingContentItems.workflowStatus, 'archived'),
      ),
    )
    .limit(1)
  return bron ?? null
}

const blokkenVan = async (id: string) => db.select().from(marketingContentBlocks).where(eq(marketingContentBlocks.contentItemId, id))

/** Per veld: modus, eigen tekst, bron, effectieve tekst en waar die vandaan komt. */
export function veldStaten(soort: Paginasoort, blokken: MarketingContentBlock[], bronBlokken: MarketingContentBlock[] | null): VeldStaat[] {
  return veldenVan(soort).map((veld) => {
    const b = blokken.find((x) => x.fieldKey === veld.sleutel)
    const bronBlok = bronBlokken?.find((x) => x.fieldKey === veld.sleutel)
    const bron = bronBlokken ? (bronBlok && bronBlok.mode !== 'hidden' ? bronBlok.value ?? '' : '') : null
    const modi = toegestaneModi(soort, veld)
    const modus: Modus = b && modi.includes(b.mode) ? b.mode : modi.includes(standaardModus(soort, veld)) ? standaardModus(soort, veld) : 'override'
    const eigen = b?.value ?? ''
    let effectief = '', herkomst: Herkomst = 'leeg'
    if (modus === 'hidden') herkomst = 'verborgen'
    else if (modus === 'inherit') {
      effectief = bron ?? ''
      herkomst = leeg(effectief) ? 'leeg' : 'bron'
    } else {
      effectief = eigen
      herkomst = leeg(eigen) ? 'leeg' : 'eigen'
    }
    return { veld, modus, eigen, bron, effectief, herkomst, gelijkAanBron: modus === 'override' && bron !== null && !leeg(eigen) && gelijk(eigen, bron) }
  })
}

/* ------------------------------- Aanmaken ------------------------------- */

export async function maakContent(
  inv: { kind: 'page' | 'case' | 'review' | 'faq' | 'insight'; subjectId?: string | null; industryId?: string | null; title: string; ownerId?: string | null; demo?: boolean },
  user: { id: string; role: Rol },
) {
  eis(user.role, 'bewerken')
  const subjectId = inv.kind === 'page' ? inv.subjectId || null : null
  const industryId = inv.kind === 'page' ? inv.industryId || null : null
  return db.transaction(async (tx) => {
    const [item] = await tx
      .insert(marketingContentItems)
      .values({ contentKind: inv.kind, subjectId, industryId, title: inv.title.trim(), ownerId: inv.ownerId ?? user.id, demo: inv.demo ?? false })
      .returning()
    const soort = soortVan(item!)
    await tx.insert(marketingContentBlocks).values(
      veldenVan(soort).map((v) => ({ contentItemId: item!.id, fieldKey: v.sleutel, value: null, mode: standaardModus(soort, v), updatedBy: user.id })),
    )
    // Een geplande combinatie die nu begint, blijft in de planning staan; de cel volgt voortaan de content.
    return item!
  })
}

/** Een cel in de matrix bewust beginnen: titel uit onderwerp en branche. */
export async function maakVariant(subjectId: string, industryId: string | null, user: { id: string; role: Rol }) {
  const [s] = subjectId ? await db.select().from(marketingSubjects).where(eq(marketingSubjects.id, subjectId)).limit(1) : [null]
  const [i] = industryId ? await db.select().from(marketingIndustries).where(eq(marketingIndustries.id, industryId)).limit(1) : [null]
  const titel = [s?.name, i?.name].filter(Boolean).join(' × ')
  return maakContent({ kind: 'page', subjectId: subjectId || null, industryId, title: titel || 'Nieuwe pagina', demo: !!(s?.demo || i?.demo) }, user)
}

/* -------------------------------- Lezen --------------------------------- */

export async function haalContent(id: string) {
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, id)).limit(1)
  if (!item) return null
  const soort = soortVan(item)
  const blokken = await blokkenVan(id)
  const bron = soort === 'variant' && item.subjectId ? await algemeneBron(item.subjectId) : null
  const bronBlokken = soort === 'variant' ? (bron ? await blokkenVan(bron.id) : []) : null
  const [onderwerp] = item.subjectId ? await db.select().from(marketingSubjects).where(eq(marketingSubjects.id, item.subjectId)).limit(1) : [null]
  const [branche] = item.industryId ? await db.select().from(marketingIndustries).where(eq(marketingIndustries.id, item.industryId)).limit(1) : [null]
  const [eigenaar] = item.ownerId ? await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, item.ownerId)).limit(1) : [null]
  const subjectLinks = await db.select().from(marketingContentSubjectLinks).where(eq(marketingContentSubjectLinks.contentItemId, id))
  const industryLinks = await db.select().from(marketingContentIndustryLinks).where(eq(marketingContentIndustryLinks.contentItemId, id))
  const clientLinks = await db.select().from(marketingContentClientLinks).where(eq(marketingContentClientLinks.contentItemId, id))
  const assets = await db
    .select({ link: marketingContentAssetLinks, asset: marketingAssets })
    .from(marketingContentAssetLinks)
    .innerJoin(marketingAssets, eq(marketingAssets.id, marketingContentAssetLinks.assetId))
    .where(eq(marketingContentAssetLinks.contentItemId, id))
    .orderBy(asc(marketingContentAssetLinks.sortOrder))
  return {
    item,
    soort,
    onderwerp: onderwerp ?? null,
    branche: branche ?? null,
    eigenaar: eigenaar ?? null,
    bron,
    velden: veldStaten(soort, blokken, bronBlokken),
    koppelingen: {
      subjectIds: subjectLinks.map((l) => l.subjectId),
      industryIds: industryLinks.map((l) => l.industryId),
      clientIds: clientLinks.map((l) => l.clientId),
    },
    assets,
  }
}
export type ContentDetail = NonNullable<Awaited<ReturnType<typeof haalContent>>>

/* ------------------------------ Validatie ------------------------------- */

export type Validatie = { ontbrekend: string[]; nietUniek: string[]; bronNietGoedgekeurd: boolean; geenBron: boolean; fouten: string[]; volledig: number }

/** Wat goedkeuring tegenhoudt. Een variant zonder goedgekeurde algemene bron gaat niet door. */
export function valideer(detail: Pick<ContentDetail, 'soort' | 'velden' | 'bron'>): Validatie {
  const ontbrekend = detail.velden.filter((v) => v.veld.verplicht && v.herkomst !== 'verborgen' && leeg(v.effectief)).map((v) => v.veld.label)
  const verplicht = detail.velden.filter((v) => v.veld.verplicht)
  const indexeerbaar = !/^n(ee)?$/i.test(String(detail.velden.find((v) => v.veld.sleutel === 'indexeerbaar')?.effectief ?? '').trim())
  const nietUniek =
    detail.soort === 'variant' && indexeerbaar
      ? detail.velden.filter((v) => v.veld.uniek && v.herkomst !== 'verborgen' && (v.modus === 'inherit' || v.gelijkAanBron)).map((v) => v.veld.label)
      : []
  const geenBron = detail.soort === 'variant' && !detail.bron
  const bronNietGoedgekeurd = detail.soort === 'variant' && !!detail.bron && !detail.bron.approvedRevisionId && detail.bron.workflowStatus !== 'approved'
  const fouten: string[] = []
  if (ontbrekend.length) fouten.push(`Nog in te vullen: ${ontbrekend.join(', ')}.`)
  if (nietUniek.length) fouten.push(`Moet eigen tekst zijn in deze variant: ${nietUniek.join(', ')}.`)
  if (geenBron) fouten.push('Er is nog geen algemene pagina voor dit onderwerp. Die komt eerst.')
  if (bronNietGoedgekeurd) fouten.push('De algemene pagina van dit onderwerp is nog niet goedgekeurd.')
  const gevuld = verplicht.filter((v) => v.herkomst === 'verborgen' || !leeg(v.effectief)).length
  return { ontbrekend, nietUniek, bronNietGoedgekeurd, geenBron, fouten, volledig: verplicht.length ? Math.round((gevuld / verplicht.length) * 100) : 100 }
}

/* ------------------------------- Bewerken ------------------------------- */

/**
 * Velden opslaan. Een goedgekeurde tekst bewerken maakt er weer een concept
 * van; de goedgekeurde revisie blijft bewaard. Verandert een veld van een
 * algemene pagina, dan krijgen goedgekeurde of gepubliceerde varianten die
 * dat veld overnemen de markering "herbeoordeling nodig". Hun gepubliceerde
 * tekst verandert nooit vanzelf.
 */
export async function bewaarVelden(id: string, invoer: Record<string, { mode?: Modus; value?: string }>, user: { id: string; role: Rol }) {
  eis(user.role, 'bewerken')
  const detail = await haalContent(id)
  if (!detail) throw new MarketingFout('Onbekende content.')
  if (detail.item.workflowStatus === 'archived') throw new MarketingFout('Gearchiveerde content bewerk je niet meer.')
  const gewijzigd: string[] = []
  await db.transaction(async (tx) => {
    for (const vs of detail.velden) {
      const nieuw = invoer[vs.veld.sleutel]
      if (!nieuw) continue
      const modi = toegestaneModi(detail.soort, vs.veld)
      const modus = nieuw.mode && modi.includes(nieuw.mode) ? nieuw.mode : vs.modus
      const waarde = nieuw.value !== undefined ? nieuw.value.replace(/\r\n/g, '\n').trim() : vs.eigen
      if (modus === vs.modus && waarde === vs.eigen) continue
      gewijzigd.push(vs.veld.sleutel)
      await tx
        .insert(marketingContentBlocks)
        .values({ contentItemId: id, fieldKey: vs.veld.sleutel, value: waarde || null, mode: modus, updatedBy: user.id })
        .onConflictDoUpdate({ target: [marketingContentBlocks.contentItemId, marketingContentBlocks.fieldKey], set: { value: waarde || null, mode: modus, updatedBy: user.id, updatedAt: new Date() } })
    }
    if (!gewijzigd.length) return
    await tx
      .update(marketingContentItems)
      .set({ updatedAt: new Date(), ...(detail.item.workflowStatus === 'approved' || detail.item.workflowStatus === 'in_review' ? { workflowStatus: 'draft' as const } : {}) })
      .where(eq(marketingContentItems.id, id))
    if (detail.soort === 'algemeen' && detail.item.subjectId) await markeerAfhankelijken(tx, detail.item.subjectId, gewijzigd)
  })
  return gewijzigd
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
async function markeerAfhankelijken(tx: Tx, subjectId: string, velden: string[]) {
  const varianten = await tx
    .select({ id: marketingContentItems.id, workflowStatus: marketingContentItems.workflowStatus, publicationStatus: marketingContentItems.publicationStatus, approvedRevisionId: marketingContentItems.approvedRevisionId })
    .from(marketingContentItems)
    .where(and(eq(marketingContentItems.subjectId, subjectId), sql`${marketingContentItems.industryId} IS NOT NULL`, eq(marketingContentItems.contentKind, 'page'), ne(marketingContentItems.workflowStatus, 'archived')))
  const betrokken = varianten.filter((v) => v.workflowStatus === 'approved' || v.publicationStatus === 'published' || v.approvedRevisionId)
  if (!betrokken.length) return
  const blokken = await tx
    .select({ contentItemId: marketingContentBlocks.contentItemId })
    .from(marketingContentBlocks)
    .where(and(inArray(marketingContentBlocks.contentItemId, betrokken.map((v) => v.id)), inArray(marketingContentBlocks.fieldKey, velden), eq(marketingContentBlocks.mode, 'inherit')))
  const ids = [...new Set(blokken.map((b) => b.contentItemId))]
  if (ids.length) await tx.update(marketingContentItems).set({ needsReview: true }).where(inArray(marketingContentItems.id, ids))
}

export async function bewaarGegevens(id: string, inv: { title?: string; slug?: string; ownerId?: string | null; targetUrl?: string }, user: { id: string; role: Rol }) {
  eis(user.role, 'bewerken')
  await db
    .update(marketingContentItems)
    .set({
      ...(inv.title !== undefined ? { title: inv.title.trim() } : {}),
      ...(inv.slug !== undefined ? { slug: inv.slug.trim() || null } : {}),
      ...(inv.ownerId !== undefined ? { ownerId: inv.ownerId || null } : {}),
      ...(inv.targetUrl !== undefined ? { targetUrl: inv.targetUrl.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(marketingContentItems.id, id))
}

/** De aanvullende relevantie: waarvoor deze content ook geldt. De primaire context verandert hier niet. */
export async function zetKoppelingen(id: string, inv: { subjectIds: string[]; industryIds: string[]; clientIds: string[] }, user: { id: string; role: Rol }) {
  eis(user.role, 'bewerken')
  await db.transaction(async (tx) => {
    await tx.delete(marketingContentSubjectLinks).where(eq(marketingContentSubjectLinks.contentItemId, id))
    await tx.delete(marketingContentIndustryLinks).where(eq(marketingContentIndustryLinks.contentItemId, id))
    await tx.delete(marketingContentClientLinks).where(eq(marketingContentClientLinks.contentItemId, id))
    const s = [...new Set(inv.subjectIds)], i = [...new Set(inv.industryIds)], c = [...new Set(inv.clientIds)]
    if (s.length) await tx.insert(marketingContentSubjectLinks).values(s.map((subjectId) => ({ contentItemId: id, subjectId })))
    if (i.length) await tx.insert(marketingContentIndustryLinks).values(i.map((industryId) => ({ contentItemId: id, industryId })))
    if (c.length) await tx.insert(marketingContentClientLinks).values(c.map((clientId) => ({ contentItemId: id, clientId })))
    await tx.update(marketingContentItems).set({ updatedAt: new Date() }).where(eq(marketingContentItems.id, id))
  })
}

export async function voegAssetToe(id: string, inv: { storageReference: string; altText?: string; rightsStatus?: 'unknown' | 'granted' | 'denied'; role?: string }, user: { id: string; role: Rol }) {
  eis(user.role, 'bewerken')
  await db.transaction(async (tx) => {
    const [a] = await tx.insert(marketingAssets).values({ storageReference: inv.storageReference.trim(), altText: inv.altText?.trim() || null, rightsStatus: inv.rightsStatus ?? 'unknown' }).returning()
    await tx.insert(marketingContentAssetLinks).values({ contentItemId: id, assetId: a!.id, role: inv.role?.trim() || 'beeld' })
  })
}

export async function ontkoppelAsset(id: string, assetId: string, user: { id: string; role: Rol }) {
  eis(user.role, 'bewerken')
  await db.delete(marketingContentAssetLinks).where(and(eq(marketingContentAssetLinks.contentItemId, id), eq(marketingContentAssetLinks.assetId, assetId)))
}

export async function plaatsOpmerking(id: string, body: string, user: { id: string; role: Rol }, fieldKey?: string) {
  eis(user.role, 'bewerken')
  await db.insert(marketingContentComments).values({ contentItemId: id, body: body.trim(), authorId: user.id, fieldKey: fieldKey || null })
}

export async function opmerkingenEnRevisies(id: string) {
  const opmerkingen = await db
    .select({ c: marketingContentComments, naam: users.name })
    .from(marketingContentComments)
    .leftJoin(users, eq(users.id, marketingContentComments.authorId))
    .where(eq(marketingContentComments.contentItemId, id))
    .orderBy(desc(marketingContentComments.createdAt))
  const revisies = await db
    .select({ r: { id: marketingContentRevisions.id, kind: marketingContentRevisions.kind, changeNote: marketingContentRevisions.changeNote, createdAt: marketingContentRevisions.createdAt }, naam: users.name })
    .from(marketingContentRevisions)
    .leftJoin(users, eq(users.id, marketingContentRevisions.authorId))
    .where(eq(marketingContentRevisions.contentItemId, id))
    .orderBy(desc(marketingContentRevisions.createdAt))
  return { opmerkingen, revisies }
}

/* ------------------------------- Workflow ------------------------------- */

async function legVast(tx: Tx, detail: ContentDetail, kind: 'concept' | 'review' | 'approved' | 'published' | 'archived', userId: string, note?: string) {
  const snapshot = {
    titel: detail.item.title,
    soort: detail.soort,
    context: { onderwerp: detail.onderwerp?.name ?? null, branche: detail.branche?.name ?? null },
    velden: detail.velden.map((v) => ({ sleutel: v.veld.sleutel, modus: v.modus, eigen: v.eigen, effectief: v.effectief, herkomst: v.herkomst })),
    koppelingen: detail.koppelingen,
  }
  const [r] = await tx.insert(marketingContentRevisions).values({ contentItemId: detail.item.id, kind, snapshot, authorId: userId, changeNote: note?.trim() || null }).returning()
  return r!
}

/** Aanbieden voor review: vanuit concept, of een goedgekeurde tekst die opnieuw beoordeeld moet worden. */
export async function dienIn(id: string, user: { id: string; role: Rol }, note?: string) {
  eis(user.role, 'bewerken')
  const d = await haalContent(id)
  if (!d) throw new MarketingFout('Onbekende content.')
  if (d.item.workflowStatus !== 'draft' && !(d.item.workflowStatus === 'approved' && d.item.needsReview)) throw new MarketingFout('Alleen een concept, of goedgekeurde content die herbeoordeeld moet worden, bied je aan voor review.')
  await db.transaction(async (tx) => {
    await legVast(tx, d, 'review', user.id, note)
    await tx.update(marketingContentItems).set({ workflowStatus: 'in_review', updatedAt: new Date() }).where(eq(marketingContentItems.id, id))
  })
}

export async function keurGoed(id: string, user: { id: string; role: Rol }, note?: string) {
  eis(user.role, 'beoordelen')
  const d = await haalContent(id)
  if (!d) throw new MarketingFout('Onbekende content.')
  if (d.item.workflowStatus !== 'in_review') throw new MarketingFout('Goedkeuren kan alleen vanuit review.')
  const v = valideer(d)
  if (v.fouten.length) throw new MarketingFout(v.fouten.join(' '))
  await db.transaction(async (tx) => {
    const r = await legVast(tx, d, 'approved', user.id, note)
    await tx.update(marketingContentItems).set({ workflowStatus: 'approved', approvedRevisionId: r.id, needsReview: false, updatedAt: new Date() }).where(eq(marketingContentItems.id, id))
  })
}

export async function stuurTerug(id: string, user: { id: string; role: Rol }, note: string) {
  eis(user.role, 'beoordelen')
  if (!note.trim()) throw new MarketingFout('Schrijf erbij waarom het terug gaat.')
  const [item] = await db.select().from(marketingContentItems).where(eq(marketingContentItems.id, id)).limit(1)
  if (!item || item.workflowStatus !== 'in_review') throw new MarketingFout('Terugsturen kan alleen vanuit review.')
  await db.transaction(async (tx) => {
    await tx.insert(marketingContentComments).values({ contentItemId: id, body: note.trim(), authorId: user.id })
    await tx.update(marketingContentItems).set({ workflowStatus: 'draft', updatedAt: new Date() }).where(eq(marketingContentItems.id, id))
  })
}

/** Archiveren: de revisies blijven, de plek in de matrix komt vrij. */
export async function archiveer(id: string, user: { id: string; role: Rol }, note?: string) {
  eis(user.role, 'beheren')
  const d = await haalContent(id)
  if (!d) throw new MarketingFout('Onbekende content.')
  await db.transaction(async (tx) => {
    await legVast(tx, d, 'archived', user.id, note)
    await tx.update(marketingContentItems).set({ workflowStatus: 'archived', updatedAt: new Date() }).where(eq(marketingContentItems.id, id))
  })
}

/** Publicatie vastleggen, nadat iemand het met de hand in WordPress heeft gezet. */
export async function bevestigPublicatie(id: string, inv: { targetUrl: string; externalId?: string; datum?: Date }, user: { id: string; role: Rol }) {
  eis(user.role, 'beheren')
  const d = await haalContent(id)
  if (!d) throw new MarketingFout('Onbekende content.')
  if (!d.item.approvedRevisionId) throw new MarketingFout('Alleen goedgekeurde content leg je vast als gepubliceerd.')
  if (!inv.targetUrl.trim()) throw new MarketingFout('Vul de URL in waar het staat.')
  await db.transaction(async (tx) => {
    await legVast(tx, d, 'published', user.id, inv.targetUrl)
    await tx
      .update(marketingContentItems)
      .set({ publicationStatus: 'published', publishedRevisionId: d.item.approvedRevisionId, publishedAt: inv.datum ?? new Date(), targetUrl: inv.targetUrl.trim(), wordpressExternalId: inv.externalId?.trim() || d.item.wordpressExternalId, updatedAt: new Date() })
      .where(eq(marketingContentItems.id, id))
  })
}

export async function trekTerug(id: string, user: { id: string; role: Rol }) {
  eis(user.role, 'beheren')
  await db.update(marketingContentItems).set({ publicationStatus: 'withdrawn', updatedAt: new Date() }).where(eq(marketingContentItems.id, id))
}

/* -------------------------------- Bewijs -------------------------------- */

export type Bewijs = { item: MarketingContentItem; brancheHerkomst: 'direct' | 'afgeleid' | null; klanten: { id: string; name: string; toestemming: string }[] }

/**
 * Cases, reviews, FAQ's en insights voor een context. Standaard AND: het
 * bewijs hangt aan het onderwerp én aan de branche. De branche mag komen van
 * een gekoppelde klant (afgeleid); direct en afgeleid tonen we apart, en elk
 * stuk bewijs komt één keer voor.
 */
export async function bewijsVoor(ctx: { subjectId?: string | null; industryId?: string | null }): Promise<Bewijs[]> {
  if (!ctx.subjectId && !ctx.industryId) return []
  const items = await db
    .select()
    .from(marketingContentItems)
    .where(and(ne(marketingContentItems.contentKind, 'page'), ne(marketingContentItems.workflowStatus, 'archived')))
  if (!items.length) return []
  const ids = items.map((i) => i.id)
  const sl = await db.select().from(marketingContentSubjectLinks).where(inArray(marketingContentSubjectLinks.contentItemId, ids))
  const il = await db.select().from(marketingContentIndustryLinks).where(inArray(marketingContentIndustryLinks.contentItemId, ids))
  const cl = await db
    .select({ contentItemId: marketingContentClientLinks.contentItemId, client: marketingClients })
    .from(marketingContentClientLinks)
    .innerJoin(marketingClients, eq(marketingClients.id, marketingContentClientLinks.clientId))
    .where(inArray(marketingContentClientLinks.contentItemId, ids))
  const ci = cl.length ? await db.select().from(marketingClientIndustries).where(inArray(marketingClientIndustries.clientId, [...new Set(cl.map((c) => c.client.id))])) : []
  const uit: Bewijs[] = []
  for (const item of items) {
    if (ctx.subjectId && !sl.some((l) => l.contentItemId === item.id && l.subjectId === ctx.subjectId)) continue
    const klanten = cl.filter((c) => c.contentItemId === item.id).map((c) => c.client)
    let brancheHerkomst: Bewijs['brancheHerkomst'] = null
    if (ctx.industryId) {
      if (il.some((l) => l.contentItemId === item.id && l.industryId === ctx.industryId)) brancheHerkomst = 'direct'
      else if (klanten.some((k) => ci.some((x) => x.clientId === k.id && x.industryId === ctx.industryId))) brancheHerkomst = 'afgeleid'
      else continue
    }
    uit.push({ item, brancheHerkomst, klanten: klanten.map((k) => ({ id: k.id, name: k.name, toestemming: k.publicPermissionStatus })) })
  }
  return uit
}

/* ---------------------------- Lijst en overzicht ---------------------------- */

export type ContentRij = {
  item: MarketingContentItem
  soort: Paginasoort
  onderwerp: string | null
  onderwerpType: OnderwerpType | null
  branche: string | null
  eigenaar: string | null
  validatie: Validatie
  subjectIds: string[]
  industryIds: string[]
}

/** Alle content met context en gereedheid. Klein genoeg om in één keer te rekenen. */
export async function alleContent(opts: { ookGearchiveerd?: boolean } = {}): Promise<ContentRij[]> {
  const items = await db
    .select({ item: marketingContentItems, onderwerp: marketingSubjects.name, onderwerpType: marketingSubjects.type, branche: marketingIndustries.name, eigenaar: users.name })
    .from(marketingContentItems)
    .leftJoin(marketingSubjects, eq(marketingSubjects.id, marketingContentItems.subjectId))
    .leftJoin(marketingIndustries, eq(marketingIndustries.id, marketingContentItems.industryId))
    .leftJoin(users, eq(users.id, marketingContentItems.ownerId))
    .where(opts.ookGearchiveerd ? undefined : ne(marketingContentItems.workflowStatus, 'archived'))
    .orderBy(desc(marketingContentItems.updatedAt))
  if (!items.length) return []
  const ids = items.map((r) => r.item.id)
  const blokken = await db.select().from(marketingContentBlocks).where(inArray(marketingContentBlocks.contentItemId, ids))
  const sl = await db.select().from(marketingContentSubjectLinks).where(inArray(marketingContentSubjectLinks.contentItemId, ids))
  const il = await db.select().from(marketingContentIndustryLinks).where(inArray(marketingContentIndustryLinks.contentItemId, ids))
  const bronnen = new Map<string, MarketingContentItem>()
  for (const r of items) if (r.item.contentKind === 'page' && r.item.subjectId && !r.item.industryId) bronnen.set(r.item.subjectId, r.item)
  return items.map((r) => {
    const soort = soortVan(r.item)
    const bron = soort === 'variant' && r.item.subjectId ? bronnen.get(r.item.subjectId) ?? null : null
    const eigen = blokken.filter((b) => b.contentItemId === r.item.id)
    const bronBlokken = soort === 'variant' ? (bron ? blokken.filter((b) => b.contentItemId === bron.id) : []) : null
    const validatie = valideer({ soort, velden: veldStaten(soort, eigen, bronBlokken), bron })
    return {
      item: r.item,
      soort,
      onderwerp: r.onderwerp,
      onderwerpType: (r.onderwerpType as OnderwerpType | null) ?? null,
      branche: r.branche,
      eigenaar: r.eigenaar,
      validatie,
      subjectIds: [r.item.subjectId, ...sl.filter((l) => l.contentItemId === r.item.id).map((l) => l.subjectId)].filter((x): x is string => !!x),
      industryIds: [r.item.industryId, ...il.filter((l) => l.contentItemId === r.item.id).map((l) => l.industryId)].filter((x): x is string => !!x),
    }
  })
}

export type Filters = {
  soort?: string
  industryId?: string
  subjectId?: string
  ownerId?: string
  workflow?: string
  publicatie?: string
  volledig?: 'ja' | 'nee'
  q?: string
}

export function filterContent(rijen: ContentRij[], f: Filters): ContentRij[] {
  const q = f.q?.trim().toLowerCase()
  return rijen.filter(
    (r) =>
      (!f.soort || r.soort === f.soort) &&
      (!f.industryId || r.industryIds.includes(f.industryId)) &&
      (!f.subjectId || r.subjectIds.includes(f.subjectId)) &&
      (!f.ownerId || r.item.ownerId === f.ownerId) &&
      (!f.workflow || (f.workflow === 'herbeoordeling' ? r.item.needsReview : r.item.workflowStatus === f.workflow)) &&
      (!f.publicatie || r.item.publicationStatus === f.publicatie) &&
      (!f.volledig || (f.volledig === 'ja' ? r.validatie.fouten.length === 0 : r.validatie.fouten.length > 0)) &&
      (!q || [r.item.title, r.onderwerp, r.branche, r.item.targetUrl].some((x) => String(x ?? '').toLowerCase().includes(q))),
  )
}

/** Na een half jaar zonder wijziging telt content als verouderd. */
export const VEROUDERD_DAGEN = 180

/* -------------------------------- Matrix -------------------------------- */

export type CelStatus = 'niet_gepland' | 'niet_relevant' | 'uitgesteld' | 'gepland' | 'concept' | 'in_review' | 'goedgekeurd' | 'gepubliceerd' | 'herbeoordeling'
export const CEL_NAAM: Record<CelStatus, string> = {
  niet_gepland: 'Niet gepland',
  niet_relevant: 'Niet relevant',
  uitgesteld: 'Uitgesteld',
  gepland: 'Gepland, niet gestart',
  concept: 'Concept',
  in_review: 'In review',
  goedgekeurd: 'Goedgekeurd',
  gepubliceerd: 'Gepubliceerd',
  herbeoordeling: 'Herbeoordeling nodig',
}

export function celStatus(item: Pick<MarketingContentItem, 'workflowStatus' | 'publicationStatus' | 'needsReview'> | null, applicability: string | null): CelStatus {
  if (item) {
    if (item.needsReview) return 'herbeoordeling'
    if (item.publicationStatus === 'published') return 'gepubliceerd'
    if (item.workflowStatus === 'approved') return 'goedgekeurd'
    if (item.workflowStatus === 'in_review') return 'in_review'
    return 'concept'
  }
  if (applicability === 'planned') return 'gepland'
  if (applicability === 'not_relevant') return 'niet_relevant'
  if (applicability === 'deferred') return 'uitgesteld'
  return 'niet_gepland'
}

export async function zetPlanning(subjectId: string, industryId: string, applicability: 'planned' | 'not_relevant' | 'deferred' | null, user: { role: Rol }, notes?: string) {
  eis(user.role, 'bewerken')
  if (applicability === null) {
    await db.delete(marketingCoverage).where(and(eq(marketingCoverage.subjectId, subjectId), eq(marketingCoverage.industryId, industryId)))
    return
  }
  await db
    .insert(marketingCoverage)
    .values({ subjectId, industryId, applicability, notes: notes?.trim() || null })
    .onConflictDoUpdate({ target: [marketingCoverage.subjectId, marketingCoverage.industryId], set: { applicability, notes: notes?.trim() || null, updatedAt: new Date() } })
}

/** De matrix voor één soort onderwerp: links de algemene bron, daarna een kolom per actieve branche. */
export async function matrix(type: OnderwerpType) {
  const onderwerpen = await db.select().from(marketingSubjects).where(and(eq(marketingSubjects.type, type), eq(marketingSubjects.lifecycleStatus, 'active'))).orderBy(asc(marketingSubjects.sortOrder), asc(marketingSubjects.name))
  const branches = await db.select().from(marketingIndustries).where(eq(marketingIndustries.active, true)).orderBy(desc(marketingIndustries.priority), asc(marketingIndustries.name))
  const sids = onderwerpen.map((s) => s.id)
  const items = sids.length
    ? await db
        .select({ item: marketingContentItems, eigenaar: users.name })
        .from(marketingContentItems)
        .leftJoin(users, eq(users.id, marketingContentItems.ownerId))
        .where(and(inArray(marketingContentItems.subjectId, sids), eq(marketingContentItems.contentKind, 'page'), ne(marketingContentItems.workflowStatus, 'archived')))
    : []
  const planning = sids.length ? await db.select().from(marketingCoverage).where(inArray(marketingCoverage.subjectId, sids)) : []
  const rijen = onderwerpen.map((s) => {
    const algemeen = items.find((r) => r.item.subjectId === s.id && !r.item.industryId) ?? null
    const cellen = branches.map((b) => {
      const r = items.find((x) => x.item.subjectId === s.id && x.item.industryId === b.id) ?? null
      const p = planning.find((x) => x.subjectId === s.id && x.industryId === b.id) ?? null
      return { branche: b, item: r?.item ?? null, eigenaar: r?.eigenaar ?? null, planning: p, status: celStatus(r?.item ?? null, p?.applicability ?? null) }
    })
    return { onderwerp: s, algemeen: algemeen?.item ?? null, algemeenStatus: algemeen ? celStatus(algemeen.item, null) : ('niet_gepland' as CelStatus), cellen }
  })
  return { onderwerpen, branches, rijen }
}

/**
 * Voortgang met een eerlijke noemer. Algemene pagina's: elk actief onderwerp
 * hoort er één te hebben. Varianten: alleen geplande combinaties en
 * combinaties waar al content is; niet-relevante en ongeplande tellen niet
 * mee. Branchehubs: elke actieve branche.
 */
export async function voortgang() {
  const onderwerpen = await db.select().from(marketingSubjects).where(eq(marketingSubjects.lifecycleStatus, 'active'))
  const branches = await db.select().from(marketingIndustries).where(eq(marketingIndustries.active, true))
  const items = await db.select().from(marketingContentItems).where(and(eq(marketingContentItems.contentKind, 'page'), ne(marketingContentItems.workflowStatus, 'archived')))
  const planning = await db.select().from(marketingCoverage)
  const klaar = (i: MarketingContentItem) => i.workflowStatus === 'approved' || i.publicationStatus === 'published' || !!i.approvedRevisionId
  const sids = new Set(onderwerpen.map((s) => s.id)), bids = new Set(branches.map((b) => b.id))
  const algemeen = items.filter((i) => i.subjectId && !i.industryId && sids.has(i.subjectId))
  const varianten = items.filter((i) => i.subjectId && i.industryId && sids.has(i.subjectId) && bids.has(i.industryId))
  const hubs = items.filter((i) => !i.subjectId && i.industryId && bids.has(i.industryId))
  const combinaties = new Set([
    ...planning.filter((p) => p.applicability === 'planned' && sids.has(p.subjectId) && bids.has(p.industryId)).map((p) => `${p.subjectId}|${p.industryId}`),
    ...varianten.map((v) => `${v.subjectId}|${v.industryId}`),
  ])
  const telStatus = (lijst: MarketingContentItem[]) => ({
    concept: lijst.filter((i) => i.workflowStatus === 'draft').length,
    in_review: lijst.filter((i) => i.workflowStatus === 'in_review').length,
    goedgekeurd: lijst.filter((i) => i.workflowStatus === 'approved').length,
    gepubliceerd: lijst.filter((i) => i.publicationStatus === 'published').length,
    herbeoordeling: lijst.filter((i) => i.needsReview).length,
  })
  return {
    algemeen: { klaar: algemeen.filter(klaar).length, noemer: onderwerpen.length, ...telStatus(algemeen), gepland: onderwerpen.length - algemeen.length },
    varianten: { klaar: varianten.filter(klaar).length, noemer: combinaties.size, ...telStatus(varianten), gepland: combinaties.size - varianten.length },
    hubs: { klaar: hubs.filter(klaar).length, noemer: branches.length, ...telStatus(hubs) },
    uitgesteld: planning.filter((p) => p.applicability === 'deferred').length,
    nietRelevant: planning.filter((p) => p.applicability === 'not_relevant').length,
    algemeneFaseKlaar: onderwerpen.length > 0 && algemeen.filter(klaar).length === onderwerpen.length,
  }
}

/* -------------------------------- Export -------------------------------- */

/** De Engine en, bij een pakket, de activatie per onderdeel: centrale data, nooit per pagina aangepast. */
async function engineData(pakketId: string | null) {
  const comps = await db.select().from(marketingEngineComponents).where(eq(marketingEngineComponents.active, true)).orderBy(asc(marketingEngineComponents.group), asc(marketingEngineComponents.sortOrder))
  const act = pakketId ? await db.select().from(marketingPackageComponents).where(eq(marketingPackageComponents.packageSubjectId, pakketId)) : []
  return comps.map((c) => ({ groep: c.group, naam: c.name, ...(pakketId ? { activatie: act.find((a) => a.componentId === c.id)?.activation ?? 'undecided' } : {}) }))
}

export async function exportJson(id: string) {
  const d = await haalContent(id)
  if (!d) return null
  const bewijs = d.item.contentKind === 'page' ? await bewijsVoor({ subjectId: d.item.subjectId, industryId: d.item.industryId }) : []
  const toegestaan = bewijs.filter((b) => b.klanten.every((k) => k.toestemming === 'granted'))
  const nietToegestaan = bewijs.filter((b) => !toegestaan.includes(b))
  const metEngine = d.onderwerp?.type === 'engine' || d.onderwerp?.type === 'package'
  return {
    id: d.item.id,
    soort: d.soort,
    titel: d.item.title,
    slug: d.item.slug,
    context: { onderwerp: d.onderwerp ? { type: d.onderwerp.type, naam: d.onderwerp.name, slug: d.onderwerp.slug } : null, branche: d.branche ? { naam: d.branche.name, slug: d.branche.slug } : null },
    bron: d.bron ? { id: d.bron.id, titel: d.bron.title } : null,
    status: { workflow: d.item.workflowStatus, publicatie: d.item.publicationStatus, herbeoordeling: d.item.needsReview, goedgekeurdeRevisie: d.item.approvedRevisionId, gepubliceerdeRevisie: d.item.publishedRevisionId },
    doelUrl: d.item.targetUrl,
    wordpressId: d.item.wordpressExternalId,
    velden: d.velden.filter((v) => v.herkomst !== 'verborgen').map((v) => ({ sleutel: v.veld.sleutel, label: v.veld.label, herkomst: v.herkomst, tekst: v.effectief })),
    engine: metEngine ? await engineData(d.onderwerp?.type === 'package' ? d.onderwerp.id : null) : null,
    assets: d.assets.map((a) => ({ rol: a.link.role, bron: a.asset.storageReference, alt: a.asset.altText, rechten: a.asset.rightsStatus })),
    bewijs: toegestaan.map((b) => ({ id: b.item.id, soort: b.item.contentKind, titel: b.item.title, branche: b.brancheHerkomst, klanten: b.klanten.map((k) => k.name) })),
    bewijsZonderToestemming: nietToegestaan.length,
  }
}

export async function exportMarkdown(id: string) {
  const j = await exportJson(id)
  if (!j) return null
  const r: string[] = [`# ${j.titel}`, '']
  r.push(`- Soort: ${j.soort}`, `- Context: ${[j.context.onderwerp?.naam, j.context.branche?.naam].filter(Boolean).join(' × ') || '–'}`, `- Status: ${j.status.workflow}, ${j.status.publicatie}${j.status.herbeoordeling ? ', herbeoordeling nodig' : ''}`)
  if (j.doelUrl) r.push(`- Doel-URL: ${j.doelUrl}`)
  r.push('')
  for (const v of j.velden) {
    r.push(`## ${v.label}`, '', v.tekst || '_[leeg]_', '', `<!-- ${v.sleutel} · ${v.herkomst} -->`, '')
  }
  if (j.engine) {
    r.push('## Performance Engine', '')
    for (const c of j.engine) r.push(`- ${c.groep}: ${c.naam}${'activatie' in c ? ` (${c.activatie})` : ''}`)
    r.push('')
  }
  if (j.bewijs.length) {
    r.push('## Bewijs', '')
    for (const b of j.bewijs) r.push(`- ${b.soort}: ${b.titel}${b.klanten.length ? ` (${b.klanten.join(', ')})` : ''}`)
    r.push('')
  }
  if (j.bewijsZonderToestemming) r.push(`_${j.bewijsZonderToestemming} stuk(ken) bewijs weggelaten: geen publicatietoestemming van de klant._`, '')
  return r.join('\n')
}

const csvCel = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export async function matrixCsv(type: OnderwerpType) {
  const m = await matrix(type)
  const kop = ['Onderwerp', 'Algemeen', ...m.branches.map((b) => b.name)]
  const regels = m.rijen.map((r) => [r.onderwerp.name, CEL_NAAM[r.algemeenStatus], ...r.cellen.map((c) => CEL_NAAM[c.status])])
  return [kop, ...regels].map((rij) => rij.map((c) => csvCel(String(c))).join(',')).join('\n')
}
